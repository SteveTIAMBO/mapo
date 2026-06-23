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

- MIAPO+ **personas** : mode apprenant (élève/étudiant autonome) vs parent.
- Boucle **Carré → MIAPO+** : cours capté → test de compréhension → programme de
  remédiation sourcé (le moat).
- **Suivi enseignant anonyme** : onglet « Révisions » → « Suivi », remontées anonymes
  (identité opt-in) → le prof adapte le cours suivant.
- **Verticales** : auto-école (révision du permis), université.
- **Abonnement B2C** via CinetPay (gating de l'accès MIAPO+).
- **Vocal / WhatsApp** parents, **copilote directeur proactif** (détection décrochage).
- **Orientation** : approfondir les données réelles + validation institutionnelle
  (IRIIG, conseiller d'orientation, ONEFOP, Campus France).

---

### Journal des arbitrages
- 2026-06-19 : recentrage sur les 3 éditions (Steve). Vision MIAPO+ élargie (personas,
  Carré, Suivi enseignant, verticales) **parquée en P2**.
- 2026-06-19 (correction) : on ne peut pas faire le classeur d'onboarding Primaire avant
  l'édition Primaire (Steve, à raison). Le classeur **accompagne** chaque édition. Ordre
  P0 corrigé : créer l'édition **Primaire** d'abord (priorité), puis son classeur ;
  Secondaire (édition existante) → classeur prêt rapidement ; Supérieur ensuite.
