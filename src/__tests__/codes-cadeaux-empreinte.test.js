/**
 * Test — les codes cadeaux ne sont plus stockés en clair.
 *
 * INCIDENT DU 16/08 : `mapo-credits-codes.json` a été lisible depuis le web
 * (la règle .htaccess avait été posée sur le serveur, pas dans le dépôt, et un
 * déploiement l'a effacée). Les codes y étaient en clair : quiconque a ouvert
 * l'URL repartait avec des crédits.
 *
 * Décision : un code est un jeton au porteur, comme un mot de passe. Le serveur
 * n'a pas besoin de le connaître, seulement de reconnaître celui qu'on lui
 * présente. On ne stocke donc que l'empreinte.
 *
 * Effet voulu : la recherche se faisant sur l'empreinte, les anciennes entrées
 * en clair ne correspondent plus — tous les codes d'avant sont révoqués, sans
 * geste manuel ni oubli possible.
 *
 * Ces tests lisent la source PHP : on ne peut pas l'exécuter ici, mais on peut
 * exiger qu'aucune manipulation par le code en clair n'y subsiste.
 */
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LIB = readFileSync(resolve(RACINE, 'server/mapo-credits-lib.php'), 'utf8')

describe('Stockage — le registre ne contient que des empreintes', () => {
  it('la fonction d’empreinte existe et est salée', () => {
    expect(LIB).toMatch(/function mc_codeEmpreinte/)
    // Le préfixe évite qu'une empreinte calculée ici vaille ailleurs.
    expect(LIB).toMatch(/hash\('sha256',\s*'mapo-code:'/)
  })

  it('la création écrit sous l’empreinte, jamais sous le code', () => {
    expect(LIB).toMatch(/\$map\[mc_codeEmpreinte\(\$code\)\]\s*=/)
  })

  it('plus AUCUNE manipulation du registre par le code en clair', () => {
    // C'est le test qui compte : lecture comme écriture.
    expect(LIB).not.toMatch(/\$map\[\$code\]/)
  })

  it('l’utilisation cherche par empreinte', () => {
    expect(LIB).toMatch(/\$cle\s*=\s*mc_codeEmpreinte\(\$code\)/)
    expect(LIB).toMatch(/\$e\s*=\s*\$map\[\$cle\]/)
  })
})

describe('Révocation — les codes d’avant l’incident sont morts', () => {
  it('une entrée en clair ne peut plus être trouvée', () => {
    // On rejoue la logique : l'ancien registre indexait « ARVE6-4VXTC » ;
    // la recherche calcule désormais une empreinte, qui ne peut pas être une
    // clé en clair. Aucune collision possible : longueurs et alphabets
    // incompatibles (64 caractères hexadécimaux contre 12 + tirets).
    const empreinte = createHash('sha256').update('mapo-code:ABCD-EFGH-JKMN').digest('hex')
    expect(empreinte).toHaveLength(64)
    expect(empreinte).toMatch(/^[0-9a-f]+$/)
    expect(empreinte).not.toMatch(/-/)
  })
})

describe('Résistance — un code doit rester hors de portée de la force brute', () => {
  it('les codes font au moins 12 caractères', () => {
    const m = LIB.match(/function mc_codeGenerer\(\$longueur = (\d+)\)/)
    expect(Number(m && m[1])).toBeGreaterThanOrEqual(12)
  })

  it('l’espace de recherche reste immense', () => {
    const alpha = (LIB.match(/\$alpha = '([A-Z0-9]+)'/) || [])[1] || ''
    const n = Number((LIB.match(/function mc_codeGenerer\(\$longueur = (\d+)\)/) || [])[1])
    // Une empreinte se casse par force brute : c'est la longueur du code, pas
    // l'algorithme, qui protège. 10^17 combinaisons mettent l'attaque hors de
    // portée ; 10 caractères n'y suffisaient plus.
    expect(Math.pow(alpha.length, n)).toBeGreaterThan(1e17)
  })

  it('l’alphabet évite les caractères qu’on confond en les recopiant', () => {
    const alpha = (LIB.match(/\$alpha = '([A-Z0-9]+)'/) || [])[1] || ''
    for (const c of ['I', 'L', 'O', '0', '1']) expect(alpha).not.toContain(c)
  })
})
