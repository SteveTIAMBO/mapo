<?php
/**
 * MAPO+ — Configuration de l'envoi d'e-mails brandés (Brevo).
 *
 * COPIER ce fichier en `mapo-mail-config.php` (même dossier, sur le serveur)
 * puis remplir les valeurs. NE PAS committer le fichier rempli.
 * Le .htaccess doit interdire l'accès direct aux *-config.php (comme pour
 * mapo-notify-config.php / mapo-provision-config.php).
 *
 * IMPORTANT — quelle clé ?
 *   BREVO_API_KEY est une clé **API v3** Brevo : elle commence par `xkeysib-`.
 *   → app.brevo.com → « SMTP & API » → onglet **API Keys** → « Generate a new API key ».
 *   Ce N'EST PAS la clé SMTP (`xsmtpsib-…`), qui sert au relais SMTP de Firebase
 *   (déjà configurée ailleurs). Ici on passe par l'API HTTP de Brevo (plus fiable,
 *   même schéma que mapo-notify.php avec Twilio).
 */

// Clé API v3 Brevo (xkeysib-…). NE JAMAIS committer la vraie valeur.
define('BREVO_API_KEY', 'A_REMPLIR_xkeysib-...');

// Expéditeur (doit être un domaine authentifié dans Brevo — edufrem.com l'est déjà).
define('MAIL_FROM_EMAIL', 'contact@edufrem.com');
define('MAIL_FROM_NAME',  'MAPO+ · EDUFREM');
define('MAIL_REPLY_TO',   'contact@edufrem.com');

// Projet Firebase (audience du jeton, pour l'authentification de l'appelant).
define('FIREBASE_PROJECT', 'mapo-edufrem');

// Base de l'app (pour construire l'URL du bouton « Ouvrir mon espace »).
define('APP_BASE_URL', 'https://mapoplus.app-edufrem.com');
