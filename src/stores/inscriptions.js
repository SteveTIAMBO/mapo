import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey, paysDemo } from '../utils/demoScope'
import { useElevesStore } from './eleves'
import { useFacturationStore } from './facturation'
import { packPays, localiserDonnees } from '../data/paysDemo'
import { NOMS_REFERENCE } from '../data/nomsDemo'
import {
  DESTINATAIRE, canauxDisponibles, lienInvitation,
} from '../utils/invitationMapoPlus'

/**
 * Données de démonstration localisées selon le pays choisi.
 * Passe unique et générique : voir `localiserDonnees` dans data/paysDemo.js.
 */
function localiser(v) {
  return localiserDonnees(v, NOMS_REFERENCE, packPays(paysDemo()))
}


// ── Constants ──

export const DOSSIER_STATUS = {
  BROUILLON: 'brouillon',
  SOUMIS: 'soumis',
  COMPLET: 'complet',
  INCOMPLET: 'incomplet',
  VALIDE: 'valide',
  REFUSE: 'refuse',
}

export const DOSSIER_STATUS_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'complet', label: 'Complet' },
  { value: 'incomplet', label: 'Incomplet' },
  { value: 'valide', label: 'Validé' },
  { value: 'refuse', label: 'Refusé' },
]

export const REQUIRED_DOCUMENTS = [
  { key: 'acte_naissance', label: 'Acte de naissance', required: true },
  { key: 'photo_identite', label: 'Photos d\'identité (2)', required: true },
  { key: 'bulletin_precedent', label: 'Dernier bulletin scolaire', required: false },
  { key: 'certificat_scolarite', label: 'Certificat de scolarité', required: false },
]

export const DOSSIER_TYPES = [
  { value: 'inscription', label: 'Nouvelle inscription' },
  { value: 'reinscription', label: 'Réinscription' },
]

export const DOCUMENT_FORMATS = [
  { value: 'papier', label: 'Format papier (impression)' },
  { value: 'numerique', label: 'Format numerique (PDF par email/app)' },
  { value: 'les_deux', label: 'Papier et numerique' },
]

