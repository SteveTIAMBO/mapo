# Moniteur de supervision EDUFREM (serveur, sans coût IA)

Un simple script PHP hébergé sur LWS qui vérifie toutes les 4h que les apps EDUFREM sont en ligne, envoie un e-mail si l'une tombe, et affiche un petit tableau de bord d'état. Réutilisable pour les instances des écoles.

Il détecte en particulier **l'écran blanc / déploiement cassé** : pour chaque SPA, il vérifie que le bundle JS référencé dans la page renvoie bien 200 (un 404 = chunk périmé = écran blanc probable).

## Fichiers
- `mapo-monitor.php` : le moniteur (checks + e-mail d'alerte + tableau de bord).
- `mapo-monitor-config.example.php` : modèle de config (clé, e-mail, liste des apps).

## Déploiement (5 minutes, côté Steve)
1. Copier `mapo-monitor-config.example.php` → `mapo-monitor-config.php`, mettre une **clé secrète longue** et la liste des apps.
2. Uploader `mapo-monitor.php` **et** `mapo-monitor-config.php` dans `public_html/mapo/`.
3. Protéger la config dans le `.htaccess` de `/mapo/` :
   ```
   <Files "mapo-monitor-config.php">
     Require all denied
   </Files>
   ```
4. Dans cPanel → **Tâches Cron**, ajouter une tâche **toutes les 4 heures** :
   ```
   0 */4 * * *   curl -s "https://mapo.app-edufrem.com/mapo-monitor.php?run=VOTRE_CLE" >/dev/null 2>&1
   ```
5. Tableau de bord (à mettre en favori) :
   ```
   https://mapo.app-edufrem.com/mapo-monitor.php?view=VOTRE_CLE
   ```

## Alertes
Dès qu'une app passe de « en ligne » à « dégradé » ou « hors ligne », un e-mail part vers `MONITOR_ALERT_EMAIL`. (Sur LWS, `mail()` fonctionne ; à tester en prod comme pour les autres notifications.)

## Instances écoles
Ajouter simplement chaque instance dans `MONITOR_APPS` (`['name'=>'Collège X','url'=>'https://collegex.app-edufrem.com','spa'=>true]`). Aucun coût supplémentaire, un seul cron surveille tout.

## Pourquoi pas un agent IA planifié ?
Un agent IA toutes les 4h consommerait des tokens à chaque exécution pour une simple vérification d'uptime. Ce moniteur PHP est gratuit, instantané, et reste sur ton serveur.
