<?php
/**
 * MAPO+ — Connecteur Carré (consommateur OAuth2 Authorization Code + PKCE).
 *
 * Permet à MIAPO de lire, EN LECTURE SEULE, les notes de cours de l'apprenant
 * stockées dans Carré (carre.app-edufrem.com), APRÈS que l'utilisateur a
 * explicitement relié son compte Carré.
 *
 * Sécurité / archi :
 *   - MAPO+ et Carré sont deux projets Firebase DISTINCTS : aucun identifiant
 *     Firebase ne circule ; le seul lien est le jeton OAuth délivré par Carré.
 *   - Client PUBLIC (client_id « mapo-plus »), pas de secret client : la preuve
 *     est le PKCE (S256).
 *   - Les jetons Carré (access + refresh) sont stockés CÔTÉ SERVEUR, CHIFFRÉS
 *     (AES-256-GCM), par uid Firebase MAPO+, jamais exposés au navigateur.
 *   - Chaque appel est authentifié par le jeton Firebase de l'utilisateur MAPO+
 *     (verifyFirebaseToken) : un compte ne voit jamais les jetons d'un autre.
 *   - La clé de chiffrement vit dans mapo-carre-config.php (hors git, chmod 600).
 *
 * Actions (?action=…) :
 *   start (POST)     → génère PKCE + state, renvoie l'URL d'autorisation Carré.
 *   callback (POST)  → { code, state } : échange le code contre les jetons.
 *   status (GET)     → { linked: bool }.
 *   unlink (POST)    → supprime les jetons stockés.
 *   notes (GET)      → proxy /api/v1/notes (?q=&limit=).
 *   note (GET)       → proxy /api/v1/notes/{id} (?id=).
 *   folders (GET)    → proxy /api/v1/folders.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(30);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Config (clé de chiffrement) ───────────────────────────────────────
$cfgPath = __DIR__ . '/mapo-carre-config.php';
if (!file_exists($cfgPath)) { echo json_encode(['ok' => false, 'error' => 'not_configured']); exit; }
require $cfgPath;
if (!defined('CARRE_ENC_KEY') || CARRE_ENC_KEY === '' || strpos(CARRE_ENC_KEY, 'A_REMPLIR') === 0) {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');

// ── Client OAuth Carré (valeurs publiques) ────────────────────────────
define('CARRE_CLIENT_ID', 'mapo-plus');
// Redirect host-aware : fonctionne depuis miapo ET mapoplus (les deux callbacks
// sont enregistrés côté Carré). On se base sur l'hôte de la requête, restreint à
// une liste blanche pour ne jamais renvoyer vers un hôte arbitraire. L'hôte est
// constant pendant tout un flux OAuth (start + callback), donc le redirect_uri
// reste identique à l'échange du jeton.
$__carre_host = isset($_SERVER['HTTP_HOST']) ? strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'])) : 'miapo.app-edufrem.com';
if (!in_array($__carre_host, ['miapo.app-edufrem.com', 'mapoplus.app-edufrem.com'], true)) {
    $__carre_host = 'miapo.app-edufrem.com';
}
define('CARRE_REDIRECT', 'https://' . $__carre_host . '/oauth/carre/callback');
define('CARRE_SCOPE', 'notes.read');
define('CARRE_AUTHORIZE_URL', 'https://carre.app-edufrem.com/api/oauth-authorize.php');
define('CARRE_TOKEN_URL', 'https://carre.app-edufrem.com/api/oauth-token.php');
define('CARRE_API_BASE', 'https://carre.app-edufrem.com/api/v1');

// ── Authentification : utilisateur MAPO+ (jeton Firebase) ─────────────
$uid = verifyFirebaseToken();
if (!$uid) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }

$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

switch ($action) {
  case 'start':    echo json_encode(carre_start($uid)); break;
  case 'callback': echo json_encode(carre_callback($uid, $body)); break;
  case 'status':   echo json_encode(carre_status($uid)); break;
  case 'unlink':   echo json_encode(carre_unlink($uid)); break;
  case 'notes':    echo json_encode(carre_proxy($uid, '/notes', ['q' => $_GET['q'] ?? '', 'limit' => $_GET['limit'] ?? '20'])); break;
  case 'note':     echo json_encode(carre_proxy($uid, '/notes/' . rawurlencode((string) ($_GET['id'] ?? '')), [])); break;
  case 'folders':  echo json_encode(carre_proxy($uid, '/folders', [])); break;
  default:         http_response_code(400); echo json_encode(['ok' => false, 'error' => 'action_invalide']);
}

// ════════════════════════════════════════════════════════════════════
//  Stockage verrouillé (fichiers JSON, même schéma que mapo-credits)
// ════════════════════════════════════════════════════════════════════
function carre_store_path() { return __DIR__ . '/mapo-carre-tokens.json'; }
function carre_pending_path() { return __DIR__ . '/mapo-carre-pending.json'; }

/** Lecture-modif-écriture verrouillée. $fn(array $map): array [nouveau map, valeur de retour]. */
function carre_mutate($path, $fn) {
  $fp = fopen($path, 'c+');
  if (!$fp) return null;
  flock($fp, LOCK_EX);
  $map = json_decode(stream_get_contents($fp), true);
  if (!is_array($map)) $map = [];
  $res = $fn($map);
  ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($res[0]));
  fflush($fp); flock($fp, LOCK_UN); fclose($fp);
  return $res[1];
}
function carre_read($path) {
  if (!file_exists($path)) return [];
  $j = json_decode(@file_get_contents($path), true);
  return is_array($j) ? $j : [];
}

