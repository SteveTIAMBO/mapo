<?php
/**
 * MAPO — Pont de LIAISON école ↔ MAPO+ (#124).
 *
 * Un compte MAPO+ (B2C) relié à un élève d'une école MAPO doit voir SES devoirs
 * (puis cours, notes, bulletins). Problème : ces données vivent dans des documents
 * GROUPÉS (schools/{sid}/devoirs-data/data contient TOUTE l'école). Les règles
 * Firestore ne savent pas « trancher » un document → un accès client direct
 * exposerait les données des AUTRES élèves. Donc ce pont, côté serveur :
 *   1. vérifie le jeton Firebase de l'apprenant (RS256, aud = projet, non expiré) ;
 *   2. lit la donnée école avec le COMPTE DE SERVICE (admin, contourne les règles) ;
 *   3. ne renvoie QUE la tranche de l'élève lié — jamais celle des autres.
 *
 * Confiance : le lien naît CÔTÉ ÉCOLE. Un membre (directeur/admin) « autorise »
 * l'accès MAPO+ d'un élève → écrit schools/{sid}/mapoplus_invites/{code}
 * {eleveId, className, classId, matricule, …}. L'apprenant saisit ce code : ce
 * pont le vérifie et scelle le lien schools/{sid}/liens_mapoplus/{uid} (admin).
 *
 * Actions (POST JSON) :
 *   - redeem  {code}             → scelle le lien, renvoie {schoolId, eleveId, …}
 *   - devoirs {schoolId}         → renvoie les devoirs de SA classe + SES rendus
 *
 * Installation serveur (une fois, à côté de mapo-ia.php dans le dossier MAPO) :
 *   - déposer mapo-sa-key.json (la clé du compte de service, la MÊME que provision) ;
 *   - (optionnel) mapo-lien-config.php définissant FIREBASE_PROJECT (défaut
 *     « mapo-edufrem », non secret). Le fichier .htaccess protège déjà *-config.php
 *     et *-key.json.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(30);

// Même origine en prod (/mapo-lien.php). CORS défensif : on n'autorise QUE les
// sous-domaines *.app-edufrem.com (miroir de mapo-ia.php).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'method_not_allowed']); exit; }

// Config (best-effort) : FIREBASE_PROJECT non secret → défaut si absent.
$cfg = __DIR__ . '/mapo-lien-config.php';
if (is_file($cfg)) require_once $cfg;
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $body['action'] ?? '';

// ── 1. Vérifier le jeton Firebase de l'apprenant → uid ────────────────
$uid = verifyFirebaseUid();
if (!$uid) { http_response_code(401); echo json_encode(['error' => 'non_autorise']); exit; }

// ── 2. Jeton admin (compte de service) pour lire/écrire Firestore ─────
list($saToken, $saErr) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
if (!$saToken) { http_response_code(503); echo json_encode(['error' => 'admin_indisponible', 'detail' => $saErr]); exit; }

// ════════════════════════════════════════════════════════════════════
if ($action === 'redeem') {
  $code = trim((string)($body['code'] ?? ''));
  // Le code embarque le slug de l'école : « {schoolId}~{aléatoire} ».
  if (!preg_match('/^([a-z0-9-]{2,40})~([A-Za-z0-9]{4,40})$/', $code, $m)) {
    http_response_code(400); echo json_encode(['error' => 'code_invalide']); exit;
  }
  $schoolId = $m[1];

  list($inv, $invCode) = fsGet("schools/{$schoolId}/mapoplus_invites/" . rawurlencode($code), $saToken);
  if ($invCode !== 200 || !$inv) { http_response_code(404); echo json_encode(['error' => 'code_introuvable']); exit; }
  $invF = fsDecodeFields($inv['fields'] ?? []);
  if (!empty($invF['used'])) { http_response_code(409); echo json_encode(['error' => 'code_deja_utilise']); exit; }
  $eleveId = (string)($invF['eleveId'] ?? '');
  if ($eleveId === '') { http_response_code(422); echo json_encode(['error' => 'invite_incomplete']); exit; }

  // Élève = source de vérité (nom, classe, matricule) — défensif si l'invite est partielle.
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $elF = ($elCode === 200 && $el) ? fsDecodeFields($el['fields'] ?? []) : [];
  $className = (string)($elF['className'] ?? $invF['className'] ?? '');
  $classId   = (string)($invF['classId'] ?? '');
  $matricule = (string)($elF['matricule'] ?? $invF['matricule'] ?? '');
  $firstName = (string)($elF['firstName'] ?? $invF['firstName'] ?? '');
  $lastName  = (string)($elF['lastName'] ?? $invF['lastName'] ?? '');

  // Sceller le lien de confiance (admin). Clé = uid → un compte, un élève.
  $now = gmdate('Y-m-d\TH:i:s\Z');
  $linkFields = fsEncodeFields([
    'eleveId' => $eleveId, 'className' => $className, 'classId' => $classId,
    'matricule' => $matricule, 'linkedAt' => $now, 'code' => $code,
  ]);
  $wCode = fsPatch("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid), $linkFields, $saToken);
  if ($wCode !== 200) { http_response_code(502); echo json_encode(['error' => 'lien_non_scelle', 'detail' => $wCode]); exit; }

  // Marquer l'invite consommée (mise à jour ciblée, ne supprime pas les autres champs).
  fsPatch("schools/{$schoolId}/mapoplus_invites/" . rawurlencode($code),
    fsEncodeFields(['used' => true, 'usedByUid' => $uid, 'usedAt' => $now]),
    $saToken, ['used', 'usedByUid', 'usedAt']);

  echo json_encode(['ok' => true, 'lien' => [
    'schoolId' => $schoolId, 'eleveId' => $eleveId, 'className' => $className,
    'classId' => $classId, 'matricule' => $matricule,
    'firstName' => $firstName, 'lastName' => $lastName, 'ecole' => (string)($invF['ecole'] ?? ''),
  ]]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
if ($action === 'devoirs') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }

  // Le lien fait foi : eleveId/className viennent du serveur, JAMAIS du client
  // (sinon on pourrait réclamer les devoirs d'un autre).
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid), $saToken);
  if ($lkCode !== 200 || !$lk) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  $eleveId   = (string)($lkF['eleveId'] ?? '');
  $className = (string)($lkF['className'] ?? '');
  $classId   = (string)($lkF['classId'] ?? '');
  if ($eleveId === '' || $className === '') { http_response_code(422); echo json_encode(['error' => 'lien_incomplet']); exit; }

  list($doc, $dCode) = fsGet("schools/{$schoolId}/devoirs-data/data", $saToken);
  if ($dCode !== 200 || !$doc) { echo json_encode(['ok' => true, 'className' => $className, 'devoirs' => []]); exit; }
  $data = fsDecodeFields($doc['fields'] ?? []);
  $all = is_array($data['devoirs'] ?? null) ? $data['devoirs'] : [];
  $subs = is_array($data['submissions'] ?? null) ? $data['submissions'] : [];

  $out = [];
  foreach ($all as $d) {
    if (!is_array($d)) continue;
    $dClass = (string)($d['className'] ?? '');
    $dClassId = (string)($d['classId'] ?? '');
    // Tranche de SA classe uniquement (par nom OU par id de classe).
    if (!(($dClass !== '' && $dClass === $className) || ($dClassId !== '' && $classId !== '' && $dClassId === $classId))) continue;
    $did = (string)($d['id'] ?? '');
    $sub = ($did !== '' && isset($subs[$did . '_' . $eleveId]) && is_array($subs[$did . '_' . $eleveId])) ? $subs[$did . '_' . $eleveId] : null;
    $out[] = [
      'id' => $did,
      'title' => (string)($d['title'] ?? ''),
      'description' => (string)($d['description'] ?? ''),
      'subjectName' => (string)($d['subjectName'] ?? ''),
      'type' => (string)($d['type'] ?? ''),
      'isDigital' => !empty($d['isDigital']),
      'dueDate' => (string)($d['dueDate'] ?? ''),
      'createdAt' => (string)($d['createdAt'] ?? ''),
      // On ne renvoie QUE le rendu de CET élève (jamais ceux des autres).
      'submission' => $sub ? [
        'submittedAt' => (string)($sub['submittedAt'] ?? ''),
        'grade' => isset($sub['grade']) ? $sub['grade'] : null,
        'feedback' => (string)($sub['feedback'] ?? ''),
        'gradedAt' => (string)($sub['gradedAt'] ?? ''),
      ] : null,
    ];
  }
  echo json_encode(['ok' => true, 'className' => $className, 'devoirs' => $out]);
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
//  Helpers : jeton Firebase, compte de service, Firestore REST
// ════════════════════════════════════════════════════════════════════
function b64url_decode($s) { return base64_decode(strtr($s, '-_', '+/')); }

/** Vérifie le jeton Firebase (RS256 + aud + iss + exp) et renvoie l'uid ou null. */
function verifyFirebaseUid() {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) return null;
  $parts = explode('.', $m[1]);
  if (count($parts) !== 3) return null;
  $h = json_decode(b64url_decode($parts[0]), true);
  $p = json_decode(b64url_decode($parts[1]), true);
  $sig = b64url_decode($parts[2]);
  if (($h['alg'] ?? '') !== 'RS256' || empty($h['kid'])) return null;
  if (($p['aud'] ?? '') !== FIREBASE_PROJECT
    || ($p['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT
    || ($p['exp'] ?? 0) < time()
    || empty($p['sub'])) return null;
  $cacheFile = sys_get_temp_dir() . '/firebase_google_certs.json';
  $certs = null;
  if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 3600) $certs = json_decode(file_get_contents($cacheFile), true);
  if (!$certs) {
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
    $raw = @file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', false, $ctx);
    if ($raw === false) return null;
    $certs = json_decode($raw, true);
    @file_put_contents($cacheFile, $raw);
  }
  $cert = $certs[$h['kid']] ?? null;
  if (!$cert) return null;
  $pub = openssl_pkey_get_public($cert);
  if (openssl_verify($parts[0] . '.' . $parts[1], $sig, $pub, OPENSSL_ALGO_SHA256) !== 1) return null;
  return $p['sub'];
}

