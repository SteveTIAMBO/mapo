# Architecture multi-établissements — MAPO Secondaire

**Date** : 15 mai 2026
**Objet** : plan directeur pour rendre MAPO réellement installable dans des écoles — passage d'une démo mono-utilisateur à un vrai produit multi-établissements.
**Socle technique retenu** : Firebase (Firestore + Auth), fait proprement. L'offline-first reste natif.

Ce document est le blueprint validé avant d'écrire le code. Il décrit le quoi et le pourquoi ; les fichiers et le code viennent ensuite.

---

## 1. Le problème à résoudre

Aujourd'hui, chaque donnée est rangée sous l'identifiant du compte connecté (`eleves/{uid}/items`, etc.). Conséquences : pas de notion d'« école », une école = un seul compte partagé, les rôles ne fonctionnent qu'en démo, et les règles de sécurité ne protègent presque rien.

L'objectif : une **vraie séparation entre l'école et les personnes**. Une école a plusieurs utilisateurs, chacun son compte et son rôle, qui partagent les mêmes données — et les données d'une école sont totalement isolées de celles des autres.

**Bonne nouvelle** : la base Firestore actuelle ne contient qu'un utilisateur de test. Il n'y a **rien à migrer** — on reconstruit la couche données proprement, sans casser quoi que ce soit.

---

## 2. Modèle de données

### Principe : tout est rangé sous l'école

```
schools/{schoolId}                         ← l'établissement (identité + paramètres)
schools/{schoolId}/eleves/{eleveId}
schools/{schoolId}/classes/{classId}
schools/{schoolId}/notes/{...}
schools/{schoolId}/personnel/{...}
schools/{schoolId}/presences/{...}
schools/{schoolId}/...                      ← une sous-collection par module

users/{uid}                                 ← le profil d'un utilisateur
invitations/{invitId}                       ← invitations de personnel en attente
```

Chaque module (élèves, classes, notes, présences, emploi du temps, discipline, devoirs, messagerie, facturation, inscriptions…) devient une sous-collection sous `schools/{schoolId}/`. C'est ce qui garantit l'isolation : un utilisateur ne peut toucher que les données sous l'école à laquelle il appartient.

### Le document école — `schools/{schoolId}`