// ════════════════════════════════════════════════════════════════════
//  Chiffrement des jetons au repos (AES-256-GCM)
// ════════════════════════════════════════════════════════════════════
function carre_enc($plain) {
  $key = hash('sha256', CARRE_ENC_KEY, true);
  $iv = random_bytes(12);
  $tag = '';
  $ct = openssl_encrypt((string) $plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
  if ($ct === false) return '';
  return base64_encode($iv . $tag . $ct);
}
function carre_dec($blob) {
  $raw = base64_decode((string) $blob, true);
  if ($raw === false || strlen($raw) < 29) return null;
  $key = hash('sha256', CARRE_ENC_KEY, true);
  $iv = substr($raw, 0, 12);
  $tag = substr($raw, 12, 16);
  $ct = substr($raw, 28);
  $pt = openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
  return $pt === false ? null : $pt;
}

// ════════════════════════════════════════════════════════════════════
//  Flux OAuth
// ════════════════════════════════════════════════════════════════════
function carre_b64url($bin) { return rtrim(strtr(base64_encode($bin), '+/', '-_'), '='); }

function carre_start($uid) {
  $verifier = carre_b64url(random_bytes(48));                       // 64 caractères URL-safe
  $challenge = carre_b64url(hash('sha256', $verifier, true));       // S256
  $state = carre_b64url(random_bytes(24));
  carre_mutate(carre_pending_path(), function ($map) use ($state, $uid, $verifier) {
    $now = time();
    foreach ($map as $k => $v) { if (($v['ts'] ?? 0) < $now - 900) unset($map[$k]); } // purge > 15 min
    $map[$state] = ['uid' => $uid, 'verifier' => $verifier, 'ts' => $now];
    return [$map, true];
  });
  $url = CARRE_AUTHORIZE_URL . '?' . http_build_query([
    'client_id' => CARRE_CLIENT_ID,
    'redirect_uri' => CARRE_REDIRECT,
    'response_type' => 'code',
    'scope' => CARRE_SCOPE,
    'state' => $state,
    'code_challenge' => $challenge,
    'code_challenge_method' => 'S256',
  ]);
  return ['ok' => true, 'authorizeUrl' => $url];
}

function carre_callback($uid, $body) {
  $code = (string) ($body['code'] ?? '');
  $state = (string) ($body['state'] ?? '');
  if ($code === '' || $state === '') return ['ok' => false, 'error' => 'requete_invalide'];

  // Récupère + consomme l'état (anti-CSRF, lié à l'uid courant).
  $pending = carre_mutate(carre_pending_path(), function ($map) use ($state) {
    $p = $map[$state] ?? null;
    unset($map[$state]);
    return [$map, $p];
  });
  if (!$pending || ($pending['uid'] ?? '') !== $uid || ($pending['ts'] ?? 0) < time() - 900) {
    return ['ok' => false, 'error' => 'etat_invalide'];
  }

  $resp = carre_http_post(CARRE_TOKEN_URL, [
    'grant_type' => 'authorization_code',
    'code' => $code,
    'code_verifier' => $pending['verifier'],
    'client_id' => CARRE_CLIENT_ID,
    'redirect_uri' => CARRE_REDIRECT,
  ]);
  if ($resp['status'] !== 200 || empty($resp['json']['access_token'])) {
    return ['ok' => false, 'error' => 'echange_echoue', 'detail' => $resp['json']['error'] ?? $resp['status']];
  }
  carre_save_tokens($uid, $resp['json']);
  return ['ok' => true, 'linked' => true];
}

function carre_save_tokens($uid, $t) {
  $rec = [
    'access' => carre_enc($t['access_token']),
    'refresh' => !empty($t['refresh_token']) ? carre_enc($t['refresh_token']) : '',
    'exp' => time() + (int) ($t['expires_in'] ?? 3600) - 60,  // marge de 60 s
    'scope' => $t['scope'] ?? CARRE_SCOPE,
  ];
  carre_mutate(carre_store_path(), function ($map) use ($uid, $rec) { $map[$uid] = $rec; return [$map, true]; });
}

function carre_status($uid) {
  $map = carre_read(carre_store_path());
  $rec = $map[$uid] ?? null;
  return ['ok' => true, 'linked' => !empty($rec), 'scope' => $rec['scope'] ?? ''];
}

function carre_unlink($uid) {
  carre_mutate(carre_store_path(), function ($map) use ($uid) { unset($map[$uid]); return [$map, true]; });
  return ['ok' => true, 'linked' => false];
}

/**
 * Renvoie un access token valide, en rafraîchissant si nécessaire (rotation).
 * Le rafraîchissement est SÉRIALISÉ par le verrou du fichier de jetons.
 */
function carre_access($uid, $force = false) {
  if (!$force) {
    $map = carre_read(carre_store_path());
    $rec = $map[$uid] ?? null;
    if (!$rec) return null;
    if (($rec['exp'] ?? 0) > time()) return carre_dec($rec['access']);
  }
  return carre_mutate(carre_store_path(), function ($map) use ($uid, $force) {
    $rec = $map[$uid] ?? null;
    if (!$rec) return [$map, null];
    // Un autre process a peut-être déjà rafraîchi entre-temps.
    if (!$force && ($rec['exp'] ?? 0) > time()) return [$map, carre_dec($rec['access'])];
    $refresh = ($rec['refresh'] ?? '') !== '' ? carre_dec($rec['refresh']) : null;
    if (!$refresh) { unset($map[$uid]); return [$map, null]; }
    $resp = carre_http_post(CARRE_TOKEN_URL, [
      'grant_type' => 'refresh_token',
      'refresh_token' => $refresh,
      'client_id' => CARRE_CLIENT_ID,
    ]);
    if ($resp['status'] !== 200 || empty($resp['json']['access_token'])) {
      unset($map[$uid]);              // refresh révoqué/expiré → on délie (re-consentement requis)
      return [$map, null];
    }
    $t = $resp['json'];
    $map[$uid] = [
      'access' => carre_enc($t['access_token']),
      'refresh' => !empty($t['refresh_token']) ? carre_enc($t['refresh_token']) : ($rec['refresh'] ?? ''),
      'exp' => time() + (int) ($t['expires_in'] ?? 3600) - 60,
      'scope' => $t['scope'] ?? ($rec['scope'] ?? CARRE_SCOPE),
    ];
    return [$map, $t['access_token']];
  });
}

function carre_proxy($uid, $path, $query) {
  $token = carre_access($uid);
  if (!$token) return ['ok' => false, 'error' => 'non_relie'];
  $q = array_filter($query, function ($v) { return $v !== '' && $v !== null; });
  $url = CARRE_API_BASE . $path . (empty($q) ? '' : '?' . http_build_query($q));
  $resp = carre_http_get($url, $token);
  if ($resp['status'] === 401) {                 // jeton invalide → refresh forcé + une seule reprise
    $token = carre_access($uid, true);
    if (!$token) return ['ok' => false, 'error' => 'non_relie'];
    $resp = carre_http_get($url, $token);
  }
  if ($resp['status'] === 403) return ['ok' => false, 'error' => 'scope_insuffisant'];
  if ($resp['status'] === 404) return ['ok' => false, 'error' => 'introuvable'];
  if ($resp['status'] !== 200) return ['ok' => false, 'error' => 'carre_indisponible', 'status' => $resp['status']];
  return ['ok' => true, 'data' => $resp['json']];
}

// ════════════════════════════════════════════════════════════════════
//  HTTP (cURL)
// ════════════════════════════════════════════════════════════════════
function carre_http_post($url, $form) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($form),
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 8,
  ]);
  $raw = curl_exec($ch);
  $st = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return ['status' => $st, 'json' => ($raw === false ? null : json_decode($raw, true))];
}
function carre_http_get($url, $token) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 8,
  ]);
  $raw = curl_exec($ch);
  $st = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return ['status' => $st, 'json' => ($raw === false ? null : json_decode($raw, true))];
}

