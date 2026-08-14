# Prompt de reprise — MAPO+ / MIAPO (chat suivant)

> Copier-coller ce message pour démarrer le prochain chat.
> **Ouvrir la session avec le dossier EDUFREM global sélectionné** pour charger `00_MEMORY/` automatiquement.
> Généré le 23/07/2026 en fin de session (contexte saturé). Supprimer après reprise.

---

## Qui / quoi
- **EDUFREM**, fondateur **Steve** (non-développeur, rôle UX/design). Me parler en français.
- **MAPO** = ERP de gestion pour les **écoles**. **MAPO+** = produit pour les **particuliers** (B2C : parents, élèves, apprenants adultes). **MIAPO** = l'agent IA propriétaire embarqué dans les deux (le moat). MIAPO n'est pas un produit à part.
- Stack : **Vue 3 + Vite + Pinia + vue-i18n (FR/EN à parité stricte) + Firebase** (projet `mapo-edufrem`, **PARTAGÉ avec MOBI**) + **PWA** (Workbox SW). Multi-tenant par sous-domaine via `src/utils/tenantContext.js`.
- **Autonomie totale** (consigne permanente Steve) : dev → vérif build → commit → push → CI → **vérif live** → tâche suivante. Ne pas demander la permission de déployer. **Changements chirurgicaux** uniquement. **Frugalité tokens** dans tout le dev.

## Rituel de démarrage
Lire `00_MEMORY/MEMORY.md` (index) puis `edufrem.md`, `mapo_plus_nouvelles_fonctionnalites.md`, `_regles.md`. **La mémoire `00_MEMORY/` prime sur le `CLAUDE.md`** s'ils divergent.

---

## Où on en est (23/07/2026)

