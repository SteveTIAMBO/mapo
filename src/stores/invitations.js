import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth, firebaseConfig } from '../firebase'
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { sendSignInLinkToEmail, getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { initializeApp, deleteApp } from 'firebase/app'
import { phoneToEmail, normalizePhone } from '../utils/identifier'
import { useAuthStore } from './auth'

/** Génère un mot de passe initial lisible (8 caractères, sans caractères ambigus). */
function genInitialPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let p = ''
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

/**
 * Construit les actionCodeSettings pour le lien magique d'invitation.
 * L'URL de retour est sur l'origine actuelle (tenant école) avec le query
 * param `invited=1` (signal du flux d'invitation) et `email=xxx` pour
 * que l'app puisse compléter signInWithEmailLink sans demander l'email
 * à l'utilisateur (évite le window.prompt désagréable).
 */
function buildSignInActionSettings(email) {
  const base = `${window.location.origin}/superieur?invited=1`
  const withEmail = email ? `${base}&email=${encodeURIComponent(email)}` : base
  return {
    url: withEmail,
    handleCodeInApp: true,
  }
}

/**
 * Store "invitations" — gestion des accès du personnel.
 *
 * Le directeur (ou un admin) invite un membre du personnel par email + rôle.
 * À sa première connexion, la personne est automatiquement rattachée à
 * l'école avec le bon rôle (voir auth store → provisionFromInvitation).
 *
 * En mode démonstration, cette fonctionnalité est inactive (les comptes
 * démo sont fixes) — le store renvoie alors des listes vides.
 */

// Rôles que le directeur peut attribuer à un membre du personnel (secondaire)
export const ROLES_PERSONNEL = [
  { value: 'admin', label: 'Administrateur', description: 'Accès complet, sauf la gestion des rôles' },
  { value: 'secretaire', label: 'Secrétaire', description: 'Inscriptions, élèves, classes' },
  { value: 'comptable', label: 'Comptable', description: 'Comptabilité et rapports financiers' },
  { value: 'enseignant', label: 'Enseignant', description: 'Notes, présences, devoirs de ses classes' },
  { value: 'surveillant', label: 'Surveillant', description: 'Présences, discipline, emploi du temps' },
  { value: 'cantine', label: 'Responsable cantine', description: 'Liste des élèves, facturation cantine' },
]

// Rôles spécifiques à l'enseignement supérieur, utilisés par SupGestionAcces.
export const ROLES_PERSONNEL_SUP = [
  { value: 'admin', label: 'Administrateur', description: 'Accès complet à tous les modules de l\'école.' },
  { value: 'relation_internationale', label: 'Relations internationales', description: 'Suivi des étudiants en mobilité entrante : dossiers, visa, logement, arrivée.' },
  { value: 'responsable_formation', label: 'Responsable de formation', description: 'Programmes, UE, intervenants, notes, stages, salles.' },
  { value: 'comptable', label: 'Comptable', description: 'Facturation, paiements, échéanciers, bourses, financements.' },
]

const ROLE_LABELS = {
  directeur: 'Directeur',
  admin: 'Administrateur',
  secretaire: 'Secrétaire',
  comptable: 'Comptable',
  enseignant: 'Enseignant',
  surveillant: 'Surveillant',
  cantine: 'Responsable cantine',
  relation_internationale: 'Relations internationales',
  responsable_formation: 'Responsable de formation',
}
export const roleLabel = (r) => ROLE_LABELS[r] || r

export const useInvitationsStore = defineStore('invitations', () => {
  const staff = ref([])          // membres du personnel déjà actifs (users)
  const invitations = ref([])    // invitations en attente / acceptées
  const loading = ref(false)
  const error = ref('')

  const pendingInvitations = computed(() =>
    invitations.value.filter((i) => i.status === 'pending')
  )

  /**
   * Charge le personnel actif et les invitations de l'école courante.
   */
  async function load() {
    const authStore = useAuthStore()
    error.value = ''

    // Mode démo : la gestion des accès n'est pas active
    if (authStore.isDemo) {
      staff.value = []
      invitations.value = []
      return
    }
    if (!authStore.schoolId) return

    loading.value = true
    try {
      // Personnel actif (documents users de l'école)
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('schoolId', '==', authStore.schoolId))
      )
      staff.value = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // Invitations de l'école
      const invSnap = await getDocs(
        query(collection(db, 'invitations'), where('schoolId', '==', authStore.schoolId))
      )
      invitations.value = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      console.error('Erreur chargement des accès:', e)
      error.value = "Impossible de charger la liste des accès."
    } finally {
      loading.value = false
    }
  }

  /**
   * Crée une invitation pour un membre du personnel.
   */
  async function inviteMember(email, role) {
    const authStore = useAuthStore()
    error.value = ''

    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Adresse email invalide.' }
    }
    if (!ROLES_PERSONNEL.some((r) => r.value === role)) {
      return { success: false, error: 'Rôle invalide.' }
    }
    if (authStore.isDemo) {
      return { success: false, error: "La gestion des accès n'est pas disponible en mode démonstration." }
    }
    if (!authStore.schoolId) {
      return { success: false, error: 'Aucune école associée à votre compte.' }
    }

    // Déjà membre ou déjà invité ?
    if (staff.value.some((s) => (s.email || '').toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Cette personne fait déjà partie du personnel.' }
    }
    if (pendingInvitations.value.some((i) => (i.email || '').toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Une invitation est déjà en attente pour cet email.' }
    }

    try {
      // 1) Créer l'invitation Firestore (porte le role et le schoolId).
      const ref_ = await addDoc(collection(db, 'invitations'), {
        email: cleanEmail,
        role,
        schoolId: authStore.schoolId,
        invitedBy: authStore.user?.uid || null,
        invitedByName: authStore.userProfile?.displayName || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      invitations.value.push({
        id: ref_.id,
        email: cleanEmail,
        role,
        schoolId: authStore.schoolId,
        status: 'pending',
      })

      // 2) Envoyer le lien magique (passwordless) par email à l'invité.
      // L'invité clique le lien → Firebase Auth crée le compte si besoin
      // et le connecte → provisionFromInvitation crée son profil avec
      // le role et le schoolId de l'invitation.
      let emailSent = false
      let emailError = null
      try {
        await sendSignInLinkToEmail(auth, cleanEmail, buildSignInActionSettings(cleanEmail))
        // Aide pour le navigateur de l'invité au cas où il revient sur la même
        // machine (optimisation, pas obligatoire)
        try { window.localStorage.setItem('mapoInviteEmail', cleanEmail) } catch (e) {}
        emailSent = true
      } catch (e) {
        // L'invitation Firestore est créée même si l'email échoue.
        // L'admin pourra renvoyer le lien plus tard (bouton à venir).
        console.warn('Envoi du lien magique a échoué :', e)
        if (e?.code === 'auth/operation-not-allowed') {
          emailError = "Le sign-in par lien email n'est pas activé dans Firebase Console (Authentication → Sign-in method → Email link)."
        } else {
          emailError = "L'invitation est créée mais l'envoi du mail a échoué."
        }
      }

      // Pont MOBI (best-effort) : les roles de gestion obtiennent l'acces
      // aux paiements de scolarite MOBI de l'ecole (bridge_ecoles).
      // L'appelant doit deja etre autorise (admin de l'ecole) ; verifie serveur.
      if (['admin', 'comptable', 'directeur'].includes(role)) {
        try {
          const tok = await auth.currentUser.getIdToken()
          fetch('https://mobi.app-edufrem.com/scolarite-bridge.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
            body: JSON.stringify({ action: 'add_emails', schoolId: authStore.schoolId, emails: [cleanEmail] }),
          }).catch(() => {})
        } catch (e) { /* silent */ }
      }

      // Log d'activité (best-effort)
      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log(
          'invitation',
          `Invitation envoyée à ${cleanEmail} (${role})`,
          { email: cleanEmail, role }
        )
      } catch (e) { /* silent */ }

      return { success: true, emailSent, emailError }
    } catch (e) {
      console.error('Erreur création invitation:', e)
      return { success: false, error: "L'invitation n'a pas pu être créée." }
    }
  }

  /**
   * Renvoie un lien magique à un invité dont l'invitation existe déjà.
   */
  async function resendInvitationLink(invitation) {
    try {
      await sendSignInLinkToEmail(auth, invitation.email, buildSignInActionSettings(invitation.email))
      return { success: true }
    } catch (e) {
      console.warn('Renvoi du lien magique a échoué :', e)
      if (e?.code === 'auth/operation-not-allowed') {
        return { success: false, error: "Le sign-in par lien email n'est pas activé dans Firebase Console." }
      }
      return { success: false, error: "L'envoi du mail a échoué. Réessayez dans quelques minutes." }
    }
  }

  /**
   * Supprime un membre du personnel actif.
   *
   * Supprime uniquement le document Firestore users/{uid} : la personne
   * perd l'accès à l'école et l'admin peut la réinviter (le compte
   * Firebase Auth reste mais sans profil il est inutilisable jusqu'à
   * la prochaine invitation qui re-provisionne le doc).
   *
   * Garde-fous :
   *  - un admin ne peut pas se supprimer lui-même
   *  - un admin ne peut pas supprimer le directeur
   */
  async function removeStaffMember(uid) {
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      return { success: false, error: "La suppression n'est pas disponible en mode démonstration." }
    }
    if (!uid) return { success: false, error: 'Identifiant manquant.' }
    if (uid === authStore.user?.uid) {
      return { success: false, error: 'Vous ne pouvez pas vous supprimer vous-même.' }
    }
    const member = staff.value.find((s) => s.id === uid)
    if (member && member.role === 'directeur') {
      return { success: false, error: 'Le directeur ne peut pas être supprimé.' }
    }
    try {
      await deleteDoc(doc(db, 'users', uid))
      staff.value = staff.value.filter((s) => s.id !== uid)
      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log(
          'invitation_revoked',
          `Accès supprimé pour ${member?.displayName || member?.email || uid}`,
          { uid, email: member?.email || null, role: member?.role || null }
        )
      } catch (e) { /* silent */ }
      return { success: true }
    } catch (e) {
      console.error('Erreur suppression membre:', e)
      return { success: false, error: "La suppression a échoué. Réessayez." }
    }
  }

  /**
   * Annule une invitation en attente.
   */
  async function revokeInvitation(invitationId) {
    const authStore = useAuthStore()
    if (authStore.isDemo) return { success: false }
    try {
      const inv = invitations.value.find((i) => i.id === invitationId)
      await deleteDoc(doc(db, 'invitations', invitationId))
      invitations.value = invitations.value.filter((i) => i.id !== invitationId)
      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log(
          'invitation_revoked',
          `Invitation de ${inv?.email || 'inconnu'} annulée`
        )
      } catch (e) { /* silent */ }
      return { success: true }
    } catch (e) {
      console.error('Erreur annulation invitation:', e)
      return { success: false, error: "L'invitation n'a pas pu être annulée." }
    }
  }

  /**
   * Crée un accès par TÉLÉPHONE (pour les personnes sans email).
   *
   * Le compte Firebase est créé immédiatement (email synthétique dérivé du
   * numéro + mot de passe initial) afin que la personne puisse se connecter
   * tout de suite avec son numéro + ce mot de passe. La création se fait via
   * une instance Firebase SECONDAIRE pour ne PAS déconnecter le directeur.
   *
   * Une invitation "pending" est aussi créée : à la première connexion,
   * provisionFromInvitation (auth store) rattache la personne à l'école.
   *
   * Retourne { success, phone, password } pour que le directeur communique
   * les identifiants à la personne.
   */
  async function createPhoneAccess({ firstName, lastName, phone, role, password }) {
    const authStore = useAuthStore()
    error.value = ''
    if (authStore.isDemo) {
      return { success: false, error: "Indisponible en mode démonstration." }
    }
    if (!authStore.schoolId) {
      return { success: false, error: "Aucune école active." }
    }
    const cleanPhone = normalizePhone(phone)
    if (cleanPhone.length < 6) {
      return { success: false, error: "Numéro de téléphone invalide (saisissez l'indicatif, ex : +237...)." }
    }
    const email = phoneToEmail(cleanPhone)
    const pwd = (password && password.length >= 6) ? password : genInitialPassword()
    const displayName = `${(lastName || '').trim()} ${(firstName || '').trim()}`.trim()

    // Doublon ?
    if (staff.value.some((s) => (s.email || '') === email)
        || invitations.value.some((i) => (i.email || '') === email)) {
      return { success: false, error: "Un accès existe déjà pour ce numéro." }
    }

    // App Firebase secondaire : créer le compte sans toucher la session du directeur.
    const secondaryApp = initializeApp(firebaseConfig, 'mapo-secondary-' + Date.now())
    const secondaryAuth = getAuth(secondaryApp)
    try {
      await createUserWithEmailAndPassword(secondaryAuth, email, pwd)
      try { await signOut(secondaryAuth) } catch (e) { /* silent */ }

      // Invitation Firestore (créée par l'admin → rattachement au 1er login)
      const ref_ = await addDoc(collection(db, 'invitations'), {
        email,
        phone: cleanPhone,
        displayName,
        identifierType: 'phone',
        role,
        schoolId: authStore.schoolId,
        invitedBy: authStore.user?.uid || null,
        invitedByName: authStore.userProfile?.displayName || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      invitations.value.push({
        id: ref_.id, email, phone: cleanPhone, displayName,
        identifierType: 'phone', role, schoolId: authStore.schoolId, status: 'pending',
      })

      try {
        const { useSupActivityStore } = await import('./supActivity')
        const act = useSupActivityStore()
        await act.log('invitation', `Accès par téléphone créé pour ${displayName || cleanPhone} (${role})`, { phone: cleanPhone, role })
      } catch (e) { /* silent */ }

      return { success: true, phone: cleanPhone, password: pwd }
    } catch (e) {
      console.error('Erreur création accès téléphone:', e)
      let msg = "La création de l'accès a échoué."
      if (e?.code === 'auth/email-already-in-use') msg = "Un compte existe déjà pour ce numéro."
      else if (e?.code === 'auth/weak-password') msg = "Le mot de passe doit faire au moins 6 caractères."
      else if (e?.code === 'auth/operation-not-allowed') msg = "La connexion email/mot de passe n'est pas activée dans Firebase Console."
      return { success: false, error: msg }
    } finally {
      try { await deleteApp(secondaryApp) } catch (e) { /* silent */ }
    }
  }

  return {
    staff,
    invitations,
    pendingInvitations,
    loading,
    error,
    load,
    inviteMember,
    createPhoneAccess,
    resendInvitationLink,
    revokeInvitation,
    removeStaffMember,
  }
})
