/**
 * Import d'un calendrier `.ics` → créneaux d'emploi du temps.
 *
 * ⚠️ LES DEUX MODÈLES NE SE CORRESPONDENT PAS, et c'est tout le problème.
 * Un `.ics` contient des ÉVÉNEMENTS DATÉS (début, fin, fuseau, récurrences,
 * exceptions). MAPO+ stocke une GRILLE HEBDOMADAIRE : `{ jour, heure, matiere }`,
 * sans date ni heure de fin, parce que son seul usage est « demain tu as maths,
 * révise ce soir ».
 *
 * Importer, c'est donc APLATIR — et perdre de l'information. On l'assume, mais
 * on le DIT : `parserIcs` renvoie ce qu'il a retenu ET ce qu'il a écarté, pour
 * que l'écran puisse l'annoncer au lieu de laisser croire à un import complet.
 *
 * Choix retenus, et pourquoi :
 *
 *  - **Semaine de référence.** Un export d'année scolaire contient des centaines
 *    d'événements, vacances et contrôles compris. Les empiler tous dans sept
 *    cases donnerait une bouillie. On garde donc la semaine qui porte le PLUS
 *    d'événements — celle qui ressemble le mieux à une semaine type.
 *  - **Les événements hebdomadaires (RRULE FREQ=WEEKLY) sont TOUJOURS gardés**,
 *    quelle que soit leur semaine : c'est précisément la définition d'un cours
 *    qui revient. Sans cette règle, un emploi du temps exporté sous forme de
 *    récurrences (le cas le plus courant) serait réduit à une seule semaine.
 *  - **Les journées entières sont écartées.** « Vacances de Noël » n'a pas
 *    d'heure : ce n'est pas un créneau, et l'y forcer polluerait la veille.
 *
 * Aucune dépendance : un `.ics` est un format texte simple, et charger une
 * bibliothèque de calendrier pour en lire les six champs qui nous intéressent
 * coûterait plus cher que ce qu'elle rapporterait.
 */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/**
 * Un `.ics` coupe ses lignes à 75 octets et poursuit la suivante par un espace
 * ou une tabulation. Lire le fichier ligne à ligne SANS recoller donnerait des
 * intitulés tronqués au milieu d'un mot — le genre de défaut qui ne se voit que
 * sur les noms de matières un peu longs.
 */
export function deplierLignes(texte) {
  const brut = String(texte || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const out = []
  for (const l of brut.split('\n')) {
    if ((l.startsWith(' ') || l.startsWith('\t')) && out.length) out[out.length - 1] += l.slice(1)
    else out.push(l)
  }
  return out
}

/** Déséchappe un texte ICS (RFC 5545 : `\,` `\;` `\n` `\\`). */
export function desechapper(v) {
  return String(v || '')
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .trim()
}

/**
 * `DTSTART` → { jour, heure } en heure LOCALE de la personne.
 *
 * ⚠️ Deux formes, et les confondre décale tout d'une ou deux heures :
 *  - `20260907T083000` (avec ou sans TZID) = heure MURALE. On lit les chiffres
 *    tels quels : c'est ce que la personne voit sur son emploi du temps.
 *  - `20260907T063000Z` = UTC. Il FAUT convertir, sinon un cours de 8 h 30 à
 *    Paris s'afficherait à 6 h 30.
 */
export function lireDtstart(valeur) {
  const v = String(valeur || '').trim()
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const [, a, mo, j, h, mi, , z] = m
  if (h === undefined) return { journeeEntiere: true }
  if (z) {
    const d = new Date(Date.UTC(+a, +mo - 1, +j, +h, +mi))
    return { jour: JOURS[d.getDay()], heure: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, cle: cleSemaine(d) }
  }
  const d = new Date(+a, +mo - 1, +j, +h, +mi)
  return { jour: JOURS[d.getDay()], heure: `${h}:${mi}`, cle: cleSemaine(d) }
}

/** Identifiant de la semaine (lundi) d'une date — sert à grouper, pas à afficher. */
export function cleSemaine(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // recule au lundi
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Découpe le fichier en blocs VEVENT, chacun réduit aux champs utiles. */
function lireEvenements(texte) {
  const evts = []
  let cur = null
  for (const ligne of deplierLignes(texte)) {
    const L = ligne.trim()
    if (L === 'BEGIN:VEVENT') { cur = {}; continue }
    if (L === 'END:VEVENT') { if (cur) evts.push(cur); cur = null; continue }
    if (!cur) continue
    const sep = L.indexOf(':')
    if (sep === -1) continue
    const nom = L.slice(0, sep).split(';')[0].toUpperCase()
    const val = L.slice(sep + 1)
    if (nom === 'DTSTART') cur.dtstart = val
    else if (nom === 'SUMMARY') cur.summary = val
    else if (nom === 'RRULE') cur.rrule = val.toUpperCase()
    else if (nom === 'LOCATION') cur.location = val
  }
  return evts
}

export const MAX_CRENEAUX = 40

/**
 * @returns {{creneaux:Array<{jour:string,heure:string,matiere:string}>,
 *            lus:number, ignoresSansHeure:number, ignoresSansTitre:number,
 *            semaines:number, tronque:boolean}}
 */
export function parserIcs(texte) {
  const evts = lireEvenements(texte)
  const vus = []
  let ignoresSansHeure = 0
  let ignoresSansTitre = 0
  const parSemaine = new Map()

  for (const e of evts) {
    const t = desechapper(e.summary)
    const d = lireDtstart(e.dtstart)
    if (!d) continue
    if (d.journeeEntiere) { ignoresSansHeure++; continue }
    if (!t) { ignoresSansTitre++; continue }
    const hebdo = /FREQ=WEEKLY/.test(e.rrule || '')
    const item = { jour: d.jour, heure: d.heure, matiere: t, cle: d.cle, hebdo }
    vus.push(item)
    parSemaine.set(d.cle, (parSemaine.get(d.cle) || 0) + 1)
  }

  // Semaine de référence = celle qui porte le plus d'événements. À égalité, la
  // plus ancienne, pour que deux imports du même fichier donnent le même
  // résultat (un tri instable rendrait la fonction non reproductible).
  let refSemaine = null
  let meilleur = -1
  for (const cle of [...parSemaine.keys()].sort()) {
    const n = parSemaine.get(cle)
    if (n > meilleur) { meilleur = n; refSemaine = cle }
  }

  const gardes = vus.filter((c) => c.hebdo || c.cle === refSemaine)
  const creneaux = []
  const dejaVu = new Set()
  for (const c of gardes) {
    const k = `${c.jour}|${c.heure}|${c.matiere.toLowerCase()}`
    if (dejaVu.has(k)) continue
    dejaVu.add(k)
    creneaux.push({ jour: c.jour, heure: c.heure, matiere: c.matiere })
  }
  creneaux.sort((a, b) => (JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour)) || a.heure.localeCompare(b.heure))

  return {
    creneaux: creneaux.slice(0, MAX_CRENEAUX),
    lus: evts.length,
    ignoresSansHeure,
    ignoresSansTitre,
    semaines: parSemaine.size,
    tronque: creneaux.length > MAX_CRENEAUX,
  }
}
