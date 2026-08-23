/**
 * Référentiels de programmes OFFICIELS.
 *
 * POURQUOI. Jusqu'ici, `source: "referentiel"` était une ÉTIQUETTE : on
 * demandait au modèle d'écrire ce mot quand aucun cours n'était fourni, et il
 * l'écrivait. Aucun programme officiel n'existait dans le système. Ça donnait
 * l'apparence d'un sourçage qui n'était pas là.
 *
 * Ce module apporte le vrai. Les notions viennent des PDF publiés au Bulletin
 * officiel, extraits et versionnés dans src/data/referentiels/.
 *
 * ⚠️ LE MILLÉSIME EST LA PARTIE DÉLICATE. Les réformes s'appliquent classe par
 * classe, pas d'un bloc : le programme de mathématiques du cycle 4 entre en
 * vigueur en 5e à la rentrée 2026, en 4e en 2027, en 3e en 2028. Servir le
 * nouveau programme à une 4e en 2026 serait une erreur invisible — le contenu
 * paraîtrait parfaitement crédible. D'où le contrôle d'année ci-dessous : une
 * classe dont le programme n'est pas encore applicable ne renvoie RIEN, et la
 * génération retombe sur son comportement actuel.
 *
 * ⚠️ ET UN PROGRAMME PEUT EN REMPLACER UN AUTRE. Les arrêtés du 26-2-2026
 * n'abrogent rien : ils REMPLACENT l'annexe des arrêtés de 2019. Le véhicule
 * juridique survit, son contenu change. Deux référentiels peuvent donc couvrir
 * la même classe ; c'est `trouver` qui arbitre, en gardant le plus récent déjà
 * applicable. Un référentiel daté d'une rentrée future est inerte jusque-là.
 *
 * LICENCE. Licence Ouverte / Etalab 2.0 : réutilisation commerciale autorisée,
 * attribution obligatoire. Elle est portée par chaque fichier de référentiel et
 * doit rester affichable. Réserve connue : les extraits littéraires cités dans
 * les programmes de FRANÇAIS ne sont PAS couverts (propriété de tiers). Le
 * référentiel de français ne retient donc QUE les intitulés d'entrées du
 * programme : aucun extrait d'œuvre n'est extrait ni stocké.
 */
