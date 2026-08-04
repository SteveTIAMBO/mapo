/**
 * Barèmes de notation — l'abstraction « notation multi-régime ».
 *
 * Deux notions, volontairement séparées :
 *
 *  - le BARÈME  : comment un résultat s'EXPRIME (saisie + affichage). Une note
 *                 sur 20, une note sur 10, ou un palier de compétence.
 *  - l'ACQUISITION : une valeur interne de 0 à 1, commune à TOUS les barèmes,
 *                 qui alimente le moteur (faiblesses, Elo, séquenceur).
 *
 * Le moteur ne connaît QUE l'acquisition. Il n'apprend jamais qu'il existe des
 * pays, des cycles ou des paliers — c'est ce qui évite de disperser des
 * `if (pays === 'FR')` dans les écrans. Tout passe par `versAcquisition` et
 * `depuisAcquisition`, et par elles seules.
 *
 * ⚠️ Les échelles ci-dessous décrivent des systèmes éducatifs RÉELS, pas des
 * conventions maison. Chaque ligne de `REGIMES` porte sa source ou, à défaut,
 * la mention `aVerifier` — dans ce cas on retombe sur /20 et l'utilisateur peut
 * corriger. On ne devine pas à la place d'un ministère.
 */

// ── Paliers de compétence ───────────────────────────────────────────────────

/**
 * Cameroun — APC du primaire (MINEDUB). Repris tel quel de `data/primaire.js`,
 * qui reste la référence pour l'ERP : mêmes codes, mêmes libellés, mêmes
 * couleurs, donc aucun bulletin primaire existant ne change d'apparence.
 */
// `acquisition` = valeur représentative du palier ; `seuil` = acquisition
// MINIMALE pour l'atteindre. Les deux sont nécessaires : un milieu d'intervalle
// calculé donnerait 13,5/20 pour « Acquis » alors que la production coupe à 12.
export const PALIERS_APC = [
  { code: 'A', label: 'Acquis', short: 'A', color: '#1B8A5A', acquisition: 0.85, seuil: 0.60 }, // 12/20
  { code: 'ECA', label: "En cours d'acquisition", short: 'ECA', color: '#B87A00', acquisition: 0.50, seuil: 0.35 }, // 7/20
  { code: 'NA', label: 'Non acquis', short: 'NA', color: '#D93025', acquisition: 0.20, seuil: 0 },
]

/**
 * France — les 4 niveaux de maîtrise du socle commun (LSU).
 *
 * Les valeurs d'acquisition sont ancrées sur le barème officiel du DNB, qui
 * accordait 10, 25, 40 et 50 points à ces quatre niveaux (÷ 50 → 0,20 / 0,50 /
 * 0,80 / 1,00). Ce barème a quitté le brevet à la session 2026 — le contrôle
 * continu repose désormais sur les moyennes annuelles de 3e — mais il reste la
 * seule échelle officielle ayant jamais chiffré ces niveaux, et il tombe pile
 * sur les mêmes ancrages que l'APC ci-dessus. Les compétences, elles, restent
 * évaluées et le LSU est maintenu : c'est pourquoi ce barème vit toujours.
 */
export const PALIERS_MAITRISE_FR = [
  { code: 'TBM', label: 'Très bonne maîtrise', short: 'TBM', color: '#1B8A5A', acquisition: 1.00, seuil: 0.90 },
  { code: 'MS', label: 'Maîtrise satisfaisante', short: 'MS', color: '#4C9A2A', acquisition: 0.80, seuil: 0.65 },
  { code: 'MF', label: 'Maîtrise fragile', short: 'MF', color: '#B87A00', acquisition: 0.50, seuil: 0.35 },
  { code: 'MI', label: 'Maîtrise insuffisante', short: 'MI', color: '#D93025', acquisition: 0.20, seuil: 0 },
]

// ── Barèmes ─────────────────────────────────────────────────────────────────

