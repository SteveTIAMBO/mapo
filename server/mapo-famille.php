<?php
/**
 * MAPO+ — Compte enfant SANS inscription (lien magique « famille »).
 *
 * Problème résolu : aujourd'hui l'enfant doit créer un compte PUIS saisir un
 * code. Le parent veut un simple lien (partageable par WhatsApp) : l'enfant
 * clique, et son compte est créé et connecté d'un coup — aucun mot de passe,
 * aucune activation.
 *
 * Mécanique : le parent génère toujours un CODE d'invitation enfant
 * (enfantInvites/{code}, créé uniquement par lui, cf. règles Firestore). Le lien
 * magique porte ce code. À l'ouverture, l'appli appelle ce point d'entrée qui,
 * SI le code est valide, forge un JETON PERSONNALISÉ Firebase (« custom token »)
 * pour un compte enfant STABLE, et le renvoie. L'appli fait alors
 * signInWithCustomToken(token) → l'enfant est connecté, puis scelle le
 * rattachement via le flux existant (redeemInvite : mêmes documents, mêmes
 * règles). Aucune règle Firestore n'a besoin de changer.
 *
 * Sécurité :
 *   - Le minting est CONDITIONNÉ à un code d'invitation enfant valide. Sans un
 *     code créé par un parent, aucun jeton n'est forgé.
 *   - L'UID enfant est une fonction pure de (ownerUid, enfantId) : un même
 *     enfant = un seul compte, quelle que soit la rotation du code. On n'écrit
 *     RIEN côté serveur (lecture seule de l'invitation).
 *   - La clé de compte de service (mapo-sa-key.json) vit UNIQUEMENT sur le
 *     serveur (exclue du dépôt et du déploiement). Elle n'est jamais renvoyée.
 *
 * Installation : déposer ce fichier dans public_html/…/mapo/ à côté de
 * mapo-sa-key.json (la même clé que mapo-provision.php). Un .htaccess protège
 * déjà les *-config.php et *-key.json.
 *
 * Pré-requis IAM : le compte de service de mapo-sa-key.json doit pouvoir forger
 * des jetons personnalisés (rôle « Créateur de jetons du compte de service » /
 * Service Account Token Creator, ou compte firebase-adminsdk par défaut). Le
 * point de diagnostic GET ?diag=1 indique la présence de la clé (jamais son
 * contenu) ; l'échec de connexion côté enfant révèle un rôle IAM manquant.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(20); // garde-fou passerelle

// ── CORS défensif : uniquement les origines *.app-edufrem.com ─────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Config (best-effort) : FIREBASE_PROJECT non secret → défaut si absent.
$cfg = __DIR__ . '/mapo-lien-config.php';
if (is_file($cfg)) require_once $cfg;
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
// Même clé de compte de service que le provisioning des sous-domaines.
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');

// ── Diagnostic (non secret) ───────────────────────────────────────────
// GET : indique si la clé SA est en place et exploitable, SANS jamais
// exposer son contenu (au plus le domaine de l'e-mail du compte de service).
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $present = is_file(SA_KEY_FILE);
  $valid = false; $domain = null;
  if ($present) {
    $k = json_decode(@file_get_contents(SA_KEY_FILE), true);
    $valid = $k && !empty($k['client_email']) && !empty($k['private_key']);
    if ($valid && strpos($k['client_email'], '@') !== false) {
      $domain = '…@' . substr(strrchr($k['client_email'], '@'), 1);
    }
  }
  // Sonde de LECTURE : on tente de lire un document volontairement inexistant.
  // ⚠️ L'identifiant ne doit PAS être encadré de doubles tirets bas : Firestore
  // réserve cette forme et répond 400, ce qui rendait la sonde inutilisable.
  // 404 = tout va bien (on a le droit de lire, le document n'existe pas).
  // 403 = le compte de service n'a pas le rôle Firestore : c'est LA panne qui
  // faisait passer chaque lien magique valide pour un lien expiré.
  $lecture = null; $lectureVerdict = 'non_testee';
  if ($valid) {
    list($tok, $errTok) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
    if (!$tok) { $lectureVerdict = 'jeton_impossible'; }
    else {
      $st = null;
      fsGet('https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
        . '/databases/(default)/documents/enfantInvites/sonde-diagnostic-inexistante', $tok, $st);
      $lecture = $st;
      $lectureVerdict = ($st === 404) ? 'ok' : (($st === 403 || $st === 401) ? 'droits_manquants' : 'inattendu');
    }
  }
  echo json_encode([
    'ok' => true,
    'project' => FIREBASE_PROJECT,
    'sa_key_present' => $present,
    'sa_key_valid' => $valid,
    'sa_domain' => $domain,
    'lecture_http' => $lecture,
    'lecture' => $lectureVerdict,
  ]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['error' => 'method_not_allowed']); exit;
}

// ── Lire la requête ───────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];
$action = $body['action'] ?? '';
$code = strtoupper(trim($body['code'] ?? ''));

if ($action !== 'join_child') { http_response_code(400); echo json_encode(['error' => 'action_inconnue']); exit; }
if (!preg_match('/^[A-Z0-9]{4,16}$/', $code)) { http_response_code(400); echo json_encode(['error' => 'code_invalide']); exit; }

// ── Jeton d'accès Firestore (compte de service) ───────────────────────
list($accessToken, $errTok) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
if (!$accessToken) { http_response_code(503); echo json_encode(['error' => 'service_indisponible', 'detail' => $errTok]); exit; }

$fsBase = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT . '/databases/(default)/documents/';

// ── 1. Lire l'invitation enfant (lecture seule) ───────────────────────
$readStatus = null;
$inv = fsGet($fsBase . 'enfantInvites/' . rawurlencode($code), $accessToken, $readStatus);
if ($inv === null) {
  // 403 / 401 = le compte de service n'a pas le droit de lire — c'est une panne
  // de NOTRE côté. Dire à un enfant « ton lien n'est plus valide » l'enverrait
  // redemander un lien à son parent, en boucle, sans que rien ne s'arrange.
  if ($readStatus === 403 || $readStatus === 401) {
    http_response_code(503);
    echo json_encode(['error' => 'service_indisponible', 'detail' => 'firestore_' . $readStatus]);
    exit;
  }
  http_response_code(404); echo json_encode(['error' => 'code_inconnu']); exit;
}
$f = $inv['fields'] ?? [];
$ownerUid = $f['ownerUid']['stringValue'] ?? '';
$enfantId = $f['enfantId']['stringValue'] ?? '';
$prenom = $f['enfantPrenom']['stringValue'] ?? '';
if ($ownerUid === '' || $enfantId === '') { http_response_code(404); echo json_encode(['error' => 'code_incomplet']); exit; }

// ── 2. UID enfant STABLE = fonction pure de (ownerUid, enfantId) ───────
// Un même enfant → un seul compte, quelle que soit la rotation du code.
// On n'écrit rien : pas de « stamp » côté serveur, pas de droit d'écriture.
$childUid = 'enf_' . substr(hash('sha256', $ownerUid . '|' . $enfantId), 0, 24);

// ── 3. Forger le jeton personnalisé Firebase ──────────────────────────
list($customToken, $errCt) = mintCustomToken($childUid);
if (!$customToken) { http_response_code(500); echo json_encode(['error' => 'jeton_echec', 'detail' => $errCt]); exit; }

echo json_encode([
  'ok' => true,
  'token' => $customToken,
  'enfantId' => $enfantId,
  'ownerUid' => $ownerUid,
  'prenom' => $prenom,
  'childUid' => $childUid,
]);
exit;


// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════

/**
 * Access token OAuth2 à partir de la clé de compte de service (flux JWT
 * bearer). Identique à mapo-provision.php. Retourne [token, null] ou
 * [null, code_erreur].
 */
