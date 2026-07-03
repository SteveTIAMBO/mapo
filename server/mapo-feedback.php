<?php
/**
 * mapo-feedback.php — Réception des retours utilisateurs (bug / demande de
 * fonctionnalité) depuis le menu « Feedback » des Paramètres, et envoi par
 * e-mail à l'équipe (contact@edufrem.com par défaut).
 *
 * Appelé en same-origin (/mapo-feedback.php) par l'app → pas de CORS requis.
 *
 * Aucune configuration n'est OBLIGATOIRE : le destinataire par défaut est
 * codé ci-dessous. Pour le changer sans toucher au code, déposer un fichier
 * mapo-feedback-config.php (protégé, non écrasé au déploiement) définissant :
 *     define('FEEDBACK_TO', 'contact@edufrem.com');   // destinataire
 *     define('FEEDBACK_FROM', 'noreply@app-edufrem.com'); // expéditeur (optionnel)
 *
 * Sécurité / anti-abus : honeypot, plafonds de longueur, limite par IP,
 * anti-injection d'en-têtes. Copie de secours en JSON-lines dans le dossier
 * temporaire (non accessible par le web) pour ne jamais perdre un retour.
 *
 * Déploiement : déposé dans public_html/mapo/ par la CI (cf deploy.yml).
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(15);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// Config optionnelle (destinataire / expéditeur). Défauts sûrs si absente.
$cfg = __DIR__ . '/mapo-feedback-config.php';
if (file_exists($cfg)) require_once $cfg;
if (!defined('FEEDBACK_TO'))   define('FEEDBACK_TO', 'contact@edufrem.com');

// Expéditeur : sur le domaine racine de l'hôte (meilleur alignement SPF).
$host = preg_replace('/:.*$/', '', $_SERVER['HTTP_HOST'] ?? 'app-edufrem.com');
$hp = explode('.', $host);
$rootDomain = count($hp) >= 2 ? implode('.', array_slice($hp, -2)) : $host;
if (!defined('FEEDBACK_FROM')) define('FEEDBACK_FROM', 'noreply@' . $rootDomain);

// ── Limite par IP (anti-flood) : 8 envois / heure ────────────────────
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$throttleFile = sys_get_temp_dir() . '/mapo_fb_' . md5($ip);
$now = time(); $window = 3600; $maxPerWindow = 8;
$hits = [];
if (file_exists($throttleFile)) { $hits = json_decode(@file_get_contents($throttleFile), true) ?: []; }
$hits = array_values(array_filter($hits, function ($t) use ($now, $window) { return $t > $now - $window; }));
if (count($hits) >= $maxPerWindow) {
  http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit;
}

// ── Lecture + validation ─────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'bad_request']); exit; }

// Honeypot : un bot remplira ce champ caché → on fait comme si tout allait bien.
if (trim((string)($body['hp'] ?? '')) !== '') { echo json_encode(['ok' => true]); exit; }

$clean = function ($s, $max) { $s = trim((string) $s); if (mb_strlen($s) > $max) $s = mb_substr($s, 0, $max); return $s; };
$oneLine = function ($s) { return trim(preg_replace('/[\r\n]+/', ' ', (string) $s)); };

$type    = ($body['type'] ?? '') === 'bug' ? 'bug' : (($body['type'] ?? '') === 'feature' ? 'feature' : '');
$subject = $clean($body['subject'] ?? '', 160);
$message = $clean($body['message'] ?? '', 5000);
if ($type === '')    { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'type_invalide']); exit; }
if ($message === '') { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'message_vide']); exit; }

$ctx = is_array($body['context'] ?? null) ? $body['context'] : [];
$c = [
  'name'     => $clean($ctx['name'] ?? '', 120),
  'email'    => $clean($ctx['email'] ?? '', 160),
  'role'     => $clean($ctx['role'] ?? '', 60),
  'school'   => $clean($ctx['school'] ?? '', 160),
  'schoolId' => $clean($ctx['schoolId'] ?? '', 120),
  'edition'  => $clean($ctx['edition'] ?? '', 40),
  'url'      => $clean($ctx['url'] ?? '', 300),
  'locale'   => $clean($ctx['locale'] ?? '', 10),
  'version'  => $clean($ctx['version'] ?? '', 40),
  'ua'       => $clean($ctx['ua'] ?? '', 300),
];
$senderEmail = filter_var($c['email'], FILTER_VALIDATE_EMAIL) ? $c['email'] : '';

// Enregistre l'envoi dans la fenêtre de limite.
$hits[] = $now; @file_put_contents($throttleFile, json_encode($hits));

// ── Construction de l'e-mail ─────────────────────────────────────────
$typeLabel = $type === 'bug' ? 'BUG' : 'Idée';
$subjLine  = '[MAPO][' . $typeLabel . '] ' . $oneLine($subject !== '' ? $subject : mb_substr($message, 0, 60));

$lines = [];
$lines[] = 'Type    : ' . ($type === 'bug' ? 'Bug / problème' : 'Demande de fonctionnalité');
if ($subject !== '') $lines[] = 'Sujet   : ' . $subject;
$lines[] = '';
$lines[] = $message;
$lines[] = '';
$lines[] = '────────────────────────────';
$lines[] = 'Envoyé par : ' . ($c['name'] !== '' ? $c['name'] : '(anonyme)') . ($c['role'] !== '' ? ' — ' . $c['role'] : '');
if ($c['email'] !== '')    $lines[] = 'E-mail     : ' . $c['email'];
if ($c['school'] !== '')   $lines[] = 'École      : ' . $c['school'] . ($c['schoolId'] !== '' ? ' (' . $c['schoolId'] . ')' : '');
if ($c['edition'] !== '')  $lines[] = 'Édition    : ' . $c['edition'];
if ($c['url'] !== '')      $lines[] = 'Page       : ' . $c['url'];
$meta = array_filter([$c['locale'], $c['version'] ? 'v' . $c['version'] : '', $c['ua']]);
if ($meta) $lines[] = 'Contexte   : ' . implode(' · ', $meta);
$lines[] = 'Date       : ' . date('Y-m-d H:i:s');
$mailBody = implode("\n", $lines);

$headers = [];
$headers[] = 'From: MAPO Feedback <' . FEEDBACK_FROM . '>';
if ($senderEmail !== '') $headers[] = 'Reply-To: ' . $senderEmail;
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: MAPO-Feedback';

// Copie de secours (JSON-lines, dossier temp non exposé au web).
@file_put_contents(
  sys_get_temp_dir() . '/mapo_feedback.log',
  json_encode(['t' => date('c'), 'type' => $type, 'subject' => $subject, 'message' => $message, 'ctx' => $c], JSON_UNESCAPED_UNICODE) . "\n",
  FILE_APPEND
);

$encodedSubject = '=?UTF-8?B?' . base64_encode($subjLine) . '?='; // sujet UTF-8 correct
$sent = @mail(FEEDBACK_TO, $encodedSubject, $mailBody, implode("\r\n", $headers));

if ($sent) {
  echo json_encode(['ok' => true]);
} else {
  // mail() indisponible : le retour est tout de même journalisé côté serveur ;
  // le front proposera un repli mailto pour ne rien perdre.
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'mail_failed']);
}
