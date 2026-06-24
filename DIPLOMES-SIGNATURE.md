# Diplômes vérifiables — passage à l'« infalsifiable » complet

État actuel (déployé) : chaque diplôme a un **code public** + une **empreinte SHA-256**
(intégrité : le contenu ne peut pas être modifié sans casser l'empreinte) + un **registre**
(localStorage en démo, Firestore `diplomas/{code}` pour les vrais comptes). La page publique
`/verifier` confirme « authentique » si le code existe et que l'empreinte est intègre.

Il reste **2 actions côté toi (Steve)** pour atteindre l'infalsifiable de bout en bout +
la vérification **cross-appareils** (un employeur sur un autre ordinateur). Je ne génère
jamais de clé privée ni ne publie de règle Firestore moi-même.

---

## 1. Règle Firestore — lecture publique du registre `diplomas`

Aujourd'hui la vérif cross-appareils ne marche pas (la démo lit le registre local du même
navigateur). En prod, il faut que **n'importe qui** puisse LIRE un diplôme par son code, mais
que **seule l'école** puisse en écrire.

À ajouter dans tes règles Firestore, puis **Publier** (toi, dans la console) :

```
match /diplomas/{code} {
  allow read: if true;                       // vérification publique par code
  allow create, update: if request.auth != null
    && request.resource.data.schoolUid == request.auth.uid;  // seule l'école émet/révoque
  allow delete: if false;                     // on ne supprime pas un diplôme (on révoque)
}
```

Une fois publiée, `lookup(code)` de la page `/verifier` trouvera le diplôme même sur un
autre appareil. (Le code côté app écrit déjà `schoolUid` à l'émission.)

## 2. Signature cryptographique (authenticité de l'émetteur)

L'empreinte prouve l'**intégrité** ; la **signature** prouve que c'est bien EDUFREM/l'école
qui a émis (un faussaire ne peut pas fabriquer un diplôme passant la vérif sans la clé privée).
On signe **côté serveur uniquement** (la clé privée ne doit jamais arriver dans le navigateur).

### Ce que tu fais (une fois)
1. Générer une paire de clés **Ed25519** (rapide, courtes). Par ex. en PHP :
   `sodium_crypto_sign_keypair()` → garder la **clé privée** secrète.
2. La déposer dans un fichier **non versionné** sur le serveur (comme `mapo-pay-config.php`
   pour CinetPay), p. ex. `mapo-sign-config.php` :
   ```php
   <?php
   // NE PAS committer. chmod 600.
   define('DIPLOMA_SIGN_SECRET_KEY_HEX', '....'); // sortie de sodium_bin2hex(secret)
   define('DIPLOMA_SIGN_PUBLIC_KEY_HEX', '....');  // public (peut être affiché)
   ```
3. Me communiquer la **clé publique** (elle est publique) pour que je la mette dans l'app.

### Ce que je fais (dès que la clé est en place)
- Un proxy `mapo-sign.php` (dans `public_html/mapo`) : reçoit le contenu canonique d'un
  diplôme, renvoie `sodium_crypto_sign_detached(contenu, secret)` (signature hex).
- À l'émission : l'app appelle ce proxy et stocke `signature` dans le diplôme (champ déjà prévu).
- À la vérif : la page `/verifier` vérifie la signature avec la **clé publique** embarquée
  (`sodium_crypto_sign_verify_detached` côté PHP, ou WebCrypto/tweetnacl côté client) →
  le badge passe de « présent au registre + intègre » à **« signé par {école} »**.

### Pourquoi PAS de blockchain
Une signature Ed25519 + un registre suffisent : vérifiable hors-ligne, instantané, gratuit,
sans dépendance à une chaîne. (W3C Verifiable Credentials suit exactement ce modèle.)

---

## Suites (dans mon périmètre, sans action de ta part)
- **Coffre-fort à diplômes** (espace famille : retrouver/partager ses diplômes).
- QR code sur le certificat ✅ (fait).
- Bouton « Émettre les diplômes des admis » depuis le module Examens ✅ (fait).
