<?php
/**
 * MAPO — Adaptateur d'encaissement Tranzak (SQUELETTE, à tester en sandbox).
 *
 * Même contrat interne que mapo-pay.php (CinetPay) pour pouvoir vivre derrière
 * la meme couche « paiement » agnostique. L'app appelle ce proxy (meme domaine)
 * pour encaisser la scolarite par MTN / Orange Money (Cameroun, XAF).
 *
 * Actions (POST JSON, champ "action") :
 *   - init   : cree une charge mobile money -> { transaction_id, mode, push } ,
 *              (ou { payment_url } si on passe par la page web hebergee).
 *   - check  : interroge l'etat (serveur -> Tranzak, source de verite)
 *              -> { status: ACCEPTED | PENDING | REFUSED, amount, method }
 *
 * Webhook Tranzak (GET/POST sans "action", callbackUrl) :
 *   accuse reception 200. On verifie l'authKey, mais la confirmation qui
 *   ENREGISTRE le paiement dans MAPO se fait toujours par un "check" serveur.
 *
 * Auth Tranzak : POST /auth/token { appId, appKey } -> token (~2h). Mis en cache.
 * Base URL : sandbox https://sandbox.dsapi.tranzak.me | prod https://dsapi.tranzak.me
 *
 * Installation : deposer dans public_html/mapo/ avec mapo-pay-tranzak-config.php.
 * Le .htaccess doit proteger le fichier de config (comme pour CinetPay).
 *
 * NB : squelette de cadrage. A brancher au front apres validation sandbox.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(25);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Config marchand ───────────────────────────────────────────────────
$cfgPath = __DIR__ . '/mapo-pay-tranzak-config.php';
if (file_exists($cfgPath)) require $cfgPath;
$configured = defined('TRANZAK_APP_ID') && TRANZAK_APP_ID !== '' && strpos((string) TRANZAK_APP_ID, 'A_REMPLIR') !== 0
           && defined('TRANZAK_APP_KEY') && TRANZAK_APP_KEY !== '';
$demoOpen = defined('PAY_DEMO_OPEN') && PAY_DEMO_OPEN;
$MODE = (defined('TRANZAK_MODE') && strtoupper(TRANZAK_MODE) === 'PRODUCTION') ? 'live' : 'sandbox';
$BASE = $MODE === 'live' ? 'https://dsapi.tranzak.me' : 'https://sandbox.dsapi.tranzak.me';

// ── Webhook Tranzak (callbackUrl) : pas de champ "action" ─────────────
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) $body = [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

if ($action === '') {
  // Notification Tranzak (REQUEST.COMPLETED / TRANSFER.COMPLETED / BULK_PAYMENT.COMPLETED).
  // On verifie l'authKey pre-partage si configure, puis on accuse reception 200.
  $expected = defined('TRANZAK_WEBHOOK_KEY') ? (string) TRANZAK_WEBHOOK_KEY : '';
  // Selon l'enveloppe Tranzak, authKey peut être au 1er niveau ou sous "data".
  $got = (string) ($body['authKey'] ?? ($body['data']['authKey'] ?? ''));
  if ($expected !== '' && !hash_equals($expected, $got)) {
    http_response_code(401); echo json_encode(['ok' => false, 'error' => 'webhook_non_authentifie']); exit;
  }
  // La confirmation reelle (ecriture du paiement) est faite par l'app via "check".
  http_response_code(200);
  echo json_encode(['ok' => true, 'received' => true]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// ── Authentification appelant : jeton Firebase OU repli demo ──────────
$uid = verifyFirebaseToken();
if (!$uid && !$demoOpen) {
  http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : init  (creer une charge mobile money)
// ════════════════════════════════════════════════════════════════════
if ($action === 'init') {
  if (!rateLimitOk()) {
    http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit;
  }

  $amount = (int) round((float) ($body['amount'] ?? 0));
  $currency = preg_replace('/[^A-Z]/', '', strtoupper($body['currency'] ?? 'XAF'));
  if ($currency === '') $currency = 'XAF';
  if ($amount < 1) {
    http_response_code(400); echo json_encode(['ok' => false, 'error' => 'montant_invalide']); exit;
  }

  // Reference marchande unique (unique sur 30 jours cote Tranzak).
  $ref = 'MAPO' . date('ymdHis') . substr(str_replace('.', '', uniqid('', true)), -6);
  $desc = trim(mb_substr((string) ($body['description'] ?? 'Scolarite'), 0, 120));
  if ($desc === '') $desc = 'Scolarite';
  $phone = preg_replace('/[^0-9]/', '', (string) ($body['mobileWalletNumber'] ?? $body['customer_phone_number'] ?? ''));

  // Mode simulation : pas de compte Tranzak -> parcours demo cote app.
  if (!$configured) {
    echo json_encode([
      'ok' => true, 'mode' => 'sim', 'transaction_id' => $ref,
      'amount' => $amount, 'currency' => $currency, 'payment_url' => null, 'push' => true,
    ]);
    exit;
  }

  $token = tzToken($BASE);
  if (!$token) { echo json_encode(['ok' => false, 'error' => 'tranzak_auth_echec']); exit; }

  $base = baseUrl();
  // Deux voies : charge directe (numero fourni) ou page web hebergee (sinon).
  if ($phone !== '') {
    $payload = [
      'amount' => $amount,
      'currencyCode' => $currency,
      'description' => $desc,
      'mchTransactionRef' => $ref,
      'mobileWalletNumber' => $phone,          // prefixe pays, ex : 2376XXXXXXXX
      'callbackUrl' => $base . '/mapo-pay-tranzak.php',
    ];
    $resp = tzApi($BASE, 'POST', '/xp021/v1/request/create-mobile-wallet-charge', $token, $payload);
    $push = true;
  } else {
    $payload = [
      'amount' => $amount,
      'currencyCode' => $currency,
      'description' => $desc,
      'mchTransactionRef' => $ref,
      'returnUrl' => (string) ($body['return_url'] ?? ($base . '/')),
      'callbackUrl' => $base . '/mapo-pay-tranzak.php',
    ];
    $resp = tzApi($BASE, 'POST', '/xp021/v1/request/create', $token, $payload);
    $push = false;
  }

  if ($resp === null) { echo json_encode(['ok' => false, 'error' => 'tranzak_injoignable']); exit; }
  if (!empty($resp['success']) && !empty($resp['data'])) {
    $d = $resp['data'];
    echo json_encode([
      'ok' => true, 'mode' => $MODE,
      'transaction_id' => $d['requestId'] ?? $ref,
      'mch_ref' => $ref,
      'amount' => $amount, 'currency' => $currency,
      'push' => $push,
      'payment_url' => $d['links']['paymentAuthUrl'] ?? null,
    ]);
  } else {
    echo json_encode([
      'ok' => false, 'error' => 'init_echec',
      'detail' => $resp['errorMsg'] ?? ($resp['errorCode'] ?? null),
    ]);
  }
  exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : check  (source de verite serveur -> Tranzak)
// ════════════════════════════════════════════════════════════════════
if ($action === 'check') {
  $reqId = preg_replace('/[^A-Za-z0-9]/', '', (string) ($body['transaction_id'] ?? ''));
  if ($reqId === '') {
    http_response_code(400); echo json_encode(['ok' => false, 'error' => 'transaction_manquante']); exit;
  }
  if (!$configured) {
    echo json_encode(['ok' => true, 'mode' => 'sim', 'status' => 'PENDING']); exit;
  }

  $token = tzToken($BASE);
  if (!$token) { echo json_encode(['ok' => false, 'error' => 'tranzak_auth_echec']); exit; }

  $resp = tzApi($BASE, 'GET', '/xp021/v1/request/details?requestId=' . urlencode($reqId), $token);
  if ($resp === null) { echo json_encode(['ok' => false, 'error' => 'tranzak_injoignable']); exit; }

  $d = $resp['data'] ?? [];
  $st = strtoupper($d['status'] ?? ($d['transactionStatus'] ?? ''));
  if ($st === 'SUCCESSFUL') {
    // Commission Tranzak : selon le payload, le frais peut être au niveau racine,
    // sous merchant, ou sous payer. On expose aussi le net réellement reçu.
    $fee = $d['fee'] ?? ($d['merchant']['fee'] ?? ($d['payer']['fee'] ?? null));
    $net = $d['merchant']['netAmountReceived'] ?? null;
    echo json_encode([
      'ok' => true, 'status' => 'ACCEPTED',
      'amount' => isset($d['amount']) ? (int) $d['amount'] : null,
      'currency' => $d['currencyCode'] ?? null,
      'method' => $d['paymentMethod'] ?? ($d['payer']['paymentMethod'] ?? null),
      'transaction_id_op' => $d['transactionId'] ?? null,
      'fee' => $fee !== null ? (float) $fee : null,
      'net' => $net !== null ? (float) $net : null,
    ]);
  } elseif (in_array($st, ['PENDING', 'PAYMENT_IN_PROGRESS', 'PAYER_REDIRECT_REQUIRED'], true)) {
    echo json_encode(['ok' => true, 'status' => 'PENDING']);
  } else {
    echo json_encode(['ok' => true, 'status' => 'REFUSED', 'detail' => $st ?: ($resp['errorMsg'] ?? null)]);
  }
  exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
// Helpers Tranzak
// ════════════════════════════════════════════════════════════════════

/** Jeton d'API (POST /auth/token), mis en cache ~3/4 de sa duree. */
function tzToken($base) {
  $cache = sys_get_temp_dir() . '/tranzak_token_' . md5($base . '|' . TRANZAK_APP_ID) . '.json';
  if (file_exists($cache)) {
    $c = json_decode(@file_get_contents($cache), true);
    if (is_array($c) && ($c['exp'] ?? 0) > time() && !empty($c['token'])) return $c['token'];
  }
  $resp = tzHttp($base . '/auth/token', 'POST', null, [
    'appId' => TRANZAK_APP_ID, 'appKey' => TRANZAK_APP_KEY,
  ]);
  if (!is_array($resp) || empty($resp['data']['token'])) return null;
  $token = $resp['data']['token'];
  $ttl = (int) ($resp['data']['expiresIn'] ?? 7200);
  @file_put_contents($cache, json_encode(['token' => $token, 'exp' => time() + (int) floor($ttl * 0.75)]));
  return $token;
}

