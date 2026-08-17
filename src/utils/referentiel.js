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
 * LICENCE. Licence Ouverte / Etalab 2.0 : réutilisation commerciale autorisée,
 * attribution obligatoire. Elle est portée par chaque fichier de référentiel et
 * doit rester affichable. Réserve connue : les extraits littéraires cités dans
 * les programmes de FRANÇAIS ne sont PAS couverts (propriété de tiers) — d'où
 * le choix de commencer par les mathématiques.
 */
import mathsCycle4 from '../data/referentiels/fr-mathematiques-cycle4.json'

const REFERENTIELS = [mathsCycle4]

const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '')

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
  const r = REFERENTIELS.find((x) => x.pays === pays && norm(x.matiere) === norm(matiere))
  if (!r) return []
  const cl = r.classes[String(niveau || '').trim()]
  if (!cl) return []
  if (anneeScolaire(date) < cl.enVigueurRentree) return [] // pas encore applicable
  return cl.notions
}

/** Provenance à afficher — l'attribution est une obligation de la licence. */
export function sourceOfficielle({ pays, niveau, matiere, date = new Date() }) {
  if (!notionsOfficielles({ pays, niveau, matiere, date }).length) return null
  const r = REFERENTIELS.find((x) => x.pays === pays && norm(x.matiere) === norm(matiere))
  return { arrete: r.arrete, bo: r.bo, url: r.url, attribution: r._attribution }
}

/** Liste compacte des notions, prête à cadrer un prompt. */
export function notionsPourPrompt(args) {
  return notionsOfficielles(args).map((n) => `${n.domaine} — ${n.notion}`)
}
