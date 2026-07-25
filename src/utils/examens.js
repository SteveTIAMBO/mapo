// ─────────────────────────────────────────────────────────────────────────────
// Base des EXAMENS OFFICIELS par pays et par niveau + génération d'un programme
// de révision ESPACÉ jusqu'à la date de l'examen.
//
// Idée : dès qu'un élève se connecte sur une classe d'examen (3e → Brevet/BEPC,
// Tle → Bac…), l'outil connaît déjà l'échéance et peut la placer dans l'agenda
// et bâtir un programme, sans que l'élève ait à la saisir. L'élève reste libre
// d'ajouter ses propres examens (bac blanc, contrôle commun…) et d'ajuster les
// dates (les dates officielles varient chaque année → affichées « prévisionnelles »).
//
// pays : code ISO utilisé dans l'app (CM, SN, CI, GA, FR…). niveau : libellé de
// l'app, tolérant aux variantes ('3e'/'3ème', '1re'/'1ère', 'Terminale'/'Tle').
// ─────────────────────────────────────────────────────────────────────────────

// mois : 1-12 ; jour : jour du mois. Périodes TYPIQUES (repère, pas date ferme).
export const EXAMENS_OFFICIELS = {
  FR: [
    { key: 'brevet', niveau: '3e', mois: 6, jour: 26 },
    { key: 'eaf', niveau: '1re', mois: 6, jour: 13 },
    { key: 'bac', niveau: 'Tle', mois: 6, jour: 16 },
  ],
  CM: [
    { key: 'bepc', niveau: '3e', mois: 6, jour: 3 },
    { key: 'proba', niveau: '1re', mois: 6, jour: 10 },
    { key: 'bac', niveau: 'Tle', mois: 6, jour: 15 },
  ],
  SN: [
    { key: 'bfem', niveau: '3e', mois: 6, jour: 24 },
    { key: 'bac', niveau: 'Tle', mois: 7, jour: 8 },
  ],
  CI: [
    { key: 'bepc', niveau: '3e', mois: 6, jour: 10 },
    { key: 'bac', niveau: 'Tle', mois: 6, jour: 24 },
  ],
  GA: [
    { key: 'bepc', niveau: '3e', mois: 6, jour: 20 },
    { key: 'bac', niveau: 'Tle', mois: 6, jour: 24 },
  ],
}

// Normalise un niveau pour comparer '3e'/'3ème', '1re'/'1ère', 'Terminale'/'Tle'.
export function normNiveau(n = '') {
  let s = String(n).toLowerCase().replace(/[\u00e9\u00e8\u00ea\u00eb]/g, 'e').replace(/\s+/g, '')
  if (/^t(erminale|erm|le)/.test(s)) return 'tle'
  s = s.replace(/eme$/, 'e').replace(/ere$/, 're')
  return s
}

// Examen officiel correspondant au niveau + pays, ou null (classe hors examen ou
// pays non couvert → l'élève ajoute ses examens manuellement).
export function examenOfficielPour(niveau = '', pays = '') {
  const list = EXAMENS_OFFICIELS[String(pays).toUpperCase()] || []
  const nn = normNiveau(niveau)
  return list.find((e) => normNiveau(e.niveau) === nn) || null
}

function isoDay(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

function addDays(base, n) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  d.setDate(d.getDate() + n)
  return d
}

// Prochaine occurrence (ISO) d'une date mois/jour : cette année, ou l'an prochain
// si déjà passée.
export function prochaineDateISO(mois, jour, base = new Date()) {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  let d = new Date(base.getFullYear(), mois - 1, jour)
  if (d < today) d = new Date(base.getFullYear() + 1, mois - 1, jour)
  return isoDay(d)
}

// Jours restants avant une échéance ISO (négatif si passée).
export function joursAvant(dateISO, base = new Date()) {
  if (!dateISO) return null
  const d = new Date(dateISO + 'T00:00:00')
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  return Math.round((d - b) / 86400000)
}

// Programme de révision ESPACÉ (spacing effect) jusqu'à l'examen : chaque matière
// revient ~1×/semaine, en réservant la dernière semaine aux annales / révisions
// générales. Renvoie des entrées au format de l'agenda MAPO+
// ({ id, matiere, titre, echeance, fait, examId, auto }).
export function genererProgramme({ examId, examLabel, dateISO, matieres = [], base = new Date() }) {
  const out = []
  const total = joursAvant(dateISO, base)
  if (total == null || total <= 0) return out
  const subs = (matieres && matieres.length ? matieres : [examLabel]).slice(0, 12)
  let seq = 0
  const mk = (matiere, titre, dISO) => ({
    id: 'ex' + examId + '_' + (seq++),
    matiere, titre, echeance: dISO, fait: false, examId, auto: true,
  })
  // Séances de révision ESPACÉES sur toute la période (pas entassées au début) :
  // on répartit régulièrement les matières, en réservant la dernière semaine aux
  // annales. Densité ≈ une séance toutes les ~12 j, bornée pour rester lisible.
  const usable = Math.max(7, total - 8)
  const n = Math.min(20, subs.length * 4, Math.max(subs.length, Math.floor(usable / 12)))
  const gap = usable / (n + 1)
  for (let i = 0; i < n; i++) {
    const matiere = subs[i % subs.length]
    out.push(mk(matiere, `Révision — ${matiere}`, isoDay(addDays(base, Math.round(gap * (i + 1))))))
  }
  // Dernière ligne droite : annales puis bilan général.
  out.push(mk(examLabel, `Annales / sujet type — ${examLabel}`, isoDay(addDays(base, Math.max(1, total - 6)))))
  out.push(mk(examLabel, `Révisions générales — ${examLabel}`, isoDay(addDays(base, Math.max(1, total - 2)))))
  return out
}
