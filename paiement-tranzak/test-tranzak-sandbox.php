<?php
/**
 * MAPO — Test bout-en-bout de l'API Tranzak en SANDBOX.
 *
 * Verifie, sans toucher au front ni a la prod :
 *   1) authentification (POST /auth/token)
 *   2) creation d'une charge mobile money de test
 *   3) lecture du statut de la transaction
 *
 * UTILISATION (en ligne de commande) :
 *   TRANZAK_APP_ID=xxx TRANZAK_APP_KEY=SAND_xxx php test-tranzak-sandbox.php
 * ou, si mapo-pay-tranzak-config.php existe a cote, il est lu automatiquement.
 *
 * Numeros de test sandbox Tranzak : le portail fournit des numeros fictifs qui
 * simulent SUCCESSFUL / FAILED / PROCESSING. Adapter TEST_NUMBER ci-dessous au
 * numero de test « succes » indique dans ton espace sandbox.
 */

$BASE = 'https://sandbox.dsapi.tranzak.me';
$TEST_NUMBER = getenv('TRANZAK_TEST_NUMBER') ?: '237674000000'; // numero fictif « succes » (a confirmer sur le portail)

$appId  = getenv('TRANZAK_APP_ID')  ?: null;
$appKey = getenv('TRANZAK_APP_KEY') ?: null;
if ((!$appId || !$appKey) && file_exists(__DIR__ . '/mapo-pay-tranzak-config.php')) {
  require __DIR__ . '/mapo-pay-tranzak-config.php';
  $appId  = $appId  ?: (defined('TRANZAK_APP_ID')  ? TRANZAK_APP_ID  : null);
  $appKey = $appKey ?: (defined('TRANZAK_APP_KEY') ? TRANZAK_APP_KEY : null);
}
if (!$appId || !$appKey || strpos((string) $appId, 'A_REMPLIR') === 0) {
  fwrite(STDERR, "ERREUR : renseigne TRANZAK_APP_ID et TRANZAK_APP_KEY (sandbox, prefixe SAND_).\n");
  exit(1);
}

function http_json($url, $method, $token, $payload) {
  $headers = ['Content-Type: application/json', 'Accept: application/json'];
  if ($token) $headers[] = 'Authorization: Bearer ' . $token;
  $ch = curl_init($url);
  $opts = [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 8,
  ];
  if ($payload !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
  curl_setopt_array($ch, $opts);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  return [$code, json_decode($res, true), $err, $res];
}

echo "== 1) Authentification ==\n";
list($code, $auth, $err) = http_json($BASE . '/auth/token', 'POST', null, ['appId' => $appId, 'appKey' => $appKey]);
if ($err) { fwrite(STDERR, "cURL : $err\n"); exit(2); }
echo "HTTP $code\n";
$token = $auth['data']['token'] ?? null;
if (!$token) { fwrite(STDERR, "Echec auth : " . json_encode($auth) . "\n"); exit(3); }
echo "Token obtenu (scope=" . ($auth['data']['scope'] ?? '?') . ", expiresIn=" . ($auth['data']['expiresIn'] ?? '?') . "s)\n\n";

echo "== 2) Creation d'une charge mobile money de test ==\n";
$ref = 'TEST' . date('ymdHis');
$payload = [
  'amount' => 100,
  'currencyCode' => 'XAF',
  'description' => 'Test MAPO sandbox',
  'mchTransactionRef' => $ref,
  'mobileWalletNumber' => $TEST_NUMBER,
];
list($code, $charge) = http_json($BASE . '/xp021/v1/request/create-mobile-wallet-charge', 'POST', $token, $payload);
echo "HTTP $code\n" . json_encode($charge, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
$requestId = $charge['data']['requestId'] ?? null;
if (!$requestId) { fwrite(STDERR, "Pas de requestId : verifie le scope collections et le numero de test.\n"); exit(4); }
echo "requestId = $requestId\n\n";

echo "== 3) Lecture du statut (3 tentatives) ==\n";
for ($i = 1; $i <= 3; $i++) {
  sleep(2);
  list($code, $det) = http_json($BASE . '/xp021/v1/request/details?requestId=' . urlencode($requestId), 'GET', $token, null);
  $st = $det['data']['status'] ?? ($det['data']['transactionStatus'] ?? '?');
  echo "Tentative $i : HTTP $code, status = $st\n";
  if (in_array(strtoupper((string) $st), ['SUCCESSFUL', 'FAILED', 'CANCELLED'], true)) break;
}
echo "\nDetail final :\n" . json_encode($det ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
echo "\nOK : le bout-en-bout sandbox repond. Note le champ 'fee' pour estimer la commission reelle.\n";
