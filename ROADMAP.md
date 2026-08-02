# MAPO — Roadmap priorisée (source de vérité)

> Règle anti-dérive : **on suit cette liste, dans l'ordre.** Toute nouvelle idée est
> ajoutée en **P2** (parking), pas exécutée à chaud. On ne démarre un chantier P2 que
> lorsque les P0 sont atteints. Un seul gros chantier à la fois.
>
> Dernière mise à jour : 2026-06-19.

## 🎯 Objectif court terme
**Avoir les 3 éditions MAPO en beta utilisable : Primaire, Secondaire, Supérieur.**
Tant que ce n'est pas le cas, on n'ajoute pas de nouvelle grande fonctionnalité — on
rend les éditions complètes et utilisables pour onboarder de vraies écoles.

---

## P0 — Rendre les 3 éditions utilisables ✅ ATTEINT (2026-06-22)

> 🎉 Les 3 éditions sont à beta utilisable. Le focus bascule sur P1 (consolider) puis P2.

1. **✅ Édition PRIMAIRE distincte** — édition `primaire` séparée : terminologie
   (écolier/maître/bulletin), structure SIL → CM2, 10 disciplines APC par domaine,
   bulletin **trimestriel A/ECA/NA** + mode /20 (choix à la création), démo cohérente
   (254 écoliers, notes seedées), emploi du temps, **classeur d'onboarding** Primaire.
2. **✅ Édition SECONDAIRE — finalisée** : parcours complet vérifié (effectifs synchronisés,
   bulletins null-safe, examens protégés, pas de cruft) + classeur d'onboarding.
