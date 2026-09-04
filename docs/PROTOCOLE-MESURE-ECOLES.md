# Protocole de mesure de MIAPO en école partenaire

Version 1 — 4 septembre 2026. Document de travail EDUFREM, à présenter aux écoles
partenaires. Adossé à `REFERENTIEL-PEDAGOGIQUE-MIAPO.md` (écart E10, rang 5 du
backlog), dont il applique la règle : chaque paramètre est soit sourcé, soit
déclaré choix d'ingénierie non démontré.

---

## 0. Ce que ce protocole sert à établir, et ce qu'il ne prétend pas

**La question.** Les élèves qui travaillent avec MIAPO retiennent-ils davantage,
mesuré une semaine plus tard, sans aucune assistance ?

**Pourquoi elle se pose.** Bastani et al. (PNAS 2025, environ 1 000 lycéens) ont
mesuré ce que personne ne veut regarder : leur groupe qui réussissait le mieux
*pendant* l'entraînement avec une IA générative en accès libre a perdu **17 %** à
l'examen final par rapport aux élèves sans IA. Un tuteur peut donc produire de
très bons scores d'entraînement et un moins bon apprentissage. Tant qu'EDUFREM ne
mesure que la réussite en séance, EDUFREM ne sait rien — et ne peut rien
démontrer à un ministère, un bailleur ou un jury.

**Ce que ce protocole ne fera pas.** Il ne dira pas « MIAPO fait gagner X points ».
Un dispositif de cette taille produit une **estimation avec un intervalle large**,
pas une preuve. Cette limite est écrite ici pour qu'aucun support commercial ne
la contourne plus tard : la section 4 dit exactement ce qu'on pourra conclure, et
ce qu'on ne pourra pas.

---

## 1. Le dispositif en une page

| | |
|---|---|
| **Unité tirée au sort** | la **classe**, jamais l'élève |
| **Plan** | coin échelonné (*stepped wedge*) : toutes les classes reçoivent MIAPO, à des dates différentes |
| **Durée** | 12 semaines, trois vagues de 4 semaines |
| **Mesure principale** | épreuve différée **à J+7**, sans assistance, sur des questions jamais vues |
| **Mesure secondaire** | écart entre score prédit et score obtenu (illusion de compétence) |
| **Analyse** | par **quartile de niveau initial**, pas seulement en moyenne |
| **Ce que l'école reçoit** | ses propres résultats, l'accès gratuit pendant toute l'étude, et après |

**Pourquoi la classe et non l'élève.** Des élèves de la même classe se parlent,
se prêtent le téléphone et travaillent ensemble. Tirer au sort à l'intérieur
d'une classe garantit que le groupe témoin sera contaminé, et un effet mesuré sur
un témoin contaminé est sous-estimé sans qu'on sache de combien.

**Pourquoi le coin échelonné.** C'est ce qui rend l'étude à la fois faisable et
acceptable. Chaque classe passe du témoin à l'intervention à une date tirée au
sort : **chaque classe est son propre témoin**, ce qui divise fortement le nombre
de classes nécessaires, et **aucune famille ne se voit refuser l'outil** — elle
l'a plus tard, pas jamais. C'est l'argument qui fera accepter l'étude par un chef
d'établissement et par une association de parents.

---

## 2. Déroulé

### Étape 0 — avant de commencer (semaine −2)

1. **Accord écrit du chef d'établissement**, avec le nom de l'enseignant référent.
2. **Information des familles et consentement** (annexe A). Sans consentement, un
   élève utilise MIAPO comme les autres mais **ses résultats ne sont pas analysés**.
   Refuser l'étude n'exclut jamais de l'outil.
3. **Pré-enregistrement de l'analyse** : la question, la mesure principale, la
   règle d'analyse et les seuils sont **écrits et datés avant la première
   donnée**, déposés dans le dossier des documents validés. Voir section 5.
4. **Pré-test** commun à toutes les classes, sur le programme de la période. Il
   sert à deux choses : établir le niveau de départ, et **constituer les
   quartiles** de la section 4.

### Étape 1 — les trois vagues (semaines 1 à 12)

Six classes minimum, réparties en trois vagues de deux. Toutes les classes font
cours normalement. À sa date, chaque vague ajoute MIAPO.

| | S1-S4 | S5-S8 | S9-S12 |
|---|---|---|---|
| Vague 1 | MIAPO | MIAPO | MIAPO |
| Vague 2 | témoin | MIAPO | MIAPO |
| Vague 3 | témoin | témoin | MIAPO |

**Dose minimale à respecter et à relever** : deux séances par semaine et par
matière suivie. Une classe sous ce seuil n'est pas exclue — elle est **analysée
séparément**, parce qu'exclure les classes qui ont peu utilisé l'outil est
exactement la manière de fabriquer un résultat flatteur.

