import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_ROLES, SOCLE_MODULES, OPTIONAL_MODULES } from '../stores/permissions'
import { MODULES_INFO } from '../stores/megaAdmin'

/**
 * Les deux tables du routeur, et pourquoi il ne faut pas les confondre.
 *
 *   - ROUTE_PERMISSION_MAP : ce RÔLE a-t-il le droit d'ouvrir cet écran ?
 *   - ROUTE_MODULE_MAP     : ce MODULE est-il activé pour cette école ?
 *
 * Le 19/08/2026, en supprimant le socle, j'ai pointé « inscriptions » et cinq
 * autres routes vers des clés de module qui n'existent dans AUCUN rôle. La table
 * servant aussi aux permissions, `hasAccess()` répondait non et le DIRECTEUR se
 * faisait renvoyer au tableau de bord depuis six écrans. Rien dans le code ne le
 * signalait ; c'est le balayage de la démonstration qui l'a trouvé.
 *
 * Ce test lit le routeur comme du texte : il n'a pas besoin de monter
 * l'application, et il attrape exactement la confusion qui a coûté ces six écrans.
 */

const ROUTER = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'router', 'index.js'), 'utf8',
)

/** Extrait un objet littéral du source du routeur, sous forme de paires. */
function tableDuRouteur(nom) {
  const i = ROUTER.indexOf(`const ${nom} = {`)
  if (i === -1) throw new Error(`table ${nom} introuvable dans le routeur`)
  const bloc = ROUTER.slice(i, ROUTER.indexOf('\n}', i))
  const paires = {}
  for (const m of bloc.matchAll(/'([^']+)':\s*'([^']+)'/g)) paires[m[1]] = m[2]
  return paires
}

const PERMISSIONS = tableDuRouteur('ROUTE_PERMISSION_MAP')
// ROUTE_MODULE_MAP hérite de la table des droits (`...ROUTE_PERMISSION_MAP`)
// puis la complète : on reproduit fidèlement cette composition.
const MODULES = { ...PERMISSIONS, ...tableDuRouteur('ROUTE_MODULE_MAP') }

describe('table des droits par rôle', () => {
  it('ne pointe que vers des clés que les rôles connaissent', () => {
    // Une clé absente des rôles = `hasAccess()` répond non = écran inaccessible,
    // y compris pour le directeur, sans aucun message.
    const connues = new Set(Object.keys(DEFAULT_ROLES.directeur.permissions))
    const orphelines = [...new Set(Object.values(PERMISSIONS))].filter((k) => !connues.has(k))
    expect(orphelines, `clés sans permission définie : ${orphelines.join(', ')}`).toEqual([])
  })

  it('les six écrans du 19/08 restent joignables par le directeur', () => {
    // Régression ciblée : ce sont exactement ceux qui étaient tombés.
    const connues = new Set(Object.keys(DEFAULT_ROLES.directeur.permissions))
    for (const route of ['inscriptions', 'transition-annee', 'preparation']) {
      expect(connues.has(PERMISSIONS[route]), `${route} doit viser une clé de rôle`).toBe(true)
      expect(DEFAULT_ROLES.directeur.permissions[PERMISSIONS[route]]).not.toBe('none')
    }
    // Bibliothèque, transport, cantine, infirmerie n'ont PAS de permission par
    // rôle : elles ne doivent donc pas figurer dans la table des droits.
    for (const route of ['bibliotheque', 'transport', 'cantine', 'infirmerie']) {
      expect(PERMISSIONS[route], `${route} ne doit pas être une clé de permission`).toBeUndefined()
    }
  })
})

describe('table des modules activables', () => {
  it('ne pointe que vers des modules réellement proposés à l’activation', () => {
    const proposables = new Set([...Object.keys(MODULES_INFO), ...SOCLE_MODULES, ...OPTIONAL_MODULES])
    const inconnues = [...new Set(Object.values(MODULES))].filter((k) => !proposables.has(k))
    expect(inconnues, `modules inconnus du catalogue : ${inconnues.join(', ')}`).toEqual([])
  })

  it('garde les écrans que l’école peut désactiver', () => {
    // Sans entrée ici, décocher la case retirerait le menu mais laisserait
    // l'écran joignable par l'URL : un réglage à moitié appliqué.
    for (const route of ['dashboard', 'bibliotheque', 'transport', 'cantine', 'infirmerie', 'inscriptions', 'transition-annee']) {
      expect(MODULES[route], `${route} doit être gardé par un module`).toBeTruthy()
    }
  })

  it('couvre au moins tout ce que couvrent les droits', () => {
    // La table des modules hérite de celle des droits : aucune route gardée par
    // un droit ne doit échapper au contrôle d'activation.
    for (const route of Object.keys(PERMISSIONS)) {
      expect(MODULES[route], `${route} absente de la table des modules`).toBeTruthy()
    }
  })

  it('les deux tables sont bien DISTINCTES', () => {
    // Si elles redevenaient identiques, la confusion pourrait revenir.
    expect(Object.keys(MODULES).length).toBeGreaterThan(Object.keys(PERMISSIONS).length)
    expect(MODULES.inscriptions).not.toBe(PERMISSIONS.inscriptions)
  })
})
