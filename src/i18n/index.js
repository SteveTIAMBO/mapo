import { createI18n } from 'vue-i18n'
import fr from './locales/fr.json'
import en from './locales/en.json'

// i18n FR/EN. On démarre lot par lot, section par section : seules les sections
// déjà traduites utilisent t(), le reste reste en français en attendant. Langue
// par défaut = FR (aucun changement pour les utilisateurs actuels) ; le choix est
// mémorisé par navigateur (localStorage).

function savedLang() {
  try { return localStorage.getItem('mapo_lang') } catch { return null }
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: savedLang() || 'fr',
  fallbackLocale: 'fr',
  messages: { fr, en },
})

export function setLang(lang) {
  const l = lang === 'en' ? 'en' : 'fr'
  i18n.global.locale.value = l
  try { localStorage.setItem('mapo_lang', l) } catch { /* quota : on garde en mémoire */ }
  try { document.documentElement.lang = l } catch { /* sûreté */ }
}

export function currentLang() {
  return i18n.global.locale.value
}

/**
 * Langue PAR DÉFAUT de l'école — appliquée seulement si le visiteur n'a jamais
 * choisi lui-même.
 *
 * ⚠️ Le réglage « Langue » des paramètres d'école et les boutons FR/EN de
 * l'en-tête désignaient la même chose sans se parler : le réglage enregistrait,
 * confirmait, et n'agissait pas du tout. Il agit désormais — mais il ne doit pas
 * écraser un choix explicite à chaque chargement, sinon un enseignant anglophone
 * dans une école francophone serait remis en français sans arrêt.
 *
 * On n'écrit donc PAS `mapo_lang` ici : un défaut n'est pas un choix.
 */
export function appliquerLangueEcole(lang) {
  if (savedLang()) return false
  if (lang !== 'fr' && lang !== 'en') return false
  i18n.global.locale.value = lang
  try { document.documentElement.lang = lang } catch { /* sûreté */ }
  return true
}
