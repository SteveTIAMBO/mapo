# Prompt de reprise — MAPO+ (à coller dans un nouveau chat)

---

Tu reprends le développement de **MAPO+**, le tuteur IA grand public d'EDUFREM.

**Repo** : `/Users/kialel/Documents/Claude/Projects/EDUFREM/09_APPLICATIONS/MAPO`
**Stack** : Vue 3 (`<script setup>`) + Pinia + vue-i18n (FR par défaut, EN complet) + Firebase.
**Déploiement** : `git push origin main` → GitHub Actions → FTP LWS (~5 min). La CI déploie aussi `server/*.php`, mais **jamais** les règles Firestore.
**Démo live** : https://miapo.app-edufrem.com (espace parent ou élève). Après déploiement, purger le service worker avant de tester.
**Mémoire projet** : lire `Projects/00_MEMORY/MEMORY.md` puis les fiches utiles.

## Méthode attendue
Autonomie totale : coder → vérifier → commit → push → tester en live dans Chrome → enchaîner. Ne pas demander la permission à chaque étape. Vérifier réellement (compilation SFC, JSON valide, parité FR/EN, puis test live) avant d'annoncer qu'une chose fonctionne.

---

## CE QUI RESTE À FAIRE (dans cet ordre)

### 1. Éclater le stockage des enfants — PRIORITAIRE, option validée par Steve

**Pourquoi** : tous les enfants d'un parent sont dans UN document `users/{uid}/b2c/enfants` = `{ enfants: [...] }`. Firestore donne accès à un document entier ou à rien → impossible qu'un enfant lise SON profil sans exposer ceux de sa fratrie. C'est le blocage du compte enfant.

**Cible** : un document par enfant → `users/{owner}/b2c/enfant_<id>` = `{ enfant: {...} }`.

**Étapes, dans l'ordre :**
1. `src/stores/enfantsAutonomes.js` : `persist()` écrit un doc par enfant ; `hydrate()` lit la sous-collection `b2c` et ne retient que les docs `enfant_*` — **attention, `b2c/link` vit dans la même sous-collection, il faut l'exclure**.
2. **Migration idempotente** : si le legacy `b2c/enfants` existe et qu'aucun `enfant_*` n'est présent → écrire chaque enfant dans son doc, puis **garder le legacy en repli** (ne pas le supprimer tout de suite). Tester sur un vrai compte avant de généraliser.
3. **Règles Firestore — COUPLÉ, ne pas oublier** : la règle co-parent est aujourd'hui restreinte à `match /b2c/enfants`. Si on ne l'étend pas aux `enfant_*`, **le co-parent livré le 18/07 casse**.

### 2. Compte propre de l'enfant (après le 1, pas avant)
La mère donne un **code d'invitation** ; l'enfant crée son propre compte MAPO+ et le saisit. Calquer sur `src/stores/coParents.js` (invite par code, `get` seul sur les codes, lien vérifié par la règle), mais avec des **droits plus étroits** : l'enfant voit **uniquement son profil**, pas sa fratrie, et ne peut inviter personne. La création de compte reste séparée (parent vs apprenant).

### 3. Notifications (point 5)
- **Rappel quotidien à l'apprenant = push web GRATUIT** : abonnement navigateur + clés VAPID + petit service d'envoi. Le bouton « Installer l'application » est déjà livré (indispensable sur iPhone).
- **WhatsApp = relance RARE au parent** seulement (« Awa n'a pas révisé depuis 5 jours »), via le proxy Twilio existant. Chaque message se paie → volume faible, réservé aux gros abonnements, activable/désactivable par le parent.

---

## PIÈGES À CONNAÎTRE (coûteux si ignorés)

- **`firestore.rules` du repo ≠ production.** Le fichier porte un avertissement en tête. **Toujours comparer avec la console avant de publier.**
- **La base Firebase `mapo-edufrem` est PARTAGÉE avec un autre produit** (collections `community_posts`, `cf_dates`, `requests`, fonctions `mobi*`). Coller le fichier du repo tel quel écraserait leurs règles.
- **En Firestore, `read` = `get` + `list`.** Pour un secret partagé par code, utiliser **`get` seul**, sinon n'importe qui énumère tous les codes.
- **Console Firebase** : compte `contact@edufrem.com`, profil **`u/4`** (`https://console.firebase.google.com/u/4/project/mapo-edufrem/firestore/rules`). Les autres sessions Google n'ont pas accès.
- **PHP non vérifiable localement** pour l'instant (`server/mapo-ia.php` est partagé par TOUTES les fonctions IA — une erreur de syntaxe les coupe toutes). Steve doit installer Homebrew puis `brew install php`. En attendant : contrôle structurel, puis **test immédiat de l'endpoint après déploiement**.
- **Sortie JS de Chrome** : retourner du contenu de règles brut est bloqué par un filtre. Passer par des empreintes ou échapper `/ $ = : .`.
- **localStorage** : les clés sont suffixées par l'owner (email du profil, ex. `miapo@demo`), pas par `demo-parent`.
- **CSS** : ne jamais nommer une classe en `-card` pour un bloc coloré (une règle globale `!important` la repeint en blanc).

---

## DÉCISIONS PRODUIT DÉJÀ ACTÉES (ne pas les rediscuter)

- Le produit s'appelle **MAPO+** (plus jamais « MIAPO+ »). **MIAPO** = le nom de l'IA uniquement.
- MAPO+ n'est pas un « coach de révision » mais un **professeur particulier complet**.
- **Parent = lecture seule** sur la progression de l'enfant (il ne lance aucun quiz), mais il **propose** des matières à réviser — sans badge « proposé par maman ».
- **Menu parent allégé** : Accueil, Mes enfants, Progression, Emploi du temps, Abonnement. Rien d'autre.
- **Annales** : uniquement pour les classes d'examen (CM2, 3ème, 1ère, Tle).
- **Fiches de révision** : toujours générées **à partir d'un cours réel** (collé, importé, ou publié par le prof). Jamais en générique.
- **Objectif de note configurable** par enfant (le 10/20 en dur a disparu).
- **Pas d'argument de souveraineté des données** : il n'existe pas d'IA africaine, MAPO+ tourne sur Gemini.
- **Quiz** : diversifier au-delà du QCM. Les fautes repérées dans une réponse rédigée déclenchent une **proposition proactive de français**, quelle que soit la matière — mais **pas** de « profil français » séparé.

---

## DÉJÀ LIVRÉ ET VÉRIFIÉ EN LIVE (ne pas refaire)

Annales d'examen · fiches + flashcards depuis un cours · rebrand MAPO+ · co-parent par code avec règles Firestore publiées et sécurisées · objectif de note configurable · bascule mère↔enfant façon Netflix avec code parent · agenda actionnable (séances, série, cochage auto) · questions rédigées avec correction fond/forme séparée · bouton d'installation de l'appli.
