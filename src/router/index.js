import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

// Résolution de l'état auth avant la navigation
const getCurrentUser = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Tableau de bord' }
      },
      {
        path: 'eleves',
        name: 'Eleves',
        component: () => import('../views/ElevesView.vue'),
        meta: { title: 'Élèves' }
      },
      {
        path: 'classes',
        name: 'Classes',
        component: () => import('../views/ClassesView.vue'),
        meta: { title: 'Classes' }
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('../views/NotesView.vue'),
        meta: { title: 'Notes & Évaluations' }
      },
      {
        path: 'presences',
        name: 'Presences',
        component: () => import('../views/PresencesView.vue'),
        meta: { title: 'Présences' }
      },
      {
        path: 'emploi-du-temps',
        name: 'EmploiDuTemps',
        component: () => import('../views/EmploiDuTempsView.vue'),
        meta: { title: 'Emploi du temps' }
      },
      {
        path: 'discipline',
        name: 'Discipline',
        component: () => import('../views/DisciplineView.vue'),
        meta: { title: 'Discipline' }
      },
      {
        path: 'facturation',
        name: 'Facturation',
        component: () => import('../views/FacturationView.vue'),
        meta: { title: 'Facturation' }
      },
      {
        path: 'rapports',
        name: 'Rapports',
        component: () => import('../views/RapportsView.vue'),
        meta: { title: 'Rapports' }
      },
      {
        path: 'import',
        name: 'Import',
        component: () => import('../views/ImportView.vue'),
        meta: { title: 'Import de données' }
      },
      {
        path: 'parametres',
        name: 'Parametres',
        component: () => import('../views/ParametresView.vue'),
        meta: { title: 'Paramètres école' }
      },
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard d'authentification
router.beforeEach(async (to) => {
  const requiresAuth = to.meta.requiresAuth !== false
  const user = await getCurrentUser()

  if (requiresAuth && !user) {
    return { name: 'Login' }
  }
  if (to.name === 'Login' && user) {
    return { name: 'Dashboard' }
  }
})

export default router
