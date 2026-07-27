<?php
/**
 * MAPO — Pont de LIAISON école ↔ MAPO+ (#124).
 *
 * Un compte MAPO+ (B2C) relié à un élève d'une école MAPO doit voir SES devoirs
 * (puis cours, notes, bulletins). Problème : ces données vivent dans des documents
 * GROUPÉS (schools/{sid}/devoirs-data/data contient TOUTE l'école). Les règles
 * Firestore ne savent pas « trancher » un document → un accès client direct
 * exposerait les données des AUTRES élèves. Donc ce pont, côté serveur :
 *   1. vérifie le jeton Firebase de l'apprenant (RS256, aud = projet, non expiré) ;
 *   2. lit la donnée école avec le COMPTE DE SERVICE (admin, contourne les règles) ;
 *   3. ne renvoie QUE la tranche de l'élève lié — jamais celle des autres.
 *
 * Confiance : le lien naît CÔTÉ ÉCOLE. Un membre (directeur/admin) « autorise »
 * l'accès MAPO+ d'un élève → écrit schools/{sid}/mapoplus_invites/{code}
 * {eleveId, className, classId, matricule, …}. L'apprenant saisit ce code : ce
 * pont le vérifie et scelle le lien schools/{sid}/liens_mapoplus/{uid} (admin).
 *
 * Actions (POST JSON) :
 *   - redeem  {code}             → scelle le lien, renvoie {schoolId, eleveId, …}
 *   - devoirs {schoolId}         → renvoie les devoirs de SA classe + SES rendus
 *
 * Installation serveur (une fois, à côté de mapo-ia.php dans le dossier MAPO) :
 *   - déposer mapo-sa-key.json (la clé du compte de service, la MÊME que provision) ;
 *   - (optionnel) mapo-lien-config.php définissant FIREBASE_PROJECT (défaut
 *     « mapo-edufrem », non secret). Le fichier .htaccess protège déjà *-config.php
 *     et *-key.json.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(30);

// Même origine en prod (/mapo-lien.php). CORS défensif : on n'autorise QUE les
// sous-domaines *.app-edufrem.com (miroir de mapo-ia.php).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'method_not_allowed']); exit; }

// Config (best-effort) : FIREBASE_PROJECT non secret → défaut si absent.
$cfg = __DIR__ . '/mapo-lien-config.php';
if (is_file($cfg)) require_once $cfg;
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');

// Logique pure (encode/décode Firestore + tranchage) — testée à part.
require_once __DIR__ . '/mapo-lien-lib.php';

// ── Diagnostic (public, sans donnée) : /mapo-lien.php?ping=1 ──────────
// Permet de vérifier d'un coup d'œil, dans le navigateur, si la clé de compte de
// service est bien en place et fonctionnelle. Ne renvoie AUCUNE donnée sensible
// (booléens de configuration seulement), et surtout jamais le contenu de la clé.
if (($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') && (isset($_GET['ping']) || isset($_GET['diag']))) {
  $present = file_exists(SA_KEY_FILE);
  $tokenOk = false; $err = null;
  if ($present) { list($tk, $err) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore'); $tokenOk = !!$tk; }
  else { $err = 'sa_key_absente'; }
  echo json_encode([
    'ok' => true,
    'service' => 'mapo-lien',
    'sa_key_attendue' => basename(SA_KEY_FILE),
    'dossier' => basename(__DIR__),
    'sa_key_presente' => $present,
    'sa_token_ok' => $tokenOk,
    'projet' => FIREBASE_PROJECT,
    'pret' => ($present && $tokenOk),
    'detail' => $tokenOk ? null : $err,
  ]);
  exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $body['action'] ?? '';

// ── 1. Vérifier le jeton Firebase de l'apprenant → uid ────────────────
$uid = verifyFirebaseUid();
if (!$uid) { http_response_code(401); echo json_encode(['error' => 'non_autorise']); exit; }

// ── 2. Jeton admin (compte de service) pour lire/écrire Firestore ─────
list($saToken, $saErr) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
if (!$saToken) { http_response_code(503); echo json_encode(['error' => 'admin_indisponible', 'detail' => $saErr]); exit; }

// ════════════════════════════════════════════════════════════════════
if ($action === 'redeem') {
  $code = trim((string)($body['code'] ?? ''));
  // Le code embarque le slug de l'école : « {schoolId}~{aléatoire} ».
  if (!preg_match('/^([a-z0-9-]{2,40})~([A-Za-z0-9]{8,40})$/', $code, $m)) {
    http_response_code(400); echo json_encode(['error' => 'code_invalide']); exit;
  }
  $schoolId = $m[1];

  $invPath = "schools/{$schoolId}/mapoplus_invites/" . rawurlencode($code);
  list($inv, $invCode) = fsGet($invPath, $saToken);
  if ($invCode !== 200 || !$inv) { http_response_code(404); echo json_encode(['error' => 'code_introuvable']); exit; }
  $invF = fsDecodeFields($inv['fields'] ?? []);
  $invUpdateTime = (string)($inv['updateTime'] ?? '');
  if (!empty($invF['used'])) { http_response_code(409); echo json_encode(['error' => 'code_deja_utilise']); exit; }
  // Expiration (facultative) : une invite périmée est refusée.
  $exp = (string)($invF['expiresAt'] ?? '');
  if ($exp !== '') { $et = strtotime($exp); if ($et !== false && $et < time()) { http_response_code(410); echo json_encode(['error' => 'code_expire']); exit; } }
  $eleveId = (string)($invF['eleveId'] ?? '');
  if ($eleveId === '') { http_response_code(422); echo json_encode(['error' => 'invite_incomplete']); exit; }

  $now = gmdate('Y-m-d\TH:i:s\Z');
  // USAGE UNIQUE, atomique : on CONSOMME l'invite AVANT de sceller, avec une
  // précondition sur l'updateTime → en cas de course (2 comptes, même code), un
  // seul gagne. Fail-safe : si la précondition échoue on relit pour trancher
  // (course perdue → refus) au lieu de casser la liaison.
  $usedFields = fsEncodeFields(['used' => true, 'usedByUid' => $uid, 'usedAt' => $now]);
  $consumed = fsPatch($invPath, $usedFields, $saToken, ['used', 'usedByUid', 'usedAt'], $invUpdateTime !== '' ? $invUpdateTime : null);
  if ($consumed !== 200) {
    list($inv2, $c2) = fsGet($invPath, $saToken);
    $used2 = ($c2 === 200 && $inv2) ? !empty(fsDecodeFields($inv2['fields'] ?? [])['used']) : false;
    if ($used2) { http_response_code(409); echo json_encode(['error' => 'code_deja_utilise']); exit; }
    $consumed = fsPatch($invPath, $usedFields, $saToken, ['used', 'usedByUid', 'usedAt']);
    if ($consumed !== 200) { http_response_code(502); echo json_encode(['error' => 'consommation_echec']); exit; }
  }

  // Élève = source de vérité (nom, classe, matricule) — défensif si l'invite est partielle.
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $elF = ($elCode === 200 && $el) ? fsDecodeFields($el['fields'] ?? []) : [];
  $className = (string)($elF['className'] ?? $invF['className'] ?? '');
  $classId   = (string)($invF['classId'] ?? '');
  $matricule = (string)($elF['matricule'] ?? $invF['matricule'] ?? '');
  $firstName = (string)($elF['firstName'] ?? $invF['firstName'] ?? '');
  $lastName  = (string)($elF['lastName'] ?? $invF['lastName'] ?? '');

  // Sceller le lien de confiance (admin). Clé = uid__eleveId → un compte PEUT relier
  // PLUSIEURS enfants (cas du parent). Chaque (compte, élève) est un doc distinct.
  $linkFields = fsEncodeFields([
    'eleveId' => $eleveId, 'className' => $className, 'classId' => $classId,
    'matricule' => $matricule, 'linkedAt' => $now, 'code' => $code,
  ]);
  $wCode = fsPatch("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $linkFields, $saToken);
  if ($wCode !== 200) {
    // Scellement échoué APRÈS consommation → on rend le code réutilisable (best-effort).
    fsPatch($invPath, fsEncodeFields(['used' => false]), $saToken, ['used']);
    http_response_code(502); echo json_encode(['error' => 'lien_non_scelle', 'detail' => $wCode]); exit;
  }

  echo json_encode(['ok' => true, 'lien' => [
    'schoolId' => $schoolId, 'eleveId' => $eleveId, 'className' => $className,
    'classId' => $classId, 'matricule' => $matricule,
    'firstName' => $firstName, 'lastName' => $lastName, 'ecole' => (string)($invF['ecole'] ?? ''),
  ]]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
if ($action === 'devoirs') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }

  // L'enfant ciblé est indiqué par le client, mais l'accès n'est accordé QUE si un
  // lien de confiance (uid__eleveId) a été scellé par redeem (le client ne peut pas
  // le forger). Un parent ne peut donc voir QUE les enfants qu'il a reliés.
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $saToken);
  if ($lkCode !== 200 || !$lk) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  $linkClass   = (string)($lkF['className'] ?? '');
  $linkClassId = (string)($lkF['classId'] ?? '');
  // Classe COURANTE (l'élève a pu changer de classe depuis la liaison) : on relit
  // sa fiche → jamais servir une classe qu'il a quittée. Repli sur le snapshot.
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $className = ($elCode === 200 && $el) ? (string)(fsDecodeFields($el['fields'] ?? [])['className'] ?? '') : '';
  if ($className === '') $className = $linkClass;
  if ($className === '') { http_response_code(422); echo json_encode(['error' => 'lien_incomplet']); exit; }
  // On ne se fie au classId (snapshot) QUE si la classe n'a pas changé.
  $classId = ($className === $linkClass) ? $linkClassId : '';

  list($doc, $dCode) = fsGet("schools/{$schoolId}/devoirs-data/data", $saToken);
  if ($dCode !== 200 || !$doc) { echo json_encode(['ok' => true, 'className' => $className, 'devoirs' => []]); exit; }
  $data = fsDecodeFields($doc['fields'] ?? []);
  $all = is_array($data['devoirs'] ?? null) ? $data['devoirs'] : [];
  $subs = is_array($data['submissions'] ?? null) ? $data['submissions'] : [];

  // Tranchage (logique testée dans mapo-lien-lib.php) : sa classe + son seul rendu.
  $out = sliceDevoirs($all, $subs, $className, $classId, $eleveId);
  echo json_encode(['ok' => true, 'className' => $className, 'devoirs' => $out]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
if ($action === 'cours') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }

  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $saToken);
  if ($lkCode !== 200 || !$lk) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  $linkClass = (string)($lkF['className'] ?? '');
  // Classe COURANTE (voir action devoirs) : on relit la fiche élève.
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $className = ($elCode === 200 && $el) ? (string)(fsDecodeFields($el['fields'] ?? [])['className'] ?? '') : '';
  if ($className === '') $className = $linkClass;
  if ($className === '') { http_response_code(422); echo json_encode(['error' => 'lien_incomplet']); exit; }

  list($doc, $dCode) = fsGet("schools/{$schoolId}/config/cours", $saToken);
  if ($dCode !== 200 || !$doc) { echo json_encode(['ok' => true, 'className' => $className, 'cours' => []]); exit; }
  $data = fsDecodeFields($doc['fields'] ?? []);
  $items = is_array($data['items'] ?? null) ? $data['items'] : [];

  // Tranchage (testé) : cours/ressources de sa classe ; corrigé et binaire exclus.
  $out = sliceCours($items, $className);
  echo json_encode(['ok' => true, 'className' => $className, 'cours' => $out]);
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
//  Helpers : jeton Firebase, compte de service, Firestore REST
// ════════════════════════════════════════════════════════════════════
function b64url_decode($s) { return base64_decode(strtr($s, '-_', '+/')); }

/** Vérifie le jeton Firebase (RS256 + aud + iss + exp) et renvoie l'uid ou null. */
function verifyFirebaseUid() {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) return null;
  $parts = explode('.', $m[1]);
  if (count($parts) !== 3) return null;
  $h = json_decode(b64url_decode($parts[0]), true);
  $p = json_decode(b64url_decode($parts[1]), true);
  $sig = b64url_decode($parts[2]);
  if (($h['alg'] ?? '') !== 'RS256' || empty($h['kid'])) return null;
  if (($p['aud'] ?? '') !== FIREBASE_PROJECT
    || ($p['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT
    || ($p['exp'] ?? 0) < time()
    || empty($p['sub'])) return null;
  // Cache des clés publiques Google dans le dossier de l'APPLI (appartient à
  // l'utilisateur), PAS dans le /tmp partagé : sur mutualisé, un voisin pourrait
  // déposer un faux jeu de clés à un chemin /tmp prévisible et faire accepter des
  // jetons forgés. Dossier non inscriptible → on re-télécharge (correct, plus lent).
  $cacheFile = __DIR__ . '/mapo-certs-cache.json';
  $certs = null;
  if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 3600) $certs = json_decode(file_get_contents($cacheFile), true);
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
  if (openssl_verify($parts[0] . '.' . $parts[1], $sig, $pub, OPENSSL_ALGO_SHA256) !== 1) return null;
  return $p['sub'];
}

