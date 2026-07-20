import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Store « accessibilité » — mode accessibilité activable depuis les Paramètres.
 *
 * Trois réglages, appliqués via des classes sur <html> (CSS dans main.css), et
 * persistés. Choix issus d'un audit rapide (WCAG 2.1) des leviers les plus utiles
 * ici : contraste, taille du texte, et réduction des animations (vestibulaire).
 */
const KEY = 'mapo_a11y'

export const useAccessibiliteStore = defineStore('accessibilite', () => {
  const contraste = ref(false)   // contraste élevé
  const grandTexte = ref(false)  // texte agrandi (zoom)
  const animOff = ref(false)     // animations réduites

  const actif = () => contraste.value || grandTexte.value || animOff.value

  function appliquer() {
    if (typeof document === 'undefined') return
    const c = document.documentElement.classList
    c.toggle('a11y-contraste', contraste.value)
    c.toggle('a11y-grandtexte', grandTexte.value)
    c.toggle('a11y-animoff', animOff.value)
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ contraste: contraste.value, grandTexte: grandTexte.value, animOff: animOff.value })) } catch { /* quota */ }
  }

  /** À appeler au démarrage de l'app (App.vue) : recharge les préférences + applique. */
  function init() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (s) { contraste.value = !!s.contraste; grandTexte.value = !!s.grandTexte; animOff.value = !!s.animOff }
      // Respect du réglage système « réduire les animations » si rien n'est choisi.
      else if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) animOff.value = true
    } catch { /* défauts */ }
    appliquer()
  }

  watch([contraste, grandTexte, animOff], () => { appliquer(); save() })

  return { contraste, grandTexte, animOff, actif, init, appliquer }
})
