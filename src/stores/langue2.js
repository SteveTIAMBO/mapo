// ─────────────────────────────────────────────────────────────────────────────
// SECONDE LANGUE (inclusion / accessibilité).
//
// Un nouvel arrivant (ex. un élève ukrainien en France) choisit une 2ᵉ langue :
// les libellés clés du menu s'affichent alors avec cette langue en sous-titre.
// Les traductions sont produites À LA VOLÉE par l'IA (tâche `translate`) et
// mises en cache localement → chaque libellé n'est traduit qu'une fois, et ça
// couvre n'importe quelle langue sans maintenir de fichiers de traduction.
// ─────────────────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTuteurStore } from './tuteur'

const CODE_KEY = 'mapo_b2c_langue2'
const DICT_KEY = (code) => 'mapo_b2c_langue2_dict_' + code

// Nom natif (affiché) + nom anglais (pour le prompt IA). Ordonné par nombre de
// locuteurs (les plus parlées d'abord : arabe, chinois, anglais, espagnol, hindi…).
//
// ─── LANGUES AFRICAINES : pourquoi c'est acceptable ICI et pas ailleurs ───
//
// Arbitrage Steve (16/08). On ne fait PAS de module d'apprentissage de langue
// locale — une IA qui invente du wolof enseignerait du faux à un enfant. Mais
// afficher l'INTERFACE dans la langue d'un parent qui ne lit pas le français,
// c'est autre chose, et l'enjeu n'est pas comparable :
//
//   • une réponse de quiz fausse transmet une connaissance fausse ;
//   • un libellé de menu maladroit gêne, et se corrige.
//
// Et surtout, la mécanique de ce fichier rend l'erreur VISIBLE : la traduction
// s'affiche en SOUS-TITRE, le français reste au-dessus. Un parent, un
// enseignant ou Steve voient les deux côte à côte et peuvent signaler ce qui
// cloche. C'est une aide à la lecture, pas une substitution.
//
// `qualite` reflète ce que la recherche du 16/08 a établi sur la couverture
// réelle des modèles génériques. On l'affiche : un avertissement générique
// protège juridiquement mais n'informe personne, un avertissement PRÉCIS dit à
// l'utilisateur à quoi s'attendre.
//   'bonne'         → langue bien dotée, présente dans les évaluations publiques
//   'moyenne'       → présente mais nettement moins fiable
//   'experimentale' → corpus quasi nul, aucun jeu d'évaluation : à vérifier
//
// ⚠️ `en` doit NOMMER LA VARIANTE, jamais la macrolangue. « Fulani » seul
// laisse le modèle choisir entre neuf langues distinctes ; « Pulaar (Senegal) »
// ne laisse pas ce choix.
export const LANGUES2 = [
  { code: 'ar', native: 'العربية', en: 'Arabic' },
  { code: 'zh', native: '中文', en: 'Chinese (Simplified)' },
  { code: 'en', native: 'English', en: 'English' },
  { code: 'es', native: 'Español', en: 'Spanish' },
  { code: 'hi', native: 'हिन्दी', en: 'Hindi' },
  { code: 'fr', native: 'Français', en: 'French' },
  { code: 'pt', native: 'Português', en: 'Portuguese' },
  { code: 'ru', native: 'Русский', en: 'Russian' },
  { code: 'ur', native: 'اردو', en: 'Urdu' },
  { code: 'bn', native: 'বাংলা', en: 'Bengali' },
  { code: 'uk', native: 'Українська', en: 'Ukrainian' },
  { code: 'tr', native: 'Türkçe', en: 'Turkish' },
  { code: 'fa', native: 'دری', en: 'Dari' },
  { code: 'ro', native: 'Română', en: 'Romanian' },

  // ── Afrique ──────────────────────────────────────────────────────────────
  { code: 'sw', native: 'Kiswahili', en: 'Swahili', afrique: true, qualite: 'bonne' },
  { code: 'am', native: 'አማርኛ', en: 'Amharic', afrique: true, qualite: 'bonne' },
  { code: 'wo', native: 'Wolof', en: 'Wolof (Senegal, 2005 official orthography)', afrique: true, qualite: 'moyenne' },
  { code: 'ha', native: 'Hausa', en: 'Hausa (boko orthography)', afrique: true, qualite: 'moyenne' },
  { code: 'yo', native: 'Yorùbá', en: 'Yoruba (with tone marks and subdots)', afrique: true, qualite: 'moyenne' },
  { code: 'mg', native: 'Malagasy', en: 'Malagasy (official Merina standard)', afrique: true, qualite: 'moyenne' },
  { code: 'rw', native: 'Ikinyarwanda', en: 'Kinyarwanda', afrique: true, qualite: 'moyenne' },
  { code: 'bm', native: 'Bamanankan', en: 'Bambara (Latin script, 1982 Mali alphabet)', afrique: true, qualite: 'experimentale' },
  { code: 'dyu', native: 'Julakan', en: 'Dyula (Côte d’Ivoire, ILA Abidjan orthography)', afrique: true, qualite: 'experimentale' },
  { code: 'ff', native: 'Pulaar', en: 'Pulaar (Senegal variety of Fula)', afrique: true, qualite: 'experimentale' },
  { code: 'ln', native: 'Lingála', en: 'Lingala', afrique: true, qualite: 'experimentale' },
  // Pidgin camerounais : ~50 % de la population du Cameroun le pratique, bien
  // plus que toutes les langues locales du pays réunies. C'est le meilleur
  // rapport portée/risque pour le marché domestique.
  { code: 'wes', native: 'Kamtok', en: 'Cameroonian Pidgin English (Kamtok)', afrique: true, qualite: 'moyenne' },
  { code: 'ewo', native: 'Ewondo', en: 'Ewondo (Cameroon)', afrique: true, qualite: 'experimentale' },
  { code: 'dua', native: 'Duálá', en: 'Duala (Cameroon)', afrique: true, qualite: 'experimentale' },
  { code: 'bas', native: 'Ɓàsàa', en: 'Basaa (Cameroon)', afrique: true, qualite: 'experimentale' },
]

