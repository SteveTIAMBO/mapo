import { ref, onMounted, onUnmounted, watch } from 'vue'
import { db, auth } from '../firebase'
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

// État réactif partagé (singleton entre composants)
const isOnline = ref(navigator.onLine)
const pendingSyncCount = ref(0)
const lastSyncTime = ref(null)
const onlineUsers = ref({}) // { [uid]: { displayName, role, lastSeen } }

// Sync queue state
const syncQueue = ref([])
const syncStatus = ref('idle') // 'idle' | 'syncing' | 'error'
const lastSyncError = ref(null)

// Firestore gère déjà la synchronisation offline via persistentLocalCache.
// Ce composable se concentre sur :
// 1. Détecter l'état de connexion (navigator.onLine + events)
// 2. Mettre à jour la présence utilisateur dans Firestore
// 3. Écouter les utilisateurs en ligne en temps réel
// 4. Gérer la queue de synchronisation pour les modifications offline

const SYNC_QUEUE_KEY = 'mapo_sync_queue'

// ── Présence utilisateur ──
let presenceUnsub = null

async function updatePresence(online) {
  const authStore = useAuthStore()
  if (authStore.isDemo) return

  const uid = auth.currentUser?.uid
  if (!uid) return

  try {
    await setDoc(doc(db, 'presence', uid), {
      online,
      lastSeen: serverTimestamp(),
      displayName: authStore.userProfile?.displayName || '',
      role: authStore.userProfile?.role || '',
      uid,
    }, { merge: true })
  } catch {
    // Échec silencieux — probablement hors ligne
  }
}

function listenToPresence() {
  const authStore = useAuthStore()
  if (authStore.isDemo) {
    onlineUsers.value = {
      'demo-admin': { displayName: 'Teussop Michel', role: 'directeur', online: true, lastSeen: new Date().toISOString() },
    }
    return
  }

  try {
    const q = query(collection(db, 'presence'), where('online', '==', true))
    presenceUnsub = onSnapshot(q, (snapshot) => {
      const users = {}
      snapshot.forEach(d => {
        users[d.id] = d.data()
      })
      onlineUsers.value = users
    }, () => {
      // Ignorer les erreurs silencieusement
    })
  } catch {
    // Pas de connexion
  }
}

function stopListeningPresence() {
  if (presenceUnsub) {
    presenceUnsub()
    presenceUnsub = null
  }
}

// ── Sync queue management ──
function loadSyncQueueFromStorage() {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY)
    if (stored) {
      syncQueue.value = JSON.parse(stored)
      pendingSyncCount.value = syncQueue.value.length
    }
  } catch (e) {
    console.error('Failed to load sync queue:', e)
  }
}

function saveSyncQueueToStorage() {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue.value))
  } catch (e) {
    console.error('Failed to save sync queue:', e)
  }
}

function addToSyncQueue(storeName, action, data) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'operation',
    storeName,
    action,
    data,
    timestamp: Date.now(),
  }
  syncQueue.value.push(item)
  pendingSyncCount.value = syncQueue.value.length
  saveSyncQueueToStorage()
}

async function processSyncQueue() {
  if (syncQueue.value.length === 0) {
    return true
  }

  if (!isOnline.value) {
    return false
  }

  syncStatus.value = 'syncing'
  lastSyncError.value = null

  try {
    // Process each item in the queue
    for (const item of syncQueue.value) {
      try {
        // Dispatch custom event or call appropriate sync function
        // This would typically call your API endpoint or Firestore write
        window.dispatchEvent(new CustomEvent('sync-queue-item', { detail: item }))

        // Wait a bit between items to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        console.error(`Failed to sync item ${item.id}:`, err)
        lastSyncError.value = err.message || 'Sync failed'
        syncStatus.value = 'error'
        return false
      }
    }

    // All items synced successfully
    syncQueue.value = []
    pendingSyncCount.value = 0
    lastSyncTime.value = new Date()
    saveSyncQueueToStorage()
    syncStatus.value = 'idle'
    return true
  } catch (err) {
    console.error('Sync queue processing error:', err)
    lastSyncError.value = err.message || 'Sync failed'
    syncStatus.value = 'error'
    return false
  }
}

function clearSyncQueue() {
  syncQueue.value = []
  pendingSyncCount.value = 0
  lastSyncError.value = null
  saveSyncQueueToStorage()
}

export function useConnectionStatus() {
  let handlersAttached = false

  function handleOnline() {
    isOnline.value = true
    updatePresence(true)
    // Auto-process sync queue when coming back online
    processSyncQueue()
  }

  function handleOffline() {
    isOnline.value = false
    updatePresence(false)
  }

  function handleBeforeUnload() {
    // Marquer hors ligne quand l'utilisateur ferme l'onglet
    if (navigator.sendBeacon && auth.currentUser?.uid) {
      // sendBeacon est plus fiable que setDoc dans beforeunload
      navigator.sendBeacon('/api/offline', JSON.stringify({ uid: auth.currentUser.uid }))
    }
    updatePresence(false)
  }

  onMounted(() => {
    if (!handlersAttached) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      window.addEventListener('beforeunload', handleBeforeUnload)
      handlersAttached = true
    }

    isOnline.value = navigator.onLine

    if (isOnline.value) {
      updatePresence(true)
    }

    listenToPresence()
    loadSyncQueueFromStorage()

    // Watch for online status changes
    watch(isOnline, (newVal) => {
      if (newVal && syncQueue.value.length > 0) {
        processSyncQueue()
      }
    })
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    handlersAttached = false
    stopListeningPresence()
  })

  return {
    isOnline,
    pendingSyncCount,
    lastSyncTime,
    onlineUsers,
    syncQueue,
    syncStatus,
    lastSyncError,
    addToSyncQueue,
    processSyncQueue,
    clearSyncQueue,
  }
}
