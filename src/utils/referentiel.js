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

// Plusieurs référentiels peuvent couvrir la même matière dans des cycles
// différents : on cherche donc par (pays, matière, CLASSE), pas par matière.
const REFERENTIELS = [mathsCycle3, mathsCycle4, hgCycle4, pcCycle4, svtCycle4, techCycle4, fraCycle3, fraCycle4,
  maths2nde, maths1re, mathsTle, mathsTle2027, pc2nde, pc1re, pcTle, svt2nde, svt1re, svtTle]

const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '')

/**
 * Le catalogue de matières et les référentiels ne nomment pas toujours la même
 * matière pareil : l'élève voit « Sciences de la vie et de la Terre (SVT) », le
 * référentiel s'appelle « SVT ». Sans cette table, la recherche échoue en
 * silence et le référentiel, pourtant livré, n'est jamais servi.
 */
const ALIAS = { sciencesdelavieetdelaterresvt: 'svt' }
const cleMatiere = (s) => { const n = norm(s); return ALIAS[n] || n }

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
  const m = cleMatiere(matiere)
  return REFERENTIELS
    .filter((x) => x.pays === pays && cleMatiere(x.matiere) === m && x.classes[cl])
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
