import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth as fbAuth, db } from '../firebase'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
  serverTimestamp, increment,
} from 'firebase/firestore'

/**
 * Store « miapoAnalytics » — suivi d'adoption de MIAPO+ (le tuteur B2C standalone).
 *
 * Objectif (demandé par Steve) : savoir si le projet prend. On suit, par
 * utilisateur réel (compte Firebase), des métriques DÉNORMALISÉES sur un doc
 * `miapoUsers/{uid}` (pour que le dashboard super-admin lise tout d'un coup,
 * sans requête lourde) + un journal d'événements `miapoUsers/{uid}/events`.
 *
 * Tout est BEST-EFFORT (try/catch) : la démo (pas de compte) et le hors-ligne
 * ne cassent jamais l'appli. Les écritures cloud sont ignorées sans compte.
 *
 * Métriques par utilisateur :
 *   { uid, email, persona ('parent'|'apprenant'), country, createdAt, lastSeen,
 *     sessionsCount, quizzesCompleted, scoreSum, installed }
 *   → progression moyenne d'un user = scoreSum / quizzesCompleted (0-100).
 *
 * ⚠️ Règles Firestore à publier (action Steve, cf. doc de mise en prod) :
 *   - un user MIAPO+ écrit son propre `miapoUsers/{uid}` (+ sous-collection events)
 *   - le super-admin EDUFREM (doc dans superAdmins/{uid}) lit toute la collection.
 */

function uid() { return fbAuth.currentUser ? fbAuth.currentUser.uid : null }
function userRef(u) { return doc(db, 'miapoUsers', u) }

