import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth as fbAuth } from '../firebase'

// ── Connecteurs MAPO+ : outils externes reliés au compte de l'apprenant ──
// Carré (notes de cours → lues par MIAPO). Le lien passe par « Se connecter
// avec Carré » (OAuth2 Authorization Code + PKCE). Les JETONS vivent CÔTÉ
// SERVEUR (mapo-carre.php), chiffrés, jamais dans le navigateur : le front ne
// fait que lancer le flux, interroger l'état, et lire les notes via le proxy.
const API = '/mapo-carre.php'
const CARRE_APP_URL = 'https://carre.app-edufrem.com'
const LINK_KEY = 'mapo_carre_linked'

export const useConnecteursStore = defineStore('connecteurs', () => {
  const linked = ref(false)
  try { linked.value = localStorage.getItem(LINK_KEY) === '1' } catch { /* silent */ }
  const busy = ref(false)
  const carreAppUrl = CARRE_APP_URL

  // Compat avec l'UI existante (plus de mode « aperçu » : c'est réel désormais).
  const carreConnected = computed(() => linked.value)
  const carrePreview = computed(() => false)

  function setLinked(v) {
    linked.value = !!v
    try { localStorage.setItem(LINK_KEY, v ? '1' : '0') } catch { /* silent */ }
  }

  async function authHeaders() {
    const user = fbAuth.currentUser
    const token = user ? await user.getIdToken().catch(() => null) : null
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = 'Bearer ' + token
    return h
  }

  // Interroge le serveur : le compte Carré est-il relié ?
  async function refreshStatus() {
    if (!fbAuth.currentUser) return
    try {
      const r = await fetch(`${API}?action=status`, { headers: await authHeaders() })
      const j = await r.json().catch(() => null)
      if (j && j.ok) setLinked(!!j.linked)
    } catch { /* réseau : on garde l'état en cache */ }
  }

  // Lance le flux OAuth : le serveur génère PKCE + state et renvoie l'URL Carré.
  async function connectCarre() {
    if (busy.value) return
    busy.value = true
    try {
      const r = await fetch(`${API}?action=start`, { method: 'POST', headers: await authHeaders(), body: '{}' })
      const j = await r.json().catch(() => null)
      if (j && j.ok && j.authorizeUrl) { window.location.href = j.authorizeUrl; return }
    } catch { /* ignore */ } finally { busy.value = false }
    return { ok: false }
  }

  // Retour de Carré : échange le code (via le serveur, qui stocke les jetons).
  async function completeCallback(code, state) {
    try {
      const r = await fetch(`${API}?action=callback`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify({ code, state }),
      })
      const j = await r.json().catch(() => null)
      if (j && j.ok && j.linked) { setLinked(true); return { ok: true } }
      return { ok: false, error: (j && j.error) || 'echec' }
    } catch { return { ok: false, error: 'reseau' } }
  }

  async function disconnectCarre() {
    setLinked(false)
    try { await fetch(`${API}?action=unlink`, { method: 'POST', headers: await authHeaders(), body: '{}' }) } catch { /* silent */ }
  }

  // ── Tolérance de format : le contrat renvoie des notes ; on accepte plusieurs
  //    enveloppes possibles sans supposer une seule forme. ──
  function extractNotes(data) {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object') {
      for (const k of ['notes', 'data', 'items', 'results']) if (Array.isArray(data[k])) return data[k]
    }
    return []
  }
  function extractContent(data) {
    if (!data) return ''
    if (typeof data === 'string') return data
    for (const k of ['content', 'texte', 'text', 'markdown', 'body', 'contenu']) {
      if (typeof data[k] === 'string' && data[k]) return data[k]
    }
    if (data.note) return extractContent(data.note)
    if (data.data) return extractContent(data.data)
    return ''
  }

  // Notes de cours de l'apprenant (pour alimenter le champ « cours » du chat).
  // Renvoie '' si non relié ou en cas d'erreur (MIAPO se rabat sur le reste).
  async function carreNotesText({ max = 3, q = '' } = {}) {
    if (!linked.value || !fbAuth.currentUser) return ''
    try {
      const h = await authHeaders()
      const url = `${API}?action=notes&limit=${max}${q ? '&q=' + encodeURIComponent(q) : ''}`
      const r = await fetch(url, { headers: h })
      const j = await r.json().catch(() => null)
      if (!j || !j.ok) { if (j && j.error === 'non_relie') setLinked(false); return '' }
      const notes = extractNotes(j.data).slice(0, max)
      const out = []
      for (const n of notes) {
        const id = n && (n.id || n.noteId || n._id)
        const title = (n && (n.title || n.titre)) || 'Note'
        let content = ''
        if (id) {
          const rr = await fetch(`${API}?action=note&id=${encodeURIComponent(id)}`, { headers: h })
          const jj = await rr.json().catch(() => null)
          if (jj && jj.ok) content = extractContent(jj.data)
        }
        if (!content) content = (n && (n.snippet || n.extrait)) || ''
        if (content) out.push(`• ${title}\n${content}`)
      }
      return out.join('\n\n').slice(0, 6000)
    } catch { return '' }
  }

  return {
    linked, busy, carreAppUrl, carreConnected, carrePreview,
    refreshStatus, connectCarre, completeCallback, disconnectCarre, carreNotesText,
  }
})