import mathsCycle4 from '../data/referentiels/fr-mathematiques-cycle4.json'
// Programmes de cycle 4 ENCORE EN VIGUEUR (BO n° 31 du 30-7-2020). Les
// nouveaux n'entrent qu'en 2027 (4e) puis 2028 (3e) : sans ces quatre
// fichiers, ces deux classes n'ont AUCUN programme applicable cette année et
// révisent en génération libre. `trouver()` prend le plus récent DÉJÀ
// applicable, donc la 5e continue de recevoir le nouveau programme.
import mathsCycle4_2020 from '../data/referentiels/fr-mathematiques-cycle4-2020.json'
import francaisCycle4_2020 from '../data/referentiels/fr-francais-cycle4-2020.json'
import lv1Cycle4_2020 from '../data/referentiels/fr-lv1-cycle4-2020.json'
import lv2Cycle4_2020 from '../data/referentiels/fr-lv2-cycle4-2020.json'
import mathsCycle3 from '../data/referentiels/fr-mathematiques-cycle3.json'
import hgCycle4 from '../data/referentiels/fr-histoire-geographie-cycle4.json'
import pcCycle4 from '../data/referentiels/fr-physique-chimie-cycle4.json'
import svtCycle4 from '../data/referentiels/fr-svt-cycle4.json'
import techCycle4 from '../data/referentiels/fr-technologie-cycle4.json'
import fraCycle3 from '../data/referentiels/fr-francais-cycle3.json'
import fraCycle4 from '../data/referentiels/fr-francais-cycle4.json'
import maths2nde from '../data/referentiels/fr-mathematiques-2nde.json'
import maths1re from '../data/referentiels/fr-mathematiques-1re.json'
import mathsTle from '../data/referentiels/fr-mathematiques-terminale.json'
import mathsTle2027 from '../data/referentiels/fr-mathematiques-terminale-2027.json'
import pc2nde from '../data/referentiels/fr-physique-chimie-2nde.json'
import pc1re from '../data/referentiels/fr-physique-chimie-1re.json'
import pcTle from '../data/referentiels/fr-physique-chimie-terminale.json'
import svt2nde from '../data/referentiels/fr-svt-2nde.json'
import svt1re from '../data/referentiels/fr-svt-1re.json'
import svtTle from '../data/referentiels/fr-svt-terminale.json'
import hg2nde from '../data/referentiels/fr-histoire-geographie-2nde.json'
import hg1re from '../data/referentiels/fr-histoire-geographie-1re.json'
import hgTle from '../data/referentiels/fr-histoire-geographie-terminale.json'
import es1re from '../data/referentiels/fr-enseignement-scientifique-1re.json'
import esTle from '../data/referentiels/fr-enseignement-scientifique-terminale.json'
import fra2nde from '../data/referentiels/fr-francais-2nde.json'
import fra1re from '../data/referentiels/fr-francais-1re.json'
import philoTle from '../data/referentiels/fr-philosophie-terminale.json'
import ses2nde from '../data/referentiels/fr-ses-2nde.json'
import ses1re from '../data/referentiels/fr-ses-1re.json'
import sesTle from '../data/referentiels/fr-ses-terminale.json'
import snt2nde from '../data/referentiels/fr-snt-2nde.json'
import hggsp1re from '../data/referentiels/fr-hggsp-1re.json'
import hggspTle from '../data/referentiels/fr-hggsp-terminale.json'
import hlp1re from '../data/referentiels/fr-hlp-1re.json'
import hlpTle from '../data/referentiels/fr-hlp-terminale.json'
import nsi1re from '../data/referentiels/fr-nsi-1re.json'
import nsiTle from '../data/referentiels/fr-nsi-terminale.json'
import emc from '../data/referentiels/fr-emc.json'
import fraCycle2 from '../data/referentiels/fr-francais-cycle2.json'
import mathsCycle2 from '../data/referentiels/fr-mathematiques-cycle2.json'
import qlmCycle2 from '../data/referentiels/fr-questionner-le-monde-cycle2.json'
import stCycle2 from '../data/referentiels/fr-sciences-technologie-cycle2.json'
import hgCycle2 from '../data/referentiels/fr-histoire-geographie-cycle2.json'
import stCycle3_2023 from '../data/referentiels/fr-sciences-technologie-cycle3-2023.json'
import stCycle3_2026 from '../data/referentiels/fr-sciences-technologie-cycle3-2026.json'
import hgCycle3_2020 from '../data/referentiels/fr-histoire-geographie-cycle3-2020.json'
import hgCycle3_2026 from '../data/referentiels/fr-histoire-geographie-cycle3-2026.json'
import anglaisCollege from '../data/referentiels/fr-anglais-college.json'
import anglaisLycee from '../data/referentiels/fr-anglais-lycee.json'
import allemandCollege from '../data/referentiels/fr-allemand-college.json'
import allemandLycee from '../data/referentiels/fr-allemand-lycee.json'
import espagnolCollege from '../data/referentiels/fr-espagnol-college.json'
import espagnolLycee from '../data/referentiels/fr-espagnol-lycee.json'
import italienCollege from '../data/referentiels/fr-italien-college.json'
import italienLycee from '../data/referentiels/fr-italien-lycee.json'
import hdaCycle4 from '../data/referentiels/fr-histoire-des-arts-cycle4.json'
// ── Cameroun (MINESEC) ──
import cmMaths from '../data/referentiels/cm-mathematiques-6e5e.json'
import cmSciences from '../data/referentiels/cm-sciences-6e5e.json'
import cmHistoire from '../data/referentiels/cm-histoire-6e5e.json'
import cmGeographie from '../data/referentiels/cm-geographie-6e5e.json'
import cmEcm from '../data/referentiels/cm-ecm-6e5e.json'
import cmMaths43 from '../data/referentiels/cm-mathematiques-4e3e.json'
import cmHistoire43 from '../data/referentiels/cm-histoire-4e3e.json'
import cmGeographie43 from '../data/referentiels/cm-geographie-4e3e.json'
import cmEcm43 from '../data/referentiels/cm-ecm-4e3e.json'
import cmFrancais43 from '../data/referentiels/cm-francais-4e3e.json'
import cmAnglais43 from '../data/referentiels/cm-anglais-4e3e.json'
import cmInfoTleA from '../data/referentiels/cm-informatique-tle-a.json'
import cmInfoTleCD from '../data/referentiels/cm-informatique-tle-cd.json'
// Extraits de l'archive complète du MINESEC (23-8-2026), cf.
// outils/extraire-cameroun-archive.py. ⚠️ L'archive ne contient RIEN pour la
// 1ère, ni pour les sciences de terminale, ni pour les PCT/SVT de 4ème-3ème :
// ces dossiers existent sur le site du ministère mais sont vides.
import cmArts43 from '../data/referentiels/cm-arts-4e3e.json'
import cmAllemand43 from '../data/referentiels/cm-allemand-4e3e.json'
import cmArabe43 from '../data/referentiels/cm-arabe-4e3e.json'
import cmChinois43 from '../data/referentiels/cm-chinois-4e3e.json'
import cmEspagnol43 from '../data/referentiels/cm-espagnol-4e3e.json'
import cmLatin43 from '../data/referentiels/cm-latin-4e3e.json'
import cmGrec43 from '../data/referentiels/cm-grec-4e3e.json'
import cmInfo65 from '../data/referentiels/cm-informatique-6e5e.json'
import cmAnglais2nde from '../data/referentiels/cm-anglais-2nde.json'
import cmInfo2ndeA from '../data/referentiels/cm-informatique-2nde-a.json'
import cmInfo2ndeC from '../data/referentiels/cm-informatique-2nde-c.json'
import cmSvt2nde from '../data/referentiels/cm-svt-2nde.json'
import cmPhysique2nde from '../data/referentiels/cm-physique-2nde.json'
import cmChimie2nde from '../data/referentiels/cm-chimie-2nde.json'
import cmHistoireTle from '../data/referentiels/cm-histoire-tle.json'
import cmGeographieTle from '../data/referentiels/cm-geographie-tle.json'