function getGoogleAccessToken($scope) {
  if (!defined('SA_KEY_FILE') || !is_file(SA_KEY_FILE)) return [null, 'sa_key_absente'];
  $key = json_decode(file_get_contents(SA_KEY_FILE), true);
  if (!$key || empty($key['client_email']) || empty($key['private_key'])) return [null, 'sa_key_invalide'];

  $b64 = function ($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); };
  $now = time();
  $jwtHeader = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $jwtClaims = $b64(json_encode([
    'iss'   => $key['client_email'],
    'scope' => $scope,
    'aud'   => 'https://oauth2.googleapis.com/token',
    'iat'   => $now,
    'exp'   => $now + 3600,
  ]));
  $unsigned = $jwtHeader . '.' . $jwtClaims;
  $sig = '';
  if (!openssl_sign($unsigned, $sig, $key['private_key'], OPENSSL_ALGO_SHA256)) {
    return [null, 'jwt_signature_echec'];
  }
  $assertion = $unsigned . '.' . $b64($sig);

  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
      'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion'  => $assertion,
    ]),
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 'token_injoignable'];
  $j = json_decode($res, true);
  if ($code !== 200 || empty($j['access_token'])) return [null, 'token_echec'];
  return [$j['access_token'], null];
}

/**
 * Forge un jeton personnalisé Firebase (« custom token ») pour $uid, signé
 * LOCALEMENT avec la clé privée du compte de service (comme le fait le SDK
 * Admin). Le jeton est validé par Firebase à signInWithCustomToken().
 * Retourne [jwt, null] ou [null, code_erreur].
 */
function mintCustomToken($uid) {
  if (!defined('SA_KEY_FILE') || !is_file(SA_KEY_FILE)) return [null, 'sa_key_absente'];
  $key = json_decode(file_get_contents(SA_KEY_FILE), true);
  if (!$key || empty($key['client_email']) || empty($key['private_key'])) return [null, 'sa_key_invalide'];

  $b64 = function ($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); };
  $now = time();
  $header = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $claims = $b64(json_encode([
    'iss' => $key['client_email'],
    'sub' => $key['client_email'],
    'aud' => 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    'uid' => $uid,
    'iat' => $now,
    'exp' => $now + 3600, // les custom tokens ne vivent qu'une heure
    // Marque l'origine du compte (utile pour d'éventuelles règles/claims).
    'claims' => ['mapoplus_enfant' => true],
  ]));
  $unsigned = $header . '.' . $claims;
  $sig = '';
  if (!openssl_sign($unsigned, $sig, $key['private_key'], OPENSSL_ALGO_SHA256)) {
    return [null, 'signature_echec'];
  }
  return [$unsigned . '.' . $b64($sig), null];
}

/**
 * GET Firestore REST. Retourne le document décodé (tableau associatif avec
 * `fields`) ou null si absent/erreur.
 */
// $status (par référence) permet à l'appelant de distinguer 404 (document
// absent) de 403 (rôle IAM manquant) — deux causes opposées qui produisaient
// jusqu'ici le MÊME `code_inconnu`, donc le même message trompeur à l'enfant.
function fsGet($url, $token, &$status = null) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $status = $code;
  if ($res === false || $code !== 200) return null;
  $j = json_decode($res, true);
  return is_array($j) ? $j : null;
}
