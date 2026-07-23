import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePermissionsStore } from '../stores/permissions'
import { useEditionStore } from '../stores/edition'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { getTenant, isMiapoTenant } from '../utils/tenantContext'
import { i18n } from '../i18n'

// Titres d'onglet (document.title) FR/EN : la valeur meta.title reste en FR
// (compat) et on la traduit ici via sa clé rt.* au moment de la navigation.
const TITLE_KEYS = {
  'Administration EDUFREM': 'rt.adminEdufrem', 'Administration MAPO': 'rt.adminMapo',
  'Alertes parents': 'rt.alertes', 'Bienvenue': 'rt.welcome', 'Classes': 'rt.classes',
  'Comptabilité': 'rt.compta', 'Compte non configuré': 'rt.compteNonConfig',
  'Configuration initiale': 'rt.configInit', 'Devoirs': 'rt.devoirs',
  'Diplômes vérifiables': 'rt.diplomes', 'Discipline': 'rt.discipline',
  'Emploi du temps': 'rt.edt', 'Enseignement Supérieur': 'rt.superieur',
  'Examens nationaux': 'rt.examens', 'Gestion des accès': 'rt.acces',
  'Import de données': 'rt.import', 'Inscriptions': 'rt.inscriptions',
  'Matières & Coefficients': 'rt.matieres', 'Mes notes': 'rt.mesNotes',
  'Mes présences': 'rt.mesPresences', 'Messagerie': 'rt.messagerie',
  'Mon espace': 'rt.monEspace', 'Mon profil': 'rt.monProfil', 'Mon salaire': 'rt.monSalaire',
  'Notes & Bulletins': 'rt.notesBulletins', 'Notes & Évaluations': 'rt.notesEval',
  'Paiements': 'rt.paiements', 'Paramètres école': 'rt.paramEcole',
  "Passage d'année scolaire": 'rt.passageAnnee', 'Personnel': 'rt.personnel',
  'Présences': 'rt.presences', 'Rapports': 'rt.rapports', 'Révisions': 'rt.revisions',
  'Rôles & Permissions': 'rt.roles', 'Suivi des révisions': 'rt.suiviRevisions',
  'Suivi du décrochage': 'rt.suiviDecrochage', 'Tableau de bord': 'rt.dashboard',
  'Vérifier un diplôme': 'rt.verifierDiplome', 'Élèves': 'rt.eleves',
}
function localizedTitle(raw) {
  const k = raw && TITLE_KEYS[raw]
  return k ? i18n.global.t(k) : raw
}

// Mapping route path → permission module key
const ROUTE_PERMISSION_MAP = {
  'eleves': 'eleves',
  'classes': 'classes',
  'matieres': 'matieres',
  'notes': 'notes',
  'examens': 'notes',
  'diplomes': 'notes',
  'presences': 'presences',
  'emploi-du-temps': 'emploi-du-temps',
  'devoirs': 'devoirs',
  'discipline': 'discipline',
  'messagerie': 'messagerie',
  'alertes': 'messagerie',
  'salaire': 'salaire',
  'personnel': 'personnel',
  'facturation': 'facturation',
  'rapports': 'rapports',
  'import': 'import',
  'parametres': 'parametres',
  'roles': 'roles',
  'acces': 'roles',
  'inscriptions': 'eleves',
  'transition-annee': 'parametres',
}

