/**
 * RGPD : un effacement laissait des PDF sur l'hébergement.
 *
 * La suppression d'un DOCUMENT appelle le serveur depuis le 03/09. Restaient
 * deux chemins qui ne le faisaient pas, et trois fuites purement locales
 * trouvées en les ouvrant :
 *
 *  1. `removeEnfant` effaçait la fiche, l'historique de révisions et le cache
 *     des cours de l'école — mais PAS `coursPerso` (le TEXTE des cours de la
 *     personne, sous une clé qui porte son identifiant) ni sa calibration.
 *  2. `effacerCalibration` était écrit, documenté « appelé à la suppression »…
 *     et appelé NULLE PART. Un commentaire qui promettait un comportement
 *     inexistant, et un test unitaire vert sur une fonction morte.
 *  3. Ni la suppression de profil ni celle du COMPTE ne touchaient aux fichiers
 *     serveur.
 *
 * ⚠️ Le cas du compte est le plus grave : après `deleteUser`, l'identifiant
 * Firebase n'existe plus, le marqueur `.own` ne correspondra jamais à personne,
 * et le PDF devient DÉFINITIVEMENT ineffaçable. C'est donc avant, ou jamais.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addCoursPerso, listCoursPerso, clearCoursPerso } from '../utils/coursPerso'
import { enregistrerSeanceCalibration, historiqueCalibration, effacerCalibration } from '../utils/calibration'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const STORE = lire('src/stores/enfantsAutonomes.js')
const RGPD = lire('src/stores/donneesPersonnelles.js')
const SRV = lire('src/services/coursFiles.js')
const VUE = lire('src/views/ParentMiapoView.vue')

beforeEach(() => localStorage.clear())

describe('⭐⭐ les dépôts locaux partent vraiment avec le profil', () => {
  it('`clearCoursPerso` efface le texte des cours', () => {
    addCoursPerso('e1', { matiere: 'A', contenu: 'le cours de la personne' })
    expect(listCoursPerso('e1')).toHaveLength(1)
    clearCoursPerso('e1')
    expect(listCoursPerso('e1')).toEqual([])
  })

  it('⚠️ un autre profil n’est PAS emporté au passage', () => {
    addCoursPerso('e1', { matiere: 'A', contenu: 'x' })
    addCoursPerso('e2', { matiere: 'A', contenu: 'y' })
    clearCoursPerso('e1')
    expect(listCoursPerso('e2')).toHaveLength(1)
  })

  it('la calibration s’efface aussi', () => {
    enregistrerSeanceCalibration('e1', { matiere: 'A', prevu: 5, reussi: 5, total: 10, reponses: [] })
    expect(historiqueCalibration('e1')).toHaveLength(1)
    effacerCalibration('e1')
    expect(historiqueCalibration('e1')).toEqual([])
  })

  it('⚠️⚠️ et les deux sont maintenant BRANCHÉES dans removeEnfant', () => {
    // C'est le défaut : les fonctions existaient, personne ne les appelait.
    expect(STORE).toContain('clearCoursPerso(id)')
    expect(STORE).toContain('effacerCalibration(id)')
    expect(STORE).toContain('clearCoursEcole(id)')
  })
})

describe('⭐⭐ l’ORDRE : serveur d’abord, local ensuite', () => {
  it('removeEnfant supprime les fichiers AVANT d’effacer le local', () => {
    // Les identifiants de fichiers ne vivent QUE dans le dépôt local. L'effacer
    // d'abord rendrait le PDF ineffaçable : il resterait sur l'hébergement sans
    // que personne ne puisse plus le nommer.
    const iFichiers = STORE.indexOf('await deleteCoursFiles(listCoursPerso(id))')
    const iLocal = STORE.indexOf('clearCoursPerso(id)')
    expect(iFichiers).toBeGreaterThan(-1)
    expect(iLocal).toBeGreaterThan(iFichiers)
  })

  it('⚠️ un échec serveur ANNULE la suppression du profil', () => {
    // Un effacement partiel qui laisse un PDF est pire qu'un effacement qui n'a
    // pas eu lieu : on peut réessayer le second.
    expect(STORE).toContain('if (r.echecs > 0) return false')
  })

  it('l’appelant attend le résultat et le DIT', () => {
    expect(VUE).toContain('if (!(await store.removeEnfant(activeEnfant.value.id))) {')
    expect(VUE).toContain("t('mia.removeProfileFileError')")
  })
})

describe('⭐⭐ suppression de COMPTE : avant deleteUser, ou jamais', () => {
  it('les fichiers sont supprimés AVANT le wipe localStorage', () => {
    const iFichiers = RGPD.indexOf('deleteCoursFiles(listCoursPerso(e.id))')
    const iWipe = RGPD.indexOf('for (const k of aSupprimer) localStorage.removeItem(k)')
    expect(iFichiers).toBeGreaterThan(-1)
    expect(iWipe).toBeGreaterThan(iFichiers)
  })

  it('⚠️⚠️ et AVANT deleteUser — après, le marqueur ne matche plus jamais', () => {
    const iFichiers = RGPD.indexOf('deleteCoursFiles(listCoursPerso(e.id))')
    const iDelete = RGPD.indexOf('await deleteUser(auth.currentUser)')
    expect(iDelete).toBeGreaterThan(iFichiers)
  })

  it('un échec abandonne tout, sans rien détruire', () => {
    // Même philosophie que le garde-fou `requires-recent-login` juste au-dessus.
    expect(RGPD).toContain("erreur.value = 'fichiers_non_supprimes'; return false")
  })

  it('l’écran traduit cette raison au lieu d’un message générique', () => {
    const CONF = lire('src/components/MiapoConfidentialite.vue')
    expect(CONF).toContain("dp.erreur === 'fichiers_non_supprimes'")
    expect(CONF).toContain("t('rgpd.errFilesNotDeleted')")
  })
})

describe('⭐ le lot compte ses échecs au lieu de les taire', () => {
  it('`deleteCoursFiles` renvoie total et échecs', () => {
    expect(SRV).toContain('return { total: avecFichier.length, echecs }')
  })

  it('les documents sans fichier ne comptent pas comme des échecs', () => {
    // Un cours saisi à la main n'a pas de PDF : le compter en échec bloquerait
    // la suppression d'un profil qui n'a jamais rien importé.
    expect(SRV).toContain('.filter((d) => d && d.fileId)')
  })
})
