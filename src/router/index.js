import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

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
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { requiresAuth: true, title: 'Configuration initiale' }
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
        meta: { title: 'Eleves' }
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
        meta: { title: 'Notes & Evaluations' }
      },
      {
        path: 'presences',
        name: 'Presences',
        component: () => import('../views/PresencesView.vue'),
        meta: { title: 'Presences' }
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
        meta: { title: 'Import de donnees' }
      },
      {
        path: 'parametres',
        name: 'Parametres',
        component: () => import('../views/ParametresView.vue'),
        meta: { title: 'Parametres ecole' }
      },
      {
        path: 'personnel',
        name: 'Personnel',
        component: () => import('../views/PersonnelView.vue'),
        meta: { title: 'Personnel' }
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

// Guard d'authentification + redirection onboarding
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
