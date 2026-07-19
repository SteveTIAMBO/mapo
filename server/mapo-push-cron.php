<?php
/**
 * MAPO+ — Rappel de révision QUOTIDIEN (push web).
 *
 * Déclenché une fois par jour par une tâche CRON cPanel. Lit le registre des
 * abonnements (mapo-push-subs.json, alimenté par l'inscription côté client) et
 * envoie à chacun le rappel du jour. Les abonnements expirés (404/410) sont
 * retirés du registre.
 *
 * Déclenchement (au choix) :
 *   - CLI (recommandé) :  php /home/.../mapo/mapo-push-cron.php
 *   - HTTP :              curl "https://miapo.app-edufrem.com/mapo-push-cron.php?key=SECRET"
 * En HTTP, ?key doit valoir $PUSH_CRON_SECRET (mapo-push-config.php).
 *
 * Pas de base de données ni de compte de service : le registre est un simple
 * fichier JSON local. Suffisant au démarrage ; à migrer vers Firestore si le
 * volume l'exige (il faudra alors accorder au compte de service le rôle
 * « Utilisateur Cloud Datastore »).
 */

@set_time_limit(120);
$isCli = (PHP_SAPI === 'cli');
if (!$isCli) header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/mapo-push-config.php';
require __DIR__ . '/mapo-push-lib.php';

// ── Garde-fou : en HTTP, exiger le secret ────────────────────────────
if (!$isCli) {
  $given = $_GET['key'] ?? '';
  if (!isset($PUSH_CRON_SECRET) || $PUSH_CRON_SECRET === '' || !hash_equals($PUSH_CRON_SECRET, (string) $given)) {
    http_response_code(403); echo json_encode(['ok' => false, 'error' => 'forbidden']); exit;
  }
}

$subs = mp_subsLoad();
$payload = json_encode([
  'title' => 'MAPO+',
  'body'  => "C'est l'heure de réviser ! Ouvre MAPO+ pour ta séance du jour.",
  'url'   => '/parent/miapo',
], JSON_UNESCAPED_UNICODE);
$subject = $VAPID_SUBJECT ?? 'mailto:contact@edufrem.com';

$found = count($subs); $sent = 0; $purged = 0;
foreach ($subs as $sub) {
  try {
    $status = mp_sendWebPush($sub, $payload, $VAPID_PUBLIC, $VAPID_PRIVATE_PEM, $subject);
  } catch (Throwable $e) { $status = 0; }
  if ($status === 201 || $status === 200) {
    $sent++;
  } elseif ($status === 404 || $status === 410) {
    mp_subsRemove($sub['endpoint']); // abonnement mort → on ne réessaie plus
    $purged++;
  }
}

$out = ['ok' => true, 'abonnements' => $found, 'envoyes' => $sent, 'purges' => $purged];
echo $isCli ? (json_encode($out) . "\n") : json_encode($out);
