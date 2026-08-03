# Notation multi-régime — conception

> Statut : **proposition, rien n'est codé.** À valider par Steve avant implémentation.
> Date : 2026-08-03. Concerne MAPO+ d'abord, MAPO (ERP) ensuite.

---

## 1. Ce que disait la roadmap, et pourquoi c'est à corriger

La roadmap demande :

> Abstraction `evalMode ∈ {notes, competences}` résolue par (pays × niveau).
> **France collège = évaluation par compétences** (4 niveaux de maîtrise, LSU/socle) ;
> lycée FR = notes ; Afrique = notes.

**Le collège français n'est plus dans ce cas depuis la session 2026** — c'est-à-dire
maintenant. La réforme du DNB a supprimé le socle du contrôle continu : la note de
contrôle continu est calculée à partir des **moyennes annuelles de toutes les
disciplines en 3e**, et non plus des huit composantes du socle. Dans le même
mouvement, les épreuves terminales passent à 60 % de la note finale (contre 50 %).

Mais les compétences du socle **continuent d'être évaluées** et le LSU est
maintenu : les enseignants font désormais une double saisie, note *et* positionnement
sur les 4 niveaux de maîtrise.

**Conséquence directe pour nous : un `evalMode` binaire est un mauvais modèle.**
Le collège français n'est pas « compétences au lieu de notes », il est
« compétences **et** notes ». Un interrupteur à deux positions nous obligerait à en
perdre une — et à la reperdre à chaque évolution réglementaire.

## 2. Ce qui existe déjà dans le code (et qu'il ne faut pas réinventer)

MAPO gère **déjà** une notation par compétences, pour le primaire camerounais
(`src/data/primaire.js`) :

- `GRADING_MODES` : `notes` (chiffré /20) ou `apc` (compétences), **choisi à la
  création de l'école** ;
- `APC_PALIERS` : `A` / `ECA` / `NA`, avec libellés et couleurs ;
- `noteToPalier(note)` : conversion /20 → palier (seuils 12 et 7).

C'est exactement l'abstraction demandée — mais enfermée dans le primaire, et absente
de MAPO+. **La bonne action n'est pas d'écrire un second système, c'est de sortir
celui-ci de sa boîte.**

## 3. Le modèle proposé

### 3.1 Deux notions distinctes, pas une

| Notion | Rôle | Valeurs |
|---|---|---|
| **`bareme`** | Comment un résultat s'EXPRIME (saisie + affichage) | `note20`, `paliers3` (A/ECA/NA), `paliers4` (maîtrise FR) |
| **`acquisition`** | Valeur interne commune qui alimente le MOTEUR | nombre de 0 à 1 |

Le moteur (faiblesses, Elo, séquenceur ZPD) ne connaît **que** `acquisition`. Il
n'apprend jamais qu'il existe des pays, des paliers ou des barèmes. C'est ce qui
évite les `if (pays === 'FR')` éparpillés que la roadmap veut à juste titre bannir.

### 3.2 Résolution du barème

```
baremePour({ pays, niveau, surcharge }) → 'note20' | 'paliers3' | 'paliers4'
```

Une seule fonction, une seule table :

| Pays | Niveau | Barème | Source |
|---|---|---|---|
| CM | primaire | `note20` + paliers APC en complément | MINEDUB, déjà en production dans MAPO |
| CM | secondaire, supérieur | `note20` | idem |
| **CI** | **primaire** | **`note10`** | circulaire n° 266 (DPFC/MENA) : passage des classes intermédiaires à **5 sur 10** |
| CI | secondaire, supérieur | `note20` | CM2 → 6e : moyenne de 10 sur 20 |
| **SN** | **primaire** | **`note10`** | notation de 0 à 10 du CI au CM2 ; 0 à 20 à partir de la 6e |
| SN | secondaire, supérieur | `note20` | idem |
| FR | primaire, collège | `note20` + 4 niveaux de maîtrise en complément | LSU maintenu après la réforme DNB 2026 |
| FR | lycée, supérieur | `note20` | |
| GA | tous | `note20` **à confirmer** | modèle français, barème non sourcé |

**Le vrai piège, découvert en vérifiant : l'échelle n'est pas toujours sur 20.**
Un 8 saisi pour un élève de CM1 sénégalais ou ivoirien est une **réussite** (8/10) ;
le même 8 interprété sur 20 serait un échec, et MAPO+ enverrait l'enfant réviser une
matière qu'il maîtrise. C'est exactement le genre d'erreur qu'un modèle « tout le
monde sur 20 » produit en silence. Le barème porte donc son maximum, et un test le
verrouille.

Les lignes que je n'ai pas pu sourcer portent `aVerifier` : on applique /20 par
défaut, mais on ne prétend pas que c'est vérifié, et la surcharge reste accessible.