/** OAuth2 access token depuis la clé du compte de service (JWT bearer). [token, err]. */
function getGoogleAccessToken($scope) {
  if (!defined('SA_KEY_FILE') || !file_exists(SA_KEY_FILE)) return [null, 'sa_key_absente'];
  $key = json_decode(file_get_contents(SA_KEY_FILE), true);
  if (!$key || empty($key['client_email']) || empty($key['private_key'])) return [null, 'sa_key_invalide'];
  $b64 = function ($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); };
  $now = time();
  $unsigned = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . $b64(json_encode([
    'iss' => $key['client_email'], 'scope' => $scope,
    'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600,
  ]));
  $sig = '';
  if (!openssl_sign($unsigned, $sig, $key['private_key'], OPENSSL_ALGO_SHA256)) return [null, 'jwt_signature_echec'];
  $assertion = $unsigned . '.' . $b64($sig);
  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $assertion]),
    CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 'token_injoignable'];
  $j = json_decode($res, true);
  if ($code !== 200 || empty($j['access_token'])) return [null, 'token_echec'];
  return [$j['access_token'], null];
}

function fsBaseUrl() {
  return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT . '/databases/(default)/documents/';
}
/** GET un document Firestore (admin). Renvoie [data|null, httpCode]. */
function fsGet($path, $token) {
  $ch = curl_init(fsBaseUrl() . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [null, 0];
  return [json_decode($res, true), $code];
}
/**
 * PATCH (create/update) un document. $maskFields = mise à jour ciblée.
 * $precondUpdateTime (facultatif) = n'applique la mise à jour QUE si l'updateTime du
 * document correspond (précondition atomique → un seul gagnant en cas de course).
 * Renvoie httpCode.
 */
function fsPatch($path, $fields, $token, $maskFields = null, $precondUpdateTime = null) {
  $url = fsBaseUrl() . $path;
  $q = [];
  if (is_array($maskFields)) foreach ($maskFields as $f) $q[] = 'updateMask.fieldPaths=' . rawurlencode($f);
  if ($precondUpdateTime) $q[] = 'currentDocument.updateTime=' . rawurlencode($precondUpdateTime);
  if ($q) $url .= '?' . implode('&', $q);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['fields' => $fields]),
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $res === false ? 0 : $code;
}

// L'encodage/décodage des valeurs typées Firestore + le tranchage (sliceDevoirs,
// sliceCours) vivent dans mapo-lien-lib.php (requis en tête) — logique pure, testée.