/** OAuth2 access token depuis la clé du compte de service (JWT bearer). [token, err]. */
function getGoogleAccessToken($scope) {
  if (!defined('SA_KEY_FILE') || !file_exists(SA_KEY_FILE)) return [null, 'sa_key_absente'];
  $key = json_decode(file_get_contents(SA_KEY_FILE), true);
  if (!$key || empty($key['client_email']) || empty($key['private_key'])) return [null, 'sa_key_invalide'];
  $b64 = function ($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); };
  $now = time();
  $unsigned = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . $b64(json_encode([
    'iss' => $key['client_email'], 'scope' => $scope,
    'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600,
  ]));
  $sig = '';
  if (!openssl_sign($unsigned, $sig, $key['private_key'], OPENSSL_ALGO_SHA256)) return [null, 'jwt_signature_echec'];
  $assertion = $unsigned . '.' . $b64($sig);
  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $assertion]),
    CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 'token_injoignable'];
  $j = json_decode($res, true);
  if ($code !== 200 || empty($j['access_token'])) return [null, 'token_echec'];
  return [$j['access_token'], null];
}

function fsBaseUrl() {
  return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT . '/databases/(default)/documents/';
}
/** GET un document Firestore (admin). Renvoie [data|null, httpCode]. */
function fsGet($path, $token) {
  $ch = curl_init(fsBaseUrl() . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 0];
  return [json_decode($res, true), $code];
}
/** PATCH (create/update) un document. $maskFields = mise à jour ciblée. Renvoie httpCode. */
function fsPatch($path, $fields, $token, $maskFields = null) {
  $url = fsBaseUrl() . $path;
  if (is_array($maskFields)) {
    $q = [];
    foreach ($maskFields as $f) $q[] = 'updateMask.fieldPaths=' . rawurlencode($f);
    $url .= '?' . implode('&', $q);
  }
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['fields' => $fields]),
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $res === false ? 0 : $code;
}

