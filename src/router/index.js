import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePermissionsStore } from '../stores/permissions'
import { useEditionStore } from '../stores/edition'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { getTenant, isMapoPlusTenant } from '../utils/tenantContext'
import { deciderAccesMapoPlus } from './accesMapoPlus'
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
  'preparation': 'devoirs',
}

/**
 * Route → clé de MODULE ACTIVABLE. À ne pas confondre avec la table ci-dessus.
 *
 * ⚠️ Les deux tables répondent à deux questions différentes :
 *   - `ROUTE_PERMISSION_MAP` : ce rôle a-t-il le DROIT d'ouvrir cet écran ?
 *   - `ROUTE_MODULE_MAP`     : ce module est-il ACTIVÉ pour cette école ?
 * Les avoir confondues a coûté six écrans : en pointant « inscriptions » vers
 * une clé de module qui n'existe pas dans les rôles, le directeur se faisait
 * renvoyer au tableau de bord depuis Inscriptions, Passage d'année,
 * Bibliothèque, Transport, Cantine et Infirmerie. Constaté en démonstration.
 */
const ROUTE_MODULE_MAP = {
  ...ROUTE_PERMISSION_MAP,
  'dashboard': 'dashboard',
  'inscriptions': 'inscriptions',
  'transition-annee': 'transition-annee',
  'bibliotheque': 'bibliotheque',
  'transport': 'transport',
  'cantine': 'cantine',
  'infirmerie': 'infirmerie',
}

/**
 * Première route de repli réellement accessible pour cette école.
 *
 * Ordre volontaire : on essaie le tableau de bord, puis les écrans de travail
 * quotidien, puis la structure. `Profile` ferme la marche : elle n'est associée
 * à aucun module, donc elle reste joignable quoi que l'école ait décoché. C'est
 * la seule garantie qu'un utilisateur connecté voit toujours QUELQUE CHOSE.
 */
const REPLIS = [
  ['dashboard', 'Dashboard'],
  ['notes', 'Notes'],
  ['presences', 'Presences'],
  ['emploi-du-temps', 'EmploiDuTemps'],
  ['eleves', 'Eleves'],
  ['classes', 'Classes'],
  ['parametres', 'Parametres'],
]

function premiereDestinationActive(schoolIdentity, to) {
  for (const [cle, nom] of REPLIS) {
    if (to.name === nom) continue // ne jamais se rediriger vers soi-même
    if (schoolIdentity.isModuleActif(cle)) return { name: nom }
  }
  if (to.name === 'Profil') return false
  return { name: 'Profil' }
}

