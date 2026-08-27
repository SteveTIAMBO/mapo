import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * MAPO n'a pas de programme à imposer (27/08/2026, principe posé par Steve).
 *
 * « MAPO n'a pas de discipline. MAPO s'adapte à ce que l'école veut. […] c'est
 * l'école qui nomme ses matières et ses classes. MIAPO pourra toujours soulever
 * une incohérence par rapport au référentiel national au moment de l'import,
 * mais sans bloquer. »
 *
 * Trois défauts mesurés sur la première école primaire réelle (Garoua) :
 *   1. sur une école neuve, `loadSubjects()` sème `DEFAULT_SUBJECTS`, la liste
 *      du SECONDAIRE : on proposait « PCT », « Philosophie », « SVT » à un
 *      instituteur ;
 *   2. l'affectation était conditionnée à une matière : un instituteur, qui
 *      tient une CLASSE, ne pouvait être rattaché à rien ;
 *   3. les intitulés du fichier restaient sur la fiche de l'enseignant sans
 *      devenir des matières de l'école.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const personnel = lire('views/PersonnelView.vue')
const importView = lire('views/ImportView.vue')

describe('les matières proposées sont celles de l’école', () => {
  it('en primaire, la liste vient des disciplines déclarées par l’école', () => {
    const i = personnel.indexOf('const allSubjectsList')
    expect(i).toBeGreaterThan(0)
    const bloc = personnel.slice(i, i + 700)
    expect(bloc).toContain('editionStore.isPrimaire')
    expect(bloc).toContain('discPrimaire.noms')
  })

  it('⚠️ le test du primaire passe AVANT le repli secondaire', () => {
    // Dans l'autre ordre, une école primaire dont `subjects` est semé par
    // DEFAULT_SUBJECTS retomberait sur la liste du secondaire — le défaut exact
    // qu'on corrige.
    const i = personnel.indexOf('const allSubjectsList')
    const bloc = personnel.slice(i, i + 700)
    expect(bloc.indexOf('isPrimaire')).toBeLessThan(bloc.indexOf('SUBJECTS_BY_CYCLE'))
  })

  it('la liste des disciplines est réellement chargée au montage', () => {
    // Sans `load()`, on afficherait l'amorce du pays au lieu de la liste de
    // l'école : plausible à l'écran, faux dans les faits.
    const i = personnel.indexOf('onMounted(')
    expect(personnel.slice(i, i + 300)).toContain('discPrimaire.load()')
  })

  it('l’ordre du primaire n’est pas trié alphabétiquement', () => {
    // C'est l'ordre choisi par l'école, et c'est celui des bulletins.
    const i = personnel.indexOf('if (editionStore.isPrimaire) return')
    expect(personnel.slice(i, i + 80)).not.toContain('.sort()')
  })
})

describe('un enseignant peut tenir une classe, sans matière', () => {
  it('le bloc « classe tenue » ne dépend pas des matières', () => {
    // On lit la SEULE ligne qui compte : le `v-if` du conteneur juste au-dessus
    // du label. Une fenêtre de N caractères attrapait soit le commentaire qui
    // cite la condition fautive, soit le bloc précédent qui l'utilise
    // légitimement — l'instrument mesurait autre chose que la question posée.
    const lignes = personnel.replace(/<!--[\s\S]*?-->/g, '').split('\n')
    const cible = lignes.findIndex((l) => l.includes("t('pers.homeroomTitle')"))
    expect(cible).toBeGreaterThan(0)
    const vif = lignes.slice(0, cible).reverse().find((l) => l.includes('v-if='))
    expect(vif).toContain("formData.category === 'enseignement'")
    expect(vif).not.toContain('formData.subjects')
  })

  it('classesTenues et classesBySubject restent DEUX faits distincts', () => {
    // Tenir une classe n'est pas y enseigner une matière. Fusionner les deux
    // ferait dire au produit quelque chose de faux dans un cas ou dans l'autre.
    expect(personnel).toContain('classesTenues')
    expect(personnel).toContain('classesBySubject')
    expect(personnel).toContain('toggleClasseTenue')
  })

  it('l’affectation est enregistrée, pré-remplie à l’édition, et remise à zéro', () => {
    // Un champ saisi mais non enregistré, ou non relu à l'édition, est pire
    // qu'un champ absent : l'utilisateur croit avoir fait le travail.
    expect(personnel).toContain('classesTenues: formData.category')
    expect(personnel).toContain('formData.classesTenues = [...(member.classesTenues || [])]')
    const i = personnel.indexOf('watch(() => formData.category')
    expect(personnel.slice(i, i + 260)).toContain('formData.classesTenues = []')
  })

  it('le détail montre la classe tenue, par son NOM', () => {
    expect(personnel).toContain('nomsClassesTenues')
    const i = personnel.indexOf('const nomsClassesTenues')
    const bloc = personnel.slice(i, i + 420)
    expect(bloc).toContain('.name')
    expect(bloc).toContain('.filter(Boolean)')
  })
})

