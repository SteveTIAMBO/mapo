/**
 * Un apprenant est SEUL : ce qui parle de famille n'a pas à lui être servi.
 *
 * MESURÉ EN PRODUCTION le 25/08, sur un vrai compte apprenant (MBA) :
 *   - état des crédits : { offreId:'decouverte', tokens:23000, cap:25000,
 *     bonus:0, potFamille:0, estEnfant:false } — SINCÈRE, aucun mensonge du
 *     type « 25000/25000 » observé jadis sur un compte enfant lu sans famille ;
 *   - offres et packs bien proposés (4 offres, 3 packs) : commander des crédits
 *     ne suppose aucune famille ;
 *   - MAIS `remiseFamille` vaut { minEnfants: 2, pct: 35 }, et le bandeau
 *     s'affichait dès que le serveur annonçait une remise. Un adulte en MBA,
 *     venu chercher SES révisions, lisait « 35 % dès le 2e enfant ».
 *
 * Ce n'est pas seulement inutile : ça lui dit que le produit ne s'adresse pas
 * à lui, à l'endroit exact où on lui demande de payer.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const ABO = lire('src/components/MiapoAbonnement.vue')
const VUE = lire('src/views/ParentMiapoView.vue')

describe('la remise famille ne s’affiche pas à un apprenant seul', () => {
  it('le bandeau est neutralisé par le mode', () => {
    expect(ABO).toContain("const estApprenant = computed(() => eaStore.mode === 'apprenant')")
    expect(ABO).toContain('const remisePct = computed(() => (estApprenant.value ? 0 : abo.remiseFamille?.pct || 0))')
  })

  it('⚠️ et l’argument disparaît AUSSI de la liste des avantages', () => {
    // Masquer le bandeau en laissant « remise famille » dans les offres aurait
    // seulement déplacé l'incohérence d'un écran à l'autre.
    expect(ABO).toContain("return estApprenant.value ? liste.filter((f) => f !== 'featFamille') : liste")
    expect(ABO).toContain('v-for="f in avantagesVisibles(o)"')
  })
})

/**
 * Les libellés « parent » de l'espace, eux, étaient DÉJÀ gardés — vérifié, et
 * c'est un résultat négatif qui mérite d'être figé : sans ces gardes, un
 * apprenant verrait « Ajouter un enfant », « Mes enfants », « Mon profil
 * (parent) » ou une incitation WhatsApp parlant de « ton enfant ».
 */
describe('rien de « parent » ne fuit dans la vue apprenant', () => {
  it('la section « Mes enfants » n’existe que hors mode apprenant', () => {
    const i = VUE.indexOf("if (!isApprenant.value) {")
    expect(i).toBeGreaterThan(0)
    const bloc = VUE.slice(i, i + 500)
    expect(bloc).toContain("t('mia.secMyChildren')")
  })

  it('le profil « parent » et la relance WhatsApp sont gardés', () => {
    expect(VUE).toMatch(/v-if="!isApprenant"[^>]*>\s*<div class="card-head"><Settings/)
    expect(VUE).toContain('<template v-if="!isApprenant && activeEnfant">')
  })

  it('le co-parent n’est pas proposé à un apprenant', () => {
    expect(VUE).toContain("if (!isApprenant.value) items.push({ key: 'coparent'")
  })
})
