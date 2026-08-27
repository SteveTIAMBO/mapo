/**
 * Le pont école → emploi du temps.
 *
 * ⚠️ CE QUE ÇA CORRIGE. `mapo-lien.php` servait déjà cours, devoirs, notes,
 * messages et périodes — mais PAS l'emploi du temps, alors que l'ERP le détient
 * (`schools/{id}/emploi-du-temps/data`), profs et horaires compris. Un élève
 * d'une école MAPO devait donc PHOTOGRAPHIER une feuille que son établissement
 * avait lui-même saisie, et payer un appel IA pour la relire.
 *
 * PHP n'est pas exécutable ici (pas d'interpréteur dans le bac à sable) : même
 * méthode que `quiz-verification.test.js` — on REJOUE la logique de tranchage
 * en JS, et on exige que la source PHP contienne les garanties qu'on annonce.
 * Le rejeu ne prouve pas que le PHP tourne ; il prouve que la RÈGLE est juste
 * et fige ce qu'elle doit faire.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LIB = readFileSync(resolve(RACINE, 'server/mapo-lien-lib.php'), 'utf8')
const PONT = readFileSync(resolve(RACINE, 'server/mapo-lien.php'), 'utf8')
const STORE = readFileSync(resolve(RACINE, 'src/stores/lienEcole.js'), 'utf8')

const RANG = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

/** Rejeu fidèle de `sliceEdt()` (server/mapo-lien-lib.php). */
function sliceEdt(data, className) {
  if (!data || !Array.isArray(data.schedule)) return []
  const cible = String(className || '').trim()
  if (!cible) return []
  const out = []
  for (const e of data.schedule) {
    if (!e || typeof e !== 'object') continue
    if (String(e.className || '').trim() !== cible) continue
    const jour = String(e.day || '').trim().toLowerCase()
    const heure = String(e.slotStart || '').trim()
    const matiere = String(e.subjectId || '').trim()
    if (!jour || !heure || !matiere) continue
    if (!RANG[jour]) continue
    const prof = String(e.teacherName || '').trim()
    out.push({ jour, heure, fin: String(e.slotEnd || '').trim(), matiere, prof: prof === 'Non assigné' ? '' : prof })
  }
  out.sort((a, b) => (RANG[a.jour] - RANG[b.jour]) || a.heure.localeCompare(b.heure))
  return out.slice(0, 60)
}

const creneau = (o) => ({ day: 'lundi', slotStart: '08:00', slotEnd: '09:00', className: '5ème', subjectId: 'Maths', teacherName: 'M. Fotso', ...o })

describe('la tranche d’UNE classe, et d’une seule', () => {
  it('les créneaux de la classe sont convertis au format MAPO+', () => {
    const r = sliceEdt({ schedule: [creneau({})] }, '5ème')
    expect(r).toEqual([{ jour: 'lundi', heure: '08:00', fin: '09:00', matiere: 'Maths', prof: 'M. Fotso' }])
  })

  it('⭐⭐ la classe d’un CAMARADE n’entre jamais dans la semaine', () => {
    const r = sliceEdt({ schedule: [creneau({ className: '4ème', subjectId: 'SVT' })] }, '5ème')
    expect(r).toEqual([])
  })

  it('⚠️ une entrée SANS classe est écartée — contrairement aux cours', () => {
    // Pour `sliceCours`, une classe vide veut dire « toutes classes » : c'est une
    // diffusion VOULUE par l'enseignant. Un créneau d'emploi du temps, lui, est
    // toujours engendré POUR une classe : vide = donnée corrompue. La traiter
    // comme « toutes » ferait apparaître le cours d'une autre classe.
    expect(sliceEdt({ schedule: [creneau({ className: '' })] }, '5ème')).toEqual([])
  })

  it('sans classe demandée, on ne renvoie rien plutôt que tout', () => {
    expect(sliceEdt({ schedule: [creneau({})] }, '')).toEqual([])
  })
})

