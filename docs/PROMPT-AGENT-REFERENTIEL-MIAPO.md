# Prompt de démarrage : aligner MAPO+ et MIAPO sur le référentiel

À copier-coller tel quel au début d'un nouveau chat, dossier EDUFREM sélectionné.
Version du 2 septembre 2026.

---

Tu travailles sur MAPO et MAPO+ (`09_APPLICATIONS/MAPO`, copie `MAPO-B`).

## 1. Avant toute chose, lis le référentiel

Lis **intégralement** `09_APPLICATIONS/MAPO/docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md`. C'est la source de vérité pédagogique de MAPO+ et de MIAPO : 13 piliers scientifiques, la grille par âge, les mythes bannis, l'éthique, le tableau de synthèse, les écarts constatés dans le code et le backlog priorisé.

Lis ensuite `00_MEMORY/reference_care_ai.md` pour la gouvernance, qui est complémentaire et pas redondante.

Ne me résume pas ces documents. Dis-moi en trois lignes ce que tu as retenu qui change ta façon de coder, puis passe à la suite.

## 2. Trois règles qui ne se négocient pas

1. **Tout paramètre pédagogique est soit sourcé, soit déclaré « choix d'ingénierie non démontré ».** Il n'y a pas de troisième catégorie. Tu ne fais jamais dire à une étude ce qu'elle ne dit pas : c'est exactement l'erreur que le référentiel corrige dans `ageProfil.js`.
2. **Le mode socratique n'est pas désactivable et aucune commande utilisateur ne donne la réponse brute.** Fondement : Bastani et al., PNAS 2025, un accès libre à un modèle génératif fait chuter les résultats de 17 % à l'examen par rapport à un groupe sans IA.
3. **Aucun support, aucun commentaire de code, aucune interface ne cite** le « 2 sigma » de Bloom, les styles d'apprentissage visuel ou auditif, les pourcentages de rétention du cône de Dale, ni les « natifs du numérique ». La valeur correcte du tutorat est 0,76 à 0,79 écart-type (VanLehn 2011). Section 4 du référentiel pour la liste complète.

Sur les récompenses, l'arbitrage est déjà rendu (section P13) : on garde la ludification, elle porte sur le processus et jamais sur la personne, rien de monnayable, aucun classement entre apprenants, série de jours réparable, message informatif et non contrôlant, Elo interne jamais affiché comme identité.

## 3. Crée la todo suivante, dans cet ordre exact

Utilise TaskCreate pour créer ces huit tâches, dans l'ordre. C'est le backlog priorisé de la section 9 du référentiel, du meilleur rapport preuve sur coût au plus lourd. Ne réordonne pas sans me le dire et sans argument.

**Tâche 1. Corriger les justifications scientifiques dans le code** (écarts E3, E4, E6)
Réécrire le commentaire d'en-tête de `utils/ageProfil.js` : la fourchette 5 à 10 questions est un choix de prudence cohérent avec Gathercole et al. 2004 et Sweller et al. 2019, mais aucun de ces travaux ne prescrit un nombre d'items. Documenter `excludePrimaire` dans `utils/revisionTypes.js` comme une prudence et non comme une conclusion de la recherche, le vrai modérateur de l'entrelacement étant le matériel (Brunmair et Richter 2019). Ajouter dans le prompt de `server/mapo-ia.php` une interdiction explicite du feedback centré sur la personne (Kluger et DeNisi 1996 : plus d'un tiers des feedbacks dégradent la performance quand ils visent le soi plutôt que la tâche).
Vérification : aucune source citée dans le code ne dit autre chose que ce qu'elle dit réellement.

**Tâche 2. Métacognition minimale** (écart E7)
Un jugement de confiance avant validation d'une réponse, une prédiction de score en début de séance, une comparaison confiance contre résultat en fin de séance. Aucun appel IA supplémentaire, la frugalité doit être préservée.
Fondement : EEF, impact élevé, coût faible, preuve solide. C'est le meilleur rapport effet sur coût du référentiel.
Vérification : la calibration de l'apprenant est stockée et affichable au parent.

