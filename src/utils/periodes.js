/**
 * Découpage de l'année scolaire : périodes et séquences DE L'ÉCOLE.
 *
 * Trois défauts réels que ce module corrige :
 *
 * 1. L'onboarding n'écrivait JAMAIS `periods`. Une vraie école arrivait donc dans
 *    Paramètres sur une section « Périodes scolaires » entièrement vide, sans
 *    aucun bouton pour en ajouter une : son calendrier était insaisissable. Seule
 *    la démo avait des périodes, parce qu'elles sont écrites en dur dans le jeu
 *    de démonstration.
 * 2. Le découpage était figé à trois trimestres et six séquences (`TRIMESTERS`,
 *    `SEQUENCES` dans `stores/notes.js`). Une école au semestre n'avait aucune
 *    issue.
 * 3. Les libellés étaient en dur en français (« 1er Trimestre »), donc jamais
 *    traduits, et faux pour une école au semestre.
 *
 * ⚠️ CHOIX STRUCTURANT : les CODES restent `T1`, `T2`, … même au semestre.
 * Seul le LIBELLÉ change. Les notes sont enregistrées sous des clés
 * `classe_matiere_periode` : renommer les codes invaliderait toutes les notes
 * déjà saisies. Un changement de découpage ne doit jamais faire disparaître des
 * notes en silence — c'est la même règle que la conversion de barème.
 */

/** Nombre de périodes par découpage. L'école peut ensuite en ajouter ou en retirer. */
export const DECOUPAGES = {
  trimestres: 3,
  semestres: 2,
}

/** Code d'une période, par son rang (0 → T1). */
export function codePeriode(rang) {
  return 'T' + (rang + 1)
}

/** Code d'une séquence, par son rang global (0 → S1). */
export function codeSequence(rang) {
  return 'S' + (rang + 1)
}

/**
 * Libellé d'une période. `decoupage` décide du MOT, le rang décide du numéro.
 * `t` est la fonction de traduction ; sans elle on retombe sur le français, ce
 * qui reste préférable à un code brut affiché à un parent.
 */
export function libellePeriode(code, decoupage = 'trimestres', t = null) {
  const rang = Number(String(code).replace(/^T/, '')) || 1
  const cle = decoupage === 'semestres' ? 'periode.semestre' : 'periode.trimestre'
  if (typeof t === 'function') {
    // 3e argument : la pluralisation vue-i18n, qui porte ici l'ordinal.
    // « 1er trimestre » d'un côté, « 3ème trimestre » de l'autre — l'anglais
    // n'a pas cette distinction, ses deux branches sont identiques.
    const traduit = t(cle, { n: rang }, rang)
    if (traduit && traduit !== cle) return traduit
  }
  const mot = decoupage === 'semestres' ? 'semestre' : 'trimestre'
  return rang === 1 ? `1er ${mot}` : `${rang}ème ${mot}`
}

/** Libellé d'une séquence. */
export function libelleSequence(code, t = null) {
  const rang = Number(String(code).replace(/^S/, '')) || 1
  if (typeof t === 'function') {
    const traduit = t('periode.sequence', { n: rang }, rang)
    if (traduit && traduit !== 'periode.sequence') return traduit
  }
  return `Séquence ${rang}`
}