// Plusieurs référentiels peuvent couvrir la même matière dans des cycles
// différents : on cherche donc par (pays, matière, CLASSE), pas par matière.
const REFERENTIELS = [mathsCycle3, mathsCycle4, mathsCycle4_2020, francaisCycle4_2020,
  lv1Cycle4_2020, lv2Cycle4_2020, hgCycle4, pcCycle4, svtCycle4, techCycle4, fraCycle3, fraCycle4,
  maths2nde, maths1re, mathsTle, mathsTle2027, pc2nde, pc1re, pcTle, svt2nde, svt1re, svtTle,
  hg2nde, hg1re, hgTle, es1re, esTle, fra2nde, fra1re, philoTle, ses2nde, ses1re, sesTle, snt2nde,
  hggsp1re, hggspTle, hlp1re, hlpTle, nsi1re, nsiTle, emc,
  fraCycle2, mathsCycle2, qlmCycle2, stCycle2, hgCycle2,
  stCycle3_2023, stCycle3_2026, hgCycle3_2020, hgCycle3_2026,
  anglaisCollege, anglaisLycee, allemandCollege, allemandLycee,
  espagnolCollege, espagnolLycee, italienCollege, italienLycee, hdaCycle4,
  cmMaths, cmSciences, cmHistoire, cmGeographie, cmEcm,
  cmMaths43, cmHistoire43, cmGeographie43, cmEcm43, cmFrancais43,
  cmAnglais43, cmInfoTleA, cmInfoTleCD,
  cmArts43, cmAllemand43, cmArabe43, cmChinois43, cmEspagnol43, cmLatin43, cmGrec43,
  cmInfo65, cmAnglais2nde, cmInfo2ndeA, cmInfo2ndeC,
  cmSvt2nde, cmPhysique2nde, cmChimie2nde, cmHistoireTle, cmGeographieTle]

const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '')

/**
 * Noms sous lesquels une matière peut être désignée.
 *
 * ⚠️ Le catalogue de l'élève et les référentiels ne l'écrivent pas pareil :
 * « Sciences de la vie et de la Terre (SVT) » d'un côté, « SVT » de l'autre.
 * Les deux ne se rencontraient jamais, et l'échec était MUET — une recherche
 * infructueuse est un cas légitime du système. Plutôt qu'une table à tenir à
 * jour matière par matière, on retient les trois écritures possibles : le
 * libellé entier, le libellé sans son sigle, et le sigle seul.
 */
