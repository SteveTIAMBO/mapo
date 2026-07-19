import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { OFFRES, OFFRE_GRATUITE, offreById } from '../config/offres'

/**
 * Store « abonnement MAPO+ » — offre courante + crédits restants.
 *
 * SQUELETTE : l'état est pour l'instant tenu en local (par propriétaire). Le
 * durcissement viendra (tâche suivante) : l'entitlement doit être accordé côté
 * SERVEUR après confirmation du paiement Tranzak (sinon un utilisateur pourrait
 * s'attribuer Premium sans payer), et les crédits décomptés à la source dans
 * `mapo-ia.php`. Ici on pose la structure + le parcours.
 */
export const useAbonnementStore = defineStore('abonnement', () => {
  const authStore = useAuthStore()
  const owner = computed(() => authStore.userProfile?.email || authStore.userProfile?.phone || 'demo')
  const KEY = (o) => `mapo_abo_${o || 'demo'}`

  const offreId = ref('decouverte')
  const credits = ref(OFFRE_GRATUITE.credits)
  const renewAt = ref('') // ISO ; au-delà → retour au gratuit / renouvellement

  const offre = computed(() => offreById(offreId.value))
  const offresPayantes = computed(() => OFFRES.filter((o) => o.prix > 0))

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY(owner.value)) || 'null')
      if (raw) { offreId.value = raw.offreId || 'decouverte'; credits.value = raw.credits ?? OFFRE_GRATUITE.credits; renewAt.value = raw.renewAt || '' }
      else reset()
    } catch { reset() }
    expireSiBesoin()
  }
  function save() {
    try { localStorage.setItem(KEY(owner.value), JSON.stringify({ offreId: offreId.value, credits: credits.value, renewAt: renewAt.value })) } catch { /* quota */ }
  }
  function reset() {
    offreId.value = 'decouverte'; credits.value = OFFRE_GRATUITE.credits; renewAt.value = ''
  }

  /** Cycle échu → on retombe sur le gratuit (Tranzak = re-charge manuelle, pas de reconduction). */
  function expireSiBesoin() {
    if (renewAt.value && new Date(renewAt.value) < new Date()) { reset(); save() }
  }

  /** Active une offre (après paiement confirmé). SQUELETTE local — à sécuriser côté serveur. */
  function activer(id) {
    const o = offreById(id)
    offreId.value = o.id
    credits.value = o.credits
    const d = new Date(); d.setDate(d.getDate() + (o.duréeJours || 30))
    renewAt.value = d.toISOString()
    save()
  }

  /** Décompte 1 crédit à chaque action IA. Renvoie false si épuisé (→ inviter à upgrader). */
  function consommer(n = 1) {
    if (credits.value < n) return false
    credits.value -= n
    save()
    return true
  }

  const épuisé = computed(() => credits.value <= 0)

  return { owner, offreId, credits, renewAt, offre, offresPayantes, épuisé, load, activer, consommer, reset }
})
