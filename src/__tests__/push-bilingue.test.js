/**
 * Test — notifications bilingues (français + seconde langue).
 *
 * Une notification se lit SEULE, hors de l'application, souvent des heures
 * après. Contrairement à l'interface, il n'y a pas de français affiché
 * au-dessus pour rattraper une traduction douteuse. On concatène donc les
 * deux dans le même message, le français d'abord.
 *
 * Le serveur ne traduit rien : il recopie un texte préparé par le navigateur.
 * Ces tests vérifient les deux moitiés du contrat.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LIB = readFileSync(resolve(RACINE, 'server/mapo-push-lib.php'), 'utf8')
const CRON = readFileSync(resolve(RACINE, 'server/mapo-push-cron.php'), 'utf8')
const PUSH = readFileSync(resolve(RACINE, 'server/mapo-push.php'), 'utf8')
const STORE = readFileSync(resolve(RACINE, 'src/stores/push.js'), 'utf8')

/** Rejoue mp_texteBilingue() en JS, pour tester la règle sans exécuter PHP. */
function texteBilingue(textes, cle, fr) {
  const trad = textes && textes[cle] ? String(textes[cle]).trim() : ''
  if (trad === '' || trad === fr) return fr
  return fr + ' · ' + trad
}

const FR = "C'est l'heure de réviser !"

describe('Le français n’est jamais remplacé', () => {
  it('sans traduction, on envoie le français seul', () => {
    expect(texteBilingue(null, 'rappel', FR)).toBe(FR)
    expect(texteBilingue({}, 'rappel', FR)).toBe(FR)
    expect(texteBilingue({ rappel: '   ' }, 'rappel', FR)).toBe(FR)
  })

  it('avec traduction, le français vient EN PREMIER', () => {
    const out = texteBilingue({ rappel: 'Jàmm nga fanaan' }, 'rappel', FR)
    expect(out.startsWith(FR)).toBe(true)
    expect(out).toContain('Jàmm nga fanaan')
  })

  it('une traduction identique au français ne double pas le message', () => {
    expect(texteBilingue({ rappel: FR }, 'rappel', FR)).toBe(FR)
  })

  it('la règle est bien celle du serveur', () => {
    expect(LIB).toMatch(/function mp_texteBilingue/)
    expect(LIB).toMatch(/return \$fr \. ' · ' \. \$trad/)
  })
})

describe('Le serveur ne traduit pas, il recopie', () => {
  it('le cron compose le texte par abonnement, pas une fois pour toutes', () => {
    // Chaque parent peut avoir sa langue : un payload unique les servirait tous
    // dans la même, ce qui est exactement le défaut qu'on corrige.
    const idx = CRON.indexOf('foreach ($subs as $sub)')
    expect(idx).toBeGreaterThan(-1)
    expect(CRON.slice(idx)).toContain('mp_texteBilingue')
  })

  it('les gabarits envoyés par le client sont bornés', () => {
    expect(PUSH).toMatch(/mb_substr\(trim\(\(string\) \$v\), 0, 300\)/)
    expect(PUSH).toMatch(/preg_replace\('\/\[\^a-z_\]\/'/)
  })

  it('un enregistrement sans traductions n’efface pas les précédentes', () => {
    expect(LIB).toMatch(/is_array\(\$textes\) \? \$textes : \(\$map\[\$cle\]\['textes'\] \?\? null\)/)
  })
})

describe('Le client prépare les textes', () => {
  it('les gabarits vivent côté navigateur, là où on sait traduire', () => {
    expect(STORE).toMatch(/GABARITS_PUSH/)
    expect(STORE).toMatch(/traduireMaintenant/)
  })

  it('ils ne sont envoyés qu’à l’enregistrement', () => {
    expect(STORE).toMatch(/if \(action === 'register'\)/)
  })

  it('changer de langue renvoie les gabarits', () => {
    // Sans ça, le parent recevrait l'ancienne traduction sans faire le lien.
    expect(STORE).toMatch(/function resynchroniserTextes/)
  })
})
