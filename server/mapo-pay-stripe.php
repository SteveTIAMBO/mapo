<?php
/**
 * MAPO+ — Adaptateur d'encaissement Stripe (SQUELETTE, familles d'Europe, EUR).
 *
 * Même rôle que mapo-pay-tranzak.php mais pour les cartes européennes via Stripe
 * Checkout (page hébergée par Stripe). Le front (usePaiementStore.initStripe)
 * appelle ce proxy même-domaine ; on crée une session Checkout et on renvoie son
 * URL. La remise de crédits/offre se fait CÔTÉ SERVEUR à la confirmation (webhook
 * Stripe OU re-vérification de la session via `check`) → un utilisateur ne peut
 * pas s'auto-attribuer une offre.
 *
 * Actions (POST JSON, champ "action") :
 *   - init  : crée une session Checkout → { ok, mode, transaction_id, payment_url }
 *   - check : relit la session (source de vérité) → { ok, status: ACCEPTED|PENDING|REFUSED, granted }
 *
 * Webhook Stripe (POST sans "action", type=checkout.session.completed) : accuse
 * réception 200 ; la remise réelle passe par un `check` serveur (idempotent).
 *
 * Installation : déposer dans public_html/mapo/ avec mapo-pay-stripe-config.php
 * (secret, hors git, chmod 600) définissant STRIPE_SECRET_KEY (sk_live_/sk_test_).
 * Tant que la clé n'est pas posée → { ok:false, error:'not_configured' } et le
 * front bascule sur le parcours démo. Aucune valeur secrète dans ce fichier.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(25);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$cfgPath = __DIR__ . '/mapo-pay-stripe-config.php';
if (file_exists($cfgPath)) require $cfgPath;
require_once __DIR__ . '/mapo-offres-data.php';  // montant attendu = source serveur (anti-triche)
require_once __DIR__ . '/mapo-credits-lib.php';  // remise d'offre après paiement
require_once __DIR__ . '/mapo-invoices-lib.php'; // enregistrement de la facture/reçu
$SK = defined('STRIPE_SECRET_KEY') ? (string) STRIPE_SECRET_KEY : '';
$configured = $SK !== '' && strpos($SK, 'sk_') === 0;

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) $body = [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

// ── Webhook Stripe (pas de champ "action") : accuse réception 200 ──────
if ($action === '') {
  http_response_code(200);
  echo json_encode(['ok' => true, 'received' => true]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

$uid = verifyFirebaseTokenStripe();
$demoOpen = defined('PAY_DEMO_OPEN') && PAY_DEMO_OPEN;
if (!$uid && !$demoOpen) {
  http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : init  (créer une session Checkout)
// ════════════════════════════════════════════════════════════════════
if ($action === 'init') {
  $offre = preg_replace('/[^a-z]/', '', strtolower((string) ($body['subscriptionOffer'] ?? '')));
  $pack = preg_replace('/[^a-z_]/', '', strtolower((string) ($body['creditPack'] ?? '')));
  $packData = $pack !== '' ? mapo_credit_pack($pack) : null;
  // Montant attendu = prix serveur de l'offre / du pack (on ne fait PAS confiance au front).
  $o = $offre !== '' ? mapo_offre($offre) : null;
  $eur = $packData ? (float) ($packData['prixEur'] ?? 0) : ($o ? (float) ($o['prixEur'] ?? 0) : (float) ($body['amount'] ?? 0));
  $cents = (int) round($eur * 100);
  if ($cents < 50) { // Stripe : minimum ~0,50 €
    http_response_code(400); echo json_encode(['ok' => false, 'error' => 'montant_invalide']); exit;
  }
  $desc = trim(mb_substr((string) ($body['description'] ?? 'Abonnement MAPO+'), 0, 120)) ?: 'Abonnement MAPO+';

  if (!$configured) { // pas de clé Stripe → parcours démo côté app
    echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
  }

  $base = stripeBaseUrl();
  $params = [
    'mode' => 'payment',
    'success_url' => $base . '/?paiement=ok&session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => $base . '/?paiement=annule',
    'client_reference_id' => $uid ?: 'demo',
    'line_items[0][quantity]' => 1,
    'line_items[0][price_data][currency]' => 'eur',
    'line_items[0][price_data][unit_amount]' => $cents,
    'line_items[0][price_data][product_data][name]' => $desc,
    'metadata[uid]' => $uid ?: '',
    'metadata[offre]' => $offre,
  ];
  $resp = stripeApi($SK, 'POST', '/v1/checkout/sessions', $params);
  if ($resp === null || empty($resp['id']) || empty($resp['url'])) {
    echo json_encode(['ok' => false, 'error' => 'stripe_init_echec', 'detail' => $resp['error']['message'] ?? null]); exit;
  }
  // Mémorise {session → uid + offre/pack} pour accorder APRÈS paiement (check).
  if ($uid) {
    if ($packData) mc_pendingSet($resp['id'], $uid, $pack, 'credits', (int) $packData['tokens']);
    elseif ($offre !== '') mc_pendingSet($resp['id'], $uid, $offre, 'tier');
  }
  echo json_encode([
    'ok' => true, 'mode' => (strpos($SK, 'sk_live_') === 0 ? 'live' : 'test'),
    'transaction_id' => $resp['id'], 'payment_url' => $resp['url'],
    'amount' => $eur, 'currency' => 'EUR',
  ]);
  exit;
}

// ════════════════════════════════════════════════════════════════════
// ACTION : check  (relire la session — source de vérité)
// ════════════════════════════════════════════════════════════════════
if ($action === 'check') {
  $sid = preg_replace('/[^A-Za-z0-9_]/', '', (string) ($body['transaction_id'] ?? ''));
  if ($sid === '') { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'transaction_manquante']); exit; }
  if (!$configured) { echo json_encode(['ok' => true, 'mode' => 'sim', 'status' => 'PENDING']); exit; }

  $resp = stripeApi($SK, 'GET', '/v1/checkout/sessions/' . $sid, null);
  if ($resp === null) { echo json_encode(['ok' => false, 'error' => 'stripe_injoignable']); exit; }
  $paid = ($resp['payment_status'] ?? '') === 'paid' || ($resp['status'] ?? '') === 'complete';
  if ($paid) {
    $granted = null;
    $pend = mc_pendingTake($sid);
    if ($pend && !empty($pend['uid'])) {
      $kind = $pend['kind'] ?? 'tier';
      if ($kind === 'credits') { mc_grantCredits($pend['uid'], (int) ($pend['tokens'] ?? 0)); $granted = 'credits'; }
      elseif (!empty($pend['offreId'])) { mc_grant($pend['uid'], $pend['offreId']); $granted = $pend['offreId']; }
      $pk = ($kind === 'credits') ? mapo_credit_pack($pend['offreId']) : null;
      $label = ($kind === 'credits')
        ? ('Recharge de crédits' . ($pk ? ' — ' . $pk['nom'] : ''))
        : ('Abonnement MAPO+ ' . (mapo_offre($pend['offreId'])['nom'] ?? ''));
      mi_record($pend['uid'], [
        'label' => $label,
        'montant' => isset($resp['amount_total']) ? $resp['amount_total'] / 100 : null,
        'devise' => 'EUR', 'moyen' => 'card', 'transaction' => $sid, 'type' => $kind,
      ]);
    }
    echo json_encode(['ok' => true, 'status' => 'ACCEPTED', 'granted' => $granted,
      'amount' => isset($resp['amount_total']) ? $resp['amount_total'] / 100 : null, 'currency' => 'EUR']);
  } elseif (($resp['status'] ?? '') === 'open') {
    echo json_encode(['ok' => true, 'status' => 'PENDING']);
  } else {
    echo json_encode(['ok' => true, 'status' => 'REFUSED', 'detail' => $resp['status'] ?? null]);
  }
  exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'action_inconnue']);
exit;

// ════════════════════════════════════════════════════════════════════
// Helpers Stripe
// ════════════════════════════════════════════════════════════════════

/** Appel API Stripe (form-encoded, Bearer clé secrète). */
function stripeApi($sk, $method, $path, $params = null) {
  $url = 'https://api.stripe.com' . $path;
  $ch = curl_init($url);
  $opts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $sk, 'Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_USERAGENT => 'MAPO-Stripe/0.1',
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 8,
  ];
  if ($params !== null && $method === 'POST') $opts[CURLOPT_POSTFIELDS] = http_build_query($params);
  curl_setopt_array($ch, $opts);
  $res = curl_exec($ch);
  curl_close($ch);
  if ($res === false) return null;
  $j = json_decode($res, true);
  return is_array($j) ? $j : null;
}

function stripeBaseUrl() {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  $scheme = $https ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
  return $scheme . '://' . $host . $dir;
}

/** Vérification du jeton Firebase (RS256). Retourne l'uid ou null. */
function verifyFirebaseTokenStripe() {
  if (!defined('FIREBASE_PROJECT')) define('FIREBASE_PROJECT', 'mapo-edufrem');
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
