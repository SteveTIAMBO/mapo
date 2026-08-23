import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useSchoolStore } from './school'
import { demoKey } from '../utils/demoScope'
import { DISCIPLINES_PRIMAIRE } from '../data/primaire'

/**
 * Disciplines du PRIMAIRE — celles de l'école, pas celles du Cameroun.
 *
 * Le défaut corrigé : les dix disciplines du primaire étaient écrites en dur,
 * tirées des programmes camerounais MINEDUB 2018, et servies à TOUTES les écoles
 * primaires. Vérifié en démonstration le 23/08/2026 : une école de Dakar recevait
 * « Langues et cultures nationales » et « Développement personnel », deux
 * intitulés propres à l'APC camerounais — et l'écran Matières n'avait même pas de
 * bouton d'ajout en édition primaire (`v-if="!isPrimaire"`). L'école ne pouvait
 * donc NI reconnaître son programme, NI le corriger.
 *
 * ⚠️ Ce que ce fichier n'affirme pas : nous n'avons de programme officiel sourcé
 * que pour le Cameroun. Pour les autres pays, l'école reçoit une AMORCE
 * volontairement neutre, présentée comme telle à l'écran. Servir une amorce en
 * disant qu'elle est une amorce est honnête ; la servir en la présentant comme
 * « le programme officiel » ne l'est pas — c'est exactement ce que faisait
 * l'écran d'accueil.
 *
 * Même logique que `stores/niveaux.js` : une amorce plausible que l'école
 * corrige, plutôt qu'une page blanche.
 */

const DEMO_KEY = 'mapo_demo_disciplines_primaire'

/**
 * Amorce NEUTRE, pour les pays dont nous n'avons pas le programme officiel.
 *
 * Ce sont les disciplines que l'on retrouve dans la quasi-totalité des systèmes
 * francophones d'Afrique et d'Europe. Aucun domaine APC n'y est rattaché : les
 * cinq domaines pondérés (60 / 20 / 10 / 5 / 5) sont une construction
 * camerounaise, et les afficher ailleurs serait une affirmation de plus.
 */
export const DISCIPLINES_PRIMAIRE_NEUTRE = [
  { name: 'Français', domaine: '' },
  { name: 'Mathématiques', domaine: '' },
  { name: 'Éveil scientifique', domaine: '' },
  { name: 'Histoire-Géographie', domaine: '' },
  { name: 'Éducation civique et morale', domaine: '' },
  { name: 'Éducation physique et sportive', domaine: '' },
  { name: 'Éducation artistique', domaine: '' },
  { name: 'Anglais', domaine: '' },
]

/** Amorce du pays : le Cameroun a son programme sourcé, les autres non. */
export function amorcePays(pays) {
  return String(pays || '').toUpperCase() === 'CM'
    ? DISCIPLINES_PRIMAIRE.map((d) => ({ ...d }))
    : DISCIPLINES_PRIMAIRE_NEUTRE.map((d) => ({ ...d }))
}

/** Le pays a-t-il un programme officiel sourcé dans MAPO ? */
export function programmeOfficiel(pays) {
  return String(pays || '').toUpperCase() === 'CM'
}

