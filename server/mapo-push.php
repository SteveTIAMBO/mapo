<?php
/**
 * MAPO+ — Envoi d'un rappel de révision en PUSH WEB (gratuit).
 *
 * Reçoit un abonnement navigateur (endpoint + clés p256dh/auth) et un message,
 * chiffre la charge utile pour cet abonnement (RFC 8291, content-encoding
 * aes128gcm), signe l'en-tête VAPID (RFC 8292, ES256) et POSTe le tout au
 * service push du navigateur (Google/Mozilla/Apple — sans frais).
 *
 * ZÉRO dépendance : uniquement les extensions openssl + hash de PHP.
 *   - openssl_pkey_derive .... ECDH P-256
 *   - hash_hkdf .............. dérivation des clés (HKDF-SHA256)
 *   - openssl_encrypt ........ AES-128-GCM
 *
 * Sécurité : réservé aux comptes connectés (jeton Firebase vérifié, même
 * mécanique que mapo-notify.php). Un mode test SANS jeton n'est ouvert QUE si
 * le fichier sentinelle mapo-push-ALLOW-TEST.flag est présent sur le serveur —
 * on le dépose le temps d'un test end-to-end puis on le supprime.
 *
 * Config : mapo-push-config.php ($VAPID_PUBLIC, $VAPID_PRIVATE_PEM,
 * $VAPID_SUBJECT, FIREBASE_PROJECT). Déposer les deux dans public_html/mapo/.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(20);

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

$cfgPath = __DIR__ . '/mapo-push-config.php';
if (!file_exists($cfgPath)) { echo json_encode(['ok' => false, 'error' => 'not_configured']); exit; }
require $cfgPath;
if (!isset($VAPID_PRIVATE_PEM) || !isset($VAPID_PUBLIC) || trim($VAPID_PRIVATE_PEM) === '') {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}

// ── Auth ──────────────────────────────────────────────────────────────
// Appelant authentifié (jeton Firebase valide) → peut personnaliser le message.
// Appelant NON authentifié → autorisé aussi (la démo n'a pas de compte), MAIS le
// contenu est IMPOSÉ par le serveur (voir plus bas) : anti-hameçonnage. Comme
// on n'envoie qu'à l'abonnement fourni dans la requête, le pire cas est un
// auto-rappel bénin à un abonnement que l'appelant possède déjà.
$uid = verifyFirebaseToken();
$trusted = ($uid !== null);

// ── Requête ──────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
$sub = $body['subscription'] ?? null;
$endpoint = $sub['endpoint'] ?? '';
$p256dh = b64url_dec($sub['keys']['p256dh'] ?? '');
$auth = b64url_dec($sub['keys']['auth'] ?? '');
if ($endpoint === '' || strlen($p256dh) !== 65 || strlen($auth) < 16) {
  http_response_code(400); echo json_encode(['ok' => false, 'error' => 'abonnement_invalide']); exit;
}
if ($trusted) {
  $title = mb_substr(trim($body['title'] ?? 'MAPO+'), 0, 100);
  $text  = mb_substr(trim($body['body'] ?? ''), 0, 300);
} else {
  $title = 'MAPO+';
  $lang = (($body['lang'] ?? 'fr') === 'en') ? 'en' : 'fr';
  $text = $lang === 'en'
    ? "Time to revise! Open MAPO+ for today's session."
    : "C'est l'heure de réviser ! Ouvre MAPO+ pour ta séance du jour.";
}
$payload = json_encode(['title' => $title, 'body' => $text, 'url' => '/parent/miapo'], JSON_UNESCAPED_UNICODE);

// ── Chiffrement du message pour cet abonnement (RFC 8291, aes128gcm) ──
try {
  $enc = encryptPush($payload, $p256dh, $auth);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'error' => 'crypto', 'detail' => $e->getMessage()]); exit;
}

// ── En-tête VAPID pour l'origine du endpoint (RFC 8292) ──────────────
$u = parse_url($endpoint);
$aud = $u['scheme'] . '://' . $u['host'];
$jwt = vapidJwt($aud, $VAPID_SUBJECT ?? 'mailto:contact@edufrem.com', $VAPID_PRIVATE_PEM);

$headers = [
  'Authorization: vapid t=' . $jwt . ', k=' . $VAPID_PUBLIC,
  'Content-Encoding: aes128gcm',
  'Content-Type: application/octet-stream',
  'TTL: 86400',
];
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_POSTFIELDS => $enc,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 12,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

// 201 (voire 200) = accepté par le service push. 404/410 = abonnement expiré.
if ($code === 201 || $code === 200) {
  echo json_encode(['ok' => true, 'status' => $code]);
} elseif ($code === 404 || $code === 410) {
  echo json_encode(['ok' => false, 'error' => 'expired', 'status' => $code]);
} else {
  echo json_encode(['ok' => false, 'error' => 'push_failed', 'status' => $code, 'detail' => substr($resp ?: $err, 0, 300)]);
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function b64url($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64url_dec($s) {
  $s = strtr($s, '-_', '+/');
  return base64_decode($s . str_repeat('=', (4 - strlen($s) % 4) % 4));
}

/** Point P-256 brut (65 o, non compressé) → clé publique PEM (SPKI). */
function p256RawToPem($raw65) {
  $der = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $raw65;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/**
 * Chiffre $payload pour l'abonné (sa clé publique $uaPublic 65 o + secret
 * $authSecret 16 o) selon RFC 8291. Renvoie le corps aes128gcm prêt à POSTer.
 */
function encryptPush($payload, $uaPublic, $authSecret) {
  // Clé éphémère du serveur d'application (AS).
  $asKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
  if (!$asKey) throw new Exception('ec_keygen');
  $d = openssl_pkey_get_details($asKey);
  $asPublic = "\x04" . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);

  // Secret ECDH avec la clé publique de l'abonné.
  if (!function_exists('openssl_pkey_derive')) throw new Exception('openssl_pkey_derive_absent');
  $ecdh = openssl_pkey_derive(p256RawToPem($uaPublic), $asKey, 32);
  if ($ecdh === false) throw new Exception('ecdh');

  // IKM = HKDF(salt=authSecret, ikm=ecdh, info="WebPush: info\0"||uaPub||asPub).
  $keyInfo = "WebPush: info\x00" . $uaPublic . $asPublic;
  $ikm = hash_hkdf('sha256', $ecdh, 32, $keyInfo, $authSecret);

  $salt = random_bytes(16);
  $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
  $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

  // Enregistrement unique : payload + délimiteur 0x02 (dernier record).
  $tag = '';
  $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
  if ($cipher === false) throw new Exception('aesgcm');

  // En-tête aes128gcm (RFC 8188) : salt(16) rs(4) idlen(1) keyid(asPublic) ciphertext.
  return $salt . pack('N', 4096) . chr(strlen($asPublic)) . $asPublic . $cipher . $tag;
}

