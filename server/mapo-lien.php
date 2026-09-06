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

// Config (best-effort) : FIREBASE_PROJECT non secret → défaut si absent.
$cfg = __DIR__ . '/mapo-lien-config.php';
if (is_file($cfg)) require_once $cfg;
if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
if (!defined('SA_KEY_FILE')) define('SA_KEY_FILE', __DIR__ . '/mapo-sa-key.json');

// Bienvenue scolaire : ce que reçoit une famille invitée par son école.
// `illimite` est l'identifiant interne de l'offre Premium (cf. mapo-offres-data.php)
// — ne pas le renommer « premium » ici, ce nom n'existe pas côté offres.
// 90 jours plutôt que « 3 mois » : une durée en jours ne dépend pas du mois de
// l'inscription, donc deux familles inscrites en février et en juillet reçoivent
// exactement la même chose.
if (!defined('MAPO_BIENVENUE_OFFRE')) define('MAPO_BIENVENUE_OFFRE', 'illimite');
if (!defined('MAPO_BIENVENUE_JOURS')) define('MAPO_BIENVENUE_JOURS', 90);

// Logique pure (encode/décode Firestore + tranchage) — testée à part.
require_once __DIR__ . '/mapo-lien-lib.php';

// ── Diagnostic (public, sans donnée) : /mapo-lien.php?ping=1 ──────────
// Permet de vérifier d'un coup d'œil, dans le navigateur (en GET), si la clé de
// compte de service est bien en place et fonctionnelle. Ne renvoie AUCUNE donnée
// sensible (booléens de configuration seulement), jamais le contenu de la clé.
// IMPORTANT : placé AVANT le garde « POST uniquement » ci-dessous, sinon un GET
// navigateur serait rejeté (405) et ne joindrait jamais ce diagnostic.
if (($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') && (isset($_GET['ping']) || isset($_GET['diag']))) {
  $present = file_exists(SA_KEY_FILE);
  $readable = $present && is_readable(SA_KEY_FILE);
  $tokenOk = false; $err = null;
  if ($readable) { list($tk, $err) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore'); $tokenOk = !!$tk; }
  else if ($present) { $err = 'sa_key_non_lisible'; }
  else { $err = 'sa_key_absente'; }
  echo json_encode([
    'ok' => true,
    'service' => 'mapo-lien',
    'sa_key_attendue' => basename(SA_KEY_FILE),
    'dossier' => basename(__DIR__),
    'sa_key_presente' => $present,
    'sa_key_lisible' => $readable,
    'sa_token_ok' => $tokenOk,
    'projet' => FIREBASE_PROJECT,
    'pret' => ($present && $readable && $tokenOk),
    'detail' => $tokenOk ? null : $err,
  ]);
  exit;
}

// Toutes les VRAIES actions du pont exigent POST (le diagnostic GET est traité ci-dessus).
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'method_not_allowed']); exit; }

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $body['action'] ?? '';