export const BAREMES = {
  note20: { type: 'numerique', max: 20 },
  note10: { type: 'numerique', max: 10 },
  // RD Congo : les bulletins raisonnent en POURCENTAGE (maxima par branche puis
  // pourcentage global, réussite à 50 %). Voir la note `aVerifier` sur CD.
  pourcent: { type: 'numerique', max: 100 },
  paliers3: { type: 'paliers', paliers: PALIERS_APC },
  paliers4: { type: 'paliers', paliers: PALIERS_MAITRISE_FR },
}

export const BAREME_DEFAUT = 'note20'

export function estBareme(cle) {
  return Object.prototype.hasOwnProperty.call(BAREMES, cle)
}

/** Maximum de l'échelle pour un barème numérique (null pour des paliers). */
export function maxDe(cle) {
  const b = BAREMES[cle]
  return b && b.type === 'numerique' ? b.max : null
}

/** Paliers d'un barème par paliers, du plus au moins maîtrisé (null sinon). */
export function paliersDe(cle) {
  const b = BAREMES[cle]
  return b && b.type === 'paliers' ? b.paliers : null
}

// ── Régimes réels, par pays et par cycle ────────────────────────────────────

/**
 * Ce que fait VRAIMENT chaque système éducatif. `aVerifier: true` = je n'ai pas
 * trouvé de source officielle ; on applique /20 (usage hérité du modèle
 * français) mais la valeur est à confirmer, et l'utilisateur peut la corriger.
 *
 * Sources :
 *  - Cameroun, primaire : MINEDUB, approche par compétences (paliers A/ECA/NA).
 *    Déjà en production dans MAPO — mode choisi à la création de l'école, une
 *    école peut rester en /20. Cf. `data/primaire.js`.
 *  - Côte d'Ivoire, primaire : circulaire n° 266 (DPFC/MENA) — les classes
 *    intermédiaires (CP, CE, CM1) passent avec une moyenne de 5 sur 10.
 *  - Sénégal, primaire : notation de 0 à 10 du CI au CM2 ; 0 à 20 à partir de
 *    la 6e.
 *  - France : /20, plus les 4 niveaux de maîtrise du socle en complément au
 *    collège (LSU maintenu après la réforme du DNB 2026).
 *  - Gabon : RETIRÉ le 2026-08-03 faute de source officielle (ni séries, ni
 *    barème). Un pays absent de cette table tombe dans le cas « inconnu » :
 *    /20 et `aVerifier`. Le rajouter demande d'abord une source.
 */
export const REGIMES = {
  CM: {
    primaire: { bareme: 'note20', complement: 'paliers3' },
    defaut: { bareme: 'note20' },
  },
  CI: {
    primaire: { bareme: 'note10' },
    defaut: { bareme: 'note20' },
  },
  SN: {
    primaire: { bareme: 'note10' },
    defaut: { bareme: 'note20' },
  },
  FR: {
    college: { bareme: 'note20', complement: 'paliers4' },
    primaire: { bareme: 'note20', complement: 'paliers4' },
    defaut: { bareme: 'note20' },
  },
  CD: {
    // RD Congo. Structure SOURCÉE : primaire de 6 ans en trois degrés
    // (élémentaire, moyen, terminal), puis 2 ans de cycle d'orientation et
    // 4 ans d'humanités. BARÈME NON SOURCÉ : les bulletins congolais
    // fonctionnent en pourcentage (réussite à 50 %) d'après l'usage, mais je
    // n'ai pas trouvé de texte officiel fixant le barème → `aVerifier`, et
    // l'interface le DIT à l'utilisateur au lieu de le supposer en silence.
    defaut: { bareme: 'pourcent', aVerifier: true },
  },
}

const NIVEAUX_COLLEGE_FR = ['6e', '5e', '4e', '3e']

