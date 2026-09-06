/**
 * FIGURES MATHÉMATIQUES — le modèle décrit, l'application dessine.
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, pilier du double codage.
 *
 * POURQUOI. Une question sur les fractions expliquée uniquement par du texte
 * demande à l'élève de fabriquer lui-même l'image dont il a besoin pour
 * comprendre. Le double codage — schéma ET mots — aide l'apprentissage, et il
 * l'aide chez TOUT LE MONDE.
 *
 * ⚠️ PIÈGE DE FORMULATION, signalé par la section 4.1 du référentiel : le double
 * codage n'aide pas « les élèves visuels ». Ce serait le mythe des styles
 * d'apprentissage, que le référentiel bannit. Il aide tous les apprenants. Ne
 * jamais laisser un support commercial glisser de l'un à l'autre.
 *
 * ⚠️ ET IL NE S'AGIT PAS DE DÉCORER. Une illustration qui n'apporte rien au
 * contenu AJOUTE de la charge cognitive au lieu d'aider. Une figure n'a sa place
 * que si elle porte le raisonnement : les parts d'une fraction, une position sur
 * une droite. Une image d'ambiance, jamais.
 *
 * POURQUOI LE MODÈLE NE DESSINE PAS LUI-MÊME. Trois routes existaient : lui
 * faire écrire du LaTeX (une bibliothèque de plus, et seulement des formules),
 * lui faire écrire du SVG (cher en jetons, souvent laid, et un SVG peut porter
 * du script), ou lui faire écrire une DESCRIPTION minuscule que l'application
 * dessine. C'est la troisième : quelques jetons, aucun rendu invalide possible,
 * ça marche hors connexion, et l'apparence nous appartient.
 *
 * ⚠️ RIEN N'EST CRU SUR PAROLE. `normaliserFigure` n'accepte que les types
 * connus et borne toutes les valeurs. Une description inconnue ou aberrante
 * renvoie `null`, et l'écran se contente du texte — comme avant.
 */

const PARTS_MIN = 2
const PARTS_MAX = 12   // au-delà, les parts deviennent illisibles sur un téléphone
const POINTS_MAX = 4

const nombre = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)

/**
 * Vérifie et borne une description de figure.
 * @returns {object|null} figure utilisable, ou `null` si rien d'exploitable.
 */
export function normaliserFigure(f) {
  if (!f || typeof f !== 'object') return null
  const type = String(f.type || '').trim().toLowerCase()

  if (type === 'fraction') {
    const parts = Math.round(nombre(f.parts) ?? 0)
    if (!(parts >= PARTS_MIN && parts <= PARTS_MAX)) return null
    let colorees = Math.round(nombre(f.colorees) ?? 0)
    if (!Number.isFinite(colorees)) return null
    colorees = Math.max(0, Math.min(parts, colorees))
    const forme = f.forme === 'disque' ? 'disque' : 'barre'
    return { type: 'fraction', parts, colorees, forme }
  }

  if (type === 'droite') {
    const min = nombre(f.min)
    const max = nombre(f.max)
    if (min === null || max === null || !(max > min)) return null
    // Les graduations servent à situer, pas à quadriller : au-delà d'une
    // vingtaine, la droite devient un peigne.
    let graduations = Math.round(nombre(f.graduations) ?? 0)
    if (!(graduations >= 1 && graduations <= 20)) graduations = 0
    const points = (Array.isArray(f.points) ? f.points : [])
      .map((p) => ({ x: nombre(p && p.x), label: String((p && p.label) || '').trim().slice(0, 12) }))
      .filter((p) => p.x !== null && p.x >= min && p.x <= max)
      .slice(0, POINTS_MAX)
    if (!points.length && !graduations) return null
    return { type: 'droite', min, max, graduations, points }
  }

  return null
}

/**
 * Description en toutes lettres, pour les lecteurs d'écran — et parce qu'une
 * information ne doit jamais reposer sur la seule couleur.
 */
export function decrireFigure(f, en = false) {
  if (!f) return ''
  if (f.type === 'fraction') {
    return en
      ? `Diagram: ${f.colorees} of ${f.parts} equal parts are shaded.`
      : `Schéma : ${f.colorees} parts coloriées sur ${f.parts} parts égales.`
  }
  if (f.type === 'droite') {
    const pts = f.points.map((p) => p.label || p.x).join(', ')
    return en
      ? `Number line from ${f.min} to ${f.max}${pts ? `, marked at ${pts}` : ''}.`
      : `Droite graduée de ${f.min} à ${f.max}${pts ? `, repères en ${pts}` : ''}.`
  }
  return ''
}
