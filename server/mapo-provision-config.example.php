<?php
// Garde anti-accès direct (le fichier ne doit être inclus que par mapo-provision.php)
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) { http_response_code(403); exit; }
/**
 * Configuration du provisioning MAPO — À COMPLÉTER PUIS RENOMMER
 * en mapo-provision-config.php (à côté de mapo-provision.php).
 *
 * Pour créer le jeton API cPanel :
 *   cPanel → Sécurité → « Gérer les jetons d'API » (Manage API Tokens)
 *   → Créer → nom « mapo-provision », sans date d'expiration
 *   → copier le jeton ci-dessous (il ne sera affiché qu'une fois).
 */

const CPANEL_HOST = 'web58.lws-hosting.com';   // serveur cPanel
const CPANEL_USER = 'c2627836c';                // utilisateur cPanel
const CPANEL_TOKEN = 'COLLER_LE_JETON_ICI';     // jeton API cPanel
const ROOT_DOMAIN = 'app-edufrem.com';          // domaine racine des écoles
const MAPO_DIR = 'public_html/mapo';            // dossier du build partagé
const FIREBASE_PROJECT = 'mapo-edufrem';        // projet Firebase

/**
 * Clé du compte de service Google (JSON) pour ajouter automatiquement
 * le sous-domaine aux « domaines autorisés » de Firebase Auth.
 * Setup unique :
 *   1. Google Cloud Console → projet mapo-edufrem → IAM & Admin →
 *      Comptes de service → Créer (nom « mapo-provision »).
 *   2. Lui donner le rôle « Administrateur Firebase Authentication »
 *      (roles/firebaseauth.admin).
 *   3. Onglet Clés → Ajouter une clé → JSON → télécharger.
 *   4. Déposer le fichier dans public_html/mapo/ sous le nom mapo-sa-key.json
 *      (le .htaccess fourni en interdit l'accès web).
 * Tant que ce fichier est absent, la création de sous-domaine fonctionne
 * mais le domaine autorisé Firebase doit être ajouté à la main.
 */
const SA_KEY_FILE = __DIR__ . '/mapo-sa-key.json';
