import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * MAPO est l'outil de l'ÉCOLE et de son personnel.
 *
 * Décision de Steve, 23/08/2026 : les familles et les élèves vivent dans MAPO+,
 * qui se reliera à l'école. La démonstration de MAPO ne propose donc plus de
 * profil « Parent » ni « Élève » — montrer deux portes d'entrée pour la même
 * personne brouillait le discours en rendez-vous.
 *
 * ⚠️ Ce test ne porte QUE sur les profils de démonstration. Les rôles `parent`
 * et `eleve`, leurs écrans et leurs routes existent toujours : des écoles
 * réelles ont pu inviter des familles, et les retirer les mettrait dehors sans
 * préavis. C'est une décision de produit distincte, à prendre séparément.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')

/** Retire commentaires de ligne et de bloc : on ne teste que le CODE. */
function codeSeul(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

describe('la démo MAPO ne propose que l’école et son personnel', () => {
  it('aucun compte de démonstration parent ou élève', () => {
    const src = codeSeul(lire('stores/auth.js'))
    // Le bloc DEMO_ACCOUNTS de l'ERP, avant celui du supérieur.
    const erp = src.slice(src.indexOf('DEMO_ACCOUNTS = {'), src.indexOf('DEMO_ACCOUNTS_SUP'))
    expect(erp).not.toContain("uid: 'demo-parent'")
    expect(erp).not.toContain("uid: 'demo-eleve'")
  })

  it('l’écran de connexion ne montre ni « Parent » ni « Élève »', () => {
    const src = codeSeul(lire('views/LoginView.vue'))
    const bloc = src.slice(src.indexOf('const demoAccounts = ['))
    const fin = bloc.indexOf(']')
    const liste = bloc.slice(0, fin)
    expect(liste).not.toContain("role: 'parent'")
    expect(liste).not.toContain("role: 'eleve'")
  })

  it('les profils école, eux, sont bien là', () => {
    // Sans cette vérification, un test qui passe pourrait simplement signifier
    // que la liste est vide.
    const src = codeSeul(lire('views/LoginView.vue'))
    expect(src).toContain("role: 'directeur'")
    expect(src).toContain("role: 'enseignant'")
  })

  it('le message d’erreur n’oriente plus vers des profils supprimés', () => {
    // Proposer « parent ou eleve » à quelqu'un qui se trompe d'identifiant
    // enverrait vers une porte qui n'existe plus.
    const src = lire('stores/auth.js')
    expect(src).not.toContain('directeur, enseignant, parent ou eleve')
  })
})
