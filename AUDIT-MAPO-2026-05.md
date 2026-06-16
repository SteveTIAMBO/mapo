# Audit technique MAPO — Mai 2026

**Périmètre** : code source local (`/MAPO`), site en ligne `mapo.app-edufrem.com`, configuration Firebase et déploiement cPanel.
**Question posée** : la stack actuelle est-elle solide pour (a) commercialiser MAPO auprès d'écoles africaines et (b) lancer une version parallèle pour l'enseignement supérieur en Europe et en Afrique ?
**Réponse courte** : la *technologie* choisie est saine et moderne. Mais l'*architecture telle qu'implémentée aujourd'hui* est celle d'un prototype mono-école, mono-utilisateur. En l'état, elle ne peut pas être vendue à plusieurs écoles ni servir de base au supérieur sans une reprise de fond de la couche données, de l'authentification et du modèle métier. La bonne nouvelle : le front-end est réutilisable et le chantier est clair.

---

## 1. Ce que MAPO est réellement aujourd'hui

La mémoire projet décrivait MAPO comme un « fork Laravel de RosarioSIS, stack Laravel + MySQL ». **Ce n'est pas le cas.** Le code réel est :

- **Front-end** : Vue 3 + Vite, Pinia (state), Vue Router, Tailwind CSS, PWA (offline-first)
- **Back-end** : aucun. Firebase joue ce rôle — Firestore (base NoSQL), Firebase Auth, Firebase Storage
- **Hébergement** : un SPA statique sur cPanel/LWS (Apache + `.htaccess` pour le routing). Le serveur cPanel ne sert que des fichiers ; toute la logique tourne dans le navigateur.
- **Aucun fichier PHP, aucune trace de RosarioSIS, aucune base relationnelle.** C'est une application réécrite de zéro.

Volumétrie : ~33 000 lignes de code dans 34 vues, 17 stores Pinia, 2 fichiers de test. Projet jeune (6 commits git).

Ce choix technologique en soi est défendable : Vue 3 + Firebase + PWA est une combinaison légitime, surtout pour le contexte africain (offline-first, pas de serveur à administrer). Le problème n'est pas *la techno*, c'est *comment elle est utilisée*.

---

## 2. Constat critique n°1 — MAPO n'est pas multi-utilisateur, ni multi-école

C'est le point le plus important de cet audit.

Chaque store écrit ses données dans Firestore **sous l'identifiant du compte connecté** (`auth.currentUser.uid`) :

```
eleves/{uid}/items
personnel/{uid}/members
classes/{uid}/items
notes/{uid}
schoolSettings/{uid}
facturation/{uid}
emploiDuTemps/{uid}
inscriptions/{uid}/dossiers
discipline/{uid}/incidents
devoirs/{uid}/items
messages/{uid}/items
```

Conséquences concrètes :

- **Il n'existe aucune entité « école ».** Une école = un compte Firebase. Le directeur et ses enseignants ne peuvent pas avoir chacun leur identifiant : s'ils se connectent séparément, chacun obtient un espace de données **vide et séparé**. En pratique, toute l'école doit partager **un seul mot de passe**.
- **Le système de rôles (RBAC) est purement décoratif en production.** Le store `permissions.js` ne sauvegarde les rôles personnalisés *que* en mode démo (`if (authStore.isDemo)`). En production, `loadRoles()` et `saveRoles()` ne font rien. Les rôles « Directeur / Enseignant / Parent / Comptable… » n'existent vraiment que dans la démo localStorage.
- **Toute connexion Google crée automatiquement un profil `role: 'enseignant'`.** Le `hd: 'edufrem.com'` sur le provider Google n'est qu'un indice d'interface, il n'est pas une barrière de sécurité.
- **Certaines fonctions ne sont même pas implémentées côté production.** Exemple : `saveAttendance()` dans le store présences contient le commentaire `// À implémenter lors de la migration Firebase`. La sauvegarde des appels ne fonctionne tout simplement pas hors démo.