/** Normalise un intitulé pour comparer sans se faire piéger par la casse. */
function cle(nom) {
  return String(nom || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export const useDisciplinesPrimaireStore = defineStore('disciplinesPrimaire', () => {
  const liste = ref(null)
  const loaded = ref(false)

  function _ref(sid) { return doc(db, 'schools', sid, 'config', 'disciplinesPrimaire') }

  /**
   * Pays de l'école — ou chaîne vide tant qu'on ne le SAIT pas.
   *
   * ⚠️ `country` vaut « CM » dans l'état initial du store, avant tout
   * chargement. Vérifié en démonstration le 23/08 : sur un accès direct à
   * /matieres, les réglages n'étaient pas encore chargés et une école de Dakar
   * se voyait servir les domaines pondérés de l'APC camerounais — « je ne sais
   * pas » était indistinguable de « Cameroun ».
   *
   * `schoolName` vide veut dire « rien n'est chargé » : on répond alors « je ne
   * sais pas », ce qui fait tomber du côté prudent (liste modifiable, aucune
   * affirmation de conformité) plutôt que du côté camerounais.
   */
  function pays() {
    try {
      const s = useSchoolStore().schoolSettings
      if (!s?.schoolName) return ''
      return s.country || ''
    } catch (e) { return '' }
  }

  /** Disciplines effectives : celles de l'école, sinon l'amorce de son pays. */
  const disciplines = computed(() =>
    (liste.value && liste.value.length ? liste.value : amorcePays(pays())),
  )

  /** L'école a-t-elle sa propre liste, ou lit-elle encore l'amorce ? */
  const personnalise = computed(() => !!(liste.value && liste.value.length))

  /**
   * Affiche-t-on les domaines pondérés de l'APC ?
   * UNIQUEMENT pour une école camerounaise qui n'a rien modifié : dès qu'elle
   * personnalise sa liste, les poids de l'APC ne correspondent plus à rien.
   */
  const avecDomaines = computed(() => programmeOfficiel(pays()) && !personnalise.value)

  const noms = computed(() => disciplines.value.map((d) => d.name))

  /**
   * Ajoute une discipline. Renvoie `false` sur doublon ou nom vide — l'appelant
   * DOIT le dire à l'utilisateur, sinon le bouton paraît sans effet.
   */
  function ajouter(nom, domaine = '') {
    const n = String(nom || '').trim()
    if (!n) return false
    const actuelles = disciplines.value.map((d) => ({ ...d }))
    if (actuelles.some((d) => cle(d.name) === cle(n))) return false
    actuelles.push({ name: n, domaine: domaine || '' })
    liste.value = actuelles
    save()
    return true
  }

  /** Renomme une discipline, en refusant un intitulé déjà pris. */
  function renommer(ancien, nouveau) {
    const n = String(nouveau || '').trim()
    if (!n) return false
    const actuelles = disciplines.value.map((d) => ({ ...d }))
    const i = actuelles.findIndex((d) => cle(d.name) === cle(ancien))
    if (i < 0) return false
    if (actuelles.some((d, j) => j !== i && cle(d.name) === cle(n))) return false
    actuelles[i] = { ...actuelles[i], name: n }
    liste.value = actuelles
    save()
    return true
  }

  /**
   * Retire une discipline. Une école doit garder au moins une matière : une
   * liste vide donnerait un emploi du temps et des bulletins sans contenu, sans
   * rien afficher qui l'explique.
   */
  function retirer(nom) {
    const actuelles = disciplines.value.map((d) => ({ ...d }))
    if (actuelles.length <= 1) return false
    const i = actuelles.findIndex((d) => cle(d.name) === cle(nom))
    if (i < 0) return false
    actuelles.splice(i, 1)
    liste.value = actuelles
    save()
    return true
  }

  /** Déplace une discipline dans la liste : l'ordre est celui des bulletins. */
  function deplacer(nom, sens) {
    const actuelles = disciplines.value.map((d) => ({ ...d }))
    const i = actuelles.findIndex((d) => cle(d.name) === cle(nom))
    if (i < 0) return false
    const j = sens === 'haut' ? i - 1 : i + 1
    if (j < 0 || j >= actuelles.length) return false
    ;[actuelles[i], actuelles[j]] = [actuelles[j], actuelles[i]]
    liste.value = actuelles
    save()
    return true
  }

  /** Revient à l'amorce du pays. */
  function reinitialiser() {
    liste.value = null
    save()
  }

  async function load(force = false) {
    if (loaded.value && !force) return
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      try {
        const s = JSON.parse(localStorage.getItem(demoKey(DEMO_KEY)) || '{}')
        liste.value = Array.isArray(s.liste) && s.liste.length ? s.liste : null
      } catch { liste.value = null }
      loaded.value = true
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) { loaded.value = true; return }
      const snap = await getDoc(_ref(sid))
      const l = snap.exists() ? snap.data().liste : null
      liste.value = Array.isArray(l) && l.length ? l : null
      loaded.value = true
    } catch { loaded.value = true }
  }

  async function save() {
    const authStore = useAuthStore()
    const data = liste.value ? JSON.parse(JSON.stringify(liste.value)) : []
    if (authStore.isDemo) {
      try { localStorage.setItem(demoKey(DEMO_KEY), JSON.stringify({ liste: data })) } catch { /* quota */ }
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(_ref(sid), { liste: data, updatedAt: new Date().toISOString() })
    } catch (e) { console.error('Erreur sauvegarde disciplines primaire:', e) }
  }

  return {
    liste, loaded, disciplines, noms, personnalise, avecDomaines,
    ajouter, renommer, retirer, deplacer, reinitialiser, load, save,
  }
})