3. **✅ Édition SUPÉRIEUR — beta** : **système LMD africain** (Licence/Master/**Doctorat**),
   **crédits** + notation /20 + mentions TB/B/AB/P, **FCFA**, **université multi-facultés**
   (Gestion + Droit + École doctorale), démo = Université EDUFREM.

## P1 — Consolider l'existant déjà déployé (stabiliser, pas étendre)

- **Déploiement GitHub automatique** ✅ fait (push → build → LWS). À généraliser aux
  autres projets EDUFREM.
- **Paiement CinetPay** : ouvrir le compte marchand + coller les clés en prod
  (`mapo-pay-config.php`, mode live) → débloque le business model (commission sur flux).
- **Alertes WhatsApp** : passer à un expéditeur WhatsApp dédié en prod (la sandbox
  Twilio livre mal le +237).
- **MIAPO+ B2C** (app multi-sections, orientation 6C, banque d'exercices) ✅ déployé →
  publier la **règle Firestore `quizBank`** (économie de tokens).
- **MIAPO+ standalone** ✅ déployé + vérifié live 2026-06-27 (`miapo.app-edufrem.com`,
  accueil dédié Parent/Élève, tenant confiné). RESTE : (a) **branding interne** —
  une fois entré, la sidebar/header dit encore « MAPO » → rebrander MIAPO+ sur le
  tenant miapo ; (b) **SSO école→MIAPO+** (provisionner parent+enfant liés à l'école
  qui ouvrent MIAPO+ avec leurs données) = vrai chantier backend, à séquencer (P2).
- **Copilote MIAPO** ✅ déployé → harmoniser les effectifs de classes de la démo (page
  Classes affiche encore 915).

## ⭐ Feuille de route MAPO annoncée PUBLIQUEMENT (badges « À venir » / « Bientôt ») — à livrer vite

> **Source de vérité = la page ERP `edufrem.com/services/erp-scolaire/`, section « CE QUI ARRIVE — La feuille de route, au plus près du terrain ».** Ces 4 briques portent un badge **« À VENIR »** public → priorité HAUTE (déployer vite). Relevé 2026-06-22. (Steve : « va voir la page ERP pour les fonctionnalités bientôt sur MAPO ».)
>
> 1. **Paiement Mobile Money** — « Orange Money, MTN MoMo, Wave et Moov directement dans le module Finance. Le vrai levier du recouvrement en Afrique. » → = [[project_cinetpay_paiement]] (proxy existe) ; ⚠️ BLOQUÉ sur compte marchand (action Steve).
> 2. **Suivi du décrochage** — « Détecter tôt les élèves qui décrochent à partir de l'assiduité et des résultats, et alerter avant qu'il ne soit trop tard. » → **BUILDABLE TOUT DE SUITE** (données présences + notes déjà en base, pur front) = copilote directeur proactif. **← meilleur 1er livrable (dans mon contrôle).**
> 3. **Diplômes vérifiables** — « À partir de 2027, émission native de diplômes signés cryptographiquement, déposés dans le coffre-fort EDUFREM de chaque diplômé. » → le moat (W3C/EBSI, PAS blockchain). Plus tard (2027).
> 4. **Robustesse renforcée** — « Synchronisation par lots, mode ultra-léger en données et résilience aux coupures de courant et de réseau. » → infra offline-first.

---

## (Contexte écosystème) Autres « Bientôt » du site edufrem.com — PROMESSES PUBLIQUES

> Relevé 2026-06-22 sur edufrem.com (menu Services). Portent un badge **« Bientôt »** PUBLIC
> → priorité HAUTE (à traiter avant le reste de P2). Archi produit EDUFREM : **MiAPO** (IA
> éducative) · **MAPO** (ERP) · **NOVA** (pilotage) · **ARIS** (financement) · **EDU** (crédit éducatif).

1. **MiAPO+, le tuteur de l'enfant** (Familles — « Révisions et orientation par l'IA »).
   → = le MIAPO+ B2C de MAPO, **DÉJÀ largement construit** (tuteur quiz, orientation 6C, lecture
   de copies, mode apprenant). Le plus proche du « live » → finaliser/polir et basculer le badge.
2. **Suite « Diplômes vérifiables / infalsifiables »** (le moat — crédentiels W3C/EBSI, PAS blockchain) :
   - **Émettre des diplômes** (Écoles — « infalsifiables, gratuit ») → module MAPO naturel (l'école a les données).
   - **Coffre-fort à diplômes** (Familles — « retrouver et partager ses diplômes ») → portefeuille étudiant.
   - **Vérifier un diplôme** (Entreprises « authentifier un candidat » + Institutions « visas & équivalences ») → page de vérification publique.
   → MVP déployable = **Émettre (MAPO) + Vérifier (page publique)** ; Coffre-fort ensuite.
3. **Transfert scolarité** (Familles — « scolarité, fournitures, cantine ») → produit fintech **EDU**
   (crédit éducatif) ; lié à CinetPay/Stripe, backend + plus lourd, probablement hors MAPO core.

## P2 — Incréments APRÈS les 3 betas (parking — ne pas démarrer maintenant)

### 🟢 Personnalisation adaptative MIAPO+ (inspiré MIA Seconde / Flowers-Inria) — **GREENLIT dev par Steve 2026-07-31**
> Exception assumée à la règle de parking : Steve a validé le démarrage du dev côté **MAPO+**.
> Fond scientifique : étude Flowers/Inria (équipe Oudeyer) — séquençage IA « progrès d'apprentissage » (ZPDES) = **+17,4 %** de réussite/activité vs **+2,1 %** pour des playlists faites main (35 000 élèves). Voir docs livrés : *Charte de sourcing & provenance v1* + *Inspiration MIA Seconde → priorités*.
> Moat : **IA qui séquence + contenu enseignant validé + liaison école.**
>
> - **[MAPO+] P2a — ELO propre (élève × matière) + éval initiale** *(EN COURS)* : vrai Elo par apprenant/matière, mis à jour à chaque révision (K-factor élevé au début = éval du niveau de base, puis stabilisé), + historique pour la courbe. Socle de tout le reste. Extension de `recordResult`/`getLevel` (tuteur store).
> - **[MAPO+] P2b — Séquenceur « progrès d'apprentissage »** : choisit la prochaine activité en visant la ZPD (~70 % de réussite) + objectifs à fort progrès + exploration. Bandit léger. Le cœur (+17 %). ⟵ **précise/remplace** le parking « Apprentissage adaptatif par STYLE » (on garde format+difficulté+répétition espacée, on ajoute le séquençage LP).
> - **[MAPO+] P2c — Suivi apprenant/parent** : courbe Elo, radar couverture×réussite, activités bloquantes. **➜ remonte AUSSI vers l'école le cas échéant** (élève relié) ⟵ **rejoint** le parking « Suivi enseignant anonyme » + « SSO école→MIAPO+ ». Alimente aussi le **radar 6C** (parking 6C).
> - **[MAPO] Réception du suivi côté école** : le pont mapo-lien fait remonter la progression MIAPO+ des élèves reliés → l'enseignant voit l'activité de révision. Puis **P5 analytics enseignant** (trajectoires classe, goulots).
> - **[MAPO+] P3 — Calibrage difficulté du contenu par les enseignants** (Elo initial par exercice) + **banque hors-ligne étiquetée par provenance** (charte) — démarre avec le **réseau enseignants « contributeurs fondateurs bénévoles reconnus »** (validation + calibrage ; reconnaissance/attribution, pas de rému au départ).
> - **[transversal] Mesure d'impact** : suivre notre propre « +% de réussite » (comme l'étude) = preuve pour le commercial + boussole produit.

### 🟠 Architecture MAPO+ « propre » (structurant — GREENLIT dev par Steve 2026-08) — CONCEVOIR AVANT DE CODER
> Deux chantiers structurants, à modéliser proprement **par secteur géographique × niveau scolaire × utilisateur** :
> - **[MAPO+] Modèle « famille »** : le parent crée SON compte (infos parent seules) ; module « Mes enfants » → ajouter un enfant → **provisionnement serveur d'un vrai compte enfant** (email+mdp choisis par le parent, `emailVerified=true` → pas d'activation) + **lien magique** partageable (WhatsApp). Compte enfant relié (`parentUid`) : le parent voit le suivi, suggère des révisions, règle l'objectif (matière/global) ; « Passer le téléphone à Awa ». Migration depuis « enfants = profils locaux ». (Contrainte : le mécanisme est du code produit ; aucun identifiant saisi par l'assistant.)
>   - ✅ **Lien magique livré (2026-08, commit a76bc28)** — approche *encore plus simple que le spec* : `mapo-famille.php` forge un **jeton personnalisé Firebase** (UID enfant stable = f(ownerUid, enfantId)) → l'enfant clique le lien WhatsApp, il est **connecté sans inscription NI mot de passe** (donc rien à saisir par le parent non plus). Scellage via le flux `redeemInvite` existant (0 règle Firestore modifiée). Vérifié en prod : déploiement, clé SA présente/valide, OAuth+lecture Firestore OK, échec propre sur code invalide. **Reste à tester** : clic réel sur un 2e appareil (acceptation du jeton par Firebase).
>   - Reste du modèle famille : « Mes enfants » (existe déjà comme section, à ériger en module dédié dès la création de compte parent), objectif **par matière** (aujourd'hui global), « suggérer une révision » parent→enfant, migration. « Passer le téléphone » : déjà en place (`MiapoProfilSwitch`).
> - **[MAPO+] Notation multi-régime** : **France collège = évaluation par compétences** (4 niveaux de maîtrise — insuffisante/fragile/satisfaisante/très bonne — codés couleur, LSU/socle) ; **lycée FR = notes** ; **Afrique = notes**. Abstraction `evalMode ∈ {notes, competences}` résolue par (pays × niveau), surchargeable. Un **niveau d'acquisition interne commun** alimente le moteur (faiblesses, Elo, séquenceur) ; import + affichage + objectif s'adaptent au mode. Pas de `if pays==FR` éparpillés.

- MIAPO+ **personas** : mode apprenant (élève/étudiant autonome) vs parent.
- Boucle **Carré → MIAPO+** : cours capté → test de compréhension → programme de
  remédiation sourcé (le moat).
- **Suivi enseignant anonyme** : onglet « Révisions » → « Suivi », remontées anonymes
  (identité opt-in) → le prof adapte le cours suivant.
- **6C : radar + commentaires enseignant par évaluation** (idée Steve 2026-06-24) :
  (a) afficher les 6 compétences en RADAR (aujourd'hui = barres dans MiAPO+ orientation,
  `MiapoOrientation.vue .profil-recap`) ; (b) en contexte ÉCOLE, chaque enseignant peut
  commenter/noter les 6C à chaque évaluation → ces apports ALIMENTENT le radar 6C de
  l'élève (profil validé par les profs, plus seulement auto-évalué). Relie 6C IRIIG +
  Suivi enseignant + boucle Carré. = vrai chantier (modèle de saisie 6C par éval +
  agrégation + radar côté élève/parent ET prof), pas une retouche.
- **Verticales** : auto-école (révision du permis), université.
- **Abonnement B2C** via CinetPay (gating de l'accès MIAPO+).
- **Vocal / WhatsApp** parents, **copilote directeur proactif** (détection décrochage).
- **Orientation** : approfondir les données réelles + validation institutionnelle
  (IRIIG, conseiller d'orientation, ONEFOP, Campus France).
- **Signature DIPLÔMES par ÉCOLE** (Steve 2026-06-27 « chaque école doit signer SES
  diplômes ») : aujourd'hui = 1 clé EDUFREM plateforme (MVP livré). Cible = chaque école
  signe avec SA propre identité — soit une paire de clés per-école (clé publique stockée
  dans le doc `schools/{id}`, la vérif récupère la clé de l'école émettrice), soit la
  plateforme atteste une école AUTHENTIFIÉE (signature liée au schoolId vérifié + jeton
  Firebase sur `mapo-sign.php`). = productisation du moat. **Prochain pas naturel des diplômes.**
- **MIAPO voix** (Steve 2026-06-27) : vraie voix IA pour lancer une révision LIVE / donner
  des instructions vocales (TTS en sortie + STT en entrée). Faisable (Web Speech API
  gratuite, ou TTS cloud pour la qualité). Fort différenciant, aligné « vocal Afrique /
  parents peu lettrés » [[project_roadmap_conquete_afrique]].
- **Langue locale** (Steve 2026-06-27) : révisions/tuteur en langues locales (contenu IA
  faisable via Gemini, qualité variable sur langues africaines ; traduction d'UI = plus
  gros chantier). À combiner avec MIAPO voix.
- **Apprentissage adaptatif par STYLE** (Steve 2026-06-27) : le module de révision s'adapte
  au style auto-évalué de l'apprenant. Réaliste = adapter le FORMAT (QCM / question libre /
  audio-vocal) + difficulté + répétition espacée. ⚠️ Le « visuel » (générer une image par
  question) = lourd/coûteux → on privilégie format-adaptation + répétition espacée plutôt
  qu'une pédagogie disruptive à base d'images (instinct Steve validé).

---

### Journal des arbitrages
- 2026-06-19 : recentrage sur les 3 éditions (Steve). Vision MIAPO+ élargie (personas,
  Carré, Suivi enseignant, verticales) **parquée en P2**.
- 2026-06-19 (correction) : on ne peut pas faire le classeur d'onboarding Primaire avant
  l'édition Primaire (Steve, à raison). Le classeur **accompagne** chaque édition. Ordre
  P0 corrigé : créer l'édition **Primaire** d'abord (priorité), puis son classeur ;
  Secondaire (édition existante) → classeur prêt rapidement ; Supérieur ensuite.
- 2026-07-31 : après l'étude MIA Seconde (Flowers/Inria) apportée par Steve, lancement du
  chantier **Personnalisation adaptative MIAPO+** (Elo → séquenceur → suivi → remontée
  école). Steve **greenlit le dev côté MAPO+** (exception au parking) et acte que le
  **suivi alimentera aussi l'école** de l'apprenant relié. Réseau enseignants = modèle
  **bénévoles reconnus comme co-constructeurs**. Démarrage : **P2a (Elo propre)**.