// ════════════════════════════════════════════════════════════════════
//  Vérification du jeton Firebase (RS256) — miroir de mapo-ia.php.
//  Retourne l'uid MAPO+ ou null.
// ════════════════════════════════════════════════════════════════════
function verifyFirebaseToken() {
  if (!defined('FIREBASE_PROJECT')) return null;
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) return null;
  $idToken = $m[1];

  $b64 = function ($s) { return base64_decode(strtr($s, '-_', '+/')); };
  $parts = explode('.', $idToken);
  if (count($parts) !== 3) return null;
  $h = json_decode($b64($parts[0]), true);
  $p = json_decode($b64($parts[1]), true);
  $sig = $b64($parts[2]);
  if (($h['alg'] ?? '') !== 'RS256' || empty($h['kid'])) return null;
  if (($p['aud'] ?? '') !== FIREBASE_PROJECT
    || ($p['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT
    || ($p['exp'] ?? 0) < time()
    || empty($p['sub'])) return null;

  $cacheFile = sys_get_temp_dir() . '/firebase_google_certs.json';
  $certs = null;
  if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 3600) {
    $certs = json_decode(file_get_contents($cacheFile), true);
  }
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
  $ok = openssl_verify($parts[0] . '.' . $parts[1], $sig, $pub, OPENSSL_ALGO_SHA256);
  return $ok === 1 ? $p['sub'] : null;
}
