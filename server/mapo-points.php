<?php
/**
 * MAPO+ — Registre des POINTS D'EFFORT (source de vérité).
 *
 * POURQUOI CE FICHIER EXISTE
 * Les points étaient calculés et stockés par le NAVIGATEUR. Tant qu'ils ne
 * servaient qu'à un classement d'honneur, c'était acceptable. À partir du
 * moment où ils s'échangent contre des tokens — qui ont un coût réel — un
 * total forgeable devient un vol. On ne peut pas demander au client de compter
 * ce qu'on va lui payer.
 *
 * CE QUE LE SERVEUR NE CROIT PAS
 *   - le total de points (il le tient lui-même) ;
 *   - la série de jours (il la déduit de SES dates, pas de celles du client) ;
 *   - le nombre de séances du jour (il les compte, et les plafonne) ;
 *   - la famille déclarée (il recalcule l'uid attendu et jette si ça ne colle
 *     pas — même garde que mapo-ia.php).
 *
 * Ce qu'il accepte du client : « une séance vient de se terminer », et la
 * meilleure suite de bonnes réponses. Cette dernière est bornée, et ne pèse
 * qu'un cinquième d'une séance : la truquer ne rapporte pratiquement rien.
 *
 *   POST { action: 'seance',    data: { meilleureSerie, palierFranchi } }
 *   POST { action: 'etat' }
 *   POST { action: 'convertir' }
 *
 * Registre : mapo-points.json — protégé par le .htaccess (^mapo-.*\.json$).
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

// ── Barème. Doit rester le miroir de src/utils/pointsEffort.js ─────────────
// Le client garde le même calcul pour l'affichage immédiat (et hors ligne) ;
// c'est CE fichier qui fait foi. Un test compare les deux barèmes.
const MP_POINTS_REVISION      = 10;
const MP_POINTS_PAR_JOUR      = 5;
const MP_MAX_JOURS_SERIE      = 7;
const MP_POINTS_PAR_COMBO     = 2;
const MP_MAX_POINTS_COMBO     = 20;
const MP_POINTS_PALIER        = 50;

/** Séances comptées par jour. Au-delà, on paierait l'acharnement d'un script,
 *  pas le travail d'un élève. Six séances en un jour, c'est déjà beaucoup. */
const MP_MAX_SEANCES_JOUR     = 6;

// ── Conversion points → tokens (arbitrage Steve, 16/08) ────────────────────
// 500 points ≈ une semaine et demie de travail régulier. 3 000 tokens = un
// quiz. Le plafond mensuel est la vraie sécurité : il ne mord que sur
// l'apprenant QUOTIDIEN (~2 000 points/mois), pas sur l'élève régulier, qui
// convertit une fois. Douze mille tokens par mois, c'est +50 % de l'offre
// gratuite et dix fois moins qu'Essentiel : on récompense sans concurrencer
// l'abonnement.
const MP_COUT_CONVERSION      = 500;
const MP_TOKENS_PAR_CONVERSION = 3000;
const MP_MAX_CONVERSIONS_MOIS = 4;

/** Palier de bons partenaires. Aucun partenaire n'est signé : on ENREGISTRE
 *  l'éligibilité, on ne promet aucun bon. Promettre un avantage qu'on ne peut
 *  pas livrer, à des enfants, se paierait cher. */
const MP_SEUIL_BON_PARTENAIRE = 1500;

function mp_path() { return __DIR__ . '/mapo-points.json'; }
function mp_semaine() { return gmdate('oW'); }   // semaine ISO, comme les ligues
function mp_mois()    { return gmdate('Ym'); }
function mp_jour()    { return gmdate('Y-m-d'); }

/** Entrée neuve, ou remise à zéro des compteurs dont la période a tourné. */
function mp_normalize($e) {
  if (!is_array($e)) $e = [];
  $e += ['semaine' => '', 'points' => 0, 'serieDernier' => '', 'serieJours' => 0,
         'meilleureSerie' => 0, 'jour' => '', 'seancesJour' => 0,
         'mois' => '', 'conversionsMois' => 0, 'totalCumule' => 0, 'bonDemande' => ''];
  if ($e['semaine'] !== mp_semaine()) { $e['semaine'] = mp_semaine(); $e['points'] = 0; }
  if ($e['mois'] !== mp_mois())       { $e['mois'] = mp_mois(); $e['conversionsMois'] = 0; }
  if ($e['jour'] !== mp_jour())       { $e['jour'] = mp_jour(); $e['seancesJour'] = 0; }
  return $e;
}