// ════════════════════════════════════════════════════════════════════
//  APERÇU d'une invitation — SANS jeton, et SANS la consommer.
// ════════════════════════════════════════════════════════════════════
// Pourquoi avant l'authentification : la famille invitée par son école n'a pas
// encore de compte. Sans cet aperçu, elle arriverait sur un formulaire anonyme
// (« créez un compte »), sans savoir si le lien est le bon ni de quel enfant il
// s'agit — et devrait ressaisir ce que l'école connaît déjà.
//
// Ce qui est renvoyé est délibérément réduit : nom de l'école, PRÉNOM de
// l'élève, classe. Ni nom de famille, ni matricule, ni contact. Quelqu'un qui
// détient le code sait déjà tout cela ; personne d'autre n'apprend rien
// d'exploitable. Le code n'est PAS consommé : ouvrir le lien deux fois, ou le
// voir déplié par un aperçu WhatsApp, ne doit pas brûler l'invitation.
if ($action === 'apercu') {
  if (!rateLimitOk()) { http_response_code(429); echo json_encode(['error' => 'trop_de_tentatives']); exit; }
  $code = trim((string)($body['code'] ?? ''));
  if (!preg_match('/^([a-z0-9-]{2,40})~([A-Za-z0-9]{8,40})$/', $code, $m)) {
    http_response_code(400); echo json_encode(['error' => 'code_invalide']); exit;
  }
  list($tk, $tkErr) = getGoogleAccessToken('https://www.googleapis.com/auth/datastore');
  if (!$tk) { http_response_code(503); echo json_encode(['error' => 'admin_indisponible']); exit; }
  list($inv, $c) = fsGet("schools/{$m[1]}/mapoplus_invites/" . rawurlencode($code), $tk);
  if ($c !== 200 || !$inv) { http_response_code(404); echo json_encode(['error' => 'code_introuvable']); exit; }
  $f = fsDecodeFields($inv['fields'] ?? []);
  // Un code déjà utilisé ou périmé se DIT, avec son motif : « ce lien a déjà
  // servi » est actionnable, « code invalide » envoie la famille au support.
  $exp = (string)($f['expiresAt'] ?? '');
  $perime = $exp !== '' && ($t = strtotime($exp)) !== false && $t < time();
  // ⚠️ Ne RIEN ajouter d'identifiant ici : cette réponse est servie AVANT
  // l'authentification, à quiconque détient le code. Un enfant à nom unique
  // (registres du Nord-Cameroun) est traité en amont — l'école écrit son nom
  // unique dans `firstName` de l'invitation — précisément pour ne pas avoir à
  // lire `lastName` sur un point d'entrée public.
  echo json_encode(['ok' => true, 'apercu' => [
    'ecole' => (string)($f['ecole'] ?? ''),
    'prenom' => (string)($f['firstName'] ?? ''),
    'classe' => (string)($f['className'] ?? ''),
    'cycle' => (string)($f['cycle'] ?? ''),
    'pays' => (string)($f['pays'] ?? ''),
    'destinataire' => (string)($f['destinataire'] ?? 'parent'),
    'utilise' => !empty($f['used']),
    'perime' => $perime,
  ]]);
  exit;
}

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

  // ── Bienvenue scolaire : Premium offert 3 mois ────────────────────────
  //
  // ⚠️ Accordé ICI, côté serveur, et nulle part ailleurs. Un droit demandé par
  // le navigateur est un droit forgeable : c'est exactement la faille qui avait
  // permis d'acheter Premium pour 1 FCFA. Le seul fait qui l'autorise est
  // l'invitation de l'école, que nous venons de consommer de façon atomique.
  //
  // Aucun mécanisme de « retour au gratuit » n'est à écrire : passé l'échéance,
  // `mc_state()` rend l'offre Découverte de lui-même.
  $bienvenue = null;
  try {
    require_once __DIR__ . '/mapo-credits-lib.php';
    list($accorde, $jusquau) = mc_bienvenueEcole($uid, MAPO_BIENVENUE_OFFRE, MAPO_BIENVENUE_JOURS);
    $bienvenue = ['offre' => MAPO_BIENVENUE_OFFRE, 'accorde' => $accorde, 'jusquau' => $jusquau];
  } catch (Throwable $e) {
    // Le lien scolaire, lui, EST scellé. Échouer ici ne doit pas défaire un
    // rattachement réussi : la famille entre, avec l'offre Découverte.
    $bienvenue = ['offre' => MAPO_BIENVENUE_OFFRE, 'accorde' => false, 'erreur' => 'indisponible'];
  }

  echo json_encode(['ok' => true, 'lien' => [
    'schoolId' => $schoolId, 'eleveId' => $eleveId, 'className' => $className,
    'classId' => $classId, 'matricule' => $matricule,
    'firstName' => $firstName, 'lastName' => $lastName, 'ecole' => (string)($invF['ecole'] ?? ''),
    // Contexte de pré-remplissage du profil MAPO+ (cycle, pays, destinataire) :
    // c'est ce qui évite de redemander à la famille ce que l'école sait déjà.
    'cycle' => (string)($invF['cycle'] ?? ''), 'pays' => (string)($invF['pays'] ?? ''),
    'destinataire' => (string)($invF['destinataire'] ?? 'parent'),
  ], 'bienvenue' => $bienvenue]);
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

/**
 * EMPLOI DU TEMPS de la classe de l'élève lié.
 *
 * ⚠️ Le pont servait déjà cours, devoirs, notes, messages et périodes — mais
 * PAS l'emploi du temps, alors que l'ERP le détient. Un élève d'une école MAPO
 * photographiait donc une feuille que son établissement avait lui-même saisie,
 * et payait un appel IA pour la relire.
 *
 * Mêmes gardes que `cours` : lien vérifié, classe relue sur la FICHE ÉLÈVE (un
 * redoublement ou un changement de classe rendrait périmée celle du lien).
 */
if ($action === 'edt') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }

  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $saToken);
  if ($lkCode !== 200 || !$lk) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  $linkClass = (string)($lkF['className'] ?? '');
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $className = ($elCode === 200 && $el) ? (string)(fsDecodeFields($el['fields'] ?? [])['className'] ?? '') : '';
  if ($className === '') $className = $linkClass;
  if ($className === '') { http_response_code(422); echo json_encode(['error' => 'lien_incomplet']); exit; }

  list($doc, $dCode) = fsGet("schools/{$schoolId}/emploi-du-temps/data", $saToken);
  // ⚠️ Aucun emploi du temps saisi par l'école N'EST PAS une erreur : c'est le
  // cas de toutes celles qui n'ont pas encore fait la génération. On répond
  // `ok` avec une liste vide, et l'écran le DIT — un 404 ferait croire à une
  // panne du pont et enverrait l'élève rouvrir son appareil photo.
  if ($dCode !== 200 || !$doc) { echo json_encode(['ok' => true, 'className' => $className, 'creneaux' => []]); exit; }
  $data = fsDecodeFields($doc['fields'] ?? []);

  $out = sliceEdt($data, $className);
  echo json_encode(['ok' => true, 'className' => $className, 'creneaux' => $out]);
  exit;
}

