<?php
/**
 * MAPO+ — Offres + solde de crédits (lecture pour le front).
 *
 *   POST { action: 'offers' }  → { ok, offres: [...] }            (public)
 *   POST { action: 'state' }   → { ok, offreId, credits, renewAt } (jeton Firebase)
 *
 * La source des quotas = mapo-offres-data.php (un seul fichier à éditer). Le
 * solde = registre serveur mapo-credits.json (mapo-credits-lib.php).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, max-age=0');
@set_time_limit(15);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem'); // id public
require __DIR__ . '/mapo-credits-lib.php';

$body = json_decode(file_get_contents('php://input'), true);
$action = is_array($body) ? ($body['action'] ?? 'offers') : 'offers';

if ($action === 'offers') {
  echo json_encode(['ok' => true, 'offres' => mapo_offres(), 'remiseFamille' => mapo_remise_famille()]); exit;
}

if ($action === 'state') {
  $uid = verifyFirebaseToken();
  if (!$uid) { echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }
  $e = mc_state($uid);
  echo json_encode(['ok' => true, 'offreId' => $e['offreId'], 'tokens' => (int) $e['tokens'], 'cap' => mc_weeklyCap($e['offreId']), 'renewAt' => $e['tierExpiry'] ?? '', 'weekId' => $e['weekId'] ?? '']);
  exit;
}

echo json_encode(['ok' => false, 'error' => 'action_inconnue']);

/** Vérifie le jeton Firebase (RS256, aud=projet, non expiré). Renvoie l'uid ou null. */
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
