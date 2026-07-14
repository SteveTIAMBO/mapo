# MAPO x Tranzak : cadrage d'intégration

*Note technique et produit, 10 juillet 2026. Objectif : cadrer l'ajout de Tranzak comme processeur de paiement dans MAPO et MIAPO+, à côté de CinetPay, via une couche « paiement » agnostique. Source API : docs.developer.tranzak.me (lue intégralement) + lib Node communautaire tranzak-node.*

---

## 1. En une page

**Ce qu'on fait** : on garde CinetPay, et on ajoute **Tranzak comme deuxième adaptateur** derrière une interface interne unique (`init` / `check` / `webhook`). L'application ne parle jamais directement à un prestataire : elle parle à notre couche, qui route vers CinetPay ou Tranzak selon le pays et le coût. On isole ainsi MAPO des prestataires et on peut négocier, comparer, basculer sans toucher au produit.

**Pourquoi Tranzak** : acteur **local (Douala)**, XAF natif, vraie API REST propre (collections + payouts), et **commission a priori plus basse que CinetPay** (à obtenir par écrit). Comme on absorbe le pourcentage du processeur sur les tranches 2 et suivantes, **un taux plus bas = directement plus de marge pour nous**.

**Les deux limites à connaître tout de suite** :
1. **Tranzak en charge directe = Cameroun uniquement** (MTN Cameroun, Orange Money Cameroun, en XAF). Pour le **Sénégal** et l'UEMOA (Wave, XOF), Tranzak ne propose pas la charge mobile directe : **on reste sur CinetPay / PayDunya** là-bas. La couche agnostique gère exactement ce cas (routage par pays).
2. **Pas d'abonnement récurrent natif.** Chaque encaissement est une **autorisation ponctuelle** que le parent valide sur son téléphone. Pour la scolarité MAPO (paiement par tranches), c'est parfait. Pour l'**abonnement MIAPO+** des familles, il faudra **re-déclencher un paiement chaque mois** (le parent ré-autorise), il n'y a pas de prélèvement automatique.

**Recommandation** : Tranzak = **candidat n°1 pour le Cameroun** (notre pilote), CinetPay = secours + couverture UEMOA. On teste d'abord en **sandbox** (bac à sable), puis pilote sur 2-3 écoles avant toute bascule.

---

## 2. Ce que Tranzak sait faire (et ne sait pas faire)

| Besoin | Tranzak | Remarque |
|---|---|---|
| Encaisser par MoMo (MTN / Orange **Cameroun**) | Oui, charge directe | Push sur le téléphone du parent |
| Encaisser par carte Visa / Mastercard | Oui, page web hébergée | Redirection |
| Encaisser hors Cameroun (Wave, Sénégal, XOF) | Non en direct | Passer par CinetPay / PayDunya |
| Verser de l'argent (remboursement, commission agent) | Oui, payout unitaire ou en masse (jusqu'à 2 000 destinataires) | À activer séparément sur le portail |
| Abonnement récurrent / prélèvement automatique | Non natif | Re-charge à chaque cycle |
| Multi-devises + change (USD vers XAF) | Oui | Objet `forex` dans la réponse |
| Envoi de SMS | Oui (via le même compte) | Bonus pour nos alertes parents |

**Devise principale** : XAF (franc CFA d'Afrique centrale). **Environnements** : production `https://dsapi.tranzak.me` et **sandbox `https://sandbox.dsapi.tranzak.me`** (bac à sable, avec des numéros de test qui simulent succès/échec).

---

## 3. Architecture cible : la couche « paiement » agnostique

Aujourd'hui, le front (espace parent) appelle un proxy PHP `mapo-pay.php` qui parle à CinetPay. On généralise ce proxy en **routeur** qui délègue à un **adaptateur par prestataire** :

```
  Espace parent (Vue)                    Serveur cPanel (PHP)
  ┌───────────────────┐   POST JSON     ┌──────────────────────────────┐
  │  store paiement   │  action:init /  │  mapo-pay.php  (ROUTEUR)      │
  │  (payments.js)    │──── check ─────▶│  choisit le prestataire       │
  └───────────────────┘                 │  selon pays / config          │
                                        │        │            │         │
                                        │        ▼            ▼         │
                                        │  adaptateur     adaptateur    │
                                        │  CinetPay        TRANZAK      │
                                        └────────┼────────────┼─────────┘
                                                 ▼            ▼
                                            api CinetPay   api Tranzak
```

**Le contrat interne (identique quel que soit le prestataire)** :

- `init(montant, devise, référence, téléphone?, description, return_url)`
  → `{ ok, mode, transaction_id, payment_url? , push? }`
- `check(transaction_id)`
  → `{ ok, status: ACCEPTED | PENDING | REFUSED, montant, méthode }`
- `webhook(payload)` → vérifie l'authenticité, répond 200. **La confirmation qui enregistre réellement le paiement dans MAPO reste un `check` serveur** (le serveur est la source de vérité, on ne fait jamais confiance au navigateur ni au corps brut du webhook). C'est déjà la doctrine du fichier CinetPay actuel, on la garde.

**Routage** : une petite table `pays → prestataire préféré + secours`. Exemple : Cameroun (XAF) → Tranzak, secours CinetPay ; Sénégal / UEMOA (XOF) → CinetPay ou PayDunya (Tranzak non disponible en direct).

---

## 4. Comment ça marche, techniquement

**a) S'authentifier (une fois, puis on met le jeton en cache)**
`POST /auth/token` avec `appId` + `appKey` (la clé sandbox est préfixée `SAND_`, la production `PROD_`). Réponse : un `token` valable ~2 h (`expiresIn` en secondes). On **met le jeton en cache** ~3/4 de sa durée et on le réutilise. Ensuite, chaque appel porte l'en-tête `Authorization: Bearer <token>`.