describe('à l’import, les intitulés de l’école sont enregistrés tels quels', () => {
  const bloc = (() => {
    const i = importView.indexOf('async function enregistrerMatieresEcole')
    expect(i, 'enregistrerMatieresEcole introuvable').toBeGreaterThan(0)
    return importView.slice(i, importView.indexOf('\nfunction validateRow', i))
  })()

  it('les matières du fichier deviennent celles de l’école', () => {
    expect(bloc).toContain('discPrimaire.ajouter(')
    expect(bloc).toContain('subjectsStore.addSubject(')
  })

  it('aucun renommage, aucun alignement sur une liste MAPO', () => {
    // La correction interdite : mapper « sciences » sur « Sciences et
    // technologie ». Ce serait une interprétation, pas une donnée.
    expect(bloc).not.toMatch(/ALIAS|SYNONYM|mapping|correspondance\s*=/i)
  })

  it('les doublons sont écartés sans tenir compte de la casse ni des accents', () => {
    expect(bloc).toContain('cleMatiere')
    const c = importView.indexOf('function cleMatiere')
    expect(importView.slice(c, c + 240)).toContain('NFD')
  })

  it('⚠️ la comparaison n’a lieu QUE s’il existe un programme officiel sourcé', () => {
    // Sinon une école de Dakar verrait sa liste entière déclarée non conforme
    // à un programme camerounais — une affirmation sans source.
    expect(bloc).toContain('programmeOfficiel(pays)')
    expect(bloc).toContain('comparaisonPossible')
  })

  it('l’écart est un CONSTAT, jamais un blocage', () => {
    expect(importView).toContain('constatMatieres')
    // Le constat ne passe pas par `importResult`, qui porte succès/erreur.
    const i = importView.indexOf('constatMatieres.value = await enregistrerMatieresEcole')
    expect(i).toBeGreaterThan(0)
    expect(importView.slice(i, i + 300)).not.toContain("type: 'error'")
  })

  it('« aucun référentiel » se DIT, au lieu de passer pour « conforme »', () => {
    const fr = JSON.parse(lire('i18n/locales/fr.json'))
    const en = JSON.parse(lire('i18n/locales/en.json'))
    for (const d of [fr, en]) {
      expect(d.imp.constatPasDeReferentiel).toBeTruthy()
      expect(d.imp.constatConforme).toBeTruthy()
      expect(d.imp.constatPasDeReferentiel).not.toBe(d.imp.constatConforme)
    }
  })
})

describe('⚠️ le compte rendu d’import ne s’effaçait pas tout seul', () => {
  it('clearImport ne touche plus au compte rendu', () => {
    // Défaut trouvé le 27/08 : `clearImport()` est appelée juste APRÈS avoir
    // renseigné `importResult`, et le remettait à null. L'école lançait un
    // import de 447 écoliers et n'obtenait RIEN à l'écran.
    const i = importView.indexOf('function clearImport()')
    const bloc = importView.slice(i, importView.indexOf('}', i))
    expect(bloc).not.toContain('importResult.value = null')
  })

  it('changer d’onglet efface bien les deux bandeaux', () => {
    const i = importView.indexOf('function switchModule')
    const bloc = importView.slice(i, i + 400)
    expect(bloc).toContain('importResult.value = null')
    expect(bloc).toContain('constatMatieres.value = null')
  })
})
