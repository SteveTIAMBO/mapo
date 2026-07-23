import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'

/**
 * Store « mapoplusUsers » — registre des comptes MAPO+ (B2C).
 *
 * Lecture super-admin uniquement (MegaAdmin → onglet « Comptes MAPO+ »).
 * Source = collection Firestore `mapoplus_users/{uid}`, écrite à l'inscription
 * par auth.js (signUpWithEmail, meta.b2c). Champs :
 *   { uid, email, displayName, persona ('parent'|'apprenant'), pays, source,
 *     createdAt, lastSeenAt }   (createdAt/lastSeenAt = Firestore Timestamp)
 *
 * Best-effort (try/catch) : hors-ligne ou règle absente → échantillon de démo,
 * pour que le tableau reste lisible avant les premières inscriptions réelles.
 */

export const useMapoplusUsersStore = defineStore('mapoplusUsers', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref('')

  async function loadUsers() {
    loading.value = true; error.value = ''
    try {
      const snap = await getDocs(collection(db, 'mapoplus_users'))
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      users.value = list.length ? list : demoUsers()
    } catch {
      users.value = demoUsers()
    } finally {
      loading.value = false
    }
  }

  function tsMs(v) {
    if (!v) return 0
    if (typeof v === 'object' && v.seconds) return v.seconds * 1000 // Firestore Timestamp
    const t = new Date(v).getTime()
    return isNaN(t) ? 0 : t
  }

  const kpis = computed(() => {
    const list = users.value
    const now = Date.now()
    const within = (ms, days) => ms && (now - ms) <= days * 864e5
    let parents = 0, apprenants = 0, actifs7 = 0, nouveaux7 = 0
    const pays = new Set()
    for (const u of list) {
      if (u.persona === 'apprenant') apprenants++
      else parents++
      if (within(tsMs(u.lastSeenAt), 7)) actifs7++
      if (within(tsMs(u.createdAt), 7)) nouveaux7++
      if (u.pays) pays.add(u.pays)
    }
    return { totalUsers: list.length, parents, apprenants, actifs7, nouveaux7, pays: pays.size }
  })

  const recentUsers = computed(() => {
    return [...users.value]
      .map((u) => ({ ...u, createdMs: tsMs(u.createdAt), lastSeenMs: tsMs(u.lastSeenAt) }))
      .sort((a, b) => b.createdMs - a.createdMs)
      .slice(0, 60)
  })

  function demoUsers() {
    const now = Date.now()
    const d = (days) => new Date(now - days * 864e5).toISOString()
    return [
      { id: 'd1', email: 'awa.diop@example.com', displayName: 'Awa Diop', persona: 'parent', pays: 'SN', source: 'mapo+', createdAt: d(12), lastSeenAt: d(0) },
      { id: 'd2', email: 'jean.kamga@example.com', displayName: 'Jean Kamga', persona: 'parent', pays: 'CM', source: 'mapo+', createdAt: d(9), lastSeenAt: d(1) },
      { id: 'd3', email: 'fatou.balde@example.com', displayName: 'Fatou Baldé', persona: 'apprenant', pays: 'CI', source: 'mapo+', createdAt: d(6), lastSeenAt: d(2) },
      { id: 'd4', email: 'marie.lefevre@example.com', displayName: 'Marie Lefèvre', persona: 'parent', pays: 'FR', source: 'mapo+', createdAt: d(4), lastSeenAt: d(0) },
      { id: 'd5', email: 'omar.toure@example.com', displayName: 'Omar Touré', persona: 'apprenant', pays: 'SN', source: 'mapo+', createdAt: d(2), lastSeenAt: d(1) },
    ]
  }

  return { users, loading, error, loadUsers, kpis, recentUsers }
})
