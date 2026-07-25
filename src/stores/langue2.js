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

// Nom natif (affiché) + nom anglais (pour le prompt IA).
export const LANGUES2 = [
  { code: 'uk', native: 'Українська', en: 'Ukrainian' },
  { code: 'ar', native: 'العربية', en: 'Arabic' },
  { code: 'en', native: 'English', en: 'English' },
  { code: 'fr', native: 'Français', en: 'French' },
  { code: 'es', native: 'Español', en: 'Spanish' },
  { code: 'pt', native: 'Português', en: 'Portuguese' },
  { code: 'ru', native: 'Русский', en: 'Russian' },
  { code: 'tr', native: 'Türkçe', en: 'Turkish' },
  { code: 'fa', native: 'دری', en: 'Dari' },
  { code: 'ro', native: 'Română', en: 'Romanian' },
  { code: 'zh', native: '中文', en: 'Chinese (Simplified)' },
]

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
  return { code, dict, enabled, LANGUES2, tr, setCode }
})
