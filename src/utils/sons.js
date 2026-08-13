/**
 * Sons de retour du quiz — synthétisés, pas de fichiers audio.
 *
 * Pourquoi synthétiser : l'application vise des connexions lentes et des
 * forfaits comptés. Des fichiers audio, même courts, c'est du poids à
 * télécharger, un cache de plus à gérer et un risque de silence hors ligne.
 * L'API Web Audio produit ces notes en quelques lignes, sans rien charger, et
 * fonctionne offline par construction.
 *
 * Parti pris SONORE, et il compte : la bonne réponse a un son franc et
 * ascendant ; la mauvaise a un son BREF, GRAVE et DOUX — jamais un buzzer.
 * Un enfant qui révise le soir ne doit pas être puni par le son, juste
 * informé. La sanction sonore décourage, elle n'apprend rien.
 */

const CLE_SON = 'mapo_b2c_son'

let ctx = null
/** Le contexte audio ne peut naître que d'un geste de l'utilisateur (règle des
 *  navigateurs). On le crée donc paresseusement, au premier son joué. */
function contexte() {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  } catch { ctx = null }
  return ctx
}

export function sonActif() {
  try { return localStorage.getItem(CLE_SON) !== '0' } catch { return true }
}
export function definirSon(actif) {
  try { localStorage.setItem(CLE_SON, actif ? '1' : '0') } catch { /* quota */ }
}

/**
 * Joue une note. `debut` est un décalage en secondes, pour enchaîner sans
 * `setTimeout` — le timing d'un `setTimeout` dérive, celui de l'horloge audio
 * non, et une mélodie qui traîne sonne faux.
 */
function note(freq, debut, duree, volume = 0.12) {
  const c = contexte()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine' // doux : on est dans une app d'enfants, pas dans un jeu d'arcade
  osc.frequency.value = freq
  const t = c.currentTime + debut
  // Enveloppe : attaque courte, extinction progressive. Sans elle, chaque note
  // commence et finit par un « clic » désagréable.
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  osc.connect(gain); gain.connect(c.destination)
  osc.start(t); osc.stop(t + duree + 0.02)
}

/** Bonne réponse : deux notes qui montent. Court, net, encourageant. */
export function sonJuste() {
  if (!sonActif()) return
  note(660, 0, 0.12)
  note(880, 0.09, 0.18)
}

/**
 * Mauvaise réponse : UNE note grave et brève, à volume réduit.
 * Volontairement discrète — cf. l'en-tête : on informe, on ne sanctionne pas.
 */
export function sonFaux() {
  if (!sonActif()) return
  note(220, 0, 0.16, 0.07)
}

/**
 * Série en cours. Le motif s'enrichit avec la longueur : c'est le renforcement
 * qui fait revenir, et il doit se MÉRITER — un même son à 2 et à 10 bonnes
 * réponses d'affilée n'apprend rien à l'oreille.
 */
export function sonSerie(longueur) {
  if (!sonActif()) return
  const n = Math.max(2, Number(longueur) || 2)
  const notes = [660, 880, 1046, 1318] // do-mi-sol-do, arpège ascendant
  const combien = Math.min(notes.length, 1 + Math.floor(n / 2))
  for (let i = 0; i < combien; i++) note(notes[i], i * 0.075, 0.16)
}

/** Quiz terminé avec un bon score : petite fanfare de trois notes. */
export function sonVictoire() {
  if (!sonActif()) return
  note(660, 0, 0.14)
  note(880, 0.11, 0.14)
  note(1318, 0.22, 0.3)
}
