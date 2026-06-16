<?php
/**
 * MAPO — Provisioning automatique des sous-domaines d'écoles.
 *
 * Appelé par l'espace méga admin (adminmapo.app-edufrem.com) à la création
 * d'une école. Crée <slug>.app-edufrem.com pointé sur public_html/mapo via
 * l'API cPanel (UAPI), ce qui déclenche aussi le SSL automatique.
 *
 * Sécurité (deux verrous) :
 *   1. Jeton Firebase de l'appelant vérifié (signature RS256 Google,
 *      audience = projet mapo-edufrem, non expiré).
 *   2. L'appelant doit être super admin EDUFREM : on relit son document
 *      superAdmins/<uid> dans Firestore AVEC SON PROPRE jeton (les règles
 *      Firestore ne laissent lire ce doc qu'à son propriétaire).
 *
 * Installation :
 *   - Déposer ce fichier dans public_html/ (racine app-edufrem.com).
 *   - Déposer mapo-provision-config.php à côté, avec le jeton API cPanel.
 *   - Le .htaccess fourni protège le fichier de config.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(45); // garde-fou : empêcher qu'un appel externe lent provoque un 502 de la passerelle
header('Access-Control-Allow-Origin: https://adminmapo.app-edufrem.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed']); exit;
}

require __DIR__ . '/mapo-provision-config.php'; // définit CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN, MAPO_DIR, ROOT_DOMAIN, FIREBASE_PROJECT

// Chemin par défaut de la clé du compte de service (déposer le JSON ici).
// Permet d'activer l'ajout auto du domaine Firebase sans toucher au config.
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');

// ── 1. Lire la requête ────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
$action = $body['action'] ?? '';
$slug = strtolower(trim($body['slug'] ?? ''));

if ($action !== 'create_subdomain' && $action !== 'delete_subdomain') {
  http_response_code(400); echo json_encode(['error' => 'action_inconnue']); exit;
}
if (!preg_match('/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/', $slug)) {
  http_response_code(400); echo json_encode(['error' => 'slug_invalide']); exit;
}
$reserved = ['admin','adminmapo','mapo','www','api','auth','static','cdn','app','edu','mobi','ring','aris','nova'];
if (in_array($slug, $reserved, true)) {
  http_response_code(400); echo json_encode(['error' => 'slug_reserve']); exit;
}

// ── 2. Vérifier le jeton Firebase (signature + audience + expiration) ──
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) {
  http_response_code(401); echo json_encode(['error' => 'jeton_manquant']); exit;
}
$idToken = $m[1];

function b64url_decode($s) { return base64_decode(strtr($s, '-_', '+/')); }

$parts = explode('.', $idToken);
if (count($parts) !== 3) { http_response_code(401); echo json_encode(['error' => 'jeton_invalide']); exit; }
$jwtHeader = json_decode(b64url_decode($parts[0]), true);
$jwtPayload = json_decode(b64url_decode($parts[1]), true);
$jwtSig = b64url_decode($parts[2]);

if (($jwtHeader['alg'] ?? '') !== 'RS256' || empty($jwtHeader['kid'])) {
  http_response_code(401); echo json_encode(['error' => 'jeton_invalide']); exit;
}
if (($jwtPayload['aud'] ?? '') !== FIREBASE_PROJECT
  || ($jwtPayload['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT
  || ($jwtPayload['exp'] ?? 0) < time()
  || empty($jwtPayload['sub'])) {
  http_response_code(401); echo json_encode(['error' => 'jeton_refuse']); exit;
}

// Clés publiques Google (mises en cache 1 h sur disque)
$cacheFile = sys_get_temp_dir() . '/firebase_google_certs.json';
$certs = null;
if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 3600) {
  $certs = json_decode(file_get_contents($cacheFile), true);
}
if (!$certs) {
  $certsCtx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
  $raw = @file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', false, $certsCtx);
  if ($raw === false) { http_response_code(502); echo json_encode(['error' => 'certs_google_inaccessibles']); exit; }
  $certs = json_decode($raw, true);
  @file_put_contents($cacheFile, $raw);
}
$cert = $certs[$jwtHeader['kid']] ?? null;
if (!$cert) { http_response_code(401); echo json_encode(['error' => 'cle_inconnue']); exit; }
$pubKey = openssl_pkey_get_public($cert);
$verified = openssl_verify($parts[0] . '.' . $parts[1], $jwtSig, $pubKey, OPENSSL_ALGO_SHA256);
if ($verified !== 1) { http_response_code(401); echo json_encode(['error' => 'signature_invalide']); exit; }

$uid = $jwtPayload['sub'];

// ── 3. Vérifier que l'appelant est super admin EDUFREM ────────────────
// Lecture Firestore REST avec le jeton de l'appelant : les règles ne
// permettent cette lecture qu'au propriétaire du doc (ou à un super admin).
$fsUrl = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
  . '/databases/(default)/documents/superAdmins/' . rawurlencode($uid);
$ctx = stream_context_create(['http' => [
  'method' => 'GET',
  'header' => "Authorization: Bearer {$idToken}\r\n",
  'timeout' => 8,
  'ignore_errors' => true,
]]);
$fsRes = @file_get_contents($fsUrl, false, $ctx);
$fsCode = 0;
foreach ($http_response_header ?? [] as $h) {
  if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $mm)) $fsCode = (int)$mm[1];
}
if ($fsCode !== 200) {
  http_response_code(403); echo json_encode(['error' => 'non_superadmin']); exit;
}

// ── 4bis. Suppression d'une école (sous-domaine + domaine Firebase) ───
if ($action === 'delete_subdomain') {
  $fullDomain = $slug . '.' . ROOT_DOMAIN;
  // Retirer le sous-domaine cPanel (le dossier partagé /mapo n'est pas supprimé)
  $delUrl = 'https://' . CPANEL_HOST . ':2083/execute/SubDomain/delsubdomain?'
    . http_build_query(['domain' => $slug . '.' . ROOT_DOMAIN]);
  $ch = curl_init($delUrl);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: cpanel ' . CPANEL_USER . ':' . CPANEL_TOKEN],
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $delRaw = curl_exec($ch);
  $delCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $del = json_decode($delRaw, true);
  $subRemoved = ($delCode === 200 && ($del['status'] ?? 0));
  // Si déjà absent, on considère que c'est OK
  if (!$subRemoved) {
    $d = $del['errors'][0] ?? '';
    if (stripos((string)$d, 'not') !== false || stripos((string)$d, 'exist') !== false) {
      $subRemoved = true;
    }
  }
  // Retirer le domaine autorisé Firebase (best-effort)
  $authRemoved = removeFirebaseAuthorizedDomain($fullDomain);
  echo json_encode([
    'ok' => true,
    'subdomainRemoved' => $subRemoved,
    'authDomainRemoved' => $authRemoved['success'],
  ]);
  exit;
}

// ── 4. Créer le sous-domaine via l'API cPanel (UAPI) ──────────────────
$apiUrl = 'https://' . CPANEL_HOST . ':2083/execute/SubDomain/addsubdomain?'
  . http_build_query([
      'domain' => $slug,
      'rootdomain' => ROOT_DOMAIN,
      'dir' => MAPO_DIR,
    ]);
$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Authorization: cpanel ' . CPANEL_USER . ':' . CPANEL_TOKEN],
  CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
]);
$cpRaw = curl_exec($ch);
$cpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$cpErr = curl_error($ch);
curl_close($ch);

$subdomainAlready = false;
if ($cpRaw === false) {
  http_response_code(502); echo json_encode(['error' => 'cpanel_injoignable', 'detail' => $cpErr]); exit;
}
$cp = json_decode($cpRaw, true);
if ($cpCode !== 200 || !($cp['status'] ?? 0)) {
  $detail = $cp['errors'][0] ?? ('HTTP ' . $cpCode);
  // Sous-domaine déjà existant = succès fonctionnel (on continue vers Firebase)
  if (stripos((string)$detail, 'exist') !== false) {
    $subdomainAlready = true;
  } else {
    http_response_code(502); echo json_encode(['error' => 'cpanel_echec', 'detail' => $detail]); exit;
  }
}

// ── 5. Ajouter le sous-domaine aux « domaines autorisés » Firebase ────
// Best-effort : un échec ici n'annule pas la création du sous-domaine.
$fullDomain = $slug . '.' . ROOT_DOMAIN;
$authDomain = addFirebaseAuthorizedDomain($fullDomain);

echo json_encode([
  'ok' => true,
  'subdomain' => $fullDomain,
  'already' => $subdomainAlready,
  'authDomainAdded' => $authDomain['success'],
  'authDomainError' => $authDomain['success'] ? null : ($authDomain['error'] ?? null),
]);


// ════════════════════════════════════════════════════════════════════
// Helpers Firebase / Google service account
// ════════════════════════════════════════════════════════════════════

/**
 * Obtient un access token OAuth2 à partir de la clé de compte de service
 * Google (flux JWT bearer). Retourne [token, null] ou [null, code_erreur].
 */