/**
 * Cycle d'un niveau, du point de vue du BARÈME (pas du programme).
 * Volontairement tolérant : les niveaux arrivent de plusieurs sources (saisie
 * libre, import, référentiel) et un niveau inconnu ne doit jamais faire planter
 * la notation — il retombe sur le défaut du pays.
 */
export function cycleDe(niveau, pays) {
  const n = String(niveau || '').trim()
  if (!n) return 'defaut'
  if (pays === 'FR' && NIVEAUX_COLLEGE_FR.includes(n)) return 'college'
  // Primaire : SIL/CP/CE1…/CM2 (Afrique francophone) et CP/CE…/CM2 (France).
  if (/^(SIL|CP|CE1|CE2|CM1|CM2|CI)$/i.test(n)) return 'primaire'
  return 'defaut'
}

/**
 * Barème applicable. `surcharge` l'emporte TOUJOURS : une famille ou une école
 * qui a choisi son mode ne doit jamais être contredite par notre table.
 * Renvoie { bareme, complement, aVerifier }.
 */
export function baremePour({ pays, niveau, surcharge } = {}) {
  if (surcharge && estBareme(surcharge)) return { bareme: surcharge, complement: null, aVerifier: false }
  const regime = REGIMES[pays]
  if (!regime) return { bareme: BAREME_DEFAUT, complement: null, aVerifier: true }
  const regle = regime[cycleDe(niveau, pays)] || regime.defaut
  return {
    bareme: regle && estBareme(regle.bareme) ? regle.bareme : BAREME_DEFAUT,
    complement: (regle && regle.complement) || null,
    aVerifier: !!(regle && regle.aVerifier),
  }
}

// ── Conversions (le seul pont entre l'affichage et le moteur) ───────────────

/**
 * Valeur exprimée dans un barème → acquisition (0..1).
 * Renvoie null si la valeur n'a pas de sens dans ce barème : un appelant doit
 * pouvoir distinguer « zéro » de « pas de note ».
 */
export function versAcquisition(valeur, cle) {
  const b = BAREMES[cle] || BAREMES[BAREME_DEFAUT]
  if (b.type === 'paliers') {
    const p = b.paliers.find((x) => x.code === String(valeur).toUpperCase())
    return p ? p.acquisition : null
  }
  // Piège : `Number('')` et `Number(null)` valent 0, pas NaN. Sans ce garde, un
  // champ laissé vide deviendrait un ZÉRO — la pire note possible, silencieusement.
  if (valeur === '' || valeur === null || valeur === undefined) return null
  const n = Number(valeur)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(1, n / b.max))
}

/**
 * Acquisition (0..1) → valeur exprimée dans un barème.
 * Numérique : nombre arrondi au demi-point (comme la saisie). Paliers : code du
 * palier atteint. L'aller-retour est stable pour toutes les valeurs de paliers.
 */
export function depuisAcquisition(acquisition, cle) {
  const a = Number(acquisition)
  if (!Number.isFinite(a)) return null
  const b = BAREMES[cle] || BAREMES[BAREME_DEFAUT]
  if (b.type === 'paliers') {
    // Seuils EXPLICITES, du plus exigeant au moins exigeant. Pour l'APC ce sont
    // ceux déjà en production (12 et 7 sur 20) : un bulletin primaire existant
    // ne doit pas changer de palier à cause de ce module.
    const ordonnes = [...b.paliers].sort((x, y) => y.seuil - x.seuil)
    for (const p of ordonnes) {
      if (a >= p.seuil) return p.code
    }
    return ordonnes[ordonnes.length - 1].code
  }
  return Math.round(Math.max(0, Math.min(1, a)) * b.max * 2) / 2
}

/** Libellé court d'un palier (pour l'affichage), ou la valeur telle quelle. */
export function libellePalier(code, cle) {
  const paliers = paliersDe(cle)
  if (!paliers) return String(code)
  const p = paliers.find((x) => x.code === String(code).toUpperCase())
  return p ? p.label : String(code)
}