/** Fiabilité annoncée d'une langue (voir le commentaire de LANGUES2). */
export function qualiteLangue(code) {
  const l = LANGUES2.find((x) => x.code === code)
  return l && l.qualite ? l.qualite : 'bonne'
}

export const useLangue2Store = defineStore('langue2', () => {
  const code = ref('')
  try { code.value = localStorage.getItem(CODE_KEY) || '' } catch { /* silent */ }
  const dict = ref({})
  function loadDict() {
    try { dict.value = code.value ? JSON.parse(localStorage.getItem(DICT_KEY(code.value)) || '{}') : {} } catch { dict.value = {} }
  }
  loadDict()
  function persistDict() {
    try { if (code.value) localStorage.setItem(DICT_KEY(code.value), JSON.stringify(dict.value)) } catch { /* quota */ }
  }
  const enabled = computed(() => !!code.value)
  function langEn() { const l = LANGUES2.find((x) => x.code === code.value); return l ? l.en : '' }

  // File des libellés à traduire : dédupliquée + tentés-une-fois (pas de spam).
  let pending = new Set()
  let attempted = new Set()
  let timer = null
  function scheduleFlush() { if (!timer) timer = setTimeout(flush, 400) }
  async function flush() {
    timer = null
    if (!code.value) { pending.clear(); return }
    const batch = Array.from(pending).slice(0, 60)
    pending = new Set(Array.from(pending).slice(60))
    if (!batch.length) return
    const target = langEn()
    batch.forEach((s) => attempted.add(s))
    if (target) {
      const out = await useTuteurStore().translateUI(batch, target, 'French')
      const d = { ...dict.value }
      batch.forEach((s, i) => { if (out && out[i]) d[s] = out[i] })
      dict.value = d
      persistDict()
    }
    if (pending.size) scheduleFlush()
  }

  // Traduction d'un libellé (la source est le texte primaire déjà rendu).
  // Renvoie '' tant que ce n'est pas dispo, et programme la traduction.
  function tr(text) {
    const s = String(text == null ? '' : text)
    if (!s || !code.value) return ''
    if (dict.value[s] != null) return dict.value[s]
    if (attempted.has(s)) return ''
    if (!pending.has(s)) { pending.add(s); scheduleFlush() }
    return ''
  }
  function setCode(c) {
    code.value = c || ''
    pending = new Set(); attempted = new Set()
    try { if (code.value) localStorage.setItem(CODE_KEY, code.value); else localStorage.removeItem(CODE_KEY) } catch { /* silent */ }
    loadDict()
  }
  /**
   * Traduit MAINTENANT une liste de textes et attend le résultat.
   *
   * `tr()` est volontairement asynchrone et différée : elle sert l'affichage,
   * où l'on préfère montrer le français tout de suite quitte à compléter
   * ensuite. Ici c'est l'inverse : on prépare des textes qui partiront plus
   * tard, hors de l'application (notifications). Il faut donc la réponse avant
   * de continuer — et la mettre en cache pour ne pas repayer la traduction.
   */
  async function traduireMaintenant(textes) {
    if (!code.value || !Array.isArray(textes) || !textes.length) return []
    const cible = langEn()
    if (!cible) return []
    const manquants = textes.filter((t) => !dict.value[t])
    if (manquants.length) {
      const out = await useTuteurStore().translateUI(manquants, cible, 'French')
      if (out && out.length) {
        const d = { ...dict.value }
        manquants.forEach((t, i) => { if (out[i]) d[t] = out[i] })
        dict.value = d
        persistDict()
      }
    }
    return textes.map((t) => dict.value[t] || '')
  }

  return { code, dict, enabled, LANGUES2, tr, setCode, traduireMaintenant }
})
