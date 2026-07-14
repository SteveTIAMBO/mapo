# Paiement Tranzak — intégration MAPO

Ajout de **Tranzak** (fintech camerounaise, MTN MoMo + Orange Money, XAF) comme
processeur d'encaissement de MAPO, à côté de CinetPay, derrière la même couche
« paiement » agnostique (mêmes actions `init` / `check` + webhook).

> ✅ **Adaptateur vérifié conforme à la spec officielle Tranzak** (guide commercial
> + docs.developer.tranzak.me, relu le 12/07/2026) : base URLs, `/auth/token`
> `{appId, appKey}`, `/xp021/v1/request/create-mobile-wallet-charge`,
> `/xp021/v1/request/details`, enveloppe `{data, success}`, statuts
> `PENDING / SUCCESSFUL / PAYER_REDIRECT_REQUIRED`, webhook `REQUEST.COMPLETED` + `authKey`.

## Contenu du dossier

- **`CADRAGE-TRANZAK.md`** — le document de fond (architecture, business, points à négocier).
- **`mapo-pay-tranzak.php`** — l'adaptateur (proxy serveur). Prêt, conforme spec.
- **`mapo-pay-tranzak-config.php`** — config RÉELLE (contient la clé sandbox). **Ne jamais committer.**
- **`mapo-pay-tranzak-config.example.php`** — le modèle.
- **`test-tranzak-sandbox.php`** — test bout-en-bout sandbox (auth → charge → statut).

## Valeurs déjà renseignées dans la config

| Clé | Valeur |
| --- | --- |
| `TRANZAK_APP_ID` | `apm8fgli80f0d1` |
| `TRANZAK_APP_KEY` | `SAND_…` (clé sandbox fournie) |
| `TRANZAK_MODE` | `SANDBOX` |
| `FIREBASE_PROJECT` | `mapo-edufrem` |
| `TRANZAK_WEBHOOK_KEY` | *(vide — à remplir après création du webhook, étape 3)* |

## Déploiement (action Steve — je ne dépose rien sur le serveur)

1. **Vérifier le scope** de l'appKey sur le portail (https://biz.tranzak.me → Portail développeurs) :
   il faut le scope **`collections`** activé sur l'app sandbox.
2. **Déposer 2 fichiers** dans `public_html/mapo/` :
   - `mapo-pay-tranzak.php`
   - `mapo-pay-tranzak-config.php`
   Puis **protéger la config** dans le `.htaccess` de `public_html/mapo/` (comme pour CinetPay) :
   ```apache
   <Files "mapo-pay-tranzak-config.php">
     Require all denied
   </Files>
   ```
3. **Créer le webhook** sur le portail (onglet *Webhooks* → *Add webhook*) :
   - Event(s) : `*` (ou au moins `REQUEST.COMPLETED`)
   - URL : `https://mapo.app-edufrem.com/mapo-pay-tranzak.php`
   - Match App : l'app sandbox
   - **Generate auth key** → copier la clé générée dans `TRANZAK_WEBHOOK_KEY` du fichier de config, puis re-déposer la config.

## Test sandbox (une commande)

Sur le serveur (ou en local avec PHP), à côté du fichier de config :

```
TRANZAK_TEST_NUMBER=<numéro de test « succès » du portail> php test-tranzak-sandbox.php
```

Le portail sandbox fournit des numéros fictifs qui simulent SUCCESSFUL / FAILED / PROCESSING.
Attendu : `HTTP 200` à l'auth, un `requestId` renvoyé, un statut lisible. **Noter le champ `fee`** (la commission réelle par transaction — l'équivalent des 1,5–3,5 % CinetPay à comparer).

## Après validation sandbox (côté dev, moi)

Brancher l'adaptateur au front derrière la couche paiement (choix CinetPay vs Tranzak),
puis passer `TRANZAK_MODE` à `PRODUCTION` avec l'appKey `PROD_…` le moment venu.