/**
 * ABSENCES et RETARDS de l'élève lié.
 *
 * L'école fait l'appel dans l'ERP, et jusqu'ici cette information ne ressortait
 * nulle part côté famille : le parent relié voyait le bulletin de son enfant
 * mais pas ses absences. Tant qu'aucun canal SMS n'est en service, le pont est
 * le SEUL chemin par lequel une école MAPO peut le dire à une famille.
 *
 * Contrairement aux devoirs ou à l'emploi du temps, la donnée est ici propre à
 * l'élève et non à sa classe : on interroge donc `presences` par eleveId
 * (égalité simple → aucun index composite à créer), et on ne s'appuie pas sur
 * la classe. Un élève qui a changé de classe garde son historique.
 */
if ($action === 'absences') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }

  // Une école qui n'a pas encore fait l'appel N'EST PAS une erreur : liste vide,
  // et l'écran le dit (même parti pris que l'emploi du temps).
  list($rows) = fsRunQuery("schools/{$schoolId}", 'presences', 'eleveId', $eleveId, $saToken);
  $sliced = sliceAbsences($rows, $eleveId);
  echo json_encode(['ok' => true, 'className' => $ln['className'], 'absences' => $sliced['items'], 'resume' => $sliced['resume']]);
  exit;
}

/**
 * DISCIPLINE — incidents et sanctions de l'élève lié.
 *
 * Même modèle que les absences (requête par eleveId, pas par classe). Le
 * commentaire interne de la vie scolaire est retiré côté tranchage, pas ici :
 * voir sliceDiscipline() dans mapo-lien-lib.php, qui porte la justification.
 */
