# Déploiement automatique MAPO via GitHub

But : remplacer le déploiement manuel (zip + cPanel + unzip, session qui expire)
par un déploiement **automatique** : chaque `git push` sur `main` construit l'app
et l'envoie sur le serveur LWS par FTP.

## Ce que fait la recette (`.github/workflows/deploy.yml`)
1. Récupère le code, installe Node + dépendances.
2. Construit la SPA (Vite).
3. Assemble la SPA + les proxies PHP (mapo-ia.php, mapo-pay.php, …).
4. Envoie le tout par FTP dans `public_html/mapo`.
5. **N'écrase jamais** les fichiers de config (`*-config.php`, `mapo-sa-key.json`)
   qui contiennent les clés API et restent uniquement sur le serveur.

## Ce que TOI tu dois faire (une seule fois)

### 1. Ajouter 3 secrets dans le dépôt GitHub
GitHub → ton dépôt `mapo` → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret**, trois fois :

| Nom            | Valeur                                                            |
|----------------|------------------------------------------------------------------|
| `FTP_SERVER`   | l'hôte FTP de LWS (ex. `ftp.app-edufrem.com` ou l'hôte serveur)   |
| `FTP_USERNAME` | l'utilisateur FTP / cPanel (ex. `c2627836c`)                      |
| `FTP_PASSWORD` | le mot de passe de ce compte FTP                                 |

> L'hôte et l'identifiant FTP se trouvent dans cPanel → **Comptes FTP**
> (ou LWS Panel → FTP). Crée au besoin un compte FTP dédié au déploiement.

### 2. (Sécurité) Régénérer ton jeton GitHub
Un ancien jeton est stocké en clair dans la config git locale. Régénère-le :
GitHub → **Settings** → **Developer settings** → **Personal access tokens** →
révoque l'ancien, crée-en un nouveau si besoin.

### 3. Mettre le code à jour sur GitHub
Le dépôt est en retard sur ce qui est en ligne (on déployait par zip).
Il faut **committer l'état actuel du code** puis pousser. (À faire ensemble,
proprement, en nettoyant les vieux fichiers de build commités.)

## Ensuite
Déployer = `git push` (ou bouton **Run workflow** dans l'onglet **Actions**).
Plus aucune connexion cPanel nécessaire. Historique + retour arrière inclus.
