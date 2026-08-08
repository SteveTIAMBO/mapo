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
// Registre des notifications : sert à mémoriser « cet enfant dépend de ce
// parent », écrit ci-dessous aux deux endroits où le serveur connaît les deux
// comptes. La lib ne fait que du fichier, elle n'ouvre aucune connexion.
//
// Inclusion CONDITIONNELLE, et appels gardés par function_exists : ce fichier
// porte la connexion des enfants (lien magique et identifiants). Une dépendance
// dure vers une lib de confort le ferait mourir si elle venait à manquer sur le
// serveur — on n'échange pas un accès contre une notification.
$libPush = __DIR__ . '/mapo-push-lib.php';
if (is_file($libPush)) require_once $libPush;
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
// Même clé de compte de service que le provisioning des sous-domaines.
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');
// Domaine des identifiants d'enfants. DOIT rester identique à
// PSEUDO_EMAIL_DOMAIN dans src/utils/identifier.js : c'est la même adresse
// interne des deux côtés, et une divergence rendrait la connexion impossible.
if (!defined('PSEUDO_DOMAIN')) define('PSEUDO_DOMAIN', 'enfant.mapo-edufrem.app');

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

// ══════════════════════════════════════════════════════════════════════
//  ACTIONS PARENT — l'enfant est MINEUR : c'est son parent qui décide.
//
//  Ces deux actions exigent le jeton Firebase du PARENT, et ne portent que
//  sur SES enfants : l'UID de l'enfant est dérivé de (uid du parent, id de
//  l'enfant), donc un parent ne peut atteindre l'enfant de personne d'autre.
//  C'est la propriété qui rend ces actions sûres — pas une vérification
//  ajoutée par-dessus, mais la façon dont l'identifiant est construit.
// ══════════════════════════════════════════════════════════════════════
if ($action === 'set_child_login' || $action === 'delete_child') {
  $claims = verifyFirebaseToken();
  $parentUid = $claims['sub'] ?? '';
  if ($parentUid === '') { http_response_code(401); echo json_encode(['error' => 'non_autorise']); exit; }

  $enfantId = trim($body['enfantId'] ?? '');
  if ($enfantId === '' || strlen($enfantId) > 64) { http_response_code(400); echo json_encode(['error' => 'enfant_invalide']); exit; }
  $childUid = 'enf_' . substr(hash('sha256', $parentUid . '|' . $enfantId), 0, 24);

  list($tok, $errTok) = getGoogleAccessToken('https://www.googleapis.com/auth/cloud-platform');
  if (!$tok) { http_response_code(503); echo json_encode(['error' => 'service_indisponible', 'detail' => $errTok]); exit; }

  // ── Le parent choisit l'identifiant et un code court pour son enfant ──
  if ($action === 'set_child_login') {
    $ident = strtolower(trim($body['identifiant'] ?? ''));
    // Même normalisation que le client (utils/identifier.js) : sans accents,
    // sans espaces. Si les deux divergeaient, le parent créerait un identifiant
    // que l'enfant ne pourrait pas saisir.
    $ident = preg_replace('/[^a-z0-9._-]/', '', $ident);
    if (strlen($ident) < 3 || strlen($ident) > 32) { http_response_code(400); echo json_encode(['error' => 'identifiant_invalide']); exit; }
    $code = trim($body['code'] ?? '');
    // Code court à chiffres : un enfant de CM1 ne retient pas un mot de passe.
    if (!preg_match('/^\d{4,6}$/', $code)) { http_response_code(400); echo json_encode(['error' => 'code_invalide']); exit; }
    $email = $ident . '@' . PSEUDO_DOMAIN;

    // 1. L'identifiant est-il déjà pris par QUELQU'UN D'AUTRE ?
    list($lu, ) = itPost('accounts:lookup', $tok, ['email' => [$email]]);
    $pris = $lu['users'][0]['localId'] ?? '';
    if ($pris !== '' && $pris !== $childUid) {
      http_response_code(409); echo json_encode(['error' => 'identifiant_pris']); exit;
    }

    // 2. Créer le compte, ou mettre à jour celui qui existe déjà.
    //    `emailVerified: true` : cette adresse est interne et ne reçoit rien,
    //    il n'y a donc aucune activation possible ni souhaitable.
    if ($pris === '') {
      list($res, $http) = itPost('accounts', $tok, [
        'localId' => $childUid, 'email' => $email, 'password' => $code, 'emailVerified' => true,
      ]);
    } else {
      list($res, $http) = itPost('accounts:update', $tok, [
        'localId' => $childUid, 'email' => $email, 'password' => $code, 'emailVerified' => true,
      ]);
    }
    if ($http !== 200) {
      http_response_code(502);
      echo json_encode(['error' => 'creation_impossible', 'detail' => $res['error']['message'] ?? ('http_' . $http)]);
      exit;
    }

    // 3. LE POINTEUR DE RATTACHEMENT — sans lui, le compte ne sert à rien.
    //
    // Au premier démarrage, l'application lit `users/<enfant>/b2c/link` pour
    // savoir de quel parent et de quel profil dépend la session. Ce document
    // manquait ici : le flux « lien magique » l'écrit depuis le navigateur de
    // l'enfant (il y est authentifié comme lui-même), mais l'enfant qui arrive
    // par identifiant + code ne sait rien de son parent — il ne peut donc pas
    // l'écrire. Faute de pointeur, l'application le prenait pour un nouveau
    // venu et lui refaisait passer tout l'onboarding : prénom, niveau, école…
    // alors que sa mère venait de les saisir. Vécu le 05/08 (Marie Francisca).
    //
    // C'est donc au serveur de l'écrire, avec le compte de service : le parent
    // n'a aucun droit d'écriture chez son enfant, et il ne doit pas en avoir.
    list($fsTok, ) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
    if (!$fsTok) {
      http_response_code(502);
      echo json_encode(['error' => 'lien_impossible', 'detail' => 'firestore_token']);
      exit;
    }
    $lienUrl = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
      . '/databases/(default)/documents/users/' . rawurlencode($childUid) . '/b2c/link';
    // Mêmes champs que le flux lien magique (enfantsComptes.js) : toute
    // divergence ferait diverger les deux chemins d'entrée.
    list($lienRes, $lienHttp) = fsPatch($lienUrl, $fsTok, [
      'ownerUid' => ['stringValue' => $parentUid],
      'enfantId' => ['stringValue' => $enfantId],
    ]);
    if ($lienHttp !== 200) {
      // On échoue FRANCHEMENT : le compte existe, mais s'en servir renverrait
      // l'enfant dans l'onboarding. Mieux vaut que le parent le sache et
      // recommence — l'opération est rejouable telle quelle.
      http_response_code(502);
      echo json_encode(['error' => 'lien_impossible', 'detail' => $lienRes['error']['message'] ?? ('http_' . $lienHttp)]);
      exit;
    }

    // 4. LE PENDANT CÔTÉ PARENT — sans lui, l'enfant est lié mais ne peut RIEN lire.
    //
    // La règle Firestore qui autorise l'enfant à lire son propre profil
    // (`estMonProfil()`, dans `match /b2c/{docId}`) ne se fie pas au pointeur
    // ci-dessus : elle exige que le PARENT reconnaisse l'enfant, via
    // `users/<parent>/enfantsComptes/<enfant>`, et que l'identifiant du profil
    // demandé corresponde à celui qui y est inscrit. C'est le bon sens de la
    // sécurité — un enfant ne se déclare pas lui-même enfant de quelqu'un.
    //
    // Écrire le pointeur SANS ce document donnait un compte à moitié rattaché :
    // l'application savait que Marie était une enfant, mais la base lui refusait
    // la lecture de son profil, sa liste restait vide, et l'onboarding
    // repartait. Les deux écritures vont ensemble, toujours.
    $ecUrl = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
      . '/databases/(default)/documents/users/' . rawurlencode($parentUid)
      . '/enfantsComptes/' . rawurlencode($childUid);
    list($ecRes, $ecHttp) = fsPatch($ecUrl, $fsTok, [
      'enfantUid' => ['stringValue' => $childUid],
      'enfantId'  => ['stringValue' => $enfantId],
      'source'    => ['stringValue' => 'identifiants'],
      'addedAt'   => ['stringValue' => gmdate('c')],
    ]);
    if ($ecHttp !== 200) {
      http_response_code(502);
      echo json_encode(['error' => 'lien_impossible', 'detail' => $ecRes['error']['message'] ?? ('http_' . $ecHttp)]);
      exit;
    }

    // Rattachement enfant → parent pour les NOTIFICATIONS (fichier local).
    // C'est le seul endroit où le serveur connaît les deux comptes de façon
    // sûre : `enf_<sha256(parent|enfantId)>` ne s'inverse pas. Sans cette ligne,
    // le serveur ne saurait pas à qui écrire quand les crédits de l'enfant
    // s'épuisent. Best-effort : une notification manquée ne doit jamais faire
    // échouer la création des accès.
    if (function_exists('mp_lienSet')) mp_lienSet($childUid, $parentUid, trim($body['prenom'] ?? ''));

    echo json_encode(['ok' => true, 'identifiant' => $ident, 'childUid' => $childUid]);
    exit;
  }

  // ── Le parent supprime le compte de son enfant ──
  // Un mineur n'a pas à demander l'effacement de ses propres données : c'est
  // son parent qui exerce ce droit pour lui.
  if ($action === 'delete_child') {
    list($res, $http) = itPost('accounts:delete', $tok, ['localId' => $childUid]);
    // 200 = supprimé ; une erreur « utilisateur inconnu » est un succès de fait
    // (l'enfant n'avait jamais ouvert son lien) et ne doit pas bloquer le parent.
    $absent = isset($res['error']['message']) && strpos($res['error']['message'], 'USER_NOT_FOUND') !== false;
    if ($http !== 200 && !$absent) {
      http_response_code(502);
      echo json_encode(['error' => 'suppression_impossible', 'detail' => $res['error']['message'] ?? ('http_' . $http)]);
      exit;
    }
    // Les documents de l'enfant, avec le compte de service (le parent n'a pas
    // le droit d'écrire chez l'enfant, et c'est très bien ainsi).
    list($fsTok, ) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
    if ($fsTok) {
      $base = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT . '/databases/(default)/documents/';
      // ⚠️ Firestore ne supprime PAS en cascade : effacer un document laisse ses
      // sous-collections intactes et invisibles. La version précédente ne
      // supprimait que `b2c/link` et le document racine — les révisions de
      // l'enfant, ses conversations avec le tuteur et le reste de son `b2c`
      // survivaient à la « suppression de son compte ». Pour un produit qui
      // promet d'effacer les données d'un mineur à la demande de son parent,
      // c'était une promesse non tenue.
      fsSupprimerArbre($base . 'users/' . rawurlencode($childUid), $fsTok);
      fsDelete($base . 'users/' . rawurlencode($parentUid) . '/enfantsComptes/' . rawurlencode($childUid), $fsTok);
      // Registre d'adoption B2C : il porte l'e-mail interne de l'enfant.
      fsDelete($base . 'mapoplus_users/' . rawurlencode($childUid), $fsTok);
    }
    echo json_encode(['ok' => true, 'childUid' => $childUid]);
    exit;
  }
}

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

