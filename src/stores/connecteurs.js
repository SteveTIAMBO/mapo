import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth as fbAuth } from '../firebase'

// ── Connecteurs MAPO+ : outils externes reliés au compte de l'apprenant ──
// Carré (notes de cours → lues par MIAPO). Le lien passe par « Se connecter
// avec Carré » (OAuth2 Authorization Code + PKCE). Les JETONS vivent CÔTÉ
// SERVEUR (mapo-carre.php), chiffrés, jamais dans le navigateur : le front ne
// fait que lancer le flux, interroger l'état, et lire les notes via le proxy.
const API = '/mapo-carre.php'
const CARRE_APP_URL = 'https://carre.app-edufrem.com/app'
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
  /**
   * Dossiers de classement de Carré, groupés par espace.
   *
   * ⚠️ POURQUOI ÇA CHANGE TOUT (mesuré sur le Carré réel de Steve, 28/08).
   * Son espace « MBA » contient 24 dossiers, et chacun porte le nom d'un
   * module : Gouvernance, Stratégie financière, Leadership, Droit, Design
   * Sprint… **La liste des modules de sa formation existe déjà**, écrite par
   * lui. MAPO+ la faisait DEVINER par l'IA à partir du seul intitulé de la
   * formation — alors qu'il suffisait de la lire.
   *
   * ⚠️ On ne coche RIEN d'office : plusieurs dossiers ne sont pas des modules
   * (« Pitchs », « KickOff », « Chef d'œuvre », noms de projets), et rien ne
   * permet de les distinguer automatiquement. On propose, la personne valide.
   *
   * Les doublons sont fusionnés : « Leadership » apparaît deux fois dans son
   * espace, « Entrepreneuriat - Stéphan » aussi.
   */
  /**
   * Dossier de cours choisi par l'apprenant : { id, nom, espace }.
   *
   * ⚠️ REMPLACE un champ de TEXTE LIBRE (« périmètre : dossier / mot-clé ») où
   * il fallait deviner quoi taper, sans savoir ce qui existait dans son Carré.
   *
   * ⚠️ LIMITE CONNUE, à lever côté Carré. `id` est enregistré dès aujourd'hui,
   * mais l'API Carré ne sait pas encore filtrer les notes par dossier
   * (`/api/v1/notes` n'accepte que `q` et `limit`). En attendant, c'est le NOM
   * du dossier qui sert de mot-clé — donc un ciblage imparfait : une recherche
   * « Gouvernance » ramène aussi des comptes rendus de réunion qui contiennent
   * le mot. Choisir dans une liste reste très supérieur à taper à l'aveugle, et
   * le jour où l'API accepte `folderId`, l'identifiant est déjà là.
   * Cf. DEMANDE-CARRE-notes-par-dossier.md.
   */
  const CLE_DOSSIER = 'mapo_carre_dossier'
  const dossierCours = ref(null)
  try { dossierCours.value = JSON.parse(localStorage.getItem(CLE_DOSSIER) || 'null') } catch { dossierCours.value = null }

  function choisirDossier(d) {
    dossierCours.value = d && d.nom ? { id: d.id || '', nom: d.nom, espace: d.espace || '' } : null
    try {
      if (dossierCours.value) localStorage.setItem(CLE_DOSSIER, JSON.stringify(dossierCours.value))
      else localStorage.removeItem(CLE_DOSSIER)
    } catch { /* quota : le choix reste en mémoire pour la session */ }
  }

  /** Liste PLATE de tous les dossiers (partagés et personnels), pour le choix. */
  async function carreDossiersPlats() {
    const groupes = await carreFolders()
    const out = []
    for (const g of groupes) for (const nom of g.dossiers) out.push({ espace: g.espace, nom })
    return out
  }

  async function carreFolders() {
    if (!linked.value || !fbAuth.currentUser) return []
    try {
      const h = await authHeaders()
      const r = await fetch(`${API}?action=folders`, { headers: h })
      const j = await r.json().catch(() => null)
      if (!j || !j.ok) { if (j && j.error === 'non_relie') setLinked(false); return [] }
      const d = j.data || {}
      const brut = [
        ...(Array.isArray(d.personal) ? d.personal : []),
        ...(Array.isArray(d.shared) ? d.shared : []),
      ]
      const espaces = new Map()
      for (const f of brut) {
        const nom = String(f?.name || '').trim()
        if (!nom) continue
        const espace = String(f?.spaceName || '').trim() || 'Mes dossiers'
        if (!espaces.has(espace)) espaces.set(espace, new Set())
        espaces.get(espace).add(nom)
      }
      return [...espaces.entries()]
        .map(([espace, noms]) => ({ espace, dossiers: [...noms].sort((a, b) => a.localeCompare(b, 'fr')) }))
        .sort((a, b) => b.dossiers.length - a.dossiers.length)
    } catch { return [] }
  }

  async function carreNotesText({ max = 3, q = '' } = {}) {
    if (!linked.value || !fbAuth.currentUser) return ''
    // Périmètre de synchro choisi par l'apprenant (dossier/mot-clé) : évite
    // d'aspirer des notes Carré sans rapport avec les cours. Cf. « Cours ».
    // Périmètre : le dossier CHOISI d'abord (son nom sert de mot-clé tant que
    // l'API Carré ne filtre pas par `folderId`), sinon l'ancien champ libre —
    // gardé pour ne pas casser les comptes qui l'avaient renseigné.
    if (!q) q = dossierCours.value?.nom || ''
    if (!q) { try { q = localStorage.getItem('mapo_carre_scope') || '' } catch { q = '' } }
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
    refreshStatus, connectCarre, completeCallback, disconnectCarre, carreNotesText, carreFolders,
    dossierCours, choisirDossier, carreDossiersPlats,
  }
})