**Tâche 3. Reprise ciblée des erreurs** (écart E5)
Une notion échouée revient à la séance suivante, puis selon l'espacement. Suppose de taguer les questions par notion au moment de la génération.
Fondement : P1, P2, troisième et quatrième piliers de Dehaene.
Vérification : un test montre qu'une notion ratée réapparaît.

**Tâche 4. Espacement piloté par l'horizon et par la notion** (écarts E1 et E2, chantier le plus lourd)
Aujourd'hui `stores/tuteur.js` applique un intervalle fixe de 1, 3 ou 7 jours selon le score, par matière. Le remplacer par un pas calculé depuis l'horizon de restitution, dans cet ordre de priorité :
1. date d'examen déclarée (`utils/examens.js`) ;
2. **fin de la séquence en cours** (`utils/periodes.js`, `periods[T].sequences[S].end`) ;
3. **fin de la période en cours**, trimestre ou semestre (`periods[T].end`) ;
4. repli forfaitaire actuel si MAPO n'est pas relié.
Pas visé : environ 20 % des jours restants jusqu'à l'horizon, minimum un jour. En parallèle, faire descendre l'état de révision de la matière à la notion.
Fondement : Cepeda et al. 2008 (l'intervalle optimal dépend de l'horizon), Latimier et al. 2021 (un calendrier uniforme suffit, pas besoin d'un moteur SM-2).
Vérification : une séquence qui finit dans six semaines donne un pas d'environ huit jours, un contrôle dans une semaine donne un à deux jours.

**Tâche 5. Protocole d'évaluation interne** (écarts E10 et IA3, le plus stratégique)
Aujourd'hui MIAPO mesure la réussite pendant la séance. Bastani et al. montrent que c'est précisément la mesure trompeuse. Mettre en place, avec quelques écoles partenaires volontaires, un test différé à J+7 sans assistance, un groupe témoin, et une analyse de l'effet par quartile de niveau initial.
Vérification : EDUFREM peut produire un chiffre d'apprentissage réel, pas un chiffre d'usage.

**Tâche 6. Exemples travaillés et étayage décroissant** (écarts E8 et E9)
Sur une notion nouvelle, un exemple entièrement résolu précède la pratique, au lieu d'entrer directement en socratique, qui n'est que de la charge inutile pour un novice. L'étayage diminue à mesure que la jauge monte.
Fondement : Sweller et al. 2019, Kalyuga et al. 2003 (inversion d'expertise).
Vérification : un débutant voit un exemple, un apprenant au palier 4 n'en voit plus.

**Tâche 7. Mise en conformité des récompenses** (écart E12)
Rendre la série de jours réparable par un joker, supprimer tout message punitif à la rupture, reformuler les libellés de récompense pour qu'ils disent ce que le comportement produit sur l'apprentissage plutôt que ce que l'apprenant est. « 7 jours de suite, bravo ! » devient une information sur l'espacement.
Fondement : section P13, Deci, Koestner et Ryan 1999, Kluger et DeNisi 1996.

**Tâche 8. Vérifier le bornage de la difficulté par le bas** (écart E11)
`utils/progressionNiveau.js` plafonne au programme de la classe. Vérifier qu'un apprenant en retard peut réviser un programme d'année inférieure sans friction ni marquage négatif.
Fondement : Teaching at the Right Level, P12.

## 4. Comment tu travailles

- Une tâche à la fois, dans l'ordre. Tu me montres le résultat avant de passer à la suivante.
- Avant d'écrire du code, tu énonces tes hypothèses. Si plusieurs interprétations existent, tu les présentes au lieu d'en choisir une en silence.
- Modifications chirurgicales : tu ne touches qu'à ce qui sert la tâche, tu ne refactorises pas ce qui n'est pas cassé, tu respectes le style existant.
- Quand tu modifies un paramètre pédagogique, tu mets à jour dans le **même commit** la ligne correspondante du tableau de synthèse (section 7 du référentiel) et la section 8 des écarts. Le référentiel et le code ne divergent jamais.
- La copie de `docs/` dans `MAPO-B` doit rester identique.
- Tu me contredis quand tu as un argument. Je préfère une objection fondée à un acquiescement.
- Pas d'émojis, pas de longs tirets, langage simple, typographie française.

Quand tu as fini une tâche, tu mets à jour `00_MEMORY/reference_referentiel_pedagogique_miapo.md` si un fait durable a changé.