/** Lecture-modif-écriture verrouillée. Comme mc_mutate.
 *  ⚠️ NE JAMAIS appeler ici une fonction qui reverrouille le même fichier :
 *  c'est exactement le blocage qui a fait « tourner l'IA dans le vide ». */
function mp_mutate($uid, $fn) {
  $fp = fopen(mp_path(), 'c+');
  if (!$fp) return null;
  flock($fp, LOCK_EX);
  $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
  $e = $fn(mp_normalize($map[$uid] ?? null));
  $map[$uid] = $e;
  ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
  flock($fp, LOCK_UN); fclose($fp);
  return $e;
}

function mp_read($uid) {
  $j = file_exists(mp_path()) ? json_decode(@file_get_contents(mp_path()), true) : [];
  return mp_normalize(is_array($j) ? ($j[$uid] ?? null) : null);
}

/**
 * Série de jours, calculée sur les dates DU SERVEUR.
 * Hier → on continue. Aujourd'hui → on ne recompte pas. Plus vieux → on repart
 * à 1. Le client ne peut ni allonger sa série, ni la sauver en changeant
 * l'heure de son téléphone.
 */
function mp_serie($dernier, $jours) {
  $auj = mp_jour();
  if ($dernier === $auj) return max(1, (int) $jours);
  $hier = gmdate('Y-m-d', strtotime($auj . ' -1 day'));
  return $dernier === $hier ? ((int) $jours) + 1 : 1;
}

/** Barème, miroir de pointsSeance() côté client. */
function mp_pointsSeance($serieJours, $meilleureSerie, $palierFranchi) {
  $detail = [['libelle' => 'Révision terminée', 'points' => MP_POINTS_REVISION]];
  $j = max(0, min(MP_MAX_JOURS_SERIE, (int) $serieJours));
  if ($j > 1) $detail[] = ['libelle' => $j . " jours d'affilée", 'points' => $j * MP_POINTS_PAR_JOUR];
  $combo = max(0, (int) $meilleureSerie - 2);
  if ($combo > 0) {
    $detail[] = ['libelle' => 'Série de ' . (int) $meilleureSerie . ' bonnes réponses',
                 'points' => min(MP_MAX_POINTS_COMBO, $combo * MP_POINTS_PAR_COMBO)];
  }
  if ($palierFranchi) $detail[] = ['libelle' => 'Programme de l’année validé', 'points' => MP_POINTS_PALIER];
  // `$ligne` et non `$d` : dans ce fichier `$d` désigne les données ENVOYÉES
  // PAR LE CLIENT. Réutiliser le nom ici brouillait la seule distinction qui
  // compte — ce que le serveur calcule, et ce qu'il reçoit sans le croire.
  $total = 0; foreach ($detail as $ligne) $total += $ligne['points'];
  return ['total' => $total, 'detail' => $detail];
}

/** Vue renvoyée au client. Une seule forme, pour les trois actions. */
function mp_vue($e) {
  $reste = MP_MAX_CONVERSIONS_MOIS - (int) $e['conversionsMois'];
  return [
    'points'          => (int) $e['points'],
    'totalCumule'     => (int) $e['totalCumule'],
    'serieJours'      => (int) $e['serieJours'],
    'coutConversion'  => MP_COUT_CONVERSION,
    'tokensParConversion' => MP_TOKENS_PAR_CONVERSION,
    'conversionsRestantes' => max(0, $reste),
    'peutConvertir'   => ((int) $e['points'] >= MP_COUT_CONVERSION) && $reste > 0,
    'seuilBon'        => MP_SEUIL_BON_PARTENAIRE,
    'bonEligible'     => (int) $e['totalCumule'] >= MP_SEUIL_BON_PARTENAIRE,
    'bonDemande'      => (string) $e['bonDemande'],
  ];
}

// ── Requête ────────────────────────────────────────────────────────────────
$body   = json_decode(file_get_contents('php://input'), true);
$action = is_array($body) ? ($body['action'] ?? 'etat') : 'etat';
$uid    = verifyFirebaseToken();
if (!$uid) { echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }

