/**
 * Sons de retour du quiz — synthétisés, pas de fichiers audio.
 *
 * Pourquoi synthétiser : l'application vise des connexions lentes et des
 * forfaits comptés. Des fichiers audio, même courts, c'est du poids à
 * télécharger, un cache de plus à gérer et un risque de silence hors ligne.
 * Tout est produit à la volée, et marche offline par construction.
 *
 * ⚠️ PREMIÈRE VERSION RATÉE (13/08) : des sinusoïdes pures. Techniquement
 * correct, mais ça sonnait « bip d'ascenseur » et pas jeu. Ce qui fait le son
 * de jeu, ce n'est pas la note, ce sont QUATRE choses :
 *   1. la FORME D'ONDE — carrée ou triangle (harmoniques riches), pas sinus ;
 *   2. le GLISSANDO — la hauteur monte pendant la note, elle ne reste pas fixe ;
 *   3. le DÉSACCORD — deux oscillateurs à quelques hertz d'écart, ça épaissit ;
 *   4. la VITESSE — des notes très courtes qui s'enchaînent, pas une mélodie.
 *
 * Parti pris sonore, à ne pas défaire : la bonne réponse claque ; la mauvaise
 * est un son SOURD et BREF, jamais un buzzer. Un enfant qui révise le soir doit
 * être informé, pas puni — la sanction sonore décourage et n'apprend rien.
 */

const CLE_SON = 'mapo_b2c_son'

let ctx = null
/** Le contexte audio ne peut naître que d'un geste utilisateur (règle des
 *  navigateurs) : on le crée paresseusement, au premier son joué. */
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
 * Brique de base : une note qui GLISSE d'une hauteur à une autre.
 *
 * @param {object} o
 * @param {number} o.de      hauteur de départ (Hz)
 * @param {number} o.vers    hauteur d'arrivée (Hz) — c'est le glissando
 * @param {number} o.debut   décalage en secondes (horloge audio, pas setTimeout :
 *                           un setTimeout dérive et la mélodie sonne bancale)
 * @param {number} o.duree
 * @param {string} o.forme   'square' | 'triangle' | 'sawtooth'
 * @param {number} o.volume
 * @param {number} o.desaccord  cents de désaccord d'un second oscillateur
 */
function bip({ de, vers = de, debut = 0, duree = 0.09, forme = 'square', volume = 0.09, desaccord = 0 }) {
  const c = contexte()
  if (!c) return
  const t = c.currentTime + debut
  const gain = c.createGain()
  // Enveloppe : attaque quasi instantanée (c'est ce qui fait « claquer »),
  // extinction rapide. Sans enveloppe, chaque note commence par un clic.
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  gain.connect(c.destination)

  const voix = desaccord ? [0, desaccord] : [0]
  for (const d of voix) {
    const osc = c.createOscillator()
    osc.type = forme
    osc.frequency.setValueAtTime(de, t)
    if (vers !== de) osc.frequency.exponentialRampToValueAtTime(vers, t + duree)
    if (d) osc.detune.setValueAtTime(d, t)
    osc.connect(gain)
    osc.start(t); osc.stop(t + duree + 0.02)
  }
}

/**
 * Bonne réponse — le « coin ». Deux notes carrées très rapides, la seconde
 * glissant vers le haut. C'est le motif universel de la récompense dans le jeu
 * vidéo depuis quarante ans : court, aigu, ascendant.
 */
export function sonJuste() {
  if (!sonActif()) return
  bip({ de: 988, duree: 0.055, forme: 'square', volume: 0.075 })
  bip({ de: 1319, vers: 1568, debut: 0.055, duree: 0.13, forme: 'square', volume: 0.085, desaccord: 8 })
}

/**
 * Mauvaise réponse — un son SOURD, pas un buzzer. Onde triangle grave qui
 * DESCEND, très court, volume réduit de moitié. On informe, on ne punit pas.
 */
export function sonFaux() {
  if (!sonActif()) return
  bip({ de: 196, vers: 130, duree: 0.16, forme: 'triangle', volume: 0.055 })
}

/**
 * Série en cours — arpège chiptune ascendant qui S'ALLONGE avec la série.
 * Le motif doit se mériter : un même son à 2 et à 8 bonnes réponses d'affilée
 * n'apprend rien à l'oreille et tue le sentiment de progression.
 */
export function sonSerie(longueur) {
  if (!sonActif()) return
  const n = Math.max(2, Number(longueur) || 2)
  // Gamme pentatonique majeure : toutes les combinaisons sonnent justes, donc
  // l'arpège reste agréable quelle que soit la longueur.
  const gamme = [784, 880, 1047, 1175, 1397, 1568, 1760, 2093]
  const combien = Math.min(gamme.length, 2 + Math.floor(n / 2))
  for (let i = 0; i < combien; i++) {
    bip({ de: gamme[i], debut: i * 0.045, duree: 0.09, forme: 'square', volume: 0.07, desaccord: 6 })
  }
  // Note finale tenue, une octave au-dessus : la « ponctuation » de l'arpège.
  bip({ de: gamme[combien - 1] * 2, debut: combien * 0.045, duree: 0.22, forme: 'square', volume: 0.06, desaccord: 10 })
}

/**
 * Quiz terminé avec un bon score — petite fanfare montante, plus large et plus
 * tenue que la série : on ferme la séance, ça doit s'entendre.
 */
export function sonVictoire() {
  if (!sonActif()) return
  const motif = [523, 659, 784, 1047]
  motif.forEach((f, i) => bip({ de: f, debut: i * 0.085, duree: 0.14, forme: 'square', volume: 0.08, desaccord: 7 }))
  bip({ de: 1047, vers: 1568, debut: 0.36, duree: 0.42, forme: 'square', volume: 0.09, desaccord: 12 })
}

/**
 * Palier franchi (programme de l'année maîtrisé) — le son le plus riche de
 * l'application. Il ne doit arriver que quelques fois par an : c'est ce qui lui
 * donne sa valeur.
 */
export function sonPalier() {
  if (!sonActif()) return
  const motif = [523, 784, 1047, 1319, 1568]
  motif.forEach((f, i) => bip({ de: f, debut: i * 0.07, duree: 0.16, forme: 'square', volume: 0.085, desaccord: 9 }))
  bip({ de: 1568, vers: 2093, debut: 0.4, duree: 0.55, forme: 'triangle', volume: 0.1, desaccord: 14 })
}
