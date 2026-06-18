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

## P0 — Rendre les 3 éditions utilisables (FOCUS ACTUEL)

> ⚠️ Constat code : il n'existe que 2 éditions (`secondaire` qui inclut « Secondaire &
> Primaire », et `superieur`). **Aucune édition `primaire` distincte.** Le classeur Excel
> d'onboarding **accompagne chaque édition** (il n'a de sens que si l'édition existe) —
> ce n'est PAS une étape séparée en amont.

1. **⭐ Édition PRIMAIRE distincte (LA priorité)** — créer une vraie édition `primaire`
   (séparée du secondaire) : terminologie (écolier/maître/…), structure SIL → CM2
   (+ équiv. anglophone Class 1-6), matières du primaire, bulletin & moyennes adaptés,
   données de démo. **→ PUIS son classeur d'onboarding Excel.** → **PROCHAINE ÉTAPE**
2. **Édition SECONDAIRE — finaliser** (la plus avancée ; l'édition existe). Vérifier le
   parcours complet (config → personnel → élèves → notes → bulletins → examens) +
   **classeur d'onboarding Secondaire** (prêt rapidement, l'importeur colle déjà).
3. **Édition SUPÉRIEUR — amener à beta** : logique LMD (promotions, UE, crédits,
   semestres), IRIIG pilote + **classeur d'onboarding adapté** (promotions/UE).

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