Contient l'identité et les paramètres de l'établissement : nom, sigle, type, pays, ville, année académique, logo, configuration des cycles, etc. (ce que gère aujourd'hui le store `school.js`), plus des métadonnées : date de création, créateur, plan d'abonnement.

### Le profil utilisateur — `users/{uid}`

```
{
  uid, email, displayName, firstName, lastName, photoURL,
  schoolId,          ← à quelle école il appartient
  role,              ← directeur | admin | secretaire | comptable | enseignant | surveillant | cantine
  status,            ← active | disabled
  createdAt
}
```

C'est `schoolId` qui rattache la personne à son école, et `role` qui détermine ce qu'elle peut faire. Un utilisateur appartient à **une** école.

### Les rôles

On conserve les rôles déjà définis dans l'application (directeur, admin, secrétaire, comptable, enseignant, surveillant, responsable cantine). Le rôle vit sur le profil utilisateur. La grille fine « quel rôle voit quel module » reste pilotée côté application pour l'expérience utilisateur — mais la **barrière de sécurité réelle**, elle, est dans les règles Firestore (voir §4).

### Parents et élèves

Les comptes parent et élève sont un cas particulier (ils ne font pas « partie du personnel » de l'école au même titre). Pour la tranche pilote, on se concentre sur le **personnel** (directeur + équipe). Les accès parent/élève seront traités dans une étape ultérieure, sur le même principe (rattachement à l'école + périmètre restreint à leurs propres enfants).

---

## 3. Modèle de comptes — comment une école est mise en route

Choix retenu : **mixte** — EDUFREM crée l'école et le compte directeur, le directeur invite ensuite son équipe. Un mécanisme unique sert les deux cas : **l'invitation par email**.

### Mécanisme d'invitation

Une invitation = un document `invitations/{invitId}` : `{ email, role, schoolId, invitedBy, status }`. La collection est au premier niveau (pas sous l'école) pour qu'à la première connexion une personne puisse retrouver son invitation par son email.

À la première connexion d'une personne (Google ou email/mot de passe), si elle n'a pas encore de profil `users/{uid}` :
- on cherche une invitation correspondant à son email ;
- si trouvée → on crée son profil `users/{uid}` avec le `schoolId` et le `role` de l'invitation, l'invitation passe en « acceptée » ;
- si rien → écran « Aucune invitation trouvée — contactez l'administrateur de votre établissement ». **Plus d'auto-création de compte.**

### Mise en route d'une école (par EDUFREM)

1. EDUFREM crée le document `schools/{schoolId}` (identité de base de l'école).
2. EDUFREM crée une invitation pour l'email du directeur, avec le rôle `directeur`.
3. Le directeur se connecte → son profil est créé automatiquement via l'invitation → il complète les paramètres de son école (assistant déjà existant, à adapter).

Pour le pilote, les étapes 1-2 peuvent se faire via une procédure outillée simple ; un véritable écran d'administration EDUFREM viendra plus tard.

### Invitation du personnel (par le directeur)

Le directeur dispose d'un écran « Gestion des accès » : il saisit l'email et le rôle d'un membre du personnel → une invitation est créée → la personne se connecte et rejoint automatiquement l'école avec son rôle.

---

## 4. Sécurité — les règles Firestore

Les règles seront cette fois **versionnées dans le dépôt** (`firestore.rules`), plus jamais uniquement dans la console.

Deux niveaux de protection :

1. **Isolation par école** — un utilisateur ne peut lire/écrire `schools/{schoolId}/**` que si son profil `users/{uid}.schoolId` correspond à ce `schoolId`. C'est la barrière fondamentale : les données d'une école sont hermétiques.
2. **Contrôle par rôle** — au sein de son école, ce qu'un utilisateur peut écrire dépend de son rôle (ex. seuls directeur/admin/secrétaire écrivent les élèves ; la comptabilité est réservée à directeur/admin/comptable ; tout le personnel peut lire).

Protections complémentaires : un utilisateur ne peut pas modifier lui-même son `schoolId` ou son `role` (sinon il pourrait s'auto-promouvoir) ; les invitations ne sont lisibles que par leur destinataire et les administrateurs de l'école.

---

## 5. Ce qui change dans le code

- **Authentification** (`stores/auth.js`) : à la connexion, charger `users/{uid}` → récupérer `schoolId` + `role` ; gérer l'état « non provisionné » ; supprimer l'auto-création de profil ; gérer l'acceptation d'invitation.
- **Contexte école** : un endroit unique qui expose le `schoolId` courant, utilisé par tous les stores.
- **Store école** (`stores/school.js`) : lire/écrire `schools/{schoolId}` au lieu de `schoolSettings/{uid}`.
- **Stores de modules** : chaque store (élèves, classes, notes…) écrit désormais sous `schools/{schoolId}/...`. Refonte module par module.
- **Connexion** (`LoginView`) : proposer la vraie connexion (email / mot de passe / Google) **et** garder un accès « démo » clairement séparé.
- **Nouvel écran** : « Gestion des accès » pour le directeur (inviter / désactiver du personnel).

---

## 6. Le mode démo est conservé

Le mode démonstration (comptes `directeur` / `enseignant` / `parent` / `eleve`, mot de passe `demo1234`, données en `localStorage`) **reste** — c'est la vitrine commerciale. Il sera simplement isolé proprement du mode réel : la page de connexion distinguera clairement « se connecter à mon école » et « essayer la démo ». Aucune donnée de démo ne touche Firebase.

---

## 7. Plan d'exécution par étapes

| Étape | Contenu | Livrable |
|---|---|---|
| 1 | Ce plan d'architecture | Ce document |
| 2 | Règles de sécurité Firestore versionnées | `firestore.rules` |
| 3 | Refonte authentification + contexte école | Code |
| 4 | Refonte des 3 stores pilotes (élèves, classes, notes) | Code |
| 5 | Flux comptes & invitations + écran gestion des accès | Code |
| 6 | Validation de bout en bout de la tranche pilote | Tests + build |
| 7 | Déroulé des 14 modules restants sur la fondation validée | Code, par lots |

La **tranche pilote** (étapes 2 à 6) prouve le modèle de bout en bout sur 3 modules avant de dérouler le reste. C'est l'approche choisie : valider la fondation avant de tout réécrire.

---

## 8. Points encore à préciser

- **École pilote** : identité et échéance — pour caler l'ordre exact des modules après la tranche pilote.
- **Provisioning EDUFREM** : pour le pilote, procédure outillée simple ; un écran d'administration dédié EDUFREM viendra ensuite.
- **Comptes parent / élève** : traités après la tranche pilote (personnel d'abord).
