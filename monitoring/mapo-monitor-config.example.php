<?php
/**
 * MAPO Monitor — configuration (MODÈLE).
 * Copier en « mapo-monitor-config.php », remplir, déposer dans public_html/mapo/.
 * Protéger via .htaccess (comme les autres *-config.php) :
 *   <Files "mapo-monitor-config.php">
 *     Require all denied
 *   </Files>
 */

// Clé secrète pour déclencher le cron (?run=CLE) et voir le tableau de bord (?view=CLE).
define('MONITOR_SECRET', 'A_REMPLIR_une_longue_cle_aleatoire');

// E-mail qui reçoit les alertes quand une app tombe.
define('MONITOR_ALERT_EMAIL', 'contact@edufrem.com');

// Applications surveillées. spa=true → on vérifie aussi que le bundle JS existe
// (détection de l'écran blanc / déploiement cassé).
define('MONITOR_APPS', [
  ['name' => 'MAPO',   'url' => 'https://mapo.app-edufrem.com',        'spa' => true],
  ['name' => 'MIAPO+', 'url' => 'https://miapo.app-edufrem.com/miapo', 'spa' => true],
  ['name' => 'NOVA',   'url' => 'https://nova.app-edufrem.com',        'spa' => true],
  ['name' => 'ARIS',   'url' => 'https://aris.app-edufrem.com',        'spa' => true],
  ['name' => 'MOBI',   'url' => 'https://mobi.app-edufrem.com',        'spa' => true],
  ['name' => 'Site',   'url' => 'https://edufrem.com',                 'spa' => false],
  // Instances écoles (à ajouter au fur et à mesure) :
  // ['name' => 'Collège X', 'url' => 'https://collegex.app-edufrem.com', 'spa' => true],
]);
