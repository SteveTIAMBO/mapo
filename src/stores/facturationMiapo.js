import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'
import { useAuthStore } from './auth'

/**
 * Store « facturation MAPO+ » (B2C) — liste des reçus/factures de l'utilisateur.
 * Distinct du store `facturation` (scolarité ERP côté école).
 *
 * Vrai compte : lu côté SERVEUR (mapo-offres.php action=factures), source de
 * vérité (une facture est écrite à la confirmation d'un paiement). Démo (pas de
 * compte) : liste LOCALE pour montrer le parcours (paiement → facture).
 */
export const useFacturationMiapoStore = defineStore('facturationMiapo', () => {
  const authStore = useAuthStore()
  const factures = ref([])
  // Cache/démo indexé par COMPTE : UID d'abord (jamais l'e-mail seul, cf. abonnement).
  const ownerKey = () => ((authStore.user?.uid && !authStore.isDemo) ? ('uid-' + authStore.user.uid) : (authStore.userProfile?.email || authStore.userProfile?.phone || 'demo'))
  const KEY = () => `mapo_factures_${ownerKey()}`

  async function tok() { try { return auth.currentUser ? await auth.currentUser.getIdToken() : null } catch { return null } }

  function loadLocal() {
    try { factures.value = JSON.parse(localStorage.getItem(KEY()) || '[]') } catch { factures.value = [] }
  }

  async function fetchFactures() {
    if (authStore.isDemo) { loadLocal(); return }
    const t = await tok()
    if (!t) { loadLocal(); return }
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'factures' }) })
      const d = await r.json().catch(() => ({}))
      factures.value = (d && d.ok && Array.isArray(d.factures)) ? d.factures : []
    } catch { loadLocal() }
  }

  /** Démo : ajoute une facture locale (appelé après un paiement simulé). */
  function ajouterDemo({ label, montant, devise, moyen, type }) {
    loadLocal()
    const n = factures.value.length + 1
    const inv = {
      id: 'inv_' + Date.now(),
      numero: 'MAPO-' + new Date().getFullYear() + '-' + String(n).padStart(5, '0'),
      date: new Date().toISOString(),
      label, montant, devise, moyen, type,
    }
    factures.value = [inv, ...factures.value]
    try { localStorage.setItem(KEY(), JSON.stringify(factures.value)) } catch { /* quota */ }
  }

  return { factures, fetchFactures, ajouterDemo }
})
