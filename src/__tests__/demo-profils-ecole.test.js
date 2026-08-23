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
 * Le 23/08 également, Steve a tranché la question laissée ouverte ici : « il n'y
 * a pas encore d'école déployée donc oui tu peux supprimer cette route ». Les
 * quinze écrans du portail parent / élève de l'ERP ont donc été retirés, et non
 * plus seulement les profils de démonstration.
 *
 * ⚠️ Ce qui NE doit PAS partir avec eux : `/mon-espace` (route `ParentMiapo`)
 * EST l'espace MAPO+. Il porte `parentOnly: true` et le rôle applicatif
 * `parent` — supprimer « tout ce qui touche au parent » aurait fermé MAPO+ aux
 * familles. D'où les vérifications ci-dessous, dans les deux sens.
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

describe('le portail parent / élève de l’ERP est retiré', () => {
  const ROUTES_RETIREES = [
    'ParentDashboard', 'ParentNotes', 'ParentPresences', 'ParentFinances',
    'ParentMessages', 'ParentInscriptions', 'ParentEmploiDuTemps', 'ParentDevoirs',
    'EleveDashboard', 'EleveNotes', 'EleveRevisions', 'EleveEmploiDuTemps',
    'ElevePresences', 'EleveMessages', 'EleveCours',
  ]

  it('aucune de ces quinze routes ne revient', () => {
    const src = codeSeul(lire('router/index.js'))
    for (const nom of ROUTES_RETIREES) {
      expect(src, `route ${nom} réintroduite`).not.toContain(`name: '${nom}'`)
    }
  })

  it('leurs écrans n’existent plus dans le dépôt', () => {
    // Un fichier orphelin n'est pas neutre : il se fait réimporter « parce
    // qu'il est là », et le portail repousse par la bande.
    for (const nom of ROUTES_RETIREES) {
      const chemin = path.join(racine, 'views', `${nom}View.vue`)
      expect(fs.existsSync(chemin), `${nom}View.vue devrait être supprimé`).toBe(false)
    }
  })

  it('⚠️ MAPO+ survit : /mon-espace est toujours servi', () => {
    // La vérification qui compte. Les trois précédentes passeraient tout aussi
    // bien si j'avais supprimé le fichier de routes en entier.
    const src = codeSeul(lire('router/index.js'))
    expect(src).toContain("name: 'ParentMiapo'")
    expect(src).toContain("path: 'mon-espace'")
    expect(fs.existsSync(path.join(racine, 'views', 'ParentMiapoView.vue'))).toBe(true)
    // L'ancienne URL des e-mails d'activation doit rester valide.
    expect(src).toContain("path: '/parent/miapo'")
  })

  it('⚠️ le garde n’envoie jamais vers une route supprimée', () => {
    // Rediriger vers une route qui n'existe plus produit une boucle : l'écran
    // précédent reste affiché et AUCUNE erreur n'apparaît.
    const src = codeSeul(lire('router/index.js'))
    const garde = src.slice(src.indexOf('router.beforeEach'))
    for (const nom of ROUTES_RETIREES) {
      expect(garde, `le garde vise ${nom}`).not.toContain(nom)
    }
    expect(garde).toContain('ParentMiapo')
  })

  it('l’école ne peut ni inviter ni configurer un rôle parent', () => {
    const inv = codeSeul(lire('stores/invitations.js'))
    const liste = inv.slice(inv.indexOf('ROLES_PERSONNEL = ['), inv.indexOf('ROLES_PERSONNEL_SUP'))
    expect(liste).not.toContain("value: 'parent'")
    expect(liste).not.toContain("value: 'eleve'")
    // Et le rôle ne s'affiche plus dans l'écran Rôles, où le directeur réglait
    // des permissions vers des écrans désormais absents.
    const perm = codeSeul(lire('stores/permissions.js'))
    const defauts = perm.slice(perm.indexOf('DEFAULT_ROLES = {'), perm.indexOf('DEMO_ROLES_KEY'))
    expect(defauts).not.toContain('parent: {')
    expect(defauts).toContain('enseignant: {') // témoin : la table n'est pas vide
  })
})