function clesMatiere(s) {
  const cles = new Set([norm(s)])
  const sigle = String(s || '').match(/\(([^)]+)\)\s*$/)
  if (sigle) {
    cles.add(norm(sigle[1]))
    cles.add(norm(String(s).slice(0, sigle.index)))
  }
  cles.delete('')
  return cles
}
/**
 * Toutes les clés sous lesquelles un référentiel doit être trouvable.
 *
 * `matiereAussi` sert au seul cas où le programme officiel ne porte PAS le nom
 * de la matière : au cycle 2, « Questionner le monde » tient lieu de sciences
 * ET d'histoire-géographie. Un élève de CE1 qui révise « Sciences et
 * technologie » doit tomber dessus, sinon on lui répond qu'il n'y a rien.
 */
function clesReferentiel(ref) {
  const cles = clesMatiere(ref.matiere)
  for (const autre of ref.matiereAussi || []) {
    for (const c of clesMatiere(autre)) cles.add(c)
  }
  return cles
}
const memeMatiere = (ref, demandee) => {
  const cles = clesReferentiel(ref)
  return [...clesMatiere(demandee)].some((x) => cles.has(x))
}

/**
 * Référentiel applicable à cette classe à cette date, ou null.
 *
 * Un programme en remplace un autre sans l'abroger : la spécialité maths de
 * terminale change à la rentrée 2027, celle de 2019 reste la bonne d'ici là.
 * On garde donc le plus récent DÉJÀ applicable — un programme futur ne doit
 * jamais être servi par anticipation.
 */
function trouver({ pays, niveau, matiere, date = new Date() }) {
  const cl = String(niveau || '').trim()
  const an = anneeScolaire(date)
  return REFERENTIELS
    .filter((x) => x.pays === pays && memeMatiere(x, matiere) && x.classes[cl])
    .filter((x) => an >= x.classes[cl].enVigueurRentree)
    .sort((a, b) => b.classes[cl].enVigueurRentree - a.classes[cl].enVigueurRentree)[0] || null
}

/**
 * Année scolaire en cours (celle de la RENTRÉE).
 * De janvier à juillet, on est encore dans l'année ouverte l'automne précédent :
 * un élève de 5e en mars 2027 suit bien le programme entré en vigueur en 2026.
 */
export function anneeScolaire(date = new Date()) {
  return date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1
}

/**
 * Notions officielles pour (pays, classe, matière), ou [] si on n'a rien de
 * sûr à proposer. Renvoyer une liste vide est un résultat LÉGITIME : mieux vaut
 * pas de référentiel qu'un référentiel faux.
 */
export function notionsOfficielles({ pays, niveau, matiere, date = new Date() }) {
  const r = trouver({ pays, niveau, matiere, date })
  return r ? r.classes[String(niveau || '').trim()].notions : []
}

/** Provenance à afficher — l'attribution est une obligation de la licence. */
export function sourceOfficielle({ pays, niveau, matiere, date = new Date() }) {
  const r = trouver({ pays, niveau, matiere, date })
  if (!r) return null
  return { arrete: r.arrete, bo: r.bo, url: r.url, attribution: r._attribution }
}

/**
 * Le programme est-il défini par CLASSE ou pour tout le CYCLE ?
 *
 * Les maths et l'histoire-géo attribuent leurs thèmes à une année précise. Les
 * sciences, non : le texte officiel dit qu'ils « ont vocation à être traités
 * tout au long du cycle » et laisse la répartition à l'établissement. Annoncer
 * « au programme de 5e » dans ce cas serait une sur-interprétation.
 */
export function granulariteProgramme({ pays, niveau, matiere, date = new Date() }) {
  const r = trouver({ pays, niveau, matiere, date })
  return r && r._granularite === 'cycle' ? 'cycle' : 'classe'
}

/** Liste compacte des notions, prête à cadrer un prompt. */
export function notionsPourPrompt(args) {
  return notionsOfficielles(args).map((n) => `${n.domaine} — ${n.notion}`)
}
