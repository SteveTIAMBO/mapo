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
 *   - HTTP :              curl "https://mapoplus.app-edufrem.com/mapo-push-cron.php?key=SECRET"
 * En HTTP, ?key doit valoir $PUSH_CRON_SECRET (mapo-push-config.php).
 *
 * Pas de base de données ni de compte de service : le registre est un simple
 * fichier JSON local. Suffisant au démarrage ; à migrer vers Firestore si le
 * volume l'exige (il faudra alors accorder au compte de service le rôle
 * « Utilisateur Cloud Datastore »).
 */

@set_time_limit(120);
$isCli = (PHP_SAPI === 'cli');
if (!$isCli) {
  // Jamais mettre en cache la réponse : le déclenchement HTTP DOIT exécuter le PHP
  // à chaque appel (LWS met en cache les réponses .php par défaut).
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, no-cache, max-age=0');
}

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
// Le texte n'est plus commun à tous : chaque abonnement peut porter sa
// traduction. On le compose donc DANS la boucle, et non une fois pour toutes.
const CRON_RAPPEL_FR = "C'est l'heure de réviser ! Ouvre MAPO+ pour ta séance du jour.";
$subject = $VAPID_SUBJECT ?? 'mailto:contact@edufrem.com';

$found = count($subs); $sent = 0; $purged = 0;
foreach ($subs as $sub) {
  try {
    $payload = json_encode([
      'title' => 'MAPO+',
      'body'  => mp_texteBilingue($sub['textes'] ?? null, 'rappel', CRON_RAPPEL_FR),
      'url'   => '/parent/miapo',
    ], JSON_UNESCAPED_UNICODE);
    $status = mp_sendWebPush($sub, $payload, $VAPID_PUBLIC, $VAPID_PRIVATE_PEM, $subject);
  } catch (Throwable $e) { $status = 0; }
  if ($status === 201 || $status === 200) {
    $sent++;
  } elseif ($status === 404 || $status === 410) {
    mp_subsRemove($sub['endpoint']); // abonnement mort → on ne réessaie plus
    $purged++;
  }
}

// ── Relance WhatsApp au PARENT (rare, payante, opt-in) ──────────────────
// « X n'a pas révisé depuis N jours ». Réutilise les identifiants Twilio de
// mapo-notify-config.php (sans passer par mapo-notify.php, qui exige un compte).
$RELANCE_DAYS = 5;      // seuil d'inactivité
$THROTTLE_DAYS = 5;     // pas plus d'une relance tous les 5 jours
$relanceSent = 0;
$notifyCfg = __DIR__ . '/mapo-notify-config.php';
if (file_exists($notifyCfg)) {
  require $notifyCfg; // TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM
  $today = new DateTime('today');
  foreach (mp_relanceLoad() as $key => $r) {
    if (empty($r['optIn']) || empty($r['phone']) || empty($r['lastRevision'])) continue;
    $last = DateTime::createFromFormat('Y-m-d', $r['lastRevision']);
    if (!$last) continue;
    $days = (int) $today->diff($last)->format('%a');
    if ($days < $RELANCE_DAYS) continue;
    if (!empty($r['lastSentAt']) && (time() - (int) $r['lastSentAt']) < $THROTTLE_DAYS * 86400) continue;
    $name = $r['childName'] ?: 'votre enfant';
    $msg = "MAPO+ : {$name} n'a pas révisé depuis {$days} jours. Un petit encouragement l'aiderait à reprendre sa séance.";
    if (cron_sendWhatsApp($r['phone'], $msg)) {
      mp_relanceSet($key, ['lastSentAt' => time()]);
      $relanceSent++;
    }
  }
}

$out = ['ok' => true, 'abonnements' => $found, 'envoyes' => $sent, 'purges' => $purged, 'relances' => $relanceSent];
echo $isCli ? (json_encode($out) . "\n") : json_encode($out);

/** Envoi WhatsApp via Twilio (mêmes identifiants que mapo-notify.php). */
function cron_sendWhatsApp($to, $message) {
  if (!defined('TWILIO_SID') || !defined('TWILIO_TOKEN') || !defined('TWILIO_WHATSAPP_FROM')) return false;
  if (TWILIO_SID === '' || strpos(TWILIO_SID, 'A_REMPLIR') === 0) return false;
  $ch = curl_init('https://api.twilio.com/2010-04-01/Accounts/' . TWILIO_SID . '/Messages.json');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_USERPWD => TWILIO_SID . ':' . TWILIO_TOKEN,
    CURLOPT_POSTFIELDS => http_build_query([
      'From' => TWILIO_WHATSAPP_FROM,
      'To' => 'whatsapp:' . $to,
      'Body' => $message,
    ]),
    CURLOPT_TIMEOUT => 12,
    CURLOPT_CONNECTTIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $j = json_decode($res, true);
  return $code >= 200 && $code < 300 && !empty($j['sid']);
}
