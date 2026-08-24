# MAPO — Roadmap priorisée (source de vérité)

> **Règle anti-dérive : on suit cette liste, dans l'ordre.** Toute nouvelle idée est
> ajoutée en **parking**, pas exécutée à chaud. Un seul gros chantier à la fois.
>
> Dernière mise à jour : **2026-08-24**, après vérification fait par fait.
> La version précédente datait du 19/06 et **706 commits** l'avaient rendue fausse :
> elle parquait des chantiers déjà en production et annonçait comme « à venir » des
> modules livrés. Une carte fausse est pire qu'une carte absente — on priorise
> dessus sans le savoir.

---

## ⚠️ Le fait qui domine tout le reste

**Aucune école réelle n'existe.** Mesuré en console Firestore le 23/08/2026 : la
collection `schools` est **absente**. Les seules données de la base sont `ligues`,
`mapoplus_users`, `quizBank`, `superAdmins` et `users`.

Conséquence à garder en tête à chaque arbitrage : **tout l'ERP est livré mais
jamais exercé en conditions réelles.** « Livré » ci-dessous veut dire déployé et
vérifié en démonstration ou sur MAPO+ — pas éprouvé par un établissement qui s'en
sert. Chaque fonctionnalité ajoutée avant la première école agrandit la surface de
ce qu'on *croit* qui marche.

---

## P0 — La première vraie école

Le seul geste qui transforme un logiciel testé en logiciel utilisé, et qui exerce
d'un coup tout ce qui n'a jamais tourné : provisioning, sous-domaine, onboarding,
comptes du personnel, inscription validée → invitation MAPO+ → devoirs, notes et
bulletins côté famille.

- Accord du gouverneur de l'Extrême-Nord obtenu ; 2 à 5 écoles visées.
- `mapo-provision.php` (`create_subdomain`) est opérationnel.
- **Reste : choisir l'établissement et créer le tenant.** Demande une décision de
  Steve (nom, édition, pays, personnel de départ), pas du code.
- À faire dans la foulée, en réel et non en démo : valider une inscription et
  vérifier que la famille reçoit son accès, ouvre MAPO+ et voit les devoirs.

---

## Bloqué chez Steve (rien à coder tant que ce n'est pas fait)

- **Compte marchand paiement** → colle les clés en prod, passe en mode live.
  C'est le levier du recouvrement, et c'est **annoncé publiquement** sur
  edufrem.com. Le proxy et les deux prestataires (Tranzak, Stripe) sont câblés.
  ⚠️ Un store s'appelle encore `cinetpay.js` alors que le prestataire retenu est
  **Tranzak** : nom trompeur à corriger un jour, sans urgence.
- **Expéditeur WhatsApp dédié** → sans lui, la relance des parents reste un clic
  manuel (la sandbox Twilio délivre mal le +237).

---

## P1 — Finir ce qui est à moitié tenu

1. **Envoi automatique de l'invitation MAPO+.** L'invitation naît toute seule à la
   validation d'une inscription (livré le 23/08), mais l'expédition n'est
   automatique que s'il existe une adresse e-mail — or elle est **facultative** à
   l'inscription et rare sur le marché visé. Reste : une action serveur
   d'expédition, autorisée par un contrôle de **membre de l'école**, qui envoie au
   destinataire **lu dans l'invitation** (jamais fourni par la requête, sinon le
   point d'envoi devient un relais ouvert).
2. **Basculer les badges du site** pour ce qui est livré : suivi du décrochage,
   émission et vérification de diplômes. Laisser un badge « à venir » sur du livré
   nous fait passer pour en retard.
3. **Robustesse renforcée** (promesse publique) : le socle PWA est là (workbox,
   `runtimeCaching`, `autoUpdate`). Restent la **synchronisation par lots** et le
   **mode ultra-léger en données**, qui sont le vrai sujet en Afrique.

---

## Parking — à ne pas démarrer avant la première école

### Le moat
- **Chaque école signe SES diplômes.** Aujourd'hui : une clé EDUFREM unique
  (`mapo-sign.php`), émission et vérification publiques livrées. Cible : une
  identité par établissement. N'a de sens qu'avec des écoles qui émettent.
- **Mesure d'impact du séquenceur** : notre propre « +% de réussite », à la manière
  de l'étude Flowers/Inria. Autant un argument commercial qu'une boussole produit.
- **Boucle Carré → MAPO+** : cours capté → test de compréhension → remédiation
  sourcée.

### MAPO+ / MIAPO
- Notation multi-régime : **étapes 1 et 2 en production** ; reste l'évaluation par
  compétences du collège français (4 niveaux de maîtrise, LSU).
- 6C : radar + commentaires enseignant par évaluation.
- Voix (TTS/STT) au-delà du module Dictée, langues locales en **interface**
  (jamais en remplacement du français — cf. la fiche dédiée).
- Persistance Firestore du copilote MIAPO.
- Verticales : auto-école, université.

### ERP
- Modules non démarrés, par ordre : Chatbot, LMS, Orientation, Ring mobilité,
  Mérite/bourse.
- i18n : shell + 10 modules faits ; restent Personnel, Compta, Messagerie,
  Supérieur.
- Supérieur : devise EUR → FCFA, Doctorat, multi-facultés.
- Complexe scolaire multi-écoles (vue « groupe » sur N sous-tenants).

---

## Acquis — pour ne plus les reprogrammer

**Les trois éditions** (Primaire, Secondaire, Supérieur) sont en beta utilisable.

Livré et vérifié depuis le 19/06, absent de l'ancienne roadmap ou classé à tort :

- **Déploiement** : `git push` → CI → FTPS. Plus aucune manipulation cPanel.
- **Suivi du décrochage** (promesse publique) — module livré.
- **Diplômes** : émission côté école + page publique de vérification.
- **Adaptabilité par école** : périodes déclarées (trimestres ou semestres),
  modules à la carte sans socle imposé, niveaux déclarés par l'école, disciplines
  du primaire modifiables, barème et mentions réglables.
- **Multi-pays** : démonstration entièrement localisée (Cameroun, Congo, Sénégal,
  France), fiches de paie par pays, catalogue de matières par pays et par classe,
  référentiels officiels France et Cameroun.
- **Cahier de préparation** (demandé par Shakespeare Academy).
- **Séquenceur ZPD**, jauge de progression, banque de quiz partagée, points et
  récompenses — en production côté MAPO+.
- **Frontière MAPO / MAPO+ tranchée (23/08)** : le portail parent et élève de l'ERP
  est retiré, les familles vivent dans MAPO+, et l'école ouvre leur accès
  automatiquement à la validation d'une inscription.
- **Règles Firestore** : la section MOBI, qui ne gardait aucune donnée, est
  supprimée et publiée. Le fichier du dépôt est désormais la source déployable.

---

## Journal des arbitrages

- **2026-08-24** — Steve demande de rafraîchir cette roadmap avant de choisir la
  suite, plutôt que de prioriser sur une carte fausse. Réécriture après
  vérification fait par fait. Constat mis en tête : aucune école réelle.
- **2026-08-23** — MAPO ne s'adresse plus aux familles : portail parent/élève
  retiré de l'ERP, pont école → MAPO+ automatique, règles MOBI supprimées.
- **2026-07-31** — Chantier « personnalisation adaptative » lancé après l'étude
  MIA Seconde (Flowers/Inria) apportée par Steve. Le suivi alimente aussi l'école
  de l'apprenant relié.
- **2026-06-19** — Recentrage sur les trois éditions ; vision MIAPO+ élargie
  (personas, Carré, suivi enseignant, verticales) parquée.