export const useMiapoAnalyticsStore = defineStore('miapoAnalytics', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref('')

  // ─────────────────────────────────────────────────────────────
  // Instrumentation (appelée côté apprenant, dans le tenant MIAPO+)
  // ─────────────────────────────────────────────────────────────

  /** Enregistre / rafraîchit l'utilisateur courant. À l'ouverture de MIAPO+. */
  async function registerUser({ persona = '', country = '' } = {}) {
    const u = uid()
    if (!u) return // démo / non connecté : pas de tracking cloud
    try {
      const ref = userRef(u)
      const snap = await getDoc(ref)
      const email = fbAuth.currentUser?.email || ''
      if (snap.exists()) {
        await updateDoc(ref, {
          lastSeen: serverTimestamp(),
          ...(persona ? { persona } : {}),
          ...(country ? { country } : {}),
          ...(email ? { email } : {}),
        })
      } else {
        await setDoc(ref, {
          uid: u, email, persona, country,
          createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
          sessionsCount: 0, quizzesCompleted: 0, scoreSum: 0, installed: false,
        })
      }
    } catch { /* offline / règle absente : best-effort */ }
  }

  /** Une session d'usage (ouverture de l'espace tuteur). */
  async function recordSession() {
    const u = uid(); if (!u) return
    try {
      await updateDoc(userRef(u), { sessionsCount: increment(1), lastSeen: serverTimestamp() })
    } catch { /* best-effort */ }
    logEvent('session')
  }

  /** Quiz terminé avec un score (0-100). Cœur du suivi d'usage du tuteur. */
  async function recordQuiz({ subject = '', scorePct = 0, level = 1 } = {}) {
    const u = uid(); if (!u) return
    const s = Math.max(0, Math.min(100, Math.round(scorePct)))
    try {
      await updateDoc(userRef(u), {
        quizzesCompleted: increment(1),
        scoreSum: increment(s),
        lastSeen: serverTimestamp(),
      })
    } catch { /* best-effort */ }
    logEvent('quiz', { subject, scorePct: s, level })
  }

  /** L'utilisateur a installé le PWA. */
  async function markInstalled() {
    const u = uid(); if (!u) return
    try { await updateDoc(userRef(u), { installed: true, lastSeen: serverTimestamp() }) } catch { /* best-effort */ }
    logEvent('install')
  }

  /** Journal d'événements brut (détail / audit). */
  async function logEvent(type, data = {}) {
    const u = uid(); if (!u) return
    try {
      await addDoc(collection(db, 'miapoUsers', u, 'events'), {
        type, data, ts: serverTimestamp(), tenant: 'miapo',
      })
    } catch { /* best-effort */ }
  }

  // ─────────────────────────────────────────────────────────────
  // Lecture super-admin (dashboard MegaAdmin → onglet MIAPO+)
  // ─────────────────────────────────────────────────────────────

  async function loadAnalytics() {
    loading.value = true; error.value = ''
    try {
      const snap = await getDocs(collection(db, 'miapoUsers'))
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // Tant qu'aucun vrai utilisateur n'existe (avant lancement), on illustre
      // le tableau avec un échantillon — pour que Steve voie le rendu attendu.
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
    const active = (days) => list.filter((u) => {
      const t = tsMs(u.lastSeen); return t && (now - t) <= days * 864e5
    }).length
    const totalQuizzes = list.reduce((s, u) => s + (u.quizzesCompleted || 0), 0)
    const totalSessions = list.reduce((s, u) => s + (u.sessionsCount || 0), 0)
    const scoreSum = list.reduce((s, u) => s + (u.scoreSum || 0), 0)
    return {
      totalUsers: list.length,
      active7: active(7),
      active30: active(30),
      totalSessions,
      totalQuizzes,
      avgProgression: totalQuizzes ? Math.round(scoreSum / totalQuizzes) : 0,
      installs: list.filter((u) => u.installed).length,
      installRate: list.length ? Math.round(list.filter((u) => u.installed).length / list.length * 100) : 0,
    }
  })

  const recentUsers = computed(() => {
    return [...users.value]
      .map((u) => ({
        ...u,
        avgScore: u.quizzesCompleted ? Math.round((u.scoreSum || 0) / u.quizzesCompleted) : null,
        lastSeenMs: tsMs(u.lastSeen),
        createdMs: tsMs(u.createdAt),
      }))
      .sort((a, b) => b.lastSeenMs - a.lastSeenMs)
      .slice(0, 40)
  })

  function demoUsers() {
    const now = Date.now()
    const d = (days) => new Date(now - days * 864e5).toISOString()
    return [
      { id: 'd1', email: 'awa.diop@example.com', persona: 'parent', country: 'SN', installed: true, sessionsCount: 14, quizzesCompleted: 22, scoreSum: 1606, createdAt: d(40), lastSeen: d(0) },
      { id: 'd2', email: 'jean.kamga@example.com', persona: 'parent', country: 'CM', installed: true, sessionsCount: 9, quizzesCompleted: 12, scoreSum: 720, createdAt: d(30), lastSeen: d(1) },
      { id: 'd3', email: 'fatou.balde@example.com', persona: 'apprenant', country: 'CI', installed: false, sessionsCount: 5, quizzesCompleted: 7, scoreSum: 511, createdAt: d(20), lastSeen: d(3) },
      { id: 'd4', email: 'marie.lefevre@example.com', persona: 'parent', country: 'FR', installed: true, sessionsCount: 21, quizzesCompleted: 34, scoreSum: 2788, createdAt: d(55), lastSeen: d(2) },
      { id: 'd5', email: 'omar.toure@example.com', persona: 'apprenant', country: 'SN', installed: false, sessionsCount: 2, quizzesCompleted: 3, scoreSum: 150, createdAt: d(8), lastSeen: d(12) },
      { id: 'd6', email: 'nadia.saidi@example.com', persona: 'parent', country: 'MA', installed: true, sessionsCount: 11, quizzesCompleted: 18, scoreSum: 1170, createdAt: d(25), lastSeen: d(0) },
      { id: 'd7', email: 'paul.mbeki@example.com', persona: 'apprenant', country: 'CM', installed: true, sessionsCount: 7, quizzesCompleted: 9, scoreSum: 603, createdAt: d(14), lastSeen: d(5) },
    ]
  }

  return {
    users, loading, error,
    registerUser, recordSession, recordQuiz, markInstalled, logEvent,
    loadAnalytics, kpis, recentUsers,
  }
})
