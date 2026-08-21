import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Indépendance des éditions primaire et secondaire.
 *
 * Ce sont deux PRODUITS distincts. Une donnée de démonstration saisie dans l'un
 * ne doit jamais apparaître dans l'autre : sinon la démonstration d'une école
 * primaire affiche les classes du collège, et l'écart ne se voit qu'en séance.
 *
 * Le mécanisme est `demoKey()` (utils/demoScope.js), qui suffixe la clé
 * localStorage par l'édition active. Ce test est un GARDE-FOU : il refuse tout
 * store qui écrit une donnée de démo sans passer par ce suffixe. Il a attrapé
 * six stores le 19/08/2026, dont deux que je venais d'écrire.
 */

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), '..', 'stores')

// Stores hors périmètre, avec la RAISON de l'exemption. Un store qui n'est pas
// ici et qui écrit dans localStorage doit passer par demoKey().
const EXEMPTS = {
  'auth.js': 'session et profil : communs à toutes les éditions, par nature',
  'edition.js': 'porte justement le choix de l’édition',
  'accessibilite.js': 'préférences d’affichage de l’utilisateur, pas des données scolaires',
  'connecteurs.js': 'réglages techniques hors périmètre scolaire',
  'notifications.js': 'préférences de notification de l’utilisateur',
  'notes.js': 'possède son propre suffixe (notesDemoKey)',
  'school.js': 'possède son propre suffixe (demoSettingsKey)',
  'classes.js': 'possède son propre suffixe par édition',
  'eleves.js': 'possède son propre suffixe par édition',
  'usage.js': 'compteurs techniques, pas des données scolaires',
  'donneesPersonnelles.js': 'conformité RGPD, portée compte',
  'langue2.js': 'préférence de langue de l’élève',
  'apee.js': 'association de parents : à cloisonner, dette connue',
  'finance.js': 'édition supérieur, socle sup_* distinct',
}

// Édition supérieur : socle séparé, hors du couple primaire/secondaire.
const SUPERIEUR = /^superieur|^sup[A-Z]/

// MAPO+ (B2C) : hors ERP, un enfant n'appartient pas à une édition d'école.
const MAPO_PLUS = [
  'abonnement.js', 'enfantsAutonomes.js', 'enfantsComptes.js', 'facturationMiapo.js',
  'tuteur.js', 'miapoRef.js', 'mapoplusUsers.js', 'parentChildren.js', 'relance.js',
  'ligue.js', 'mobilite.js', 'activity.js', 'invitations.js', 'complexe.js',
  'megaAdmin.js', 'miapoSuivi.js', 'miapoCopilot.js', 'diplomes.js', 'lienEcole.js',
  'tranzak.js', 'push.js', 'feedback.js', 'permissions.js', 'schoolIdentity.js',
  'appreciations.js', 'personnel.js', 'subjects.js', 'inscriptions.js',
]

describe('cloisonnement des données de démonstration par édition', () => {
  it('aucun store ERP n’écrit une donnée de démo sans suffixe d’édition', () => {
    const fautifs = []
    for (const nom of readdirSync(DOSSIER).filter((f) => f.endsWith('.js'))) {
      if (EXEMPTS[nom] || SUPERIEUR.test(nom) || MAPO_PLUS.includes(nom)) continue
      const src = readFileSync(join(DOSSIER, nom), 'utf8')
      if (!src.includes('localStorage.setItem')) continue
      // Le store écrit dans localStorage : il doit passer par demoKey().
      if (!src.includes('demoKey')) fautifs.push(nom)
    }
    expect(fautifs, `ces stores fuient d'une édition à l'autre : ${fautifs.join(', ')}`).toEqual([])
  })

  it('les stores livrés le 19/08 sont bien cloisonnés', () => {
    // Régression ciblée : ces deux-là fuyaient à leur création.
    for (const nom of ['niveaux.js', 'preparation.js']) {
      const src = readFileSync(join(DOSSIER, nom), 'utf8')
      expect(src.includes('demoKey'), `${nom} doit suffixer sa clé de démo`).toBe(true)
    }
  })

  it('les modules de vie scolaire sont cloisonnés', () => {
    // Une école primaire n'a pas la même cantine ni la même bibliothèque que le
    // collège de démonstration.
    for (const nom of ['bibliotheque.js', 'cantine.js', 'infirmerie.js', 'transport.js', 'cours.js']) {
      const src = readFileSync(join(DOSSIER, nom), 'utf8')
      expect(src.includes('demoKey'), `${nom} doit suffixer sa clé de démo`).toBe(true)
    }
  })

  it('chaque exemption porte sa raison, pour qu’on puisse la contester', () => {
    for (const [nom, raison] of Object.entries(EXEMPTS)) {
      expect(raison.length, `${nom} : exemption sans justification`).toBeGreaterThan(15)
    }
  })
})
