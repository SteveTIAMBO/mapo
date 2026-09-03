/**
 * Le PDF d'un cours est CONSERVÉ et consultable, en plus du texte extrait.
 *
 * DÉFAUT D'ORIGINE. L'import lisait le PDF, en tirait le texte, et jetait le
 * fichier. L'apprenant croyait avoir « importé son cours » ; il n'en restait
 * qu'un texte à plat — sans schémas, sans tableaux, sans mise en page. Pour un
 * cours de sciences ou de gestion, c'est une bonne part du cours qui partait.
 *
 * Les deux servent à des choses différentes, et doivent coexister :
 *   • le TEXTE ancre les révisions (c'est lui que le quiz lit) ;
 *   • le FICHIER se consulte, tel que le prof l'a écrit.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addCoursPerso, listCoursPerso, updateCoursPerso, FILE_DATA_MAX,
} from '../utils/coursPerso'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')

beforeEach(() => localStorage.clear())

describe('⭐⭐ le fichier survit à l’enregistrement', () => {
  it('les champs du fichier sont persistés à côté du texte', () => {
    addCoursPerso('e1', {
      matiere: 'Audit interne', titre: 'Chapitre 2', contenu: 'texte extrait',
      fileId: 'abc123', fileName: 'ch2.pdf', fileExt: 'pdf', fileViewable: true,
    })
    const [d] = listCoursPerso('e1')
    expect(d.contenu).toBe('texte extrait')      // le quiz continue de lire ça
    expect(d.fileId).toBe('abc123')
    expect(d.fileName).toBe('ch2.pdf')
    expect(d.fileViewable).toBe(true)
  })

  it('⚠️ renommer un cours ne DÉTACHE pas son PDF', () => {
    // C'est ce que fait le renommage d'un cours : il repasse sur chaque
    // document avec `{ matiere }` seul. Sans garde-fou, le fichier partait.
    const d = addCoursPerso('e1', { matiere: 'A', contenu: 'x', fileId: 'f1', fileName: 'a.pdf', fileExt: 'pdf', fileViewable: true })
    updateCoursPerso('e1', d.id, { matiere: 'A (2026)' })
    const [apres] = listCoursPerso('e1')
    expect(apres.matiere).toBe('A (2026)')
    expect(apres.fileId).toBe('f1')
    expect(apres.fileName).toBe('a.pdf')
  })

  it('remplacer le fichier est possible, et explicite', () => {
    const d = addCoursPerso('e1', { matiere: 'A', contenu: 'x', fileId: 'f1', fileName: 'a.pdf' })
    updateCoursPerso('e1', d.id, { fileId: 'f2', fileName: 'b.pdf', fileExt: 'pdf', fileViewable: true })
    expect(listCoursPerso('e1')[0].fileName).toBe('b.pdf')
  })
})

describe('⭐⭐ le quota localStorage est une contrainte, pas un détail', () => {
  it('⚠️ une data URL trop lourde n’est PAS stockée', () => {
    // En démo il n'y a pas de serveur : le fichier vivrait en data URL dans
    // localStorage. Un seul PDF de 3 Mo saturerait le quota (~5 Mo) et ferait
    // échouer EN SILENCE toutes les écritures suivantes — c'est déjà arrivé
    // avec les clés `fin_*`. On préfère perdre le fichier que tout le reste.
    const enorme = 'data:application/pdf;base64,' + 'A'.repeat(FILE_DATA_MAX + 10)
    addCoursPerso('e1', { matiere: 'A', contenu: 'texte', fileData: enorme, fileName: 'gros.pdf' })
    const [d] = listCoursPerso('e1')
    expect(d.fileData).toBe('')
    // …mais le texte, lui, est bien là : on ne perd pas les deux.
    expect(d.contenu).toBe('texte')
    // …et le nom reste, pour qu'on sache de quoi on parle.
    expect(d.fileName).toBe('gros.pdf')
  })

  it('une data URL raisonnable passe', () => {
    const ok = 'data:application/pdf;base64,' + 'A'.repeat(1000)
    addCoursPerso('e1', { matiere: 'A', contenu: 'texte', fileData: ok })
    expect(listCoursPerso('e1')[0].fileData).toBe(ok)
  })
})

describe('⭐ branchement : on réutilise le dépôt existant, on n’en écrit pas un second', () => {
  const COURS = lire('src/components/MiapoMesCours.vue')

  it('l’import passe par `uploadCoursFile` et la consultation par le visionneur', () => {
    // `mapo-files.php`, `coursFiles.js` et `CoursFileViewer.vue` existaient déjà
    // — ils ne servaient qu'à l'ERP. En écrire une seconde version aurait
    // garanti que les deux divergent.
    expect(COURS).toContain("from '../services/coursFiles'")
    expect(COURS).toContain('await uploadCoursFile(file)')
    expect(COURS).toContain('<CoursFileViewer')
  })

  it('⚠️ un dépôt en échec ne fait pas échouer l’import', () => {
    // Perdre le texte ET le fichier parce que le réseau a coupé serait la pire
    // des deux options. On garde le texte, et on DIT que le fichier manque.
    expect(COURS).toContain("{ ...FICHIER_VIDE, fileName: file.name }")
    expect(COURS).toContain("t('mia.mcFileNotKeptWhy')")
  })

  it('seul un PDF est déposé — pas un .txt ni une photo', () => {
    // Le serveur ne rend consultables que pdf/ppt/pptx ; une photo suit déjà
    // son propre chemin (transcription IA).
    expect(COURS).toContain("if (ext !== 'pdf') { fichier.value = FICHIER_VIDE; return }")
  })

  it('modifier un document REPREND son fichier', () => {
    expect(COURS).toMatch(/fichier\.value = \{ fileName: d\.fileName \|\| ''/)
  })
})

describe('⭐ plusieurs documents pour un même cours', () => {
  it('deux PDF datés cohabitent sous le même cours', () => {
    // « Il peut y avoir plusieurs PDF pour le même cours dans l'année » — un
    // cours n'est pas un document, c'est une ligne du programme.
    addCoursPerso('e1', { matiere: 'Audit interne', titre: 'Séance 1', contenu: 'a', fileId: 'f1', fileName: 's1.pdf' })
    addCoursPerso('e1', { matiere: 'Audit interne', titre: 'Séance 2', contenu: 'b', fileId: 'f2', fileName: 's2.pdf' })
    const docs = listCoursPerso('e1').filter((d) => d.matiere === 'Audit interne')
    expect(docs).toHaveLength(2)
    expect(docs.map((d) => d.fileName).sort()).toEqual(['s1.pdf', 's2.pdf'])
  })
})