/** Appel API authentifie (Bearer). $path commence par /xp021/... */
function tzApi($base, $method, $path, $token, $payload = null) {
  return tzHttp($base . $path, $method, $token, $payload);
}

/** Requete HTTP JSON generique. */
function tzHttp($url, $method, $token = null, $payload = null) {
  $headers = ['Content-Type: application/json', 'Accept: application/json'];
  if ($token) { $headers[] = 'Authorization: Bearer ' . $token; }
  $ch = curl_init($url);
  $opts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_USERAGENT => 'MAPO-Tranzak/0.1',
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 8,
  ];
  if ($payload !== null) { $opts[CURLOPT_POSTFIELDS] = json_encode($payload); }
  curl_setopt_array($ch, $opts);
  $res = curl_exec($ch);
  curl_close($ch);
  if ($res === false) return null;
  $j = json_decode($res, true);
  return is_array($j) ? $j : null;
}

function baseUrl() {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  $scheme = $https ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
  return $scheme . '://' . $host . $dir;
}

function rateLimitOk() {
  $limit = defined('PAY_HOURLY_LIMIT') ? (int) PAY_HOURLY_LIMIT : 60;
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
  $file = sys_get_temp_dir() . '/mapo_tz_rl_' . md5($ip) . '.json';
  $now = time();
  $hits = [];
  if (file_exists($file)) {
    $hits = json_decode(@file_get_contents($file), true) ?: [];
    $hits = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
  }
  if (count($hits) >= $limit) return false;
  $hits[] = $now;
  @file_put_contents($file, json_encode($hits));
  return true;
}

/** Verification du jeton Firebase (RS256). Retourne l'uid ou null. */
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
