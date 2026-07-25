// ─────────────────────────────────────────────────────────────────────────────
// PROFIL PAR ÂGE — calibrage de la révision selon le développement cognitif.
//
// Base scientifique (cf. MANIFESTE) : la mémoire de travail et l'attention
// soutenue augmentent avec l'âge (Gathercole 2004 ; Cowan 2016) ; le cortex
// préfrontal (autorégulation) mûrit tard. → plus jeune = sessions plus courtes,
// moins d'items à la fois. On ne fixe donc PLUS « 10 questions dans le marbre ».
//
// L'âge vient de l'enfant (saisi à la création) ; à défaut on l'estime depuis le
// niveau scolaire.
// ─────────────────────────────────────────────────────────────────────────────

const AGE_PAR_NIVEAU = {
  cp: 6, ce1: 7, ce2: 8, cm1: 9, cm2: 10,
  '6e': 11, '5e': 12, '4e': 13, '3e': 14,
  '2nde': 15, '1re': 16, tle: 17,
}

function normNiveau(n = '') {
  let s = String(n).toLowerCase().replace(/[éèêë]/g, 'e').replace(/\s+/g, '')
  if (/^t(erminale|erm|le)/.test(s)) return 'tle'
  if (/^2(nde|de)/.test(s)) return '2nde'
  if (/^1(re|ere)/.test(s)) return '1re'
  s = s.replace(/eme$/, 'e').replace(/ere$/, 're')
  return s
}

// Âge estimé depuis le niveau scolaire (repli). Défaut : 15 ans.
export function ageDepuisNiveau(niveau = '') {
  return AGE_PAR_NIVEAU[normNiveau(niveau)] || 15
}

// Âge effectif de l'apprenant : champ `age` si renseigné (4–99), sinon estimé.
export function ageDe(enfant) {
  const a = parseInt(enfant && enfant.age, 10)
  if (a >= 4 && a <= 99) return a
  return ageDepuisNiveau(enfant && enfant.niveau)
}

// Nombre de questions d'une session de quiz, adapté à l'âge (plus jeune = plus
// court). Fourchette 5 → 10.
export function sessionQuestions(enfant) {
  const a = ageDe(enfant)
  if (a <= 8) return 5
  if (a <= 10) return 6
  if (a <= 12) return 7
  if (a <= 14) return 8
  return 10
}

// Bande d'âge (pour pondérer les recommandations pédagogiques ailleurs).
export function bandeAge(enfant) {
  const a = ageDe(enfant)
  if (a <= 10) return 'enfant'       // primaire : concret, étayé, court
  if (a <= 13) return 'preado'       // début collège : guidage, sens
  if (a <= 16) return 'ado'          // collège/lycée : + d'autonomie
  return 'grand'                     // lycée+/adulte : autonomie, abstraction
}
