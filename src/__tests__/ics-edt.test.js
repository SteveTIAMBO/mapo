/**
 * Import d'un `.ics` dans une grille hebdomadaire — ce qu'on garde, ce qu'on perd.
 *
 * Les deux modèles ne se correspondent pas : un calendrier contient des
 * événements DATÉS, MAPO+ stocke `{ jour, heure, matiere }`. Aplatir est donc
 * une PERTE assumée — ces tests figent les règles de l'aplatissement, et
 * surtout le fait qu'on annonce ce qui a été écarté.
 */
import { describe, it, expect } from 'vitest'
import { parserIcs, deplierLignes, desechapper, lireDtstart, cleSemaine } from '../utils/icsEdt'

const ics = (...vevents) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...vevents, 'END:VCALENDAR'].join('\r\n')
const evt = (o) => [
  'BEGIN:VEVENT',
  `DTSTART${o.tzid ? ';TZID=' + o.tzid : ''}:${o.dtstart}`,
  ...(o.summary !== undefined ? [`SUMMARY:${o.summary}`] : []),
  ...(o.rrule ? [`RRULE:${o.rrule}`] : []),
  'END:VEVENT',
].join('\r\n')

describe('lire le fichier, avant même de l’interpréter', () => {
  it('⚠️ recolle les lignes repliées à 75 octets', () => {
    // Sans ça, « Système de management de la sécurité » devient « Système de
    // management de la sécu » — un défaut qui ne se voit que sur les intitulés
    // longs, donc jamais sur un fichier de test bricolé à la main.
    const lignes = deplierLignes('SUMMARY:Systeme de manage\r\n ment de la securite')
    expect(lignes).toEqual(['SUMMARY:Systeme de management de la securite'])
  })

  it('déséchappe virgules, points-virgules et retours à la ligne', () => {
    expect(desechapper('Maths\\, groupe A')).toBe('Maths, groupe A')
    expect(desechapper('Cours\\nSalle B12')).toBe('Cours Salle B12')
  })
})

describe('⚠️ heure murale et heure UTC ne se lisent pas pareil', () => {
  it('une heure locale est prise telle quelle', () => {
    expect(lireDtstart('20260907T083000')).toMatchObject({ jour: 'lundi', heure: '08:30' })
  })

  it('une heure UTC est CONVERTIE, sinon le cours se décale', () => {
    // Le test tourne dans le fuseau de la machine : on n'affirme donc pas une
    // heure précise, mais qu'elle correspond bien à la conversion locale de
    // l'instant UTC — c'est exactement la règle qu'on veut protéger.
    const d = new Date(Date.UTC(2026, 8, 7, 6, 30))
    const attendu = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    expect(lireDtstart('20260907T063000Z').heure).toBe(attendu)
  })

  it('une journée entière n’a pas d’heure, et se signale comme telle', () => {
    expect(lireDtstart('20260907')).toEqual({ journeeEntiere: true })
  })

  it('la semaine est calculée à partir du LUNDI', () => {
    // Un dimanche appartient à la semaine du lundi qui le précède : compter les
    // semaines à partir du dimanche (défaut de getDay) couperait chaque semaine
    // en deux et fausserait le choix de la semaine de référence.
    expect(cleSemaine(new Date(2026, 8, 13))).toBe('2026-09-07') // dimanche 13/09
    expect(cleSemaine(new Date(2026, 8, 7))).toBe('2026-09-07')  // lundi 07/09
  })
})

