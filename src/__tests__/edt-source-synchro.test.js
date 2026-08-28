/**
 * D'OÙ vient l'emploi du temps — et qui a le droit de l'écraser.
 *
 * ⚠️ CE QUE ÇA CORRIGE DANS MON PROPRE TRAVAIL (Steve, 27/08 : « quand l'école
 * est connectée, l'emploi du temps sera forcément poussé directement non ? »).
 *
 * Le pont fonctionne en TIRAGE : cours, devoirs et bulletins sont relus chez
 * l'école à chaque ouverture d'écran, donc toujours justes. J'avais fait de
 * l'emploi du temps une EXCEPTION — un import ponctuel qui COPIE dans le profil.
 * Il se périmait donc en silence : l'école déplace un cours, la copie garde
 * l'ancien horaire, et la révision de la veille se déclenche sur un cours qui
 * n'a plus lieu.
 *
 * La copie reste (elle sert le hors-ligne et la veille) mais devient un CACHE
 * rafraîchi tout seul. D'où la nécessité de tracer la PROVENANCE : sans elle,
 * la synchronisation écraserait sans prévenir une saisie manuelle.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const STORE = readFileSync(resolve(RACINE, 'src/stores/enfantsAutonomes.js'), 'utf8')
const VUE = readFileSync(resolve(RACINE, 'src/views/ParentMiapoView.vue'), 'utf8')
const sansCommentaires = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

describe('la provenance est enregistrée', () => {
  const code = () => sansCommentaires(STORE)

  it('setEdt prend une source, et « manuel » par défaut', () => {
    expect(code()).toContain("function setEdt(enfantId, creneaux, source = 'manuel')")
    expect(code()).toContain('e.edtSource = source')
  })

  it('⚠️ toucher un créneau à la main REPREND la main', () => {
    // Sans ça, la synchro automatique effacerait la correction au prochain
    // passage sur l'écran : l'ajout disparaîtrait sans explication.
    const ajout = code().slice(code().indexOf('function addCreneau'), code().indexOf('function removeCreneau'))
    expect(ajout).toContain("e.edtSource = 'manuel'")
    const retrait = code().slice(code().indexOf('function removeCreneau'))
    expect(retrait.slice(0, 300)).toContain("e.edtSource = 'manuel'")
  })
})

describe('⭐ la synchro école est AUTOMATIQUE, et silencieuse', () => {
  const code = () => sansCommentaires(VUE)

  it('elle se déclenche en arrivant sur l’écran, sans bouton', () => {
    expect(code()).toContain("if (s !== 'edt' || !ecoleLieActive.value) return")
    expect(code()).toContain('recupererEdtEcole({ auto: true })')
  })

  it('⚠️ throttlée : revenir trois fois sur l’écran ne fait pas trois appels', () => {
    expect(code()).toContain('DELAI_SYNC_EDT_MS')
    expect(code()).toContain('if (dernierSyncEdt && (n - dernierSyncEdt) < DELAI_SYNC_EDT_MS) return')
  })

  it('⭐⭐ en automatique, elle n’écrase JAMAIS ce qui ne vient pas de l’école', () => {
    // Un emploi du temps saisi ou importé par la personne lui appartient. En
    // automatique on s'abstient ; au clic, on demande.
    expect(code()).toContain("const aPerdre = actuels > 0 && e.edtSource !== 'ecole'")
    expect(code()).toContain('if (auto) return')
  })

  it('un emploi du temps qui vient DÉJÀ de l’école se rafraîchit sans rien demander', () => {
    // C'est tout l'objet : `aPerdre` est faux quand la source est 'ecole',
    // donc aucune confirmation, aucune interruption.
    expect(code()).toContain("store.setEdt(e.id, r.creneaux, 'ecole')")
  })

  it('⚠️ aucun message quand c’est automatique', () => {
    // Un « ton école n'a rien publié » affiché tout seul à chaque ouverture
    // ressemblerait à un reproche ; un échec réseau ne doit rien dire non plus,
    // le cache reste affiché et c'est exactement ce qu'il faut.
    const i = code().indexOf('async function recupererEdtEcole')
    const bloc = code().slice(i, i + 1600)
    expect(bloc).toContain("if (!auto) edtNotice.value = t('mia.edtSchoolEmpty')")
    expect(bloc).toContain("if (!auto) edtError.value = t('mia.edtFail')")
  })

  it('l’import de fichier se marque « import », pas « école »', () => {
    expect(code()).toContain("store.setEdt(activeEnfant.value.id, creneaux, 'import')")
  })
})
