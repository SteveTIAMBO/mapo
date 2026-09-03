import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * Système RBAC (Role-Based Access Control) de MAPO
 *
 * Chaque module de l'app est identifié par une clé.
 * Chaque rôle a un ensemble de permissions par module :
 *   - 'full'    : accès complet (lecture + écriture + suppression)
 *   - 'write'   : lecture + écriture (pas de suppression)
 *   - 'read'    : lecture seule
 *   - 'none'    : aucun accès (le module n'apparaît pas dans le menu)
 *   - 'own'     : accès limité à ses propres données (ex: enseignant ne voit que ses classes)
 */

// Liste des modules de l'application
export const APP_MODULES = [
  // 1. Vue d'ensemble
  { key: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard', description: 'Page d\'accueil avec vue d\'ensemble' },
  // 2. Structure de l'établissement (onboarding étape 1-2)
  { key: 'classes', label: 'Classes', icon: 'BookOpen', description: 'Gestion des classes et niveaux' },
  { key: 'personnel', label: 'Personnel', icon: 'Briefcase', description: 'Gestion des membres du personnel' },
  { key: 'eleves', label: 'Élèves', icon: 'Users', description: 'Inscriptions et fiches élèves' },
  // 3. Organisation pédagogique
  { key: 'matieres', label: 'Matières', icon: 'Library', description: 'Matières et coefficients' },
  { key: 'emploi-du-temps', label: 'Emploi du temps', icon: 'Clock', description: 'Planning des cours' },
  // 4. Vie scolaire quotidienne
  { key: 'presences', label: 'Présences', icon: 'CalendarCheck', description: 'Appel et suivi des absences' },
  { key: 'notes', label: 'Notes & Évaluations', icon: 'FileText', description: 'Saisie et consultation des notes' },
  { key: 'discipline', label: 'Discipline', icon: 'Shield', description: 'Sanctions et avertissements' },
  { key: 'bibliotheque', label: 'Bibliothèque', icon: 'Library', description: 'Fonds documentaire et emprunts' },
  { key: 'transport', label: 'Transport scolaire', icon: 'Bus', description: 'Circuits de ramassage et abonnés' },
  { key: 'cantine', label: 'Cantine', icon: 'Utensils', description: 'Menu et demi-pensionnaires' },
  { key: 'infirmerie', label: 'Infirmerie & santé', icon: 'HeartPulse', description: 'Passages et fiches santé' },
  { key: 'devoirs', label: 'Devoirs', icon: 'ClipboardCheck', description: 'Création et suivi des devoirs' },
  { key: 'messagerie', label: 'Messagerie', icon: 'MessageSquare', description: 'Communication interne' },
  { key: 'salaire', label: 'Mon salaire', icon: 'Wallet', description: 'Suivi de rémunération et fiches de paie' },
  // 5. Administration & outils
  { key: 'facturation', label: 'Comptabilité', icon: 'CreditCard', description: 'Frais de scolarité, paiements et salaires' },
  { key: 'import', label: 'Import', icon: 'Upload', description: 'Import de données en masse' },
  { key: 'rapports', label: 'Rapports', icon: 'BarChart3', description: 'Rapports et statistiques' },
  // 6. Configuration (affiché dans section "Paramètres" de la sidebar)
  { key: 'parametres', label: 'Paramètres', icon: 'Settings', description: 'Configuration de l\'établissement' },
  { key: 'roles', label: 'Rôles & Accès', icon: 'ShieldCheck', description: 'Gestion des rôles et permissions' },
]

// ── Activation de modules par école (édition secondaire/primaire) ──
// Le « socle » est toujours actif pour toute école : structure de
// l'établissement, gestion des personnes et outils d'administration.
// Les autres modules sont activables/désactivables école par école
// depuis l'espace méga admin EDUFREM (champ modulesActifs du doc école).
export const SOCLE_MODULES = [
  'dashboard', 'eleves', 'inscriptions', 'classes', 'matieres',
  'personnel', 'acces', 'import', 'transition-annee',
  'parametres', 'roles', 'profile',
  // Modules additifs (toujours actifs) — Vie scolaire & services
  'bibliotheque', 'transport', 'cantine', 'infirmerie',
]

// Modules optionnels (clé = clé APP_MODULES / nav / routes)
export const OPTIONAL_MODULES = [
  'notes', 'presences', 'emploi-du-temps', 'devoirs', 'discipline',
  'messagerie', 'salaire', 'facturation', 'rapports',
]

// Niveaux de permission
export const PERMISSION_LEVELS = [
  { value: 'full', label: 'Complet', description: 'Lecture, écriture, suppression', color: '#1B8A5A' },
  { value: 'write', label: 'Écriture', description: 'Lecture et écriture', color: '#1558B0' },
  { value: 'read', label: 'Lecture', description: 'Consultation uniquement', color: '#E8A838' },
  { value: 'own', label: 'Personnel', description: 'Ses propres données uniquement', color: '#6366F1' },
  { value: 'none', label: 'Aucun', description: 'Pas d\'accès', color: '#9A9FA5' },
]

// Rôles par défaut avec leurs permissions
export const DEFAULT_ROLES = {
  directeur: {
    label: 'Directeur',
    description: 'Accès complet à tous les modules',
    editable: false, // Le directeur a toujours accès à tout
    permissions: {
      dashboard: 'full', personnel: 'full', eleves: 'full', classes: 'full', matieres: 'full',
      notes: 'full', presences: 'full', 'emploi-du-temps': 'full', discipline: 'full',
      devoirs: 'full', messagerie: 'full', salaire: 'none',
      facturation: 'full', rapports: 'full', import: 'full', parametres: 'full', roles: 'full',
    },
  },
  admin: {
    label: 'Administrateur',
    description: 'Accès complet sauf rôles',
    editable: true,
    permissions: {
      dashboard: 'full', personnel: 'full', eleves: 'full', classes: 'full', matieres: 'full',
      notes: 'full', presences: 'full', 'emploi-du-temps': 'full', discipline: 'full',
      devoirs: 'full', messagerie: 'full', salaire: 'none',
      facturation: 'full', rapports: 'full', import: 'full', parametres: 'full', roles: 'read',
    },
  },
  enseignant: {
    label: 'Enseignant',
    description: 'Présences, notes, devoirs et élèves de ses classes',
    editable: true,
    permissions: {
      dashboard: 'read', personnel: 'none', eleves: 'own', classes: 'read', matieres: 'none',
      notes: 'own', presences: 'write', 'emploi-du-temps': 'own', discipline: 'write',
      devoirs: 'own', messagerie: 'write', salaire: 'read',
      facturation: 'none', rapports: 'none', import: 'none', parametres: 'none', roles: 'none',
    },
  },
  secretaire: {
    label: 'Secrétaire',
    description: 'Inscriptions, dossiers et administration',
    editable: true,
    permissions: {
      dashboard: 'read', personnel: 'read', eleves: 'write', classes: 'read', matieres: 'read',
      notes: 'read', presences: 'read', 'emploi-du-temps': 'read', discipline: 'read',
      facturation: 'write', rapports: 'read', import: 'write', parametres: 'none', roles: 'none',
    },
  },
  comptable: {
    label: 'Comptable',
    description: 'Facturation et rapports financiers',
    editable: true,
    permissions: {
      dashboard: 'read', personnel: 'none', eleves: 'read', classes: 'none', matieres: 'none',
      notes: 'none', presences: 'none', 'emploi-du-temps': 'none', discipline: 'none',
      facturation: 'full', rapports: 'read', import: 'none', parametres: 'none', roles: 'none',
    },
  },
  /**
   * ⚠️ Le rôle « Parent / Tuteur » a été RETIRÉ le 23/08/2026.
   *
   * Les parents et les élèves ne sont plus gérés par l'ERP : ils passent par
   * MAPO+, avec une connexion initiée par l'école. Le rôle survivait ici en
   * proposant au directeur de régler des permissions (« notes : ses enfants »,
   * « présences : ses enfants ») vers des écrans qui n'existent plus — un
   * réglage qu'on enregistre et que personne ne relit jamais.
   *
   * Le rôle applicatif `parent` reste valide côté MAPO+ : il vient du profil
   * d'authentification, pas de cette table. Il n'en a jamais eu besoin, car le
   * garde de navigation confine ces comptes à `/mon-espace`, hors RBAC.
   */
  cantine: {
    label: 'Responsable cantine',
    description: 'Liste des élèves et facturation cantine',
    editable: true,
    permissions: {
      dashboard: 'read', personnel: 'none', eleves: 'read', classes: 'read', matieres: 'none',
      notes: 'none', presences: 'none', 'emploi-du-temps': 'none', discipline: 'none',
      facturation: 'own', rapports: 'none', import: 'none', parametres: 'none', roles: 'none',
    },
  },
  surveillant: {
    label: 'Surveillant',
    description: 'Présences, discipline et emploi du temps',
    editable: true,
    permissions: {
      dashboard: 'read', personnel: 'none', eleves: 'read', classes: 'read', matieres: 'none',
      notes: 'none', presences: 'write', 'emploi-du-temps': 'read', discipline: 'write',
      facturation: 'none', rapports: 'none', import: 'none', parametres: 'none', roles: 'none',
    },
  },
}

const DEMO_ROLES_KEY = 'mapo_demo_roles'

export const usePermissionsStore = defineStore('permissions', () => {
  /**
   * ⚠️ Copie PROFONDE des rôles par défaut.
   *
   * C'était `{ ...DEFAULT_ROLES }`, une copie de surface : les objets
   * `permissions` restaient partagés avec la constante. `updatePermission`
   * écrivait donc dans `DEFAULT_ROLES` lui-même, et « remettre le rôle à ses
   * permissions par défaut » relisait… les valeurs déjà modifiées. Le bouton de
   * réinitialisation, confirmation comprise, ne remettait rien.
   */
  const clonerDefauts = () => JSON.parse(JSON.stringify(DEFAULT_ROLES))
  const roles = ref(clonerDefauts())
  // Motif du dernier échec de lecture ou d'écriture, pour que l'écran le dise.
  const erreur = ref(null)
  const authStore = useAuthStore()

  // Permission du rôle actuel pour un module donné
  const getPermission = (moduleKey) => {
    const role = authStore.userProfile?.role || 'enseignant'
    const roleData = roles.value[role]
    if (!roleData) return 'none'
    return roleData.permissions?.[moduleKey] || 'none'
  }

  // Est-ce que l'utilisateur a accès à un module ?
  const hasAccess = (moduleKey) => {
    return getPermission(moduleKey) !== 'none'
  }

  // Est-ce que l'utilisateur peut écrire dans un module ?
  const canWrite = (moduleKey) => {
    const perm = getPermission(moduleKey)
    return ['full', 'write', 'own'].includes(perm)
  }

  // Est-ce que l'utilisateur a accès complet ?
  const hasFullAccess = (moduleKey) => {
    return getPermission(moduleKey) === 'full'
  }

  // Modules visibles dans la navigation
  const visibleModules = computed(() => {
    return APP_MODULES.filter(m => hasAccess(m.key))
  })

  // Charger les rôles personnalisés
  const loadRoles = async () => {
    if (authStore.isDemo) {
      try {
        const stored = localStorage.getItem(demoKey(DEMO_ROLES_KEY))
        if (stored) {
          const parsed = JSON.parse(stored)
          // Fusionner avec les défauts pour ne pas perdre les nouveaux rôles.
          // ⚠️ Mais on n'accepte QUE les rôles qui existent encore : une copie
          // enregistrée dans le navigateur avant le retrait d'un rôle le ferait
          // sinon réapparaître à l'écran, sans que rien ne l'explique.
          const retenus = {}
          for (const [k, v] of Object.entries(parsed || {})) {
            if (DEFAULT_ROLES[k]) retenus[k] = v
          }
          roles.value = { ...clonerDefauts(), ...retenus }
        }
      } catch (e) { /* silent */ }
      return
    }

    // ── Mode école ────────────────────────────────────────────────────────
    //
    // ⚠️ Cette branche N'EXISTAIT PAS : `loadRoles` et `saveRoles` s'arrêtaient
    // après le bloc démo. Hors démonstration, la matrice des droits n'était donc
    // ni lue ni écrite : le directeur retirait un accès, l'écran confirmait, et
    // au rechargement les défauts revenaient. Un faux paramètre sur des DROITS.
    const sid = authStore.schoolId
    if (!sid) return
    try {
      const snap = await getDoc(doc(db, 'schools', sid, 'config', 'roles'))
      const enregistres = snap.exists() ? (snap.data().roles || {}) : null
      if (!enregistres) return
      // Même précaution que la démo : on n'accepte que les rôles qui existent
      // encore, sinon un rôle retiré du produit réapparaîtrait à l'écran.
      const retenus = {}
      for (const [k, v] of Object.entries(enregistres)) {
        if (DEFAULT_ROLES[k]) retenus[k] = v
      }
      roles.value = { ...clonerDefauts(), ...retenus }
      erreur.value = null
    } catch (e) {
      // On DIT l'échec : sans lui, « droits par défaut » et « lecture
      // impossible » se ressemblent, et l'école croit voir sa configuration.
      erreur.value = e?.code || 'lecture_impossible'
    }
  }

  // Sauvegarder les rôles
  const saveRoles = async () => {
    if (authStore.isDemo) {
      try {
        localStorage.setItem(demoKey(DEMO_ROLES_KEY), JSON.stringify(roles.value))
        return { ok: true }
      } catch (e) { return { ok: false, reason: 'stockage' } }
    }

    // ── Mode école : la matrice vit dans le document de l'école ───────────
    const sid = authStore.schoolId
    if (!sid) return { ok: false, reason: 'hors_ecole' }
    // Seule la direction fixe les droits. Le laisser au client sans le dire
    // reviendrait à promettre un réglage que les règles refuseront.
    if (!authStore.isDirecteur) return { ok: false, reason: 'interdit' }
    try {
      await setDoc(doc(db, 'schools', sid, 'config', 'roles'), { roles: roles.value }, { merge: true })
      erreur.value = null
      return { ok: true }
    } catch (e) {
      erreur.value = e?.code || 'ecriture_impossible'
      return { ok: false, reason: erreur.value }
    }
  }

  /**
   * Mettre à jour la permission d'un rôle pour un module.
   *
   * ⚠️ Ces deux fonctions appelaient `saveRoles()` sans attendre ni lire le
   * résultat, alors que l'écran a par ailleurs un bouton « Enregistrer ». Deux
   * chemins d'écriture pour un même fait : le bandeau annonçait « modifications
   * non enregistrées » sur une matrice déjà écrite, et un refus des règles
   * Firestore ne laissait aucune trace. On ne touche plus qu'à l'état en
   * mémoire ; l'écriture appartient à `saveRoles()`, qui la rapporte.
   */
  const updatePermission = (roleName, moduleKey, level) => {
    if (roles.value[roleName] && roles.value[roleName].editable !== false) {
      roles.value[roleName].permissions[moduleKey] = level
    }
  }

  // Réinitialiser un rôle aux valeurs par défaut (en mémoire, cf. ci-dessus)
  const resetRole = (roleName) => {
    if (DEFAULT_ROLES[roleName]) {
      roles.value[roleName] = JSON.parse(JSON.stringify(DEFAULT_ROLES[roleName]))
    }
  }

  return {
    roles,
    erreur,
    getPermission,
    hasAccess,
    canWrite,
    hasFullAccess,
    visibleModules,
    loadRoles,
    saveRoles,
    updatePermission,
    resetRole,
    APP_MODULES,
    PERMISSION_LEVELS,
  }
})
