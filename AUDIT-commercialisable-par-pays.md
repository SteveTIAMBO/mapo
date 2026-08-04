# Vendable dans quel pays, vraiment ?

> Audit du 2026-08-03, à la demande de Steve : « je veux juste que le logiciel soit
> commercialisable au Congo, Cameroun, Sénégal ou/et en France ».
> Constat par pays, dans le code, pas en intention.

---

## Le résumé, sans détour

> Mis à jour en fin de journée : les points 1, 2 et 3 ont été traités.

| Pays | MAPO+ (familles) | MAPO (ERP écoles) |
|---|---|---|
| **Cameroun** | vendable | vendable — le produit est né pour lui |
| **RD Congo** | vendable, barème à confirmer | vendable, barème à confirmer |
| **Sénégal** | vendable | vendable |
| **Côte d'Ivoire** | vendable | vendable |
| **France** | vendable | vendable côté produit — reste la conformité (voir plus bas) |
| **Gabon** | séries et barème non sourcés | idem |

La notation multi-régime livrée aujourd'hui lève un vrai blocage (le primaire
sénégalais et ivoirien notés sur 10), mais elle ne suffit pas. Ce qui reste
n'est pas de la finition : ce sont des choses qu'un directeur d'école voit dans
les cinq premières minutes d'une démo.

## Ce qui est corrigé aujourd'hui

**La devise.** `COUNTRY_DEFAULTS` ne connaissait que le Cameroun, le Sénégal et la
Côte d'Ivoire. Une école de Kinshasa aurait facturé sa scolarité en **franc CFA**,
qui n'a pas cours en RDC, et une école française aussi. Le franc congolais (CDF)
n'était même pas dans la liste des devises. Gabon, RD Congo et France ont
désormais leurs valeurs par défaut, et le CDF est proposé.

## Ce qui bloque encore, par ordre de gravité

### 1. Les examens nationaux sont camerounais, en dur

`EXAM_TYPES` (`src/stores/examens.js`) contient CEP, BEPC, Probatoire,
Baccalauréat — et rien d'autre. Le module « Examens nationaux » présentera donc
un CEP à une école congolaise, qui prépare l'**ENAFEP** et l'**EXETAT**, et un
Probatoire à une école sénégalaise, où cet examen n'existe pas.

C'est le blocage le plus visible : le module porte le mot « nationaux » dans son
nom. À faire dépendre du pays de l'école, avec les examens sourcés :
- RD Congo : ENAFEP (fin du primaire), TENASOSP, EXETAT — les trois sont nommés
  sur le site du ministère.
- Sénégal, Côte d'Ivoire, France : à sourcer avant d'écrire quoi que ce soit.

### 2. ~~Les classes du lycée sont camerounaises pour tout le monde~~ ✅ levé

Le **Sénégal** a ses séries (L1a, L1b, L'1, L2, S1, S2, S3 — source CAOSP) et la
**Côte d'Ivoire** les siennes (A1, A2, C, D — la distinction A1/A2 n'existe pas
au Cameroun). Reste le **Gabon**, sans source officielle trouvée : il garde la
liste camerounaise, et c'est écrit dans le code.

### 3. ~~Les matières ne sont sourcées que pour trois pays~~ ✅ levé sauf Gabon

Cameroun, France, RD Congo, Sénégal et Côte d'Ivoire ont leur référentiel.
Détail qui trahit un logiciel importé : la matière civique s'appelle ECM au
Cameroun, EDHC en Côte d'Ivoire, EMC en France, et « éducation civique et
morale » en RDC. Les quatre sont distinctes dans le code.

### 4. Le barème congolais reste supposé

Le pourcentage est appliqué et l'interface le signale, mais aucune source
officielle ne le confirme. Une école congolaise en démo le verra tout de suite —
autant le confirmer avant.

## Ce que je propose

L'ordre ci-dessus est l'ordre de traitement : examens, puis classes, puis
matières. Chacun de ces points demande une source par pays, comme on l'a fait
pour la RDC — le site du ministère congolais
(`edu-nc.gouv.cd/national-programmes`) a été une excellente source, il en existe
un équivalent pour chaque pays visé.

Un point à trancher avec Steve : **la France mérite-t-elle l'ERP ?** MAPO+ y est
vendable dès aujourd'hui. L'ERP, en revanche, suppose une architecture scolaire
(séquences, trimestres, conseils de classe, bulletins) que la France ne partage
qu'en partie, et le marché français est déjà tenu. Vendre MAPO+ en France et
l'ERP en Afrique est peut-être la bonne réponse — mais c'est une décision
commerciale, pas technique.
