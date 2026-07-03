<?php
/**
 * mapo-files.php — Dépôt et lecture des fichiers de cours (PDF / PPT / PPTX).
 *
 * Choix LWS (vs Firebase Storage) : pas de coût d'egress, réutilise l'hébergement,
 * et permet la conversion PPT->PDF côté serveur pour la CONSULTATION in-app.
 *
 * Sécurité :
 *   - Jeton Firebase (RS256 Google) OBLIGATOIRE pour l'upload ET la lecture.
 *   - Types whitelistés (pdf/ppt/pptx), taille plafonnée, id opaque aléatoire.
 *   - Appelé en same-origin (/mapo-files.php) depuis l'app → pas de CORS requis.
 *
 * Déploiement (action Steve) :
 *   - Déposer ce fichier dans public_html/mapo/ (le CI le copie déjà, cf deploy.yml).
 *   - Créer public_html/mapo/uploads/ en écriture (chmod 755, propriétaire web).
 *   - FIREBASE_PROJECT est repris de mapo-ia-config.php (déjà en place).
 *   - Conversion PPT->PDF : nécessite LibreOffice (soffice) sur le serveur ; sinon
 *     le PPT reste téléchargeable (pas de consultation in-app).
 */

$cfg = __DIR__ . '/mapo-ia-config.php';
if (file_exists($cfg)) require_once $cfg;
if (!defined('FIREBASE_PROJECT')) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['ok' => false, 'error' => 'not_configured']);
  exit;
}

if (!defined('MAPO_UPLOAD_DIR')) define('MAPO_UPLOAD_DIR', __DIR__ . '/uploads');
if (!defined('MAPO_MAX_BYTES')) define('MAPO_MAX_BYTES', 25 * 1024 * 1024); // 25 Mo
$ALLOWED = [
  'pdf'  => 'application/pdf',
  'ppt'  => 'application/vnd.ms-powerpoint',
  'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$uid = verifyFirebaseToken();
if (!$uid) {
  http_response_code(401);
  header('Content-Type: application/json');
  echo json_encode(['ok' => false, 'error' => 'non_autorise']);
  exit;
}

if (!is_dir(MAPO_UPLOAD_DIR)) @mkdir(MAPO_UPLOAD_DIR, 0755, true);
// Sécurité : les fichiers ne doivent JAMAIS être servis directement par Apache
// (uniquement par ce script, après vérification du jeton). On dépose un .htaccess
// qui interdit tout accès HTTP direct au dossier uploads (idempotent).
$ht = MAPO_UPLOAD_DIR . '/.htaccess';
if (is_dir(MAPO_UPLOAD_DIR) && !file_exists($ht)) {
  @file_put_contents($ht, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  handleUpload($ALLOWED);
} else {
  handleServe($ALLOWED);
}

function cleanId($s) { return preg_replace('/[^a-f0-9]/', '', strtolower((string) $s)); }

function handleUpload($ALLOWED) {
  header('Content-Type: application/json; charset=utf-8');
  if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? 1) !== UPLOAD_ERR_OK) {
    echo json_encode(['ok' => false, 'error' => 'no_file']); return;
  }
  $f = $_FILES['file'];
  if ($f['size'] > MAPO_MAX_BYTES) { echo json_encode(['ok' => false, 'error' => 'too_large']); return; }
  $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
  if (!isset($ALLOWED[$ext])) { echo json_encode(['ok' => false, 'error' => 'bad_type']); return; }

  $id = bin2hex(random_bytes(12));
  $dest = MAPO_UPLOAD_DIR . '/' . $id . '.' . $ext;
  if (!move_uploaded_file($f['tmp_name'], $dest)) { echo json_encode(['ok' => false, 'error' => 'store_failed']); return; }

  $hasPdf = ($ext === 'pdf');
  if (!$hasPdf) {
    // Conversion best-effort PPT/PPTX -> PDF (pour consultation in-app).
    $soffice = trim((string) @shell_exec('command -v soffice 2>/dev/null || command -v libreoffice 2>/dev/null'));
    if ($soffice !== '') {
      @exec(escapeshellarg($soffice) . ' --headless --convert-to pdf --outdir ' . escapeshellarg(MAPO_UPLOAD_DIR) . ' ' . escapeshellarg($dest) . ' 2>&1');
      if (file_exists(MAPO_UPLOAD_DIR . '/' . $id . '.pdf')) $hasPdf = true;
    }
  }
  echo json_encode(['ok' => true, 'id' => $id, 'ext' => $ext, 'hasPdf' => $hasPdf]);
}

function handleServe($ALLOWED) {
  $id = cleanId($_GET['id'] ?? '');
  if ($id === '') { http_response_code(400); exit; }
  $wantPdf = !empty($_GET['pdf']);
  $dl = !empty($_GET['dl']);

  $path = null; $ext = null;
  if ($wantPdf && file_exists(MAPO_UPLOAD_DIR . '/' . $id . '.pdf')) {
    $path = MAPO_UPLOAD_DIR . '/' . $id . '.pdf'; $ext = 'pdf';
  } else {
    foreach (array_keys($ALLOWED) as $e) {
      if (file_exists(MAPO_UPLOAD_DIR . '/' . $id . '.' . $e)) { $path = MAPO_UPLOAD_DIR . '/' . $id . '.' . $e; $ext = $e; break; }
    }
  }
  if (!$path) { http_response_code(404); exit; }

  $mime = $ext === 'pdf' ? 'application/pdf' : ($ALLOWED[$ext] ?? 'application/octet-stream');
  header('Content-Type: ' . $mime);
  header('Content-Length: ' . filesize($path));
  header('Content-Disposition: ' . ($dl ? 'attachment' : 'inline'));
  header('Cache-Control: private, max-age=300');
  header('X-Content-Type-Options: nosniff');
  readfile($path);
}

// ── Vérification du jeton Firebase (RS256). Retourne l'uid ou null. ──
function verifyFirebaseToken() {
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