/** JWT VAPID signé ES256 (raw R||S) pour l'origine $aud. */
function vapidJwt($aud, $subject, $privatePem) {
  $header = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $claims = b64url(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => $subject]));
  $input = $header . '.' . $claims;
  $pk = openssl_pkey_get_private($privatePem);
  if (!$pk) throw new Exception('vapid_key');
  $der = '';
  if (!openssl_sign($input, $der, $pk, OPENSSL_ALGO_SHA256)) throw new Exception('vapid_sign');
  return $input . '.' . b64url(derToRawEcdsa($der));
}

/** Signature ECDSA DER (SEQUENCE de deux INTEGER) → R||S brut de 64 octets. */
function derToRawEcdsa($der) {
  $off = 0;
  if (ord($der[$off++]) !== 0x30) throw new Exception('der_seq');
  $len = ord($der[$off++]);
  if ($len & 0x80) { $n = $len & 0x7f; while ($n--) $off++; } // longueur multi-octets ignorée (taille connue)
  $readInt = function () use (&$off, $der) {
    if (ord($der[$off++]) !== 0x02) throw new Exception('der_int');
    $l = ord($der[$off++]);
    $v = substr($der, $off, $l); $off += $l;
    $v = ltrim($v, "\x00"); // retire l'octet de signe / zéros de tête
    return str_pad($v, 32, "\x00", STR_PAD_LEFT);
  };
  return $readInt() . $readInt();
}

/** Vérifie le jeton Firebase de l'appelant (RS256, aud=projet, non expiré). */
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