**b) Encaisser la scolarité (charge directe MoMo, Cameroun)**
`POST /xp021/v1/request/create-mobile-wallet-charge`
```json
{
  "amount": 25000,
  "currencyCode": "XAF",
  "description": "Scolarite 2e tranche",
  "mchTransactionRef": "MAPO-unique-ref",
  "mobileWalletNumber": "2376XXXXXXXX",
  "callbackUrl": "https://mapo.app-edufrem.com/mapo-pay-tranzak.php"
}
```
La demande est **poussée directement sur le téléphone du parent** pour autorisation (code MoMo). Différence importante avec CinetPay : il n'y a **pas de page web de redirection**, donc l'app doit d'abord **récupérer le numéro du parent**, puis afficher « Validez le paiement sur votre téléphone » et **interroger l'état** jusqu'à confirmation. (Pour la carte bancaire ou un pays non-Cameroun, on utilise à la place `POST /xp021/v1/request/create` qui renvoie une URL de paiement hébergée, comme CinetPay.)

**c) Confirmer le paiement**
Trois moyens, complémentaires :
1. Webhook `REQUEST.COMPLETED` (Tranzak appelle notre `callbackUrl` quand c'est payé ou échoué) ;
2. `GET /xp021/v1/request/details?requestId=...` (on interroge l'état) ;
3. `POST /xp021/v1/request/refresh-transaction-status` (force la mise à jour depuis l'opérateur si la notif tarde).
Statuts : `PENDING`, `SUCCESSFUL`, `FAILED`, `CANCELLED`, `PAYMENT_IN_PROGRESS`… On mappe `SUCCESSFUL → ACCEPTED`, `PENDING / PAYMENT_IN_PROGRESS → PENDING`, le reste → `REFUSED`.

**d) Sécuriser le webhook**
Le webhook Tranzak transporte un champ `authKey` (une clé pré-partagée qu'on configure sur le portail). On **compare** l'`authKey` reçu à notre secret, et **en plus** on re-vérifie par un `check` serveur avant d'enregistrer. Ceinture et bretelles.

**e) Verser de l'argent (plus tard)**
`POST /xp021/v1/transfer/to-mobile-wallet` (unitaire) ou l'API de masse `/xp021/v1/payout/*` (jusqu'à 2 000 destinataires). Utile pour **rembourser** un parent ou verser les **commissions des agents**. À activer séparément (« disbursement ») et le compte de payout doit être approvisionné au préalable.

---

## 5. Impact produit

**MAPO (scolarité)** : très bon fit. La scolarité se paie **par tranches ponctuelles**, exactement le modèle « une autorisation à chaque paiement » de Tranzak. Notre règle commerciale (4 % prélevés en totalité sur la 1re tranche) fonctionne à l'identique. Seul changement visible : pour le MoMo Cameroun, on **saisit le numéro dans l'app** puis on affiche « validez sur votre téléphone » (au lieu d'une page de redirection).

**MIAPO+ (abonnement famille 1 000 à 3 000 FCFA/mois)** : deux points à trancher.
1. **Récurrent non natif** : pas de prélèvement automatique. Concrètement, chaque mois, on **renvoie une demande de paiement** que le parent valide (notification push + rappel). C'est le fonctionnement courant du mobile money en Afrique, mais il faut l'assumer dans l'UX (relance mensuelle, et non « débit silencieux »).
2. **Minimum par transaction** : à confirmer par écrit. Un forfait fixe élevé par opération tuerait la marge sur un abo à 1 000 FCFA. Les exemples sandbox montrent des montants aussi bas que 1 XAF, mais le **contrat** fait foi.

---

## 6. Ce que Steve doit faire pour ouvrir le sandbox

Je ne crée pas de compte à ta place (règle de sécurité). Ces étapes te prennent 10 minutes :

1. Aller sur **https://developer.tranzak.me** et **créer un compte marchand** (au nom d'EDUFREM).
2. Créer une **application en mode Sandbox** → récupérer **`appId`** et **`appKey`** (préfixe `SAND_`).
3. Activer le **scope « collections »** (et « disbursement » plus tard si on veut faire des versements).
4. (optionnel pour le test) Configurer un **webhook** vers `https://mapo.app-edufrem.com/mapo-pay-tranzak.php` et noter l'**authKey**.
5. Me transmettre `appId` + `appKey` sandbox (ou les coller dans `mapo-pay-tranzak-config.php`) → **je lance le script de test** fourni (`test-tranzak-sandbox.php`) qui authentifie, crée une charge de test avec un numéro fictif et vérifie le statut. On valide le bout-en-bout avant d'intégrer.

**En parallèle, demande à Tranzak par écrit** (indispensable avant de signer, voir §8) : la grille de commission collections + payouts, le minimum par transaction, le délai de règlement (settlement), les frais de mise en place / mensuels, et le support du récurrent.

---

## 7. Plan d'implémentation

| Étape | Contenu | Effort dev |
|---|---|---|
| 0. Sandbox | Compte + clés (action Steve) puis test bout-en-bout | 10 min + 1 test |
| 1. Adaptateur Tranzak | `mapo-pay-tranzak.php` : `init` (charge MoMo directe) + `check` (details) + webhook (authKey) + cache du jeton | ~1 j (squelette déjà fourni) |
| 2. Front espace parent | Saisie du numéro + écran « validez sur votre téléphone » + interrogation d'état ; réutilise le store paiement | ~0,5 à 1 j |
| 3. Couche agnostique | Transformer `mapo-pay.php` en routeur, CinetPay et Tranzak en adaptateurs, table de routage par pays | ~1 j |
| 4. Pilote | 2-3 écoles au Cameroun en conditions réelles, suivi des règlements et litiges | quelques jours calendaires |

**Total dev : ~2 à 3 jours**, plus la validation pilote. Le squelette PHP et le script de test de ce dossier couvrent déjà l'étape 1 et l'étape 0.

---

## 8. Points à confirmer AVANT de signer

Repris de la note « agrégateur vs intégration directe » et complétés par ce que le sandbox révélera :

- **Commission** collections **et** payouts, **par écrit** (l'argument « meilleur que CinetPay » doit être chiffré). Repères marché : CamPay 2 % fixe, CinetPay 1,8 à 2,2 %.
- **Minimum par transaction** (critique pour l'abo MIAPO+ à 1 000 FCFA).
- **Délai de règlement** (T+combien vers le compte bancaire) et **frais de mise en place / mensuels**.
- **Récurrent** : confirmé non natif → décider si la relance mensuelle est acceptable pour MIAPO+.
- **Couverture réellement LIVE** hors Cameroun : la doc ne documente que MTN/Orange Cameroun en direct. **Pour le Sénégal, on ne compte pas sur Tranzak en direct** ; on garde CinetPay / PayDunya.
- **Remboursements et litiges**, **délai KYC/onboarding**, **SLA / disponibilité**, **banques partenaires et solidité** (fonds en transit).

---

## 9. Fichiers fournis dans ce dossier

- **`CADRAGE-TRANZAK.md`** : ce document.
- **`mapo-pay-tranzak.php`** : squelette d'adaptateur (même forme que `mapo-pay.php` : actions `init` / `check`, webhook, cache du jeton, repli démo). Prêt à tester en sandbox, pas encore branché au front.
- **`mapo-pay-tranzak-config.example.php`** : modèle de configuration (à copier en `mapo-pay-tranzak-config.php`, **jamais committé**, protégé par `.htaccess`). Contient les emplacements pour `appId`, `appKey`, mode, `authKey`.
- **`test-tranzak-sandbox.php`** : script de test en ligne de commande (authentifie, crée une charge de test, interroge le statut). À lancer une fois les clés sandbox obtenues.
- **`README.md`** : mode d'emploi court.

**Secrets** : les clés Tranzak vivent dans `mapo-pay-tranzak-config.php`, **hors dépôt Git** (comme la config CinetPay). On ne committe que les fichiers `.example`.
