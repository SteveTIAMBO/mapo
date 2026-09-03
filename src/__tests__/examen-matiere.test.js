/**
 * Un examen porte sur QUELQUE CHOSE.
 *
 * DÉFAUT D'ORIGINE (Steve, 03/09/2026). `addExamManuel` prenait un libellé libre
 * et une date, sans matière ; `genererProgrammePour` passait ensuite TOUTES les
 * matières à `genererProgramme`. Un partiel de « Conformité normative »
 * déclenchait donc des séances d'Audit interne, de PDCA et de Surveillance.
 *
 * Steve : « l'encart examen doit s'appuyer sur la liste de cours, sinon MIAPO ne
 * sait pas à quelle matière correspond l'examen ajouté ». Réviser TOUT, c'est ne
 * rien cibler — et la jauge de progression, elle, en tient compte.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { genererProgramme } from '../utils/examens'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VUE = readFileSync(resolve(RACINE, 'src/views/ParentMiapoView.vue'), 'utf8')

const dans = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const MODULES = ['Conformité normative', 'Audit interne', 'PDCA', 'Surveillance']

describe('⭐⭐ le défaut rejoué sur le générateur', () => {
  it('avec TOUTES les matières, un partiel fait réviser ce qu’il ne couvre pas', () => {
    const prog = genererProgramme({ examId: 'x1', examLabel: 'Partiel', dateISO: dans(90), matieres: MODULES })
    const revues = new Set(prog.filter((p) => p.titre.startsWith('Révision — ')).map((p) => p.matiere))
    expect(revues.size).toBeGreaterThan(1)
    expect([...revues]).toContain('Audit interne')   // hors sujet pour ce partiel
  })

  it('⭐ avec SA matière, le programme ne révise qu’elle', () => {
    const prog = genererProgramme({ examId: 'x1', examLabel: 'Partiel', dateISO: dans(90), matieres: ['Conformité normative'] })
    const revues = new Set(prog.filter((p) => p.titre.startsWith('Révision — ')).map((p) => p.matiere))
    expect([...revues]).toEqual(['Conformité normative'])
    // Les deux dernières séances restent générales : annales puis bilan. Elles
    // portent le nom de l'examen, pas d'une matière — c'est voulu.
    expect(prog.at(-1).titre).toContain('Révisions générales')
  })
})

describe('⭐⭐ la vue passe la bonne cible', () => {
  it('un examen personnel cible SON cours, l’officiel garde tout le programme', () => {
    // Le Bac porte réellement sur l'ensemble du programme : lui imposer une
    // matière unique serait faux.
    expect(VUE).toContain('const cible = ex.official ? matieresList.value : (ex.matiere ? [ex.matiere] : matieresList.value)')
    expect(VUE).toContain('matieres: cible')
  })

  it('⚠️ un examen enregistré AVANT ce changement continue de fonctionner', () => {
    // Pas de matière ne veut pas dire « aucune matière », ça veut dire « on ne
    // sait pas ». On retombe sur l'ancien comportement plutôt que de ne rien
    // générer du tout.
    expect(VUE).toMatch(/ex\.matiere \? \[ex\.matiere\] : matieresList\.value/)
  })
})

describe('⭐ la saisie s’appuie sur la liste de cours', () => {
  it('le champ matière est un SELECT alimenté par matieresList', () => {
    expect(VUE).toContain('<select v-model="newExamMatiere"')
    expect(VUE).toMatch(/v-for="m in matieresList" :key="'xm' \+ m"/)
  })

  it('⚠️ on ne peut pas ajouter un examen sans matière', () => {
    expect(VUE).toContain(':disabled="!newExamLabel.trim() || !newExamDate || !newExamMatiere"')
  })

  it('sans aucun cours, on explique quoi faire au lieu d’un menu vide', () => {
    // Un menu déroulant vide ne dit rien ; il a l'air cassé.
    expect(VUE).toContain('v-if="!matieresList.length"')
    expect(VUE).toContain("t('mia.exNoSubject')")
  })

  it('la matière est visible sur la ligne de l’examen', () => {
    // C'est elle qui décide de ce que le programme fera réviser : la cacher
    // rendrait le résultat incompréhensible.
    expect(VUE).toContain('v-if="ex.matiere" class="ex-mat"')
  })

  it('la matière est bien enregistrée avec l’examen', () => {
    expect(VUE).toContain("matiere: String(matiere || '').trim()")
    expect(VUE).toContain("addExam(newExamLabel.value, newExamDate.value, false, '', newExamMatiere.value)")
  })
})
