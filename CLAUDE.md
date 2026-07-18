Tu as accès à Firebase et à cPanel pour débugger et développer. Si besoin, tu as aussi Claude in Chrome pour analyser.

## Déploiement : AUTONOME (mis à jour le 18/07/2026)
Ne demande plus à Steve de téléverser les fichiers — c'était la consigne d'avant, elle est levée.

- **Front (src/, server/*.php non secrets)** : `git push origin main` → GitHub Actions build + FTPS. ~5 min.
- **Fichiers secrets `*-config.php`** : la CI les exclut volontairement (ils ne sont ni dans git ni écrasés par un déploiement). Les envoyer **directement en FTPS** avec le compte de déploiement unique (enraciné sur la racine web) : le dossier du projet est `mapo/`.
  ```
  curl --ssl-reqd -k --user "$U:$P" -Q "-SITE CHMOD 600 <fichier>" \
       -T <local> "ftp://$H/mapo/<fichier>"
  ```
- **Identifiants** : `../_DEPLOIEMENT-AUTO/identifiants.local` (dossier voisin, à monter). **Ne JAMAIS les recopier ici, en mémoire, ni dans le chat** — les lire seulement au moment de déployer. Piège : le mot de passe contient un `#` → ne pas `source` le fichier, parser ligne par ligne (`grep '^FTP_PASS=' | sed 's/^FTP_PASS=//'`).
- **Permissions sur le serveur** : endpoints publics en `644`, **configs secrètes en `600`** (c'est la convention déjà en place dans `mapo/`). Après un déploiement front, purger le service worker avant de tester.
- **Règles Firestore** : jamais déployées par la CI. Voir la section dédiée ci-dessous.

## Règles Firestore : remplacement chirurgical UNIQUEMENT
La base `mapo-edufrem` est **partagée avec un autre produit** (MOBI : `community_posts`, `cf_dates`, `requests`…). Coller `firestore.rules` du repo dans la console **écraserait leurs règles**. Le fichier du repo est une documentation, pas la source déployée : la prod a un ordre de blocs différent et des règles en plus. Toujours comparer avec la console, puis ne remplacer que le bloc visé. Console : compte `contact@edufrem.com`, profil `u/4`.

## Tests
`node tests/enfants-stockage.test.mjs` — vérifie le stockage MAPO+ (1 doc par enfant, migration, isolement du compte enfant) contre un faux Firestore, sans compte ni réseau. À lancer après toute modification de `src/stores/enfantsAutonomes.js`.

## Mémoire partagée (À LIRE EN PREMIER)
La mémoire UNIQUE de Steve (tous ses projets, partagée par tous les chats + kIAlel + Gemini) vit dans **`00_MEMORY/`** à la racine du dossier Projects. Au démarrage, lis **`../../../00_MEMORY/MEMORY.md`** (index) puis `edufrem.md` et les fiches utiles. Règles transverses (design, typo, frugalité) : `_regles.md`.

Idéalement, ouvre tes chats avec le **dossier EDUFREM global** sélectionné pour que cette mémoire soit chargée automatiquement. Quand une décision est prise ou qu'un fait durable apparaît, mets à jour la fiche concernée dans `00_MEMORY/` (corrige le fait dépassé, ne duplique pas).

Note : l'ancienne mémoire `00_MEMOIRE/MEMOIRE-EDUFREM.md` a été archivée le 29/06/2026 (dans `_ARCHIVE_memoire_2026-06-29/`).