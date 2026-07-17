import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store "usage" — jauge d'utilisation de l'IA façon Claude.
 *
 * Principe (décidé avec Steve) :
 *   - Une jauge de CRÉDITS (tokens) par SEMAINE, plafond selon le palier.
 *   - Réinitialisation FIXE toutes les semaines (comme Claude). Jamais d'illimité.
 *   - Plus le palier est faible, plus la jauge se remplit (se vide) vite → pousse
 *     à monter de palier ou à racheter des tokens.
 *   - Le MÊME code sert côté école (pool partagé admin + enseignants) et côté
 *     famille (MAPO+, jauge individuelle). Offres PARTICULIER ≠ offres PRO.
 *
 * Le coût API réel au palier bas est négligeable : la jauge sert surtout à
 * l'upsell, pas à couvrir un coût.
 */

// Paliers PARTICULIER (MAPO+ familles). Plafond hebdo en tokens.
// Base ≈ 5 quiz + 2-3 lectures de copie / semaine. Prix : API ≤ 50 % du prix.
export const PLANS = [
  { key: 'gratuit', label: 'Gratuit', capSemaine: 25000, prixMois: 0, rechargeHeures: 168, cible: 'Inclus / essai' },
  { key: 'essentiel', label: 'Essentiel', capSemaine: 150000, prixMois: 2500, rechargeHeures: 168, cible: 'Particulier' },
  { key: 'avance', label: 'Avancé', capSemaine: 300000, prixMois: 5000, rechargeHeures: 168, cible: 'Particulier' },
  { key: 'performance', label: 'Performance', capSemaine: 600000, prixMois: 10000, rechargeHeures: 168, cible: 'Particulier' },
]

// Coût indicatif par action, en tokens (à affiner avec la télémétrie réelle).
export const COUT_ACTION = {
  quiz: 3000,          // 1 quiz de 10 questions
  copie: 3500,         // 1 lecture de copie (vision)
  orientation: 2600,   // 1 orientation argumentée
  bilan6c: 1600,       // 1 bilan de compétences 6C
  appreciation: 1200,  // 1 appréciation de bulletin
  pedagogie: 2500,     // 1 préparation cours/devoir/examen
  commande: 700,       // 1 commande copilote
}

const STORAGE_KEY = 'mapo_usage_v1'

// Identifiant de semaine ISO (année-semaine) pour la réinitialisation hebdomadaire.
function weekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch (e) { return {} }
}
function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (e) { /* silent */ }
}

export const useUsageStore = defineStore('usage', () => {
  const saved = load()
  const planKey = ref(saved.planKey || 'gratuit')
  const used = ref(typeof saved.used === 'number' ? saved.used : 0)
  const week = ref(saved.week || weekId())
  const extra = ref(typeof saved.extra === 'number' ? saved.extra : 0) // tokens rachetés (PAYG)

  function save() { persist({ planKey: planKey.value, used: used.value, week: week.value, extra: extra.value }) }

  // Réinitialisation hebdomadaire fixe : si on a changé de semaine ISO, on remet à zéro.
  function rollIfNewWeek() {
    const w = weekId()
    if (w !== week.value) { week.value = w; used.value = 0; extra.value = 0; save() }
  }

  const plan = computed(() => PLANS.find((p) => p.key === planKey.value) || PLANS[0])
  const cap = computed(() => plan.value.capSemaine + extra.value)
  const restant = computed(() => { rollIfNewWeek(); return Math.max(0, cap.value - used.value) })
  const pourcentage = computed(() => (cap.value ? Math.min(100, Math.round((used.value / cap.value) * 100)) : 0))

  function canUse(cout) { rollIfNewWeek(); return used.value + (cout || 0) <= cap.value }

  // Consomme des tokens (appelé APRÈS une action IA réussie). Retourne false si dépassement.
  function consume(cout) {
    rollIfNewWeek()
    used.value += cout || 0
    save()
    return used.value <= cap.value
  }

  function setPlan(key) { if (PLANS.some((p) => p.key === key)) { planKey.value = key; save() } }
  function acheterTokens(n) { extra.value += n || 0; save() } // rachat PAYG
  function reset() { used.value = 0; extra.value = 0; week.value = weekId(); save() }

  return { PLANS, planKey, plan, used, cap, restant, pourcentage, week, extra, canUse, consume, setPlan, acheterTokens, reset }
})
