/**
 * Test — le barème du SERVEUR est le miroir exact de celui du client.
 *
 * Depuis que les points s'échangent contre des tokens, c'est le serveur
 * (server/mapo-points.php) qui compte. Le client garde le même calcul pour
 * afficher le gain à la seconde où l'élève termine, sans attendre le réseau.
 *
 * Deux barèmes = deux vérités. S'ils divergent, l'élève voit « +25 » puis se
 * retrouve avec 20 points de plus, sans que rien ne l'explique — et il pensera
 * que l'application l'a volé. Ce test compare les constantes des deux fichiers
 * et échoue à la première divergence.
 *
 * On ne peut pas exécuter PHP ici : on lit donc les constantes dans la source.
 * C'est suffisant, parce que la logique (plafonds, seuils) est entièrement
 * portée par ces constantes.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  POINTS_REVISION, POINTS_PAR_JOUR_SERIE, MAX_JOURS_SERIE_COMPTES,
  POINTS_PAR_COMBO, MAX_POINTS_COMBO, POINTS_PALIER,
} from '../utils/pointsEffort'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PHP = readFileSync(resolve(RACINE, 'server/mapo-points.php'), 'utf8')

/** Valeur d'une constante PHP `const NOM = 12;`. */
function constPhp(nom) {
  const m = PHP.match(new RegExp(`const\\s+${nom}\\s*=\\s*(-?\\d+)\\s*;`))
  return m ? Number(m[1]) : null
}

describe('Barème — le serveur et le client disent la même chose', () => {
  const paires = [
    ['MP_POINTS_REVISION', POINTS_REVISION],
    ['MP_POINTS_PAR_JOUR', POINTS_PAR_JOUR_SERIE],
    ['MP_MAX_JOURS_SERIE', MAX_JOURS_SERIE_COMPTES],
    ['MP_POINTS_PAR_COMBO', POINTS_PAR_COMBO],
    ['MP_MAX_POINTS_COMBO', MAX_POINTS_COMBO],
    ['MP_POINTS_PALIER', POINTS_PALIER],
  ]
  it.each(paires)('%s vaut la même chose des deux côtés', (nomPhp, valeurJs) => {
    expect(constPhp(nomPhp)).toBe(valeurJs)
  })
})

describe('Économie — les garde-fous existent et tiennent', () => {
  it('la conversion et son plafond mensuel sont définis', () => {
    expect(constPhp('MP_COUT_CONVERSION')).toBeGreaterThan(0)
    expect(constPhp('MP_TOKENS_PAR_CONVERSION')).toBeGreaterThan(0)
    expect(constPhp('MP_MAX_CONVERSIONS_MOIS')).toBeGreaterThan(0)
  })

  it('le plafond mensuel reste très en dessous de l’offre payante', () => {
    // Arbitrage Steve (16/08) : récompenser sans concurrencer l'abonnement.
    // Essentiel = 125 000 tokens/mois. Si un jour quelqu'un remonte la
    // générosité, ce test doit l'obliger à en discuter.
    const parMois = constPhp('MP_TOKENS_PAR_CONVERSION') * constPhp('MP_MAX_CONVERSIONS_MOIS')
    expect(parMois).toBeLessThanOrEqual(25000)
  })

  it('les séances comptées par jour sont plafonnées (anti-script)', () => {
    const max = constPhp('MP_MAX_SEANCES_JOUR')
    expect(max).toBeGreaterThan(0)
    expect(max).toBeLessThanOrEqual(10)
  })
})

describe('Sécurité — ce que le serveur refuse de croire', () => {
  it('il recalcule l’uid de l’enfant au lieu de faire confiance à la déclaration', () => {
    expect(PHP).toMatch(/hash_equals\(\s*'enf_'\s*\.\s*substr\(hash\('sha256'/)
  })

  it('il exige un jeton Firebase vérifié', () => {
    expect(PHP).toMatch(/\$uid\s*=\s*verifyFirebaseToken\(\)/)
    expect(PHP).toMatch(/if\s*\(!\$uid\)/)
  })

  it('il borne la meilleure série envoyée par le client', () => {
    expect(PHP).toMatch(/min\(50,\s*\(int\)\s*\(\$d\['meilleureSerie'\]/)
  })

  it('il calcule la série de jours sur SES dates, pas sur celles du client', () => {
    expect(PHP).toMatch(/function mp_serie/)
    expect(PHP).toMatch(/gmdate\('Y-m-d',\s*strtotime\(\$auj\s*\.\s*' -1 day'\)\)/)
    // La requête ne doit transporter aucune date ni aucun total de points.
    expect(PHP).not.toMatch(/\$d\['serieJours'\]|\$d\['points'\]|\$d\['total'\]/)
  })
})

describe('Déploiement — le nouveau .php ne peut pas être oublié', () => {
  it('mapo-points.php est inscrit dans la liste de déploiement', () => {
    const liste = readFileSync(resolve(RACINE, 'server/DEPLOY-LISTE.txt'), 'utf8')
    expect(liste).toMatch(/^mapo-points\.php$/m)
  })

  it('la liste ne nomme aucune configuration ni clé de service', () => {
    const liste = readFileSync(resolve(RACINE, 'server/DEPLOY-LISTE.txt'), 'utf8')
      .split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
    expect(liste.filter((f) => /-config\.php$|sa-key\.json$/.test(f.trim()))).toEqual([])
  })

  it('le workflow CI lit bien cette liste', () => {
    const yml = readFileSync(resolve(RACINE, '.github/workflows/deploy.yml'), 'utf8')
    expect(yml).toMatch(/DEPLOY-LISTE\.txt/)
  })
})

describe('Les registres serveur ne sont pas lisibles depuis le web', () => {
  /**
   * Régression vécue : la règle avait été posée directement SUR LE SERVEUR, pas
   * dans le dépôt. Le déploiement suivant a réécrit le .htaccess et rouvert la
   * faille — soldes de crédits et codes cadeaux en clair — sans que rien ne le
   * signale. Ce test exige que la règle vive dans le dépôt, seul endroit qui
   * survit à un déploiement.
   */
  const HT = readFileSync(resolve(RACINE, 'public/.htaccess'), 'utf8')

  it('tous les mapo-*.json sont refusés', () => {
    expect(HT).toMatch(/<FilesMatch\s+"\^mapo-\.\*\\\.json\$">/)
    const bloc = HT.split(/<FilesMatch\s+"\^mapo-\.\*\\\.json\$">/)[1] || ''
    expect(bloc.split('</FilesMatch>')[0]).toMatch(/Require all denied/)
  })

  it('les fichiers de configuration restent refusés eux aussi', () => {
    expect(HT).toMatch(/<FilesMatch\s+"-config\\\.php\$">/)
  })
})