if ($action === 'discipline') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }

  list($rows) = fsRunQuery("schools/{$schoolId}", 'discipline', 'eleveId', $eleveId, $saToken);
  echo json_encode(['ok' => true, 'className' => $ln['className'], 'incidents' => sliceDiscipline($rows, $eleveId)]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Streaming d'un fichier de cours (PDF du prof) : autorisé PAR le pont, l'id
//  du fichier ne sort JAMAIS côté client. Sortie BINAIRE (pas JSON).
if ($action === 'cours-file') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  $coursId = trim((string)($body['coursId'] ?? ''));
  if ($eleveId === '' || $coursId === '') { http_response_code(400); echo json_encode(['error' => 'parametres_manquants']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  list($doc, $dCode) = fsGet("schools/{$schoolId}/config/cours", $saToken);
  if ($dCode !== 200 || !$doc) { http_response_code(404); echo json_encode(['error' => 'cours_introuvable']); exit; }
  $items = fsDecodeFields($doc['fields'] ?? [])['items'] ?? [];
  $found = null;
  foreach ((is_array($items) ? $items : []) as $c) { if (is_array($c) && (string)($c['id'] ?? '') === $coursId) { $found = $c; break; } }
  if (!$found) { http_response_code(404); echo json_encode(['error' => 'cours_introuvable']); exit; }
  // Même portée que sliceCours : cours/ressource de SA classe (ou toutes classes).
  $type = (string)($found['type'] ?? 'cours'); $cl = (string)($found['classe'] ?? '');
  if (($type !== 'cours' && $type !== 'ressource') || ($cl !== '' && $cl !== $ln['className'])) { http_response_code(403); echo json_encode(['error' => 'cours_hors_classe']); exit; }
  $fileId = preg_replace('/[^a-f0-9]/', '', (string)($found['fileId'] ?? ''));
  $ext = strtolower(preg_replace('/[^a-z0-9]/', '', (string)($found['fileExt'] ?? '')));
  if ($fileId === '') { http_response_code(404); echo json_encode(['error' => 'fichier_absent']); exit; }
  // Fichiers déposés par mapo-files.php dans le MÊME dossier (uploads/). On sert le
  // PDF (original ou converti) pour l'affichage in-app.
  $dir = __DIR__ . '/uploads';
  $path = $dir . '/' . $fileId . '.pdf';
  if (!is_file($path) && $ext !== '') $path = $dir . '/' . $fileId . '.' . $ext;
  if (!is_file($path)) { http_response_code(404); echo json_encode(['error' => 'fichier_absent']); exit; }
  $isPdf = strtolower(substr($path, -4)) === '.pdf';
  header('Content-Type: ' . ($isPdf ? 'application/pdf' : 'application/octet-stream'));
  header('Content-Disposition: inline; filename="cours.' . ($isPdf ? 'pdf' : $ext) . '"');
  header('Content-Length: ' . filesize($path));
  header('Cache-Control: private, max-age=300');
  readfile($path);
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Rendre un devoir EN LIGNE (isDigital) : écrit SA seule soumission.
if ($action === 'submit_devoir') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  $devoirId = trim((string)($body['devoirId'] ?? ''));
  if ($eleveId === '' || $devoirId === '') { http_response_code(400); echo json_encode(['error' => 'parametres_manquants']); exit; }
  $text = (string)($body['text'] ?? '');
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  list($doc, $dCode) = fsGet("schools/{$schoolId}/devoirs-data/data", $saToken);
  if ($dCode !== 200 || !$doc) { http_response_code(404); echo json_encode(['error' => 'devoir_introuvable']); exit; }
  $data = fsDecodeFields($doc['fields'] ?? []);
  $all = is_array($data['devoirs'] ?? null) ? $data['devoirs'] : [];
  $found = null;
  foreach ($all as $d) { if (is_array($d) && (string)($d['id'] ?? '') === $devoirId) { $found = $d; break; } }
  if (!$found) { http_response_code(404); echo json_encode(['error' => 'devoir_introuvable']); exit; }
  // Le devoir doit appartenir à SA classe courante et être « en ligne ».
  $dClass = (string)($found['className'] ?? ''); $dClassId = (string)($found['classId'] ?? '');
  $okClass = ($dClass !== '' && $dClass === $ln['className']) || ($dClassId !== '' && $ln['classId'] !== '' && $dClassId === $ln['classId']);
  if (!$okClass) { http_response_code(403); echo json_encode(['error' => 'devoir_hors_classe']); exit; }
  if (empty($found['isDigital'])) { http_response_code(400); echo json_encode(['error' => 'devoir_non_en_ligne']); exit; }
  // Écrit UNIQUEMENT sa soumission, en fusion ciblée (préserve une note déjà mise).
  $key = $devoirId . '_' . $eleveId;
  $now = gmdate('Y-m-d\TH:i:s\Z');
  $fields = fsEncodeFields(['submissions' => [$key => ['submittedAt' => $now, 'content' => $text, 'attachmentName' => '']]]);
  $q = '`' . str_replace('`', '', $key) . '`';
  $mask = ['submissions.' . $q . '.submittedAt', 'submissions.' . $q . '.content', 'submissions.' . $q . '.attachmentName'];
  $code = fsPatch("schools/{$schoolId}/devoirs-data/data", $fields, $saToken, $mask);
  if ($code >= 200 && $code < 300) echo json_encode(['ok' => true, 'submission' => ['submittedAt' => $now, 'text' => $text, 'grade' => null, 'feedback' => '']]);
  else { http_response_code(502); echo json_encode(['error' => 'rendu_echec', 'detail' => $code]); }
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Remontée du SUIVI MIAPO+ vers l'école (élève relié). L'apprenant pousse un
//  INSTANTANÉ de sa progression (Elo par matière) que ses enseignants pourront
//  consulter. Écrit UNIQUEMENT sous SON propre document, à SON école reliée
//  (garanti par bridgeLink) — même modèle de confiance que submit_devoir.
if ($action === 'push_suivi') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'parametres_manquants']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  // Assainit l'instantané : liste bornée, valeurs typées et clampées.
  $src = is_array($body['suivi'] ?? null) ? $body['suivi'] : [];
  $matieres = [];
  foreach (array_slice(array_values($src), 0, 40) as $m) {
    if (!is_array($m)) continue;
    $nom = trim((string)($m['matiere'] ?? ''));
    if ($nom === '') continue;
    $nom = function_exists('mb_substr') ? mb_substr($nom, 0, 60) : substr($nom, 0, 60);
    $elo = max(0, min(4000, (int)round((float)($m['elo'] ?? 1000))));
    $att = max(0, (int)($m['attempts'] ?? 0));
    $tend = max(-2000, min(2000, (int)round((float)($m['tendance'] ?? 0))));
    $base = (isset($m['base']) && $m['base'] !== null) ? max(0, min(4000, (int)round((float)$m['base']))) : null;
    $matieres[] = ['matiere' => $nom, 'elo' => $elo, 'attempts' => $att, 'tendance' => $tend, 'base' => $base];
  }
  if (!count($matieres)) { echo json_encode(['ok' => true, 'skipped' => 'vide']); exit; }
  $now = gmdate('Y-m-d\TH:i:s\Z');
  $fields = fsEncodeFields([
    'eleveId' => $eleveId, 'className' => $ln['className'],
    'firstName' => $ln['firstName'], 'lastName' => $ln['lastName'],
    'source' => 'miapo+', 'updatedAt' => $now, 'matieres' => $matieres,
  ]);
  $code = fsPatch("schools/{$schoolId}/miapo_suivi/" . rawurlencode($eleveId), $fields, $saToken);
  if ($code >= 200 && $code < 300) echo json_encode(['ok' => true, 'updatedAt' => $now, 'count' => count($matieres)]);
  else { http_response_code(502); echo json_encode(['error' => 'push_echec', 'detail' => $code]); }
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Destinataires possibles d'un message (services de l'école).
if ($action === 'destinataires') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '' || !bridgeLink($schoolId, $uid, $eleveId, $saToken)) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  list($rDoc, $rCode) = fsGet("schools/{$schoolId}", $saToken);
  $root = ($rCode === 200 && $rDoc) ? fsDecodeFields($rDoc['fields'] ?? []) : [];
  echo json_encode(['ok' => true, 'destinataires' => bridgeServices($root)]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Envoyer un message à l'école (apparaît dans la vraie messagerie MAPO).
if ($action === 'send_message') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  $text = trim((string)($body['text'] ?? ''));
  if ($eleveId === '' || $text === '') { http_response_code(400); echo json_encode(['error' => 'parametres_manquants']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  list($rDoc, $rCode) = fsGet("schools/{$schoolId}", $saToken);
  $root = ($rCode === 200 && $rDoc) ? fsDecodeFields($rDoc['fields'] ?? []) : [];
  $services = bridgeServices($root);
  $to = (string)($body['to'] ?? '');
  $svcKey = '';
  foreach ($services as $s) { if ($s['id'] === $to || $s['label'] === $to) { $svcKey = $s['id']; break; } }
  if ($svcKey === '') $svcKey = $services[0]['id'] ?? 'direction';
  $subject = trim((string)($body['subject'] ?? '')); if ($subject === '') $subject = 'Message';
  $threadId = trim((string)($body['threadId'] ?? ''));
  if ($threadId === '') $threadId = 'thread-mapoplus-' . substr(sha1($uid . $eleveId . microtime(true)), 0, 12);
  $now = gmdate('Y-m-d\TH:i:s\Z');
  $childName = trim($ln['firstName'] . ' ' . $ln['lastName']);
  $fields = fsEncodeFields([
    'threadId' => $threadId, 'parentMessageId' => null, 'type' => 'general',
    'subject' => $subject, 'body' => $text,
    'recipientType' => 'service', 'recipientValue' => $svcKey, 'recipientId' => null,
    'recipientName' => null, 'recipientRole' => null,
    'senderId' => $uid, 'senderName' => 'Parent · ' . ($childName !== '' ? $childName : 'MAPO+'), 'senderRole' => 'parent',
    'sentAt' => $now, 'readBy' => [$uid], 'pinned' => false, 'status' => 'sent',
    'parentCopyFor' => $eleveId,
  ]);
  $code = fsCreate("schools/{$schoolId}/messages", $fields, $saToken);
  if ($code >= 200 && $code < 300) echo json_encode(['ok' => true]);
  else { http_response_code(502); echo json_encode(['error' => 'envoi_echec', 'detail' => $code]); }
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Messagerie : messages reçus (école) + envoyés (moi) de CE lien uniquement.
if ($action === 'messages') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }
  $ln = bridgeLink($schoolId, $uid, $eleveId, $saToken);
  if (!$ln) { http_response_code(403); echo json_encode(['error' => 'non_relie']); exit; }
  $className = $ln['className'];
  list($docs) = fsList("schools/{$schoolId}/messages", $saToken, 500);
  $out = [];
  foreach ($docs as $doc) {
    $f = fsDecodeFields($doc['fields'] ?? []);
    if ((string)($f['status'] ?? '') !== 'sent') continue;
    $senderId = (string)($f['senderId'] ?? '');
    $rtype = (string)($f['recipientType'] ?? ''); $rval = (string)($f['recipientValue'] ?? '');
    $rid = (string)($f['recipientId'] ?? ''); $pcopy = (string)($f['parentCopyFor'] ?? '');
    $mine = ($senderId === $uid);
    // Ne servir QUE : mes envois, les diffusions (toute l'école / ma classe), un
    // message individuel qui m'est adressé, ou une copie liée À MON enfant.
    $forMe = $mine || $rtype === 'all' || ($rtype === 'class' && $rval === $className)
      || ($rtype === 'individual' && $rid === $uid) || ($pcopy !== '' && $pcopy === $eleveId);
    if (!$forMe) continue;
    $name = (string)($doc['name'] ?? ''); $id = $name !== '' ? substr($name, strrpos($name, '/') + 1) : uniqid();
    $readBy = is_array($f['readBy'] ?? null) ? $f['readBy'] : [];
    $out[] = [
      'id' => $id, 'threadId' => (string)($f['threadId'] ?? $id), 'subject' => (string)($f['subject'] ?? ''),
      'from' => $mine ? 'moi' : 'ecole',
      'author' => $mine ? 'Vous' : (string)($f['senderName'] ?? 'École'),
      'to' => $mine ? (string)($f['recipientName'] ?? $rval) : 'Vous',
      'at' => (string)($f['sentAt'] ?? ''), 'read' => in_array($uid, $readBy, true),
      'body' => (string)($f['body'] ?? ''),
    ];
  }
  usort($out, function ($a, $b) { return strcmp((string)$a['at'], (string)$b['at']); });
  echo json_encode(['ok' => true, 'messages' => $out]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
//  Bulletins : moments disponibles (signés) + bulletin d'une période.
//  Le bulletin n'est exposé QUE s'il a été validé/signé côté école (miroir de
//  ParentNotesView). Rang & moyennes de classe = nombres agrégés (aucune fuite).
if ($action === 'periodes' || $action === 'notes') {
  $schoolId = strtolower(trim((string)($body['schoolId'] ?? '')));
  if (!preg_match('/^[a-z0-9-]{2,40}$/', $schoolId)) { http_response_code(400); echo json_encode(['error' => 'ecole_invalide']); exit; }
  $eleveId = trim((string)($body['eleveId'] ?? ''));
  if ($eleveId === '') { http_response_code(400); echo json_encode(['error' => 'eleve_manquant']); exit; }

  list($ctx, $http, $errc) = loadBulletinContext($schoolId, $uid, $eleveId, $saToken);
  if (!$ctx) { http_response_code($http); echo json_encode(['error' => $errc]); exit; }

  $periodes = bl_availablePeriodes($ctx['sigs'], $ctx['notes'], $ctx['classId'], $eleveId, $ctx['subjects']);
  if ($action === 'periodes') { echo json_encode(['ok' => true, 'periodes' => $periodes]); exit; }

  // action « notes » : bulletin d'une période (défaut = 1re disponible).
  $periodeId = trim((string)($body['periodeId'] ?? ''));
  $avail = array_map(function ($p) { return $p['id']; }, $periodes);
  if ($periodeId === '' && count($avail)) $periodeId = $avail[0];
  if ($periodeId === '' || !in_array($periodeId, $avail, true)) { echo json_encode(['ok' => true, 'bulletin' => null]); exit; }

  // Appréciation du conseil (texte libre) + date de validation = signature de la période
  // (le trimestre parent pour une séquence).
  $sigPeriod = in_array($periodeId, ['S1','S2','S3','S4','S5','S6'], true) ? bl_trimOfSeq($periodeId) : $periodeId;
  $mentionText = $sigPeriod !== 'annual' && $sigPeriod !== '' ? (string)($ctx['mentions'][$ctx['classId'] . '_' . $sigPeriod . '_' . $eleveId] ?? '') : '';
  $sigKey = $ctx['classId'] . '_' . $sigPeriod . '_' . $eleveId;
  $dateVal = (isset($ctx['sigs'][$sigKey]) && is_array($ctx['sigs'][$sigKey])) ? (string)($ctx['sigs'][$sigKey]['signedAt'] ?? '') : '';

  $bulletin = bl_buildBulletin($ctx['notes'], $ctx['subjects'], $periodeId, [
    'classId' => $ctx['classId'], 'className' => $ctx['className'], 'eleveId' => $eleveId, 'matricule' => $ctx['matricule'],
    'classmateIds' => $ctx['classmateIds'], 'identity' => $ctx['identity'], 'thresholds' => $ctx['thresholds'],
    'mentionText' => $mentionText, 'dateValidation' => $dateVal,
  ]);
  echo json_encode(['ok' => true, 'bulletin' => $bulletin]);
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
//  Helpers : jeton Firebase, compte de service, Firestore REST
// ════════════════════════════════════════════════════════════════════
/**
 * Limiteur par IP, pour l'aperçu d'invitation qui est le SEUL point ouvert sans
 * jeton. Un code fait 8 caractères sur un alphabet de 31 (~8 × 10^11
 * combinaisons) : le devinage n'est pas la menace réaliste, l'usage abusif du
 * point d'entrée l'est. Fichier temporaire, volontairement rustique — la
 * précision n'a pas d'importance ici, la borne oui.
 */
function rateLimitOk() {
  $limit = defined('LIEN_HOURLY_LIMIT') ? (int) LIEN_HOURLY_LIMIT : 120;
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
  $file = sys_get_temp_dir() . '/mapo_lien_rl_' . md5($ip) . '.json';
  $now = time();
  $hits = [];
  if (file_exists($file)) {
    $hits = json_decode(@file_get_contents($file), true) ?: [];
    $hits = array_values(array_filter($hits, function ($t) use ($now) { return $t > $now - 3600; }));
  }
  if (count($hits) >= $limit) return false;
  $hits[] = $now;
  @file_put_contents($file, json_encode($hits));
  return true;
}

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
/** Liste (une page) les documents d'une (sous-)collection. Renvoie [documents[], httpCode]. */
function fsList($collectionPath, $token, $pageSize = 300) {
  $ch = curl_init(fsBaseUrl() . $collectionPath . '?pageSize=' . (int)$pageSize);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [[], 0];
  $j = json_decode($res, true);
  return [is_array($j['documents'] ?? null) ? $j['documents'] : [], $code];
}
/**
 * runQuery : liste les documents d'une sous-collection filtrés par UN champ = valeur
 * (égalité simple → pas d'index composite requis). Renvoie [ [docId => fields], httpCode ].
 * Ne sélectionne QUE $selectField (+ le nom) pour limiter la charge.
 */
function fsRunQuery($parentPath, $collectionId, $whereField, $whereValue, $token, $selectField = null) {
  $sq = [
    'from' => [['collectionId' => $collectionId]],
    'where' => ['fieldFilter' => ['field' => ['fieldPath' => $whereField], 'op' => 'EQUAL', 'value' => ['stringValue' => $whereValue]]],
  ];
  if ($selectField) $sq['select'] = ['fields' => [['fieldPath' => $selectField]]];
  $url = fsBaseUrl() . ($parentPath !== '' ? rtrim($parentPath, '/') . ':runQuery' : ':runQuery');
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['structuredQuery' => $sq]),
    CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return [[], 0];
  $rows = json_decode($res, true);
  $out = [];
  if (is_array($rows)) foreach ($rows as $r) {
    if (empty($r['document']['name'])) continue;
    $name = $r['document']['name'];
    $id = substr($name, strrpos($name, '/') + 1);
    $out[$id] = fsDecodeFields($r['document']['fields'] ?? []);
  }
  return [$out, $code];
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

/** Crée un document (id auto) dans une collection. Renvoie httpCode. */
function fsCreate($collectionPath, $fields, $token) {
  $ch = curl_init(fsBaseUrl() . $collectionPath);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['fields' => $fields]),
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $res === false ? 0 : $code;
}
/**
 * Vérifie le lien de confiance (uid__eleveId) et renvoie le contexte élève
 * { className, classId, firstName, lastName, matricule } ou null si non relié.
 * classId n'est retenu (snapshot) QUE si la classe courante n'a pas changé.
 */
function bridgeLink($schoolId, $uid, $eleveId, $saToken) {
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $saToken);
  if ($lkCode !== 200 || !$lk) return null;
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $elF = ($elCode === 200 && $el) ? fsDecodeFields($el['fields'] ?? []) : [];
  $className = (string)($elF['className'] ?? ''); if ($className === '') $className = (string)($lkF['className'] ?? '');
  $classId = ($className === (string)($lkF['className'] ?? '')) ? (string)($lkF['classId'] ?? '') : '';
  return [
    'className' => $className, 'classId' => $classId,
    'firstName' => (string)($elF['firstName'] ?? ''), 'lastName' => (string)($elF['lastName'] ?? ''),
    'matricule' => (string)($elF['matricule'] ?? ($lkF['matricule'] ?? '')),
  ];
}
/** Services de messagerie de l'école (doc racine `services`, sinon défauts MAPO). */
function bridgeServices($root) {
  $out = [];
  $svc = is_array($root['services'] ?? null) ? $root['services'] : null;
  if ($svc) { foreach ($svc as $s) { if (!is_array($s)) continue; $k = (string)($s['key'] ?? ''); if ($k === '') continue; $out[] = ['id' => $k, 'type' => 'service', 'label' => (string)($s['label'] ?? $k)]; } }
  if (!count($out)) {
    foreach ([['direction','Direction'],['pedagogie','Pédagogie'],['comptabilite','Comptabilité'],['secretariat','Secrétariat'],['discipline','Vie scolaire / Discipline']] as $d)
      $out[] = ['id' => $d[0], 'type' => 'service', 'label' => $d[1]];
  }
  return $out;
}

/**
 * Charge le contexte bulletin d'un élève lié (après vérif du lien) : classe COURANTE,
 * classId/niveau/prof principal, matières, matriciel de notes + signatures + mentions,
 * identité école + seuils, et la liste des camarades inscrits (pour le rang).
 * Renvoie [ctx|null, httpCode, errorCode]. Les données brutes restent internes.
 */
function loadBulletinContext($schoolId, $uid, $eleveId, $saToken) {
  list($lk, $lkCode) = fsGet("schools/{$schoolId}/liens_mapoplus/" . rawurlencode($uid . '__' . $eleveId), $saToken);
  if ($lkCode !== 200 || !$lk) return [null, 403, 'non_relie'];
  $lkF = fsDecodeFields($lk['fields'] ?? []);
  $linkClass = (string)($lkF['className'] ?? '');
  $linkClassId = (string)($lkF['classId'] ?? '');
  $matricule = (string)($lkF['matricule'] ?? '');
  list($el, $elCode) = fsGet("schools/{$schoolId}/eleves/" . rawurlencode($eleveId), $saToken);
  $elF = ($elCode === 200 && $el) ? fsDecodeFields($el['fields'] ?? []) : [];
  $className = (string)($elF['className'] ?? ''); if ($className === '') $className = $linkClass;
  if ($className === '') return [null, 422, 'lien_incomplet'];
  if ($matricule === '') $matricule = (string)($elF['matricule'] ?? '');
  $firstName = (string)($elF['firstName'] ?? ''); $lastName = (string)($elF['lastName'] ?? '');
  // Classes → classId, niveau, prof principal (match par nom).
  list($classes) = fsList("schools/{$schoolId}/classes", $saToken);
  $classId = ''; $level = ''; $profP = '';
  foreach ($classes as $c) {
    $cf = fsDecodeFields($c['fields'] ?? []);
    if ((string)($cf['name'] ?? '') === $className) { $classId = (string)($cf['id'] ?? ''); $level = (string)($cf['level'] ?? ''); $profP = (string)($cf['homeroomTeacher'] ?? ''); break; }
  }
  if ($classId === '') $classId = ($className === $linkClass) ? $linkClassId : '';
  if ($classId === '') return [null, 422, 'classe_introuvable'];
  list($nDoc, $nCode) = fsGet("schools/{$schoolId}/notes/data", $saToken);
  $nData = ($nCode === 200 && $nDoc) ? fsDecodeFields($nDoc['fields'] ?? []) : [];
  $notes = is_array($nData['notes'] ?? null) ? $nData['notes'] : [];
  $sigs = is_array($nData['dirSignatures'] ?? null) ? $nData['dirSignatures'] : [];
  $mentions = is_array($nData['mentions'] ?? null) ? $nData['mentions'] : [];
  list($sDoc, $sCode) = fsGet("schools/{$schoolId}/config/subjects", $saToken);
  $subjectsConfig = [];
  if ($sCode === 200 && $sDoc) { $sf = fsDecodeFields($sDoc['fields'] ?? []); $subjectsConfig = is_array($sf['subjects'] ?? null) ? $sf['subjects'] : []; }
  $subjects = bl_subjectsForClass($subjectsConfig, $level, $notes, $classId);
  list($rDoc, $rCode) = fsGet("schools/{$schoolId}", $saToken);
  $root = ($rCode === 200 && $rDoc) ? fsDecodeFields($rDoc['fields'] ?? []) : [];
  $identity = [
    'ecole' => (string)($root['schoolName'] ?? ($root['name'] ?? '')),
    'quartier' => (string)($root['address'] ?? ($root['quartier'] ?? '')),
    'ville' => (string)($root['city'] ?? ''), 'tel' => (string)($root['phone'] ?? ''),
    'email' => (string)($root['email'] ?? ''), 'anneeScolaire' => (string)($root['academicYear'] ?? ''),
    'directeur' => (string)($root['directorName'] ?? ''), 'profPrincipal' => $profP,
  ];
  $thresholds = [
    'felicitations' => isset($root['mentionFelicitations']) ? (float)$root['mentionFelicitations'] : 16,
    'tableau' => isset($root['mentionTableau']) ? (float)$root['mentionTableau'] : 14,
    'encouragement' => isset($root['mentionEncouragement']) ? (float)$root['mentionEncouragement'] : 12,
  ];
  list($mates) = fsRunQuery("schools/{$schoolId}", 'eleves', 'className', $className, $saToken, 'status');
  $classmateIds = [];
  foreach ($mates as $id => $f) { $st = (string)($f['status'] ?? ''); if ($st === 'transfere' || $st === 'abandon') continue; $classmateIds[] = $id; }
  if (!in_array($eleveId, $classmateIds, true)) $classmateIds[] = $eleveId;
  return [[
    'className' => $className, 'classId' => $classId, 'level' => $level,
    'matricule' => $matricule, 'firstName' => $firstName, 'lastName' => $lastName,
    'notes' => $notes, 'sigs' => $sigs, 'mentions' => $mentions,
    'subjects' => $subjects, 'identity' => $identity, 'thresholds' => $thresholds,
    'classmateIds' => $classmateIds,
  ], 200, null];
}

// L'encodage/décodage des valeurs typées Firestore + le tranchage (sliceDevoirs,
// sliceCours) vivent dans mapo-lien-lib.php (requis en tête) — logique pure, testée.
