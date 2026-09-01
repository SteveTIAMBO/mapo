/**
 * Une séance revenue courte se COMPLÈTE, et se DIT.
 *
 * ⚠️ RÉPONSE MESURÉE à la question qui traînait depuis des semaines : « d'où
 * viennent les 6 questions au lieu de 10 ? ». Le registre qualité serveur
 * (`mapo-qualite.json`, lu le 01/09/2026) tranche :
 *
 *     5 questions  ← 2026-08|Sciences|6ème|sans        0 rejet
 *     6 questions  ← 2026-08|Stratégie d'entreprise    0 rejet
 *     6 questions  ← 2026-08|Finance d’entreprise      0 rejet
 *
 * **Zéro rejet dans les trois cas.** Ce n'est donc PAS le solveur aveugle qui
 * coupe — c'est le modèle qui rend moins de questions qu'on lui en demande.
 * Or toute la mécanique bâtie jusque-là (marge de surgénération, complément
 * depuis la banque, régénération) réagit aux REJETS. La sous-production passait
 * entre les mailles, et la séance courte partait en `ok: true` sans un mot.
 *
 * Deux correctifs, tous deux sobres :
 *   1. le complément par la banque ne dépend plus du mode (coût zéro, questions
 *      déjà validées par le solveur) ;
 *   2. si la séance reste courte, on l'annonce — plutôt que de relancer l'IA et
 *      de doubler la facture pour un bénéfice incertain.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const sansCommentaires = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

const STORE = sansCommentaires(lire('src/stores/tuteur.js'))
const QUIZ = sansCommentaires(lire('src/components/TuteurQuiz.vue'))

describe('⭐⭐ le complément par la banque n’est plus conditionnel', () => {
  it('⚠️ il ne dépend PLUS de `banqueEnComplement`', () => {
    // C'était le défaut : le filet ne jouait que si un cours ou un thème était
    // imposé. Pour une révision générique — le cas le plus courant — la séance
    // courte partait telle quelle.
    expect(STORE).toContain('if (retenues.length < nombre && banqueDispo.length)')
    expect(STORE).not.toContain('if (banqueEnComplement && retenues.length < nombre')
  })

  it('les questions ajoutées sont dédoublonnées', () => {
    expect(STORE).toContain('dedoublonne(banqueDispo).slice(0, nombre - retenues.length)')
  })

  it('compléter un cours par la banque fait basculer la provenance en « mix »', () => {
    // Sinon la séance dirait « tirée de tes cours » alors que le programme y a
    // pris une part — un mensonge visible.
    expect(STORE).toContain("if (source === 'cours') source = 'mix'")
  })
})

describe('⭐ une séance courte est ANNONCÉE', () => {
  it('le store renvoie de quoi le dire', () => {
    expect(STORE).toContain('courte: livrees < attendues')
  })

  it('⚠️ et rien n’est annoncé quand la séance est complète', () => {
    // Un bandeau permanent finirait par ne plus rien signifier.
    expect(STORE).toMatch(/courte: livrees < attendues \? \{ livrees, attendues \} : null/)
  })

  it('l’écran le reprend, en FR et en EN', () => {
    expect(QUIZ).toContain('const seanceCourte = ref(null)')
    expect(QUIZ).toContain('courteLabel')
    expect(QUIZ).toContain('Séance plus courte cette fois')
    expect(QUIZ).toContain('Shorter session this time')
  })

  it('le bandeau ne s’affiche qu’une fois, sur la première question', () => {
    expect(QUIZ).toContain('v-if="courteLabel && index === 0"')
  })

  it('⚠️ il ne remplace pas la provenance, il s’y ajoute', () => {
    // Les deux informations sont distinctes : d'où viennent les questions, et
    // combien il y en a.
    expect(QUIZ).toContain('v-if="sourceLabel && index === 0"')
  })
})

describe('rejeu du calcul « séance courte »', () => {
  const courte = (livrees, attendues) => (livrees < attendues ? { livrees, attendues } : null)

  it('10 sur 10 : rien à dire', () => {
    expect(courte(10, 10)).toBeNull()
  })

  it('6 sur 10 : on le dit, avec le vrai chiffre', () => {
    expect(courte(6, 10)).toEqual({ livrees: 6, attendues: 10 })
  })

  it('⚠️ une séance PLUS longue que prévu ne déclenche rien', () => {
    // Le modèle en rend parfois 12 ; on tronque à `nombre` et on se tait.
    expect(courte(12, 10)).toBeNull()
  })
})
