import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, googleProvider, db } from '../firebase'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { isSchoolTenant, isMiapoTenant } from '../utils/tenantContext'
import { identifierToEmail } from '../utils/identifier'
import { currentLang } from '../i18n'

// Comptes demo SECONDAIRE (pas de Firebase, bypass complet, mot de passe requis)
const DEMO_ACCOUNTS = {
  directeur: { uid: 'demo-directeur', firstName: 'Michel', lastName: 'Teussop', role: 'directeur', email: 'directeur@demo' },
  // Jean Kamga : prof principal de 6ème A, enseigne les Mathématiques (il ne
  // peut publier des cours QUE dans sa/ses matière(s)). Hélène est son élève.
  enseignant: { uid: 'demo-enseignant', firstName: 'Jean', lastName: 'Kamga', role: 'enseignant', email: 'enseignant@demo', subjects: ['Mathématiques'], className: '6ème A' },
  parent: { uid: 'demo-parent', firstName: 'Thomas', lastName: 'Mbarga', role: 'parent', email: 'parent@demo' },
  eleve: { uid: 'demo-eleve', firstName: 'Hélène', lastName: 'Mbarga', role: 'eleve', email: 'eleve@demo', className: '6ème A' },
  // MAPO+ = édition B2C (famille/tuteur autonome) : profil parent b2c → espace MAPO+ seul.
  miapo: { uid: 'demo-miapo', firstName: 'Mariam', lastName: 'Nkeng', role: 'parent', email: 'miapo@demo', b2c: true },
  // Directeur de COMPLEXE scolaire : gère plusieurs écoles rattachées (complexeId).
  // → espace groupe consolidé (/complexe). En démo, complexeId 'demo' = seed d'exemple.
  complexe: { uid: 'demo-complexe', firstName: 'Rose', lastName: 'Ngo Bell', role: 'directeur_complexe', email: 'complexe@demo', complexeId: 'demo' },
}

// Comptes demo SUPERIEUR (clic = login, pas de mot de passe).
// École fictive « EDUFREM Business School ». Les rôles correspondent à la
// grille définie dans firestore.rules (relation_internationale, comptable,
// responsable_formation, admin). 'etudiant' à venir.
const DEMO_ACCOUNTS_SUP = {
  admin: {
    uid: 'demo-sup-admin', firstName: 'Steve', lastName: 'EDUFREM',
    displayName: 'Steve · Directeur Institut Supérieur EDUFREM',
    role: 'admin', email: 'admin@demo.ebs', campus: 'douala',
  },
  // Directeur de GROUPE (multi-campus) : mêmes droits qu'admin, mais vue
  // consolidée sur les campus (effectifs par campus). Flag estGroupe.
  groupe: {
    uid: 'demo-sup-groupe', firstName: 'Rose', lastName: 'Ngo Bell',
    displayName: 'Rose Ngo Bell · Direction du groupe',
    role: 'admin', email: 'groupe@demo.ise', estGroupe: true,
  },
  relation_internationale: {
    uid: 'demo-sup-ri', firstName: 'Awa', lastName: 'Diallo',
    displayName: 'Awa Diallo · Resp. Inscriptions',
    role: 'relation_internationale', email: 'ri@demo.ebs',
  },
  comptable: {
    uid: 'demo-sup-compta', firstName: 'Lucas', lastName: 'Bernard',
    displayName: 'Lucas Bernard · Comptable',
    role: 'comptable', email: 'compta@demo.ebs',
  },
  responsable_formation: {
    uid: 'demo-sup-rp', firstName: 'Mariam', lastName: 'Sow',
    displayName: 'Mariam Sow · Resp. Formation',
    role: 'responsable_formation', email: 'formation@demo.ebs',
  },
  etudiant: {
    uid: 'demo-sup-etudiant', firstName: 'Awa', lastName: 'Étudiante',
    displayName: 'Awa · Étudiante', role: 'etudiant', email: 'etudiant@demo.ise',
  },
  enseignant: {
    uid: 'demo-sup-enseignant', firstName: 'Paul', lastName: 'Enseignant',
    displayName: 'Paul · Enseignant', role: 'enseignant', email: 'enseignant@demo.ise',
  },
  parent: {
    uid: 'demo-sup-parent', firstName: 'Parent', lastName: 'Démo',
    displayName: 'Parent · Suivi de mon étudiant', role: 'parent', email: 'parent@demo.ise',
  },
}

