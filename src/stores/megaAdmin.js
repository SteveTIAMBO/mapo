import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth as fbAuth } from '../firebase'
import {
  collection, doc, addDoc, getDoc, getDocs, getCountFromServer, updateDoc, setDoc,
  writeBatch, serverTimestamp, query, where
} from 'firebase/firestore'
import { sendSignInLinkToEmail } from 'firebase/auth'
import { useAuthStore } from './auth'

/**
 * Envoie à chaque administrateur d'une nouvelle école un email avec un lien
 * de connexion (magic link). En ouvrant le lien, la personne se connecte
 * sans mot de passe, puis l'app lui propose d'en définir un (cf auth store
 * → needsPassword / setInitialPassword). Le lien redirige vers `baseDomain`,
 * qui DOIT être un domaine autorisé Firebase (sous-domaine de l'école si le
 * provisioning a réussi, sinon le domaine principal mapo en repli).
 * Retourne { sent, total, error }.
 */
async function sendAdminInvites(emails, baseDomain) {
  let sent = 0
  let lastError = null
  for (const email of emails) {
    try {
      await sendSignInLinkToEmail(fbAuth, email, {
        url: `https://${baseDomain}/?invited=1&email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
      })
      sent++
    } catch (e) {
      console.warn('Envoi invitation admin échoué:', email, e && (e.code || e.message))
      lastError = (e && (e.code || e.message)) || 'envoi_echec'
    }
  }
  return { sent, total: emails.length, error: lastError }
}

/**
 * Store "megaAdmin" — espace EDUFREM de provisionnement et de pilotage.
 *
 * Accessible uniquement aux super admins (présence d'un document
 * superAdmins/{uid}). Permet de :
 *   - lister toutes les écoles avec leurs infos clés ;
 *   - créer une école (document schools/{slug}) ;
 *   - inviter le directeur d'une école (document invitations/{...}).
 *
 * Les règles de sécurité Firestore garantissent qu'aucune autre catégorie
 * d'utilisateur ne peut accéder à ces opérations.
 */

// Validation du « slug » : ce sera l'identifiant de l'école et son
// sous-domaine (xyz.app-edufrem.com). Lettres minuscules, chiffres et
// tirets uniquement, 3 à 40 caractères, pas de tiret en début/fin.
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/
const RESERVED_SLUGS = new Set([
  'admin', 'adminmapo', 'mapo', 'www', 'api', 'auth', 'static', 'cdn', 'app',
  'edu', 'mobi', 'ring', 'aris', 'nova',
])

/**
 * Éditions supportées et modules disponibles par édition.
 * Côté UI : le mégaAdmin coche les modules à activer pour l'école.
 * Côté code : la vue SuperieurView filtre les onglets par modulesActifs.
 *
 * Les modules core (dashboard, parametres) sont toujours actifs.
 */
/**
 * Familles de modules — un simple regroupement pour l'écran de sélection.
 * Ce n'est PLUS une hiérarchie de droits : aucune famille n'est privilégiée,
 * chaque module se coche ou se décoche indépendamment.
 */
export const MODULES_STRUCTURE = [
  'dashboard', 'eleves', 'inscriptions', 'classes', 'matieres', 'personnel',
  'import', 'transition-annee', 'parametres', 'roles',
]
export const MODULES_PEDAGOGIE = [
  'notes', 'presences', 'emploi-du-temps', 'devoirs', 'preparation',
  'discipline', 'messagerie', 'salaire', 'facturation', 'rapports',
]
export const MODULES_SERVICES = ['bibliotheque', 'transport', 'cantine', 'infirmerie']

export const EDITIONS = {
  primaire: {
    key: 'primaire',
    label: 'Primaire',
    description: 'Maternelle et primaire',
    // Plus de socle : TOUT est cochable, y compris la structure. Ce qui est ici
    // n'est qu'un ordre d'affichage et une présélection.
    modulesDisponibles: [...MODULES_STRUCTURE, ...MODULES_PEDAGOGIE, ...MODULES_SERVICES],
    modulesParDefaut: [...MODULES_STRUCTURE, 'notes', 'presences'],
    roleAdmin: 'directeur',
  },
  secondaire: {
    key: 'secondaire',
    label: 'Secondaire',
    description: 'Collège et lycée',
    modulesDisponibles: [...MODULES_STRUCTURE, ...MODULES_PEDAGOGIE, ...MODULES_SERVICES],
    modulesParDefaut: [...MODULES_STRUCTURE, 'notes', 'presences', 'emploi-du-temps', 'messagerie'],
    roleAdmin: 'directeur',
  },
  superieur: {
    key: 'superieur',
    label: 'Enseignement supérieur',
    description: 'Université, école d\'ingénieurs, école de commerce',
    modulesDisponibles: ['etudiants', 'formation', 'finance', 'mobilite_entrante'],
    modulesParDefaut: ['etudiants', 'formation', 'finance'],
    roleAdmin: 'admin',
  },
}

export const MODULES_INFO = {
  // ── Modules édition supérieur ──
  etudiants: { label: 'Étudiants', description: 'Annuaire, fiches, importations.' },
  formation: { label: 'Offre de formation', description: 'Programmes, UE, intervenants, emploi du temps, notes, stages, salles.' },
  finance: { label: 'Finance & scolarité', description: 'Tarifs, échéanciers, comptes étudiants, paiements, bourses, financements tiers.' },
  mobilite_entrante: { label: 'Mobilité entrante', description: 'Suivi des étudiants internationaux acceptés, jusqu\'à leur arrivée.' },
  // ── Modules éditions primaire / secondaire ──
  notes: { label: 'Notes & bulletins', description: 'Saisie des notes, moyennes, bulletins séquence/trimestre/annuel.' },
  presences: { label: 'Présences', description: 'Appel quotidien et suivi des absences.' },
  'emploi-du-temps': { label: 'Emploi du temps', description: 'Grille horaire, affectations enseignants, génération du planning.' },
  devoirs: { label: 'Devoirs', description: 'Création et suivi des devoirs par classe.' },
  discipline: { label: 'Discipline', description: 'Incidents, sanctions et avertissements.' },
  messagerie: { label: 'Messagerie', description: 'Communication interne école, enseignants et familles.' },
  salaire: { label: 'Mon salaire', description: 'Consultation de la rémunération par le personnel.' },
  facturation: { label: 'Comptabilité', description: 'Frais de scolarité, paiements et salaires.' },
  rapports: { label: 'Rapports', description: 'Statistiques et rapports d\'établissement.' },
  preparation: { label: 'Cahier de préparation', description: 'Plans de progression par matière, validés par la direction.' },
  // ── Structure de l'établissement ──
  // Ces modules formaient le « socle » : ils étaient toujours actifs et
  // n'apparaissaient nulle part. Ils sont désormais des cases à cocher comme les
  // autres. Les décocher est possible et assumé ; l'école ne peut pas se
  // verrouiller définitivement puisque seul EDUFREM modifie cette liste.
  dashboard: { label: 'Tableau de bord', description: 'Écran d\'accueil et indicateurs de l\'établissement.' },
  eleves: { label: 'Élèves', description: 'Annuaire des élèves, fiches et dossiers.' },
  inscriptions: { label: 'Inscriptions', description: 'Demandes d\'inscription et admissions.' },
  classes: { label: 'Classes', description: 'Niveaux, classes et effectifs.' },
  matieres: { label: 'Matières', description: 'Référentiel des matières et coefficients.' },
  personnel: { label: 'Personnel', description: 'Enseignants et personnel administratif.' },
  import: { label: 'Import', description: 'Import du classeur de démarrage (élèves, classes, matières).' },
  'transition-annee': { label: 'Passage d\'année', description: 'Bilan de fin d\'année et création de la nouvelle année.' },
  parametres: { label: 'Paramètres', description: 'Identité de l\'école, périodes, devise, évaluation.' },
  roles: { label: 'Rôles & accès', description: 'Comptes, invitations et permissions par rôle.' },
  // ── Vie scolaire & services ──
  bibliotheque: { label: 'Bibliothèque', description: 'Fonds documentaire, emprunts et retours.' },
  transport: { label: 'Transport', description: 'Circuits, véhicules et élèves transportés.' },
  cantine: { label: 'Cantine', description: 'Menus, crédits repas et suivi.' },
  infirmerie: { label: 'Infirmerie', description: 'Fiches de santé, passages et soins.' },
}

/**
 * Version du modèle de modules porté par le document école.
 *
 * ⚠️ Sans ce marqueur, la suppression du socle CASSE toutes les écoles déjà
 * créées. Leur champ `modulesActifs` ne contient que les modules OPTIONNELS —
 * le socle étant implicite à l'époque. Si l'on se met à filtrer TOUTES les clés
 * sur cette liste, ces écoles perdent d'un coup Élèves, Classes, Paramètres et
 * Accès, sans un message. On lit donc `modulesVersion` : absent ou < 2, on
 * applique l'ancien comportement ; à partir de 2, la liste fait foi pour tout.
 */
export const MODULES_VERSION = 2

/** Toutes les clés de module connues, dans l'ordre d'affichage. */
export const MODULES_ORDRE = Object.keys(MODULES_INFO)

/**
 * Packs commerciaux par édition (étude marché Pronote 2026-06-07).
 * Le socle (élèves, classes, matières, personnel, paramètres, accès,
 * import, passage d'année) est TOUJOURS actif — les packs ne listent
 * que les modules optionnels.
 * Stratégie : essai version complète TRIAL_MONTHS mois à la création,
 * puis retour automatique au pack choisi (calculé côté app via trialUntil).
 */
export const TRIAL_MONTHS = 4

export const PACKS = {
  secondaire: [
    {
      key: 'free',
      label: 'Free — Découverte',
      description: 'Listes élèves, classes, personnel et appel quotidien. Gratuit pour toujours.',
      modules: ['presences'],
    },
    {
      key: 'standard',
      label: 'Standard — Vie scolaire',
      description: 'Free + notes & bulletins, emploi du temps, devoirs, discipline.',
      modules: ['presences', 'notes', 'emploi-du-temps', 'devoirs', 'discipline'],
    },
    {
      key: 'premium',
      label: 'Premium — École complète',
      description: 'Tout MAPO : + messagerie, comptabilité, rapports, salaires.',
      modules: ['presences', 'notes', 'emploi-du-temps', 'devoirs', 'discipline',
        'messagerie', 'salaire', 'facturation', 'rapports'],
    },
  ],
  superieur: [
    {
      key: 'free',
      label: 'Free — Base',
      description: 'Gestion des étudiants.',
      modules: ['etudiants'],
    },
    {
      key: 'premium',
      label: 'Premium — Complet',
      description: 'Étudiants, offre de formation, finance, mobilité entrante.',
      modules: ['etudiants', 'formation', 'finance', 'mobilite_entrante'],
    },
  ],
}
PACKS.primaire = PACKS.secondaire

/** Modules d'un pack pour une édition (fallback : pack le plus complet). */
export function packModules(edition, packKey) {
  const list = PACKS[edition] || PACKS.secondaire
  const pack = list.find((p) => p.key === packKey) || list[list.length - 1]
  // Un pack ne décrit que son offre pédagogique. Depuis la suppression du socle,
  // la structure doit être listée EXPLICITEMENT, sinon une école créée avec un
  // pack se retrouverait sans Élèves ni Paramètres. Le pack reste une
  // présélection : chaque case se décoche ensuite individuellement.
  const structure = edition === 'superieur' ? [] : MODULES_STRUCTURE
  return [...new Set([...structure, ...pack.modules])]
}

/** Date de fin d'essai : aujourd'hui + TRIAL_MONTHS mois (ISO, minuit). */
export function computeTrialUntil() {
  const d = new Date()
  d.setMonth(d.getMonth() + TRIAL_MONTHS)
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export function slugify(input) {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}


/**
 * Pont MOBI : pousse une ecole vers MOBI (mobi-9c97b, projet Firebase separe).
 * Effets cote MOBI : l'ecole apparait dans la liste deroulante du formulaire
 * scolarite etudiant (collection ecoles) et ses utilisateurs obtiennent
 * l'acces au pont paiements (collection bridge_ecoles, fusion des emails).
 * Reserve aux admins EDUFREM (verifie cote serveur). Fire-and-forget :
 * un echec ne bloque jamais la creation cote MAPO.
 */
const MOBI_BRIDGE_URL = 'https://mobi.app-edufrem.com/scolarite-bridge.php'
export async function syncEcoleMobi({ slug, nom, ville = '', emails = [], actif = true }) {
  try {
    const user = fbAuth.currentUser
    if (!user) return { success: false, error: 'non_authentifie' }
    const token = await user.getIdToken()
    const res = await fetch(MOBI_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'sync_ecole', schoolId: slug, nom, ville, emails, actif }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json || json.error) {
      console.warn('Sync MOBI ecole en echec:', json && json.error ? json.error : res.status)
      return { success: false, error: (json && json.error) || ('HTTP ' + res.status) }
    }
    return { success: true }
  } catch (e) {
    console.warn('Sync MOBI ecole impossible:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Provisioning infra : demande au serveur LWS de créer le sous-domaine
 * <slug>.app-edufrem.com pointé sur le dossier MAPO partagé.
 * Le script PHP vérifie le jeton Firebase ET que l'appelant est super
 * admin, puis appelle l'API cPanel avec un jeton stocké côté serveur.
 */
// Same-origin : le méga admin tourne sur adminmapo.app-edufrem.com, qui sert
// /public_html/mapo où vit aussi mapo-provision.php. URL relative = pas de CORS.
const PROVISION_URL = '/mapo-provision.php'
export async function provisionSubdomain(slug) {
  try {
    const user = fbAuth.currentUser
    if (!user) return { success: false, error: 'non_authentifie' }
    const token = await user.getIdToken()
    const res = await fetch(PROVISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'create_subdomain', slug }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json || json.error) {
      console.warn('Provisioning sous-domaine en échec:', json && json.error ? json.error : res.status)
      return { success: false, error: (json && json.error) || ('HTTP ' + res.status) }
    }
    return {
      success: true,
      authDomainAdded: !!json.authDomainAdded,
      authDomainError: json.authDomainError || null,
    }
  } catch (e) {
    console.warn('Provisioning sous-domaine impossible:', e)
    return { success: false, error: e.message }
  }
}

/** Déprovisionne : retire le sous-domaine cPanel + le domaine autorisé Firebase. */
export async function deprovisionSubdomain(slug) {
  try {
    const user = fbAuth.currentUser
    if (!user) return { success: false, error: 'non_authentifie' }
    const token = await user.getIdToken()
    const res = await fetch(PROVISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'delete_subdomain', slug }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json || json.error) {
      return { success: false, error: (json && json.error) || ('HTTP ' + res.status) }
    }
    return {
      success: true,
      subdomainRemoved: !!json.subdomainRemoved,
      authDomainRemoved: !!json.authDomainRemoved,
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export const useMegaAdminStore = defineStore('megaAdmin', () => {
  const schools = ref([])
  const loading = ref(false)
  const error = ref('')

  const schoolsSorted = computed(() =>
    [...schools.value].sort((a, b) => (a.schoolName || '').localeCompare(b.schoolName || ''))
  )

  /**
   * Charge la liste des écoles + compte rapide d'élèves / de personnel
   * pour chacune. Utilise les "aggregation queries" Firestore (getCount)
   * pour rester économe.
   */
  async function loadSchools() {
    const authStore = useAuthStore()
    error.value = ''
    if (!authStore.isSuperAdmin) {
      schools.value = []
      return
    }

    loading.value = true
    try {
      const snap = await getDocs(collection(db, 'schools'))
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // Compte des élèves et du personnel par école (best-effort).
      const enriched = await Promise.all(
        base.map(async (s) => {
          let nbEleves = 0
          let nbPersonnel = 0
          let nbInvitations = 0
          try {
            const c1 = await getCountFromServer(collection(db, 'schools', s.id, 'eleves'))
            nbEleves = c1.data().count
          } catch (e) { /* silent */ }
          try {
            const c2 = await getCountFromServer(
              query(collection(db, 'users'), where('schoolId', '==', s.id))
            )
            nbPersonnel = c2.data().count
          } catch (e) { /* silent */ }
          try {
            const c3 = await getCountFromServer(
              query(
                collection(db, 'invitations'),
                where('schoolId', '==', s.id),
                where('status', '==', 'pending')
              )
            )
            nbInvitations = c3.data().count
          } catch (e) { /* silent */ }
          return { ...s, nbEleves, nbPersonnel, nbInvitations }
        })
      )
      schools.value = enriched
    } catch (e) {
      console.error('Erreur chargement écoles:', e)
      error.value = "Impossible de charger la liste des écoles."
    } finally {
      loading.value = false
    }
  }

  /**
   * Rattache (ou détache) une école à un COMPLEXE scolaire.
   * Écrit `complexeId` + `complexeName` sur le doc `schools/{schoolId}`.
   * Le directeur de complexe (compte `role: directeur_complexe` portant ce
   * `complexeId`) verra alors toutes ses écoles agrégées dans /complexe.
   * Passer complexeId vide = détacher l'école du complexe.
   */
  async function assignComplexe(schoolId, complexeId, complexeName) {
    if (!authStore.isSuperAdmin || !schoolId) return { success: false, error: 'Non autorisé.' }
    try {
      const cid = (complexeId || '').trim()
      await updateDoc(doc(db, 'schools', schoolId), {
        complexeId: cid || null,
        complexeName: cid ? (complexeName || '').trim() : null,
      })
      // Reflet local immédiat (évite un rechargement complet).
      const s = schools.value.find((x) => x.id === schoolId)
      if (s) { s.complexeId = cid || null; s.complexeName = cid ? (complexeName || '').trim() : null }
      return { success: true }
    } catch (e) {
      console.error('assignComplexe:', e)
      return { success: false, error: "Impossible d'enregistrer le complexe." }
    }
  }

  /**
   * Valide un identifiant de sous-domaine d'école.
   * Renvoie null si OK, sinon un message d'erreur.
   */
  function validateSlug(slug) {
    if (!slug) return 'Le sous-domaine est obligatoire.'
    if (!SLUG_REGEX.test(slug)) {
      return 'Sous-domaine invalide (lettres minuscules, chiffres et tirets, 3 à 40 caractères).'
    }
    if (RESERVED_SLUGS.has(slug)) {
      return 'Ce sous-domaine est réservé. Choisissez-en un autre.'
    }
    if (schools.value.some((s) => s.id === slug)) {
      return 'Une école utilise déjà ce sous-domaine.'
    }
    return null
  }

  /**
   * Crée une école et l'invitation de son admin en une seule opération
   * atomique. Le schéma de l'école est aligné sur ce que consomme
   * schoolIdentity.js (nom, sigle, edition, modulesActifs, anneeAcademique).
   *
   *   payload : {
   *     slug, nom, sigle?, ville?, type?,
   *     edition, modulesActifs,
   *     anneeAcademique?, adminEmail
   *   }
   */
  async function createSchool(payload) {
    const authStore = useAuthStore()
    error.value = ''
    if (!authStore.isSuperAdmin) {
      return { success: false, error: "Réservé aux super admins EDUFREM." }
    }

    const slug = (payload.slug || '').trim().toLowerCase()
    const slugError = validateSlug(slug)
    if (slugError) return { success: false, error: slugError }

    const nom = (payload.nom || '').trim()
    if (!nom) return { success: false, error: "Le nom de l'école est obligatoire." }

    const edition = payload.edition
    if (!EDITIONS[edition]) {
      return { success: false, error: "L'édition doit être primaire, secondaire ou supérieur." }
    }

    // Un ou plusieurs admins. Accepte adminEmails (liste) ou adminEmail (compat).
    const rawEmails = Array.isArray(payload.adminEmails) && payload.adminEmails.length
      ? payload.adminEmails
      : [payload.adminEmail]
    const adminEmails = [...new Set(
      rawEmails.map((e) => (e || '').trim().toLowerCase()).filter(Boolean)
    )]
    if (!adminEmails.length) {
      return { success: false, error: "Indiquez au moins un email d'administrateur." }
    }
    const bad = adminEmails.find((e) => !e.includes('@'))
    if (bad) {
      return { success: false, error: `Email d'administrateur invalide : ${bad}` }
    }

    // Pack commercial → modules actifs. 'custom' = sélection manuelle.
    const pack = payload.pack || 'custom'
    // Une liste fournie fait foi, MÊME VIDE : décocher tout est un choix, pas une
    // absence de choix. Retomber sur les modules par défaut dans ce cas
    // reproduirait le travers qu'on élimine, un réglage saisi et jamais appliqué.
    const modulesActifs = Array.isArray(payload.modulesActifs)
      ? [...payload.modulesActifs]
      : (pack !== 'custom' ? packModules(edition, pack) : [...EDITIONS[edition].modulesParDefaut])

    // Essai version complète : accès à tout pendant TRIAL_MONTHS mois.
    const trialUntil = payload.essai ? computeTrialUntil() : null

    // Année académique : par défaut sur l'année scolaire en cours (sept N → août N+1)
    const today = new Date()
    const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1
    const defaultAnnee = `${startYear}-${startYear + 1}`
    const anneeAcademique = payload.anneeAcademique || defaultAnnee

    try {
      const batch = writeBatch(db)

      const schoolDoc = {
        nom,
        sigle: (payload.sigle || '').trim() || null,
        ville: (payload.ville || '').trim() || null,
        type: (payload.type || '').trim() || null,
        edition,
        modulesActifs,
        // Marqueur de modèle : à partir de 2, `modulesActifs` fait foi pour TOUS
        // les modules, plus aucun n'est implicite. Voir MODULES_VERSION.
        modulesVersion: MODULES_VERSION,
        pack,
        trialUntil,
        anneeAcademique,
        subdomain: slug,
        createdAt: serverTimestamp(),
        createdBy: authStore.user?.uid || null,
        plan: 'pilote',
      }
      const schoolRef = doc(db, 'schools', slug)
      batch.set(schoolRef, schoolDoc)

      // Rôle de l'invitation selon l'édition (admin pour supérieur, directeur sinon).
      // Une invitation par admin indiqué.
      const role = EDITIONS[edition].roleAdmin
      for (const email of adminEmails) {
        const invRef = doc(collection(db, 'invitations'))
        batch.set(invRef, {
          email,
          role,
          schoolId: slug,
          status: 'pending',
          createdAt: serverTimestamp(),
          invitedBy: authStore.user?.uid || null,
          invitedByName: authStore.userProfile?.displayName || 'EDUFREM',
        })
      }

      await batch.commit()

      // Synchronisation MOBI : l'ecole devient visible dans la liste
      // deroulante etudiante et ses admins obtiennent l'acces au pont scolarite.
      syncEcoleMobi({ slug, nom, ville: schoolDoc.ville || '', emails: adminEmails, actif: true })

      // Provisioning infra : création automatique du sous-domaine cPanel
      // (fire-and-forget — un échec n'annule pas la création de l'école).
      const provisioning = await provisionSubdomain(slug)

      // Email d'invitation à chaque admin (lien magique → la personne définit
      // son mot de passe à l'ouverture). Redirige vers le sous-domaine de
      // l'école s'il est provisionné (donc autorisé Firebase), sinon repli
      // sur le domaine principal autorisé.
      const inviteBase = provisioning.success ? `${slug}.app-edufrem.com` : 'mapo.app-edufrem.com'
      const invites = await sendAdminInvites(adminEmails, inviteBase)

      // Optimistic update
      schools.value.push({
        id: slug,
        ...schoolDoc,
        nbEleves: 0,
        nbPersonnel: 0,
        nbInvitations: adminEmails.length,
      })

      return {
        success: true,
        slug,
        subdomain: `${slug}.app-edufrem.com`,
        role,
        adminEmails,
        adminEmail: adminEmails[0],
        subdomainCreated: provisioning.success,
        subdomainError: provisioning.success ? null : provisioning.error,
        authDomainAdded: provisioning.success ? provisioning.authDomainAdded : false,
        authDomainError: provisioning.success ? provisioning.authDomainError : null,
        emailsSent: invites.sent,
        emailsTotal: invites.total,
        emailError: invites.error,
      }
    } catch (e) {
      console.error('Erreur création école:', e)
      return { success: false, error: "La création de l'école a échoué." }
    }
  }

  /**
   * Met à jour les modules actifs d'une école existante.
   * Utilisé par la vue mégaAdmin pour activer/désactiver finement.
   */
  async function updateSchoolModules(schoolId, modulesActifs) {
    return updateSchoolPlan(schoolId, { modulesActifs })
  }

  /**
   * Met à jour le plan commercial d'une école : pack, modules actifs
   * et/ou date de fin d'essai. Seuls les champs fournis sont modifiés.
   */
  async function updateSchoolPlan(schoolId, { pack, modulesActifs, trialUntil } = {}) {
    const authStore = useAuthStore()
    if (!authStore.isSuperAdmin) {
      return { success: false, error: "Réservé aux super admins EDUFREM." }
    }
    const patch = {}
    if (pack !== undefined) patch.pack = pack
    if (modulesActifs !== undefined) {
      patch.modulesActifs = modulesActifs
      // Enregistrer une liste, c'est passer au nouveau modèle : elle fait foi pour
      // tous les modules. Sans ce marqueur, l'école resterait lue à l'ancienne et
      // les cases décochées de la structure n'auraient aucun effet — un réglage
      // sauvegardé et jamais relu, exactement ce qu'on est en train d'éliminer.
      patch.modulesVersion = MODULES_VERSION
    }
    if (trialUntil !== undefined) patch.trialUntil = trialUntil
    if (!Object.keys(patch).length) return { success: true }
    try {
      const { updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'schools', schoolId), patch)
      const local = schools.value.find((s) => s.id === schoolId)
      if (local) Object.assign(local, patch)
      return { success: true }
    } catch (e) {
      console.error('Erreur update plan école:', e)
      return { success: false, error: "Mise à jour impossible." }
    }
  }

  /**
   * Supprime une école : document Firestore + ses invitations + les profils
   * users rattachés, puis retire le sous-domaine cPanel et le domaine
   * autorisé Firebase. Les comptes Firebase Auth eux-mêmes ne sont pas
   * supprimés (gérés en console) mais leur profil applicatif l'est, donc
   * ils n'ont plus accès. Action réservée aux super admins.
   */
  async function deleteSchool(schoolId) {
    const authStore = useAuthStore()
    if (!authStore.isSuperAdmin) {
      return { success: false, error: "Réservé aux super admins EDUFREM." }
    }
    if (!schoolId) return { success: false, error: 'École inconnue.' }
    try {
      const { getDocs, query, where, deleteDoc, writeBatch: wb } = await import('firebase/firestore')

      // 1) Invitations rattachées
      const invSnap = await getDocs(query(collection(db, 'invitations'), where('schoolId', '==', schoolId)))
      // 2) Profils utilisateurs rattachés
      const usersSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)))

      // Suppression par lots (max 500 ops / batch ; ici largement suffisant)
      const batch = wb(db)
      invSnap.forEach((d) => batch.delete(d.ref))
      usersSnap.forEach((d) => batch.delete(d.ref))
      batch.delete(doc(db, 'schools', schoolId))
      await batch.commit()

      // 3) Infra : retirer le sous-domaine + domaine Firebase (best-effort)
      const infra = await deprovisionSubdomain(schoolId)

      // MAJ locale
      schools.value = schools.value.filter((s) => s.id !== schoolId)

      return {
        success: true,
        invitationsSupprimees: invSnap.size,
        usersSupprimes: usersSnap.size,
        subdomainRemoved: infra.success ? infra.subdomainRemoved : false,
        authDomainRemoved: infra.success ? infra.authDomainRemoved : false,
        infraError: infra.success ? null : infra.error,
      }
    } catch (e) {
      console.error('Erreur suppression école:', e)
      return { success: false, error: "La suppression de l'école a échoué." }
    }
  }

  /**
   * Ajoute un administrateur à une école DÉJÀ créée.
   *
   * Manque révélé le 25/08/2026 : les administrateurs ne pouvaient être désignés
   * qu'au moment de la création. Une école dont le directeur change, ou à
   * laquelle EDUFREM doit accéder pour dépanner, n'avait aucun recours — il
   * aurait fallu supprimer et recréer l'établissement.
   *
   * ⚠️ Un super-admin ne suffit PAS pour dépanner : il lit toute la base, mais
   * n'écrit dans aucune sous-collection d'école (les règles exigent d'en être
   * MEMBRE) et n'a pas de profil rattaché, donc l'application le renvoie sur
   * « compte non configuré ». Il faut une vraie invitation.
   *
   * Renvoie { ok, reason? } — « deja_invite » quand une invitation en attente
   * existe déjà, pour ne pas en empiler deux sur la même adresse.
   */
  async function ajouterAdministrateur(schoolId, email) {
    const adresse = String(email || '').trim().toLowerCase()
    if (!schoolId || !adresse) return { ok: false, reason: 'parametres' }
    try {
      const ecole = schools.value.find((s) => s.id === schoolId)
      const edition = ecole?.edition && EDITIONS[ecole.edition] ? ecole.edition : 'secondaire'
      const role = EDITIONS[edition].roleAdmin

      const dejaLa = await getDocs(query(
        collection(db, 'invitations'),
        where('schoolId', '==', schoolId),
        where('email', '==', adresse),
      ))
      if (!dejaLa.empty) {
        const enAttente = dejaLa.docs.some((d) => (d.data().status || 'pending') === 'pending')
        if (enAttente) return { ok: false, reason: 'deja_invite' }
      }

      const authStore = useAuthStore()
      await addDoc(collection(db, 'invitations'), {
        email: adresse,
        role,
        schoolId,
        status: 'pending',
        createdAt: serverTimestamp(),
        invitedBy: authStore.user?.uid || null,
        invitedByName: authStore.userProfile?.displayName || 'EDUFREM',
      })

      // ⚠️ L'invitation Firestore ne PRÉVIENT personne. La première version de
      // cette fonction s'arrêtait ici et annonçait « invitation créée » : rien
      // n'arrivait jamais dans la boîte de l'intéressé, et l'écran affirmait le
      // contraire. Une écriture en base n'est pas un envoi.
      const envoi = await sendAdminInvites([adresse], `${schoolId}.app-edufrem.com`)

      await loadSchools()
      // On rend l'état RÉEL de l'envoi : l'appelant doit pouvoir dire « invitation
      // enregistrée mais e-mail non parti » plutôt qu'un succès global trompeur.
      return { ok: true, role, mailEnvoye: envoi.sent > 0, mailErreur: envoi.error || null }
    } catch (e) {
      console.error('Ajout administrateur échoué:', e)
      return { ok: false, reason: (e && e.code) || 'ecriture' }
    }
  }

  // ── Vitrine publique d'une école ────────────────────────────────────────
  //
  // Une vitrine est une fiche `vitrines/{schoolId}`. Il n'y a RIEN à déployer
  // par école : le code de la vitrine est publié une fois pour toutes, et le
  // site est en ligne dès que la fiche existe, sur `<slug>.app-edufrem.com/site`.

  /** Lit la vitrine d'une école, ou `null` si elle n'existe pas encore. */
  async function chargerVitrine(schoolId) {
    try {
      const snap = await getDoc(doc(db, 'vitrines', schoolId))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    } catch (e) {
      console.error('Lecture vitrine échouée:', e)
      return null
    }
  }

  /**
   * Enregistre la vitrine.
   *
   * ⚠️ Les règles Firestore REFUSENT une création directement en « valide » :
   * une première écriture doit être en brouillon ou en attente. On crée donc
   * d'abord, on publie ensuite — et c'est voulu : la page publique d'une école
   * ne se met pas en ligne par inadvertance.
   */
  async function enregistrerVitrine(schoolId, cfg) {
    if (!schoolId || !cfg) return { ok: false, reason: 'parametres' }
    try {
      const ref_ = doc(db, 'vitrines', schoolId)
      const existe = (await getDoc(ref_)).exists()
      const statut = existe ? (cfg.statut || 'brouillon') : 'brouillon'
      await setDoc(ref_, { ...cfg, id: schoolId, statut, majAt: serverTimestamp() }, { merge: true })
      return { ok: true, statut, cree: !existe }
    } catch (e) {
      console.error('Enregistrement vitrine échoué:', e)
      return { ok: false, reason: (e && e.code) || 'ecriture' }
    }
  }

  /** Change le seul statut de publication. */
  async function publierVitrine(schoolId, statut) {
    if (!['brouillon', 'en_attente', 'valide'].includes(statut)) return { ok: false, reason: 'statut' }
    try {
      await updateDoc(doc(db, 'vitrines', schoolId), { statut, majAt: serverTimestamp() })
      return { ok: true, statut }
    } catch (e) {
      console.error('Publication vitrine échouée:', e)
      return { ok: false, reason: (e && e.code) || 'ecriture' }
    }
  }

  /**
   * Compte ce qu'il faut pour une vitrine honnête : niveaux et effectifs.
   *
   * ⚠️ Renvoie `0` quand la lecture échoue, et l'appelant NE DOIT PAS afficher
   * un zéro comme un effectif : sur la page publique d'une école, « 0 écoliers »
   * serait faux et humiliant. Zéro ici veut dire « pas encore importé ».
   */
  async function mesurerEcole(schoolId) {
    const out = { niveaux: [], effectif: 0, personnel: 0 }
    try {
      const e = await getCountFromServer(collection(db, 'schools', schoolId, 'eleves'))
      out.effectif = e.data().count || 0
    } catch (err) { /* module absent ou vide */ }
    try {
      const p = await getCountFromServer(collection(db, 'schools', schoolId, 'personnel'))
      out.personnel = p.data().count || 0
    } catch (err) { /* silent */ }
    try {
      const c = await getDocs(collection(db, 'schools', schoolId, 'classes'))
      const niveaux = []
      c.forEach((d) => { const n = (d.data().level || d.data().niveau || '').trim(); if (n && !niveaux.includes(n)) niveaux.push(n) })
      out.niveaux = niveaux
    } catch (err) { /* silent */ }
    return out
  }

  return {
    schools,
    syncEcoleMobi,
    schoolsSorted,
    loading,
    error,
    loadSchools,
    assignComplexe,
    validateSlug,
    createSchool,
    ajouterAdministrateur,
    chargerVitrine, enregistrerVitrine, publierVitrine, mesurerEcole,
    updateSchoolModules,
    updateSchoolPlan,
    deleteSchool,
    slugify,
  }
})
