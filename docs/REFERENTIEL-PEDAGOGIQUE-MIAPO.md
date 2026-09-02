# Référentiel scientifique du tutorat MIAPO

Version 1.0 du 2 septembre 2026. Document de référence EDUFREM.
Il remplace le « manifeste » perdu dont il ne restait que des traces dans le code.

---

## 0. Objet, portée et méthode

### 0.1 Pourquoi ce document

MIAPO est le tuteur IA de MAPO+. Il s'adresse à des apprenants d'Afrique francophone (Cameroun, Sénégal, Côte d'Ivoire) et de France, du primaire à l'âge adulte, en contexte de bas débit et de budget d'inférence contraint.

Chaque décision de conception du tuteur (nombre de questions, intervalle de révision, forme du feedback, âge d'accès à tel type d'exercice) est un choix pédagogique. Ce document existe pour que chacun de ces choix puisse être :

1. rattaché à une étude ou à une méta-analyse revue par les pairs, ou
2. déclaré explicitement comme un choix d'ingénierie non démontré.

Il n'y a pas de troisième catégorie. Une pratique qui n'est ni sourcée ni déclarée comme telle est une dette scientifique.

### 0.2 Ce que ce document n'est pas

Ce n'est pas un argumentaire commercial. Il contient volontairement des résultats qui affaiblissent certaines promesses courantes du secteur, y compris des promesses que MIAPO pourrait être tenté de faire. La version courte destinée aux écoles et aux partenaires en est un extrait, jamais une réécriture optimiste.

### 0.3 Échelle de niveau de preuve

| Niveau | Critère |
|---|---|
| **Solide** | Plusieurs méta-analyses convergentes, effets répliqués en classe réelle, mécanisme compris |
| **Modéré** | Une méta-analyse ou plusieurs essais contrôlés, mais effet fortement modéré par le contexte ou le matériel |
| **Contesté** | Résultats hétérogènes, biais de publication documenté, ou débat actif entre équipes |
| **Non établi** | Plausible, cohérent avec la théorie, mais sans preuve directe dans le contexte visé. Se déclare comme choix d'ingénierie |

### 0.4 Articulation avec CARE-AI

Ce référentiel répond à la question « qu'est-ce qui rend une séance de révision efficace ». Il ne remplace pas le cadre de gouvernance CARE-AI (Zulfiqar et Iqbal, 2026), qui répond à une autre question : « à quelles conditions une IA a-t-elle sa place dans une école ». Les deux sont complémentaires et se croisent en section 5. Voir `../../../08_DEEPTECH/2026-09-01_CARE-AI_extraction-et-plan-produits.md`.

Rappel de vocabulaire imposé par ce cadre : écrire « s'appuie sur CARE-AI », jamais « conforme à CARE-AI », le cadre n'étant pas validé empiriquement en classe, ses auteurs le disent eux-mêmes.

### 0.5 Règle de maintenance

Toute modification d'un paramètre pédagogique du code (`ageProfil.js`, `revisionTypes.js`, `tuteur.js`, `progressionNiveau.js`, `examens.js`, prompts de `mapo-ia.php`) doit s'accompagner d'une mise à jour de la ligne correspondante du tableau de synthèse (section 6). Un commentaire de code qui cite une source doit citer une source qui dit réellement ce qu'on lui fait dire. La section 7 recense les cas où ce n'est pas encore vrai.

---

## 1. Les treize piliers

### P1. Récupération active, ou effet-test

**Ce que dit la recherche.** Se tester sur un contenu ancre mieux ce contenu que le relire, et l'écart grandit avec le délai. Roediger et Karpicke (2006) montrent que le fait de relire est supérieur à cinq minutes, mais que le fait de s'être testé devient nettement supérieur à deux jours et à une semaine. La méta-analyse d'Adesope, Trevisan et Sundararajan (2017) donne un effet moyen de g = 0,61 en faveur des tests de pratique contre toutes les conditions de comparaison. Surtout, Yang, Luo, Vadillo, Yu et Shanks (2021) agrègent 222 études et 48 478 élèves **en classe réelle** et trouvent g = 0,50. Dunlosky et ses collègues (2013) classent la pratique du test parmi les deux seules techniques d'utilité élevée sur dix examinées.

**Niveau de preuve : solide.** C'est le résultat le mieux établi de tout ce document.

**Limites.** L'effet est modéré par la présence d'un feedback correctif, par la correspondance entre le format du test d'entraînement et celui du test final, par le nombre de répétitions. Un test sans feedback fonctionne, un test avec feedback fonctionne mieux.

**Implication MIAPO.** La forme par défaut de toute séance est la récupération, pas la relecture. Le QCM, les flashcards, l'appariement et la question ouverte sont tous des dispositifs de récupération. Le résumé de cours n'est jamais une fin en soi : il prépare une récupération.

**Statut dans le code : fait.** `revisionTypes.js` construit tout son catalogue sur cette base, et le commentaire d'en-tête cite les bonnes sources.

### P2. Répétition espacée

**Ce que dit la recherche.** À temps d'étude égal, répartir les reprises dans le temps produit une meilleure rétention que de les masser. Latimier, Peyre et Ramus (2021) agrègent 29 études et trouvent g = 0,74 pour la récupération espacée contre la récupération massée. Dunlosky et ses collègues (2013) classent la pratique distribuée parmi les deux techniques d'utilité élevée.

Deux nuances comptent pour l'implémentation.

**Première nuance, l'intervalle optimal dépend de l'horizon.** Cepeda, Vul, Rohrer, Wixted et Pashler (2008) ont testé plus de 1 350 personnes avec des écarts allant jusqu'à trois mois et demi et des délais de restitution allant jusqu'à un an. L'écart optimal entre deux passages représente environ 20 à 40 % du délai avant le test pour un test à une semaine, et seulement 5 à 10 % pour un test à un an. Autrement dit : **il n'existe pas d'intervalle universel**. Un intervalle se calcule à partir de la date à laquelle l'apprenant devra restituer.

**Deuxième nuance, les intervalles expansifs ne sont pas supérieurs.** La même méta-analyse de Latimier et ses collègues (2021) compare, sur 54 tailles d'effet, les calendriers expansifs (intervalles croissants, type SM-2 ou Anki) et les calendriers uniformes : g = 0,034, différence non significative. Leur conclusion est explicite, les résultats « ne soutiennent pas la croyance répandue selon laquelle les intervalles entre récupérations devraient être progressivement augmentés ».

**Niveau de preuve : solide** pour l'espacement lui-même. **Solide également** pour l'absence de supériorité de l'expansif, ce qui est une bonne nouvelle de frugalité : MIAPO n'a pas besoin d'un moteur SM-2.

**Implication MIAPO.** Un calendrier uniforme simple suffit, à condition que le pas soit calé sur l'horizon de restitution.

**Où trouver l'horizon, par ordre de priorité.** C'est le point qui rend le principe implémentable dès aujourd'hui, sans attendre que les familles saisissent des dates d'examen.

| Rang | Source de l'horizon | Disponibilité | Module |
|---|---|---|---|
| 1 | Date d'examen déclarée par l'apprenant ou la famille | quand elle existe, rarement | `examens.js` |
| 2 | **Fin de la séquence en cours** de l'école reliée | dès que MAPO est relié | `periodes.js`, `periods[T].sequences[S].end` |
| 3 | **Fin de la période en cours** (trimestre ou semestre) | dès que MAPO est relié | `periodes.js`, `periods[T].end` |
| 4 | Repli forfaitaire actuel (1, 3 ou 7 jours selon le score) | toujours | `tuteur.js` |

Le séquençage scolaire est un horizon **au moins aussi juste que la date d'examen** pour la révision courante : une séquence se termine par une évaluation, c'est exactement le moment où l'élève doit restituer. Et il a un avantage décisif, il est déjà connu du système sans que personne ait à le saisir.

**Règle de calcul.** L'écart entre deux reprises vaut environ 20 % du nombre de jours restant jusqu'à l'horizon, borné entre 1 jour et un plafond raisonnable. Une séquence qui se termine dans six semaines donne un pas d'environ huit jours. Un contrôle dans une semaine donne un pas d'un à deux jours. C'est directement la courbe de Cepeda et ses collègues (2008), et cela remplace avantageusement la table figée actuelle.

**Statut dans le code : partiel, et scientifiquement daté.** `tuteur.js` applique un intervalle fixe de 1, 3 ou 7 jours selon le score, par matière, sans lien avec l'horizon, alors que `periodes.js` et `examens.js` détiennent déjà les dates nécessaires. Voir écart E1.

### P3. Difficultés désirables

**Ce que dit la recherche.** Robert Bjork a formalisé l'idée que les conditions qui ralentissent l'apprentissage apparent (espacement, entrelacement, production plutôt que reconnaissance, tests plutôt que relecture) améliorent la rétention durable, alors que les conditions qui donnent une impression de fluidité (relire, surligner) la dégradent. L'effet-test et l'effet d'espacement en sont les deux instanciations les mieux établies.

**Niveau de preuve : solide** pour le principe, dans la mesure où il se ramène à P1 et P2. **Modéré** comme cadre général : « désirable » n'est pas une propriété absolue, une difficulté cesse d'être désirable dès qu'elle dépasse les ressources de l'apprenant (voir P5).

**Limites, et c'est important pour un produit.** Une difficulté désirable dégrade la performance immédiate et le sentiment de compétence. Un apprenant qui progresse réellement peut avoir l'impression d'échouer. C'est un risque d'abandon direct, particulièrement chez le jeune apprenant et chez l'adulte en reconversion.

**Implication MIAPO.** Le tuteur doit expliquer la difficulté, pas seulement l'imposer. Un écran de fin de séance qui dit « tu as fait plus d'erreurs parce que les questions étaient mélangées, c'est ce qui fait que tu t'en souviendras dans un mois » n'est pas du confort, c'est une condition d'adhésion.

**Statut dans le code : partiel.** Les difficultés sont là, l'explication du pourquoi ne l'est pas.

### P4. Entrelacement

**Ce que dit la recherche.** Alterner les types de problèmes plutôt que de les traiter par blocs améliore la capacité à choisir la bonne méthode. Brunmair et Richter (2019) agrègent 59 études et 238 tailles d'effet : effet global g = 0,42, mais **fortement modéré par le matériel**. Fort sur les catégories visuelles (peintures, g = 0,67), modéré en mathématiques (g = 0,34), non significatif sur les textes expositifs. Le modérateur clé identifié est la similarité : l'entrelacement aide d'autant plus que les catégories à distinguer se ressemblent entre elles.

L'essai contrôlé de Rohrer, Dedrick, Hartwig et Cheung (2020) est le plus convaincant en classe réelle : 787 élèves de 7e année (équivalent 5e française), 54 classes, exercices entrelacés ou en blocs pendant quatre mois, test différé d'au moins un mois. Résultats : 61 % contre 37 %, d = 0,83.

**Niveau de preuve : solide en mathématiques au collège, modéré ailleurs, non établi sur les textes.**

**Implication MIAPO.** L'entrelacement doit être activé selon **le type de matériel**, pas selon l'âge. Il a du sens dès qu'il existe plusieurs procédures voisines à discriminer, ce qui est le cas en calcul élémentaire (addition contre soustraction posée, par exemple) comme au lycée. Il n'en a pas sur un texte d'histoire.

**Statut dans le code : partiel et probablement mal calibré.** `revisionTypes.js` filtre l'entrelacement par famille de matière (bon critère) mais l'exclut aussi du primaire par `excludePrimaire` (critère d'âge). La preuve directe en primaire est mince, l'exclusion reste donc défendable comme prudence, mais elle doit être documentée comme telle et non comme une conclusion de la recherche. Voir écart E4.

### P5. Charge cognitive et exemples travaillés

**Ce que dit la recherche.** La théorie de la charge cognitive (Sweller, van Merriënboer et Paas, 2019, pour la synthèse à vingt ans) part d'un fait non contesté : toute information nouvelle transite par une mémoire de travail limitée en capacité et en durée, avant d'être stockée dans une mémoire à long terme illimitée. Il en découle l'effet d'exemple travaillé : pour un novice, étudier une solution entièrement rédigée est plus efficace que de chercher seul.

Le corollaire est aussi important que l'effet lui-même : **l'effet d'inversion d'expertise** (Kalyuga et ses collègues, 2003). Ce qui aide le novice nuit à l'apprenant avancé, parce que l'explication devient redondante et consomme de la mémoire de travail pour rien. La progression correcte va donc de l'exemple travaillé vers le problème complété, puis vers le problème ouvert.

**Niveau de preuve : solide** pour l'effet d'exemple travaillé et pour l'inversion d'expertise. **Contesté** sur les mesures de charge cognitive elles-mêmes, qui restent largement déclaratives.

**Implication MIAPO.** Deux conséquences directes. Première : devant un apprenant qui découvre une notion, le tuteur montre un exemple résolu complet avant de faire chercher, au lieu d'entrer d'emblée en mode socratique. Le socratique pur sur une notion inconnue n'est pas de la maïeutique, c'est de la charge inutile. Deuxième : cet étayage doit **diminuer** à mesure que la maîtrise monte. La jauge de niveau existe déjà pour mesurer cette montée, elle n'est pas encore reliée à l'étayage.

**Statut dans le code : à faire.** Voir écart E8.

### P6. Mémoire de travail et son développement

**Ce que dit la recherche.** Cowan (2001) fixe la capacité de la focalisation attentionnelle à environ quatre unités chez l'adulte, révisant à la baisse le « sept plus ou moins deux » de Miller. Gathercole, Pickering, Ambridge et Wearing (2004) montrent, sur des enfants de 4 à 15 ans, que la structure modulaire de la mémoire de travail est en place dès 6 ans et que chacun de ses composants augmente en capacité de façon à peu près linéaire tout au long de la scolarité.

**Niveau de preuve : solide** sur le fait développemental lui-même.

**Ce que ces travaux ne disent pas, et c'est capital.** Ni Cowan ni Gathercole ne prescrivent une durée de séance ou un nombre de questions. Passer de « la mémoire de travail augmente avec l'âge » à « donc cinq questions à huit ans et dix à quinze ans » est une **inférence de conception**, pas un résultat expérimental. La règle populaire de l'attention soutenue égale à une minute par année d'âge n'a, elle non plus, aucun fondement empirique solide.

**Implication MIAPO.** La gradation de la longueur des séances avec l'âge reste le choix prudent et cohérent avec P5. Elle doit être présentée comme telle. Face à une école qui demanderait « quelle étude fixe cinq questions à huit ans ? », la réponse honnête est : aucune, c'est un point de départ que nous calibrerons sur nos propres données d'abandon et de réussite.

**Statut dans le code : fait, mais mal justifié.** `ageProfil.js` implémente la gradation et attribue sa justification à Gathercole 2004 et Cowan 2016 d'une façon que ces travaux ne soutiennent pas. Voir écart E3.

### P7. Les quatre piliers de l'apprentissage (cadre intégrateur)

**Ce que dit la recherche.** Stanislas Dehaene identifie quatre facteurs déterminant la vitesse et la solidité d'un apprentissage : l'attention, l'engagement actif, le retour sur l'erreur, et la consolidation. Le sommeil joue un rôle essentiel dans le quatrième.

**Niveau de preuve : solide** pour chacun des quatre pris séparément, chacun renvoyant à une littérature indépendante (attention, P1 pour l'engagement actif, P8 pour l'erreur, P2 pour la consolidation). **Modéré** en tant que modèle intégré : c'est une synthèse pédagogique utile, pas une théorie testée en bloc.

**Implication MIAPO.** Ce cadre sert de grille de relecture produit. Toute fonctionnalité de MIAPO doit pouvoir se ranger sous au moins un des quatre piliers. Une fonctionnalité qui n'en sert aucun est décorative. C'est aussi le cadre le plus lisible pour un chef d'établissement francophone, qui connaît souvent Dehaene.

### P8. Feedback formatif

**Ce que dit la recherche.** Black et Wiliam (1998) établissent que l'évaluation formative bien conduite produit des effets de 0,4 à 0,7 écart-type, et que ces effets sont les plus forts chez les élèves les plus faibles, ce qui réduit l'écart. Wisniewski, Zierer et Hattie (2020) agrègent 435 études, 994 tailles d'effet et plus de 61 000 participants : effet global d = 0,48, mais avec une hétérogénéité telle que « le feedback » ne peut pas être traité comme un traitement homogène. Le modérateur principal est la **richesse informationnelle** : un feedback qui explique surpasse largement un feedback qui note.

**Le contrepoids obligatoire.** Kluger et DeNisi (1996), sur 607 tailles d'effet et 23 663 observations, trouvent un effet moyen positif (d = 0,41) mais constatent que **plus d'un tiers des interventions de feedback dégradent la performance**. Leur explication : quand le feedback dirige l'attention vers la personne plutôt que vers la tâche, il déclenche des réactions défensives qui coûtent plus qu'elles ne rapportent.

**Niveau de preuve : solide** dans les deux sens. Le feedback est puissant et il est dangereux.

**Implication MIAPO.** Trois règles opérationnelles.

1. Tout feedback porte sur la tâche et sur la procédure, jamais sur la personne. « Cette étape est fausse parce que… » et non « tu es fort en maths ».
2. Un score seul est le pire feedback possible : il donne l'information la moins riche et il oriente vers la personne. Le score doit toujours être accompagné du pourquoi.
3. Tout dispositif qui rend saillante une comparaison ou une performance globale (badges, séries de jours, classement, courbe Elo affichée) entre dans le champ de cette littérature. L'arbitrage a été rendu, voir P13.

**Statut dans le code : fait pour le QCM** (indice socratique plus explication, prescrits dans le prompt de `mapo-ia.php`). **Partiel** pour les récompenses (`recompenses.js`, `pointsEffort.js`, `elo.js`). Voir P13 et écart E12.

### P9. Tutorat individuel et pédagogie de maîtrise

**Ce que dit la recherche.** Benjamin Bloom a popularisé en 1984 l'idée que le tutorat individuel avec pédagogie de maîtrise produirait deux écarts-types de gain sur l'enseignement en classe. Ce chiffre n'a pas été répliqué. La revue de VanLehn (2011), qui couvre 28 études d'évaluation publiées entre 1975 et 2010, trouve un effet de **d = 0,79 pour le tutorat humain** et de **d = 0,76 pour les systèmes tutoriels intelligents**, soit une quasi-égalité entre l'humain et la machine, et une valeur très éloignée de 2,0.

**Niveau de preuve : solide** pour l'ordre de grandeur autour de 0,8. **Le « 2 sigma » est à considérer comme non établi** et ne doit apparaître dans aucun support EDUFREM.

**Implication MIAPO.** C'est à la fois la meilleure et la plus honnête des justifications du produit. Un tuteur automatique bien conçu approche l'efficacité d'un tuteur humain (0,76 contre 0,79), ce qui est considérable dans un contexte où le tuteur humain n'existe tout simplement pas pour la majorité des élèves visés. Annoncer 0,8 écart-type est défendable devant un jury. Annoncer 2 sigma vous décrédibilise devant quiconque connaît le dossier.

### P10. Motivation et autonomie

**Ce que dit la recherche.** La théorie de l'autodétermination (Deci et Ryan) distingue des formes de motivation selon leur degré d'autonomie. La méta-analyse de Howard, Bureau, Guay, Chong et Ryan (2021), sur 344 échantillons et 223 209 participants, confirme que les formes autonomes de motivation sont associées à de meilleurs résultats de performance, de persistance et de bien-être que les formes contrôlées.

**Le cas contesté de l'état d'esprit de développement.** Les interventions dites de « growth mindset » sont souvent présentées comme acquises. Elles ne le sont pas. Sisk, Burgoyne, Sun, Butler et Macnamara (2018) agrègent 273 tailles d'effet sur environ 365 000 élèves pour la corrélation (r ≈ 0,10, soit environ 1 % de la variance) et 43 études d'intervention sur environ 57 000 élèves (d ≈ 0,08), avec des signes nets de biais de publication. Macnamara et Burgoyne (2023) reprennent 63 études et N = 97 672 et concluent que 94 % des interventions comportent des variables confondues, que les auteurs ayant un intérêt financier rapportent deux fois et demie plus souvent des effets positifs, et que les études de meilleure qualité méthodologique trouvent moins d'effet.

**Niveau de preuve : modéré** pour l'autodétermination (littérature majoritairement corrélationnelle). **Contesté** pour l'état d'esprit de développement.

**Implication MIAPO.** Soutenir l'autonomie a un fondement raisonnable : laisser le choix de la matière, du type de révision et du moment, expliquer le pourquoi d'un exercice, éviter les formulations de contrôle. En revanche, MIAPO ne doit pas fonder son discours produit sur le « growth mindset », et surtout pas le vendre comme une garantie d'efficacité. Encourager l'effort reste une bonne pratique de bon sens, ce n'est pas un levier prouvé.

### P11. Métacognition et autorégulation

**Ce que dit la recherche.** L'Education Endowment Foundation, qui synthétise 246 travaux, classe la métacognition et l'autorégulation parmi les approches à **impact élevé, coût faible et preuve solide** : l'équivalent d'environ sept mois de progrès supplémentaires dans le secondaire, jusqu'à huit dans le primaire. Le contenu opérationnel est précis : enseigner explicitement à planifier, à surveiller et à évaluer son propre apprentissage.

**Niveau de preuve : solide** au niveau de la synthèse, avec la réserve habituelle sur la conversion en « mois de progrès », qui est une métrique de communication et non une mesure.

**Implication MIAPO.** C'est le meilleur rapport effet sur coût de tout ce document pour un tuteur textuel, et c'est probablement ce qui manque le plus à MIAPO aujourd'hui. Deux dispositifs très peu coûteux :

1. **Jugement de confiance avant réponse.** Demander « es-tu sûr ? » avant de valider, puis confronter la confiance au résultat. C'est un écran, zéro token supplémentaire.
2. **Prédiction et bilan de séance.** « Combien penses-tu en réussir sur dix ? » avant, puis comparaison après. La calibration de l'apprenant devient une donnée exploitable pour lui, pour le parent et pour l'école.

**Statut dans le code : à faire.** Voir écart E7.

### P12. Développement et adaptation au niveau réel

**Ce que dit la recherche.** Deux résultats complémentaires.

Le premier est développemental (voir P6) : mémoire de travail et autorégulation augmentent progressivement sur toute la scolarité.

Le second est plus opérationnel et, pour le contexte africain, plus décisif. Les évaluations randomisées de l'approche « Teaching at the Right Level » (Banerjee, Banerji, Berry, Duflo et leurs collègues) montrent que le facteur qui limite l'apprentissage n'est pas d'abord l'âge ni la classe, mais **l'écart entre le niveau réel de l'enfant et le niveau supposé par le programme**. Enseigner au niveau réel produit certains des gains les plus importants jamais mesurés dans l'éducation en pays à faible revenu. Le même mécanisme se retrouve dans l'essai Mindspark en Inde (Muralidharan, Singh et Ganimian, 2019, American Economic Review) : un programme d'instruction personnalisée par ordinateur produit 0,37 écart-type en mathématiques et 0,23 en hindi en quatre mois et demi, avec des gains relatifs nettement plus forts pour les élèves les plus faibles. Angrist, Bergman et Matsheng (2022, Nature Human Behaviour) retrouvent le résultat au Botswana avec des SMS et des appels téléphoniques : 0,12 écart-type, et l'instruction ciblée sur le niveau réel fait mieux que l'instruction non ciblée.

**Niveau de preuve : solide.**

**Implication MIAPO.** Deux conséquences majeures.

1. **L'adaptation au niveau réel prime sur l'adaptation à l'âge.** Le vrai levier de MIAPO n'est pas la bande d'âge, c'est le positionnement initial et l'ajustement continu de la difficulté. C'est ce que font déjà `positionnement.js`, `progressionNiveau.js` et `elo.js`. C'est le cœur du produit, et c'est ce qui est le mieux fondé scientifiquement.
2. **Le bornage par la classe est un compromis.** `progressionNiveau.js` plafonne la difficulté au programme de l'année en cours, avec passage explicite à l'année suivante. La science du TaRL suggère de suivre le niveau réel, y compris quand il est nettement en dessous de la classe. Le bornage par le haut est cohérent avec la promesse « on révise ce qui est au programme ». Le bornage par le bas, lui, ne doit pas exister : un élève de 4e qui n'a pas les acquis de CM2 doit pouvoir réviser du CM2 sans être humilié. À vérifier dans le code.

### P13. Engagement et récompenses

L'objectif produit est clair et légitime : que l'apprenant garde de l'intérêt, et qu'il ait envie de se mesurer à une révision plutôt qu'à une partie de Roblox. La question n'est donc pas « faut-il des récompenses » mais « lesquelles, et sous quelle forme ».

**Ce que dit la recherche, en trois résultats.**

1. **La ludification fonctionne, modestement.** Sailer et Homner (2020) trouvent des effets petits à modérés sur les résultats cognitifs (g = 0,49), motivationnels (g = 0,36) et comportementaux (g = 0,25). L'effet cognitif reste stable quand on ne garde que les études méthodologiquement rigoureuses, les deux autres sont moins stables. Point capital de leur conclusion : **l'effet dépend des éléments de jeu employés**, pas du fait de « ludifier ».
2. **Les récompenses tangibles et conditionnelles sapent la motivation intrinsèque.** Deci, Koestner et Ryan (1999), sur 128 expériences, mesurent un effet négatif des récompenses conditionnées à l'engagement (d = -0,40), à l'achèvement (d = -0,36) et à la performance (d = -0,28) sur la motivation intrinsèque mesurée en libre choix. En revanche, les retours verbaux et informationnels, qui soutiennent le sentiment de compétence sans exercer de contrôle, ont plutôt un effet positif.
3. **Un feedback qui vise la personne se retourne.** Kluger et DeNisi (1996), déjà cité en P8 : plus d'un tiers des interventions de feedback dégradent la performance, principalement quand l'attention se déplace de la tâche vers le soi.

**Niveau de preuve : modéré.** Solide pour l'effet de sape des récompenses tangibles, modéré pour la ludification, et **non établi** pour le cas particulier des séries de jours consécutifs, sur lesquelles il n'existe pas de littérature scolaire solide.

**Décision EDUFREM, arbitrée le 2 septembre 2026 : on garde la ludification et on la met en conformité avec la preuve.** Sept règles.

| # | Règle | Fondement |
|---|---|---|
| 1 | On garde badges, séries et points. On ne les supprime pas | Sailer et Homner 2020, effets positifs |
| 2 | La récompense porte sur le **processus** (régularité, effort, reprise d'un point faible), jamais sur la performance brute ni sur la personne | Deci et al. 1999, Kluger et DeNisi 1996 |
| 3 | **Rien de tangible ni de monnayable.** Symbolique uniquement. Une récompense échangeable est le cas où l'effet de sape est le plus net | Deci et al. 1999 |
| 4 | **Aucun classement entre apprenants.** La comparaison sociale déplace l'attention vers le soi | Kluger et DeNisi 1996 |
| 5 | La série de jours devient **réparable** : un joker ou un rattrapage, et aucun message punitif à la rupture. Une série qu'on ne peut que perdre fabrique de la motivation contrôlée, puis de l'abandon | Howard et al. 2021 ; choix prudentiel, pas de preuve directe |
| 6 | Le message est **informatif, pas contrôlant**. « Tu as révisé quatre jours sur sept, c'est cet étalement qui te fait retenir » et non « ne casse pas ta série » ni « tu es un champion » | Deci et al. 1999 |
| 7 | L'**Elo reste un signal interne** de calibration de la difficulté. Il ne devient pas un score d'identité affiché ni comparé | Kluger et DeNisi 1996 |

**Ce qui bat réellement Roblox, et ce n'est pas le badge.** Chercher à rivaliser sur la boucle de récompense courte est une bataille perdue d'avance, ce n'est pas le terrain d'EDUFREM. Ce qui retient un apprenant, d'après la théorie de l'autodétermination (Howard et al., 2021), tient en trois leviers, tous déjà à portée de MIAPO :

- **Compétence** : une difficulté bien calibrée, où l'on réussit souvent sans que ce soit trivial. C'est la jauge et l'Elo, et c'est le levier le plus fort.
- **Autonomie** : choisir sa matière, son type de révision, son moment.
- **Progrès visible** : voir sa jauge bouger et savoir pourquoi.

Une séance courte, calibrée, qui se termine nettement et montre un progrès fait plus pour l'assiduité que n'importe quel badge. Le badge est un accompagnement, pas le moteur.

**Statut dans le code.** `pointsEffort.js` respecte déjà la règle 2, il récompense la régularité et non le score. `recompenses.js` doit être revu sur la règle 5 (série réparable) et la règle 6 (formulation des messages). Les règles 3, 4 et 7 sont respectées aujourd'hui et doivent le rester : ce sont des interdits, pas des chantiers.

---

## 2. Le cas particulier du tutorat par IA générative

Cette section est celle qui justifie le plus directement les choix techniques de MIAPO. Elle est récente et évolutive.

### 2.1 L'IA sans garde-fous dégrade l'apprentissage

Bastani, Bastani, Sungu, Ge, Kabakcı et Mariman (2025), publié dans *PNAS*, ont mené un essai contrôlé sur près de 1 000 lycéens turcs en mathématiques, réparti en trois conditions : accès libre à une interface de type GPT-4, accès à un « GPT Tutor » bridé (indices, guidage enseignant, pas de réponse livrée), et groupe témoin sans IA.

Résultats. Pendant les séances d'entraînement, le groupe « tuteur bridé » réussit 127 % mieux. Mais à l'examen, une fois l'outil retiré : le groupe **accès libre obtient des résultats inférieurs de 17 %** à ceux du groupe témoin, tandis que le groupe « tuteur bridé » revient au niveau du témoin. Interprétation des auteurs : l'accès libre produit une dépendance à l'outil et une illusion de compétence, les élèves n'ayant pas appris ce qu'ils croyaient avoir appris.

**Niveau de preuve : solide** (essai randomisé, grand échantillon, mesure différée, publication de premier rang).

**Ce que cela signifie pour MIAPO.** La règle « ne jamais donner la réponse d'emblée, même si l'apprenant insiste » n'est pas une préférence pédagogique. C'est ce qui sépare un outil qui n'aide pas de un outil qui nuit activement. C'est l'argument le plus fort dont dispose EDUFREM face à une école qui hésite entre MIAPO et « les élèves utilisent déjà ChatGPT ».

### 2.2 L'IA avec garde-fous peut dépasser une bonne pédagogie

Kestin, Miller et leurs collègues (2025), dans *Scientific Reports*, ont fait alterner environ 180 étudiants de physique de Harvard entre un cours en présentiel en pédagogie active très soignée et un tuteur IA construit sur mesure. Le tuteur produit environ deux fois les gains d'apprentissage du cours en pédagogie active, en moins de temps, avec un engagement déclaré supérieur. La conception du tuteur est explicitement contrainte : un pas de raisonnement à la fois, jamais la solution complète en un message, invitation systématique à essayer avant de révéler.

**Niveau de preuve : modéré.** Un seul essai, population très sélectionnée (étudiants de Harvard), une seule discipline. À citer comme signal encourageant, jamais comme preuve transférable à un élève de 6e à Douala.

### 2.3 L'IA fonctionne en contexte à faibles ressources

Le pilote de la Banque mondiale dans l'État d'Edo, au Nigéria (juin à juillet 2024, environ 800 élèves de première année du secondaire, cours d'anglais deux fois par semaine avec un assistant génératif), mesure **0,23 écart-type sur l'anglais** et 0,31 sur un test élargi incluant compétences numériques et connaissance de l'IA. L'analyse coût-efficacité place l'intervention parmi les plus rentables documentées.

**Niveau de preuve : modéré.** Étude sérieuse et directement pertinente géographiquement, mais un seul pilote, de courte durée, sur une seule matière, avec des effets plus forts chez les élèves déjà les plus forts, ce qui pose une vraie question d'équité.

### 2.4 Synthèse pour MIAPO

| Enseignement | Conséquence de conception |
|---|---|
| L'accès libre à un modèle génératif nuit à l'apprentissage | Le mode socratique n'est pas désactivable, et aucune commande utilisateur ne doit permettre d'obtenir la réponse brute |
| Les garde-fous efficaces sont concrets, pas déclaratifs | Un pas à la fois, vérifier la compréhension avant de conclure, terminer par une question qui fait justifier |
| L'écart entre la performance pendant la séance et la performance à l'examen est le vrai risque | Mesurer l'apprentissage sur un test différé sans assistance, jamais sur la réussite pendant la séance |
| Les gains les plus forts vont parfois aux élèves déjà les plus forts | Suivre l'effet par niveau initial et corriger si l'écart se creuse |

---

## 3. Grille par tranche d'âge

Avertissement de méthode, à lire avant le tableau. Les **durées et les nombres d'items sont des choix d'ingénierie**, cohérents avec P5 et P6 mais non prescrits par une étude. Les colonnes « espacement », « autonomie » et « types admis » sont, elles, rattachables aux piliers.

| | Primaire (≈ 6 à 10 ans) | Début collège (≈ 11 à 13 ans) | Lycée (≈ 14 à 17 ans) | Adulte et supérieur (18 ans et plus) |
|---|---|---|---|---|
| **Séance cible** | 10 à 15 min | 15 à 20 min | 20 à 30 min | 25 à 40 min, choix de l'apprenant |
| **Items par séance** | 5 à 6 | 7 à 8 | 10 | 10 et plus, réglable |
| **Espacement** | J+1, J+3, puis hebdomadaire | J+1, J+3, J+7, puis calé sur le contrôle | calé sur l'horizon d'examen (P2) | calé sur l'horizon, réglable |
| **Étayage** | exemple travaillé systématique avant la pratique | exemple travaillé puis problème à compléter | étayage décroissant selon la jauge | minimal par défaut, à la demande |
| **Autonomie** | le parent ou l'enseignant ouvre la séance | choix de la matière | choix du type de révision et du rythme | contrôle complet |
| **Abstraction** | concret, exemples du quotidien local | début de généralisation | modèles, contre-exemples | transfert et cas complexes |
| **Types admis** | quiz, flashcards, appariement, dictée | tous sauf dissertation longue | tous | tous sauf dictée |
| **Feedback** | immédiat, très court, sur la tâche | immédiat, avec le pourquoi | immédiat, avec justification demandée | différé possible, auto-évaluation |
| **Métacognition** | « es-tu sûr ? » binaire | prédiction de score en fin de séance | calibration confiance contre résultat | planification de session |

### Reconnexion au code existant

Ce que fait `ageProfil.js` aujourd'hui : 5 questions jusqu'à 8 ans, 6 jusqu'à 10, 7 jusqu'à 12, 8 jusqu'à 14, 10 au-delà. Bandes : enfant jusqu'à 10, préado jusqu'à 13, ado jusqu'à 16, grand à partir de 17.

**Ce qui est conservé.** La gradation elle-même, ses seuils, et les quatre bandes. Rien dans la littérature ne les contredit, et elles sont cohérentes avec le développement de la mémoire de travail. La correction du 28 août 2026 qui a ajouté le supérieur et la formation continue à la table des âges était nécessaire : ranger un doctorant dans la bande « ado » invalidait ses recommandations.

**Ce qui doit changer.** Le commentaire d'en-tête, qui présente Gathercole 2004 et Cowan 2016 comme la justification directe de la fourchette 5 à 10. Ces travaux ne disent pas cela. Formulation correcte : « gradation choisie par prudence, cohérente avec l'augmentation de la capacité de mémoire de travail entre 4 et 15 ans (Gathercole et al., 2004) et avec la théorie de la charge cognitive (Sweller et al., 2019), mais aucun de ces travaux ne prescrit un nombre d'items. À calibrer sur nos données. »

**Ce qui manque.** Le nombre d'items est plafonné à 10 pour un adulte comme pour un lycéen de 15 ans. Un adulte en reconversion qui révise une certification devrait pouvoir choisir. C'est une contrainte d'autonomie (P10) sans justification cognitive.

---

## 4. Mythes à écarter

Un référentiel scientifique sert autant à écarter des pratiques répandues qu'à en fonder d'autres. Aucun des éléments ci-dessous ne doit apparaître dans MIAPO, dans le site edufrem.com, dans une formation d'enseignants ou dans un support commercial EDUFREM.

### 4.1 Les styles d'apprentissage (visuel, auditif, kinesthésique)

**Le mythe.** Chaque apprenant aurait un style dominant, et l'enseignement serait plus efficace s'il correspondait à ce style (« hypothèse d'appariement »).

**La preuve.** Pashler, McDaniel, Rohrer et Bjork (2008) concluent qu'il n'existe aucune base de preuve suffisante pour justifier l'introduction d'évaluations de style d'apprentissage dans la pratique éducative, et que les ressources limitées de l'éducation seraient mieux employées à des pratiques réellement fondées. Newton et Salvi (2020) montrent que la croyance reste néanmoins massivement répandue chez les enseignants.

**Niveau : réfuté.** Le fait qu'une école y croie ne change rien, sinon qu'il faut savoir en parler sans humilier l'interlocuteur.

**Attention, piège de formulation pour MIAPO.** Le catalogue `revisionTypes.js` contient un type « carte mentale » et un appariement en mode visuel étiquetés « double codage ». Le double codage (Paivio, et la littérature multimédia de Mayer) est une chose : présenter la même information en mots et en images aide, pour tout le monde. Les styles d'apprentissage en sont une autre : adapter le canal à une prétendue préférence individuelle, ce qui ne marche pas. **La différence tient en une phrase et elle doit figurer dans tout support.** Formulation sûre : « les schémas aident tous les apprenants, ils n'aident pas particulièrement les apprenants dits visuels ».

Note complémentaire : le niveau de preuve du double codage lui-même est **modéré**, et son intérêt est de toute façon limité dans un produit texte d'abord et bas débit.

### 4.2 Cerveau gauche contre cerveau droit

**Le mythe.** Des individus seraient « cerveau gauche » (logiques) ou « cerveau droit » (créatifs), et l'enseignement devrait s'y adapter.

**La preuve.** La latéralisation de certaines fonctions est réelle (le langage, par exemple). L'existence de profils individuels dominants et leur pertinence pédagogique ne le sont pas. C'est un des neuromythes les plus constants dans les enquêtes auprès d'enseignants.

**Niveau : réfuté.**

### 4.3 Les « natifs du numérique »

**Le mythe.** Les jeunes nés dans un environnement numérique auraient des capacités cognitives différentes, sauraient traiter plusieurs sources en parallèle et apprendraient autrement.

**La preuve.** Kirschner et De Bruyckere (2017) montrent que le natif du numérique habile en information n'existe pas, et que les apprenants ne font pas de multitâche mais de la commutation de tâche, au détriment de l'apprentissage. Concevoir un produit sur cette hypothèse nuit plus qu'il n'aide.

**Niveau : réfuté.**

**Conséquence pour MIAPO.** Une interface qui suppose qu'un adolescent sait naviguer, comprendre une consigne à l'écran ou évaluer la fiabilité d'une réponse d'IA se trompe. L'accompagnement explicite reste nécessaire à tout âge.

### 4.4 Le cône de Dale et ses pourcentages de rétention

**Le mythe.** « On retient 10 % de ce qu'on lit, 20 % de ce qu'on entend, 90 % de ce qu'on fait. » Souvent présenté sous forme de pyramide colorée attribuée à Edgar Dale.

**La preuve.** Le cône d'expérience de Dale (1946) ne comportait aucun pourcentage. Les chiffres ont été ajoutés puis recopiés pendant des décennies sans source. Molenda, puis Subramony, Molenda, Betrus et Thalheimer, ont retracé leur origine sans jamais trouver la moindre étude empirique derrière eux.

**Niveau : fabriqué.** Ce n'est pas un résultat fragile, c'est une invention.

**Pourquoi c'est important commercialement.** Ces pourcentages circulent énormément dans les supports de formation, y compris en Afrique francophone. Les reprendre décrédibiliserait immédiatement EDUFREM auprès de tout interlocuteur académique.

### 4.5 Le « 2 sigma » de Bloom

Traité en P9. À retirer de tout support. La bonne valeur à citer est 0,76 à 0,79 (VanLehn, 2011).

### 4.6 La règle « une minute d'attention par année d'âge »

Très répandue, sans base empirique établie. La durée d'attention dépend massivement de la tâche, de l'intérêt et du contexte. Ne pas la citer, même si elle produit à peu près les mêmes durées de séance que celles retenues en section 3 pour de bien meilleures raisons.

### 4.7 La règle des 85 % de réussite

Wilson, Shenhav, Straccia et Cohen (2019, *Nature Communications*) démontrent qu'un taux d'erreur d'environ 15,87 % maximise la vitesse d'apprentissage. Résultat réel, souvent mal cité : il est **dérivé pour des algorithmes d'apprentissage par descente de gradient et des réseaux de neurones**, sur des tâches de classification binaire, et non pour des élèves humains en situation scolaire.

**Niveau : non établi en éducation.** C'est une heuristique de calibration défendable pour régler la difficulté adaptative de MIAPO, à condition de ne jamais la présenter comme un fait établi sur l'apprentissage humain.

---

## 5. Éthique et intégrité académique

### 5.1 Comprendre, pas faire à la place

C'est le principe fondateur, et il est désormais adossé à une preuve directe (section 2.1) et non à une posture morale.

**Règles opérationnelles.**

1. Le tuteur ne livre jamais la réponse finale d'emblée, y compris sur insistance.
2. Le tuteur amène l'apprenant à formuler sa propre réponse avant toute validation.
3. La réponse complète n'arrive qu'après vérification de la compréhension.
4. Sur un devoir noté, le tuteur aide à comprendre la méthode, il ne produit pas le rendu.
5. Ces règles sont dans le système, pas dans une charte : elles ne dépendent pas de la bonne volonté de l'utilisateur.

Ces cinq points sont déjà présents dans le prompt de `mapo-ia.php`. Ce document leur donne leur fondement.

### 5.2 Transparence sur les limites de l'IA

Le tuteur rappelle qu'un modèle de langage peut se tromper et invite à recouper avec le cours ou une source fiable. Cette règle est déjà dans le prompt. Elle sert deux fins : la justesse factuelle, et l'éducation à l'esprit critique, qui est en soi un objectif pédagogique.

Une exigence supplémentaire, non encore satisfaite : **l'apprenant doit toujours savoir qu'il parle à une machine**, sans ambiguïté, y compris chez les plus jeunes.

### 5.3 Protection des mineurs

**Recommandation internationale.** L'UNESCO, dans son *Guidance for generative AI in education and research* (2023), recommande un âge minimum de 13 ans pour l'usage autonome d'une IA générative, les plus jeunes ne devant l'utiliser que sous supervision d'un adulte, enseignant ou parent. Le cadre CARE-AI (Zulfiqar et Iqbal, 2026) formule la même exigence autrement : au primaire, restrictions sur le profilage, limitation du suivi comportemental automatisé, usage de l'IA générative adapté à l'âge.

**Position EDUFREM, tranchée le 1er septembre 2026.** MIAPO **ne pose pas de seuil d'âge**. La réponse retenue est plus forte et se tient devant n'importe quel jury : **MIAPO n'est pas une IA générative générique, son périmètre est encadré**.

1. Le tuteur ne traite que le scolaire : cours, concepts, explications, méthode, exercices.
2. Interdits à tout âge : humeur, état émotionnel, vie personnelle ou familiale, santé, relations, conseils de vie. Hors périmètre égale refus explicite et redirection vers le cours.
3. Tant que l'apprenant est mineur, l'historique complet est accessible au parent, et l'apprenant en est informé.
4. L'accès est ouvert par le parent ou le tuteur, jamais par l'enfant seul, et l'espace de données appartient au compte du parent.

C'est cette restriction de périmètre, et non un âge, qui répond à la recommandation UNESCO et à l'exigence 6 de CARE-AI. Le point 4 est déjà en place dans le code.

✅ **CODÉ le 2 septembre 2026.** Les points 1 et 2 étaient affirmés publiquement sans exister dans le produit : vérifié ligne à ligne le matin même, le prompt système ne contenait aucune interdiction de périmètre. Ils sont désormais dans `mapo-ia.php`, en français et en anglais, avec la liste explicite des sujets hors périmètre (humeur, état émotionnel, vie personnelle ou familiale, santé, relations, conseils de vie). Hors périmètre égale refus **doux** et retour au cours : un mur serait une mauvaise réponse à un enfant.

**La contradiction sur l'humeur est levée, arbitrage Steve : c'est un signal de RYTHME, jamais un sujet.** `digestApprenant.js` continue de transmettre la forme du jour — elle sert à raccourcir une séance un jour de fatigue, ce qui est légitime — mais le prompt interdit désormais de la mentionner ou de la questionner, et le champ lui-même porte la consigne. Sans cela, ce signal était une invitation à demander « ça ne va pas aujourd'hui ? », exactement ce qu'on s'interdit.

✅ **Garde-fou de protection de l'enfance : codé le même jour.** Si un apprenant exprime une détresse, une peur, une violence subie ou une idée de se faire du mal, le tuteur ne répond **ni par un refus sec ni par un conseil** : il dit en une ou deux phrases que ce que vit l'apprenant compte, qu'il n'est pas la bonne aide pour cela, invite à en parler tout de suite à un adulte de confiance, et s'arrête là.

⚠️ **Ce qui reste.** La restriction est appliquée, elle n'est pas encore **journalisée** : un refus hors périmètre ne laisse aucune trace côté serveur. Tant qu'il n'y a pas de trace, la position est tenue mais pas *démontrable* devant un jury, un ministère ou un parent. Ces règles sont pour l'instant protégées par des tests de présence (`src/__tests__/perimetre-et-feedback-miapo.test.js`), ce qui empêche la régression silencieuse mais ne prouve pas le comportement du modèle. Plan complet dans `08_DEEPTECH/2026-09-01_CARE-AI_extraction-et-plan-produits.md`.

### 5.4 Données personnelles

Trois cadres se superposent selon le pays de l'apprenant.

| Cadre | Portée | Point d'attention pour MIAPO |
|---|---|---|
| RGPD | Apprenants en France et dans l'Union européenne | Base légale, minimisation, durée de conservation, droits d'accès et d'effacement, sous-traitance du modèle d'IA |
| Convention de Malabo (Union africaine, 2014, entrée en vigueur 2023) | Cadre continental, ratifié notamment par le Sénégal, la Côte d'Ivoire et le Cameroun | Impose aux États un cadre national de protection des données |
| Lois nationales | Sénégal : loi n° 2008-12 du 25 janvier 2008, autorité CDP. Côte d'Ivoire : loi de 2013, autorité ARTCI. Cameroun : loi adoptée en décembre 2024 | Déclaration ou autorisation préalable selon les cas, transfert hors du pays |

**Réserve explicite.** Les références nationales ci-dessus sont données à titre de repère. Elles doivent être confirmées par un juriste avant tout engagement contractuel avec une école ou une institution. Ce document n'est pas un avis juridique.

**Principes de conception à tenir, indépendamment du pays.**

1. Minimisation : MIAPO n'a besoin ni de l'adresse, ni de la photo, ni du numéro de téléphone d'un enfant pour fonctionner.
2. L'état de révision est aujourd'hui stocké en local puis miroité dans l'espace du parent. C'est une bonne architecture de confidentialité, à préserver.
3. Les contenus de conversation avec le tuteur sont des données scolaires sensibles. Leur durée de conservation doit être décidée et documentée, pas subie.
4. Toute remontée vers l'école doit être agrégée ou explicitement consentie.

### 5.5 Équité en contexte de faibles ressources

Les résultats de la section 2.3 posent un problème réel : au Nigéria, les gains ont été plus forts chez les élèves déjà les plus performants. Un outil qui aide surtout ceux qui vont déjà bien creuse l'écart au lieu de le réduire.

À l'inverse, Mindspark (Muralidharan et al., 2019) et l'évaluation formative (Black et Wiliam, 1998) montrent des gains relatifs **plus forts chez les élèves faibles**, précisément parce qu'ils adaptent le contenu au niveau réel.

**Conséquence pour MIAPO.** La différence tient à la qualité de l'adaptation au niveau réel. C'est un argument de plus, et de poids, pour investir dans le positionnement et l'adaptation plutôt que dans les fonctionnalités visibles. Et c'est une mesure à instrumenter : suivre l'effet par quartile de niveau initial, et considérer comme un échec produit tout dispositif dont les gains se concentrent sur le quartile supérieur.

### 5.6 Adaptation culturelle et curriculaire

Un tuteur qui applique le programme français à un élève camerounais commet deux erreurs, une pédagogique et une politique.

**Ce qui est déjà en place, et c'est mesuré.** La banque de questions est indexée par pays (`bankKey` inclut le pays), la référence par école existe (`miapoRef`, exemples de sujets de l'établissement), et la table des niveaux tient compte des cycles par pays. Le registre qualité serveur donne le chiffre : **sans référentiel, 42 % des questions générées sont rejetées ; avec référentiel, 14 %**. L'alignement curriculaire divise le déchet par trois. C'est à ce jour la seule preuve interne chiffrée dont dispose EDUFREM sur MIAPO, et elle est reproductible devant un jury ou un ministère.

**Ce qui reste à tenir.**

1. Les exemples et les contextes des énoncés doivent être locaux (marché, transport, monnaie, prénoms, géographie), pas transposés.
2. Le référentiel officiel du pays fait foi, pas le programme français par défaut.
3. Les langues locales sont un actif, pas un obstacle. Le projet KALAN de collecte des langues locales relève de la même logique.
4. Un contenu produit par un modèle entraîné majoritairement sur des corpus occidentaux comporte un biais par défaut. Ce biais se corrige par la banque de questions locale et la relecture, pas par un prompt.

---

## 6. Contraintes produit et ce que la science en dit

| Contrainte | Ce que dit la recherche | Verdict |
|---|---|---|
| **Frugalité du modèle IA** | Aucun résultat n'établit qu'un modèle plus gros enseigne mieux. Ce qui compte, ce sont les garde-fous (Bastani et al., 2025) et la structure de la séance | La frugalité n'est pas un compromis pédagogique. Un appel génératif unique produisant tout un quiz est parfaitement défendable |
| **Texte d'abord, bas débit** | Angrist, Bergman et Matsheng (2022) obtiennent 0,12 écart-type avec des SMS et des appels. Le double codage est modéré, les styles d'apprentissage sont réfutés | Le texte n'est pas un pis-aller. C'est un canal dont l'efficacité est démontrée |
| **Fonctionnement hors connexion** | Le facteur limitant de l'espacement est la régularité, pas la richesse du contenu | Une banque locale rejouable sert directement P2 |
| **Multi-pays** | TaRL, Mindspark : l'adaptation au niveau réel prime sur tout le reste | Le référentiel national doit primer sur le programme par défaut |
| **Du primaire à l'adulte** | La mémoire de travail et l'autorégulation se développent (P6), mais l'écart au niveau réel pèse plus que l'âge (P12) | L'âge règle la forme de la séance, le niveau réel règle son contenu |

---

## 7. Tableau de synthèse : principe, preuve, implication, statut

| # | Principe | Preuve principale | Niveau | Implication MIAPO | Statut |
|---|---|---|---|---|---|
| P1 | Récupération active | Yang et al. 2021 (g=0,50 en classe) ; Adesope et al. 2017 (g=0,61) | Solide | Toute séance est une récupération | Fait |
| P2a | Espacement | Latimier et al. 2021 (g=0,74) | Solide | Reprises réparties, jamais massées | Partiel |
| P2b | Intervalle calé sur l'horizon | Cepeda et al. 2008 (20 % du délai à une semaine, 5 à 10 % à un an) | Solide | Le pas se calcule depuis l'horizon : examen, sinon fin de séquence, sinon fin de période (`periodes.js`) | À faire |
| P2c | Pas besoin d'intervalles expansifs | Latimier et al. 2021 (g=0,034, ns) | Solide | Calendrier uniforme, pas de SM-2 | Fait par défaut |
| P3 | Difficultés désirables | Bjork ; se ramène à P1 et P2 | Solide | Expliquer la difficulté à l'apprenant | Partiel |
| P4 | Entrelacement | Brunmair et Richter 2019 (g=0,42, modéré par le matériel) ; Rohrer et al. 2020 (d=0,83 en maths) | Solide en maths, modéré ailleurs | Activer selon le matériel, pas selon l'âge | Fait le 02/09 : `excludePrimaire` retiré de `interleave`, seul `needs` filtre |
| P5a | Exemples travaillés | Sweller et al. 2019 | Solide | Montrer un exemple résolu avant de faire chercher un novice | À faire |
| P5b | Inversion d'expertise | Kalyuga et al. 2003 | Solide | Étayage décroissant selon la jauge | À faire |
| P6 | Développement de la mémoire de travail | Gathercole et al. 2004 ; Cowan 2001 | Solide (le fait), non établi (l'inférence produit) | Séances plus courtes chez les jeunes, déclaré comme choix prudent | Fait, justification corrigée le 02/09 |
| P7 | Quatre piliers (Dehaene) | Synthèse | Modéré comme modèle intégré | Grille de relecture produit | Fait implicitement |
| P8a | Feedback riche | Wisniewski et al. 2020 (d=0,48) ; Black et Wiliam 1998 (0,4 à 0,7) | Solide | Toujours le pourquoi, jamais le score seul | Fait |
| P8b | Le feedback peut nuire | Kluger et DeNisi 1996 (plus d'un tiers dégradent) | Solide | Feedback sur la tâche, jamais sur la personne | Fait le 02/09 (chat FR et EN, et explications de quiz) |
| P9 | Tutorat et maîtrise | VanLehn 2011 (humain 0,79 ; machine 0,76) | Solide | Citer 0,76 à 0,79, jamais 2 sigma | À corriger dans les supports |
| P10a | Motivation autonome | Howard et al. 2021 | Modéré | Choix de la matière, du type, du rythme | Partiel |
| P10b | État d'esprit de développement | Sisk et al. 2018 (d=0,08) ; Macnamara et Burgoyne 2023 | Contesté | Ne pas en faire un argument produit | À surveiller |
| P11 | Métacognition | EEF (impact élevé, coût faible, preuve solide) | Solide | Jugement de confiance, prédiction de score | Fait le 02/09 (`utils/calibration.js`, zéro appel IA) |
| P12 | Adaptation au niveau réel | TaRL ; Muralidharan et al. 2019 ; Angrist et al. 2022 | Solide | Le positionnement prime sur la bande d'âge | Fait |
| P13a | La ludification aide modestement | Sailer et Homner 2020 (g=0,49 cognitif) | Modéré | On garde badges, séries et points | Fait |
| P13b | Les récompenses tangibles sapent la motivation | Deci, Koestner et Ryan 1999 (d de -0,28 à -0,40) | Solide | Symbolique uniquement, sur le processus, sans classement | Fait, à tenir |
| P13c | Série de jours réparable et message informatif | Howard et al. 2021 ; choix prudentiel | Non établi | Joker de rattrapage, aucun message punitif ni centré sur la personne | À faire |
| IA1 | Garde-fous obligatoires | Bastani et al. 2025 (PNAS) | Solide | Mode socratique non désactivable | Fait |
| IA2 | Mesurer sans assistance | Bastani et al. 2025 | Solide | Évaluer sur test différé, pas sur la séance | À faire |
| IA3 | Risque d'équité | Banque mondiale Nigéria 2024 | Modéré | Suivre l'effet par quartile de niveau initial | À faire |

---

## 8. Écarts entre la science et MIAPO aujourd'hui

### E1. L'espacement ignore l'horizon de restitution
`tuteur.js`, fonction `recordResult` : l'intervalle vaut 7 jours si le score dépasse 80 %, 3 jours au-dessus de 50 %, 1 jour sinon. Ces valeurs ne dépendent ni de la date du contrôle, ni de la fin de séquence, ni de la date d'examen, alors que `periodes.js` et `examens.js` détiennent déjà ces dates. Cepeda et al. (2008) montrent que c'est précisément l'horizon qui détermine le bon écart.
**Gravité : élevée.** C'est l'écart le plus coûteux en efficacité réelle. **Et il est réparable sans rien demander à l'utilisateur** : dès que MAPO est relié, la fin de séquence donne l'horizon (voir le tableau des sources en P2).

### E2. L'espacement porte sur la matière, pas sur la notion
L'état de révision est indexé par matière (`data[subjectId]`). Un élève qui maîtrise les fractions et échoue sur les pourcentages a un seul score de « mathématiques » et une seule date de reprise. La littérature sur l'espacement porte sur des items, pas sur des disciplines.
**Gravité : élevée.** Sans granularité par notion, la répétition espacée reste largement symbolique.

### E3. La justification du 5 à 10 questions n'est pas soutenue par les sources citées
Traité en P6 et section 3. Correction de commentaire, coût nul, enjeu de crédibilité élevé.
**Gravité : moyenne, coût de correction quasi nul.**

✅ **RÉSOLU le 2 septembre 2026.** L'en-tête de `ageProfil.js` déclare désormais la
fourchette comme un choix de prudence cohérent avec P5 et P6 mais non prescrit par
ces travaux, et `sessionQuestions` porte la même mention. Deux corrections
supplémentaires au passage : la référence « Cowan 2016 » est devenue **Cowan 2001**
(celle de la bibliographie, le « nombre magique 4 » — la précédente n'était pas
vérifiable), et la mention « l'attention soutenue augmente avec l'âge » a été
retirée, parce qu'elle constituait un pas vers la règle « une minute par année
d'âge » écartée en 4.6. Le renvoi « cf. MANIFESTE » pointait vers le document
perdu : il pointe maintenant vers ce référentiel. Aucune valeur n'a bougé.

### E4. L'entrelacement est filtré par l'âge et non par le matériel
`revisionTypes.js`, drapeau `excludePrimaire` sur `interleave`. Le modérateur identifié par Brunmair et Richter (2019) est la nature du matériel et la similarité entre catégories. La preuve directe au primaire est mince, l'exclusion peut donc rester, mais comme prudence documentée et non comme conclusion scientifique.
**Gravité : moyenne.**

✅ **RÉSOLU le 2 septembre 2026, et le comportement A changé** (arbitrage Steve).
`excludePrimaire` a été **retiré de `interleave`** : l'entrelacement est désormais
proposé au primaire, et c'est le seul filtre fondé, `needs: ['scientifique']`, qui
décide — donc là où il existe des procédures voisines à discriminer, ce qui est le
cas dès le calcul élémentaire.

⚠️ **Attention à la formulation de cette décision.** Elle ne se justifie PAS par
« la recherche montre qu'il ne faut pas exclure le primaire » : la preuve directe
y est mince, la recherche ne s'est pas prononcée. Elle se justifie par « le
critère d'âge n'a jamais été fondé, donc on s'en remet au seul critère qui l'est,
le matériel » (Brunmair et Richter, 2019). La nuance compte devant un jury.

Le drapeau subsiste sur `redaction` et `mindmap`, pour un motif tout autre et sans
prétention scientifique : un élève de primaire ne rédige pas un texte argumentatif
guidé et ne construit pas une carte conceptuelle abstraite. Choix d'ingénierie,
déclaré comme tel.

Une note a été ajoutée sur `dual-coding`, que la section 4.1 signale comme piège
de formulation : les schémas aident tous les apprenants, pas particulièrement les
apprenants dits visuels.

### E5. Les erreurs ne sont pas reprises de façon ciblée
Les questions signalées comme fausses sont écartées, les questions déjà vues sont écartées sur douze séances. Mais rien ne garantit qu'une notion échouée revienne. Or c'est le point de rencontre de P1, P2 et du troisième pilier de Dehaene.
**Gravité : élevée.**

### E6. Rien ne garantit que le feedback du chat porte sur la tâche
Le prompt impose le mode socratique et l'explication. Il n'interdit pas explicitement les formulations centrées sur la personne (« tu es bon en », « tu as toujours du mal avec »). Kluger et DeNisi (1996) montrent que c'est exactement là que le feedback bascule du positif au négatif.
**Gravité : moyenne, coût de correction faible (une ligne de prompt).**

✅ **RÉSOLU le 2 septembre 2026, et étendu au-delà du périmètre de l'écart.**
L'interdiction est posée dans le prompt du chat, **en français et en anglais**
(parité obligatoire), et **aussi dans le prompt de génération de quiz** : une
explication de quiz est un feedback au sens de Kluger et DeNisi, et c'est même la
forme que l'apprenant rencontre le plus souvent. L'écart ne visait que le chat ;
l'étendre coûtait le même effort.

Sont interdits les jugements de capacité **dans les deux sens** — « tu es faible
en… » comme « tu es doué » — ainsi que toute comparaison entre apprenants. La
consigne précise explicitement que la chaleur et l'encouragement restent
demandés : ce qui est visé est le jugement sur la personne en situation
d'évaluation, pas la bienveillance. Sans cette précision, la règle aurait produit
un tuteur froid, ce que Kluger et DeNisi ne demandent nulle part.

### E7. Aucune trace métacognitive
Pas de jugement de confiance, pas de prédiction de score, pas de retour de calibration. C'est l'intervention à meilleur rapport effet sur coût de tout ce document (EEF), et elle est absente.
**Gravité : élevée, coût faible.**

✅ **RÉSOLU le 2 septembre 2026**, `utils/calibration.js` et `TuteurQuiz.vue`.
**Aucun appel IA ajouté** : tout se calcule en local à partir de ce que
l'apprenant a déjà cliqué. La calibration est une soustraction, pas une
inférence — si quelqu'un est un jour tenté d'appeler le modèle pour « analyser »
la calibration, c'est qu'il a perdu le fil.

Trois dispositifs :

1. **Prédiction de score** avant la séance, sur un écran dédié (mode `predire`).
2. **Jugement de confiance** par question, posé AVANT de répondre.
3. **Bilan** en fin de séance, puis tendance sur plusieurs séances, visible aussi
   par le parent dans l'écran Progression.

⚠️ **Un compromis d'implémentation à connaître, il n'est pas dans le
référentiel.** Le quiz valide au CLIC et sous CHRONOMÈTRE. Insérer une étape
« confirmer » à chaque question aurait doublé les clics sous contrainte de temps :
de la friction, pas de la métacognition. Le réglage de confiance est donc
**facultatif** — non touché, il vaut `null`, et la mesure porte sur les seules
questions où l'apprenant s'est prononcé. Pour la même raison, la prédiction passe
par un mode à part et non par un encart au-dessus de la question 1 : le chrono
démarre dès que le mode vaut `quiz`, un encart aurait mangé le temps de lecture.

⚠️ **La confiance n'est enregistrée qu'au PREMIER essai.** Après une erreur,
l'apprenant sait déjà qu'il s'était trompé : sa confiance ne mesurerait plus rien.

⚠️ **Deux règles de retenue, volontaires.** Rien n'est affiché avant **deux
séances** (une tendance sur un point n'est pas une tendance), et un écart d'un
point sur dix ne déclenche **aucun** message : c'est du bruit, le commenter
fabriquerait du sens. Même logique que le seuil d'affichage de la ligue.

⚠️ **Minimisation (section 5.4)** : on ne stocke que des compteurs agrégés par
séance, jamais le détail question par question. Et la calibration s'efface avec
le profil.

**Ce que ça apporte de neuf au produit** : c'est la seule mesure qui distingue une
LACUNE (l'apprenant sait qu'il ne sait pas) d'une ILLUSION (il croit savoir). Or
l'illusion de compétence est exactement ce que Bastani et al. (2025) ont mesuré
chez les élèves en accès libre à une IA. MIAPO peut désormais la voir.

⚠️ **Défaut trouvé en PRODUCTION, pas par les tests.** Le bilan de l'écran
Progression était écrit à la 3e personne pour tout le monde : une élève lisant
son propre bilan se voyait annoncer « il a réussi… ». `/mon-espace` sert le même
écran à l'apprenant ET au parent (`isApprenant`), ce que les tests unitaires ne
pouvaient pas voir — ils vérifiaient les messages, pas qui les lit. Corrigé :
deux jeux de clés, et la version parent NOMME l'enfant plutôt que d'écrire
« il », ce qui évite en prime d'accorder au masculin ce qui ne l'est pas. Un test
verrouille les deux jeux. Illustration de la règle : **un test vert peut encoder
un bug**.

⚠️ **Second défaut, même passage à l'écran** : le bloc s'appelait `calib-card`.
`main.css` peint tout `[class*="-card"]` en fond blanc + ombre portée, en
`!important` — le bloc héritait donc d'un habillage de carte SANS padding ni
marge, et chevauchait la liste des niveaux. Renommé `calib-bloc`, avec son
propre style. Rien de tout ça n'est visible sans ouvrir la page.

### E8. Pas d'exemple travaillé avant la pratique
Un apprenant qui découvre une notion entre directement en récupération ou en chat socratique. Pour un novice, c'est contraire à l'effet d'exemple travaillé, et le socratique y devient de la charge inutile.
**Gravité : moyenne à élevée.**

### E9. La difficulté adaptative ne vise pas une cible de réussite
La jauge monte selon le score, mais aucun taux de réussite cible n'est défini. Sans cible, on ne sait pas si la difficulté est bien réglée.
**Gravité : moyenne.** Piste de calibration : viser une réussite autour de 80 à 85 %, en assumant qu'il s'agit d'une heuristique (voir 4.7).

### E10. Aucun protocole de mesure de l'efficacité
MIAPO mesure la réussite pendant la séance. Bastani et al. (2025) montrent que c'est exactement la mesure trompeuse : leur groupe le plus performant pendant l'entraînement n'apprenait pas mieux. Sans test différé sans assistance, EDUFREM ne saura jamais si MIAPO fonctionne, et ne pourra rien démontrer à une institution.
**Gravité : élevée. C'est l'écart stratégique le plus important du document.**

### E11. Le bornage de la difficulté par le haut existe, celui par le bas est à vérifier
`progressionNiveau.js` plafonne au programme de la classe et propose le passage à l'année suivante. Il faut vérifier qu'un apprenant en retard peut réviser un programme d'année inférieure sans friction ni marquage négatif (P12).
**Gravité : moyenne, à instruire.**

### E12. Les récompenses ne respectent pas encore les règles arbitrées
L'arbitrage a été rendu le 2 septembre 2026, voir P13 : on garde la ludification et on l'aligne sur la preuve. Deux écarts restent ouverts dans `recompenses.js`.

1. **La série de jours n'est pas réparable.** Une rupture est définitive, ce qui transforme un encouragement en pression, puis en motif d'abandon. À rendre réparable (joker ou rattrapage), sans message punitif.
2. **Les libellés de récompense ne sont pas systématiquement informatifs.** « 7 jours de suite, bravo ! » vise la personne. Formulation conforme : dire ce que le comportement produit sur l'apprentissage.

**Gravité : moyenne, coût faible.** Les autres règles de P13 (rien de monnayable, pas de classement, Elo interne) sont déjà respectées et deviennent des interdits à tenir.

---

## 9. Backlog priorisé d'implémentation

Ordre recommandé, du meilleur rapport preuve sur coût au plus lourd.

**Rang 1. Corriger les justifications dans le code** (E3, E4, E6)
Commentaires de `ageProfil.js` et `revisionTypes.js`, plus une ligne de prompt interdisant le feedback centré sur la personne. Quelques heures, aucun risque, effet immédiat sur la crédibilité du dossier.
Preuve : P6, P4, Kluger et DeNisi 1996.

**Rang 2. Ajouter la métacognition minimale** (E7)
Un bouton de confiance avant validation, une prédiction de score en début de séance, une comparaison en fin de séance. Aucun appel IA supplémentaire, donc frugalité préservée.
Preuve : EEF, impact élevé et coût faible.

**Rang 3. Reprise ciblée des erreurs** (E5)
Les notions échouées reviennent à la séance suivante, puis selon l'espacement. Suppose de taguer les questions par notion, ce que le générateur peut faire au moment de la production.
Preuve : P1, P2, quatrième pilier de Dehaene.

**Rang 4. Espacement piloté par l'horizon et par la notion** (E1, E2)
Le pas de révision se calcule depuis l'horizon de restitution, dans cet ordre : date d'examen déclarée, sinon **fin de la séquence en cours**, sinon **fin de la période en cours** (`periodes.js`, disponibles dès que MAPO est relié), sinon repli forfaitaire actuel. Pas visé : environ 20 % des jours restants, borné à un minimum d'un jour. En parallèle, l'état de révision descend au niveau de la notion. Chantier le plus lourd, gain d'efficacité le plus élevé.
Preuve : Cepeda et al. 2008, Latimier et al. 2021.

**Rang 5. Protocole d'évaluation interne** (E10, IA3)
Sur un échantillon volontaire d'écoles partenaires : un test différé à J+7 sans assistance, comparaison avec un groupe témoin, effet analysé par quartile de niveau initial. C'est ce qui transforme un argumentaire en preuve.
Preuve : Bastani et al. 2025 pour le risque mesuré, Banque mondiale Nigéria pour le risque d'équité.

**Rang 6. Exemples travaillés et étayage décroissant** (E8, E9)
Sur une notion nouvelle, un exemple résolu précède la pratique. L'étayage diminue à mesure que la jauge monte.
Preuve : Sweller et al. 2019, Kalyuga et al. 2003.

**Rang 7. Mise en conformité des récompenses** (E12)
Série de jours réparable par un joker, aucun message punitif à la rupture, libellés de récompense reformulés en information sur l'apprentissage plutôt qu'en jugement sur la personne. Petit chantier, à faire quand `recompenses.js` est ouvert pour autre chose.
Preuve : P13, Deci et al. 1999, Kluger et DeNisi 1996.

**Rang 8. Arbitrage produit restant** (E11)
Vérifier qu'un apprenant en retard peut réviser un programme d'année inférieure sans friction ni marquage négatif.

---

## 10. Bibliographie

Toutes les références ci-dessous ont été vérifiées (auteurs, année, revue, résultat principal) au 2 septembre 2026.

**Récupération active et effet-test**

- Adesope, O. O., Trevisan, D. A., et Sundararajan, N. (2017). Rethinking the Use of Tests: A Meta-Analysis of Practice Testing. *Review of Educational Research*, 87(3). https://journals.sagepub.com/doi/abs/10.3102/0034654316689306
- Roediger, H. L., et Karpicke, J. D. (2006). Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention. *Psychological Science*, 17(3), 249-255. https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x
- Yang, C., Luo, L., Vadillo, M. A., Yu, R., et Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review. *Psychological Bulletin*, 147(4). https://pubmed.ncbi.nlm.nih.gov/33683913/

**Espacement**

- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., et Pashler, H. (2008). Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention. *Psychological Science*, 19(11), 1095-1102. https://journals.sagepub.com/doi/abs/10.1111/j.1467-9280.2008.02209.x
- Latimier, A., Peyre, H., et Ramus, F. (2021). A Meta-Analytic Review of the Benefit of Spacing out Retrieval Practice Episodes on Retention. *Educational Psychology Review*, 33. https://link.springer.com/article/10.1007/s10648-020-09572-8

**Entrelacement**

- Brunmair, M., et Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin*, 145(11), 1029-1052. https://www.semanticscholar.org/paper/bb5392e8eaf53a38cc0d147f301cce74cecb4436
- Rohrer, D., Dedrick, R. F., Hartwig, M. K., et Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. *Journal of Educational Psychology*, 112(1), 40-52. https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf

**Synthèse des techniques d'étude**

- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., et Willingham, D. T. (2013). Improving Students' Learning With Effective Learning Techniques. *Psychological Science in the Public Interest*, 14(1), 4-58. https://journals.sagepub.com/doi/abs/10.1177/1529100612453266

**Charge cognitive et mémoire de travail**

- Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. *Behavioral and Brain Sciences*, 24(1), 87-114. https://philpapers.org/rec/COWTMN
- Gathercole, S. E., Pickering, S. J., Ambridge, B., et Wearing, H. (2004). The Structure of Working Memory From 4 to 15 Years of Age. *Developmental Psychology*, 40(2), 177-190. https://personalpages.manchester.ac.uk/staff/ben.ambridge/papers/Gathercole,%20Pickering,%20Ambridge%20&%20Waring%20(2004).pdf
- Kalyuga, S., Ayres, P., Chandler, P., et Sweller, J. (2003). The Expertise Reversal Effect. *Educational Psychologist*, 38(1), 23-31. https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4
- Sweller, J., van Merriënboer, J. J. G., et Paas, F. (2019). Cognitive Architecture and Instructional Design: 20 Years Later. *Educational Psychology Review*, 31, 261-292. https://link.springer.com/article/10.1007/s10648-019-09465-5

**Feedback**

- Black, P., et Wiliam, D. (1998). Inside the Black Box: Raising Standards Through Classroom Assessment. *Phi Delta Kappan*, 80(2). http://allianceforlearning.co.uk/wp-content/uploads/2017/03/William-and-Black-Inside-the-Black-Box.pdf
- Kluger, A. N., et DeNisi, A. (1996). The effects of feedback interventions on performance. *Psychological Bulletin*, 119(2), 254-284. https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/The%20effects%20of%20feedback%20interventions.pdf
- Wisniewski, B., Zierer, K., et Hattie, J. (2020). The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research. *Frontiers in Psychology*, 10, 3087. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6987456/

**Tutorat, maîtrise, motivation, métacognition**

- Deci, E. L., Koestner, R., et Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627-668. https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- Sailer, M., et Homner, L. (2020). The Gamification of Learning: a Meta-analysis. *Educational Psychology Review*, 32, 77-112. https://eric.ed.gov/?id=EJ1245270
- Education Endowment Foundation. Metacognition and self-regulation. *Teaching and Learning Toolkit*. https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation
- Howard, J. L., Bureau, J., Guay, F., Chong, J. X. Y., et Ryan, R. M. (2021). Student Motivation and Associated Outcomes: A Meta-Analysis From Self-Determination Theory. *Perspectives on Psychological Science*, 16(6), 1300-1323. https://journals.sagepub.com/doi/abs/10.1177/1745691620966789
- Macnamara, B. N., et Burgoyne, A. P. (2023). Do growth mindset interventions impact students' academic achievement? *Psychological Bulletin*, 149(3-4). https://pmc.ncbi.nlm.nih.gov/articles/PMC10495100/
- Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., et Macnamara, B. N. (2018). To What Extent and Under Which Circumstances Are Growth Mind-Sets Important to Academic Achievement? *Psychological Science*, 29(4). https://journals.sagepub.com/doi/10.1177/0956797617739704
- VanLehn, K. (2011). The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems. *Educational Psychologist*, 46(4), 197-221. https://www.tandfonline.com/doi/abs/10.1080/00461520.2011.611369

**Tutorat par IA générative**

- Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., et Mariman, R. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. *PNAS*. https://www.pnas.org/doi/10.1073/pnas.2422633122
- Banque mondiale (2025). From Chalkboards to Chatbots: Evaluating the Impact of Generative AI on Learning Outcomes in Nigeria. *Policy Research Working Paper 11125*. https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099548105192529324
- Kestin, G., Miller, K., et al. (2025). AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting. *Scientific Reports*. https://www.nature.com/articles/s41598-025-97652-6

**Contextes à faibles ressources et adaptation au niveau réel**

- Angrist, N., Bergman, P., et Matsheng, M. (2022). Experimental evidence on learning using low-tech when school is out. *Nature Human Behaviour*, 6. https://www.nature.com/articles/s41562-022-01381-z
- Muralidharan, K., Singh, A., et Ganimian, A. J. (2019). Disrupting Education? Experimental Evidence on Technology-Aided Instruction in India. *American Economic Review*, 109(4). https://www.aeaweb.org/articles?id=10.1257/aer.20171112
- J-PAL. Teaching at the Right Level to improve learning. https://www.povertyactionlab.org/case-study/teaching-right-level-improve-learning

**Neuromythes**

- Kirschner, P. A., et De Bruyckere, P. (2017). The myths of the digital native and the multitasker. *Teaching and Teacher Education*, 67, 135-142. https://www.sciencedirect.com/science/article/abs/pii/S0742051X16306692
- Newton, P. M., et Salvi, A. (2020). How Common Is Belief in the Learning Styles Neuromyth, and Does It Matter? *Frontiers in Education*, 5. https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2020.602451/full
- Pashler, H., McDaniel, M., Rohrer, D., et Bjork, R. (2008). Learning Styles: Concepts and Evidence. *Psychological Science in the Public Interest*, 9(3), 105-119. https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Pashler_McDaniel_Rohrer_Bjork_2009_PSPI.pdf
- Subramony, D., Molenda, M., Betrus, A., et Thalheimer, W. (2014). The Mythical Retention Chart and the Corruption of Dale's Cone of Experience. *Educational Technology*, 54(6). https://eric.ed.gov/?id=EJ1057239
- Wilson, R. C., Shenhav, A., Straccia, M., et Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. *Nature Communications*, 10, 4646. https://www.nature.com/articles/s41467-019-12552-4

**Éthique et cadre réglementaire**

- UNESCO (2023). *Guidance for generative AI in education and research*. https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research
- Zulfiqar, M., et Iqbal, U. (2026). CARE-AI: a responsible framework for integrating artificial intelligence in primary education. *Education Innovations: Systems and Future Learning*, 1(1), 445, Emerald. Cadre conceptuel, non validé empiriquement en classe.
- Union africaine (2014). Convention sur la cybersécurité et la protection des données à caractère personnel (Convention de Malabo), entrée en vigueur en 2023.
- République du Sénégal. Loi n° 2008-12 du 25 janvier 2008 portant sur la protection des données à caractère personnel. https://www.afapdp.org/wp-content/uploads/2018/05/Senegal-texte-de-loi-2008.pdf
- République de Côte d'Ivoire. Loi de 2013 sur la protection des données à caractère personnel, autorité de contrôle ARTCI.
- République du Cameroun. Loi sur la protection des données à caractère personnel adoptée en décembre 2024 (référence exacte à confirmer par un juriste).

**Cadre général**

- Dehaene, S. Les quatre piliers de l'apprentissage : attention, engagement actif, retour sur l'erreur, consolidation. Voir *Apprendre !* (Odile Jacob, 2018) et les cours du Collège de France.
- Bjork, R. A. Difficultés désirables. Voir les travaux du Bjork Learning and Forgetting Lab, UCLA. https://bjorklab.psych.ucla.edu/

---

## 11. Comment ce document doit vivre

1. **Il est versionné avec le code.** Il vit dans `docs/` du dépôt MAPO, pas dans un dossier documentaire séparé. Une modification de paramètre pédagogique et une modification de ce fichier vont dans la même livraison.
2. **Il est daté.** Les résultats sur le tutorat par IA générative évoluent vite. La section 2 doit être revue au moins une fois par an.
3. **Il ne s'écrit pas à l'envers.** On ne cherche pas une source pour justifier une fonctionnalité déjà décidée. Si aucune source ne soutient un choix, on écrit « choix d'ingénierie » et on le calibre sur les données.
4. **Il sert de base à la version courte** destinée aux écoles et aux partenaires, qui en est un extrait fidèle.