// Rattachement enfant → parent pour les notifications. Ici aussi : le lien
// magique est l'autre voie d'accès d'un enfant, et un compte créé par ce
// chemin-là doit pouvoir alerter son parent comme les autres.
if (function_exists('mp_lienSet')) mp_lienSet($childUid, $ownerUid, $prenom);

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
/**
 * Vérifie le jeton Firebase du PARENT (signature RS256 + audience + expiration).
 * Reprise à l'identique de mapo-mail.php : implémentation déjà en production.
 * Renvoie les claims (dont `sub` = uid), ou null.
 */
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

/** Appel admin Identity Toolkit (création / mise à jour / suppression de compte). */
function itPost($chemin, $token, $body) {
  $url = 'https://identitytoolkit.googleapis.com/v1/projects/' . FIREBASE_PROJECT . '/' . $chemin;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body),
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [json_decode($res ?: '{}', true) ?: [], $http];
}

/**
 * Écriture d'un document Firestore (compte de service). PATCH sans masque =
 * création si le document n'existe pas, remplacement complet sinon — c'est ce
 * qu'on veut pour un pointeur qui ne contient que deux champs.
 * Retourne [reponse_decodee, code_http].
 */
function fsPatch($url, $token, $fields) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_POSTFIELDS => json_encode(['fields' => $fields]),
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [json_decode($res ?: '{}', true) ?: [], $http];
}