function getGoogleAccessToken($scope) {
  if (!defined('SA_KEY_FILE') || !file_exists(SA_KEY_FILE)) return [null, 'sa_key_absente'];
  $key = json_decode(file_get_contents(SA_KEY_FILE), true);
  if (!$key || empty($key['client_email']) || empty($key['private_key'])) return [null, 'sa_key_invalide'];

  $b64 = function ($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); };
  $now = time();
  $jwtHeader = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $jwtClaims = $b64(json_encode([
    'iss'   => $key['client_email'],
    'scope' => $scope,
    'aud'   => 'https://oauth2.googleapis.com/token',
    'iat'   => $now,
    'exp'   => $now + 3600,
  ]));
  $unsigned = $jwtHeader . '.' . $jwtClaims;
  $sig = '';
  if (!openssl_sign($unsigned, $sig, $key['private_key'], OPENSSL_ALGO_SHA256)) {
    return [null, 'jwt_signature_echec'];
  }
  $assertion = $unsigned . '.' . $b64($sig);

  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
      'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion'  => $assertion,
    ]),
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 'token_injoignable'];
  $j = json_decode($res, true);
  if ($code !== 200 || empty($j['access_token'])) return [null, 'token_echec'];
  return [$j['access_token'], null];
}

/**
 * Ajoute $fullDomain à la liste des domaines autorisés de Firebase Auth
 * (Identity Toolkit Admin API getConfig/updateConfig). Idempotent.
 */