describe('ce qui ne peut rien déclencher est écarté', () => {
  it('un créneau sans heure ou sans matière ne sert à rien', () => {
    // Le seul usage côté MAPO+ est « demain tu as maths, révise ce soir ».
    expect(sliceEdt({ schedule: [creneau({ slotStart: '' })] }, '5ème')).toEqual([])
    expect(sliceEdt({ schedule: [creneau({ subjectId: '' })] }, '5ème')).toEqual([])
  })

  it('un jour inconnu ne crée pas une 8e colonne', () => {
    expect(sliceEdt({ schedule: [creneau({ day: 'lundredi' })] }, '5ème')).toEqual([])
  })

  it('⚠️ « Non assigné » n’est pas un nom de professeur', () => {
    // C'est un remplissage de l'ERP quand aucun prof n'est affecté. Le
    // transmettre ferait lire à l'élève le nom d'un professeur qui n'existe pas.
    expect(sliceEdt({ schedule: [creneau({ teacherName: 'Non assigné' })] }, '5ème')[0].prof).toBe('')
  })

  it('des données absentes ou malformées ne cassent rien', () => {
    for (const d of [null, undefined, {}, { schedule: 'pas un tableau' }, { schedule: [null, 3] }]) {
      expect(sliceEdt(d, '5ème')).toEqual([])
    }
  })
})

describe('la semaine sort dans l’ordre où on la lit', () => {
  it('par jour, puis par heure', () => {
    const r = sliceEdt({ schedule: [
      creneau({ day: 'mercredi', slotStart: '08:00', subjectId: 'C' }),
      creneau({ day: 'lundi', slotStart: '10:00', subjectId: 'B' }),
      creneau({ day: 'lundi', slotStart: '08:00', subjectId: 'A' }),
    ] }, '5ème')
    expect(r.map((x) => x.matiere)).toEqual(['A', 'B', 'C'])
  })

  it('une semaine entière tient sous le plafond', () => {
    const gros = Array.from({ length: 80 }, (_, i) => creneau({ slotStart: String(i).padStart(2, '0') + ':00' }))
    expect(sliceEdt({ schedule: gros }, '5ème')).toHaveLength(60)
  })
})

describe('les gardes du pont sont bien celles des autres actions', () => {
  it('l’action existe', () => {
    expect(PONT).toContain("if ($action === 'edt') {")
    expect(PONT).toContain("$out = sliceEdt($data, $className);")
  })

  it('⚠️ le lien est vérifié AVANT de lire quoi que ce soit', () => {
    const i = PONT.indexOf("if ($action === 'edt') {")
    const bloc = PONT.slice(i, i + 2200)
    expect(bloc).toContain("liens_mapoplus/")
    expect(bloc).toContain("'error' => 'non_relie'")
    expect(bloc.indexOf('non_relie')).toBeLessThan(bloc.indexOf('emploi-du-temps/data'))
  })

  it('⚠️ la classe est relue sur la FICHE ÉLÈVE, pas seulement sur le lien', () => {
    // Un redoublement ou un changement de classe rendrait périmée celle du lien,
    // et on servirait l'emploi du temps de l'an dernier.
    const i = PONT.indexOf("if ($action === 'edt') {")
    const bloc = PONT.slice(i, i + 2200)
    expect(bloc).toContain('/eleves/')
  })

  it('⭐ une école sans emploi du temps répond ok, pas une erreur', () => {
    // Un 404 ferait croire à une panne du pont et renverrait l'élève rouvrir son
    // appareil photo pour rien.
    const i = PONT.indexOf("if ($action === 'edt') {")
    const bloc = PONT.slice(i, i + 2200)
    expect(bloc).toContain("'creneaux' => []")
  })

  it('le client sait l’appeler, et la démo répond sans réseau', () => {
    expect(STORE).toContain("call({ action: 'edt', schoolId, eleveId })")
    expect(STORE).toContain('demoEdt()')
  })
})

describe('la source PHP porte les garanties annoncées', () => {
  it('sliceEdt existe et refuse une classe vide', () => {
    expect(LIB).toContain('function sliceEdt($data, $className)')
    expect(LIB).toContain("if (\$cible === '') return \$out;")
  })

  it('le tri par jour est explicite, pas alphabétique', () => {
    // « jeudi » < « lundi » en ordre alphabétique : trier les jours comme du
    // texte donnerait une semaine qui commence le jeudi.
    expect(LIB).toContain('function edtJourRang($j)')
    expect(LIB).toMatch(/'lundi'\s*=>\s*1/)
  })
})