describe('ce qu’on garde d’un calendrier', () => {
  it('un cours devient un créneau', () => {
    const r = parserIcs(ics(evt({ dtstart: '20260907T083000', summary: 'Mathématiques' })))
    expect(r.creneaux).toEqual([{ jour: 'lundi', heure: '08:30', matiere: 'Mathématiques' }])
  })

  it('les créneaux sortent triés par jour puis par heure', () => {
    const r = parserIcs(ics(
      evt({ dtstart: '20260909T140000', summary: 'SVT' }),      // mercredi
      evt({ dtstart: '20260907T100000', summary: 'Anglais' }),  // lundi 10h
      evt({ dtstart: '20260907T080000', summary: 'Maths' }),    // lundi 8h
    ))
    expect(r.creneaux.map((c) => c.matiere)).toEqual(['Maths', 'Anglais', 'SVT'])
  })

  it('un même cours répété n’apparaît qu’une fois', () => {
    const r = parserIcs(ics(
      evt({ dtstart: '20260907T083000', summary: 'Maths' }),
      evt({ dtstart: '20260907T083000', summary: 'maths' }),
    ))
    expect(r.creneaux).toHaveLength(1)
  })
})

describe('⚠️ un export d’année scolaire ne doit pas finir en bouillie', () => {
  it('on retient la semaine la PLUS remplie, pas toutes', () => {
    const r = parserIcs(ics(
      // semaine du 07/09 : 2 cours
      evt({ dtstart: '20260907T080000', summary: 'Maths' }),
      evt({ dtstart: '20260908T080000', summary: 'Anglais' }),
      // semaine du 14/09 : 1 seul (un rattrapage isolé)
      evt({ dtstart: '20260914T080000', summary: 'Rattrapage' }),
    ))
    expect(r.creneaux.map((c) => c.matiere)).toEqual(['Maths', 'Anglais'])
    expect(r.semaines).toBe(2)
  })

  it('⭐ mais un cours HEBDOMADAIRE est gardé, quelle que soit sa semaine', () => {
    // C'est le cas le plus courant d'un vrai emploi du temps : il est exporté
    // sous forme de récurrences. Sans cette règle, tout un EDT récurrent posé
    // sur une autre semaine que la référence disparaîtrait.
    const r = parserIcs(ics(
      evt({ dtstart: '20260907T080000', summary: 'Maths' }),
      evt({ dtstart: '20260908T080000', summary: 'Anglais' }),
      evt({ dtstart: '20261005T140000', summary: 'Gouvernance', rrule: 'FREQ=WEEKLY;BYDAY=MO' }),
    ))
    expect(r.creneaux.map((c) => c.matiere)).toContain('Gouvernance')
  })

  it('à égalité, la semaine la plus ancienne — deux imports donnent le même résultat', () => {
    const f = ics(
      evt({ dtstart: '20260907T080000', summary: 'A' }),
      evt({ dtstart: '20260914T080000', summary: 'B' }),
    )
    expect(parserIcs(f).creneaux).toEqual(parserIcs(f).creneaux)
    expect(parserIcs(f).creneaux[0].matiere).toBe('A')
  })
})

describe('ce qu’on écarte, et qu’on ANNONCE', () => {
  it('une journée entière n’est pas un créneau, et elle est comptée', () => {
    const r = parserIcs(ics(
      evt({ dtstart: '20260907T080000', summary: 'Maths' }),
      evt({ dtstart: '20261221', summary: 'Vacances de Noël' }),
    ))
    expect(r.creneaux).toHaveLength(1)
    expect(r.ignoresSansHeure).toBe(1)
  })

  it('un événement sans intitulé est écarté, et compté', () => {
    const r = parserIcs(ics(evt({ dtstart: '20260907T080000' })))
    expect(r.creneaux).toHaveLength(0)
    expect(r.ignoresSansTitre).toBe(1)
  })

  it('le nombre d’événements LUS est rapporté, même ceux qu’on jette', () => {
    // Sans ce compte, un import qui ne retient que 3 créneaux sur 200 événements
    // ressemblerait à un fichier presque vide.
    const r = parserIcs(ics(
      evt({ dtstart: '20260907T080000', summary: 'Maths' }),
      evt({ dtstart: '20261221', summary: 'Vacances' }),
      evt({ dtstart: '20260908T080000' }),
    ))
    expect(r.lus).toBe(3)
  })

  it('un fichier vide ou invalide ne casse rien', () => {
    for (const x of ['', null, undefined, 'ceci n’est pas un calendrier']) {
      expect(parserIcs(x).creneaux).toEqual([])
    }
  })
})
