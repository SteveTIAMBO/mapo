/**
 * Un adulte n'est pas un élève de seconde.
 *
 * ⚠️ MESURÉ LE 28/08, et le résultat m'a corrigé. Steve : « 6 questions alors
 * que je suis un adulte de 33 ans ? ». J'ai cherché la cause dans le calibrage
 * par âge — et la mesure a montré autre chose :
 *
 *   MBA hors catalogue → age=15  bande=ado  questions=10
 *   Licence 1 / Master 2 / Doctorat → age=15  bande=ado  questions=10
 *
 * Donc le nombre de questions était DÉJÀ de 10 : le « 6 » vient d'ailleurs (à
 * chercher du côté du solveur qui rejette, ou de la banque qui ne complète pas).
 *
 * ⚠️ MAIS LA MESURE A RÉVÉLÉ PIRE : **tout le supérieur était classé « ado »**,
 * à 15 ans. Un doctorant traité comme un élève de seconde. Deux causes :
 *
 *  1. `AGE_PAR_NIVEAU` s'arrêtait à la Terminale — aucune entrée pour le LMD ni
 *     pour la formation hors catalogue → repli sur le défaut de 15 ans ;
 *  2. `normNiveau` gardait les parenthèses : « Formation (hors catalogue) »
 *     donnait `formation(horscatalogue)`, qui ne correspondait à rien.
 *
 * Rien ne le signalait à l'écran. Or la bande d'âge pilote les recommandations
 * du profil de compétences (Miapo6C) et de l'orientation.
 */
import { describe, it, expect } from 'vitest'
import { ageDe, bandeAge, sessionQuestions, ageDepuisNiveau } from '../utils/ageProfil'
import { NIVEAUX_SUPERIEUR, NIVEAU_HORS_CATALOGUE } from '../stores/enfantsAutonomes'

describe('⭐⭐ le supérieur et la formation ne sont plus des « ados »', () => {
  it('AUCUN niveau du supérieur ne retombe sur le défaut de 15 ans', () => {
    // Le test parcourt la VRAIE liste du store : si quelqu'un y ajoute un
    // niveau (Doctorat, BTS…) sans le déclarer ici, ce test le dit.
    for (const n of NIVEAUX_SUPERIEUR) {
      expect(ageDepuisNiveau(n), n).toBeGreaterThan(17)
      expect(bandeAge({ niveau: n }), n).toBe('grand')
    }
  })

  it('⚠️ la formation hors catalogue non plus — malgré ses parenthèses', () => {
    expect(bandeAge({ niveau: NIVEAU_HORS_CATALOGUE })).toBe('grand')
    expect(ageDepuisNiveau(NIVEAU_HORS_CATALOGUE)).toBeGreaterThanOrEqual(18)
  })

  it('un adulte a une séance de longueur pleine', () => {
    expect(sessionQuestions({ niveau: NIVEAU_HORS_CATALOGUE })).toBe(10)
    expect(sessionQuestions({ niveau: 'Doctorat' })).toBe(10)
  })
})

describe('ce que ça ne casse pas', () => {
  it('les classes scolaires gardent leur âge', () => {
    expect(ageDepuisNiveau('CM1')).toBe(9)
    expect(ageDepuisNiveau('6ème')).toBe(11)
    expect(ageDepuisNiveau('Tle D')).toBe(17)
  })

  it('un enfant garde une séance courte', () => {
    expect(sessionQuestions({ niveau: 'CM1' })).toBe(6)
    expect(bandeAge({ niveau: 'CM1' })).toBe('enfant')
  })

  it('⭐ un âge SAISI prime toujours sur le niveau', () => {
    // Un adulte en reprise d'études en Licence, ou un enfant en avance :
    // ce qu'on nous a dit vaut mieux que ce qu'on devine.
    expect(ageDe({ niveau: 'Licence 1', age: '45' })).toBe(45)
    expect(ageDe({ niveau: 'CM1', age: '12' })).toBe(12)
  })

  it('un âge aberrant est ignoré, on retombe sur le niveau', () => {
    expect(ageDe({ niveau: 'CM1', age: '150' })).toBe(9)
    expect(ageDe({ niveau: 'CM1', age: '2' })).toBe(9)
    expect(ageDe({ niveau: 'CM1', age: 'douze' })).toBe(9)
  })

  it('⚠️ un niveau INCONNU retombe toujours sur 15 — et c’est assumé', () => {
    // Les classes congolaises (« 7e année (1re secondaire) ») ne sont pas dans
    // la table : elles tombent ici. C'est un écart CONNU, hors du périmètre du
    // correctif d'aujourd'hui — mais il ne doit pas disparaître en silence.
    expect(ageDepuisNiveau('7e année (1re secondaire)')).toBe(15)
  })
})