**Lecture d'ensemble** : MAPO a été conçu et démontré presque entièrement en *mode démo* (données dans le `localStorage` du navigateur). La couche Firebase « production » est partielle, incohérente et n'a jamais réellement tourné en multi-utilisateur. C'est un prototype convaincant, pas un produit livrable.

Pour vendre à plusieurs écoles, il faut introduire une vraie notion de **tenant** (`schoolId`) : un établissement, plusieurs utilisateurs rattachés, des données scopées par école et non par personne. Ce n'est pas un réglage, c'est une reprise de la couche données.

---

## 3. Constat critique n°2 — Sécurité

### 3.1 Les règles Firestore réelles ne couvrent presque rien — et ne correspondent pas au code
Les règles n'étaient pas dans le dépôt (le fichier `nova-bridge/firestore-rules-mapo.txt` n'est qu'un placeholder). Je suis allé les récupérer dans la console Firebase. Voici **l'intégralité** des règles déployées en production (inchangées depuis le 30 mars 2026) :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}          { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /schoolSettings/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /personnel/{userId}      { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /classes/{userId}        { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /students/{userId}       { allow read, write: if request.auth != null && request.auth.uid == userId; }
  }
}
```

Trois problèmes en découlent, et ils sont graves :

- **Les règles ne couvrent que 5 emplacements** : `users`, `schoolSettings`, `personnel`, `classes`, `students`. Toutes les autres collections utilisées par le code (`eleves`, `notes`, `facturation`, `discipline`, `devoirs`, `messages`, `emploiDuTemps`, `inscriptions`, `presences`, `schools`, `school_directory`…) **n'ont aucune règle — donc accès refusé par défaut.**
- **Les règles ne correspondent même pas au code.** Le code écrit dans la collection `eleves`, mais la règle parle de `students`. Le code écrit dans des sous-collections (`personnel/{uid}/members`, `classes/{uid}/items`) que les règles `match /personnel/{userId}` ne couvrent pas (une règle Firestore ne descend pas dans les sous-collections sans wildcard explicite).
- **Conséquence concrète : en mode production réel, l'application est non fonctionnelle.** Seuls la connexion (`users`) et la sauvegarde des paramètres de l'école (`schoolSettings`) passeraient. La saisie d'élèves, de notes, de présences, de factures… serait refusée par les règles de sécurité.

J'ai aussi vérifié la base Firestore elle-même : elle ne contient **qu'une seule collection `users` avec un seul document de test** (`demo@mapo.app`). Aucune donnée réelle. C'est la preuve définitive que **MAPO n'a jamais tourné en production** — tout ce qui a été démontré l'a été en mode démo (localStorage). Ce n'est pas un produit en exploitation, c'est une maquette.

### 3.1 bis — Le projet est sur le forfait gratuit Spark
Le projet Firebase est en **Forfait Spark** (gratuit), plafonné à ~50 000 lectures / 20 000 écritures par jour et 1 Gio de stockage. Suffisant pour une démo, **insuffisant pour ne serait-ce que quelques écoles réelles**. Un passage au forfait payant Blaze sera nécessaire dès la première vraie école — à budgéter, car le coût Firestore croît avec le nombre de lectures/écritures.

### 3.2 L'annuaire des écoles est en lecture publique
La règle visible expose `school_directory/{slug}` avec `allow read: if true;` — **lecture par n'importe qui sur Internet**, sans authentification. Et `allow write: if request.auth != null;` — **n'importe quel utilisateur connecté peut écrire dans la fiche de n'importe quelle école**.

Or `schoolDirectory.js` publie *automatiquement* dans cette collection, à chaque sauvegarde des paramètres, un profil agrégé très complet : effectifs, nombre de filles/garçons, élèves vulnérables, finances (montant attendu, montant recouvré, taux de recouvrement), résultats, taux d'abandon… Pour des écoles africaines c'est déjà discutable. **Pour des établissements du supérieur soumis au RGPD, exposer publiquement des données financières et d'effectifs est rédhibitoire.**

### 3.3 Pas d'autorisation côté serveur
Les contrôles de permission (`hasAccess`, `canWrite`) ne font que masquer des boutons et des menus dans l'interface. Tout est contournable depuis la console du navigateur. La seule barrière réelle possible, ce sont les règles Firestore — qu'on ne peut pas auditer (cf. 3.1).

### 3.4 Éléments de moindre gravité
- La config Firebase (`apiKey`, etc.) est en clair dans le bundle : c'est *normal* pour Firebase (cette clé n'est pas un secret), à condition que les règles Firestore et les réglages Auth soient stricts — ce qui n'est pas vérifiable ici.
- Le mot de passe démo (`demo1234`) et les comptes démo sont en dur dans le bundle de production. Acceptable pour une démo, mais le code de bypass démo est expédié à tous les clients.

---

## 4. Constat n°3 — Qualité du code et dette technique

- **Fichiers monolithiques géants** : `EmploiDuTempsView.vue` fait 3 578 lignes, `FacturationView.vue` 2 609, `NotesView.vue` 2 278. Ces fichiers mélangent template, logique métier, appels Firebase, génération PDF et génération de données démo. Très difficiles à maintenir, à tester, à faire évoluer à plusieurs.
- **Le mode démo est tissé dans toute l'application** : chaque store a deux chemins de code (démo via `localStorage`, prod via Firebase), avec plus de 100 appels `localStorage` répartis dans les stores. C'est une source de bugs permanente et un doublement du coût de chaque évolution.
- **Couverture de test quasi nulle** : 2 fichiers de test (53 tests) qui couvrent le calcul des moyennes et la transition d'année. Les 33 000 lignes de vues, l'auth, les permissions, la couche Firebase : non testées.
- **Incohérences de modèle** : la collection `presences` est à plat (`collection(db, 'presences')`, sans `uid`) alors que toutes les autres sont scopées par utilisateur. Mélange de conventions.
- **Artefacts dans le dépôt git** : le dossier de build (`dist-v12`, 162 fichiers) est commité, un fichier ZIP de 2,6 Mo (`ziYlE4LN`) traîne à la racine, et une photo personnelle (`Photo pro Steve.png`, 885 Ko) est dans le build. Le `.gitignore` n'exclut aucun dossier `dist`.

---

## 5. Constat n°4 — Déploiement fragile

- Le `.cpanel.yml` (déploiement auto cPanel) référence un dossier `dist-new/` **qui n'existe pas** (le build réel est dans `dist-v12/`). Le pipeline de déploiement automatique est donc cassé ; le déploiement est aujourd'hui 100 % manuel.
- `build-deploy.sh` identifie « les fichiers du build courant » par une heuristique de timestamp (fichiers modifiés dans les 15 dernières secondes). C'est fragile et non reproductible.
- Trois noms de dossiers de sortie cohabitent (`dist-new`, `dist-v12`, `dist-upload`) sans convention claire.
- Le site `mapo.app-edufrem.com` répond bien (le SPA est servi correctement), donc la *prod statique* fonctionne — mais le *processus* pour y arriver est artisanal.

---

## 6. Ce qui est bien — et adapté au contexte africain

Il faut aussi le dire clairement, parce que c'est réutilisable :

- **Le choix offline-first / PWA est excellent pour l'Afrique** : persistance Firestore locale, `useConnectionStatus`, installable sur mobile/tablette. C'est un vrai différenciateur face à un ERP classique.
- **La couverture fonctionnelle K-12 est large et pensée pour le terrain** : élèves, classes, notes/bulletins par séquence/trimestre, présences, discipline, emploi du temps, facturation scolarité, messagerie, espace parent, espace élève, import Excel, exports XLSX/PDF, transition d'année.
- **La localisation africaine est sérieuse** : valeurs Cameroun/Sénégal/Côte d'Ivoire, devises XAF/XOF, cycles premier/second cycle, types d'établissement, champs « vulnérabilité » compatibles avec les standards d'enquête.
- **Le front-end Vue 3 est moderne et propre dans sa structure** (composables, stores, router, séparation layout/views). C'est une base réutilisable.

Le travail de produit n'est pas à jeter. C'est la *fondation technique* (données, multi-tenant, sécurité, déploiement) qui doit être reprise.

---

## 7. Écart avec l'enseignement supérieur (modèles Auriga / Alcuin)

Auriga et Alcuin couvrent un métier **structurellement différent** du K-12. Les fonctions clés qu'ils mettent en avant :

| Besoin du supérieur | Présent dans MAPO ? |
|---|---|
| Offre de formation modulaire (tronc commun, UE, modules, majeures/mineures, électifs, prérequis, équivalences, compensation, rattrapage) | Non — modèle « 1 élève = 1 classe fixe » |
| Crédits ECTS | Non |
| Inscriptions pédagogiques (l'étudiant choisit ses cours/UE — relation plusieurs-à-plusieurs) | Non — pas d'inscription à des cours |
| Admissions / concours (candidature, admissibilité, jury, dossier) | Partiel — il y a des « inscriptions » mais pas de processus de sélection |
| Gestion des intervenants/vacataires (statuts, coûts horaires, plans de charge, contrats, paie intervenant) | Non — il y a un « personnel » et « mon salaire », mais pas la logique vacataire |
| Planification par cours / intervenant / groupe / semaine-type, sans conflit | Partiel — emploi du temps existe mais pensé classe/établissement K-12 |
| Stages, alternance, relations entreprises, mobilité internationale | Non |
| Facturation des apprenants **et des financeurs** (OPCO, formation continue, échéanciers variables) | Non — facturation = frais de scolarité simples |
| Diplomation, suivi des compétences, alumni | Non |
| Portails self-service multi-profils personnalisables | Partiel — espaces parent/élève figés |
| Pilotage : requêteur, tableaux de bord, enquêtes, accréditations, rankings | Partiel — module rapports K-12 |
| Workflows configurables + signature électronique | Non |

**Conclusion de la comparaison** : passer MAPO au supérieur n'est pas « ajouter des fonctionnalités ». C'est un **autre modèle de données** (étudiant ↔ inscriptions ↔ UE ↔ ECTS ↔ intervenants). Le modèle actuel, en forme de K-12 (un élève appartient à une classe, des notes deviennent un bulletin trimestriel), ne s'étire pas jusque-là.

S'ajoute une contrainte : la complexité **relationnelle** du supérieur (plusieurs-à-plusieurs partout, prérequis, parcours) est précisément ce que Firestore (NoSQL) gère mal. Et le RGPD/résidence des données en Europe impose un cadre que l'annuaire public actuel viole déjà.

---

## 8. Verdict sur la stack

**La technologie : oui, c'est solide.** Vue 3 + Vite + Tailwind + PWA est un socle front-end moderne, performant, et l'angle offline-first est un atout réel pour l'Afrique. Rien à jeter de ce côté.

**L'architecture telle qu'implémentée : non, elle ne tient pas pour les objectifs visés.** Trois raisons :

1. **Pas de multi-tenant / multi-utilisateur.** C'est bloquant pour vendre à plusieurs écoles, et a fortiori pour le supérieur (des dizaines de personnels, des milliers d'étudiants, plusieurs profils).
2. **Sécurité non maîtrisable.** Règles Firestore hors du code, annuaire public, autorisation seulement côté interface. Incompatible avec une commercialisation, et frontalement incompatible avec le RGPD pour l'Europe.
3. **Le modèle de données est K-12.** Il faudra le repenser pour le supérieur, pas l'étendre.

**Sur Firebase pour le supérieur** : c'est le point à trancher en premier. Firestore convient bien à l'offline-first africain K-12. Il convient mal à la complexité relationnelle du supérieur. Deux options se dessinent : (a) garder Firebase et accepter de contorsionner le modèle, ou (b) introduire un vrai back-end avec base relationnelle (PostgreSQL) pour le supérieur — quitte à partager le front-end Vue entre les deux produits. Mon avis : pour le supérieur Europe, (b) est plus sûr à moyen terme.

**Recommandation stratégique forte** : **ne pas forker une version « supérieur » maintenant.** Forker aujourd'hui, ce serait dupliquer un prototype mono-école dans deux produits — donc payer deux fois les mêmes défauts de fondation. L'ordre logique est : (1) assainir la fondation de MAPO (multi-tenant + sécurité + couche données réelle), (2) en faire un vrai produit vendable pour l'Afrique K-12, (3) seulement ensuite, bâtir le module « supérieur » sur cette fondation assainie, avec son propre modèle métier.

---

## 9. Plan d'actions proposé

### Phase 0 — Hygiène immédiate (quelques jours)
- Retirer du dépôt git les artefacts de build (`dist-v12`, `ziYlE4LN`, photos), corriger le `.gitignore`.
- Récupérer les règles Firestore réelles depuis la console et les **versionner** dans le dépôt (`firestore.rules`).
- Restreindre `school_directory` : retirer le `read: if true`, ne plus publier de données financières/effectifs sans consentement explicite.
- Réparer ou supprimer le `.cpanel.yml` (aligner sur le vrai dossier de build).

### Phase 1 — Fondation multi-tenant (le gros chantier, prioritaire)
- Introduire une entité `schools/{schoolId}` et une table de rattachement `users → school + rôle`.
- Re-scoper **toutes** les collections par `schoolId` au lieu de `uid`.
- Réécrire les règles Firestore pour isoler les données par école **et** par rôle (autorisation réelle côté serveur).
- Implémenter une vraie gestion des comptes : invitation d'utilisateurs par le directeur, attribution de rôle persistée en base.
- Terminer les fonctions « production » non finies (ex. `saveAttendance`).
- Décider du sort du « mode démo » : l'isoler proprement (build séparé) plutôt que de le laisser dans chaque store.

### Phase 2 — Mise en état « produit vendable » (Afrique K-12)
- Découper les vues géantes en composants/modules testables.
- Mettre en place une couverture de tests sur la logique critique (notes, facturation, permissions, multi-tenant).
- Pipeline de déploiement reproductible (build → déploiement, idéalement via GitHub Actions plutôt que cPanel manuel).
- Revue RGPD/protection des données même pour l'Afrique (consentement, conservation, export/suppression).

### Phase 3 — Étude du module « Enseignement supérieur »
- Décision d'architecture à documenter (Firebase étendu vs back-end relationnel) — c'est une décision structurante, à formaliser.
- Modélisation du domaine supérieur : étudiant, inscription pédagogique, UE/modules, ECTS, parcours, intervenants/vacataires, financeurs.
- Cadrage du périmètre v1 (ne pas viser les 14 besoins d'Auriga d'un coup — choisir un type d'établissement pilote, ex. école de management ou centre de formation).
- Réutilisation du front-end Vue et du socle multi-tenant de la Phase 1.

---

## 10. Questions ouvertes à clarifier

- **NOVA** : c'est quoi exactement ? Le code `nova-bridge` suggère une seconde application (collecte de « l'ADN » des écoles : identité, effectifs, infrastructure, finances). Son rôle dans la stratégie produit change l'analyse de l'annuaire public.
- **Confirmation** : la base Firestore ne contient qu'un utilisateur de test et les règles ne couvrent presque rien — MAPO n'a donc aucune école réelle en production aujourd'hui. C'est en réalité une **bonne nouvelle** : reprendre la fondation maintenant ne casse rien et ne migre aucune donnée. C'est le bon moment.
- **Budget / équipe de développement** : la Phase 1 est un vrai chantier. Qui le porte, sur quel délai ? Et il faudra budgéter le passage Firebase au forfait Blaze.

---

*Annexe : règles Firestore récupérées dans la console Firebase le 2026-05-15 (compte contact@edufrem.com). Voir section 3.1.*
