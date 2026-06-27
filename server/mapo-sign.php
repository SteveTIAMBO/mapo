<?php
/**
 * MAPO — Signature cryptographique des diplômes vérifiables.
 *
 * Signe le CONTENU CANONIQUE d'un diplôme (champs séparés par '|') avec la clé
 * privée RSA d'EDUFREM, gardée côté serveur (jamais exposée au navigateur). La
 * vérification se fait côté client avec la clé PUBLIQUE embarquée dans l'app
 * (WebCrypto, RSASSA-PKCS1-v1_5 / SHA-256).
 *
 * Sécurité : ce proxy n'est PAS le verrou principal. Le verrou, c'est le
 * registre Firestore `diplomas` (écriture réservée à l'émetteur via
 * schoolUid == uid). La vérification publique fait d'abord un lookup au
 * registre : une signature sans entrée correspondante n'authentifie rien.
 * On contraint malgré tout le contenu au format d'un diplôme + rate-limit.
 *
 * Installation : déposer dans public_html/mapo/ avec mapo-sign-config.php
 * (qui définit $DIPLOMA_SIGN_PRIVATE_PEM ; chmod 600 ; jamais committé).
 *
 * Durcissement futur : exiger un jeton Firebase + lier la signature à
 * l'identité de l'école émettrice (per-école), cf DIPLOMES-SIGNATURE.md.
 */

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// ── Clé privée (config serveur, non committée) ────────────────────────
$cfg = __DIR__ . '/mapo-sign-config.php';
if (!file_exists($cfg)) { http_response_code(503); echo json_encode(['ok' => false, 'error' => 'non_configure']); exit; }
require $cfg;
if (empty($DIPLOMA_SIGN_PRIVATE_PEM)) {
  http_response_code(503); echo json_encode(['ok' => false, 'error' => 'cle_absente']); exit;
}

// ── Rate-limit léger par IP ───────────────────────────────────────────
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rl = sys_get_temp_dir() . '/mapo_sign_rl_' . md5($ip) . '.json';
$now = time();
$hits = [];
if (file_exists($rl)) {
  $hits = json_decode(@file_get_contents($rl), true) ?: [];
  $hits = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
}
if (count($hits) >= 300) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit; }
$hits[] = $now;
@file_put_contents($rl, json_encode($hits));

// ── Contenu à signer : contraint au format canonique d'un diplôme ─────
$body = json_decode(file_get_contents('php://input'), true);
$content = is_array($body) ? (string) ($body['content'] ?? '') : '';
if ($content === '' || strlen($content) > 1000 || substr_count($content, '|') < 5) {
  http_response_code(400); echo json_encode(['ok' => false, 'error' => 'contenu_invalide']); exit;
}

// ── Signature RSA SHA-256 ─────────────────────────────────────────────
$key = openssl_pkey_get_private($DIPLOMA_SIGN_PRIVATE_PEM);
if (!$key) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'cle_invalide']); exit; }
$sig = '';
if (!openssl_sign($content, $sig, $key, OPENSSL_ALGO_SHA256)) {
  http_response_code(500); echo json_encode(['ok' => false, 'error' => 'signature_echec']); exit;
}

echo json_encode(['ok' => true, 'signature' => base64_encode($sig), 'alg' => 'RS256']);
