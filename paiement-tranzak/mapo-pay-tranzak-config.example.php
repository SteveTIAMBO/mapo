<?php
/**
 * MAPO — Configuration Tranzak (MODELE).
 *
 * COPIER ce fichier en « mapo-pay-tranzak-config.php » (sans .example),
 * remplir les valeurs, et le deposer dans public_html/mapo/.
 *
 * NE JAMAIS committer le vrai fichier de config (il contient des secrets).
 * Le proteger via .htaccess comme mapo-pay-config.php :
 *   <Files "mapo-pay-tranzak-config.php">
 *     Require all denied
 *   </Files>
 */

// Identifiants de l'application Tranzak (portail https://developer.tranzak.me).
// Sandbox : appKey prefixe SAND_ ; Production : prefixe PROD_.
define('TRANZAK_APP_ID',  'A_REMPLIR_appId');
define('TRANZAK_APP_KEY', 'A_REMPLIR_appKey'); // ex sandbox : SAND_XXXXXXXXXXXXXXXX

// 'SANDBOX' (bac a sable) ou 'PRODUCTION'.
define('TRANZAK_MODE', 'SANDBOX');

// Cle pre-partagee du webhook (facultative ; a definir aussi sur le portail).
define('TRANZAK_WEBHOOK_KEY', '');

// Projet Firebase pour verifier le jeton de l'appelant (meme valeur que CinetPay).
define('FIREBASE_PROJECT', 'A_REMPLIR_firebase_project_id');

// Repli demo : true = autorise les appels sans jeton Firebase (parcours simule).
// Mettre false en production reelle.
define('PAY_DEMO_OPEN', true);

// Limite d'appels init par IP et par heure.
define('PAY_HOURLY_LIMIT', 60);
