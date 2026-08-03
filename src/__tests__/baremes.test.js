import { describe, it, expect } from 'vitest'
import {
  BAREMES, PALIERS_APC, PALIERS_MAITRISE_FR,
  baremePour, cycleDe, versAcquisition, depuisAcquisition, maxDe, paliersDe,
} from '../data/baremes'
import { noteToPalier } from '../data/primaire'

describe('barèmes — conversions', () => {
  it('note /20 : conversion linéaire', () => {
    expect(versAcquisition(20, 'note20')).toBe(1)
    expect(versAcquisition(10, 'note20')).toBe(0.5)
    expect(versAcquisition(0, 'note20')).toBe(0)
  })

  it('note /10 : 8/10 vaut BIEN mieux que 8/20', () => {
    // Le piège que ce module existe pour éviter : un 8 sénégalais ou ivoirien
    // au primaire est une réussite, un 8 sur 20 est un échec.
    expect(versAcquisition(8, 'note10')).toBe(0.8)
    expect(versAcquisition(8, 'note20')).toBe(0.4)
  })

  it('refuse une valeur qui n’a pas de sens, sans la confondre avec zéro', () => {
    expect(versAcquisition('', 'note20')).toBeNull()
    expect(versAcquisition('bonjour', 'note20')).toBeNull()
    expect(versAcquisition('ZZZ', 'paliers3')).toBeNull()
    expect(versAcquisition(0, 'note20')).toBe(0) // zéro reste un zéro
  })

  it('borne les valeurs hors échelle', () => {
    expect(versAcquisition(25, 'note20')).toBe(1)
    expect(versAcquisition(-3, 'note20')).toBe(0)
  })

  it('aller-retour stable sur tous les paliers', () => {
    for (const p of PALIERS_APC) {
      expect(depuisAcquisition(versAcquisition(p.code, 'paliers3'), 'paliers3')).toBe(p.code)
    }
    for (const p of PALIERS_MAITRISE_FR) {
      expect(depuisAcquisition(versAcquisition(p.code, 'paliers4'), 'paliers4')).toBe(p.code)
    }
  })

  it('aller-retour stable sur les notes', () => {
    for (const n of [0, 5, 8, 10, 12.5, 17, 20]) {
      expect(depuisAcquisition(versAcquisition(n, 'note20'), 'note20')).toBe(n)
    }
    for (const n of [0, 3, 5, 7.5, 10]) {
      expect(depuisAcquisition(versAcquisition(n, 'note10'), 'note10')).toBe(n)
    }
  })
})

describe('barèmes — compatibilité avec l’APC déjà en production', () => {
  // Le bulletin du primaire camerounais est en prod. Si ces seuils bougent, des
  // bulletins existants changent de palier : c'est le test qui l'interdit.
  it('reproduit exactement noteToPalier de data/primaire.js', () => {
    for (let n = 0; n <= 20; n += 0.5) {
      const attendu = noteToPalier(n)
      const obtenu = depuisAcquisition(versAcquisition(n, 'note20'), 'paliers3')
      expect(obtenu, `note ${n}`).toBe(attendu)
    }
  })

  it('garde les seuils historiques 12 (Acquis) et 7 (En cours)', () => {
    expect(depuisAcquisition(versAcquisition(12, 'note20'), 'paliers3')).toBe('A')
    expect(depuisAcquisition(versAcquisition(11.5, 'note20'), 'paliers3')).toBe('ECA')
    expect(depuisAcquisition(versAcquisition(7, 'note20'), 'paliers3')).toBe('ECA')
    expect(depuisAcquisition(versAcquisition(6.5, 'note20'), 'paliers3')).toBe('NA')
  })
})