// Demo data
const FIRST_NAMES_M = ['Jean', 'Paul', 'Samuel', 'David', 'Emmanuel', 'Patrick', 'François', 'Daniel']
const FIRST_NAMES_F = ['Marie', 'Claire', 'Hélène', 'Brigitte', 'Sylvie', 'Rose', 'Jeanne', 'Bernadette']
const LAST_NAMES = ['Kamga', 'Mbarga', 'Ngo', 'Nana', 'Atangana', 'Fotso', 'Djomou', 'Kenfack', 'Ngono', 'Tagne']
const CITIES = ['Yaoundé', 'Douala', 'Bafoussam']
const QUARTIERS = ['Santa Barbara', 'Bastos', 'Mvan', 'Essos', 'Nkolbisson']
const DEMO_CLASSES = [
  '6ème A', '6ème B', '6ème C',
  '5ème A', '5ème B', '5ème C',
  '4ème A', '4ème B', '4ème C',
  '3ème A', '3ème B', '3ème C',
  '2nde A', '2nde B', '2nde C',
  '1ère A', '1ère C', '1ère D',
  'Tle A', 'Tle C', 'Tle D',
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateDemoDossiers(elevesStore) {
  const dossiers = []
  let id = 1

  // Helper: create base64 dummy data for attachments
  const dummyAttachment = (name, type) => ({
    name,
    data: 'data:' + type + ';base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    type,
  })

  // ── Dossier 1: Inscription validée (nouvel élève) ──
  const gender1 = 'M'
  const firstName1 = pickRandom(FIRST_NAMES_M)
  const lastName1 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'inscription',
    status: 'valide',
    firstName: firstName1,
    lastName: lastName1,
    gender: gender1,
    dateOfBirth: '2013-04-15',
    className: '5ème A',
    previousSchool: 'Collège Saint-André',
    previousClass: null,
    city: 'Yaoundé',
    quartier: pickRandom(QUARTIERS),
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_M),
    parentPhone: '+237 699 123 456',
    parentPhone2: '+237 677 234 567',
    parentEmail: 'parent1@example.com',
    attachments: [
      dummyAttachment('Acte_de_naissance_Kamga.pdf', 'application/pdf'),
      dummyAttachment('Photos_identite_Kamga.jpg', 'image/jpeg'),
      dummyAttachment('Bulletin_2024.pdf', 'application/pdf'),
    ],
    matricule: 'EDU260001',
    submittedAt: '2026-01-15T10:00:00Z',
    validatedAt: '2026-01-20T14:30:00Z',
    validatedBy: 'Teussop Michel',
    notes: 'Dossier complet, accepté',
    inscriptionFeePaid: true,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-20T14:30:00Z',
  })

  // ── Dossier 2: Réinscription validée ──
  const gender2 = 'F'
  const firstName2 = pickRandom(FIRST_NAMES_F)
  const lastName2 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'reinscription',
    status: 'valide',
    firstName: firstName2,
    lastName: lastName2,
    gender: gender2,
    dateOfBirth: '2012-07-22',
    className: '4ème B',
    previousSchool: null,
    previousClass: '5ème B',
    city: 'Yaoundé',
    quartier: pickRandom(QUARTIERS),
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_F),
    parentPhone: '+237 655 345 678',
    parentPhone2: '',
    parentEmail: 'parent2@example.com',
    attachments: [
      dummyAttachment('Acte_de_naissance_Ngo.pdf', 'application/pdf'),
      dummyAttachment('Photos_identite_Ngo.jpg', 'image/jpeg'),
    ],
    matricule: 'EDU260002',
    submittedAt: '2026-02-01T08:30:00Z',
    validatedAt: '2026-02-05T16:00:00Z',
    validatedBy: 'Nkoulou Marie',
    notes: 'Réinscription standard',
    inscriptionFeePaid: true,
    createdAt: '2026-01-28T10:00:00Z',
    updatedAt: '2026-02-05T16:00:00Z',
  })

  // ── Dossier 3: Soumis, tous documents fournis ──
  const gender3 = 'M'
  const firstName3 = pickRandom(FIRST_NAMES_M)
  const lastName3 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'inscription',
    status: 'soumis',
    firstName: firstName3,
    lastName: lastName3,
    gender: gender3,
    dateOfBirth: '2014-11-03',
    className: '6ème C',
    previousSchool: 'École primaire Mvan',
    previousClass: null,
    city: 'Yaoundé',
    quartier: pickRandom(QUARTIERS),
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_M),
    parentPhone: '+237 691 456 789',
    parentPhone2: '+237 678 567 890',
    parentEmail: 'parent3@example.com',
    attachments: [
      dummyAttachment('Acte_naissance_Atangana.pdf', 'application/pdf'),
      dummyAttachment('Photos_Atangana.jpg', 'image/jpeg'),
      dummyAttachment('Bulletin_primaire.pdf', 'application/pdf'),
      dummyAttachment('Certificat_scolarite.pdf', 'application/pdf'),
    ],
    matricule: null,
    submittedAt: '2026-02-10T11:00:00Z',
    validatedAt: null,
    validatedBy: null,
    notes: 'En attente de validation',
    inscriptionFeePaid: false,
    createdAt: '2026-02-05T14:00:00Z',
    updatedAt: '2026-02-10T11:00:00Z',
  })

  // ── Dossier 4: Incomplet (manque acte de naissance) ──
  const gender4 = 'F'
  const firstName4 = pickRandom(FIRST_NAMES_F)
  const lastName4 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'inscription',
    status: 'incomplet',
    firstName: firstName4,
    lastName: lastName4,
    gender: gender4,
    dateOfBirth: '2013-08-28',
    className: '5ème C',
    previousSchool: 'Groupe Scolaire Bastos',
    previousClass: null,
    city: 'Yaoundé',
    quartier: pickRandom(QUARTIERS),
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_M),
    parentPhone: '+237 692 567 890',
    parentPhone2: '',
    parentEmail: 'parent4@example.com',
    attachments: [
      dummyAttachment('Photos_identite_Fotso.jpg', 'image/jpeg'),
    ],
    matricule: null,
    submittedAt: '2026-02-08T09:30:00Z',
    validatedAt: null,
    validatedBy: null,
    notes: 'Manque acte de naissance - demande réenvoyée au parent',
    inscriptionFeePaid: false,
    createdAt: '2026-02-03T15:00:00Z',
    updatedAt: '2026-02-08T16:30:00Z',
  })

  // ── Dossier 5: Brouillon (non soumis) ──
  const gender5 = 'M'
  const firstName5 = pickRandom(FIRST_NAMES_M)
  const lastName5 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'inscription',
    status: 'brouillon',
    firstName: firstName5,
    lastName: lastName5,
    gender: gender5,
    dateOfBirth: '2014-03-10',
    className: '6ème B',
    previousSchool: 'École Primaire Essos',
    previousClass: null,
    city: 'Yaoundé',
    quartier: pickRandom(QUARTIERS),
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_F),
    parentPhone: '+237 693 678 901',
    parentPhone2: '',
    parentEmail: 'parent5@example.com',
    attachments: [
      dummyAttachment('Acte_naissance_Djomou.pdf', 'application/pdf'),
    ],
    matricule: null,
    submittedAt: null,
    validatedAt: null,
    validatedBy: null,
    notes: 'Dossier en cours de remplissage',
    inscriptionFeePaid: false,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  })

  // ── Dossier 6: Refusé ──
  const gender6 = 'F'
  const firstName6 = pickRandom(FIRST_NAMES_F)
  const lastName6 = pickRandom(LAST_NAMES)
  dossiers.push({
    id: `d-${String(id++).padStart(4, '0')}`,
    type: 'reinscription',
    status: 'refuse',
    firstName: firstName6,
    lastName: lastName6,
    gender: gender6,
    dateOfBirth: '2011-12-05',
    className: '3ème A',
    previousSchool: null,
    previousClass: '4ème C',
    city: 'Douala',
    quartier: 'Akwa',
    parentLastName: pickRandom(LAST_NAMES),
    parentFirstName: pickRandom(FIRST_NAMES_M),
    parentPhone: '+237 694 789 012',
    parentPhone2: '+237 679 890 123',
    parentEmail: 'parent6@example.com',
    attachments: [
      dummyAttachment('Acte_naissance_Kenfack.pdf', 'application/pdf'),
      dummyAttachment('Photos_Kenfack.jpg', 'image/jpeg'),
    ],
    matricule: null,
    submittedAt: '2026-01-20T13:00:00Z',
    validatedAt: '2026-01-22T10:30:00Z',
    validatedBy: 'Teussop Michel',
    notes: 'Refusé: frais de scolarité impayés année précédente',
    inscriptionFeePaid: false,
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-01-22T10:30:00Z',
  })

  return dossiers
}