const DEMO_PASSWORD = 'demo1234'
const DEMO_STORAGE_KEY = 'mapo_demo_session'
const DEMO_PROFILES_KEY = 'mapo_demo_profiles'

// Helpers localStorage pour la demo
function saveDemoSession(profileData) {
  try {
    const session = {
      profile: profileData,
      timestamp: Date.now(),
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session))
  } catch (e) { /* silent */ }
}

function loadDemoSession() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    // Expire apres 24h
    if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DEMO_STORAGE_KEY)
      localStorage.removeItem(DEMO_PROFILES_KEY)
      return null
    }
    return session.profile
  } catch (e) { return null }
}

function clearDemoSession() {
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY)
    localStorage.removeItem(DEMO_PROFILES_KEY)
  } catch (e) { /* silent */ }
}

// Sauvegarder les profils demo modifies (partages entre comptes)
function saveDemoProfiles(profiles) {
  try {
    localStorage.setItem(DEMO_PROFILES_KEY, JSON.stringify(profiles))
  } catch (e) { /* silent */ }
}

function loadDemoProfiles() {
  try {
    const raw = localStorage.getItem(DEMO_PROFILES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) { return {} }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)
  const isDemo = ref(false)
  // true = connecté à Firebase mais aucun profil ni invitation → compte non configuré
  const notProvisioned = ref(false)
  // true = membre de l'équipe EDUFREM (présence d'un document dans superAdmins/{uid})
  const isSuperAdmin = ref(false)
  // true = l'utilisateur vient de se connecter via un lien magique (passwordless)
  // et n'a pas encore défini de mot de passe. L'app affiche un écran "Bienvenue"
  // qui lui demande de poser un mot de passe pour les connexions suivantes.
  const needsPassword = ref(false)

  // Promesse résolue dès que l'état d'authentification initial est connu
  // (utilisée par le routeur pour ne pas décider trop tôt).
  let resolveReady
  const readyPromise = new Promise((r) => { resolveReady = r })
  function ready() { return readyPromise }
  function markReady() {
    loading.value = false
    if (resolveReady) { resolveReady(); resolveReady = null }
  }

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const isDirecteur = computed(() => ['admin', 'directeur'].includes(userProfile.value?.role))
  const isParent = computed(() => userProfile.value?.role === 'parent')
  const isB2C = computed(() => !!userProfile.value?.b2c) // parent autonome (hors école)
  const isTeacher = computed(() => userProfile.value?.role === 'enseignant')
  const isEleve = computed(() => userProfile.value?.role === 'eleve')
  // Directeur de complexe scolaire (vue « groupe » consolidée sur plusieurs écoles).
  const isDirecteurComplexe = computed(() => userProfile.value?.role === 'directeur_complexe')
  const complexeId = computed(() => userProfile.value?.complexeId || null)

  // Édition de l'utilisateur courant ('secondaire' | 'superieur' | null).
  // En démo, l'édition est portée par le profil (cf loginDemoSup).
  // En prod, elle viendra du doc école `schools/{schoolId}.edition` à charger
  // après loadUserProfile (à implémenter en phase 2.3).
  const edition = computed(() => userProfile.value?.edition || null)
  const isEditionSuperieur = computed(() => edition.value === 'superieur')
  const isEditionSecondaire = computed(() => edition.value === 'secondaire' || (!edition.value && !!userProfile.value))

  // École à laquelle l'utilisateur est rattaché.
  // En mode démo, identifiant fixe (les stores démo n'utilisent de toute
  // façon que le localStorage).
  const schoolId = computed(() => {
    if (isDemo.value) return 'demo'
    return userProfile.value?.schoolId || null
  })

  // Prenom de l'utilisateur (pour le greeting)
  const userFirstName = computed(() => {
    if (userProfile.value?.firstName) return userProfile.value.firstName
    // Fallback: displayName = "Nom Prenom" → prendre le 2e mot
    const name = userProfile.value?.displayName || user.value?.displayName || ''
    const parts = name.trim().split(' ')
    return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || 'utilisateur'
  })

  // Connexion demo (bypass Firebase)
  function loginDemo(username, password) {
    // Jamais de démo sur l'instance d'une vraie école
    if (isSchoolTenant()) {
      return { success: false, error: 'La démonstration n\'est pas disponible sur cette instance.' }
    }
    const key = username.trim().toLowerCase()
    const account = DEMO_ACCOUNTS[key]
    if (!account) {
      return { success: false, error: 'Identifiant demo inconnu. Utilisez : directeur, enseignant, parent ou eleve.' }
    }
    if (password !== DEMO_PASSWORD) {
      return { success: false, error: 'Mot de passe incorrect. Le mot de passe demo est : demo1234' }
    }

    // Verifier si un profil modifie existe en localStorage
    const savedProfiles = loadDemoProfiles()
    const savedProfile = savedProfiles[account.uid]

    const profile = savedProfile || {
      uid: account.uid,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      displayName: `${account.lastName} ${account.firstName}`,
      role: account.role,
      photoURL: null,
      isDemo: true,
      b2c: account.b2c || false,
      complexeId: account.complexeId || null,
      // Matières/classe de l'enseignant démo → indispensable au cloisonnement Cours/Devoirs.
      subjects: account.subjects || [],
      className: account.className || null,
    }

    isDemo.value = true
    notProvisioned.value = false
    user.value = { uid: profile.uid, email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL }
    userProfile.value = profile

    // Persister la session demo
    saveDemoSession(profile)

    return { success: true }
  }

  // Connexion demo SUPERIEUR (clic = login, pas de mot de passe).
  // Démo : EDUFREM Business School, schoolId fictif 'demo-sup'.
  // Pour la version Firebase, on chargera schoolId + edition depuis le doc
  // école rattaché à l'invitation du user.
  function loginDemoSup(roleKey) {
    // Jamais de démo sur l'instance d'une vraie école
    if (isSchoolTenant()) {
      return { success: false, error: 'La démonstration n\'est pas disponible sur cette instance.' }
    }
    const account = DEMO_ACCOUNTS_SUP[roleKey]
    if (!account) {
      return { success: false, error: 'Rôle supérieur inconnu.' }
    }

    const savedProfiles = loadDemoProfiles()
    const savedProfile = savedProfiles[account.uid]

    const profile = savedProfile || {
      uid: account.uid,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      displayName: account.displayName || `${account.lastName} ${account.firstName}`,
      role: account.role,
      estGroupe: account.estGroupe || false,
      campus: account.campus || null,
      edition: 'superieur',
      schoolId: 'demo-sup',
      photoURL: null,
      isDemo: true,
    }

    isDemo.value = true
    notProvisioned.value = false
    user.value = { uid: profile.uid, email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL }
    userProfile.value = profile

    saveDemoSession(profile)
    return { success: true }
  }

  // Mettre a jour le profil (demo ou prod)
  function updateProfile(profileData) {
    userProfile.value = { ...userProfile.value, ...profileData }
    user.value = {
      ...user.value,
      displayName: profileData.displayName || user.value?.displayName,
      photoURL: profileData.photoURL !== undefined ? profileData.photoURL : user.value?.photoURL,
    }

    if (isDemo.value) {
      // Sauvegarder dans localStorage
      saveDemoSession(userProfile.value)
      // Sauvegarder aussi dans les profils partages
      const profiles = loadDemoProfiles()
      profiles[userProfile.value.uid] = userProfile.value
      saveDemoProfiles(profiles)
    }
  }

  /**
   * Met à jour les champs éditables du profil de l'utilisateur connecté
   * et persiste dans Firestore users/{uid}. À utiliser depuis la page
   * Paramètres → Mon profil.
   *
   * Les champs schoolId et role sont immuables côté client (les règles
   * Firestore le garantissent aussi).
   */
  async function updateMyProfile({ firstName, lastName, displayName, photoURL }) {
    if (!user.value || !userProfile.value) {
      return { success: false, error: "Vous n'êtes pas connecté." }
    }
    if (isDemo.value) {
      // Démo : on met juste à jour localement
      updateProfile({ firstName, lastName, displayName, photoURL })
      return { success: true }
    }
    try {
      const patch = {}
      if (firstName !== undefined) patch.firstName = firstName
      if (lastName !== undefined) patch.lastName = lastName
      if (displayName !== undefined) patch.displayName = displayName
      if (photoURL !== undefined) patch.photoURL = photoURL || null
      await updateDoc(doc(db, 'users', user.value.uid), patch)
      userProfile.value = { ...userProfile.value, ...patch }
      // Log activité (best-effort)
      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log('profile_update', `${displayName || user.value.email} a mis à jour son profil`)
      } catch (e) { /* silent */ }
      return { success: true }
    } catch (e) {
      console.error('Erreur mise à jour profil :', e)
      return { success: false, error: "Le profil n'a pas pu être enregistré." }
    }
  }

  // Connexion avec un identifiant (email OU numéro de téléphone) + mot de passe.
  // Un numéro est converti en email synthétique interne (cf utils/identifier).
  async function loginWithIdentifier(identifier, password) {
    return loginWithEmail(identifierToEmail(identifier), password)
  }

  // Inscription B2C autonome : un parent crée son compte (email + mot de passe)
  // sans passer par une invitation d'école. loadUserProfile lui attribue alors
  // automatiquement un profil parent B2C (étape 4) → accès direct à MAPO+.
  async function signUpWithEmail(email, password, displayName, meta = {}) {
    try {
      flagFreshLogin()
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (displayName && displayName.trim()) {
        try { await updateProfile(result.user, { displayName: displayName.trim() }) } catch { /* non bloquant */ }
      }
      // MAPO+ (B2C) : on enregistre l'utilisateur dans notre base (collection
      // dédiée mapoplus_users) pour le suivi côté méga-admin EDUFREM (installs,
      // persona, pays). Non bloquant : si l'écriture échoue (règle absente), la
      // création de compte réussit quand même.
      if (meta && meta.b2c) {
        try {
          await setDoc(doc(db, 'mapoplus_users', result.user.uid), {
            uid: result.user.uid,
            email: email.trim(),
            displayName: (displayName || '').trim(),
            persona: meta.role === 'apprenant' ? 'apprenant' : 'parent',
            pays: meta.pays || '',
            source: 'mapo+',
            activated: false,
            createdAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
          }, { merge: true })
        } catch (e) { console.warn('[mapoplus_users] écriture ignorée:', e && e.code) }
        // E-mail de bienvenue MAPO+ + lien d'activation (Firebase). Non bloquant.
        await sendWelcomeVerification(result.user)
      }
      user.value = result.user // pose tout de suite (cf loginWithEmail)
      await loadUserProfile(result.user)
      return { success: true, needsVerification: !!(meta && meta.b2c) && !result.user.emailVerified }
    } catch (error) {
      console.error('Erreur inscription:', error)
      let msg = "La création du compte a échoué."
      if (error.code === 'auth/email-already-in-use') msg = "Un compte existe déjà avec cet email. Connectez-vous."
      else if (error.code === 'auth/invalid-email') msg = "Adresse email invalide."
      else if (error.code === 'auth/weak-password') msg = "Mot de passe trop faible (6 caractères minimum)."
      else if (error.code === 'auth/operation-not-allowed') msg = "L'inscription par email n'est pas activée."
      return { success: false, error: msg }
    }
  }

  // ── MAPO+ : activation du compte par e-mail (Firebase) ───────────────
  // On réutilise le pipeline d'e-mails Firebase (déjà en place pour le reset
  // de mot de passe) : livraison Google, aucun serveur SMTP à gérer, rien à
  // régler côté SPF/DKIM/DMARC de notre domaine. Le lien confirme l'adresse
  // (emailVerified) puis renvoie sur l'espace MAPO+.
  function buildVerifyActionSettings() {
    return {
      url: `${window.location.origin}/parent/miapo?active=1`,
      handleCodeInApp: false,
    }
  }

  async function sendWelcomeVerification(fbUser) {
    if (!fbUser) return false
    try {
      // Langue de l'e-mail = langue de l'app (modèles FR/EN de la console).
      try { auth.languageCode = currentLang() === 'en' ? 'en' : 'fr' } catch { /* défaut projet */ }
      await sendEmailVerification(fbUser, buildVerifyActionSettings())
      return true
    } catch (e) {
      console.warn('[mapo+] envoi e-mail de bienvenue ignoré:', e && e.code)
      return false
    }
  }

  /** Renvoie l'e-mail d'activation au compte connecté (bouton « renvoyer »). */
  async function resendVerification() {
    return sendWelcomeVerification(auth.currentUser)
  }

  /**
   * Marque le compte MAPO+ « activé » dans mapoplus_users (suivi méga-admin).
   * Écriture fusionnée non bloquante ; réservée à l'instance MAPO+ et aux
   * comptes dont l'e-mail est confirmé.
   */
  async function markActivated() {
    const u = auth.currentUser
    if (!isMiapoTenant() || !u || !u.emailVerified) return
    try {
      await setDoc(doc(db, 'mapoplus_users', u.uid), {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        source: 'mapo+',
        activated: true,
        activatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      }, { merge: true })
    } catch (e) { console.warn('[mapoplus_users] activation ignorée:', e && e.code) }
  }

  /**
   * Vérifie que l'e-mail est confirmé. Court-circuit si déjà vérifié (aucun
   * appel réseau → sûr hors-ligne). Sinon on recharge une fois l'état Firebase
   * (l'utilisateur vient peut-être de cliquer le lien) puis, si c'est bon, on
   * marque le compte activé. Renvoie true si l'accès MAPO+ est autorisé.
   */
  async function ensureEmailVerified() {
    const u = auth.currentUser
    if (!u) return true            // pas de compte Firebase (démo…) : géré ailleurs
    if (u.emailVerified) return true
    try { await u.reload() } catch { /* hors-ligne : on reste bloqué, normal */ }
    if (auth.currentUser && auth.currentUser.emailVerified) {
      user.value = auth.currentUser
      await markActivated()
      return true
    }
    return false
  }

  // Connexion avec email/mot de passe
  async function loginWithEmail(email, password) {
    try {
      flagFreshLogin()
      const result = await signInWithEmailAndPassword(auth, email, password)
      // Pose user.value tout de suite (sinon le garde de route voit « non
      // connecté » avant que onAuthStateChanged ne se déclenche → renvoi au login).
      user.value = result.user
      await loadUserProfile(result.user)
      await markActivated()
      return { success: true }
    } catch (error) {
      console.error('Erreur connexion email:', error)
      let msg = 'Identifiants incorrects.'
      if (error.code === 'auth/user-not-found') msg = 'Aucun compte associe a cet email.'
      else if (error.code === 'auth/wrong-password') msg = 'Mot de passe incorrect.'
      else if (error.code === 'auth/invalid-email') msg = 'Adresse email invalide.'
      else if (error.code === 'auth/invalid-credential') msg = 'Identifiants incorrects.'
      else if (error.code === 'auth/too-many-requests') msg = 'Trop de tentatives. Reessayez plus tard.'
      return { success: false, error: msg }
    }
  }

  /**
   * Envoie un mail de réinitialisation de mot de passe à l'utilisateur.
   * Firebase gère lui-même l'envoi (depuis noreply@<projet>.firebaseapp.com)
   * et le lien retourne sur la page configurée dans Firebase Console.
   */
  async function resetPassword(email) {
    const normalized = (email || '').trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) {
      return { success: false, error: "Adresse email invalide." }
    }
    try {
      await sendPasswordResetEmail(auth, normalized)
      return { success: true }
    } catch (error) {
      console.error('Erreur reset password:', error)
      // Pour la sécurité on ne révèle pas si l'email existe ou non.
      // Firebase renvoie auth/user-not-found mais on retourne un message neutre.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        return { success: true } // message neutre côté UI
      }
      if (error.code === 'auth/too-many-requests') {
        return { success: false, error: "Trop de tentatives. Réessayez dans quelques minutes." }
      }
      return { success: false, error: "L'envoi du mail a échoué. Réessayez plus tard." }
    }
  }

  /**
   * Envoie un mail de réinitialisation de mot de passe à l'utilisateur
   * actuellement connecté. Pratique pour l'écran "Mon profil".
   */
  async function sendPasswordResetToMe() {
    const email = auth.currentUser?.email
    if (!email) {
      return { success: false, error: "Aucun email associé à votre compte." }
    }
    const result = await resetPassword(email)
    if (result.success) {
      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log(
          'profile_update',
          'Demande de réinitialisation de mot de passe',
          { email }
        )
      } catch (e) { /* silent */ }
    }
    return result
  }

  // Connexion avec Google
  async function loginWithGoogle() {
    try {
      flagFreshLogin()
      const result = await signInWithPopup(auth, googleProvider)
      user.value = result.user // voir loginWithEmail : éviter le renvoi au login
      await loadUserProfile(result.user)
      await markActivated()
      return { success: true }
    } catch (error) {
      console.error('Erreur connexion Google:', error)
      let msg = "Connexion Google impossible."
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        msg = "Connexion Google annulée."
      } else if (error.code === 'auth/user-cancelled') {
        msg = "Vous avez refusé l'autorisation Google. Réessayez en acceptant."
      } else if (error.code === 'auth/popup-blocked') {
        msg = "La popup Google a été bloquée par votre navigateur. Autorisez les popups pour ce site."
      } else if (error.code === 'auth/unauthorized-domain') {
        msg = "Ce domaine n'est pas autorisé. Contactez l'administrateur."
      } else if (error.code === 'auth/network-request-failed') {
        msg = "Problème de connexion réseau. Vérifiez votre internet."
      }
      return { success: false, error: msg }
    }
  }

  /**
   * Charge le profil Firestore de l'utilisateur.
   * - Profil existant → on le charge (il porte schoolId + role).
   * - Pas de profil → on cherche une invitation pour son email :
   *     • trouvée  → on provisionne le compte à partir de l'invitation ;
   *     • aucune   → compte non configuré (notProvisioned = true).
   * Plus aucune auto-création de profil "enseignant" comme avant.
   */
  async function loadUserProfile(firebaseUser) {
    if (!firebaseUser) return
    notProvisioned.value = false
    isSuperAdmin.value = false

    // 1) Compte super admin EDUFREM ? (court-circuit le flux école)
    try {
      const superSnap = await getDoc(doc(db, 'superAdmins', firebaseUser.uid))
      if (superSnap.exists()) {
        isSuperAdmin.value = true
        userProfile.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          role: 'superadmin',
          schoolId: null,
          status: 'active',
          ...superSnap.data(),
        }
        return
      }
    } catch (e) {
      console.error('Erreur vérification super admin:', e)
    }

    // 2) Profil utilisateur d'école
    const ref_ = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref_)

    if (snap.exists()) {
      userProfile.value = snap.data()
      return
    }

    // 3) Pas de profil : tenter le provisioning via une invitation
    const provisioned = await provisionFromInvitation(firebaseUser)
    if (provisioned) {
      userProfile.value = provisioned
      return
    }

    // 4) Aucune école / invitation → compte PARENT B2C AUTONOME (« école-optionnel »).
    // Le parent accède directement à l'espace MAPO+ (tuteur, suivi de son enfant)
    // sans dépendre d'un établissement. Ses données vivent sous users/{uid}/...
    userProfile.value = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      role: 'parent',
      schoolId: null,
      b2c: true, // marqueur : compte parent autonome (hors école)
      status: 'active',
    }
    notProvisioned.value = false
  }

  /**
   * Cherche une invitation en attente pour l'email de l'utilisateur et,
   * si elle existe, crée son profil rattaché à l'école et au rôle de
   * l'invitation, puis marque l'invitation comme acceptée.
   */
  async function provisionFromInvitation(firebaseUser) {
    if (!firebaseUser?.email) return null
    try {
      const q = query(
        collection(db, 'invitations'),
        where('email', '==', firebaseUser.email),
        where('status', '==', 'pending')
      )
      const snap = await getDocs(q)
      if (snap.empty) return null

      const invDoc = snap.docs[0]
      const inv = invDoc.data()

      const nameParts = (firebaseUser.displayName || inv.displayName || '').trim().split(' ')
      const profile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || inv.displayName || firebaseUser.email,
        firstName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '',
        lastName: nameParts.length > 1 ? nameParts[0] : '',
        photoURL: firebaseUser.photoURL || null,
        phone: inv.phone || null,
        identifierType: inv.identifierType || 'email',
        schoolId: inv.schoolId,
        role: inv.role,
        status: 'active',
        invitationId: invDoc.id,
        createdAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), profile)
      // Marquer l'invitation acceptée (best-effort)
      try {
        await updateDoc(invDoc.ref, {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          acceptedByUid: firebaseUser.uid,
        })
      } catch (e) { /* l'invitation reste "pending", sans gravité */ }

      return profile
    } catch (error) {
      console.error('Erreur provisioning invitation:', error)
      return null
    }
  }

  // Deconnexion
  async function logout() {
    if (!isDemo.value) {
      await signOut(auth)
    }
    user.value = null
    userProfile.value = null
    isDemo.value = false
    notProvisioned.value = false
    isSuperAdmin.value = false
    clearDemoSession()
  }

  // Erreur du flux magic link rendue dans l'UI si la consommation du lien échoue.
  const magicLinkError = ref('')

  /**
   * Si l'URL contient un sign-in link Firebase (provient d'un email d'invitation),
   * on log automatiquement l'utilisateur sans mot de passe. On marque ensuite
   * `needsPassword=true` pour que l'app affiche l'écran "Définissez votre mot
   * de passe pour les prochaines connexions".
   *
   * L'email est lu en priorité dans le query param `email=...` (passé par
   * `buildSignInActionSettings` lors de l'invitation), sinon dans le
   * localStorage de l'invité (fallback si même machine), sinon un prompt.
   */
  async function consumeMagicLinkIfPresent() {
    if (!isSignInWithEmailLink(auth, window.location.href)) return false
    magicLinkError.value = ''
    let email = ''
    try {
      const params = new URLSearchParams(window.location.search)
      email = (params.get('email') || '').trim().toLowerCase()
      if (!email) {
        email = (window.localStorage.getItem('mapoInviteEmail') || '').trim().toLowerCase()
      }
      if (!email) {
        const typed = window.prompt('Confirme ton adresse email pour finaliser la connexion :')
        email = (typed || '').trim().toLowerCase()
      }
      if (!email) {
        magicLinkError.value = "Adresse email requise pour finaliser la connexion."
        return false
      }
      flagFreshLogin()
      await signInWithEmailLink(auth, email, window.location.href)
      try { window.localStorage.removeItem('mapoInviteEmail') } catch (e) {}
      // Nettoyer l'URL pour retirer les params Firebase (apiKey, oobCode, ...)
      const cleanUrl = window.location.origin + window.location.pathname
      try { window.history.replaceState({}, '', cleanUrl) } catch (e) {}
      // On n'affiche l'écran "définir mot de passe" QUE si l'utilisateur n'a
      // pas encore de mot de passe (premier sign-in via magic link). Sinon
      // c'est une simple reconnexion via lien (cas d'un user qui a perdu son
      // mot de passe ou utilise le lien comme raccourci) : on le laisse aller
      // direct au dashboard.
      const hasPasswordProvider = auth.currentUser?.providerData?.some(
        (p) => p.providerId === 'password'
      )
      needsPassword.value = !hasPasswordProvider
      return true
    } catch (e) {
      console.error('Sign-in via lien magique a échoué :', e)
      // Mapping erreur lisible pour l'utilisateur
      if (e?.code === 'auth/invalid-action-code' || e?.code === 'auth/expired-action-code') {
        magicLinkError.value = "Ce lien d'invitation a déjà été utilisé ou a expiré. Demandez un nouveau lien à l'administrateur de votre établissement."
      } else if (e?.code === 'auth/invalid-email') {
        magicLinkError.value = "L'adresse email saisie ne correspond pas à celle de l'invitation. Réessayez avec l'email exact qui a reçu le lien."
      } else {
        magicLinkError.value = "Échec de la connexion via le lien email. Demandez un nouveau lien à l'administrateur."
      }
      return false
    }
  }

  function clearMagicLinkError() { magicLinkError.value = '' }

  /**
   * Définit le mot de passe initial après connexion via lien magique.
   * Appelée depuis l'écran "Bienvenue, définis ton mot de passe".
   */
  async function setInitialPassword(password) {
    const u = auth.currentUser
    if (!u) return { success: false, error: "Aucun utilisateur connecté." }
    if (!password || password.length < 6) {
      return { success: false, error: "Le mot de passe doit faire au moins 6 caractères." }
    }
    try {
      await updatePassword(u, password)
      needsPassword.value = false
      return { success: true }
    } catch (e) {
      console.error('Erreur définition mot de passe initial :', e)
      if (e?.code === 'auth/requires-recent-login') {
        return { success: false, error: "Reconnecte-toi via le lien email pour définir ton mot de passe." }
      }
      return { success: false, error: "Le mot de passe n'a pas pu être enregistré." }
    }
  }

  /** L'utilisateur peut sauter l'étape (il devra utiliser le lien magique à nouveau). */
  function dismissNeedsPassword() {
    needsPassword.value = false
  }

  // Initialisation : ecouter Firebase ET restaurer session demo
  function init() {
    // D'abord verifier s'il y a une session demo en localStorage
    const demoProfile = loadDemoSession()
    if (demoProfile) {
      isDemo.value = true
      userProfile.value = demoProfile
      user.value = {
        uid: demoProfile.uid,
        email: demoProfile.email,
        displayName: demoProfile.displayName,
        photoURL: demoProfile.photoURL,
      }
      markReady()
      // On ecoute quand meme Firebase pour le cas ou on switch en prod
      onAuthStateChanged(auth, () => {})
      return
    }

    // Détecter un sign-in link reçu par email (invitation magic link).
    // On l'attend avant que onAuthStateChanged se déclenche pour que le
    // user soit déjà loggé.
    consumeMagicLinkIfPresent().catch(() => {})

    // Sinon ecouter Firebase normalement.
    // Pour ne PAS logger un événement "login" à chaque rechargement (Firebase
    // restaure la session via onAuthStateChanged sans nouveau sign-in), on
    // utilise sessionStorage. Le flag est posé explicitement par les actions
    // loginWithEmail / loginWithGoogle / consumeMagicLinkIfPresent quand
    // l'utilisateur vient réellement de se loguer.
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (isDemo.value) return // Ne pas ecraser la session demo
      user.value = firebaseUser
      if (firebaseUser) {
        try {
          await loadUserProfile(firebaseUser)
        } catch (error) {
          console.error('Erreur chargement profil:', error)
          userProfile.value = null
        }
        // Log d'activité uniquement si un sign-in actif a été déclenché
        // dans la session courante (et pas déjà loggé pour cet uid).
        try {
          const pending = sessionStorage.getItem('mapo_pending_login_log')
          const alreadyLogged = sessionStorage.getItem('mapo_logged_uid') === firebaseUser.uid
          if (pending === '1' && !alreadyLogged && userProfile.value?.schoolId) {
            sessionStorage.removeItem('mapo_pending_login_log')
            sessionStorage.setItem('mapo_logged_uid', firebaseUser.uid)
            import('./supActivity').then(({ useSupActivityStore }) => {
              try {
                const act = useSupActivityStore()
                act.log('login', `${userProfile.value.displayName || userProfile.value.email} s'est connecté`)
              } catch (e) { /* silent */ }
            })
          }
        } catch (e) { /* sessionStorage indisponible : silent */ }
      } else {
        userProfile.value = null
        notProvisioned.value = false
        isSuperAdmin.value = false
        try { sessionStorage.removeItem('mapo_logged_uid') } catch (e) { /* silent */ }
      }
      markReady()
    })
  }

  /** Marque un sign-in actif (utilisé par loginWithEmail, loginWithGoogle, magic link). */
  function flagFreshLogin() {
    try { sessionStorage.setItem('mapo_pending_login_log', '1') } catch (e) { /* silent */ }
  }

  return {
    user, userProfile, loading,
    isAuthenticated, isAdmin, isDirecteur, isParent, isB2C, isTeacher, isEleve,
    isDirecteurComplexe, complexeId,
    edition, isEditionSuperieur, isEditionSecondaire,
    isDemo, notProvisioned, isSuperAdmin, schoolId, userFirstName,
    loginDemo, loginDemoSup, loginWithEmail, loginWithIdentifier, signUpWithEmail, loginWithGoogle, resetPassword,
    resendVerification, ensureEmailVerified,
    sendPasswordResetToMe,
    needsPassword, setInitialPassword, dismissNeedsPassword,
    magicLinkError, clearMagicLinkError,
    updateProfile, updateMyProfile, logout, init, ready
  }
})
