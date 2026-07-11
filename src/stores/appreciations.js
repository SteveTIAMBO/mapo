import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'

/**
 * Store "appreciations" — génération d'appréciations de bulletin assistée par IA.
 *
 * Envoie les données de l'élève (moyennes, rang, mention, matières) au proxy
 * serveur /mapo-ia.php qui interroge le modèle de langage. ANONYMISATION : le
 * prénom réel est remplacé par un jeton [PRENOM] avant l'envoi (il ne quitte
 * jamais le navigateur) puis réinjecté dans la réponse renvoyée par l'IA.
 * Si le proxy n'est pas configuré (pas de clé API) ou indisponible, on bascule
 * en SIMULATION : une appréciation cohérente est rédigée localement à partir
 * des mêmes données → la fonctionnalité est toujours démontrable, gratuitement,
 * même avant le branchement de la clé.
 *
 * @typedef {Object} AppreciationData
 * @property {string} prenom
 * @property {string} classe
 * @property {string} periode
 * @property {number|null} moyenneGenerale
 * @property {number|null} rang
 * @property {number|null} effectif
 * @property {string} mention
 * @property {Array<{nom:string, moyenne:number|null, moyenneClasse:number|null}>} matieres
 * @property {'bienveillant'|'neutre'|'exigeant'} ton
 */

const IA_URL = '/mapo-ia.php'

export const useAppreciationsStore = defineStore('appreciations', () => {
  const generating = ref(false)
  const lastMode = ref('') // 'ia' | 'simulation'
  const lastReason = ref('')

  /**
   * Génère une appréciation. Tente l'IA réelle via le proxy ; bascule en
   * simulation locale si non configuré / non autorisé / proxy absent.
   * @param {AppreciationData} data
   * @returns {Promise<{ok:boolean, text:string, mode:string, reason:string}>}
   */
  async function generate(data) {
    generating.value = true
    lastMode.value = ''
    lastReason.value = ''
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token

      // Anonymisation avant IA : le prénom réel ne quitte jamais le navigateur.
      // On envoie un jeton neutre, puis on le remplace par le vrai prénom dans
      // la réponse. Données de mineurs → aucune donnée nominative vers l'IA.
      const NAME_TOKEN = '[PRENOM]'
      const realPrenom = data && data.prenom ? String(data.prenom) : ''
      const safeData = realPrenom ? { ...data, prenom: NAME_TOKEN } : data

      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: safeData }),
      })
      const json = await res.json().catch(() => null)

      if (json && json.ok && json.text) {
        lastMode.value = 'ia'
        const text = realPrenom ? json.text.split(NAME_TOKEN).join(realPrenom) : json.text
        return { ok: true, text: text.trim(), mode: 'ia', reason: '' }
      }
      // Repli simulation avec raison explicite
      const reason = json && json.error === 'not_configured'
        ? 'IA pas encore configurée'
        : json && json.error === 'non_autorise'
          ? 'Connexion requise'
          : json && json.error === 'limite_atteinte'
            ? 'Limite de démo atteinte, réessayez plus tard'
            : (json && (json.detail || json.error)) || 'Service IA indisponible'
      lastMode.value = 'simulation'
      lastReason.value = reason
      return { ok: true, text: buildLocalAppreciation(data), mode: 'simulation', reason }
    } catch (e) {
      lastMode.value = 'simulation'
      lastReason.value = 'Proxy indisponible (mode démonstration)'
      return { ok: true, text: buildLocalAppreciation(data), mode: 'simulation', reason: lastReason.value }
    } finally {
      generating.value = false
    }
  }

  return { generating, lastMode, lastReason, generate }
})

/**
 * Générateur local d'appréciation (mode simulation, sans IA).
 * Produit 2 à 3 phrases cohérentes en français à partir des données du bulletin.
 * @param {AppreciationData} d
 */
export function buildLocalAppreciation(d) {
  const prenom = (d.prenom || "L'élève").trim()
  const moy = typeof d.moyenneGenerale === 'number' ? d.moyenneGenerale : null
  const ton = ['bienveillant', 'neutre', 'exigeant'].includes(d.ton) ? d.ton : 'bienveillant'

  const mats = (d.matieres || []).filter((m) => typeof m.moyenne === 'number')
  const sorted = [...mats].sort((a, b) => b.moyenne - a.moyenne)
  const forts = sorted.slice(0, 2).filter((m) => m.moyenne >= 12).map((m) => m.nom)
  const faibles = [...mats]
    .filter((m) => m.moyenne < 10)
    .sort((a, b) => a.moyenne - b.moyenne)
    .slice(0, 2)
    .map((m) => m.nom)

  // 1) Constat de niveau
  let niveau
  if (moy === null) niveau = `${prenom} a participé au travail de la période`
  else if (moy >= 16) niveau = `${prenom} réalise un excellent trimestre, avec une moyenne de ${fmt(moy)}/20`
  else if (moy >= 14) niveau = `${prenom} fournit un très bon travail, avec une moyenne de ${fmt(moy)}/20`
  else if (moy >= 12) niveau = `${prenom} obtient des résultats satisfaisants, avec une moyenne de ${fmt(moy)}/20`
  else if (moy >= 10) niveau = `${prenom} obtient des résultats convenables mais encore fragiles, avec une moyenne de ${fmt(moy)}/20`
  else niveau = `${prenom} connaît des difficultés ce trimestre, avec une moyenne de ${fmt(moy)}/20`

  // 2) Points forts
  let phForts = ''
  if (forts.length === 1) phForts = ` Les résultats en ${forts[0]} sont à souligner.`
  else if (forts.length >= 2) phForts = ` Les résultats en ${forts[0]} et en ${forts[1]} sont à souligner.`

  // 3) Axes de progrès
  let phFaibles = ''
  if (faibles.length === 1) phFaibles = ` Des efforts restent attendus en ${faibles[0]}.`
  else if (faibles.length >= 2) phFaibles = ` Des efforts restent attendus en ${faibles[0]} et en ${faibles[1]}.`

  // 4) Encouragement selon le ton
  let cloture
  if (ton === 'exigeant') {
    cloture = moy !== null && moy >= 12
      ? ' Le conseil attend une régularité encore plus grande pour viser l\'excellence.'
      : ' Le conseil attend un investissement plus soutenu et régulier dès le prochain trimestre.'
  } else if (ton === 'neutre') {
    cloture = ' Le travail se poursuit dans cette dynamique.'
  } else {
    cloture = moy !== null && moy >= 12
      ? ' Continue ainsi, le conseil t\'encourage à poursuivre ces efforts.'
      : ' Avec un travail régulier, des progrès rapides sont à portée. Courage.'
  }

  return (niveau + '.' + phForts + phFaibles + cloture).replace(/\s+/g, ' ').trim()
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2)
}