const DEMO_KEY = 'mapo_demo_inscriptions'
const DEMO_VERSION_KEY = 'mapo_demo_inscriptions_version'
const DEMO_VERSION = 1

// ── Store ──

export const useInscriptionsStore = defineStore('inscriptions', () => {
  const dossiers = ref([])
  const loading = ref(false)

  // ── Helpers for demo localStorage ──
  function saveDemoDossiers() {
    try { localStorage.setItem(demoKey(DEMO_KEY), JSON.stringify(dossiers.value)) } catch (e) { /* silent */ }
  }

  function loadDemoDossiers() {
    try {
      const raw = localStorage.getItem(demoKey(DEMO_KEY))
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }

  // ── Computed ──

  const getDossiersByStatus = computed(() => {
    return (status) => dossiers.value.filter(d => d.status === status)
  })

  const getPendingCount = computed(() => {
    const soumis = dossiers.value.filter(d => d.status === 'soumis' || d.status === 'complet')
    return soumis.length
  })

  const dossierStats = computed(() => {
    const stats = {
      total: dossiers.value.length,
      brouillon: 0,
      soumis: 0,
      complet: 0,
      incomplet: 0,
      valide: 0,
      refuse: 0,
    }
    dossiers.value.forEach(d => {
      stats[d.status] = (stats[d.status] || 0) + 1
    })
    return stats
  })

  // ── Load ──

  const loadDossiers = async () => {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(demoKey(DEMO_VERSION_KEY))
      const saved = (savedVersion === String(DEMO_VERSION)) ? loadDemoDossiers() : null

      if (saved) {
        dossiers.value = saved
      } else {
        const elevesStore = useElevesStore()
        dossiers.value = localiser(generateDemoDossiers(elevesStore))
        localStorage.setItem(demoKey(DEMO_VERSION_KEY), String(DEMO_VERSION))
        saveDemoDossiers()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) { loading.value = false; return }

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'inscriptions')
      const querySnapshot = await getDocs(collectionRef)
      dossiers.value = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Erreur chargement dossiers inscriptions:', error)
    } finally {
      loading.value = false
    }
  }

  // ── CRUD Operations ──

  const createDossier = async (data) => {
    const authStore = useAuthStore()
    const newDossier = {
      id: `d-${Date.now()}`,
      status: DOSSIER_STATUS.BROUILLON,
      attachments: [],
      documentFormat: data.documentFormat || 'papier',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }

    if (authStore.isDemo) {
      dossiers.value.push(newDossier)
      saveDemoDossiers()
      return newDossier.id
    }

    if (!authStore.schoolId) return

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'inscriptions')
      const docRef = await addDoc(collectionRef, newDossier)
      newDossier.id = docRef.id
      dossiers.value.push(newDossier)
      return docRef.id
    } catch (error) {
      console.error('Erreur création dossier:', error)
    }
  }

  const updateDossier = async (id, data) => {
    const authStore = useAuthStore()
    const index = dossiers.value.findIndex(d => d.id === id)

    if (index !== -1) {
      dossiers.value[index] = {
        ...dossiers.value[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
    }

    if (authStore.isDemo) {
      saveDemoDossiers()
      return
    }

    if (!authStore.schoolId) return

    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'inscriptions', id)
      await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() })
    } catch (error) {
      console.error('Erreur mise à jour dossier:', error)
    }
  }

  const deleteDossier = async (id) => {
    const authStore = useAuthStore()
    dossiers.value = dossiers.value.filter(d => d.id !== id)

    if (authStore.isDemo) {
      saveDemoDossiers()
      return
    }

    if (!authStore.schoolId) return

    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'inscriptions', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur suppression dossier:', error)
    }
  }

  // ── Workflow operations ──

  const submitDossier = async (id) => {
    await updateDossier(id, {
      status: DOSSIER_STATUS.SOUMIS,
      submittedAt: new Date().toISOString(),
    })

    // Log activity
    try {
      const { useActivityStore } = await import('./activity')
      const dossier = dossiers.value.find(d => d.id === id)
      if (dossier) {
        const actStore = useActivityStore()
        const type = dossier.type === 'inscription' ? 'Nouvelle inscription' : 'Réinscription'
        actStore.log('inscription', `${type} de ${dossier.lastName} ${dossier.firstName} soumise`)
      }
    } catch {}
  }

  /**
   * Cycle, pays et nom de l'école — ce que l'invitation doit transporter pour
   * que la famille n'ait rien à ressaisir.
   *
   * ⚠️ Le cycle vient de l'ÉDITION déclarée de l'école, pas d'une déduction sur
   * le nom de la classe : « 6ème » existe au primaire comme au secondaire selon
   * les pays, et le cycle sert à pré-remplir le profil de l'enfant.
   * Import tardif pour ne pas créer de dépendance circulaire entre stores.
   */
  const contexteEcole = async () => {
    let cycle = ''
    let pays = ''
    let ecole = ''
    try {
      const { useSchoolIdentityStore } = await import('./schoolIdentity')
      const ident = useSchoolIdentityStore()
      cycle = ident.edition || ''
      ecole = ident.nom || ''
    } catch { /* pas de tenant école (démo) */ }
    if (!cycle) {
      try {
        const { useEditionStore } = await import('./edition')
        cycle = useEditionStore().current || ''
      } catch { /* silent */ }
    }
    try {
      const { useSchoolStore } = await import('./school')
      const s = useSchoolStore().schoolSettings || {}
      pays = s.country || ''
      if (!ecole) ecole = s.schoolName || s.name || ''
    } catch { /* silent */ }
    // En démonstration, le pays de référence est celui du sélecteur.
    if (!pays) { try { pays = paysDemo() } catch { /* silent */ } }
    return { cycle, pays, ecole }
  }

  /**
   * Ouvre l'accès MAPO+ d'un élève fraîchement inscrit.
   *
   * Renvoie toujours un objet DÉCRIVANT ce qui s'est passé — jamais `null` en cas
   * d'échec silencieux. L'école doit pouvoir lire « envoyé à ce parent » ou
   * « aucune adresse, lien à partager », et agir en conséquence.
   */
  const ouvrirAccesMapoPlus = async (eleveId, dossier) => {
    const elevesStore = useElevesStore()
    const { cycle, pays, ecole } = await contexteEcole()
    const canaux = canauxDisponibles({
      parentEmail: dossier.parentEmail, parentPhone: dossier.parentPhone,
    })
    const res = await elevesStore.autoriserMapoPlus(eleveId, {
      cycle, pays, ecole,
      origine: 'inscription_validee',
      email: canaux.email,
    })
    if (!res || !res.ok) return { ok: false, reason: res?.reason || 'inconnu' }
    return {
      ok: true, code: res.code, destinataire: DESTINATAIRE, cycle,
      lien: lienInvitation(res.code, dossier.firstName),
      // `envoye` dit la VÉRITÉ sur le canal : sans adresse e-mail, rien n'est
      // parti tout seul et l'école doit partager le lien (un geste, pas un code).
      envoye: canaux.automatique ? 'email' : '',
      email: canaux.email, telephone: canaux.whatsapp,
      demo: !!res.demo,
    }
  }

  const validateDossier = async (id, validatedBy) => {
    const dossier = dossiers.value.find(d => d.id === id)
    if (!dossier) return

    const elevesStore = useElevesStore()
    const facturationStore = useFacturationStore()

    // Generate matricule
    const matricule = elevesStore.generateNextMatricule()

    // Create eleve in elevesStore
    const eleveId = await elevesStore.addEleve({
      matricule,
      firstName: dossier.firstName,
      lastName: dossier.lastName,
      gender: dossier.gender,
      dateOfBirth: dossier.dateOfBirth,
      className: dossier.className,
      city: dossier.city,
      quartier: dossier.quartier,
      parentLastName: dossier.parentLastName,
      parentFirstName: dossier.parentFirstName,
      parentPhone: dossier.parentPhone,
      parentPhone2: dossier.parentPhone2,
      parentEmail: dossier.parentEmail,
      status: 'inscrit',
    })

    // Link inscription fee payment (create a payment record)
    try {
      const factStore = facturationStore
      factStore.addPayment({
        eleveId,
        amount: 0, // Will be set based on fee structure
        method: 'especes',
        note: `Frais d'inscription - Dossier ${id}`,
      })
    } catch {}

    // ── Ouverture automatique de l'accès MAPO+ ────────────────────────────
    //
    // Décision de Steve du 23/08/2026 : l'école ne doit plus « se casser la tête
    // à générer un code ». L'invitation naît donc ICI, au moment où l'inscription
    // devient réelle, et non plus d'un clic dans la fiche de l'élève.
    //
    // Le destinataire est TOUJOURS le parent ou tuteur : c'est le compte de la
    // famille. Depuis MAPO+, le parent crée ensuite le profil de son enfant et
    // lui donne un accès indépendant s'il le souhaite (cf. invitationMapoPlus).
    //
    // ⚠️ Un échec ici ne doit JAMAIS annuler la validation : l'élève est inscrit,
    // sa scolarité ne dépend pas de MAPO+. On enregistre le résultat sur le
    // dossier pour que l'école VOIE ce qui s'est passé — un envoi silencieusement
    // manqué serait pire qu'un envoi manuel.
    let invitation = null
    try {
      invitation = await ouvrirAccesMapoPlus(eleveId, dossier)
    } catch (e) {
      invitation = { ok: false, reason: 'exception' }
    }

    // Update dossier
    await updateDossier(id, {
      status: DOSSIER_STATUS.VALIDE,
      matricule,
      validatedAt: new Date().toISOString(),
      validatedBy,
      inscriptionFeePaid: true,
      // Trace de l'invitation : code, destinataire, canal réellement utilisé.
      // C'est ce qui permet à l'école de renvoyer le lien sans le régénérer.
      mapoplus: invitation,
    })

    // Log activity
    try {
      const { useActivityStore } = await import('./activity')
      const actStore = useActivityStore()
      const type = dossier.type === 'inscription' ? 'Inscription' : 'Réinscription'
      actStore.log('inscription', `${type} de ${dossier.lastName} ${dossier.firstName} validée (${matricule})`)
    } catch {}
  }

  const rejectDossier = async (id, notes) => {
    await updateDossier(id, {
      status: DOSSIER_STATUS.REFUSE,
      notes,
      validatedAt: new Date().toISOString(),
    })

    // Log activity
    try {
      const { useActivityStore } = await import('./activity')
      const dossier = dossiers.value.find(d => d.id === id)
      if (dossier) {
        const actStore = useActivityStore()
        const type = dossier.type === 'inscription' ? 'Inscription' : 'Réinscription'
        actStore.log('inscription', `${type} de ${dossier.lastName} ${dossier.firstName} refusée`)
      }
    } catch {}
  }

  const markComplete = async (id) => {
    await updateDossier(id, {
      status: DOSSIER_STATUS.COMPLET,
    })
  }

  const markIncomplete = async (id, notes) => {
    await updateDossier(id, {
      status: DOSSIER_STATUS.INCOMPLET,
      notes,
    })
  }

  // ── Attachment management ──

  const addAttachment = async (dossierId, attachment) => {
    const dossier = dossiers.value.find(d => d.id === dossierId)
    if (!dossier) return

    if (!dossier.attachments) dossier.attachments = []
    dossier.attachments.push({
      name: attachment.name,
      data: attachment.data,
      type: attachment.type,
      uploadedAt: new Date().toISOString(),
    })

    await updateDossier(dossierId, { attachments: dossier.attachments })
  }

  const removeAttachment = async (dossierId, attachmentName) => {
    const dossier = dossiers.value.find(d => d.id === dossierId)
    if (!dossier) return

    dossier.attachments = (dossier.attachments || []).filter(a => a.name !== attachmentName)
    await updateDossier(dossierId, { attachments: dossier.attachments })
  }

  // ── Getters ──

  const getDossierById = (id) => {
    return dossiers.value.find(d => d.id === id)
  }

  const checkCompleteness = (dossierId) => {
    const dossier = getDossierById(dossierId)
    if (!dossier) return { complete: false, missing: [] }

    const missing = []
    REQUIRED_DOCUMENTS.forEach(doc => {
      if (doc.required) {
        const hasDoc = (dossier.attachments || []).some(a => a.name.includes(doc.key))
        if (!hasDoc) missing.push(doc.label)
      }
    })

    return {
      complete: missing.length === 0,
      missing,
    }
  }

  // Get students/parents who chose paper format (for mass printing)
  const getStudentsByDocFormat = (format) => {
    return dossiers.value.filter(d => d.status === 'valide' && (d.documentFormat || 'papier') === format)
  }

  // Get dossier for a student by matching firstName + lastName (for looking up format from eleve)
  const getDossierForEleve = (eleveId, elevesStore) => {
    const eleve = elevesStore?.eleves?.find(e => e.id === eleveId)
    if (!eleve) return null
    return dossiers.value.find(d =>
      d.status === 'valide' &&
      d.firstName === eleve.firstName &&
      d.lastName === eleve.lastName
    ) || null
  }

  return {
    // State
    dossiers, loading,
    // Computed
    getDossiersByStatus, getPendingCount, dossierStats,
    // Queries
    getDossierById, checkCompleteness, getStudentsByDocFormat, getDossierForEleve,
    // Load
    loadDossiers,
    // CRUD
    createDossier, updateDossier, deleteDossier,
    // Workflow
    submitDossier, validateDossier, rejectDossier, ouvrirAccesMapoPlus,
    markComplete, markIncomplete,
    // Attachments
    addAttachment, removeAttachment,
    // Persistence
    saveDemoDossiers,
  }
})