### Étape 2 — la mesure (fin de chaque vague, puis J+7)

L'épreuve se passe **dans l'application, en mode épreuve** (`utils/examenBlanc.js`) :
ni indice, ni cours, ni explication avant de répondre, ni chat, un seul essai.
Elle peut aussi se passer sur papier si l'établissement le préfère ; le contenu
est le même.

Trois règles non négociables, sans quoi la mesure ne vaut rien :

- **À J+7, pas le jour même.** Mesurer à la fin d'une séance mesure la mémoire de
  travail, pas ce qui reste. C'est le point central de Bastani.
- **Questions jamais vues.** Elles sont tirées d'une réserve constituée avant
  l'étude et **exclue du générateur de révision** pendant toute la durée. Sans
  cela, on mesure la mémoire des items, pas l'apprentissage.
- **Surveillée par l'enseignant**, téléphone posé, aucune autre application. La
  mesure est faite en classe, pas à la maison.

---

## 3. Ce qu'on relève, et rien d'autre

| Donnée | Pourquoi | Forme |
|---|---|---|
| Score au pré-test | niveau de départ, quartiles | note sur 20, par élève pseudonymisé |
| Score à J+7 | mesure principale | idem |
| Score prédit avant l'épreuve | illusion de compétence (P11) | nombre annoncé |
| Nombre de séances faites | dose réellement reçue | compteur |
| Classe, vague, matière | plan d'analyse | — |

**Pseudonymisation à la source.** L'école tient seule la table qui relie un code
à un élève. EDUFREM ne reçoit **jamais** de nom, et ne peut pas remonter à un
élève. Aucune donnée de comportement, aucune conversation, aucune humeur n'entre
dans cette étude.

**Rien de plus.** Toute donnée qui ne sert pas une ligne du tableau ci-dessus
n'est pas collectée. C'est la règle de minimisation de la section 5.4 du
référentiel, et c'est aussi ce qui rend l'étude défendable devant des parents.

---

## 4. Ce qu'on pourra conclure

**En moyenne.** L'écart entre classes sous MIAPO et classes témoins, à la même
période, corrigé de la tendance temporelle. Avec six classes, cet écart aura un
**intervalle de confiance large** : on saura dire « l'effet est probablement
positif et compris entre tel et tel ordre de grandeur », pas « l'effet vaut X ».
Dire mieux serait faux.

**Par quartile de niveau initial — et c'est le résultat qui compte.** La Banque
mondiale (Nigéria, 2024) mesure 0,23 écart-type, et Muralidharan (AER 2019,
Mindspark) trouve **les gains les plus forts chez les élèves les plus faibles**.
Si MIAPO ne produit d'effet que dans le quartile haut, il creuse l'écart au lieu
de le réduire, et il faut le dire — c'est un résultat, pas un échec de l'étude.

**Sur l'illusion de compétence.** L'écart entre score prédit et score obtenu est
la seule mesure qui distingue une lacune (l'élève sait qu'il ne sait pas) d'une
illusion (il croit savoir). C'est précisément le mécanisme que Bastani a observé.
Si MIAPO réduit cette illusion, c'est un argument que personne d'autre sur le
marché ne peut produire.

**Ce qu'on ne pourra pas conclure** : que l'effet vaut pour un autre pays, un
autre niveau ou une autre matière que ceux testés ; ni qu'il tient au-delà de
douze semaines.

---

## 5. Le conflit d'intérêt, et comment on le neutralise

EDUFREM mesure son propre produit. C'est la première objection que soulèvera un
jury sérieux, et elle est légitime. Quatre garde-fous, tous vérifiables :

1. **Pré-enregistrement.** L'hypothèse, la mesure principale et la règle
   d'analyse sont écrites, datées et déposées **avant la première donnée**.
   Changer d'analyse après avoir vu les résultats est la façon la plus courante
   de fabriquer un effet.
2. **Une seule mesure principale.** Multiplier les mesures et retenir celle qui
   sort bien produit un résultat par hasard. La mesure principale est le score à
   J+7. Le reste est exploratoire, et sera présenté comme tel.
3. **La clé reste à l'école.** EDUFREM ne peut pas ré-identifier un élève, donc
   ne peut pas trier les données a posteriori.
4. **Publication dans les deux sens.** Le résultat est rendu à l'école et publié
   **même s'il est nul ou négatif**. Un résultat négatif publié vaut plus, devant
   un bailleur, que trois témoignages enthousiastes.

Renfort possible, à proposer si l'école ou un partenaire le souhaite : confier
l'analyse à un tiers universitaire. Une thèse ou un mémoire de master en sciences
de l'éducation trouve ici un terrain, et EDUFREM y gagne une signature qui n'est
pas la sienne.

---