// ── Encodage / décodage des « valeurs typées » Firestore REST ──
function fsEncodeValue($v) {
  if (is_bool($v)) return ['booleanValue' => $v];
  if (is_int($v)) return ['integerValue' => (string)$v];
  if (is_float($v)) return ['doubleValue' => $v];
  if (is_null($v)) return ['nullValue' => null];
  if (is_array($v)) {
    $isList = array_keys($v) === range(0, count($v) - 1);
    if ($isList) return ['arrayValue' => ['values' => array_map('fsEncodeValue', $v)]];
    return ['mapValue' => ['fields' => fsEncodeFields($v)]];
  }
  return ['stringValue' => (string)$v];
}
function fsEncodeFields($assoc) {
  $out = [];
  foreach ($assoc as $k => $v) $out[$k] = fsEncodeValue($v);
  return $out;
}
function fsDecodeValue($v) {
  if (!is_array($v)) return null;
  if (array_key_exists('nullValue', $v)) return null;
  if (isset($v['stringValue'])) return $v['stringValue'];
  if (isset($v['booleanValue'])) return (bool)$v['booleanValue'];
  if (isset($v['integerValue'])) return (int)$v['integerValue'];
  if (isset($v['doubleValue'])) return (float)$v['doubleValue'];
  if (isset($v['timestampValue'])) return $v['timestampValue'];
  if (isset($v['referenceValue'])) return $v['referenceValue'];
  if (isset($v['mapValue'])) return fsDecodeFields($v['mapValue']['fields'] ?? []);
  if (isset($v['arrayValue'])) {
    $vals = $v['arrayValue']['values'] ?? [];
    return array_map('fsDecodeValue', is_array($vals) ? $vals : []);
  }
  return null;
}
function fsDecodeFields($fields) {
  $out = [];
  if (is_array($fields)) foreach ($fields as $k => $v) $out[$k] = fsDecodeValue($v);
  return $out;
}
