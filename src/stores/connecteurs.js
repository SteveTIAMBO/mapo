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
   * ⚠️ LE CHOIX DU DOSSIER A DÉMÉNAGÉ DANS CARRÉ (29/08/2026).
   *
   * MAPO+ avait son propre sélecteur de dossier. Carré a livré mieux : le
   * dossier se choisit **pendant la connexion OAuth**, et le jeton délivré est
   * CLOISONNÉ dessus, côté serveur. `/notes` et `/folders` ne voient plus que
   * ce dossier, quels que soient les paramètres envoyés par le client.
   *
   * C'est plus sûr que ce que j'avais fait — un périmètre appliqué côté client
   * n'est pas un périmètre — et ça supprime tout un écran. Le sélecteur MAPO+ a
   * donc été retiré : le laisser aurait fait croire qu'on peut changer de
   * dossier depuis ici, alors qu'il faut refaire la connexion.
   */

  /**
   * L'arborescence AUTORISÉE : { racine, modules }.
   *
   * Le jeton porte une BRANCHE — le dossier choisi à la connexion et tous ses
   * sous-dossiers. `/folders` renvoie donc :
   *
   *   { folders: [ { id, name, parentId, spaceId } ], count }
   *
   * La racine est le dossier partagé (« MBA »), ses ENFANTS sont les modules
   * de la formation (« Gouvernance », « Droit »…). C'est là que MAPO+ trouve
   * la liste des cours, sans deviner aucun identifiant.
   *
   * ⚠️ J'AVAIS CODÉ UNE AUTRE FORME, ET ELLE ÉTAIT FAUSSE. Je l'avais déduite
   * du connecteur MCP de Carré — un AUTRE client, avec son propre jeton — au
   * lieu de l'endpoint que MAPO+ appelle vraiment. Deux clients d'une même API
   * ne voient pas la même chose. Le parseur reste tolérant (tableau nu ou objet
   * enveloppant), mais la forme de référence est celle ci-dessus.
   */
  async function carreArborescence() {
    const vide = { racine: null, modules: [] }
    if (!linked.value || !fbAuth.currentUser) return vide
    try {
      const h = await authHeaders()
      const r = await fetch(`${API}?action=folders`, { headers: h })
      const j = await r.json().catch(() => null)
      if (!j || !j.ok) { if (j && j.error === 'non_relie') setLinked(false); return vide }
      const d = j.data
      const brut = Array.isArray(d) ? d
        : (Array.isArray(d?.folders) ? d.folders : (Array.isArray(d?.personal) ? [...d.personal, ...(d.shared || [])] : []))
      const dossiers = brut
        .map((f) => ({ id: String(f?.id || ''), nom: String(f?.name || '').trim(), parentId: f?.parentId ?? null }))
        .filter((f) => f.nom)
      if (!dossiers.length) return vide
      // Racine = le dossier SANS parent. À défaut (forme inattendue), le premier :
      // mieux vaut un rattachement approximatif qu'une liste vide sans explication.
      const racine = dossiers.find((f) => !f.parentId) || dossiers[0]
      // ⚠️ SON CARRÉ CONTIENT DE VRAIS DOUBLONS (mesuré le 28/08 : « Leadership »
      // et « Entrepreneuriat - Stéphan » deux fois). Deux cases identiques dans
      // la liste seraient cochées ensemble — on n'en garde qu'une. Conséquence
      // assumée : `carreNotesModule` ne lira que le PREMIER des deux dossiers.
      const vus = new Set()
      const modules = dossiers
        .filter((f) => f.id !== racine.id)
        .filter((f) => { const c = f.nom.toLowerCase(); if (vus.has(c)) return false; vus.add(c); return true })
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      return { racine, modules }
    } catch { return vide }
  }

  /**
   * Notes de cours en texte, pour ancrer une révision.
   *
   * `folderId` cible UN module précis à l'intérieur de la branche autorisée —
   * c'est ce qui remplace enfin la recherche par mot-clé, dont j'avais mesuré
   * qu'elle ramenait des comptes rendus de réunion contenant le mot cherché.
   */
  async function carreNotesText({ max = 3, q = '', folderId = '' } = {}) {
    if (!linked.value || !fbAuth.currentUser) return ''
    // Périmètre de synchro choisi par l'apprenant (dossier/mot-clé) : évite
    // d'aspirer des notes Carré sans rapport avec les cours. Cf. « Cours ».
    // ⚠️ `q` n'est PLUS un « périmètre » : c'est le sujet qu'on révise.
    //
    // Le périmètre est désormais porté par le JETON (cloisonné sur le dossier
    // choisi dans Carré à la connexion) : `/notes` ne renvoie que ce dossier,
    // sans qu'on ait à le demander. `q` ne sert donc plus qu'à cibler À
    // L'INTÉRIEUR — utile quand le dossier autorisé contient tous les cours.
    //
    // L'ancien `mapo_carre_scope` (champ de texte libre) reste lu en dernier
    // recours, pour les comptes dont le jeton date d'avant le cloisonnement :
    // sans lui, on leur remonterait les 3 notes les plus RÉCENTES de tout le
    // compte, ce qui est pire que rien.
    // ⚠️ Le repli par mot-clé ne sert QUE faute de dossier ciblé : c'est lui
    // qui ramenait des comptes rendus de réunion.
    if (!q && !folderId) { try { q = localStorage.getItem('mapo_carre_scope') || '' } catch { q = '' } }
    try {
      const h = await authHeaders()
      const url = `${API}?action=notes&limit=${max}`
        + (q ? '&q=' + encodeURIComponent(q) : '')
        + (folderId ? '&folderId=' + encodeURIComponent(folderId) : '')
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

  /**
   * Notes du module dont le nom correspond à `matiere`, dans la branche Carré.
   *
   * ⚠️ C'EST LE MAILLON QUI MANQUAIT. Les notes Carré n'alimentaient que le
   * CHAT ; le quiz, lui, ne voyait que les cours importés à la main dans MAPO+.
   * Autrement dit, tout le contenu du MBA rangé dans Carré ne servait à aucune
   * révision.
   *
   * Le rapprochement se fait sur le NOM du dossier, insensible à la casse et
   * aux accents. Pas de correspondance → on ne renvoie rien : mieux vaut un
   * quiz cadré par le référentiel qu'un quiz ancré sur le mauvais module.
   */
  async function carreNotesModule(matiere, { max = 3 } = {}) {
    const m = String(matiere || '').trim()
    if (!m || !linked.value) return ''
    const cle = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
    const { modules } = await carreArborescence()
    const trouve = modules.find((d) => cle(d.nom) === cle(m))
    if (!trouve || !trouve.id) return ''
    return carreNotesText({ max, folderId: trouve.id })
  }

  return {
    linked, busy, carreAppUrl, carreConnected, carrePreview,
    refreshStatus, connectCarre, completeCallback, disconnectCarre, carreNotesText,
    carreArborescence, carreNotesModule,
  }
})
