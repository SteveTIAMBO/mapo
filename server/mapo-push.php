<?php
/**
 * MAPO+ — Envoi d'un rappel de révision en PUSH WEB (gratuit), à la demande.
 *
 * Reçoit un abonnement navigateur + un message, chiffre pour cet abonnement
 * (RFC 8291) et POSTe au service push du navigateur. La crypto vit dans
 * mapo-push-lib.php (partagée avec le rappel quotidien mapo-push-cron.php).
 *
 * Sécurité : appelant authentifié (jeton Firebase) → message personnalisable.
 * Appelant non authentifié (démo, sans compte) → autorisé aussi MAIS contenu
 * imposé par le serveur (anti-hameçonnage) ; on n'envoie qu'à l'abonnement
 * fourni (auto-test bénin).
 *
 * Config : mapo-push-config.php ($VAPID_PUBLIC, $VAPID_PRIVATE_PEM,
 * $VAPID_SUBJECT, FIREBASE_PROJECT).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, max-age=0'); // réponses jamais mises en cache (LWS)
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
require __DIR__ . '/mapo-push-lib.php';
if (!isset($VAPID_PRIVATE_PEM) || !isset($VAPID_PUBLIC) || trim($VAPID_PRIVATE_PEM) === '') {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}

// Appelant authentifié → peut personnaliser. Sinon contenu imposé (anti-hameçonnage).
$uid = verifyFirebaseToken();
$trusted = ($uid !== null);

$body = json_decode(file_get_contents('php://input'), true);
$sub = $body['subscription'] ?? null;
$action = $body['action'] ?? 'send';

// Inscription au registre (pour le rappel quotidien) / désinscription.
if ($action === 'register') {
  // $uid vient du jeton VÉRIFIÉ, jamais du corps de la requête : c'est lui qui
  // rend possible l'envoi ciblé (alerter LE parent de CET enfant).
  echo json_encode(['ok' => mp_subsAdd($sub ?: [], $uid ?: '')]); exit;
}
if ($action === 'unregister') {
  mp_subsRemove($sub['endpoint'] ?? '');
  echo json_encode(['ok' => true]); exit;
}

// Un enfant demande à prévenir son parent (crédits épuisés).
//
// Le destinataire n'est JAMAIS celui que désigne le client : on part de l'uid du
// jeton vérifié, et on lit le rattachement enfant→parent écrit côté serveur au
// moment de la création des accès. Sans ça, n'importe qui pourrait arroser
// n'importe quel compte de notifications.
if ($action === 'alerte-parent') {
  if (!$trusted) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }
  $lien = mp_lienGet($uid);
  if (!$lien) { echo json_encode(['ok' => false, 'error' => 'parent_inconnu']); exit; }
  // Une seule demande par jour : c'est un rappel, pas une sonnette.
  $jour = gmdate('Y-m-d');
  if (mp_alerteDejaEnvoyee($uid, 'demande-enfant', $jour)) {
    echo json_encode(['ok' => true, 'deja' => true]); exit;
  }
  $prenom = $lien['prenom'] !== '' ? $lien['prenom'] : 'Votre enfant';
  $lang = (($body['lang'] ?? 'fr') === 'en') ? 'en' : 'fr';
  $titre = $lang === 'en' ? 'Credits used up' : 'Crédits épuisés';
  $texte = $lang === 'en'
    ? "{$prenom} has used all their credits and cannot revise. Top up their account to let them continue."
    : "{$prenom} a utilisé tous ses crédits et ne peut plus réviser. Rechargez son compte pour qu'il ou elle continue.";
  $n = mp_notifierUid($lien['parentUid'], $titre, $texte, '/parent/miapo', $VAPID_PUBLIC, $VAPID_PRIVATE_PEM, $VAPID_SUBJECT ?? 'mailto:contact@edufrem.com');
  mp_marquerAlerte($uid, 'demande-enfant', $jour);
  // `ok` même si le parent n'a aucun appareil abonné : de son point de vue,
  // l'enfant a bien fait ce qu'on lui demandait. `envoyes` dit la vérité.
  echo json_encode(['ok' => true, 'envoyes' => $n]); exit;
}

// Relance WhatsApp : le parent pose son numéro + opt-in ; l'appli rafraîchit la
// date de dernière révision. Clé = propriétaire|idEnfant (fournie par le client).
if ($action === 'relance-set') {
  $key = trim($body['key'] ?? '');
  if ($key === '') { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'cle_manquante']); exit; }
  $fields = [];
  if (isset($body['phone'])) $fields['phone'] = preg_replace('/[^0-9+]/', '', (string) $body['phone']);
  if (isset($body['childName'])) $fields['childName'] = mb_substr(trim((string) $body['childName']), 0, 60);
  if (isset($body['optIn'])) $fields['optIn'] = (bool) $body['optIn'];
  if (isset($body['lastRevision'])) $fields['lastRevision'] = preg_replace('/[^0-9-]/', '', (string) $body['lastRevision']);
  echo json_encode(['ok' => mp_relanceSet($key, $fields)]); exit;
}

$p256dh = mp_b64url_dec($sub['keys']['p256dh'] ?? '');
$auth = mp_b64url_dec($sub['keys']['auth'] ?? '');
if (empty($sub['endpoint']) || strlen($p256dh) !== 65 || strlen($auth) < 16) {
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

try {
  $code = mp_sendWebPush($sub, $payload, $VAPID_PUBLIC, $VAPID_PRIVATE_PEM, $VAPID_SUBJECT ?? 'mailto:contact@edufrem.com');
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'error' => 'crypto', 'detail' => $e->getMessage()]); exit;
}

if ($code === 201 || $code === 200) {
  echo json_encode(['ok' => true, 'status' => $code]);
} elseif ($code === 404 || $code === 410) {
  echo json_encode(['ok' => false, 'error' => 'expired', 'status' => $code]);
} else {
  echo json_encode(['ok' => false, 'error' => 'push_failed', 'status' => $code]);
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
