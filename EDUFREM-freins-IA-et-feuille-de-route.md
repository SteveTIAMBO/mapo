# MAPO / MAPO+ — Freins à l'IA éducative & feuille de route pré-lancement

**Base :** les deux tables rondes EDUFREM captées dans Carré le 24/07/2026
— « L'IA à l'école : enjeux et perspectives » (responsable EdTech France, enseignant, psychologue)
et « Débat sur l'IA et l'éducation : opportunités et défis ».
**Objet :** cataloguer **tous** les freins/objections évoqués, dire lesquels nous **couvrons** (→ arguments de communication) et lesquels nous ne couvrons **pas encore** (→ à développer), puis poser la **TODO à mettre en place avant le lancement**.
**Date :** 25/07/2026.

---

## 1. En bref

Les deux échanges font ressortir **24 freins distincts** à l'IA en éducation. La bonne nouvelle : la vision EDUFREM que tu portes (information vérifiée, contrôle de l'enseignant, esprit critique, accessibilité, gouvernance des données) répond **frontalement** à la majorité d'entre eux. Ce sont donc autant d'**arguments de vente** — à condition de tenir la promesse dans le produit.

- **7 freins que nous couvrons déjà** (positionnement + fonctionnalités existantes) → utilisables tels quels en communication.
- **9 freins que nous couvrons partiellement** → l'intention est là, le produit doit être consolidé.
- **8 freins à développer** avant de pouvoir les revendiquer — dont le plus important que tu as cité toi-même : *« l'IA se trompe »*.

Et **3 vérifications techniques** que tu as demandées, dont voici les réponses tout de suite, parce qu'elles conditionnent la crédibilité de tout le reste.

---

## 2. Les trois vérifications que tu as demandées

### 2.1 Le RAG EDUFREM existe-t-il déjà ? → **Non.**

Il n'y a **pas** de RAG (base de connaissances vérifiée qui « nourrit » l'IA) à ce jour.

Ce qui existe s'en rapproche mais n'en est pas un : le store `miapoRef` permet à une école de **coller des exemples de sujets d'examens/devoirs des années précédentes**, par matière. Ces exemples sont ensuite injectés dans le prompt comme **modèles de style** (pour que MIAPO génère des quiz/fiches au bon niveau et au bon format de l'établissement). C'est utile, mais :

- c'est un **gabarit de style**, pas une **source de vérité** ;
- l'IA continue de **produire ses réponses à partir des probabilités** de Gemini / Claude, exactement le mécanisme que les intervenants pointent comme « l'IA se trompe » ;
- rien ne va « chercher l'information exacte dans un référentiel certain » (manuels, cours uploadés par les profs) comme tu le décris.

**Conclusion : le RAG EDUFREM est à construire.** C'est le chantier n°1 de la feuille de route, et c'est ton meilleur différenciateur.

### 2.2 Les données de l'élève sont-elles anonymisées avant d'aller dans l'IA ? → **En partie oui (je corrige ce que je t'avais dit).**

> ⚠️ **Correction.** Dans ma première version je t'avais dit que le prénom réel partait vers l'IA pour les appréciations. C'était **faux** : je n'avais lu que le serveur, pas le code du navigateur qui l'appelle. Après vérification complète, voici l'état exact.

- **« Non stockées » : vrai.** Le proxy relaie et n'écrit rien.
- **« Chiffrées » : au sens du transport (HTTPS).** Ce n'est pas de l'anonymisation, mais c'est correct pour le transport.
- **Appréciations de bulletin : DÉJÀ anonymisées.** Le navigateur remplace le vrai prénom par un jeton neutre `[PRENOM]` **avant** l'envoi (en place et en production depuis le 23/07) ; le prénom est réinjecté dans le texte final côté navigateur. Le modèle ne reçoit donc que des **notes sous pseudonyme** — non rattachables à une personne nommée. **J'ai en plus ajouté aujourd'hui une 2ᵉ couche côté serveur** (le proxy n'insère jamais le prénom dans le prompt, même si un appelant oubliait de l'anonymiser). Vérifié en conditions réelles : le modèle respecte bien le jeton.
- **LA vraie faille restante — les photos.** Les fonctions « **numériser un registre** », « **lire un bulletin** » et « **corriger une copie** » envoient une **photo** à Gemini (vision). Or ces images contiennent des **noms et l'écriture des élèves** en clair. Là, aucune anonymisation — et c'est plus dur, parce que le but même de la fonction est de lire ces noms. C'est le point à traiter.

