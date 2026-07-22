<?php
/**
 * MAPO+ — Connecteur Carré : configuration SECRÈTE.
 * Hors git, JAMAIS déployée par la CI. À téléverser en FTPS (chmod 600).
 *
 * 1. Copier ce fichier en `mapo-carre-config.php`.
 * 2. Remplir CARRE_ENC_KEY avec une clé aléatoire (32 octets, hex) :
 *      openssl rand -hex 32       (ou)   php -r "echo bin2hex(random_bytes(32));"
 *    Elle chiffre les jetons OAuth Carré au repos — ne pas la changer après
 *    coup (les jetons déjà stockés deviendraient illisibles → re-consentement).
 */
define('CARRE_ENC_KEY', 'A_REMPLIR_cle_hex_32_octets');
// Projet Firebase MAPO+ (valeur publique) — valide le jeton de l'utilisateur MAPO+.
define('FIREBASE_PROJECT', 'mapo-edufrem');
