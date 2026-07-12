<?php
/**
 * MAPO — Moniteur de supervision serveur (LWS). Aucun coût IA.
 *
 * Vérifie que les apps EDUFREM répondent (HTTP 200) et, pour les SPA (Vue),
 * que le bundle JS référencé dans la page existe encore (détecte l'écran blanc
 * dû à un déploiement cassé / chunk périmé).
 *
 * Deux modes :
 *   - CRON (toutes les 4h)  : GET ?run=CLE  → lance les vérifs, écrit l'état,
 *                             et envoie un e-mail d'alerte si une app tombe.
 *   - TABLEAU DE BORD        : GET ?view=CLE → affiche l'état (lecture du cache).
 *
 * Installation : déposer dans public_html/mapo/ avec mapo-monitor-config.php.
 * Cron cPanel (toutes les 4h) :
 *   curl -s "https://mapo.app-edufrem.com/mapo-monitor.php?run=VOTRE_CLE" >/dev/null
 *
 * Réutilisable pour les instances écoles : ajouter leurs URLs dans MONITOR_APPS.
 */

@date_default_timezone_set('Europe/Paris');

$cfgPath = __DIR__ . '/mapo-monitor-config.php';
if (file_exists($cfgPath)) require $cfgPath;

$SECRET = defined('MONITOR_SECRET') ? MONITOR_SECRET : '';
$ALERT  = defined('MONITOR_ALERT_EMAIL') ? MONITOR_ALERT_EMAIL : 'contact@edufrem.com';
$APPS   = defined('MONITOR_APPS') ? MONITOR_APPS : [
  ['name' => 'MAPO',   'url' => 'https://mapo.app-edufrem.com',        'spa' => true],
  ['name' => 'MIAPO+', 'url' => 'https://miapo.app-edufrem.com/miapo', 'spa' => true],
  ['name' => 'NOVA',   'url' => 'https://nova.app-edufrem.com',        'spa' => true],
  ['name' => 'ARIS',   'url' => 'https://aris.app-edufrem.com',        'spa' => true],
  ['name' => 'MOBI',   'url' => 'https://mobi.app-edufrem.com',        'spa' => true],
  ['name' => 'Site',   'url' => 'https://edufrem.com',                 'spa' => false],
];
$STATUS_FILE = sys_get_temp_dir() . '/mapo_monitor_status.json';

$key  = $_GET['run'] ?? ($_GET['view'] ?? '');
$auth = ($SECRET !== '' && is_string($key) && hash_equals($SECRET, $key));

function mhttp($url, $timeout = 12) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_USERAGENT => 'MAPO-Monitor/1.0',
  ]);
  $t0 = microtime(true); $body = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch);
  curl_close($ch);
  return ['code' => $code, 'ms' => (int) round((microtime(true) - $t0) * 1000), 'body' => $body, 'err' => $err];
}

function checkApp($app) {
  $r = mhttp($app['url']);
  $status = 'up'; $detail = '';
  if ($r['code'] !== 200) {
    $status = 'down';
    $detail = 'HTTP ' . $r['code'] . ($r['err'] ? ' (' . $r['err'] . ')' : '');
  } elseif (!empty($app['spa'])) {
    // Le bundle JS référencé existe-t-il ? (sinon = écran blanc / chunk périmé)
    if (preg_match('#assets/[A-Za-z0-9_.\-]+\.js#', (string) $r['body'], $m)) {
      $origin = parse_url($app['url'], PHP_URL_SCHEME) . '://' . parse_url($app['url'], PHP_URL_HOST);
      $js = mhttp($origin . '/' . $m[0], 10);
      if ($js['code'] !== 200) {
        $status = 'degraded';
        $detail = 'bundle ' . $m[0] . ' → HTTP ' . $js['code'] . ' (déploiement cassé / écran blanc probable)';
      }
    } else {
      $status = 'degraded';
      $detail = 'aucun bundle JS trouvé dans la page';
    }
  }
  return ['name' => $app['name'], 'url' => $app['url'], 'status' => $status,
          'code' => $r['code'], 'ms' => $r['ms'], 'detail' => $detail, 'time' => date('c')];
}

