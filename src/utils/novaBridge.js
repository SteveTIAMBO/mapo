/**
 * novaBridge.js
 * =============
 * Module d'intégration NOVA → MAPO (sens inverse)
 *
 * Permet à MAPO de rechercher et importer les données d'une école
 * déjà auditée sur NOVA, pour pré-remplir les paramètres école.
 *
 * Initialise Firebase NOVA comme app secondaire et lit la collection
 * "nova_directory" du projet nova-edufrem.
 */

import { initializeApp, getApp } from 'firebase/app'
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore'

// Config Firebase NOVA (lecture seule)
const NOVA_FIREBASE_CONFIG = {
  apiKey: 'NOVA_API_KEY_PLACEHOLDER',   // À remplacer avec la vraie clé
  authDomain: 'nova-edufrem.firebaseapp.com',
  projectId: 'nova-edufrem',
  storageBucket: 'nova-edufrem.firebasestorage.app',
}

let novaApp = null
let novaDb = null

/**
 * Initialise la connexion secondaire à Firebase NOVA
 */
function init() {
  if (novaApp) return

  try {
    novaApp = initializeApp(NOVA_FIREBASE_CONFIG, 'nova-reader')
    novaDb = getFirestore(novaApp)
    console.log('[novaBridge] Connexion NOVA initialisée')
  } catch (err) {
    if (err.code === 'app/duplicate-app') {
      novaApp = getApp('nova-reader')
      novaDb = getFirestore(novaApp)
    } else {
      console.error('[novaBridge] Erreur initialisation:', err)
    }
  }
}

/**
 * Recherche une école par nom dans nova_directory
 * @param {string} query - Nom ou sigle de l'école
 * @returns {Promise<Array>} - Liste des profils trouvés
 */
export async function searchSchoolInNova(query) {
  init()
  if (!novaDb) return []

  const q = (query || '').toLowerCase().trim()
  if (!q) return []

  const results = []

  try {
    // Essai par slug exact
    const slug = slugify(query)
    if (slug) {
      const exactSnap = await getDoc(doc(novaDb, 'nova_directory', slug))
      if (exactSnap.exists()) {
        results.push({ id: exactSnap.id, ...exactSnap.data() })
      }
    }

    // Scan si pas de résultat exact
    if (results.length === 0) {
      const snapshot = await getDocs(collection(novaDb, 'nova_directory'))
      snapshot.forEach((d) => {
        const data = d.data()
        const nom = (data.identite?.nom || data.nom || '').toLowerCase()
        const sigle = (data.identite?.sigle || data.sigle || '').toLowerCase()
        if (nom.includes(q) || sigle.includes(q) || q.includes(sigle)) {
          results.push({ id: d.id, ...data })
        }
      })
    }
  } catch (err) {
    console.error('[novaBridge] Erreur recherche:', err)
  }

  return results
}

/**
 * Convertit un profil NOVA en données compatibles avec les paramètres école MAPO.
 * Ne remplit que les champs qui ont un équivalent dans MAPO.
 *
 * @param {Object} novaProfile - Profil issu de nova_directory
 * @returns {Object} - Objet partiel compatible avec schoolSettings
 */
export function novaProfileToMapoSettings(novaProfile) {
  if (!novaProfile) return {}

  const id = novaProfile.identite || novaProfile
  const eff = novaProfile.effectifs || {}

  // Mapper le type NOVA → type MAPO
  let schoolType = ''
  const novaType = id.typeEtablissement || ''
  if (novaType === 'public') schoolType = 'lycee_public'
  else if (novaType === 'prive_laic') schoolType = 'college_prive'
  else if (novaType === 'prive_confessionnel') schoolType = 'college_prive'

  // Mapper pays → code
  const paysMap = {
    'cameroun': 'CM',
    'sénégal': 'SN',
    'senegal': 'SN',
    "côte d'ivoire": 'CI',
    "cote d'ivoire": 'CI',
  }
  const paysCode = paysMap[(id.pays || '').toLowerCase()] || ''

  return {
    schoolName: id.nom || '',
    acronym: id.sigle || '',
    schoolType,
    address: id.quartier || id.adresseBP || '',
    city: id.ville || '',
    country: paysCode,
    phone: id.telephone || '',
    email: id.email || '',
    website: id.website || '',
  }
}

function slugify(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
