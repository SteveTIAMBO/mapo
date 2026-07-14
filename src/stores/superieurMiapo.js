import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Réglages MIAPO globaux — édition Supérieur
 * ------------------------------------------
 * Le directeur active / désactive MIAPO **par module** depuis les Paramètres
 * (roue crantée → onglet « MIAPO »). Désactiver un module coupe l'IA — et sa
 * consommation de crédits — pour ce module : les fonctions MIAPO concernées
 * disparaissent alors de l'interface.
 *
 * Persisté en localStorage. Défaut = tout activé.
 */
export const MIAPO_MODULES = [
  {
    key: 'inscriptions',
    label: 'Inscriptions',
    desc: 'Analyse des dossiers, pré-validation, message aux parents et vérification des pièces (OCR).',
  },
  {
    key: 'dashboard',
    label: 'Analyse du tableau de bord',
    desc: 'Synthèse « Ce que MIAPO observe » : retards de paiement, points à surveiller.',
  },
  {
    key: 'preparationCours',
    label: 'Préparation de cours',
    desc: 'Assistant pédagogique enseignant : cours, devoirs et examens générés avec corrigé.',
  },
  // NB : MIAPO+ (tuteur élève/parent) est un produit B2C à part (app MIAPO+) —
  // l'école ne contrôle pas son IA, donc il n'apparaît pas ici.
]

const STORAGE_KEY = 'sup_miapo_modules'

export const useSuperieurMiapoStore = defineStore('superieurMiapo', () => {
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) || {}
    } catch (e) { /* silent */ }
    return {}
  }
  const saved = load()
  // Défaut = activé : une clé n'est « désactivée » que si explicitement à false.
  const modules = ref(
    Object.fromEntries(MIAPO_MODULES.map((m) => [m.key, saved[m.key] !== false]))
  )

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(modules.value)) } catch (e) { /* silent */ }
  }
  function isEnabled(key) { return modules.value[key] !== false }
  function setModule(key, bool) {
    modules.value = { ...modules.value, [key]: !!bool }
    persist()
  }

  return { modules, isEnabled, setModule }
})