function addFirebaseAuthorizedDomain($fullDomain) {
  list($token, $err) = getGoogleAccessToken('https://www.googleapis.com/auth/cloud-platform');
  if (!$token) return ['success' => false, 'error' => $err];

  $base = 'https://identitytoolkit.googleapis.com/admin/v2/projects/' . FIREBASE_PROJECT . '/config';

  // Lire la config actuelle
  $ch = curl_init($base);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false || $code !== 200) return ['success' => false, 'error' => 'config_get_' . $code];
  $cfg = json_decode($res, true);
  $domains = isset($cfg['authorizedDomains']) && is_array($cfg['authorizedDomains'])
    ? $cfg['authorizedDomains'] : [];
  if (in_array($fullDomain, $domains, true)) return ['success' => true, 'already' => true];
  $domains[] = $fullDomain;

  // Écrire la config mise à jour (PATCH ciblé sur authorizedDomains)
  $ch = curl_init($base . '?updateMask=authorizedDomains');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['authorizedDomains' => $domains]),
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false || $code !== 200) return ['success' => false, 'error' => 'config_patch_' . $code];
  return ['success' => true];
}

/**
 * Retire $fullDomain de la liste des domaines autorisés de Firebase Auth.
 * Idempotent (absent = succès).
 */
function removeFirebaseAuthorizedDomain($fullDomain) {
  list($token, $err) = getGoogleAccessToken('https://www.googleapis.com/auth/cloud-platform');
  if (!$token) return ['success' => false, 'error' => $err];

  $base = 'https://identitytoolkit.googleapis.com/admin/v2/projects/' . FIREBASE_PROJECT . '/config';

  $ch = curl_init($base);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false || $code !== 200) return ['success' => false, 'error' => 'config_get_' . $code];
  $cfg = json_decode($res, true);
  $domains = isset($cfg['authorizedDomains']) && is_array($cfg['authorizedDomains'])
    ? $cfg['authorizedDomains'] : [];
  if (!in_array($fullDomain, $domains, true)) return ['success' => true, 'already' => true];
  // Ne jamais retirer les domaines système Firebase
  $domains = array_values(array_filter($domains, function ($d) use ($fullDomain) {
    return $d !== $fullDomain;
  }));

  $ch = curl_init($base . '?updateMask=authorizedDomains');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['authorizedDomains' => $domains]),
    CURLOPT_TIMEOUT => 8,
  CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false || $code !== 200) return ['success' => false, 'error' => 'config_patch_' . $code];
  return ['success' => true];
}
