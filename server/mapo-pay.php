<?php
/**
 * MAPO — Encaissement en ligne via CinetPay (mobile money + carte).
 *
 * Appelé par l'espace parent (même domaine) pour payer la scolarité par
 * Orange Money / MTN MoMo / Moov / Wave / carte. Garde les identifiants
 * marchands côté serveur (jamais exposés au navigateur).
 *
 * Actions (POST JSON, champ "action") :
 *   - init   : crée un lien de paiement CinetPay → { payment_url, transaction_id, mode }
 *   - check  : vérifie l'état d'une transaction (serveur→CinetPay, source de
 *              vérité) → { status: ACCEPTED|REFUSED|PENDING, amount, method, ... }
 *
 * Endpoint webhook (GET/POST sans "action", appelé par CinetPay → notify_url) :
 *   accuse réception 200. La VRAIE confirmation qui déclenche l'enregistrement
 *   du paiement dans MAPO se fait via "check" (re-vérification serveur), jamais
 *   en faisant confiance au navigateur.
 *
 * Sécurité :
 *   - init/check exigent un jeton Firebase valide OU le repli démo (PAY_DEMO_OPEN).
 *   - Si CinetPay n'est pas configuré (clé = A_REMPLIR) → mode:'sim' : le proxy
 *     ne contacte PAS CinetPay, l'app fait un parcours simulé (démo).
 *   - Rate-limit par IP (PAY_HOURLY_LIMIT) sur init.
 *
 * Installation : déposer dans public_html/mapo/ avec mapo-pay-config.php.
 * Le .htaccess protège le fichier de config.
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
$cfgPath = __DIR__ . '/mapo-pay-config.php';
if (file_exists($cfgPath)) require $cfgPath;
$configured = defined('CINETPAY_APIKEY') && CINETPAY_APIKEY !== '' && strpos(CINETPAY_APIKEY, 'A_REMPLIR') !== 0;
$demoOpen = defined('PAY_DEMO_OPEN') && PAY_DEMO_OPEN;

$INIT_URL  = 'https://api-checkout.cinetpay.com/v2/payment';
$CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';

// ── Webhook CinetPay (notify_url) : pas de champ "action" ─────────────
// CinetPay appelle cette URL (POST) pour signaler un paiement. On répond 200
// (l'enregistrement réel est fait par l'app via "check"). On peut re-vérifier
// ici à l'avenir si on ajoute un service account Firestore côté serveur.
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) $body = [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

if ($action === '') {
  // Notification CinetPay : accuser réception.
  http_response_code(200);
  echo json_encode(['ok' => true, 'received' => true]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// ── Authentification : jeton Firebase OU repli démo ───────────────────
$uid = verifyFirebaseToken();
if (!$uid && !$demoOpen) {
  http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : code_creer — un super admin EDUFREM fabrique un code de crédits
// ════════════════════════════════════════════════════════════════════
// Sert aux écoles pilotes, aux familles témoins et aux tests, sans passer par
// un paiement. L'autorisation reprend le motif éprouvé de mapo-provision.php :
// on relit `superAdmins/{uid}` AVEC LE JETON DE L'APPELANT. Les règles ne
// laissent passer cette lecture qu'à un super admin — donc aucun compte de
// service ici, et aucun secret de plus à garder.
if ($action === 'code_creer') {
  if (!$uid) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }
  $idToken = '';
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) $idToken = $m[1];
  if ($idToken === '' || !defined('FIREBASE_PROJECT')) {
    http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
  }
  $url = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
    . '/databases/(default)/documents/superAdmins/' . rawurlencode($uid);
  $ctx = stream_context_create(['http' => [
    'method' => 'GET', 'header' => "Authorization: Bearer {$idToken}\r\n",
    'timeout' => 8, 'ignore_errors' => true,
  ]]);
  @file_get_contents($url, false, $ctx);
  $code = 0;
  foreach ($http_response_header ?? [] as $h) {
    if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $mm)) $code = (int) $mm[1];
  }
  if ($code !== 200) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'non_superadmin']); exit; }

  require_once __DIR__ . '/mapo-credits-lib.php';
  $tokens = max(1, min(1000000, (int) ($body['tokens'] ?? 0)));
  $usages = max(1, min(1000, (int) ($body['usages'] ?? 1)));
  $nouveau = mc_codeCreer($tokens, $usages, $body['note'] ?? '', $uid);
  if (!$nouveau) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'creation_impossible']); exit; }
  echo json_encode(['ok' => true, 'code' => $nouveau, 'tokens' => $tokens, 'usages' => $usages]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : code_utiliser — un parent (ou un apprenant majeur) saisit un code
// ════════════════════════════════════════════════════════════════════
// Les crédits vont sur le solde `bonus` de l'appelant, qui sert de pot à toute
// sa famille : ses enfants y puisent automatiquement une fois leur jauge
// hebdomadaire personnelle épuisée.
if ($action === 'code_utiliser') {
  if (!$uid) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }
  if (!rateLimitOk()) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit; }
  require_once __DIR__ . '/mapo-credits-lib.php';
  list($ok, $info) = mc_codeUtiliser((string) ($body['code'] ?? ''), $uid);
  if (!$ok) { echo json_encode(['ok' => false, 'error' => $info]); exit; }
  $st = mc_state($uid);
  echo json_encode([
    'ok' => true,
    'credites' => (int) $info,
    'bonus' => (int) ($st['bonus'] ?? 0),
    'tokens' => (int) $st['tokens'],
    'cap' => mc_weeklyCap($st['offreId']),
  ]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : init
// ════════════════════════════════════════════════════════════════════
if ($action === 'init') {
  if (!rateLimitOk()) {
    http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit;
  }

  $amount = (int) round((float) ($body['amount'] ?? 0));
  $currency = preg_replace('/[^A-Z]/', '', strtoupper($body['currency'] ?? 'XAF'));
  if (!in_array($currency, ['XOF', 'XAF', 'CDF', 'GNF', 'USD'], true)) $currency = 'XAF';
  // CinetPay : le montant doit être multiple de 5 (sauf USD).
  if ($currency !== 'USD' && $amount % 5 !== 0) $amount -= ($amount % 5);
  if ($amount < 5) {
    http_response_code(400); echo json_encode(['ok' => false, 'error' => 'montant_invalide']); exit;
  }

  // Identifiant de transaction unique (sans caractères spéciaux).
  $txId = 'MAPO' . date('ymdHis') . substr(str_replace('.', '', uniqid('', true)), -6);

  $desc = preg_replace('/[#\/\$_&]/', ' ', (string) ($body['description'] ?? 'Scolarite'));
  $desc = trim(mb_substr($desc, 0, 120));
  if ($desc === '') $desc = 'Scolarite';

  // Mode simulation : pas de compte CinetPay → l'app joue un parcours démo.
  if (!$configured) {
    echo json_encode([
      'ok' => true,
      'mode' => 'sim',
      'transaction_id' => $txId,
      'amount' => $amount,
      'currency' => $currency,
      'payment_url' => null,
    ]);
    exit;
  }

  $base = baseUrl();
  $payload = [
    'apikey' => CINETPAY_APIKEY,
    'site_id' => CINETPAY_SITE_ID,
    'transaction_id' => $txId,
    'amount' => $amount,
    'currency' => $currency,
    'description' => $desc,
    'notify_url' => $base . '/mapo-pay.php',
    'return_url' => (string) ($body['return_url'] ?? ($base . '/')),
    'channels' => in_array(($body['channels'] ?? ''), ['ALL', 'MOBILE_MONEY', 'CREDIT_CARD', 'WALLET'], true)
      ? $body['channels'] : 'ALL',
    'lang' => 'fr',
    'metadata' => mb_substr((string) ($body['metadata'] ?? ''), 0, 120),
    'customer_name' => clean($body['customer_name'] ?? 'Parent'),
    'customer_surname' => clean($body['customer_surname'] ?? ''),
    'customer_phone_number' => preg_replace('/[^0-9+]/', '', (string) ($body['customer_phone_number'] ?? '')),
    'customer_email' => filter_var(($body['customer_email'] ?? ''), FILTER_VALIDATE_EMAIL) ?: '',
  ];

  $resp = httpPostJson($INIT_URL, $payload);
  if ($resp === null) {
    echo json_encode(['ok' => false, 'error' => 'cinetpay_injoignable']); exit;
  }
  $code = (string) ($resp['code'] ?? '');
  if ($code === '201' && !empty($resp['data']['payment_url'])) {
    echo json_encode([
      'ok' => true,
      'mode' => (defined('CINETPAY_MODE') && CINETPAY_MODE === 'PRODUCTION') ? 'live' : 'test',
      'transaction_id' => $txId,
      'amount' => $amount,
      'currency' => $currency,
      'payment_url' => $resp['data']['payment_url'],
      'payment_token' => $resp['data']['payment_token'] ?? null,
    ]);
  } else {
    echo json_encode([
      'ok' => false, 'error' => 'init_echec',
      'code' => $code, 'detail' => $resp['description'] ?? ($resp['message'] ?? null),
    ]);
  }
  exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : check  (source de vérité serveur→CinetPay)
// ════════════════════════════════════════════════════════════════════
if ($action === 'check') {
  $txId = preg_replace('/[^A-Za-z0-9]/', '', (string) ($body['transaction_id'] ?? ''));
  if ($txId === '') {
    http_response_code(400); echo json_encode(['ok' => false, 'error' => 'transaction_manquante']); exit;
  }

  if (!$configured) {
    // En mode simulation, l'app gère elle-même l'état ; rien à vérifier ici.
    echo json_encode(['ok' => true, 'mode' => 'sim', 'status' => 'PENDING']);
    exit;
  }

  $resp = httpPostJson($CHECK_URL, [
    'apikey' => CINETPAY_APIKEY,
    'site_id' => CINETPAY_SITE_ID,
    'transaction_id' => $txId,
  ]);
  if ($resp === null) {
    echo json_encode(['ok' => false, 'error' => 'cinetpay_injoignable']); exit;
  }
  $code = (string) ($resp['code'] ?? '');
  $data = $resp['data'] ?? [];
  // code "00" = paiement validé ; "662" = en attente ; sinon refusé/inconnu.
  $status = strtoupper($data['status'] ?? '');
  if ($code === '00' && $status === 'ACCEPTED') {
    echo json_encode([
      'ok' => true, 'status' => 'ACCEPTED',
      'amount' => isset($data['amount']) ? (int) $data['amount'] : null,
      'currency' => $data['currency'] ?? null,
      'method' => $data['payment_method'] ?? null,
      'operator_id' => $data['operator_id'] ?? null,
      'payment_date' => $data['payment_date'] ?? null,
    ]);
  } elseif ($code === '627' || $status === 'PENDING' || $code === '662') {
    echo json_encode(['ok' => true, 'status' => 'PENDING']);
  } else {
    echo json_encode([
      'ok' => true, 'status' => 'REFUSED',
      'code' => $code, 'detail' => $resp['message'] ?? null,
    ]);
  }
  exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function clean($s) {
  return trim(mb_substr(preg_replace('/[#\/\$_&]/', ' ', (string) $s), 0, 60));
}

function baseUrl() {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  $scheme = $https ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  // Le proxy est servi dans /mapo/ → préfixe identique pour notify/return.
  $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
  return $scheme . '://' . $host . $dir;
}

function httpPostJson($url, $payload) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_USERAGENT => 'MAPO-CinetPay/1.0',
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 8,
  ]);
  $res = curl_exec($ch);
  curl_close($ch);
  if ($res === false) return null;
  $j = json_decode($res, true);
  return is_array($j) ? $j : null;
}

function rateLimitOk() {
  $limit = defined('PAY_HOURLY_LIMIT') ? (int) PAY_HOURLY_LIMIT : 60;
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
  $file = sys_get_temp_dir() . '/mapo_pay_rl_' . md5($ip) . '.json';
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

// Vérification du jeton Firebase (RS256). Retourne l'uid ou null.
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
