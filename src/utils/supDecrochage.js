// Calcul PUR du risque de décrochage (Supérieur).
// Source de vérité unique, partagée par SupDecrochage.vue (vue complète) et
// SupDashboard.vue (widget résumé). Le modèle Supérieur n'a pas d'assiduité par
// séance : on s'appuie sur les résultats (moyenne), l'avancée en crédits ECTS du
// semestre, et l'assiduité agrégée (module Assiduité).

export const DECRO = {
  WEAK_AVG: 11,        // moyenne < 11/20 = à suivre
  HIGH_AVG: 10,        // moyenne < 10/20 = risque élevé
  VERY_WEAK_AVG: 9,    // moyenne < 9 = facteur « fort »
  CREDIT_GAP: 6,       // ≥ 6 ECTS de retard = signal
  CREDIT_GAP_HIGH: 12, // ≥ 12 ECTS de retard = facteur « fort »
  SEMESTER_ECTS: 30,   // crédits attendus au terme du 1er semestre
  ABS_RATE: 0.15,      // ≥ 15 % d'absences = signal
  ABS_RATE_HIGH: 0.28, // ≥ 28 % = sévère
  ABS_COUNT: 4,        // ou ≥ 4 absences absolues
  MAX_ROWS: 60,
}

function initials(e) {
  return `${(e.prenom || '')[0] || ''}${(e.nom || '')[0] || ''}`.toUpperCase()
}

/**
 * @param {Array} etudiants - store.etudiants
 * @param {Object} promoById - map { [promotionId]: promotion }
 * @param {(id:string)=>{tauxAbs:number, absent:number}} statsFor - assiduité par étudiant
 * @returns {Array} lignes triées (risque élevé d'abord), factors = [{key,strong,...}] SANS libellé traduit
 */
export function computeDecrochage(etudiants, promoById, statsFor) {
  const D = DECRO
  const out = []
  for (const e of etudiants || []) {
    if (e.statut && e.statut !== 'inscrit' && e.statut !== 'en_difficulte') continue
    const promo = promoById[e.promotionId]
    const rang = (promo && promo.rang) || 1
    const moyenne = typeof e.moyenne === 'number' ? e.moyenne : null
    const ectsThisYear = (e.ectsValides || 0) - (rang - 1) * 60
    const creditGap = Math.max(0, D.SEMESTER_ECTS - ectsThisYear)
    const pr = statsFor(e.id)
    const tauxAbs = pr.tauxAbs

    const factors = []
    if (tauxAbs >= D.ABS_RATE || pr.absent >= D.ABS_COUNT) {
      factors.push({ key: 'abs', strong: tauxAbs >= D.ABS_RATE_HIGH, pct: Math.round(tauxAbs * 100), n: pr.absent })
    }
    if (moyenne !== null && moyenne < D.WEAK_AVG) {
      factors.push({ key: 'avg', strong: moyenne < D.VERY_WEAK_AVG, avg: moyenne })
    }
    if (creditGap >= D.CREDIT_GAP) {
      factors.push({ key: 'credit', strong: creditGap >= D.CREDIT_GAP_HIGH, n: creditGap })
    }
    if (!factors.length) continue

    const niveau = ((moyenne !== null && moyenne < D.HIGH_AVG) || tauxAbs >= D.ABS_RATE_HIGH) ? 'eleve' : 'moyen'
    const score = Math.round(tauxAbs * 120) + creditGap * 4 + (moyenne !== null && moyenne < D.WEAK_AVG ? (D.WEAK_AVG - moyenne) * 8 : 0) + factors.length * 10
    out.push({
      id: e.id, nomComplet: e.nomComplet || `${e.nom || ''} ${e.prenom || ''}`.trim(),
      sexe: e.sexe, initials: initials(e),
      promoNom: promo ? `${promo.programmeNom} · ${promo.anneeNom}` : (e.programmeNom || ''),
      moyenne, tauxAbs, absent: pr.absent, creditGap, factors, niveau, score,
    })
  }
  return out
    .sort((a, b) => (a.niveau === b.niveau ? b.score - a.score : (a.niveau === 'eleve' ? -1 : 1)))
    .slice(0, D.MAX_ROWS)
}
