// ─────────────────────────────────────────────────────────────────────────────
// PROFIL PAR ÂGE — calibrage de la révision selon le développement cognitif.
//
// Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, piliers P5 et P6.
//
// CE QUE DIT LA RECHERCHE. La mémoire de travail se structure dès 6 ans et sa
// capacité augmente de façon à peu près linéaire jusqu'à 15 ans (Gathercole,
// Pickering, Ambridge et Wearing, 2004). La focalisation attentionnelle de
// l'adulte tient environ quatre unités (Cowan, 2001). Toute information nouvelle
// transite par cette mémoire de travail limitée avant d'être stockée (Sweller,
// van Merriënboer et Paas, 2019).
//
// ⚠️ CE QUE CES TRAVAUX NE DISENT PAS, et c'est le point important. Aucun d'eux
// ne prescrit une durée de séance ni un nombre de questions. Passer de « la
// mémoire de travail augmente avec l'âge » à « donc 5 questions à 8 ans et 10 à
// 15 ans » est une INFÉRENCE DE CONCEPTION, pas un résultat expérimental. La
// gradation ci-dessous est donc un CHOIX DE PRUDENCE, cohérent avec P5 et P6
// mais non démontré, à calibrer sur nos propres données d'abandon et de
// réussite. Face à une école qui demanderait quelle étude fixe 5 questions à
// 8 ans, la réponse honnête est : aucune.
//
// ⚠️ Ne PAS invoquer ici la règle populaire « une minute d'attention par année
// d'âge » : elle n'a aucun fondement empirique établi (référentiel, section 4.6).
// La durée d'attention dépend massivement de la tâche, de l'intérêt et du
// contexte, pas seulement de l'âge.
//
// L'âge vient de l'enfant (saisi à la création) ; à défaut on l'estime depuis le
// niveau scolaire.
// ─────────────────────────────────────────────────────────────────────────────

const AGE_PAR_NIVEAU = {
  cp: 6, ce1: 7, ce2: 8, cm1: 9, cm2: 10,
  '6e': 11, '5e': 12, '4e': 13, '3e': 14,
  '2nde': 15, '1re': 16, tle: 17,
  // ⚠️ LE SUPÉRIEUR ET LA FORMATION MANQUAIENT — mesuré le 28/08.
  //
  // Sans ces lignes, `ageDepuisNiveau` retombait sur son défaut de 15 ans pour
  // TOUT le supérieur : un doctorant, un étudiant en Master et un adulte en MBA
  // étaient rangés dans la bande « ado », celle d'un élève de seconde. Ça ne se
  // voyait nulle part à l'écran — ni erreur, ni message — mais ça pilote les
  // recommandations du profil de compétences (Miapo6C) et de l'orientation.
  //
  // Les âges ci-dessous sont des ORDRES DE GRANDEUR, pas des vérités : ils
  // servent uniquement à franchir le seuil « grand » (17+). Un âge saisi dans le
  // profil les remplace toujours.
  licence1: 19, licence2: 20, licence3: 21,
  master1: 22, master2: 23, doctorat: 26,
  // « Formation (hors catalogue) » : adulte en reconversion, MBA, certification.
  formationhorscatalogue: 30,
}

function normNiveau(n = '') {
  // ⚠️ Les parenthèses sont retirées : « Formation (hors catalogue) » donnait
  // `formation(horscatalogue)` et ne correspondait à aucune clé. C'est le genre
  // de détail qui fait retomber tout un persona sur la valeur par défaut, sans
  // que rien ne le signale.
  let s = String(n).toLowerCase().replace(/[éèêë]/g, 'e').replace(/[()]/g, '').replace(/\s+/g, '')
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
//
// ⚠️ Ces cinq seuils sont un CHOIX D'INGÉNIERIE non démontré, pas une valeur
// tirée d'une étude (voir l'en-tête du fichier). Ils sont volontairement
// prudents. À réviser dès qu'on aura des données d'abandon et de réussite par
// tranche d'âge — pas avant, et surtout pas en cherchant une source qui les
// justifierait après coup.
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