/** Bornes de l'année scolaire « 2025-2026 » → 2 septembre 2025 → 30 juin 2026. */
function bornesAnnee(academicYear) {
  const m = String(academicYear || '').match(/(\d{4})\s*[-/]\s*(\d{4})/)
  const a1 = m ? Number(m[1]) : new Date().getFullYear()
  const a2 = m ? Number(m[2]) : a1 + 1
  return { debut: new Date(a1, 8, 2), fin: new Date(a2, 5, 30) }
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ajouterJours(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/**
 * Périodes par défaut, à proposer à une école qui n'en a aucune.
 *
 * Ce sont des dates de DÉPART, pas une vérité : les vacances varient d'un pays et
 * d'une école à l'autre, et aucune source ne permettrait de les deviner. L'école
 * les corrige ensuite. C'est justement pour ça qu'on les écrit en base plutôt que
 * de laisser la section vide : on ne peut corriger que ce qui existe.
 */
export function periodesParDefaut({ decoupage = 'trimestres', evaluationType = '2_sequences', academicYear = '' } = {}) {
  const nb = DECOUPAGES[decoupage] || DECOUPAGES.trimestres
  const { debut, fin } = bornesAnnee(academicYear)
  const total = Math.round((fin - debut) / 86400000)
  const pas = Math.floor(total / nb)

  const parSequence = evaluationType === '2_sequences' ? 2 : 1
  const periods = {}
  let rangSeq = 0

  for (let i = 0; i < nb; i++) {
    const pDebut = ajouterJours(debut, i * pas)
    const pFin = i === nb - 1 ? fin : ajouterJours(debut, (i + 1) * pas - 7)

    const sequences = {}
    if (parSequence > 1) {
      const duree = Math.floor((pFin - pDebut) / 86400000 / parSequence)
      for (let j = 0; j < parSequence; j++) {
        const sDebut = ajouterJours(pDebut, j * duree)
        const sFin = j === parSequence - 1 ? pFin : ajouterJours(pDebut, (j + 1) * duree - 2)
        sequences[codeSequence(rangSeq++)] = { start: iso(sDebut), end: iso(sFin) }
      }
    }

    periods[codePeriode(i)] = {
      start: iso(pDebut),
      end: iso(pFin),
      sequences,
      conseil: iso(ajouterJours(pFin, 2)),
    }
  }
  return periods
}

/** Tri des codes par rang numérique : sans lui, T10 passerait avant T2. */
function parRang(codes) {
  return [...codes].sort((a, b) => (Number(a.replace(/\D/g, '')) || 0) - (Number(b.replace(/\D/g, '')) || 0))
}

/**
 * Périodes de l'école, dans l'ordre, au format attendu par les écrans de notes.
 * Repli sur trois trimestres quand l'école n'a rien déclaré : mieux vaut un
 * écran de notes utilisable qu'une liste déroulante vide.
 */
export function listePeriodes(settings = {}, t = null) {
  const periods = settings?.periods && Object.keys(settings.periods).length
    ? settings.periods
    : periodesParDefaut({ decoupage: settings?.decoupage, evaluationType: settings?.evaluationType, academicYear: settings?.academicYear })
  const decoupage = settings?.decoupage || 'trimestres'

  return parRang(Object.keys(periods)).map((code) => ({
    value: code,
    label: libellePeriode(code, decoupage, t),
    sequences: parRang(Object.keys(periods[code]?.sequences || {})),
  }))
}

/** Séquences de l'école, dans l'ordre, avec la période à laquelle chacune appartient. */
export function listeSequences(settings = {}, t = null) {
  const out = []
  for (const p of listePeriodes(settings, t)) {
    for (const s of p.sequences) out.push({ value: s, label: libelleSequence(s, t), trimester: p.value })
  }
  return out
}

/**
 * Périodes signables : séquences et période intercalées dans l'ordre du calendrier,
 * puis le bilan annuel. C'est l'ordre dans lequel une direction signe réellement.
 */
export function listeSignPeriodes(settings = {}, t = null) {
  const out = []
  for (const p of listePeriodes(settings, t)) {
    for (const s of p.sequences) out.push({ value: s, label: libelleSequence(s, t), type: 'sequence', trimester: p.value })
    out.push({ value: p.value, label: p.label, type: 'trimester' })
  }
  const annuel = typeof t === 'function' ? t('periode.annuel') : 'Bilan annuel'
  out.push({ value: 'annual', label: annuel === 'periode.annuel' ? 'Bilan annuel' : annuel, type: 'annual' })
  return out
}

/**
 * Ajoute une période à la fin, avec ses séquences si l'école en utilise.
 * Renvoie le code créé, ou `null` si rien n'a été fait — l'appelant doit pouvoir
 * le dire à l'utilisateur plutôt que de laisser un bouton sans effet.
 */
export function ajouterPeriode(periods, { evaluationType = '2_sequences' } = {}) {
  if (!periods || typeof periods !== 'object') return null
  const codes = parRang(Object.keys(periods))
  const code = codePeriode(codes.length)
  if (periods[code]) return null

  const sequences = {}
  if (evaluationType === '2_sequences') {
    const dejaUtilisees = new Set()
    for (const p of Object.values(periods)) for (const s of Object.keys(p?.sequences || {})) dejaUtilisees.add(s)
    let rang = 0
    for (let j = 0; j < 2; j++) {
      while (dejaUtilisees.has(codeSequence(rang))) rang++
      sequences[codeSequence(rang++)] = { start: '', end: '' }
    }
  }
  periods[code] = { start: '', end: '', sequences, conseil: '' }
  return code
}

/**
 * Retire la DERNIÈRE période. On ne retire que la dernière, volontairement :
 * supprimer T2 laisserait un trou entre T1 et T3, et les notes de T3 se
 * retrouveraient rattachées à une période qui n'a plus de sens.
 */
export function retirerDernierePeriode(periods) {
  if (!periods || typeof periods !== 'object') return null
  const codes = parRang(Object.keys(periods))
  if (codes.length <= 1) return null // une école a au moins une période
  const code = codes[codes.length - 1]
  delete periods[code]
  return code
}
