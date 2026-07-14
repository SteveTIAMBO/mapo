# RDV commercial Tranzak — questions pour valider nos cas d'usage
_EDUFREM / MAPO — 14/07/2026_

**Nos cas d'usage à valider :**
1. Les **parents paient la scolarité en ligne** (mobile money + carte) dans MAPO.
2. **EDUFREM est une plateforme multi-écoles** : on encaisse pour le compte de N écoles.
3. **EDUFREM prélève une commission sur chaque flux** — idéalement au moment du paiement (split), sans que l'école ait à nous reverser.
4. Plus tard : **abonnement B2C récurrent** (MIAPO+ pour les parents) + **réseau d'agents** commissionnés.

---

## PRIORITÉ ABSOLUE — les 6 questions qui valident (ou invalident) le modèle
_Si tu ne poses que celles-là, pose celles-là._

1. **Marketplace / multi-marchand** — EDUFREM peut-il opérer en **compte maître + sous-comptes marchands par école** (modèle agrégateur/plateforme), avec règlement propre à chaque école ? Ou chaque école doit-elle ouvrir son propre compte Tranzak ?
2. **Split automatique** — Sur chaque paiement de scolarité, pouvez-vous **répartir automatiquement** les fonds entre l'école (sa part) et EDUFREM (notre commission), **en % et/ou montant fixe**, par transaction ?
3. **Commission à la source** — Notre commission est-elle **prélevée automatiquement au split** (l'école ne nous doit jamais rien) ? Peut-on la **paramétrer par école** ?
4. **Onboarding des écoles** — Documents KYC exigés + **délai d'activation** ? EDUFREM peut-il **enrôler les écoles à leur place via API** ? Une **école informelle** (sans RCCM/société) peut-elle recevoir des fonds sur un simple **wallet MoMo** au nom du promoteur ?
5. **Versement à l'école** — Destination (compte bancaire / wallet MoMo), **délai de règlement** (J+1 ? J+2 ?), automatique ou à la demande ?
6. **Cadre réglementaire** — Qui porte l'agrément (BEAC / établissement de paiement) ? **EDUFREM a-t-il besoin d'un agrément** pour agréger des flux de tiers, ou Tranzak couvre ce volet ? _(risque juridique n°1)_

---

## Checklist complète par thème

### A. Encaissement — couverture
- Opérateurs mobile money couverts : **MTN MoMo, Orange Money** (Cameroun) ? Autres ?
- Pays couverts aujourd'hui : **Cameroun, Sénégal, Côte d'Ivoire** ? Devises **XAF / XOF** ?
- **Cartes bancaires** (Visa / Mastercard) ?
- Canaux : redirection web, API directe, **lien de paiement**, **QR code**, USSD ? _(on utilise redirection + webhook)_
- Plafonds de transaction (montant max, limites jour/mois) ? _(scolarités parfois élevées)_

### B. Frais — la négociation
- Frais exacts **par canal** : % + fixe pour **MoMo**, pour **carte** ?
- **Dégressif au volume** ? À partir de quel seuil ? _(on vise beaucoup d'écoles = gros flux)_
- Qui supporte les frais : **école, parent** (frais ajoutés au paiement) ou EDUFREM ?
- Frais sur les **versements/retraits** (payout) ? Frais de **conversion** si multi-devise ?
- Réf. marché à opposer : CinetPay ~**1,5–3,5 %** → on négocie mieux au volume.

### C. Récurrent & B2C (MIAPO+)
- **Paiements récurrents / abonnements** (prélèvement mensuel automatique) supportés sur **MoMo et carte** ?
- **Tokenisation / paiement en 1 clic** pour le réabonnement ?

### D. Fiabilité technique _(on a déjà intégré le sandbox)_
- **Webhooks** de confirmation : fiabilité, **retries, idempotence**, liste des statuts ?
- **Remboursements** total/partiel via API ?
- **Parité sandbox ↔ production** ? Limites de débit API ? Versionnage de l'API ?
- **Réversibilité** : peut-on récupérer nos données / changer de PSP sans casse ?

### E. Contrat & commercials
- **Frais de mise en service** ? **Abonnement mensuel** ? **Minimum mensuel** ?
- **Durée d'engagement** ? **SLA** de disponibilité (uptime) ?
- **Support** : canal, délai de réponse, langue (FR) ?
- Prérequis + **délai pour passer en production** (go-live) ?

---

## Signaux d'alerte à écouter (red flags)
- « Chaque école doit ouvrir son propre compte » → **casse le modèle plateforme** (onboarding lourd, pas de split centralisé).
- « Pas de split automatique » → on devrait **facturer les écoles a posteriori** (impayés, trésorerie) — au lieu du prélèvement à la source.
- « KYC société obligatoire » sans option wallet → **exclut les écoles informelles** (une grosse part du marché).
- Délai de règlement long (> J+3) → **frein d'adoption** (les écoles veulent leur argent vite).

## À demander en repartant
- Accès **doc API à jour** + **grille tarifaire écrite**.
- Un **contact technique** dédié.
- Le **process + délai** d'activation d'un compte marchand école.
