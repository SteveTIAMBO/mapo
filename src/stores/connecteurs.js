import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Connecteurs MAPO+ : outils externes que l'apprenant relie à son compte ──
// Premier connecteur : Carré (notes de cours → lues par MIAPO). Le lien passe
// par un flux « Se connecter avec Carré » (OAuth2). Tant que l'API SSO de Carré
// n'est pas en ligne, on reste en mode « aperçu » : l'UI montre l'état connecté
// mais aucune donnée réelle n'est lue. Dès que Carré fournit le client_id + les
// endpoints (voir le prompt PROMPT_Carre_API_SSO), remplir CARRE ci-dessous et
// le vrai flux s'active sans autre changement d'UI.
const CARRE = {
  clientId: '', // ← fourni par Carré à l'enregistrement du client MAPO+. Vide = mode aperçu.
  authorizeUrl: 'https://carre.app-edufrem.com/oauth/authorize',
  apiBase: 'https://carre.app-edufrem.com/api/v1',
  scope: 'notes:read',
}
const CARRE_APP_URL = 'https://carre.app-edufrem.com'
const KEY = 'mapo_connecteurs_carre'

export const useConnecteursStore = defineStore('connecteurs', () => {
  // status : 'disconnected' | 'preview' | 'connected'
  const carre = ref({ status: 'disconnected', account: '', at: '', token: '' })
  try { const raw = localStorage.getItem(KEY); if (raw) carre.value = { ...carre.value, ...JSON.parse(raw) } } catch { /* silent */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(carre.value)) } catch { /* silent */ } }

  const carreConfigured = computed(() => !!CARRE.clientId)
  const carreConnected = computed(() => carre.value.status === 'connected' || carre.value.status === 'preview')
  const carrePreview = computed(() => carre.value.status === 'preview')
  const carreAppUrl = CARRE_APP_URL

  // Lance la connexion. Si l'API Carré est configurée → vraie redirection OAuth.
  // Sinon → aperçu (permet de prévisualiser l'UI en attendant l'API).
  function connectCarre() {
    if (carreConfigured.value) {
      const redirectUri = window.location.origin + '/parametres?carre=callback'
      const state = Math.random().toString(36).slice(2)
      try { sessionStorage.setItem('carre_oauth_state', state) } catch { /* silent */ }
      const u = new URL(CARRE.authorizeUrl)
      u.searchParams.set('client_id', CARRE.clientId)
      u.searchParams.set('redirect_uri', redirectUri)
      u.searchParams.set('response_type', 'code')
      u.searchParams.set('scope', CARRE.scope)
      u.searchParams.set('state', state)
      window.location.href = u.toString()
      return { mode: 'redirect' }
    }
    carre.value = { status: 'preview', account: 'Aperçu', at: new Date().toISOString(), token: '' }
    persist()
    return { mode: 'preview' }
  }

  function disconnectCarre() {
    carre.value = { status: 'disconnected', account: '', at: '', token: '' }
    persist()
  }

  // Notes de cours de l'apprenant (pour alimenter le chat tuteur de MIAPO).
  // Renvoie '' tant que la connexion réelle n'est pas établie (aperçu / non relié).
  async function carreNotesText({ max = 3 } = {}) {
    if (carre.value.status !== 'connected' || !carreConfigured.value || !carre.value.token) return ''
    try {
      const res = await fetch(`${CARRE.apiBase}/notes?limit=${max}`, {
        headers: { Authorization: 'Bearer ' + carre.value.token },
      })
      if (!res.ok) return ''
      const data = await res.json().catch(() => null)
      const notes = Array.isArray(data?.notes) ? data.notes : []
      return notes.slice(0, max)
        .map((n) => `• ${n.titre || n.title || 'Note'} : ${n.extrait || n.texte || n.content || ''}`.trim())
        .join('\n')
    } catch { return '' }
  }

  return {
    carre, carreConfigured, carreConnected, carrePreview, carreAppUrl,
    connectCarre, disconnectCarre, carreNotesText,
  }
})
