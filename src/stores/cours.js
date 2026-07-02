import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'

/**
 * Store « Cours » — contenus pédagogiques publiés par les enseignants et mis à
 * disposition des élèves (et visibles en lecture seule par le directeur).
 * Un item = { id, matiere, classe, type, titre, contenu, corrige, url, auteur, createdAt }.
 *   type ∈ 'cours' | 'devoir' | 'examen' | 'ressource'
 * Persistance : école réelle → schools/{sid}/config/cours (réutilise les règles
 * du sous-espace config) ; démo → localStorage.
 * Prépa assistée : réutilise la tâche IA `pedagogie` (déjà déployée) via /mapo-ia.php.
 */

const IA_URL = '/mapo-ia.php'
const DEMO_KEY = 'mapo_cours_v1'

export const useCoursStore = defineStore('cours', () => {
  const items = ref([])
  const loaded = ref(false)
  const preparing = ref(false)

  function _ref(sid) { return doc(db, 'schools', sid, 'config', 'cours') }

  async function load() {
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      try { const s = JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); items.value = Array.isArray(s.items) ? s.items : demoSeed() } catch { items.value = demoSeed() }
      loaded.value = true
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) { items.value = []; loaded.value = true; return }
      const snap = await getDoc(_ref(sid))
      items.value = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : []
      loaded.value = true
    } catch { items.value = []; loaded.value = true }
  }

  async function save() {
    const authStore = useAuthStore()
    const data = JSON.parse(JSON.stringify(items.value))
    if (authStore.isDemo) { try { localStorage.setItem(DEMO_KEY, JSON.stringify({ items: data })) } catch { /* quota */ } return }
    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(_ref(sid), { items: data, updatedAt: new Date().toISOString() })
    } catch (e) { console.error('Erreur sauvegarde cours:', e) }
  }

  function publish({ matiere, classe = '', type = 'cours', titre, contenu = '', corrige = '', url = '' }) {
    const authStore = useAuthStore()
    const p = authStore.userProfile || {}
    const item = {
      id: 'co-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      matiere: String(matiere || '').trim(),
      classe: String(classe || '').trim(),
      type: ['cours', 'devoir', 'examen', 'ressource'].includes(type) ? type : 'cours',
      titre: String(titre || '').trim(),
      contenu: String(contenu || '').trim(),
      corrige: String(corrige || '').trim(),
      url: String(url || '').trim(),
      auteur: p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Enseignant',
      auteurId: p.uid || auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    }
    items.value.unshift(item)
    save()
    return item.id
  }

  function remove(id) { items.value = items.value.filter((x) => x.id !== id); save() }

  /** Items visibles pour une classe donnée (ceux sans classe = pour tous). */
  function forClasse(classe) {
    const c = String(classe || '').trim().toLowerCase()
    return items.value.filter((x) => !x.classe || x.classe.toLowerCase() === c)
  }

  /** Items publiés par un enseignant (par uid). */
  function forAuteur(uid) {
    return uid ? items.value.filter((x) => x.auteurId === uid) : items.value
  }

  /**
   * Prépare un cours / devoir / examen avec MIAPO (tâche `pedagogie`).
   * @returns {Promise<{ok, titre, document, corrige, reason?}>}
   */
  async function preparerAvecMiapo({ type = 'cours', matiere, niveau, theme = '' }) {
    preparing.value = true
    try {
      const user = auth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ task: 'pedagogie', data: { type, matiere, niveau, theme } }),
      })
      const json = await res.json().catch(() => null)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          preparing.value = false
          return { ok: true, titre: String(obj.titre || '').trim(), document: String(obj.document || '').trim(), corrige: String(obj.corrige || '').trim() }
        }
      }
      preparing.value = false
      return { ok: false, reason: json && json.error === 'not_configured' ? 'IA pas encore configurée' : 'MIAPO indisponible pour le moment.' }
    } catch {
      preparing.value = false
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  return { items, loaded, preparing, load, save, publish, remove, forClasse, forAuteur, preparerAvecMiapo }
})

function parseJsonObject(text) {
  if (!text) return null
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  try { return JSON.parse(t) } catch { return null }
}

// Petit échantillon démo (pour que l'onglet Cours ne soit pas vide en démo).
function demoSeed() {
  const now = Date.now()
  return [
    { id: 'co-demo1', matiere: 'Mathématiques', classe: '3ème A', type: 'cours', titre: 'Théorème de Pythagore', contenu: "Objectifs : reconnaître un triangle rectangle et appliquer le théorème.\nDéroulé : rappel, démonstration, exercices d'application.\nÀ retenir : dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés.", corrige: '', url: '', auteur: 'Joseph Tagne', auteurId: null, createdAt: new Date(now - 2 * 86400000).toISOString() },
    { id: 'co-demo2', matiere: 'Français', classe: '3ème A', type: 'devoir', titre: 'Rédaction — l\'argumentation', contenu: "Sujet : rédigez un texte argumentatif (20 lignes) défendant l'importance de la lecture.\nBarème : introduction /4, arguments /10, conclusion /3, langue /3.\nDurée : 1h.", corrige: '', url: '', auteur: 'Sylvie Mballa', auteurId: null, createdAt: new Date(now - 86400000).toISOString() },
    { id: 'co-demo3', matiere: 'SVT', classe: '3ème A', type: 'ressource', titre: 'Vidéo — la digestion', contenu: 'Une vidéo courte à regarder avant le prochain cours.', corrige: '', url: 'https://example.org/svt-digestion', auteur: 'Claire Ngo', auteurId: null, createdAt: new Date(now - 3 * 86400000).toISOString() },
  ]
}
