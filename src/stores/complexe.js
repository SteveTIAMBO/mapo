import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

/**
 * Store « complexe scolaire ».
 *
 * Un COMPLEXE = un même propriétaire/direction qui gère PLUSIEURS écoles
 * rattachées : typiquement une section francophone + une section anglophone
 * (Cameroun bilingue), ou un primaire + un secondaire (+ parfois un supérieur).
 * Chaque école reste un tenant MAPO isolé (`schools/{schoolId}` + sous-collections),
 * mais le directeur de complexe a besoin d'une VUE CONSOLIDÉE sur toutes ses écoles.
 *
 * ⚠️ À distinguer de NOVA (agrégation d'écoles INDÉPENDANTES, vue ministère).
 * Ici : UN propriétaire, N sous-écoles → agrégation « groupe » DANS MAPO.
 *
 * Modèle de données visé (Firestore) :
 *   - `schools/{schoolId}` gagne un champ `complexeId`.
 *   - le compte directeur de complexe porte `userProfile.complexeId`.
 *   → on lit `schools where complexeId == X` puis on compte élèves/personnel
 *     par école (même approche que le méga-admin EDUFREM).
 *
 * Sans donnée réelle (démo / preview), on affiche un complexe d'exemple riche
 * pour que la vue soit immédiatement démontrable.
 */

// Types de sous-école (clé i18n `cx.types.*` côté vue).
export const SCHOOL_TYPES = ['francophone', 'anglophone', 'primaire', 'secondaire', 'superieur']

function demoComplexe() {
  return {
    identity: {
      name: 'Complexe Scolaire Bilingue La Réussite',
      ville: 'Yaoundé',
      pays: 'Cameroun',
      directeur: 'Mme Ngo Bell Épouse',
    },
    schools: [
      { id: 'lareussite-fr', slug: 'lareussite-fr', name: 'Collège La Réussite — Section Francophone', type: 'francophone', edition: 'secondaire', eleves: 642, personnel: 38, directeur: 'M. Atangana Paul', recettes: 96300000 },
      { id: 'lareussite-en', slug: 'lareussite-en', name: 'La Réussite Bilingual College — English Section', type: 'anglophone', edition: 'secondaire', eleves: 418, personnel: 27, directeur: 'Mr. Ashu Divine', recettes: 62700000 },
      { id: 'lareussite-prim', slug: 'lareussite-prim', name: 'École Primaire La Réussite', type: 'primaire', edition: 'primaire', eleves: 531, personnel: 24, directeur: 'Mme Fotso Claire', recettes: 53100000 },
    ],
  }
}

export const useComplexeStore = defineStore('complexe', () => {
  const identity = ref({ name: '', ville: '', pays: '', directeur: '' })
  const schools = ref([])
  const loading = ref(false)
  const isDemo = ref(true)
  const error = ref('')

  // ── Agrégats consolidés ────────────────────────────────────────────────
  const totalSchools = computed(() => schools.value.length)
  const totalEleves = computed(() => schools.value.reduce((s, e) => s + (e.eleves || 0), 0))
  const totalPersonnel = computed(() => schools.value.reduce((s, e) => s + (e.personnel || 0), 0))
  const totalRecettes = computed(() => schools.value.reduce((s, e) => s + (e.recettes || 0), 0))
  const maxEleves = computed(() => Math.max(1, ...schools.value.map((e) => e.eleves || 0)))
  // Nombre de « natures » distinctes (bilingue, multi-cycle…) présentes.
  const typesPresents = computed(() => [...new Set(schools.value.map((e) => e.type))])

  function url(school) {
    // Chaque sous-école est servie sur son sous-domaine <slug>.app-edufrem.com.
    if (school.url) return school.url
    if (school.slug) return `https://${school.slug}.app-edufrem.com`
    return null
  }

  function openSchool(school) {
    const u = url(school)
    if (u && typeof window !== 'undefined') window.open(u, '_blank', 'noopener')
  }

  function seedDemo() {
    const d = demoComplexe()
    identity.value = d.identity
    schools.value = d.schools
    isDemo.value = true
  }

  /**
   * Charge le complexe du directeur connecté depuis Firestore.
   * Best-effort : sans complexeId / hors Firebase / en démo → exemple seedé.
   */
  async function load() {
    loading.value = true
    error.value = ''
    try {
      const auth = useAuthStore()
      const complexeId = auth.userProfile?.complexeId
      if (auth.isDemo || !complexeId) { seedDemo(); return }

      // Écoles rattachées au complexe.
      const snap = await getDocs(query(collection(db, 'schools'), where('complexeId', '==', complexeId)))
      if (snap.empty) { seedDemo(); return }

      const rows = []
      for (const docSnap of snap.docs) {
        const data = docSnap.data() || {}
        const sid = docSnap.id
        let eleves = 0
        let personnel = 0
        try { eleves = (await getCountFromServer(collection(db, 'schools', sid, 'eleves'))).data().count } catch { /* ignore */ }
        try { personnel = (await getCountFromServer(collection(db, 'schools', sid, 'personnel'))).data().count } catch { /* ignore */ }
        rows.push({
          id: sid,
          slug: data.slug || sid,
          name: data.schoolName || data.name || sid,
          type: data.complexeType || data.type || (data.edition === 'primaire' ? 'primaire' : 'secondaire'),
          edition: data.edition || 'secondaire',
          eleves,
          personnel,
          directeur: data.directeurNom || data.directeur || '',
          recettes: data.recettes || 0,
        })
      }
      rows.sort((a, b) => (b.eleves || 0) - (a.eleves || 0))
      schools.value = rows
      // Le nom du complexe est porté par les docs école (champ complexeName, posé
      // par le super-admin EDUFREM), avec repli sur le profil du directeur.
      const nameFromSchools = snap.docs.map((d) => d.data()?.complexeName).find(Boolean)
      identity.value = {
        name: nameFromSchools || auth.userProfile?.complexeName || 'Mon complexe scolaire',
        ville: auth.userProfile?.ville || '',
        pays: auth.userProfile?.pays || '',
        directeur: auth.displayName || '',
      }
      isDemo.value = false
    } catch (e) {
      error.value = String(e?.message || e)
      seedDemo()
    } finally {
      loading.value = false
    }
  }

  return {
    identity, schools, loading, isDemo, error,
    totalSchools, totalEleves, totalPersonnel, totalRecettes, maxEleves, typesPresents,
    url, openSchool, seedDemo, load,
  }
})