/**
 * Suppression RÉCURSIVE d'un document et de tout ce qui vit dessous.
 *
 * Firestore ne supprime pas en cascade : `DELETE users/x` laisse
 * `users/x/revisions/…` en place, orphelin et invisible dans la console. Pour
 * effacer réellement les données d'un enfant, il faut descendre soi-même.
 *
 * `:listCollectionIds` donne les sous-collections d'un document (rien ne permet
 * de les deviner), puis on liste chaque sous-collection et on recommence. La
 * profondeur est bornée : nos données ne dépassent pas deux niveaux, et une
 * borne évite qu'une structure inattendue ne fasse tourner la requête sans fin.
 */
function fsSupprimerArbre($docUrl, $token, $profondeur = 0) {
  if ($profondeur > 3) return;

  // 1. Les sous-collections de ce document.
  $ch = curl_init($docUrl . ':listCollectionIds');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => '{}',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  curl_close($ch);
  $ids = json_decode($res ?: '{}', true)['collectionIds'] ?? [];

  foreach ($ids as $coll) {
    // 2. Les documents de la sous-collection. `mask.fieldPaths` vide : on ne
    //    veut que les noms, pas le contenu (moins de données transférées).
    $page = '';
    do {
      $listUrl = $docUrl . '/' . rawurlencode($coll) . '?pageSize=300&mask.fieldPaths=__name__'
        . ($page !== '' ? '&pageToken=' . rawurlencode($page) : '');
      $l = fsGet($listUrl, $token);
      $docs = is_array($l) && isset($l['documents']) ? $l['documents'] : [];
      foreach ($docs as $d) {
        if (empty($d['name'])) continue;
        // `name` est un chemin de ressource complet : on reconstruit l'URL.
        $enfantUrl = 'https://firestore.googleapis.com/v1/' . $d['name'];
        fsSupprimerArbre($enfantUrl, $token, $profondeur + 1);
      }
      $page = (is_array($l) && !empty($l['nextPageToken'])) ? $l['nextPageToken'] : '';
    } while ($page !== '');
  }

  // 3. Le document lui-même, une fois vidé de sa descendance.
  fsDelete($docUrl, $token);
}

/** Suppression d'un document Firestore (compte de service). */
function fsDelete($url, $token) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'DELETE',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $http;
}

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