**Conclusion : l'objectif « données anonymisées avant l'IA » est tenu pour les appréciations (texte), pas encore pour la vision (photos).** Le chantier « gouvernance des données » se recentre donc sur le cas des images (ex. : prévenir/consentement explicite, flouter ce qui n'est pas utile, ou traiter ces photos avec un fournisseur sans réutilisation des données).

### 2.3 Notre IA entraîne-t-elle Gemini ? → **À verrouiller, et à vérifier côté Google.**

- Aujourd'hui le proxy appelle **Gemini** (via l'endpoint compatible OpenAI) et **Claude**. Le fait que Google réutilise ou non ces échanges **pour entraîner ses modèles dépend du type de clé/offre** : sur l'offre payante Gemini API / Vertex AI, Google s'engage à **ne pas** entraîner sur tes données ; sur les clés « AI Studio » gratuites, les échanges **peuvent** être utilisés. **Il faut donc vérifier sur quel tier tourne notre clé** et, au besoin, basculer sur l'offre « no-training ». Je ne peux pas le confirmer depuis le code seul.
- **L'« IA générale EDUFREM » que tu veux entraîner n'existe pas encore.** Rien aujourd'hui ne capitalise nos échanges pour améliorer un modèle maison (support du site, etc.). C'est un chantier à part entière (et il suppose, en amont, la gouvernance des données : on n'entraîne que sur du consenti + anonymisé).

**Conclusion :** deux actions — (1) confirmer/forcer le mode « pas d'entraînement » côté Gemini, (2) décider si/comment on constitue le corpus EDUFREM (anonymisé, consenti) pour notre propre IA.

---

## 3. Cartographie des freins

Légende de statut : ✅ **couvert** (revendiquable aujourd'hui) · 🟡 **partiel** (intention là, produit à consolider) · ❌ **à développer** (pas encore tenable).

### 3.1 Ce qu'on couvre déjà — **arguments de communication immédiats**

| # | Frein / objection (ce que disent les notes) | Notre réponse (argument de vente) | Statut |
|---|---|---|---|
| 1 | **IA grand public mal adaptée à l'école** : ChatGPT & co entrent en classe avec des « effets de bord », pas pensés pour l'éducation. | MAPO/MAPO+ est une **IA éducative** *purpose-built* : quiz, fiches, appréciations, orientation — conçue pour le geste pédagogique, pas un chatbot généraliste détourné. | ✅ |
| 2 | **« On veut remplacer les profs »** : peur du remplacement, écoles « sans profs ». | MAPO **outille** l'enseignant ; MAPO+ est un **complément** côté élève/famille. L'humain garde la main : l'IA propose, l'enseignant décide. | ✅ (à condition de tenir #14) |
| 3 | **Peur de l'échec / motivation** : la peur de se tromper bloque l'apprentissage. | L'entraînement par quiz/fiches en autonomie **dédramatise l'erreur** : on s'exerce sans jugement, on recommence. Levier de motivation cité par la psy. | ✅ |
| 4 | **Données non stockées / RGPD** : pillage des données, profit sur le dos des élèves. | Le proxy IA **ne stocke rien** (« relaie puis oublie »), flux HTTPS. Base de départ solide à afficher clairement. | ✅ (à renforcer par l'anonymisation, cf. #17) |
| 5 | **Contextes locaux ignorés** : biais culturels, langues, réalités hors « grand modèle ». | Ancrage **Afrique francophone** (Cameroun, Sénégal, Côte d'Ivoire, Gabon déjà dans le code) : contenus et exemples adaptés au terrain, pas un modèle hors-sol. | ✅ |
| 6 | **Coût / équipement** comme facteur d'inégalité. | Modèle **B2C accessible + école** pensé pour des contextes à faible équipement (cf. pilier accessibilité). Argument à muscler mais déjà dans l'ADN. | ✅ (relié au pilier 2) |
| 7 | **Format/niveau de l'établissement** : l'IA générique ne colle pas au programme réel. | `miapoRef` : l'école **colle ses vrais sujets** → MIAPO s'aligne sur son style, son niveau, son format. | ✅ |

### 3.2 Ce qu'on couvre partiellement — **à consolider avant de le revendiquer**

| # | Frein / objection | Où on en est | Ce qu'il manque |
|---|---|---|---|
| 8 | **Court-circuit cognitif** : l'IA « mâche le travail », empêche l'accès au savoir. | Intention claire (esprit critique), mais aujourd'hui l'IA **donne** fiches/réponses. | Un **mode « esprit critique »** qui fait chercher/justifier l'élève au lieu de livrer la réponse (cf. pilier 1). | 🟡 |
| 9 | **Triche** (ex. MathGPT en écouteurs en devoir surveillé). | On ne se positionne pas encore là-dessus. | Message + design « **s'entraîner, pas tricher** » ; côté école, contrôle enseignant sur ce qui est évalué. | 🟡 |
| 10 | **Dévalorisation de l'effort personnel** (sens des apprentissages, fierté). | Pilier esprit critique = réponse directe, mais pas encore incarnée produit. | Mécaniques qui **valorisent l'effort** (progression, auto-évaluation) plutôt que le résultat livré. | 🟡 |
| 11 | **Accompagnement / gain de temps enseignant.** | MAPO automatise déjà des tâches (fiches, quiz, appréciations). | Cadrer : on automatise **l'administratif**, jamais le **jugement pédagogique** (cf. #14). | 🟡 |
| 12 | **Personnalisation = argument marketing** (Caillot : « l'IA ne reconnaît pas une personne »). | On personnalise par matière/niveau ; tu veux aller plus loin. | **Personnalisation fine** (besoins réels détectés) + **modules variés** (dictée, dissertation) pour prouver que ce n'est pas du vernis. | 🟡 |
| 13 | **Biais idéologiques / transparence des données d'entraînement.** | On hérite des biais de Gemini/Claude (modèles opaques). | Le **RAG** (corpus connu, vérifié) réduit la dépendance au modèle de base ; afficher nos sources. | 🟡 |
| 14 | **Cœur du métier détourné** : correction/notation = geste pédagogique, pas à externaliser (+ « noter à l'insu », double discours). | On **génère des appréciations** : zone sensible. | **Garde-fou explicite** : l'IA propose un brouillon, l'enseignant valide/modifie ; jamais de note automatique « à l'insu ». À écrire dans la charte **et** dans l'UX. | 🟡 |
| 15 | **Fiabilité côté confiance** : l'élève doit re-vérifier, donc perte de confiance. | Aujourd'hui non résolu (probabilités). | Le **RAG** + citation de la source vérifiée = la réponse devient **traçable**. C'est le pont vers #16. | 🟡 |
| 16 | **Manque de recul scientifique / évaluer les effets.** | Pas de posture affichée. | Adopter une **posture d'humilité + mesure** : on évalue nos effets, on ne survend pas. Argument de confiance. | 🟡 |

### 3.3 Ce qu'on ne couvre pas encore — **à développer**

| # | Frein / objection | Pourquoi ça compte | Chantier |
|---|---|---|---|
| 17 | **« L'IA se trompe »** (probabilités, contrairement à une calculatrice) — *ton exemple*. | **LE** point de crédibilité. Sans réponse, tout le reste est fragile. | **RAG EDUFREM** : l'IA ne répond qu'à partir d'un **référentiel certain** (manuels, cours uploadés), et **cite** sa source. | ❌ |
| 18 | **Contenu/points d'examen non maîtrisés par l'enseignant.** | L'enseignant doit rester **maître de ce qui est évalué**. | Laisser le prof **dire à l'IA** sur quoi porte l'examen/le cours **et la répartition des points**. | ❌ |
| 19 | **Personnalisation réelle des besoins** (Caillot conteste ; toi : « je pense que si »). | Prouver la personnalisation par les faits. | **Détection fine des besoins** par élève + parcours adaptés (au-delà de la matière). | ❌ |
| 20 | **Types d'exercices trop limités** (quiz surtout). | Un quiz ne couvre pas tout l'apprentissage. | **Nouveaux modules** : **dictée**, **dissertation** (correction argumentée), etc. | ❌ |
| 21 | **Discrimination / accessibilité** : inégalités aggravées, rapport socialement différencié au numérique (PISA 2015). | Un outil non accessible **creuse** les inégalités qu'il prétend réduire. | **Pilier accessibilité par défaut** (cf. §4.2) : handicaps sensoriels/moteurs/cognitifs, faible équipement, faible revenu. | ❌ |
| 22 | **Anonymisation avant l'IA** (éthique/données). | Promesse de confiance + conformité. | Texte (appréciations) : **fait** (jeton `[PRENOM]` navigateur + couche serveur). Reste : les **photos** (registres, bulletins, copies) envoyées à Gemini contiennent des noms → à traiter. | 🟡 |
| 23 | **Ne pas entraîner l'IA d'un tiers ; entraîner la nôtre.** | Souveraineté + valeur long terme EDUFREM. | Verrouiller le mode « no-training » Gemini ; construire le corpus **IA générale EDUFREM** (anonymisé, consenti). | ❌ |
| 24 | **Empreinte écologique de l'IA.** | Objection éthique récurrente ; honnêteté nécessaire. | Pas de réponse produit simple. **Ne pas surpromettre** ; mesurer, optimiser les appels, communiquer sobrement. Point de vigilance, pas argument de vente. | ❌ |

> **Freins structurels hors de notre portée** (à ne **pas** prétendre résoudre) : effectifs de classe, programmes, manque de personnel (profs, CPE, AESH), financement public. Les intervenants rappellent que « le vrai problème n'est pas la techno ». **Notre posture gagnante = l'humilité** : MAPO n'est pas une réponse à la crise de l'école, c'est un **outil au service des élèves, des familles et des enseignants**.

---

## 4. La charte EDUFREM

### 4.1 Pilier 1 — L'esprit critique

**Principe :** *l'IA EDUFREM pousse l'humain à développer son esprit critique. On ne fait pas** *à la place de* **l'élève ; on l'aide à se challenger.*

C'est la réponse directe aux freins #8 (court-circuit cognitif), #10 (effort dévalorisé) et #17 (l'IA se trompe). Concrètement, ça doit devenir un **mode de fonctionnement**, pas un slogan :

- MIAPO **guide** vers la réponse (indices, questions, étapes) plutôt que de la **livrer** brute.
- L'élève est invité à **justifier**, **vérifier**, **contredire** — et l'IA sait dire *« vérifie ceci dans ta source »* plutôt que d'asséner.
- Quand l'IA s'appuie sur le RAG, elle **montre la source** : l'élève apprend à remonter à l'information certaine, pas à faire confiance aveuglément (répond aussi à la « question ouverte » de la note 2 : *comment garder l'autonomie et l'esprit critique des élèves face aux IA ?*).

### 4.2 Pilier 2 — L'accessibilité par défaut

**Principe :** *notre outil ne doit SURTOUT pas être discriminant. L'accessibilité est **par défaut**, pas une option — quitte à reconstruire l'app.*

Publics à couvrir explicitement, tels que tu les as nommés :

- **Déficience visuelle** (aveugles, malvoyants) : compatibilité lecteurs d'écran, navigation clavier complète, contrastes, alternatives textuelles, sorties audio.
- **Dys** (dyslexie…) : police adaptée, espacement, lecture audio, pas de mur de texte.
- **TDAH / HPI** : parcours courts, focalisés, sans surcharge ; rythmes adaptables.
- **Handicap moteur** (personnes sans usage des bras/mains) : **commande vocale**, navigation clavier/switch, aucune action réservée à la souris.
- **Surdité / mutité** : **tout le contenu audio doublé en texte**, pas d'info portée uniquement par le son.
- **Faible équipement numérique / faible débit** : version légère, hors-ligne/PWA, mobile d'abord, faible consommation de données.
- **Faible revenu** : accès garanti (le pilier économique de l'inclusion).

> C'est le chantier le plus lourd et il touche **toute** l'app. Recommandation : viser un **socle d'accessibilité vérifiable (WCAG AA)** avant lancement, puis approfondir vague par vague, plutôt que de tout bloquer.

### 4.3 Gouvernance des données — confidentialité **et** exactitude

Trois engagements, dérivés de tes consignes :

1. **Protection & anonymisation** : les données personnelles (prénom, résultats) sont **pseudonymisées avant** tout envoi à un modèle tiers. Aujourd'hui ce n'est pas le cas (cf. §2.2) → à corriger.
2. **Pas d'entraînement subi** : nos échanges **n'entraînent pas** Gemini (à verrouiller côté offre/clé, cf. §2.3).
3. **Notre propre IA** : capitaliser (anonymisé + consenti) pour **l'IA générale EDUFREM** (support du site, etc.) — et pour, à terme, dépendre moins des modèles tiers.

Et le versant **exactitude** : c'est le RAG. La confidentialité protège l'élève ; l'exactitude protège **la confiance** dans le produit. Les deux sont indissociables dans la charte.

---

## 5. Feuille de route pré-lancement (la TODO)

Tu as dit : *« je veux que tout ça soit en place avant de lancer »*. En toute franchise, **certains de ces chantiers sont gros** (RAG, accessibilité totale, IA maison). Tout exiger à 100 % avant le lancement risque de repousser le lancement indéfiniment. Je te propose donc un découpage **Bloquant / Souhaitable / Après** — c'est une recommandation, la décision finale est la tienne.

### Bloquant avant lancement (crédibilité & confiance)

1. **Gouvernance des données — anonymisation.** Texte (appréciations) : ✅ **fait** (jeton `[PRENOM]` navigateur + couche serveur ajoutée le 25/07, déployée). Reste *(effort : moyen)* : le cas des **photos** (registres, bulletins, copies) envoyées à Gemini avec des noms visibles → consentement explicite et/ou fournisseur sans réutilisation des données.
2. **Verrou « no-training » Gemini** *(effort : faible — vérification + réglage)*. Confirmer le tier de la clé, basculer si besoin. Sans ça, on ne peut pas afficher l'engagement.
3. **Garde-fou « l'enseignant garde la main »** — ✅ **déjà en place dans le code** (vérifié le 25/07). L'appréciation IA arrive dans un champ **éditable**, l'enseignant doit **enregistrer**, et le bulletin exige une **signature** explicite ; la génération en lot rappelle « Relisez chaque bulletin avant signature ». Reste à **inscrire ce principe dans la charte** (l'IA propose, l'humain valide ; jamais de note finale « à l'insu »).
4. **RAG EDUFREM — socle (v1)** *(effort : élevé)*. Au minimum : les profs uploadent des cours/manuels, l'IA s'appuie dessus **et cite la source** sur les matières couvertes. C'est ton différenciateur n°1 et la réponse à « l'IA se trompe ». *Peut démarrer sur un périmètre restreint (1-2 matières) pour le lancement.*
5. **Socle accessibilité vérifiable (WCAG AA)** *(effort : élevé)*. Lecteurs d'écran, navigation clavier, contrastes, alternatives texte/audio, mobile léger. Pilier de charte = non négociable dans l'esprit, mais **socle** plutôt que **exhaustivité** pour lancer.

### Souhaitable au lancement (différenciation forte)

6. **Contrôle enseignant du contenu/points d'examen** *(effort : moyen)*. Le prof dit à l'IA le périmètre et la répartition des points.
7. **Mode « esprit critique »** *(effort : moyen)*. L'IA guide/questionne au lieu de livrer ; incarne le pilier 1.
8. **Nouveaux modules — dictée & dissertation** *(effort : moyen-élevé, un module à la fois)*. Sortir du tout-quiz.

### Après le lancement (fondations long terme)

9. **Personnalisation fine des besoins** *(effort : élevé)*. Détection par élève, parcours adaptatifs.
10. **IA générale EDUFREM** *(effort : très élevé)*. Corpus anonymisé + consenti, modèle maison.
11. **Accessibilité — vagues d'approfondissement** *(continu)*. Au-delà du socle AA.
12. **Sobriété/écologie** *(continu)*. Mesure et optimisation des appels IA ; communication honnête.

---

## 6. Points de vigilance de messaging

Trois pièges relevés dans les notes, à éviter dans notre communication :

- **Ne pas dire « enseignant augmenté ».** L'expression est explicitement critiquée (sous-entend que le prof serait « insuffisant », imaginaire transhumaniste). Préférer *« un outil au service de l'enseignant »*, *« l'enseignant garde la main »*.
- **Ne pas survendre la « personnalisation ».** Le mot est perçu comme du marketing creux. Le prouver par des faits (modules, besoins détectés) plutôt que de le répéter.
- **Ne pas prétendre résoudre la crise de l'école** (effectifs, programmes, personnel). Humilité : on est un outil, pas une réponse systémique. C'est ce qui nous rend crédibles face aux sceptiques.

---

## 7. Ce que je te propose comme prochaines étapes

1. Tu **valides / ajustes le découpage** Bloquant / Souhaitable / Après ci-dessus (surtout : es-tu d'accord pour lancer avec un **socle** RAG + accessibilité plutôt que l'exhaustivité ?).
2. Je peux **corriger tout de suite** les deux chantiers rapides et à fort impact : l'**anonymisation avant l'IA** (§2.2) et le **garde-fou enseignant** — ce sont des gains de confiance immédiats et peu risqués.
3. Pour le **RAG** et l'**accessibilité**, je te prépare, sur ton feu vert, une **note de cadrage** séparée (périmètre v1, architecture, effort) avant d'écrire la moindre ligne — ce sont de gros morceaux, autant les cadrer proprement.

*Les freins ci-dessus (§3.1 et 3.2) sont directement réutilisables comme accroches dans les pages produit MAPO/MAPO+ et les argumentaires. Dis-moi si tu veux que j'en tire une version « page marketing ».*