// Famille : mêmes vérifications qu'ailleurs. On recalcule l'uid attendu à
// partir de la déclaration ; s'il ne désigne pas l'appelant, on la jette.
// Les tokens gagnés vont au POT DE LA FAMILLE : un mineur n'a pas de jauge à
// lui, il hérite de celle de son parent. C'est la règle du produit, et la
// respecter ici évite de créer une deuxième économie parallèle.
$uidFamille = '';
$fam = is_array($body['famille'] ?? null) ? $body['famille'] : null;
if ($fam) {
  $o = (string) ($fam['ownerUid'] ?? ''); $i = (string) ($fam['enfantId'] ?? '');
  if ($o !== '' && $i !== '' && hash_equals('enf_' . substr(hash('sha256', $o . '|' . $i), 0, 24), $uid)) {
    $uidFamille = $o;
  }
}

if ($action === 'etat') {
  echo json_encode(['ok' => true] + mp_vue(mp_read($uid))); exit;
}

if ($action === 'seance') {
  $d = is_array($body['data'] ?? null) ? $body['data'] : [];
  $meilleureSerie = max(0, min(50, (int) ($d['meilleureSerie'] ?? 0))); // borné : entrée client
  $palier = !empty($d['palierFranchi']);
  $gain = null; $refus = '';

  $e = mp_mutate($uid, function ($e) use ($meilleureSerie, $palier, &$gain, &$refus) {
    if ((int) $e['seancesJour'] >= MP_MAX_SEANCES_JOUR) { $refus = 'plafond_journalier'; return $e; }
    $serie = mp_serie((string) $e['serieDernier'], (int) $e['serieJours']);
    $gain = mp_pointsSeance($serie, $meilleureSerie, $palier);
    $e['serieDernier']  = mp_jour();
    $e['serieJours']    = $serie;
    $e['seancesJour']   = (int) $e['seancesJour'] + 1;
    $e['points']        = (int) $e['points'] + $gain['total'];
    $e['totalCumule']   = (int) $e['totalCumule'] + $gain['total'];
    return $e;
  });

  if ($refus !== '') {
    // On le DIT. Un plafond silencieux se lit comme une panne : l'élève voit
    // sa révision comptée nulle part et croit que l'app l'a perdue.
    echo json_encode(['ok' => true, 'compte' => false, 'raison' => $refus] + mp_vue($e)); exit;
  }
  echo json_encode(['ok' => true, 'compte' => true, 'gain' => $gain] + mp_vue($e)); exit;
}

if ($action === 'convertir') {
  $fait = false; $refus = '';
  $e = mp_mutate($uid, function ($e) use (&$fait, &$refus) {
    if ((int) $e['conversionsMois'] >= MP_MAX_CONVERSIONS_MOIS) { $refus = 'plafond_mensuel'; return $e; }
    if ((int) $e['points'] < MP_COUT_CONVERSION) { $refus = 'points_insuffisants'; return $e; }
    $e['points'] = (int) $e['points'] - MP_COUT_CONVERSION;
    $e['conversionsMois'] = (int) $e['conversionsMois'] + 1;
    $fait = true;
    return $e;
  });
  if (!$fait) { echo json_encode(['ok' => false, 'error' => $refus] + mp_vue($e)); exit; }

  // Crédit APRÈS le débit des points, et HORS du verrou ci-dessus : mc_grantCredits
  // verrouille un AUTRE fichier, mais l'imbrication de deux verrous est la
  // recette d'un blocage. On garde les deux sections séparées.
  mc_grantCredits($uidFamille !== '' ? $uidFamille : $uid, MP_TOKENS_PAR_CONVERSION);
  echo json_encode(['ok' => true, 'tokens' => MP_TOKENS_PAR_CONVERSION] + mp_vue($e)); exit;
}

if ($action === 'bon') {
  // Aucun partenaire n'est signé. On enregistre l'éligibilité — ce qui donne
  // un chiffre réel à présenter en négociation — sans rien promettre.
  $e = mp_mutate($uid, function ($e) {
    if ((int) $e['totalCumule'] >= MP_SEUIL_BON_PARTENAIRE && $e['bonDemande'] === '') {
      $e['bonDemande'] = gmdate('c');
    }
    return $e;
  });
  echo json_encode(['ok' => true] + mp_vue($e)); exit;
}

echo json_encode(['ok' => false, 'error' => 'action_inconnue']);

/** Vérification du jeton Firebase (RS256 + certificats Google, cache 1 h). */
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