const routes = [
  {
    // Racine MAPO+ (façon Facebook) : l'URL nue mapoplus.app-edufrem.com sert
    // directement la page login / inscription. Le garde redirige les comptes
    // connectés vers leur espace, et les autres tenants vers leur accueil.
    path: '/',
    name: 'Home',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
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
    // Sélection des espaces de démonstration MAPO+ (déplacée hors de la racine).
    path: '/demo',
    name: 'Demo',
    component: () => import('../views/MiapoWelcomeView.vue'),
    meta: { requiresAuth: false, title: 'Démo MAPO+' }
  },
  {
    // Ancien chemin /miapo (codename interne) → redirige vers /demo.
    path: '/miapo',
    redirect: '/demo'
  },
  {
    // Ancienne URL de l'espace MAPO+ (/parent/miapo) → /mon-espace. Conservée en
    // redirection : les anciens liens d'activation e-mail et les favoris restent
    // valides. Le « dossier » parent/miapo n'existe plus comme page.
    path: '/parent/miapo',
    redirect: '/mon-espace'
  },
  {
    // Inscription MAPO+ : une PAGE, pas une modale. Elle a une URL (donc elle
    // peut être liée depuis un e-mail, une plaquette ou un QR code) et sa
    // redirection vers l'écran d'activation est visible.
    path: '/inscription',
    name: 'Inscription',
    component: () => import('../views/InscriptionMapoPlusView.vue'),
    meta: { requiresAuth: false, title: 'Créer mon compte' }
  },
  {
    path: '/verifier-email',
    name: 'VerifierEmail',
    component: () => import('../views/VerifierEmailView.vue'),
    meta: { requiresAuth: false, title: 'Activer mon compte' }
  },
  {
    // Lien magique « famille » : le parent partage ce lien (WhatsApp) à son
    // enfant ; à l'ouverture, le compte enfant est créé et connecté sans
    // inscription ni mot de passe (cf. mapo-famille.php + enfantsComptes).
    path: '/rejoindre',
    name: 'Rejoindre',
    component: () => import('../views/RejoindreView.vue'),
    meta: { requiresAuth: false, title: 'Rejoindre mon espace' }
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
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Tableau de bord' }
      },
      {
        // Espace MAPO+ (B2C). URL neutre « /mon-espace » : convient au parent qui
        // suit un enfant COMME à l'apprenant qui pilote son propre apprentissage —
        // plus de « parent » ni de codename « miapo » dans la barre d'adresse.
        // (Le nom de route reste 'ParentMiapo' : interne, invisible pour l'usager.)
        path: 'mon-espace',
        name: 'ParentMiapo',
        component: () => import('../views/ParentMiapoView.vue'),
        meta: { title: 'MAPO+', parentOnly: true }
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
        path: 'preparation',
        name: 'Preparation',
        component: () => import('../views/PreparationView.vue'),
        meta: { title: 'Cahier de préparation' }
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
        path: 'transport',
        name: 'Transport',
        component: () => import('../views/TransportView.vue'),
        meta: { title: 'Transport scolaire' }
      },
      {
        path: 'cantine',
        name: 'Cantine',
        component: () => import('../views/CantineView.vue'),
        meta: { title: 'Cantine' }
      },
      {
        path: 'infirmerie',
        name: 'Infirmerie',
        component: () => import('../views/InfirmerieView.vue'),
        meta: { title: 'Infirmerie & santé' }
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

  // ── Racine "/" (Home) ────────────────────────────────────────────
  // Sur l'instance MAPO+, l'URL nue sert le login/inscription (façon Facebook) ;
  // un compte déjà connecté est renvoyé vers son espace. Sur les autres tenants,
  // on reproduit l'ancien comportement de la racine (→ dashboard / accueil).
  if (to.name === 'Home') {
    if (tenant.mode === 'mapoplus') {
      if (isLoggedIn) return { name: 'ParentMiapo' }
      return true
    }
    // Autres tenants : on reproduit exactement l'ancienne racine (redirection
    // vers /dashboard) ; le reste du garde applique la logique tenant/édition.
    return { path: '/dashboard' }
  }

  // ── Tenant MAPO+ standalone (mapoplus.app-edufrem.com) ──────────────
  // Produit B2C dédié : on entre par l'accueil MAPO+ (Parent / Enfant) puis on
  // reste dans l'expérience famille (espaces parent + élève + tuteur). La
  // vitrine multi-éditions (Welcome) et l'enseignement supérieur ne
  // s'appliquent pas à cette instance → on renvoie vers l'accueil MAPO+.
  if (tenant.mode === 'mapoplus') {
    // La décision vit dans `accesMapoPlus.js`, une fonction PURE et testée.
    // Elle était auparavant écrite ici, mêlée aux stores : intestable, donc
    // jamais testée — et cassée deux fois en une journée sans que rien ne le
    // signale. Ne pas réintroduire cette logique en ligne.
    const decision = deciderAccesMapoPlus({
      routeName: to.name,
      isLoggedIn,
      isFirebaseUser,
      accesDebloque: isFirebaseUser ? await authStore.accesDebloque() : true,
    })
    if (decision) return decision
  }

  // ── Directeur de COMPLEXE : espace « groupe » consolidé sur plusieurs écoles ──
  // Un compte `directeur_complexe` vit dans /complexe (vue agrégée), pas dans le
  // tableau de bord mono-école : on l'y renvoie depuis toute route MAPO standard.
  if (isLoggedIn && authStore.isDirecteurComplexe && tenant.mode !== 'megaAdmin' && tenant.mode !== 'mapoplus') {
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

  /**
   * ⚠️ Depuis le 23/08/2026, MAPO n'a plus de portail parent ni d'espace élève :
   * les familles sont servies par MAPO+. Le rôle `parent` subsiste UNIQUEMENT
   * pour MAPO+ (`/mon-espace`), servi par ce même dépôt.
   *
   * Un compte `eleve` ne peut donc plus exister côté école. S'il en traîne un
   * d'une session ancienne, on ne le laisse pas errer sur des écrans de
   * personnel : il est renvoyé sur son profil, seul endroit qui ait un sens
   * pour lui. Le renvoyer vers une route supprimée provoquerait une boucle.
   */
  const isParent = authStore.userProfile?.role === 'parent'
  const isEleve = authStore.userProfile?.role === 'eleve'
  const parentHome = 'ParentMiapo'

  if (to.name === 'Login' && isLoggedIn) {
    if (isEleve) return { name: 'Profil' }
    if (isParent) return { name: parentHome }
    return { name: 'Dashboard' }
  }

  /**
   * ⚠️ Les PAGES PUBLIQUES échappent au confinement — vérifié à l'écran le
   * 23/08/2026, où l'échec était parfaitement muet.
   *
   * Un parent déjà connecté à MAPO+ sur son téléphone qui ouvrait le lien
   * d'invitation de son école (`/rejoindre?c=…`) était renvoyé vers son espace :
   * page blanche, aucune erreur, et l'invitation JAMAIS consommée. Or c'est le
   * cas le plus courant — on clique le lien depuis le téléphone où l'on est déjà
   * connecté. Même effet sur `/verifier-email`, `/inscription` et le retour
   * OAuth de Carré : autant de portes d'entrée qui se refermaient en silence.
   *
   * On énumère ces routes plutôt que de prendre tout `requiresAuth === false` :
   * l'accueil et la vitrine sont publics eux aussi, et y renvoyer un parent
   * connecté vers son espace est le comportement VOULU. Une liste nommée dit
   * l'intention — « ces pages doivent aboutir » — là où un critère large
   * changerait en silence l'atterrissage de tout le monde.
   */
  const ROUTES_ACTION_PUBLIQUES = new Set([
    'Rejoindre',        // invitation d'une école, ou lien magique famille
    'VerifierEmail',    // activation du compte
    'CarreCallback',    // retour du flux OAuth Carré
    'VerifierDiplome',  // outil public de vérification
  ])
  const routePublique = ROUTES_ACTION_PUBLIQUES.has(to.name)

  // Compte élève résiduel : confiné à son profil.
  if (isEleve && !routePublique && to.name !== 'Profil') {
    return { name: 'Profil' }
  }

  // Parent : son seul espace est MAPO+ (et son profil).
  if (isParent && !routePublique && to.name !== 'ParentMiapo' && to.name !== 'Profil') {
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
    // ⚠️ Il y avait ici une correspondance pour les URL `/parent/...` et
    // `/eleve/...`, suivie de deux redirections vers `ParentDashboard` et
    // `EleveDashboard`. Ces routes ont été supprimées le 23/08/2026 : y
    // renvoyer aurait produit une boucle de redirection MUETTE — aucune erreur,
    // l'écran précédent qui reste affiché. Le portail des familles vit
    // désormais dans MAPO+, et le garde plus haut y confine déjà ces comptes.
    const moduleKey = ROUTE_MODULE_MAP[segments[0]] || null
    if (moduleKey && !schoolIdentity.isModuleActif(moduleKey)) {
      // Depuis la suppression du socle, le tableau de bord lui-même peut être
      // décoché. Y renvoyer produirait une boucle de redirection SILENCIEUSE :
      // aucune erreur, l'écran précédent reste affiché. On cherche donc la
      // première destination réellement active, et à défaut on l'annonce.
      return premiereDestinationActive(schoolIdentity, to)
    }
  }
})

// Titre de page dynamique
router.afterEach((to) => {
  // Le tenant MAPO+ standalone s'affiche MAPO+, pas MAPO.
  const title = localizedTitle(to.meta.title)
  if (isMapoPlusTenant()) {
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