function runChecks($APPS, $STATUS_FILE, $ALERT) {
  $results = array_map('checkApp', $APPS);
  $prev = [];
  if (file_exists($STATUS_FILE)) {
    $p = json_decode(@file_get_contents($STATUS_FILE), true);
    foreach (($p['apps'] ?? []) as $a) { $prev[$a['name']] = $a; }
  }
  $newlyDown = [];
  foreach ($results as $r) {
    if ($r['status'] !== 'up' && ($prev[$r['name']]['status'] ?? 'up') === 'up') { $newlyDown[] = $r; }
  }
  @file_put_contents($STATUS_FILE, json_encode(['ranAt' => date('c'), 'apps' => $results]));
  if ($newlyDown) {
    $subj = '[MAPO Monitor] ' . count($newlyDown) . ' app(s) en panne';
    $body = "Panne détectée le " . date('d/m/Y à H:i') . "\n\n";
    foreach ($newlyDown as $p) {
      $body .= "- {$p['name']} ({$p['url']}) : {$p['status']} — {$p['detail']} [HTTP {$p['code']}]\n";
    }
    $body .= "\nTableau de bord : ajoutez ?view=<clé> à l'URL du moniteur.";
    @mail($ALERT, $subj, $body, "From: monitor@edufrem.com\r\nContent-Type: text/plain; charset=utf-8");
  }
  return $results;
}

// ── Exécution ─────────────────────────────────────────────────────────
if (!$auth) { http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo "Accès restreint. Utilisez ?run=<clé> (cron) ou ?view=<clé> (tableau de bord)."; exit; }

$ran = isset($_GET['run']);
if ($ran) {
  $results = runChecks($APPS, $STATUS_FILE, $ALERT);
  $ranAt = date('c');
} else {
  $data = file_exists($STATUS_FILE) ? json_decode(@file_get_contents($STATUS_FILE), true) : null;
  $results = $data['apps'] ?? [];
  $ranAt = $data['ranAt'] ?? null;
}

// Réponse cron : JSON court (pas de HTML inutile)
if ($ran && (($_GET['format'] ?? '') === 'json' || (php_sapi_name() === 'cli'))) {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ranAt' => $ranAt, 'apps' => $results]); exit;
}

// ── Tableau de bord HTML ──────────────────────────────────────────────
$colors = ['up' => '#0E7C5A', 'degraded' => '#B45309', 'down' => '#DC2626'];
$labels = ['up' => 'En ligne', 'degraded' => 'Dégradé', 'down' => 'Hors ligne'];
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Supervision EDUFREM</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: #f4f6fb; color: #1a1d1f; margin: 0; padding: 32px 16px; }
  .wrap { max-width: 820px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 22px; }
  .card { background: #fff; border: 1px solid rgba(20,32,64,.08); border-radius: 14px; padding: 16px 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .name { font-weight: 700; font-size: 15px; }
  .url { color: #6b7280; font-size: 12.5px; }
  .meta { margin-left: auto; text-align: right; }
  .st { font-weight: 700; font-size: 13px; }
  .ms { color: #9aa2b1; font-size: 12px; }
  .detail { color: #B45309; font-size: 12px; margin-top: 3px; }
  .foot { color: #9aa2b1; font-size: 12px; margin-top: 18px; text-align: center; }
</style></head><body><div class="wrap">
  <h1>Supervision EDUFREM</h1>
  <div class="sub">Dernière vérification : <?= $ranAt ? date('d/m/Y à H:i', strtotime($ranAt)) : 'jamais (lancez le cron)' ?></div>
  <?php if (!$results): ?><div class="card">Aucune donnée. Lancez une vérification : <code>?run=&lt;clé&gt;</code></div><?php endif; ?>
  <?php foreach ($results as $r): $c = $colors[$r['status']] ?? '#9aa2b1'; ?>
    <div class="card">
      <span class="dot" style="background: <?= $c ?>"></span>
      <div>
        <div class="name"><?= htmlspecialchars($r['name']) ?></div>
        <div class="url"><?= htmlspecialchars($r['url']) ?></div>
        <?php if (!empty($r['detail'])): ?><div class="detail"><?= htmlspecialchars($r['detail']) ?></div><?php endif; ?>
      </div>
      <div class="meta">
        <div class="st" style="color: <?= $c ?>"><?= $labels[$r['status']] ?? $r['status'] ?></div>
        <div class="ms">HTTP <?= (int) $r['code'] ?> · <?= (int) $r['ms'] ?> ms</div>
      </div>
    </div>
  <?php endforeach; ?>
  <div class="foot">Moniteur serveur MAPO · relancé automatiquement par le cron cPanel toutes les 4h.</div>
</div></body></html>