### 1. Migration d'URL miapo → mapoplus (en cours)
- Le B2C bascule de `miapo.app-edufrem.com` vers **`mapoplus.app-edufrem.com`** (vrai **sous-domaine**, docroot `public_html/mapo` comme tous les autres ; domaine autorisé Firebase ajouté manuellement par Steve — « c'est fait »).
- `tenantContext.js` : `sub === 'miapo' || sub === 'mapoplus'` → mode `'miapo'`. `server/mapo-carre.php` : `CARRE_REDIRECT` host-aware (whitelist miapo + mapoplus).
- **Côté Carré : OK** (confirmé Steve).
- **RESTE #112 (À LA TOUTE FIN, une fois mapoplus 100 % validé)** : nettoyer le sous-domaine `miapo` + tous les liens qui pointent dessus.

### 2. Process de création de compte MAPO+ (chantier actif — Steve a dit « vasy »)
Objectif Steve : page connexion/inscription **nickel**, mail de bienvenue + lien d'activation, utilisateur enregistré dans une base **visible dans l'onglet MAPO+ du méga-admin**, puis onboarding interactif. **Chaque use case doit marcher de la création jusqu'à l'usage effectif.**

**FAIT + poussé (commit `73db15a`)** :
- `src/stores/auth.js` → `signUpWithEmail(email, password, displayName, meta={})` : quand `meta.b2c`, écrit un doc dans la collection **`mapoplus_users/{uid}`** (`uid, email, displayName, persona` = parent|apprenant, `pays, source:'mapo+', createdAt, lastSeenAt`), en `try/catch` **non-bloquant**.
- `src/views/LoginView.vue` → `handleSignUp` passe `meta = isMiapoMode ? { b2c:true, role:signupRole, pays:signupPays } : {}`. LoginView est déjà **rebrandé MAPO+** (badge édition masqué, logo `M+`, tagline MIAPO, personas **Parent / Apprenant** + hints, `<select>` pays, plus de bouton « changer de version »).
- `firestore.rules` (repo, = doc seulement) : bloc `mapoplus_users` ajouté comme référence.

**⚠️ BLOQUANT — règle Firestore à PUBLIER dans la console** (sinon l'écriture échoue en silence → onglet méga-admin vide) :
La base est **partagée avec MOBI** → **ajout chirurgical**, ne JAMAIS coller le fichier repo par-dessus. Ajouter ce bloc **juste avant** le `match /{document=**}` final, sans toucher au reste :
```
match /mapoplus_users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/superAdmins/$(request.auth.uid));
}
```
Console : compte **contact@edufrem.com**, profil **u/4**. Piège : le deep-link `/firestore/rules` **rebondit sur `/overview`** → passer par Firestore Database puis onglet **Règles** (ou laisser Steve le coller, comme il a fait pour le domaine autorisé).

**RESTE du process de compte (dans l'ordre)** :
1. ~~**Publier la règle** ci-dessus.~~ ✅ FAIT (publié en live via Chrome le 23/07, insertion chirurgicale CodeMirror, MOBI intact).
2. ~~**Onglet MAPO+ dans le méga-admin** qui lit `mapoplus_users`.~~ ✅ FAIT (onglet **« Comptes MAPO+ »** + store `mapoplusUsers.js` + vue `MegaMapoplusUsers.vue`, commit `da5fe5a`, déployé). L'ancien onglet analytics est renommé **« MAPO+ · Adoption »** (lit `miapoUsers`, différent). ⚠️ Vérif visuelle par Steve (login super-admin `adminmapo`) car pas de mot de passe côté agent.
3. **E-mail de bienvenue + lien d'activation** à l'inscription.
4. **#109 Onboarding interactif** après 1re connexion (nom, pays, niveau, école) — le pays est déjà capté à l'inscription (nécessaire pour devise FCFA/EUR + programme national à charger).
5. **Vérifier les 3 use cases** de bout en bout : (a) parent multi-enfants, (b) élève autonome, (c) apprenant adulte hors-catalogue (persona certification/MBA). Création → usage réel.
6. **#110** : bouton **SSO EDUFREM** sur la page de connexion (un identifiant pour tous les outils, liaison auto des comptes).

### 3. Voix MIAPO — Deepgram Voice Agent (#111)
- **DÉCISION Steve** : utiliser **Deepgram Voice Agent** (exactement comme **Carré** et **kIAlel**), **PAS** Web Speech. Steve **dépose la clé OWNER côté serveur** (modèle kIAlel `/deepgram/setup` : la clé ne transite jamais par l'agent, endpoint qui délivre un **grant-token court**).
- À construire : endpoint grant-token + client **Voice Agent** (STT **Nova**, TTS **Aura-2**, **barge-in natif**, cerveau = **Gemini** via endpoint compatible OpenAI). Miroir de l'implémentation kIAlel (aller lire ce projet avant de coder).
- **#107 session de révision vocale « live »** : MIAPO dit bonjour (« Bonjour Awa, que veux-tu étudier ? ») → écoute la matière → lance l'écran quiz → **lit** les questions → réponse **voix ou clic** → juste = question suivante / **1er faux** = indice + **réexplication du concept** comme un prof, **sans donner la réponse** / **2e faux** = encouragement + bonne réponse + **pourquoi** → résultats **enregistrés** pour la progression.
- **DÉJÀ livré** : la pédagogie côté quiz (`src/components/TuteurQuiz.vue` : `expliqueConcept()` via `tuteur.chatTuteur` avec prompt strict « explique le concept, ne donne pas la réponse », `bravo()`/`encourage()`, cache `localStorage`). **L'intro vocale live attend le moteur Deepgram** (l'ancienne amorce Web Speech a été retirée).
- Rappels UX déjà actés : **1 seul bouton** de conversation mains-libres (écoute/parle/se tait si interrompu) ; « **montre-moi X** » = ouverture de la vue + bouton sous les réponses data ; **mémoire locale (cache device)** anti-appels IA répétés (frugalité).

### 4. MOBI ↔ MAPO (contexte donné par Steve le 23/07)
- **MOBI** = produit EDUFREM de **mobilité étudiante** (`mobi.app-edufrem.com`). Se connectera à **MAPO édition Supérieur via API** : l'étudiant qui part en mobilité a un **compte MOBI** pour ses démarches ; l'**école d'accueil (France)** suit les états remontés par l'API depuis son menu **« mobilité entrante »**, l'**école locale** depuis son menu **« mobilité sortante »**.
- C'est **pourquoi la base Firebase est partagée** → d'où l'exigence d'édition **chirurgicale** des règles. La collection `mapoplus_users` est nouvelle et **additive** (MOBI n'y touche pas) : sans risque pour MOBI.

---

## Boucle dev / déploiement (rappels critiques)
- **Build local IMPOSSIBLE dans le sandbox** (npm hang + `--die-with-parent`). Vérif fiable = `@vue/compiler-sfc` `parse`/`compileScript`/`compileTemplate` + `node --check` sur les `.js`, **puis** push, **puis** poll du hash live : `curl -s https://mapoplus.app-edufrem.com/index.html | grep -o 'index-[^.]*\.js'` — **changement de hash = CI a build + déployé**.
- **Déploiement** : `git push origin main` → GitHub Actions (`npm ci` → `vite build` → **smoke test Playwright** `scripts/smoke.mjs` → **FTPS** vers `public_html/mapo`). ~5 min. La CI peut **flaker** (install playwright / FTPS) → re-trigger par **commit vide**.
- **GOTCHA vue-i18n** : un `@` brut dans une **valeur** de message casse (« Invalid linked format ») → **page BLANCHE** en prod (à cause de l'errorHandler global). Échapper : `{'@'}`.
- **GOTCHA LWS** : les réponses `.php` (GET) sont mises en **CACHE + OPcache** après ré-upload → en test, buster d'URL + `Cache-Control`. Le **cron CLI n'est pas affecté**.
- **Configs secrètes `*-config.php`** : jamais dans git ; envoyer en **FTPS direct**. Identifiants dans `../_DEPLOIEMENT-AUTO/identifiants.local` (mdp contient un `#` → **ne pas `source`**, parser ligne par ligne). Endpoints publics **644**, configs **600**.
- **Firestore** : les règles **ne sont jamais déployées par la CI**. Édition **chirurgicale** dans la console (base partagée MOBI). Le `firestore.rules` du repo est **de la doc**, pas la source déployée (l'ordre des blocs diffère en prod).
- **Tests** : `node tests/enfants-stockage.test.mjs` après toute modif de `src/stores/enfantsAutonomes.js`.
- Purger le **service worker** + cache avant toute vérif live (sinon on croit à tort que rien n'a changé).

## Tâches ouvertes
- **#98** menu regroupé en onglets (mobile-safe)
- **#107** session de révision vocale live (attend Deepgram)
- **#108 / #109** page compte dédiée + onboarding interactif
- **#110** bouton SSO EDUFREM
- **#111** voix MIAPO via Deepgram Voice Agent
- **#112** nettoyage du sous-domaine miapo + liens (**TOUT À LA FIN**)
- Process compte : **règle Firestore** → **onglet méga-admin MAPO+** → **email activation** → onboarding → **3 use cases** de bout en bout
