import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * CLOISONNEMENT MAPO ↔ MAPO+ (23/08/2026).
 *
 * Deux exigences de Steve, opposées et toutes deux nécessaires :
 *   1. une personne peut avoir MAPO+ SANS accéder à la moindre donnée MAPO ;
 *   2. une école qui a MAPO ouvre automatiquement l'accès MAPO+ de ses familles.
 *
 * Ce fichier vérifie le sens (1) — la frontière — parce que c'est celui qui
 * échoue en silence : une fuite ne provoque aucune erreur, elle affiche
 * simplement des données à quelqu'un qui n'aurait pas dû les voir.
 *
 * ⚠️ Portée honnête : ces tests lisent le CODE et les RÈGLES DU DÉPÔT. Ils ne
 * prouvent pas l'état de la base de production, dont les règles diffèrent (base
 * partagée avec un autre produit) et doivent être comparées dans la console.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const depot = path.join(racine, '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const lireDepot = (p) => fs.readFileSync(path.join(depot, p), 'utf8')

function sansCommentaires(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

describe('les données de l’école ne sont pas lisibles par une famille', () => {
  const regles = lireDepot('firestore.rules')

  it('les sous-collections d’une école exigent d’en être MEMBRE', () => {
    // C'est LA règle qui tient la frontière : un compte MAPO+ n'est pas membre,
    // donc il ne peut lire ni élèves, ni notes, ni bulletins, ni facturation.
    expect(regles).toMatch(/match \/\{coll\}\/\{docId=\*\*\}[\s\S]{0,200}allow read: if isMember\(schoolId\) \|\| isSuperAdmin\(\)/)
  })

  it('être membre suppose un profil rattaché à CETTE école et actif', () => {
    const f = regles.slice(regles.indexOf('function isMember('))
    const corps = f.slice(0, f.indexOf('}'))
    expect(corps).toContain('userDoc().schoolId == schoolId')
    expect(corps).toContain("userDoc().status == 'active'")
  })

  it('⚠️ tout ce qui n’est pas explicitement autorisé est refusé', () => {
    // Sans cette clause finale, une collection oubliée serait ouverte à tous —
    // et rien ne le signalerait.
    expect(regles).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/)
  })
})

describe('les données MAPO+ ne sont pas lisibles par l’école', () => {
  const regles = lireDepot('firestore.rules')

  it('l’espace B2C est réservé au parent, au co-parent et à l’enfant concerné', () => {
    // ⚠️ Le fichier de règles cite « match /b2c/{docId} » dans son en-tête de
    // documentation : chercher la première occurrence tombait sur le COMMENTAIRE,
    // pas sur la règle. On vise l'ouverture de bloc réelle.
    const debut = regles.indexOf('match /b2c/{docId} {')
    expect(debut, 'bloc de règles b2c introuvable').toBeGreaterThan(0)
    const bloc = regles.slice(debut)
    const fin = bloc.indexOf('\n      }')
    const corps = bloc.slice(0, fin > 0 ? fin : 1200)
    // Aucune notion d'école ni de personnel n'apparaît dans ce périmètre.
    expect(corps).not.toContain('isMember')
    expect(corps).not.toContain('schoolId')
    expect(corps).toContain('coParents')
    expect(corps).toContain('enfantsComptes')
  })

  it('la base des inscrits MAPO+ n’est ouverte qu’à soi-même', () => {
    const bloc = regles.slice(regles.indexOf('match /mapoplus_users/{uid}'))
    const corps = bloc.slice(0, 260)
    expect(corps).toContain('request.auth.uid == uid')
    expect(corps).not.toContain('isMember')
  })
})

describe('⚠️ aucune donnée d’école n’est lue directement par le client MAPO+', () => {
  /**
   * Les documents de l'école sont GROUPÉS (un seul document par module contient
   * toute l'école) : un accès client, même autorisé, exposerait les autres
   * élèves. Toute la donnée école doit donc transiter par le pont serveur, qui
   * ne renvoie que la tranche de l'élève lié.
   */
  const B2C = [
    'stores/enfantsAutonomes.js',
    'stores/enfantsComptes.js',
    'stores/coParents.js',
    'stores/abonnement.js',
    'stores/tuteur.js',
  ]

  it('les stores B2C ne touchent jamais la collection « schools »', () => {
    for (const f of B2C) {
      const src = sansCommentaires(lire(f))
      expect(src, `${f} lit schools/ en direct`).not.toMatch(/['"]schools['"]/)
    }
  })

  it('le client du pont passe bien par le serveur, et rien d’autre', () => {
    const src = sansCommentaires(lire('stores/lienEcole.js'))
    expect(src).toContain('/mapo-lien.php')
    expect(src).not.toMatch(/['"]schools['"]/)
    expect(src).not.toContain('firebase/firestore')
  })
})

describe('le pont serveur n’accorde rien sans lien scellé', () => {
  const pont = lireDepot('server/mapo-lien.php')

  it('chaque action qui lit des données d’école vérifie le lien', () => {
    // Le lien `schools/{sid}/liens_mapoplus/{uid}__{eleveId}` est le SEUL fait
    // qui autorise la lecture, et il a été écrit par le serveur au moment du
    // rachat du code — jamais par le navigateur.
    //
    // ⚠️ Deux écritures coexistent dans ce fichier : l'appel à `bridgeLink()`,
    // et la vérification en ligne (`liens_mapoplus` + refus « non_relie »).
    // Le test porte sur la GARANTIE, pas sur une orthographe : exiger une seule
    // des deux formes ferait échouer un code correct, et apprendrait à ignorer
    // le rouge.
    const ACTIONS = ['devoirs', 'cours', 'cours-file', 'submit_devoir', 'push_suivi', 'messages', 'send_message']
    for (const action of ACTIONS) {
      const i = pont.indexOf(`$action === '${action}'`)
      expect(i, `action ${action} introuvable`).toBeGreaterThan(0)
      const bloc = pont.slice(i, i + 2200)
      const verifie = bloc.includes('bridgeLink(')
        || (bloc.includes('liens_mapoplus') && bloc.includes('non_relie'))
      expect(verifie, `action ${action} ne vérifie aucun lien scellé`).toBe(true)
    }
  })

  it('⚠️ l’aperçu public ne divulgue ni nom de famille, ni matricule, ni contact', () => {
    // Seule action ouverte sans jeton (la famille n'a pas encore de compte).
    const i = pont.indexOf("$action === 'apercu'")
    expect(i).toBeGreaterThan(0)
    const bloc = pont.slice(i, pont.indexOf("// ── 1. Vérifier le jeton"))
    expect(bloc).toContain("'prenom'")
    expect(bloc).not.toContain("'lastName'")
    expect(bloc).not.toContain("'matricule'")
    expect(bloc).not.toContain("'email'")
    // Et il ne consomme pas l'invitation : un aperçu WhatsApp ne doit pas la brûler.
    expect(bloc).not.toContain("'used' => true")
    expect(bloc).toContain('rateLimitOk()')
  })

  it('l’aperçu est traité AVANT l’exigence de jeton, sinon il ne servirait à rien', () => {
    expect(pont.indexOf("$action === 'apercu'")).toBeLessThan(pont.indexOf('$uid = verifyFirebaseUid();'))
  })
})

describe('le droit Premium offert ne peut pas être réclamé par le client', () => {
  it('il est accordé dans le rachat serveur, pas depuis le navigateur', () => {
    const pont = lireDepot('server/mapo-lien.php')
    const i = pont.indexOf("$action === 'redeem'")
    const bloc = pont.slice(i, pont.indexOf("$action === 'devoirs'"))
    expect(bloc).toContain('mc_bienvenueEcole(')
    // Le montant/la durée ne viennent JAMAIS du corps de la requête.
    expect(bloc).not.toMatch(/\$body\['(offre|jours|premium)'\]/)
  })

  it('aucun code client n’appelle une fonction d’octroi d’offre', () => {
    const stores = fs.readdirSync(path.join(racine, 'stores'))
    for (const f of stores) {
      if (!f.endsWith('.js')) continue
      const src = sansCommentaires(fs.readFileSync(path.join(racine, 'stores', f), 'utf8'))
      expect(src, `${f} tente d'accorder une offre`).not.toContain('mc_grant')
      expect(src, `${f} tente d'accorder la bienvenue`).not.toContain('mc_bienvenueEcole')
    }
  })

  it('⚠️ la bienvenue ne rétrograde ni ne prolonge indéfiniment', () => {
    // Une famille qui a PAYÉ Premium ne doit pas voir son échéance remplacée par
    // celle de l'offre ; et un double clic ne doit pas repousser l'échéance sans
    // fin. L'octroi n'a lieu que si la nouvelle échéance est plus lointaine.
    const lib = lireDepot('server/mapo-credits-lib.php')
    const i = lib.indexOf('function mc_bienvenueEcole')
    expect(i).toBeGreaterThan(0)
    const bloc = lib.slice(i, i + 900)
    expect(bloc).toContain('$actuelle >= $cible')
    expect(bloc).toContain('return [false, $exp]')
  })
})

describe('⚠️ le garde ne referme pas les portes d’entrée', () => {
  /**
   * Défaut vu à l'écran le 23/08/2026, et parfaitement muet : un parent déjà
   * connecté à MAPO+ sur son téléphone qui ouvrait le lien d'invitation de son
   * école était renvoyé vers son espace. Page blanche, aucune erreur, et
   * l'invitation JAMAIS consommée — alors que c'est le cas le plus courant.
   */
  const routeur = lire('router/index.js')

  it('les routes d’action publiques échappent au confinement', () => {
    expect(routeur).toContain('ROUTES_ACTION_PUBLIQUES')
    for (const nom of ['Rejoindre', 'VerifierEmail', 'CarreCallback']) {
      const i = routeur.indexOf('ROUTES_ACTION_PUBLIQUES = new Set([')
      const bloc = routeur.slice(i, routeur.indexOf('])', i))
      expect(bloc, `${nom} devrait rester atteignable`).toContain(`'${nom}'`)
    }
  })

  it('le confinement parent ET élève consulte bien cette exception', () => {
    const src = sansCommentaires(routeur)
    for (const garde of ['isEleve && ', 'isParent && ']) {
      const i = src.indexOf(garde + '!routePublique')
      expect(i, `le garde « ${garde} » ignore les routes d'action`).toBeGreaterThan(0)
    }
  })

  it('l’accueil et la vitrine, eux, RESTENT confinés', () => {
    // Y laisser un parent connecté changerait l'atterrissage de tout le monde.
    const i = routeur.indexOf('ROUTES_ACTION_PUBLIQUES = new Set([')
    const bloc = routeur.slice(i, routeur.indexOf('])', i))
    for (const nom of ['Home', 'Welcome', 'Demo', 'Dashboard']) {
      expect(bloc, `${nom} ne doit pas figurer dans les exceptions`).not.toContain(`'${nom}'`)
    }
  })
})

describe('l’invitation part de l’école, et se raconte', () => {
  it('la validation d’une inscription ouvre l’accès MAPO+', () => {
    const src = lire('stores/inscriptions.js')
    const i = src.indexOf('const validateDossier')
    const bloc = src.slice(i, i + 3000)
    expect(bloc).toContain('ouvrirAccesMapoPlus(')
  })

  it('⚠️ un échec d’invitation n’annule JAMAIS l’inscription', () => {
    // La scolarité de l'élève ne dépend pas de MAPO+.
    const src = lire('stores/inscriptions.js')
    const i = src.indexOf('invitation = await ouvrirAccesMapoPlus')
    expect(i).toBeGreaterThan(0)
    const avant = src.slice(i - 200, i)
    expect(avant).toContain('try {')
  })

  it('l’adresse d’envoi est écrite par l’école, jamais fournie par l’appelant', () => {
    // Sans cela, le point d'envoi deviendrait un relais ouvert.
    const src = lire('stores/eleves.js')
    const i = src.indexOf('const autoriserMapoPlus')
    const bloc = src.slice(i, i + 2000)
    expect(bloc).toContain('email: opts.email')
  })
})
