<?php
/**
 * MAPO — Envoi d'alertes parents (SMS / WhatsApp) via Twilio.
 *
 * Appelé par l'app école (même domaine → pas de CORS) quand un évènement
 * doit notifier un parent : absence, retard de paiement, bulletin disponible…
 *
 * Sécurité :
 *   - Vérifie le jeton Firebase de l'appelant (signature RS256 Google,
 *     audience = projet, non expiré) → seuls les utilisateurs connectés
 *     peuvent envoyer en vrai.
 *   - Repli démo : si pas de jeton valide, l'envoi n'est autorisé QUE vers
 *     les numéros listés dans DEMO_ALLOWED (numéro de test). Empêche le spam.
 *   - Les identifiants Twilio vivent dans mapo-notify-config.php (protégé
 *     par .htaccess). Si ce fichier est absent/non rempli → réponse
 *     "not_configured" et l'app bascule en simulation.
 *
 * Installation : déposer dans public_html/mapo/ à côté de mapo-provision.php,
 * avec mapo-notify-config.php. Le .htaccess protège le fichier de config.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(20);

// Même origine en pratique ; on reflète une origine *.app-edufrem.com par sécurité.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// ── Config (identifiants Twilio) ──────────────────────────────────────
$cfgPath = __DIR__ . '/mapo-notify-config.php';
if (!file_exists($cfgPath)) { echo json_encode(['ok' => false, 'error' => 'not_configured']); exit; }
require $cfgPath; // TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_SMS_FROM, FIREBASE_PROJECT, $GLOBALS['DEMO_ALLOWED']
if (!defined('TWILIO_SID') || TWILIO_SID === '' || strpos(TWILIO_SID, 'A_REMPLIR') === 0) {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}
$demoAllowed = isset($GLOBALS['DEMO_ALLOWED']) && is_array($GLOBALS['DEMO_ALLOWED']) ? $GLOBALS['DEMO_ALLOWED'] : [];

// ── 1. Lire la requête ────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
$channel = ($body['channel'] ?? 'whatsapp') === 'sms' ? 'sms' : 'whatsapp';
$to = preg_replace('/[^0-9+]/', '', trim($body['to'] ?? ''));
$message = trim($body['message'] ?? '');

if ($to === '' || $message === '') {
  http_response_code(400); echo json_encode(['ok' => false, 'error' => 'champs_manquants']); exit;
}
if (!preg_match('/^\+?[0-9]{8,15}$/', $to)) {
  http_response_code(400); echo json_encode(['ok' => false, 'error' => 'numero_invalide']); exit;
}
if (mb_strlen($message) > 1000) $message = mb_substr($message, 0, 1000);

// ── 2. Authentification : jeton Firebase valide OU numéro de démo ─────
$uid = verifyFirebaseToken();
if (!$uid && !in_array($to, $demoAllowed, true)) {
  http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
}

// ── 3. Envoi via l'API Twilio (Messages) ──────────────────────────────
$from = $channel === 'sms'
  ? (defined('TWILIO_SMS_FROM') ? TWILIO_SMS_FROM : '')
  : (defined('TWILIO_WHATSAPP_FROM') ? TWILIO_WHATSAPP_FROM : '');
if ($from === '') { echo json_encode(['ok' => false, 'error' => 'canal_non_configure']); exit; }

$toAddr = $channel === 'sms' ? $to : ('whatsapp:' . $to);

$ch = curl_init('https://api.twilio.com/2010-04-01/Accounts/' . TWILIO_SID . '/Messages.json');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_USERPWD => TWILIO_SID . ':' . TWILIO_TOKEN,
  CURLOPT_POSTFIELDS => http_build_query(['From' => $from, 'To' => $toAddr, 'Body' => $message]),
  CURLOPT_TIMEOUT => 12,
  CURLOPT_CONNECTTIMEOUT => 5,
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false) { echo json_encode(['ok' => false, 'error' => 'twilio_injoignable']); exit; }
$j = json_decode($res, true);
if ($code >= 200 && $code < 300 && !empty($j['sid'])) {
  echo json_encode(['ok' => true, 'sid' => $j['sid'], 'status' => $j['status'] ?? null, 'channel' => $channel]);
} else {
  echo json_encode(['ok' => false, 'error' => 'twilio_echec', 'code' => $code, 'detail' => $j['message'] ?? null]);
}

// ════════════════════════════════════════════════════════════════════
// Vérification du jeton Firebase (RS256). Retourne l'uid ou null.
// (Même logique que mapo-provision.php, sans le contrôle super admin.)
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