const routes = [
  {
    path: '/bienvenue',
    name: 'Welcome',
    component: () => import('../views/WelcomeView.vue'),
    meta: { requiresAuth: false, title: 'Bienvenue' }
  },
  {
    path: '/superieur',
    name: 'Superieur',
    component: () => import('../views/SuperieurView.vue'),
    meta: { requiresAuth: false, title: 'Enseignement Supérieur' }
  },
  {
    path: '/miapo',
    name: 'MiapoWelcome',
    component: () => import('../views/MiapoWelcomeView.vue'),
    meta: { requiresAuth: false, title: 'MAPO+' }
  },
  {
    // Retour du flux OAuth « Se connecter avec Carré ».
    path: '/oauth/carre/callback',
    name: 'CarreCallback',
    component: () => import('../views/CarreCallbackView.vue'),
    meta: { requiresAuth: false, title: 'Carré' }
  },
  {
    path: '/verifier',
    name: 'VerifierDiplome',
    component: () => import('../views/VerifierDiplomeView.vue'),
    meta: { requiresAuth: false, title: 'Vérifier un diplôme' }
  },
  {
    path: '/preinscription',
    name: 'Preinscription',
    component: () => import('../views/superieur/SupPreinscription.vue'),
    meta: { requiresAuth: false, title: 'Pré-inscription' }
  },
  {
    path: '/complexe',
    name: 'ComplexeAdmin',
    component: () => import('../views/ComplexeAdminView.vue'),
    meta: { requiresAuth: false, title: 'Complexe scolaire' }
  },
  {
    path: '/compte-non-configure',
    name: 'CompteNonConfigure',
    component: () => import('../views/CompteNonConfigureView.vue'),
    meta: { requiresAuth: false, title: 'Compte non configuré' }
  },
  {
    path: '/admin-login',
    name: 'MegaAdminLogin',
    component: () => import('../views/MegaAdminLoginView.vue'),
    meta: { requiresAuth: false, title: 'Administration EDUFREM' }
  },
  {
    path: '/admin',
    name: 'MegaAdmin',
    component: () => import('../views/MegaAdminView.vue'),
    meta: { requiresAuth: true, title: 'Administration MAPO' }
  },
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
      // === Parent routes (modulaires) ===
      {
        path: 'espace-parent',
        name: 'ParentDashboard',
        component: () => import('../views/ParentDashboardView.vue'),
        meta: { title: 'Tableau de bord', parentOnly: true }
      },
      {
        path: 'parent/notes',
        name: 'ParentNotes',
        component: () => import('../views/ParentNotesView.vue'),
        meta: { title: 'Notes & Bulletins', parentOnly: true }
      },
      {
        path: 'parent/presences',
        name: 'ParentPresences',
        component: () => import('../views/ParentPresencesView.vue'),
        meta: { title: 'Présences', parentOnly: true }
      },
      {
        path: 'parent/finances',
        name: 'ParentFinances',
        component: () => import('../views/ParentFinancesView.vue'),
        meta: { title: 'Paiements', parentOnly: true }
      },
      {
        path: 'parent/miapo',
        name: 'ParentMiapo',
        component: () => import('../views/ParentMiapoView.vue'),
        meta: { title: 'MAPO+', parentOnly: true }
      },
      {
        path: 'parent/messagerie',
        name: 'ParentMessages',
        component: () => import('../views/ParentMessagesView.vue'),
        meta: { title: 'Messagerie', parentOnly: true }
      },
      {
        path: 'parent/inscriptions',
        name: 'ParentInscriptions',
        component: () => import('../views/ParentInscriptionsView.vue'),
        meta: { title: 'Inscriptions', parentOnly: true }
      },
      {
        path: 'parent/emploi-du-temps',
        name: 'ParentEmploiDuTemps',
        component: () => import('../views/ParentEmploiDuTempsView.vue'),
        meta: { title: 'Emploi du temps', parentOnly: true }
      },
      {
        path: 'parent/devoirs',
        name: 'ParentDevoirs',
        component: () => import('../views/ParentDevoirsView.vue'),
        meta: { title: 'Devoirs', parentOnly: true }
      },
      // === Eleve (student) routes ===
      {
        path: 'espace-eleve',
        name: 'EleveDashboard',
        component: () => import('../views/EleveDashboardView.vue'),
        meta: { title: 'Mon espace', eleveOnly: true }
      },
      {
        path: 'eleve/notes',
        name: 'EleveNotes',
        component: () => import('../views/EleveNotesView.vue'),
        meta: { title: 'Mes notes', eleveOnly: true }
      },
      {
        path: 'eleve/revisions',
        name: 'EleveRevisions',
        component: () => import('../views/EleveRevisionsView.vue'),
        meta: { title: 'Révisions', eleveOnly: true }
      },
      {
        path: 'eleve/emploi-du-temps',
        name: 'EleveEmploiDuTemps',
        component: () => import('../views/EleveEmploiDuTempsView.vue'),
        meta: { title: 'Emploi du temps', eleveOnly: true }
      },
      {
        path: 'eleve/presences',
        name: 'ElevePresences',
        component: () => import('../views/ElevePresencesView.vue'),
        meta: { title: 'Mes présences', eleveOnly: true }
      },
      {
        path: 'eleve/messagerie',
        name: 'EleveMessages',
        component: () => import('../views/EleveMessagesView.vue'),
        meta: { title: 'Messagerie', eleveOnly: true }
      },
      {
        path: 'eleve/cours',
        name: 'EleveCours',
        component: () => import('../views/EleveCoursView.vue'),
        meta: { title: 'Cours', eleveOnly: true }
      },
      // === Staff routes ===
      {
        path: 'messagerie',
        name: 'Messages',
        component: () => import('../views/MessagesView.vue'),
        meta: { title: 'Messagerie' }
      },
      {
        path: 'alertes',
        name: 'Alertes',
        component: () => import('../views/AlertesView.vue'),
        meta: { title: 'Alertes parents' }
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
        path: 'matieres',
        name: 'Matieres',
        component: () => import('../views/MatieresView.vue'),
        meta: { title: 'Matières & Coefficients' }
      },
      {
        path: 'cours',
        name: 'Cours',
        component: () => import('../views/CoursView.vue'),
        meta: { title: 'Cours' }
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('../views/NotesView.vue'),
        meta: { title: 'Notes & Évaluations' }
      },
      {
        path: 'examens',
        name: 'Examens',
        component: () => import('../views/ExamensView.vue'),
        meta: { title: 'Examens nationaux' }
      },
      {
        path: 'diplomes',
        name: 'Diplomes',
        component: () => import('../views/DiplomesView.vue'),
        meta: { title: 'Diplômes vérifiables' }
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
        path: 'devoirs',
        name: 'Devoirs',
        component: () => import('../views/DevoirsView.vue'),
        meta: { title: 'Devoirs' }
      },
      {
        path: 'suivi-revisions',
        name: 'RevisionSuivi',
        component: () => import('../views/RevisionSuiviView.vue'),
        meta: { title: 'Suivi des révisions' }
      },
      {
        path: 'suivi-decrochage',
        name: 'DecrochageSuivi',
        component: () => import('../views/DecrochageSuiviView.vue'),
        meta: { title: 'Suivi du décrochage' }
      },
      {
        path: 'discipline',
        name: 'Discipline',
        component: () => import('../views/DisciplineView.vue'),
        meta: { title: 'Discipline' }
      },
      {
        path: 'bibliotheque',
        name: 'Bibliotheque',
        component: () => import('../views/BibliothequeView.vue'),
        meta: { title: 'Bibliothèque' }
      },
      {
        path: 'facturation',
        name: 'Facturation',
        component: () => import('../views/FacturationView.vue'),
        meta: { title: 'Comptabilité' }
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
      {
        path: 'personnel',
        name: 'Personnel',
        component: () => import('../views/PersonnelView.vue'),
        meta: { title: 'Personnel' }
      },
      {
        path: 'apee',
        name: 'Apee',
        component: () => import('../views/ApeeView.vue'),
        meta: { title: 'APEE' }
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('../views/RolesView.vue'),
        meta: { title: 'Rôles & Permissions' }
      },
      {
        path: 'acces',
        name: 'GestionAcces',
        component: () => import('../views/GestionAccesView.vue'),
        meta: { title: 'Gestion des accès' }
      },
      {
        path: 'salaire',
        name: 'Salaire',
        component: () => import('../views/SalaireView.vue'),
        meta: { title: 'Mon salaire' }
      },
      {
        path: 'profil',
        name: 'Profil',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: 'Mon profil' }
      },
      {
        path: 'inscriptions',
        name: 'Inscriptions',
        component: () => import('../views/InscriptionsView.vue'),
        meta: { title: 'Inscriptions' }
      },
      {
        path: 'transition-annee',
        name: 'YearTransition',
        component: () => import('../views/YearTransitionView.vue'),
        meta: { title: 'Passage d\'année scolaire' }
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
  const authStore = useAuthStore()
  const editionStore = useEditionStore()
  const tenant = getTenant()

  // Attendre que l'état d'authentification initial soit connu
  await authStore.ready()
  const isLoggedIn = authStore.isDemo || !!authStore.user
  const isFirebaseUser = isLoggedIn && !authStore.isDemo

  // Retour du flux OAuth Carré : toujours autorisé (la vue gère l'auth + l'échange).
  if (to.name === 'CarreCallback') return true

  // ── Tenant méga admin (admin.app-edufrem.com) ────────────────────
  // Le sous-domaine d'administration sert exclusivement l'espace méga admin.
  if (tenant.mode === 'megaAdmin') {
    if (to.name === 'MegaAdmin') {
      if (!isLoggedIn || !authStore.isSuperAdmin) return { name: 'MegaAdminLogin' }
      return
    }
    if (to.name === 'MegaAdminLogin') {
      if (isLoggedIn && authStore.isSuperAdmin) return { name: 'MegaAdmin' }
      return
    }
    // Toute autre route sur ce sous-domaine est redirigée vers l'admin
    if (isLoggedIn && authStore.isSuperAdmin) return { name: 'MegaAdmin' }
    return { name: 'MegaAdminLogin' }
  }

  // Hors tenant méga admin, on ne sert pas les routes /admin et /admin-login
  if (to.name === 'MegaAdmin' || to.name === 'MegaAdminLogin') {
    return { name: 'Welcome' }
  }

  // ── Tenant MAPO+ standalone (miapo.app-edufrem.com) ──────────────
  // Produit B2C dédié : on entre par l'accueil MAPO+ (Parent / Enfant) puis on
  // reste dans l'expérience famille (espaces parent + élève + tuteur). La
  // vitrine multi-éditions (Welcome) et l'enseignement supérieur ne
  // s'appliquent pas à cette instance → on renvoie vers l'accueil MAPO+.
  if (tenant.mode === 'miapo') {
    if (to.name === 'Welcome' || to.name === 'Superieur') {
      return { name: 'MiapoWelcome' }
    }
    if (!isLoggedIn) {
      const publicMiapo = new Set(['MiapoWelcome', 'Login', 'VerifierDiplome', 'CompteNonConfigure'])
      if (!publicMiapo.has(to.name)) return { name: 'MiapoWelcome' }
    }
  }

  // ── Directeur de COMPLEXE : espace « groupe » consolidé sur plusieurs écoles ──
  // Un compte `directeur_complexe` vit dans /complexe (vue agrégée), pas dans le
  // tableau de bord mono-école : on l'y renvoie depuis toute route MAPO standard.
  if (isLoggedIn && authStore.isDirecteurComplexe && tenant.mode !== 'megaAdmin' && tenant.mode !== 'miapo') {
    const complexeAllowed = new Set(['ComplexeAdmin', 'VerifierDiplome', 'Login'])
    if (!complexeAllowed.has(to.name)) return { name: 'ComplexeAdmin' }
  }

  // ── Tenant école : on saute la page de choix (Welcome interdite) ──
  // L'édition de l'école est fixée par le doc Firestore `schools/{id}`.
  // On consulte schoolIdentity (déjà initialisé en pre-load si tenant=school)
  // pour décider où envoyer le visiteur.
  if (tenant.mode === 'school' && to.name === 'Welcome') {
    const schoolIdentity = useSchoolIdentityStore()
    // Tant qu'on ne connaît pas l'edition (Firestore pas encore chargé),
    // on suppose 'superieur' pour ENTPE (premier client). Sera affiné dès
    // que le doc school sera disponible.
    if (schoolIdentity.edition === 'secondaire') return { name: 'Login' }
    return { name: 'Superieur' }
  }
  // En mode école, on force l'edition côté store (utile aux vues secondaires
  // qui s'appuient encore sur editionStore).
  if (tenant.mode === 'school') {
    const schoolIdentity = useSchoolIdentityStore()
    if (schoolIdentity.edition && editionStore.current !== schoolIdentity.edition) {
      editionStore.setEdition(schoolIdentity.edition)
    }
  }

  // Tenant école en édition supérieur : seule la vue Superieur (et
  // CompteNonConfigure pour les comptes Firebase sans invitation) doit
  // s'afficher. Toutes les autres routes (Dashboard secondaire, Welcome,
  // Login secondaire, routes parent/élève) sont redirigées. Cela évite
  // qu'un utilisateur connecté avec un profil parent/eleve d'une ancienne
  // session ou qu'un état de session bizarre montre la version secondaire
  // sur une école qui doit servir la version supérieur.
  if (tenant.mode === 'school' && editionStore.isSuperieur) {
    const allowedInSuperieurTenant = new Set([
      'Superieur', 'CompteNonConfigure', 'VerifierDiplome',
    ])
    if (!allowedInSuperieurTenant.has(to.name)) {
      return { name: 'Superieur' }
    }
  }

  // Compte Firebase sans profil ni invitation → écran "compte non configuré"
  if (isFirebaseUser && authStore.notProvisioned) {
    if (to.name !== 'CompteNonConfigure') return { name: 'CompteNonConfigure' }
    return
  }
  // On ne reste pas sur cet écran si le compte est en réalité configuré
  if (to.name === 'CompteNonConfigure') {
    return isLoggedIn ? { name: 'Dashboard' } : { name: 'Welcome' }
  }

  // Pas connecté + route protégée → diriger selon l'édition choisie
  if (requiresAuth && !isLoggedIn) {
    if (!editionStore.isChosen) return { name: 'Welcome' }
    if (editionStore.isSuperieur) return { name: 'Superieur' }
    return { name: 'Login' }
  }

  // La page de connexion est réservée à l'édition secondaire pour l'instant
  if (to.name === 'Login' && !isLoggedIn) {
    if (!editionStore.isChosen) return { name: 'Welcome' }
    if (editionStore.isSuperieur) return { name: 'Superieur' }
  }

  const isParent = authStore.userProfile?.role === 'parent'
  const isEleve = authStore.userProfile?.role === 'eleve'
  // Parent B2C autonome (hors école) : son accueil est l'espace MAPO+.
  const isB2C = !!authStore.userProfile?.b2c
  const parentHome = isB2C ? 'ParentMiapo' : 'ParentDashboard'

  if (to.name === 'Login' && isLoggedIn) {
    if (isEleve) return { name: 'EleveDashboard' }
    if (isParent) return { name: parentHome }
    return { name: 'Dashboard' }
  }

  // Eleves : rediriger vers l'espace élève
  if (isEleve && to.name === 'Dashboard') {
    return { name: 'EleveDashboard' }
  }

  // Eleves ne peuvent pas accéder aux routes staff ou parent
  if (isEleve && !to.meta.eleveOnly && to.path !== '/dashboard' && to.path !== '/profil' && to.path !== '/') {
    return { name: 'EleveDashboard' }
  }

  // Parents : rediriger vers l'espace parent s'ils essaient d'acceder au dashboard normal
  if (isParent && to.name === 'Dashboard') {
    return { name: parentHome }
  }

  // Parent B2C autonome : confiné à MAPO+ (et son profil). Les autres espaces
  // parent dépendent d'une école et seraient vides/cassés en mode autonome.
  if (isParent && isB2C && to.name !== 'ParentMiapo' && to.name !== 'Profil') {
    return { name: 'ParentMiapo' }
  }

  // Parents ne peuvent pas acceder aux routes staff
  if (isParent && !to.meta.parentOnly && to.path !== '/dashboard' && to.path !== '/profil' && to.path !== '/') {
    return { name: parentHome }
  }

  // Vérification des permissions par module (route guard RBAC)
  if (isLoggedIn && !isParent) {
    const routeSegment = to.path.split('/').filter(Boolean)[0]
    const moduleKey = ROUTE_PERMISSION_MAP[routeSegment]
    if (moduleKey) {
      const permissionsStore = usePermissionsStore()
      if (!permissionsStore.hasAccess(moduleKey)) {
        return { name: 'Dashboard' }
      }
    }
  }

  // Vérification des modules actifs de l'école (modulesActifs du doc école).
  // Un module désactivé par EDUFREM pour cette école est inaccessible pour
  // tous les rôles, y compris le directeur. Les modules du socle restent
  // toujours accessibles (cf SOCLE_MODULES dans stores/permissions.js).
  if (isLoggedIn) {
    const schoolIdentity = useSchoolIdentityStore()
    const segments = to.path.split('/').filter(Boolean)
    let moduleKey = null
    if (segments[0] === 'eleve' || segments[0] === 'parent') {
      const subMap = {
        'notes': 'notes', 'presences': 'presences',
        'emploi-du-temps': 'emploi-du-temps', 'messagerie': 'messagerie',
        'devoirs': 'devoirs', 'finances': 'facturation',
      }
      moduleKey = subMap[segments[1]] || null
    } else {
      moduleKey = ROUTE_PERMISSION_MAP[segments[0]] || null
    }
    if (moduleKey && !schoolIdentity.isModuleActif(moduleKey)) {
      if (isEleve) return { name: 'EleveDashboard' }
      if (isParent) return { name: 'ParentDashboard' }
      return { name: 'Dashboard' }
    }
  }
})

// Titre de page dynamique
router.afterEach((to) => {
  // Le tenant MAPO+ standalone s'affiche MAPO+, pas MAPO.
  const title = localizedTitle(to.meta.title)
  if (isMiapoTenant()) {
    document.title = title && to.meta.title !== 'MAPO+'
      ? `${title} — MAPO+`
      : i18n.global.t('rt.taglineMiapo')
  } else {
    document.title = title ? `${title} — MAPO` : i18n.global.t('rt.taglineMapo')
  }
})

// Track navigation for dynamic quick actions
router.afterEach((to) => {
  if (to.meta.requiresAuth !== false && to.path !== '/login') {
    try {
      const key = 'mapo_nav_log'
      let navLog = []
      try { navLog = JSON.parse(localStorage.getItem(key) || '[]') } catch { navLog = [] }
      navLog.unshift({ path: to.path, date: new Date().toISOString() })
      if (navLog.length > 100) navLog = navLog.slice(0, 100)
      localStorage.setItem(key, JSON.stringify(navLog))
    } catch { /* silent */ }
  }
})

export default router
