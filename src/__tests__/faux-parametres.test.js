import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appliquerLangueEcole, setLang, currentLang } from '../i18n'

/**
 * Faux paramètres — audit du 01/09/2026.
 *
 * Un faux paramètre est un réglage que l'interface propose, enregistre et
 * confirme, et que RIEN ne relit. C'est pire qu'une absence de réglage : le
 * client l'a vu pendant la démonstration et croit l'avoir configuré.
 *
 * Quatre étaient confirmés. Deux sont branchés (langue, logo), deux sont retirés
 * (format de date, type d'établissement — décision de Steve : ne pas brancher un
 * réglage que personne ne demande).
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')

/** Le code seul : un commentaire qui explique la correction CITE le nom fautif. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

describe('⚠️ la langue de l’école agit vraiment', () => {
  beforeEach(() => {
    localStorage.clear()
    setLang('fr')
    localStorage.clear() // setLang écrit le choix : on repart d'un visiteur neuf
  })

  it('elle s’applique quand le visiteur n’a jamais choisi', () => {
    expect(appliquerLangueEcole('en')).toBe(true)
    expect(currentLang()).toBe('en')
  })

  it('⚠️ un défaut n’est PAS un choix : rien n’est écrit en mémoire', () => {
    // Sinon le premier chargement figerait la langue de l'école comme si
    // l'utilisateur l'avait choisie, et le réglage ne pourrait plus évoluer.
    appliquerLangueEcole('en')
    expect(localStorage.getItem('mapo_lang')).toBe(null)
  })

  it('⚠️ elle n’écrase JAMAIS un choix explicite du visiteur', () => {
    // Un enseignant anglophone dans une école francophone serait sinon remis en
    // français à chaque ouverture.
    setLang('en')
    expect(appliquerLangueEcole('fr')).toBe(false)
    expect(currentLang()).toBe('en')
  })

  it('une langue inconnue ne fait rien', () => {
    expect(appliquerLangueEcole('es')).toBe(false)
    expect(appliquerLangueEcole(undefined)).toBe(false)
  })
})

describe('branchements vérifiés sur le code source', () => {
  const params = lire('views/ParametresView.vue')
  const school = lire('stores/school.js')
  const pdf = lire('utils/pdfBulletin.js')

  it('enregistrer les paramètres applique la langue', () => {
    // Le défaut : `setLang` n'était appelé QUE par les boutons FR/EN de
    // l'en-tête. Deux commandes du même nom, une seule branchée.
    expect(params).toContain("import { setLang } from '../i18n'")
    const i = params.indexOf('const saveSettings')
    expect(i).toBeGreaterThan(0)
    expect(params.slice(i, i + 900)).toContain('setLang(form.language)')
  })

  it('la langue de l’école s’applique aussi au chargement', () => {
    expect(school).toContain('appliquerLangueEcole(schoolSettings.value?.language)')
  })

  it('le bulletin PDF dessine enfin le logo', () => {
    // Il était transmis (`logoUrl: school.logo`) et jamais dessiné.
    expect(pdf).toContain('doc.addImage(logo,')
  })

  it('et il accepte les DEUX champs de logo qui coexistent', () => {
    // `logo` vient des Paramètres, `logoUrl` de la console EDUFREM. N'en lire
    // qu'un laisserait la moitié des écoles sans logo.
    expect(pdf).toContain('school.logo || school.logoUrl')
  })
})

describe('les réglages sans effet ont été retirés', () => {
  const params = sansCommentaires(lire('views/ParametresView.vue'))

  it('plus de menu « format de date »', () => {
    // Trois formats proposés, aucun lecteur dans src/.
    expect(params).not.toContain('form.dateFormat')
    expect(params).not.toContain('MM/DD/YYYY')
  })

  it('plus de menu « type d’établissement »', () => {
    // Un seul lecteur, et il ne bascule ni programme ni bulletin : c'est
    // `edition`, fixée par EDUFREM, qui décide.
    expect(params).not.toContain('form.schoolType')
    expect(params).not.toContain('SCHOOL_TYPES')
  })

  it('mais les réglages qui AGISSENT sont toujours là', () => {
    // Garde-fou : retirer les faux ne doit pas emporter les vrais.
    expect(params).toContain('form.currency')
    expect(params).toContain('form.country')
    expect(params).toContain('form.language')
  })
})
