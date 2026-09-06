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

## Règles Firestore (comparé en console le 23/08/2026)
La base `mapo-edufrem` n'est **PAS** partagée avec MOBI — Steve l'avait déjà corrigé le 05/08, et la mesure le confirme : les collections MOBI (`admins`, `students`, `requests`, `community_posts`, `cf_dates`…) et `paiements_scolarite` **n'existent pas** dans cette base. Les données s'y réduisent à `ligues`, `mapoplus_users`, `quizBank`, `superAdmins`, `users` (pas encore `schools`, aucune école déployée), et le projet ne déclare qu'**une seule application**.

Comparaison bloc par bloc : **25 des 28 blocs `match` sont identiques au caractère près**. Les 3 écarts sont cosmétiques (ordre de deux fonctions dans `/b2c/`, aides inlinées dans `/mapoplus_users/`), plus un doublon inerte en prod. **`firestore.rules` du dépôt est donc déployable** ; comparer reste une bonne habitude, ce n'est plus un interdit. Console : compte `contact@edufrem.com`, profil `u/4`.

⚠️ Les règles MOBI encore présentes ne gardent aucune donnée : vestige d'une migration jamais faite, et risque dormant si quelque chose créait ces collections. À trancher avec Steve avant de les retirer.

## Référentiel pédagogique MIAPO (OBLIGATOIRE avant toute modification de MAPO+ ou MIAPO)

**`docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md`** est la source de vérité pédagogique de MAPO+ et de MIAPO. Lis-le avant de toucher à `stores/tuteur.js`, `utils/ageProfil.js`, `utils/revisionTypes.js`, `utils/progressionNiveau.js`, `utils/jaugeNiveau.js`, `utils/examens.js`, `utils/periodes.js`, `utils/recompenses.js`, `utils/pointsEffort.js`, `utils/elo.js` ou aux prompts de `server/mapo-ia.php`.

Trois règles qui ne se négocient pas :

1. **Tout paramètre pédagogique est soit sourcé, soit déclaré « choix d'ingénierie non démontré ».** Pas de troisième option. Ne fais jamais dire à une étude ce qu'elle ne dit pas.
2. **Le mode socratique n'est pas désactivable.** Bastani et al., PNAS 2025 : un accès libre à un modèle génératif fait chuter les résultats de 17 % à l'examen. C'est la preuve qui fonde le produit.
3. **Ne cite jamais le « 2 sigma » de Bloom, les styles d'apprentissage ni les pourcentages de rétention du cône de Dale.** La bonne valeur du tutorat est 0,76 à 0,79 (VanLehn 2011). Liste complète des mythes bannis en section 4 du référentiel.

Quand tu modifies un paramètre pédagogique, mets à jour la ligne correspondante du tableau de synthèse (section 7) et la section 8 (écarts) dans le **même** commit. Copie identique à maintenir dans `MAPO-B/docs/`.

## Tests
`node tests/enfants-stockage.test.mjs` — vérifie le stockage MAPO+ (1 doc par enfant, migration, isolement du compte enfant) contre un faux Firestore, sans compte ni réseau. À lancer après toute modification de `src/stores/enfantsAutonomes.js`.

## Mémoire partagée (À LIRE EN PREMIER)
La mémoire UNIQUE de Steve (tous ses projets, partagée par tous les chats + kIAlel + Gemini) vit dans **`00_MEMORY/`** à la racine du dossier Projects. Au démarrage, lis **`../../../00_MEMORY/MEMORY.md`** (index) puis `edufrem.md` et les fiches utiles. Règles transverses (design, typo, frugalité) : `_regles.md`.

Idéalement, ouvre tes chats avec le **dossier EDUFREM global** sélectionné pour que cette mémoire soit chargée automatiquement. Quand une décision est prise ou qu'un fait durable apparaît, mets à jour la fiche concernée dans `00_MEMORY/` (corrige le fait dépassé, ne duplique pas).

Note : l'ancienne mémoire `00_MEMOIRE/MEMOIRE-EDUFREM.md` a été archivée le 29/06/2026 (dans `_ARCHIVE_memoire_2026-06-29/`).