## 6. Ce que l'étude demande à l'école, honnêtement

- **À l'enseignant référent** : environ une heure par semaine (relevé de la dose,
  passation de l'épreuve, signalement des incidents).
- **Aux élèves** : deux séances par semaine, plus 30 minutes d'épreuve à la fin
  de chaque vague. Le temps de classe n'est pas amputé : MIAPO se fait en travail
  personnel.
- **À la direction** : un accord écrit, l'information des familles, et la
  désignation d'un référent.

**Ce que l'école reçoit** : le rapport de ses propres classes (progression par
quartile, ce qui a marché et ce qui n'a pas marché), l'accès gratuit à MIAPO
pendant l'étude et après, et son nom associé à la publication si elle le
souhaite. Elle peut arrêter à tout moment, sans justification et sans perdre
l'accès.

---

## 7. Étape préalable : le pilote de faisabilité

**Avant la première vague, une école, deux classes, trois semaines.** On ne
cherche aucun effet : on vérifie que le dispositif tient debout.

Ce qui doit être vrai à la fin du pilote, sinon on ne lance pas l'étude :

- au moins **70 %** des élèves consentants ont passé l'épreuve à J+7 ;
- la réserve de questions n'a **jamais** été servie en révision ;
- le relevé de dose est exploitable pour toutes les classes ;
- aucune famille n'a demandé le retrait de ses données ;
- l'enseignant référent tient le rythme sans y passer plus d'une heure.

Ces cinq points sont des critères d'arrêt, pas des indicateurs. Un pilote qui les
rate signale un dispositif à corriger, ce qui est infiniment moins coûteux qu'une
étude de douze semaines dont on découvre à la fin qu'elle ne mesure rien.

---

## 8. Ce qu'il reste à construire côté produit

Le mode épreuve existe depuis le 4 septembre 2026. Trois pièces manquent encore
pour que ce protocole soit exécutable tel quel :

1. **La réserve de questions cloisonnée** : un lot d'items réservé à la mesure,
   exclu du générateur de révision pendant l'étude. Aujourd'hui, l'exclusion ne
   porte que sur les questions déjà vues par l'élève.
2. **Le relevé de dose exportable** par classe, pseudonymisé.
3. **Le suivi par notion** (écarts E2 et E5 du référentiel) : sans lui, l'analyse
   reste au niveau de la matière, ce qui est grossier.

---

## Annexe A — lettre d'information et consentement (modèle)

> **Objet : une étude sur l'outil de révision utilisé par la classe de votre enfant**
>
> Madame, Monsieur,
>
> L'établissement met à disposition des élèves un outil de révision, MIAPO,
> développé par EDUFREM. Nous voulons savoir s'il aide réellement les élèves à
> retenir ce qu'ils apprennent — et nous préférons le mesurer plutôt que de
> l'affirmer.
>
> **Ce que cela change pour votre enfant : rien dans son travail.** Toutes les
> classes utiliseront l'outil ; elles commenceront simplement à des dates
> différentes. À la fin de chaque période, les élèves passeront un exercice de
> 30 minutes en classe, sans aide, comme un contrôle ordinaire. **Cet exercice ne
> compte pas dans ses notes.**
>
> **Ce que nous conservons.** Uniquement des résultats d'exercices, associés à un
> code. L'établissement est seul à savoir quel code correspond à quel élève.
> EDUFREM ne reçoit aucun nom et ne peut pas identifier votre enfant. Aucune
> conversation, aucune donnée personnelle, aucun élément de comportement n'est
> collecté.
>
> **Vous pouvez refuser.** Votre enfant utilisera l'outil comme les autres, ses
> résultats ne seront simplement pas analysés. Vous pouvez aussi changer d'avis à
> tout moment et demander l'effacement des données déjà recueillies, en écrivant
> à l'établissement. Cela n'aura aucune conséquence pour votre enfant.
>
> Nom de l'élève : …  Classe : …
> ☐ J'accepte que les résultats de mon enfant soient analysés dans cette étude.
> ☐ Je refuse.
> Date et signature : …

## Annexe B — mémo de l'enseignant référent (une page)

1. **Chaque semaine** : noter, pour la classe, le nombre d'élèves ayant fait au
   moins deux séances. Un chiffre, rien de plus.
2. **Fin de vague** : faire passer l'épreuve en classe, 30 minutes, téléphones
   posés, aucune autre application ouverte. Ne pas aider, même sur la
   compréhension de l'énoncé : c'est la mesure.
3. **À J+7** : même chose, sur la deuxième série de questions.
4. **Signaler immédiatement** : une classe qui n'a pas pu faire l'épreuve, une
   famille qui demande le retrait, une panne, ou un élève qui a manifestement
   utilisé une autre aide. Un incident signalé est une donnée ; un incident tu
   est un biais.
