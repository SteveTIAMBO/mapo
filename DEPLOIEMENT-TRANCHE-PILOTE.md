# Mise en service — Pilote multi-établissements (Extrême-Nord)

**Date** : 7 juin 2026 (remplace la version du 15 mai 2026)
**Objet** : déployer MAPO secondaire dans les écoles pilotes de l'Extrême-Nord (accord du gouverneur de région), avec une instance par école et des modules activables école par école.
**Build livrable** : **`dist-v48/`** (180 fichiers, `.htaccess` inclus — le même build sert le méga admin et toutes les écoles).

## Ce que couvre cette version

- **Fondation multi-établissements** : toutes les données d'une école vivent sous `schools/<slug>/…` dans Firestore, isolation hermétique entre écoles, comptes par invitation, règles de sécurité par rôle.
- **Modules migrés multi-école** : élèves, classes, matières, notes & bulletins, personnel, présences, emploi du temps, messagerie, devoirs, discipline, comptabilité, inscriptions, paramètres.
- **Modules activables par école** : le socle (élèves, classes, matières, personnel, paramètres, accès, import, passage d'année) est toujours actif. Les modules optionnels (notes, présences, emploi du temps, devoirs, discipline, messagerie, salaire, comptabilité, rapports) se cochent dans le méga admin, à la création de l'école ou plus tard via le bouton **« Modules »** de chaque ligne. Par défaut une école secondaire démarre avec : notes, présences, emploi du temps, messagerie (périmètre pilote validé).
- **Démo protégée** : les boutons de démonstration n'apparaissent jamais sur l'instance d'une vraie école — uniquement sur la vitrine `mapo.app-edufrem.com`.

---

## A. Installation EDUFREM (à faire UNE seule fois)

### A1. Déployer les règles de sécurité Firestore
Console Firebase → projet `mapo-edufrem` → **Firestore Database** → onglet **Règles** → remplacer tout le contenu par celui du fichier **`firestore.rules`** (à la racine du projet) → **Publier**.

> Les règles ont été mises à jour le 7 juin 2026 (droits d'écriture enseignants sur les données de devoirs). Même si tu les avais déjà publiées, republie-les.

### A2. Créer ton compte super admin EDUFREM
Console Firebase → **Authentication** → vérifier que ton compte EDUFREM y est (ou l'ajouter). Récupérer son **UID**.

Console Firebase → **Firestore Database** → créer la collection **`superAdmins`** et y ajouter un document dont l'identifiant est ton UID :
```
superAdmins/<TON_UID>
  email     : "contact@edufrem.com"
  createdAt : (horodatage)
```

### A3. Créer le sous-domaine méga admin
Sur cPanel : créer le sous-domaine **`admin.app-edufrem.com`** (ou `adminmapo.app-edufrem.com`, les deux sont reconnus), pointé sur le dossier où tu déploies MAPO (ex. `public_html/mapo`). Y déployer tout le contenu de **`dist-v48/`** (fichier `.htaccess` inclus).

### A4. Autoriser le sous-domaine côté Firebase
Console Firebase → **Authentication** → **Settings** → **Authorized domains** → ajouter `admin.app-edufrem.com`.

### A5. Premier accès
Va sur **`admin.app-edufrem.com`** → connecte-toi avec ton compte EDUFREM → tu arrives sur l'espace méga admin.

---

## B. Ajouter une école pilote (à répéter pour chaque école)

Depuis l'espace méga admin, **« Créer une école »** : nom, sigle, ville, **édition** (secondaire pour le pilote), **modules à activer** (pré-cochés : notes, présences, emploi du temps, messagerie), **sous-domaine** (ex. `lycee-maroua`) et **email du directeur**. À la validation : document école + invitation directeur créés.

Restent 3 gestes côté infrastructure :

### B1. Créer le sous-domaine cPanel
`<slug>.app-edufrem.com`, pointé sur le **même dossier** que les autres (mutualisation : un seul upload de build pour toutes les écoles).

### B2. Déployer / vérifier le build
Si le sous-domaine pointe sur le dossier commun déjà déployé en A3, rien à faire. Sinon, y déployer le contenu de **`dist-v48/`**.

### B3. Autoriser le sous-domaine côté Firebase
Console Firebase → **Authentication** → **Settings** → **Authorized domains** → ajouter `<slug>.app-edufrem.com`.

### B4. Donner l'accès au directeur
- **Connexion Google** : rien à faire, son compte Google doit correspondre à l'email de l'invitation.
- **Email / mot de passe** : Console Firebase → **Authentication** → *Ajouter un utilisateur* → email du directeur + mot de passe provisoire → lui transmettre.

Le directeur ouvre `<slug>.app-edufrem.com`, se connecte, MAPO trouve son invitation, crée son profil directeur, et il atterrit sur le tableau de bord. Depuis **Gestion des accès**, il invite son équipe.

### B5. Ajuster les modules à tout moment
Méga admin → ligne de l'école → bouton **« Modules »** → cocher/décocher → Enregistrer. L'effet est immédiat pour tous les utilisateurs de l'école (menu et accès aux pages).

---

## C. Validation à faire ensemble après la première école

- L'isolation tient : les données de l'école sont sous `schools/<slug>/…`, invisibles depuis une autre école.
- Un compte sans invitation tombe sur l'écran « compte non configuré ».
- Les rôles bornent les accès (un enseignant ne voit pas la comptabilité, etc.).
- Un module décoché dans le méga admin disparaît du menu de l'école et ses pages redirigent vers le tableau de bord.
- Le sous-domaine d'une école ouvre directement sa page de connexion, **sans** les boutons de démonstration.
- Depuis le méga admin, la nouvelle école apparaît avec ses compteurs (élèves, personnel, invitations).

---

## Notes

- Le **mode démonstration** sur `mapo.app-edufrem.com` reste totalement fonctionnel et indépendant.
- L'installation réelle concerne le **personnel** (directeur + équipe). Les comptes parent et élève seront ouverts dans une étape ultérieure.
- Reste hors périmètre multi-école pour l'instant : paiements de scolarité MOBI (collection partagée dédiée), rapports avancés (lisent les autres modules), transition d'année (locale).
- À chaque nouvelle école : les 3 gestes infrastructure (sous-domaine cPanel, vérification build, autorisation Firebase) restent manuels — acceptable pour 2 à 5 écoles pilotes.