La **surcharge** l'emporte toujours : par apprenant dans MAPO+, par école dans MAPO.
Une famille qui préfère voir des paliers doit pouvoir le demander, et inversement.

**Décision que je prends** (et que je soumets) : pour un collégien français, le
barème **principal reste la note /20**, avec les 4 niveaux de maîtrise en affichage
complémentaire. Raison : depuis 2026 ce sont les moyennes annuelles qui décident du
brevet — c'est donc la note qui porte l'enjeu que le parent suit. Les compétences
restent visibles parce qu'elles restent évaluées et qu'elles disent *quoi* travailler.

### 3.3 Conversions

Tout entre et sort par deux fonctions, et elles seules :

```
versAcquisition(valeur, bareme) → 0..1
depuisAcquisition(acquisition, bareme) → valeur affichable
```

Ancrages :

- `note20` : `acquisition = note / 20`.
- `paliers3` (A/ECA/NA) : on **garde les seuils déjà en production** (12 et 7 sur 20)
  pour ne rien changer aux bulletins primaires existants → NA 0,20 / ECA 0,50 / A 0,85.
- `paliers4` (FR) : ancrés sur le barème historique du DNB, qui accordait 10, 25, 40
  et 50 points aux quatre niveaux → 0,20 / 0,50 / 0,80 / 1,00. Ce barème disparaît du
  brevet, mais il reste la seule échelle officielle ayant chiffré ces niveaux : c'est
  un repère défendable, et il est cohérent avec les seuils APC ci-dessus.

### 3.4 Points d'accroche dans le code existant

Le gros du travail a déjà été fait sans le savoir, en livrant l'objectif par matière :

- **`objectifDe(e, matiere)`** est déjà le point UNIQUE qui décide du seuil
  « en dessous de quoi on révise ». Il devient : *renvoie une acquisition cible*.
- **`faiblesses()`** compare déjà via `objectifDe`. Il comparera des acquisitions.
- **`addNote(enfantId, matiere, valeur)`** accepte un nombre ; il acceptera aussi un
  code de palier, converti immédiatement en acquisition à l'écriture.
- **`recordResult` / Elo** travaillent déjà en pourcentage de réussite : c'est déjà
  une acquisition. **Rien à changer dans le moteur.**
- **Affichage** : les endroits qui écrivent `{{ note }}/20` passent par
  `depuisAcquisition`.

### 3.5 Refactor proposé (minimal)

Sortir `GRADING_MODES`, `APC_PALIERS` et `noteToPalier` de `src/data/primaire.js`
vers un `src/data/baremes.js` commun, et laisser `primaire.js` les ré-exporter. Aucun
appelant existant ne change, le primaire garde exactement son comportement.

## 4. Ce que je ne propose PAS

- Pas de second moteur, pas de duplication du quiz ni de l'Elo.
- Pas de modification du bulletin primaire existant : mêmes seuils, mêmes couleurs.
- Pas de saisie des 8 composantes du socle. Elles servent au LSU de l'établissement,
  pas au tuteur d'un enfant — et depuis 2026 elles ne décident plus du brevet.
  Si un jour on relie MAPO+ à un collège français, on les lira ; on ne les saisit pas.

## 5. Découpage proposé

1. `src/data/baremes.js` + tests de conversion (aller-retour sur les 3 barèmes).
2. `objectifDe` / `faiblesses` / `addNote` en acquisition — invisible pour l'utilisateur,
   couvert par les tests existants (23 assertions) plus les nouveaux.
3. Affichage MAPO+ : notes, « À réviser », objectif par matière.
4. Réglage du barème (surcharge) dans le profil de l'apprenant.
5. MAPO (ERP) plus tard : le module existe déjà pour le primaire, on l'élargit.

Étapes 1 et 2 sans aucun changement visible : si quelque chose casse, ça se voit dans
les tests, pas chez un utilisateur.

---

## Sources

- [Modalités d'attribution du diplôme national du brevet — éduscol](https://eduscol.education.fr/713/modalites-d-attribution-du-diplome-national-du-brevet)
- [Évaluer les élèves de 3e dans le cadre des nouvelles modalités d'attribution du DNB — éduscol (mémento)](https://eduscol.education.gouv.fr/sites/default/files/document/memento-evaluer-les-eleves-de-3e-dans-le-cadre-des-nouvelles-modalites-d-attribution-du-diplome-national-du-brevet-123226.pdf)
- [DNB 2026 : le retour du contrôle continu — SNES](https://www.snes.edu/article/dnb-2026-le-retour-du-controle-continu/)
- [Diplôme national du brevet — Bulletin officiel (barème 10/25/40/50)](https://www.education.gouv.fr/bo/18/Hebdo11/MENE1805449N.htm)