describe('barèmes — régimes par pays', () => {
  it('Sénégal et Côte d’Ivoire : primaire sur 10, secondaire sur 20', () => {
    expect(baremePour({ pays: 'SN', niveau: 'CM1' }).bareme).toBe('note10')
    expect(baremePour({ pays: 'CI', niveau: 'CE2' }).bareme).toBe('note10')
    expect(baremePour({ pays: 'SN', niveau: '5ème' }).bareme).toBe('note20')
    expect(baremePour({ pays: 'CI', niveau: 'Terminale' }).bareme).toBe('note20')
  })

  it('Cameroun : /20 partout, paliers APC en complément au primaire', () => {
    expect(baremePour({ pays: 'CM', niveau: 'CM2' })).toMatchObject({ bareme: 'note20', complement: 'paliers3' })
    expect(baremePour({ pays: 'CM', niveau: '5ème' }).complement).toBeNull()
  })

  it('France : /20 principal, 4 niveaux de maîtrise en complément au collège', () => {
    // Depuis la session 2026 le brevet repose sur les moyennes annuelles : la
    // note porte l'enjeu, les compétences disent quoi travailler.
    expect(baremePour({ pays: 'FR', niveau: '4e' })).toMatchObject({ bareme: 'note20', complement: 'paliers4' })
    expect(baremePour({ pays: 'FR', niveau: 'Terminale' }).complement).toBeNull()
  })

  it('Gabon : /20 mais signalé à vérifier (pas de source officielle trouvée)', () => {
    expect(baremePour({ pays: 'GA', niveau: '3ème' })).toMatchObject({ bareme: 'note20', aVerifier: true })
  })

  it('RD Congo : pourcentage, signalé à vérifier', () => {
    // La structure scolaire est sourcée, le barème ne l'est pas : on applique
    // l'usage (pourcentage) mais l'interface le dit au lieu de le taire.
    expect(baremePour({ pays: 'CD', niveau: '3e humanités' })).toMatchObject({ bareme: 'pourcent', aVerifier: true })
    expect(maxDe('pourcent')).toBe(100)
  })

  it('RD Congo : 65 % est une réussite, pas un échec', () => {
    // Le même piège que le /10 sénégalais, en pire : 65 lu sur 20 serait borné
    // à 20 et interprété comme la note maximale.
    expect(versAcquisition(65, 'pourcent')).toBe(0.65)
    expect(depuisAcquisition(0.65, 'pourcent')).toBe(65)
  })

  it('pays inconnu : /20 et signalé à vérifier, jamais d’erreur', () => {
    expect(baremePour({ pays: 'autre', niveau: '5ème' })).toMatchObject({ bareme: 'note20', aVerifier: true })
    expect(baremePour({}).bareme).toBe('note20')
  })

  it('la surcharge l’emporte toujours sur la table', () => {
    expect(baremePour({ pays: 'SN', niveau: 'CM1', surcharge: 'note20' }).bareme).toBe('note20')
    expect(baremePour({ pays: 'FR', niveau: '4e', surcharge: 'paliers4' }).bareme).toBe('paliers4')
    // Une surcharge inconnue est ignorée plutôt que de casser l'affichage.
    expect(baremePour({ pays: 'SN', niveau: 'CM1', surcharge: 'nimporte' }).bareme).toBe('note10')
  })

  it('un niveau inconnu retombe sur le défaut du pays, sans planter', () => {
    expect(cycleDe('', 'CM')).toBe('defaut')
    expect(cycleDe('Formation (hors catalogue)', 'CM')).toBe('defaut')
    expect(baremePour({ pays: 'SN', niveau: 'Master 2' }).bareme).toBe('note20')
  })

  it('le primaire est reconnu quelle que soit la casse', () => {
    expect(cycleDe('cm1', 'SN')).toBe('primaire')
    expect(cycleDe('CM1', 'SN')).toBe('primaire')
  })
})

describe('barèmes — accès aux métadonnées', () => {
  it('expose le maximum des barèmes numériques et null pour les paliers', () => {
    expect(maxDe('note20')).toBe(20)
    expect(maxDe('note10')).toBe(10)
    expect(maxDe('paliers3')).toBeNull()
  })

  it('expose les paliers, du plus au moins maîtrisé', () => {
    expect(paliersDe('paliers4').map((p) => p.code)).toEqual(['TBM', 'MS', 'MF', 'MI'])
    expect(paliersDe('note20')).toBeNull()
  })

  it('tous les barèmes déclarés sont cohérents', () => {
    for (const [cle, b] of Object.entries(BAREMES)) {
      if (b.type === 'numerique') expect(b.max, cle).toBeGreaterThan(0)
      else expect(b.paliers.length, cle).toBeGreaterThan(1)
    }
  })
})
