<?php
/**
 * MAPO+ — Envoi d'e-mails transactionnels BRANDÉS via Brevo.
 *
 * Envoie un gabarit HTML (server/emails/<template>.<lang>.html) à l'utilisateur
 * CONNECTÉ. Utilisé pour les mails « maison » qu'on maîtrise (bienvenue, reçus…),
 * par opposition aux mails d'authentification (activation / reset) qui restent
 * envoyés par Firebase.
 *
 * Sécurité :
 *   - Exige un jeton Firebase valide (RS256, audience = projet, non expiré).
 *   - N'envoie QU'À l'adresse portée par le jeton (claim `email`). Impossible de
 *     spammer une adresse arbitraire : on ignore tout `to` fourni par le client.
 *   - La clé Brevo vit dans mapo-mail-config.php (hors dépôt, protégé par
 *     .htaccess). Absent/non rempli → réponse "not_configured".
 *
 * Installation : déposer dans public_html/mapo/ (à côté de mapo-notify.php),
 * avec le dossier emails/ et mapo-mail-config.php rempli.
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

// ── Config (clé Brevo + expéditeur) ───────────────────────────────────
$cfgPath = __DIR__ . '/mapo-mail-config.php';
if (!file_exists($cfgPath)) { echo json_encode(['ok' => false, 'error' => 'not_configured']); exit; }
require $cfgPath; // BREVO_API_KEY, MAIL_FROM_EMAIL, MAIL_FROM_NAME, MAIL_REPLY_TO, FIREBASE_PROJECT, APP_BASE_URL
if (!defined('BREVO_API_KEY') || BREVO_API_KEY === '' || strpos(BREVO_API_KEY, 'A_REMPLIR') === 0) {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}

// ── 1. Authentification : jeton Firebase valide (obligatoire) ──────────
$claims = verifyFirebaseToken();
$toEmail = strtolower(trim($claims['email'] ?? ''));
if (!$claims || $toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
  http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
}

// ── 2. Lire la requête (template + langue + variables d'affichage) ─────
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// Whitelist stricte des gabarits et langues (anti path-traversal).
// `welcome` reste accepté (anciens appels) ; les deux variantes disent au
// destinataire ce qu'il doit faire ENSUITE, ce qui n'est pas la même chose pour
// un parent (ajouter son enfant) et pour un apprenant (lancer sa révision).
$ALLOWED_TEMPLATES = ['welcome', 'welcome-parent', 'welcome-apprenant'];
$template = in_array(($body['template'] ?? ''), $ALLOWED_TEMPLATES, true) ? $body['template'] : 'welcome';
$lang = (($body['lang'] ?? 'fr') === 'en') ? 'en' : 'fr';

$prenom = trim((string)($body['prenom'] ?? ''));
$prenom = $prenom === '' ? ($lang === 'en' ? 'there' : '') : mb_substr($prenom, 0, 60);
$appBase = defined('APP_BASE_URL') && APP_BASE_URL !== '' ? rtrim(APP_BASE_URL, '/') : 'https://mapoplus.app-edufrem.com';
// Garde-fou : miapo.app-edufrem.com a été SUPPRIMÉ du serveur le 2026-08-03.
// Si la config le désigne encore, le bouton de chaque e-mail de bienvenue
// mènerait à une page d'erreur — le tout premier geste de chaque nouveau
// testeur. On corrige ici plutôt que de dépendre d'un fichier de config qu'on
// oubliera de mettre à jour.
$appBase = str_replace('miapo.app-edufrem.com', 'mapoplus.app-edufrem.com', $appBase);
$ctaUrl = $appBase . '/mon-espace';

// Objets par gabarit / langue.
$SUBJECTS = [
  'welcome' => ['fr' => 'Bienvenue sur MAPO+ 🎓', 'en' => 'Welcome to MAPO+ 🎓'],
  'welcome-parent' => ['fr' => 'Bienvenue sur MAPO+ — ajoutez votre enfant', 'en' => 'Welcome to MAPO+ — add your child'],
  'welcome-apprenant' => ['fr' => 'Bienvenue sur MAPO+ 🎓', 'en' => 'Welcome to MAPO+ 🎓'],
];
$PREHEADERS = [
  'welcome' => [
    'fr' => "Ton espace MAPO+ est prêt — MIAPO t'accompagne dès maintenant.",
    'en' => 'Your MAPO+ space is ready — MIAPO is with you from now on.',
  ],
  'welcome-parent' => [
    'fr' => "Votre espace est prêt — ajoutez votre enfant pour commencer.",
    'en' => 'Your space is ready — add your child to get started.',
  ],
  'welcome-apprenant' => [
    'fr' => "Ton espace MAPO+ est prêt — commence par une première révision.",
    'en' => 'Your MAPO+ space is ready — start with a first revision.',
  ],
];
$subject = $SUBJECTS[$template][$lang] ?? 'MAPO+';
$preheader = $PREHEADERS[$template][$lang] ?? '';

// ── 3. Charger le gabarit HTML et injecter les variables ───────────────
$tplPath = __DIR__ . '/emails/' . $template . '.' . $lang . '.html';
if (!file_exists($tplPath)) { echo json_encode(['ok' => false, 'error' => 'gabarit_absent']); exit; }
$html = file_get_contents($tplPath);
$html = strtr($html, [
  '{{prenom}}'    => htmlspecialchars($prenom, ENT_QUOTES, 'UTF-8'),
  '{{ctaUrl}}'    => htmlspecialchars($ctaUrl, ENT_QUOTES, 'UTF-8'),
  '{{preheader}}' => htmlspecialchars($preheader, ENT_QUOTES, 'UTF-8'),
  '{{year}}'      => date('Y'),
]);

// ── 4. Envoi via l'API Brevo (transactional email) ─────────────────────
$payload = [
  'sender' => ['name' => defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'MAPO+', 'email' => MAIL_FROM_EMAIL],
  'to' => [['email' => $toEmail] + ($prenom !== '' ? ['name' => $prenom] : [])],
  'subject' => $subject,
  'htmlContent' => $html,
];
if (defined('MAIL_REPLY_TO') && MAIL_REPLY_TO !== '') {
  $payload['replyTo'] = ['email' => MAIL_REPLY_TO];
}

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'accept: application/json',
    'content-type: application/json',
    'api-key: ' . BREVO_API_KEY,
  ],
  CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  CURLOPT_TIMEOUT => 12,
  CURLOPT_CONNECTTIMEOUT => 5,
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false) { echo json_encode(['ok' => false, 'error' => 'brevo_injoignable']); exit; }
$j = json_decode($res, true);
if ($code >= 200 && $code < 300) {
  echo json_encode(['ok' => true, 'messageId' => $j['messageId'] ?? null, 'template' => $template, 'lang' => $lang]);
} else {
  echo json_encode(['ok' => false, 'error' => 'brevo_echec', 'code' => $code, 'detail' => $j['message'] ?? null]);
}

// ════════════════════════════════════════════════════════════════════
// Vérification du jeton Firebase (RS256). Retourne les claims (payload)
// ou null. Même logique que mapo-notify.php.
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
  return $ok === 1 ? $p : null;
}
