import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useSchoolStore } from './school'
import { useEditionStore } from './edition'
import { LEVELS, levelsPrimairePour } from './classes'

/**
 * Store « Niveaux de l'école ».
 *
 * Le problème résolu : la liste des niveaux était un menu déroulant FERMÉ, alimenté
 * par une constante camerounaise (6e → Tle) ou par le primaire du pays. Une école
 * anglophone (« Form 1 »), technique (« F1 »), ou avec une maternelle, ne pouvait
 * créer aucune classe à la main. Le seul chemin était l'import Excel, ouvert par
 * conception — après quoi la classe n'avait aucune matière, aucun volume horaire,
 * n'apparaissait pas dans les statistiques et n'inscrivait personne aux examens.
 * Cinq écrans vides en cascade depuis une seule donnée non camerounaise, sans un
 * message. La promesse « on adapte le logiciel à votre contexte » se traduisait
 * par des écrans vides.
 *
 * Ici, l'école déclare SES niveaux, dans SON ordre. Un niveau porte :
 *   - `value` : la clé technique, stable, celle qui est stockée sur les classes ;
 *   - `label` : ce que l'école affiche (« 6ème », « Form 1 », « Grande section ») ;
 *   - `cycle` : à quel cycle il appartient, ce qui pilote les matières, les
 *     volumes horaires, les statistiques et le bulletin.
 *
 * `cycle` ∈ 'primaire' | 'premier' | 'second'. Ce sont les trois cycles que le
 * reste de l'application connaît déjà ; on n'en invente pas un quatrième, sinon
 * il faudrait enseigner à chaque écran ce qu'il signifie.
 *
 * Persistance : schools/{sid}/config/niveaux, comme les autres référentiels
 * d'école (aucune règle Firestore à ajouter). Démo : localStorage.
 */

const DEMO_KEY = 'mapo_niveaux_v1'

export const CYCLES_NIVEAU = ['primaire', 'premier', 'second']

/** Clé technique à partir d'un libellé libre : stable, sans accent, sans espace. */
export function cleNiveau(label) {
  return String(label || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export const useNiveauxStore = defineStore('niveaux', () => {
  // `null` tant que rien n'est chargé : on distingue « pas encore lu » de
  // « l'école n'a rien déclaré », sinon on écraserait sa liste par les défauts.
  const liste = ref(null)
  const loaded = ref(false)

  function _ref(sid) { return doc(db, 'schools', sid, 'config', 'niveaux') }

  /**
   * Niveaux par défaut, déduits de l'édition et du pays. Sert d'AMORCE : l'école
   * part de quelque chose de plausible et corrige, plutôt que d'une page blanche.
   */
  function defauts() {
    const edition = useEditionStore()
    const pays = useSchoolStore().schoolSettings?.country
    if (edition.isPrimaire) {
      return levelsPrimairePour(pays).map((l) => ({ ...l, cycle: 'primaire' }))
    }
    return LEVELS.map((l) => ({ value: l.value, label: l.label, cycle: l.cycle }))
  }

  /** Les niveaux effectifs de l'école : sa liste si elle en a une, sinon l'amorce. */
  const niveaux = computed(() => (liste.value && liste.value.length ? liste.value : defauts()))

  /** L'école a-t-elle défini sa propre liste, ou lit-elle encore l'amorce ? */
  const personnalise = computed(() => !!(liste.value && liste.value.length))

  const valeurs = computed(() => niveaux.value.map((n) => n.value))

  function trouver(value) {
    const v = String(value || '').trim()
    return niveaux.value.find((n) => n.value === v)
      // Tolérance : un niveau importé peut arriver sous son libellé plutôt que
      // sous sa clé. Rejeter serait le faire disparaître en silence.
      || niveaux.value.find((n) => n.label === v)
      || null
  }

  /** Cycle d'un niveau. `null` si l'école ne l'a pas déclaré : à l'appelant de décider. */
  function cycleDe(value) {
    return trouver(value)?.cycle || null
  }

  function libelle(value) {
    return trouver(value)?.label || String(value || '')
  }

  /** Niveaux d'un cycle, dans l'ordre de l'école. */
  function duCycle(cycle) {
    return niveaux.value.filter((n) => n.cycle === cycle)
  }

  /**
   * Charge le référentiel. Appelé une fois par la coquille de l'application, et
   * aussi par les écrans qui en dépendent : le garde évite de relire Firestore à
   * chaque navigation. `force` sert à recharger explicitement après un import.
   */
  async function load(force = false) {
    if (loaded.value && !force) return
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      try {
        const s = JSON.parse(localStorage.getItem(DEMO_KEY) || '{}')
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
    const data = JSON.parse(JSON.stringify(liste.value || []))
    if (authStore.isDemo) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify({ liste: data })) } catch { /* quota */ }
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(_ref(sid), { liste: data, updatedAt: new Date().toISOString() })
    } catch (e) { console.error('Erreur sauvegarde niveaux:', e) }
  }

  /**
   * Première modification : on matérialise l'amorce avant de la modifier.
   * Sans ça, ajouter un niveau à une liste calculée ne persisterait rien.
   */
  function _materialiser() {
    if (!liste.value || !liste.value.length) liste.value = defauts().map((n) => ({ ...n }))
  }

  /**
   * Ajoute un niveau. Renvoie le niveau créé, ou `null` si le libellé est vide ou
   * déjà pris — on ne crée pas deux niveaux homonymes, les classes ne sauraient
   * plus auquel elles se rattachent.
   */
  function ajouter({ label, cycle = 'premier' }) {
    const lab = String(label || '').trim()
    if (!lab) return null
    _materialiser()
    if (liste.value.some((n) => n.label === lab || n.value === cleNiveau(lab))) return null
    const n = {
      value: cleNiveau(lab) || 'niveau-' + (liste.value.length + 1),
      label: lab,
      cycle: CYCLES_NIVEAU.includes(cycle) ? cycle : 'premier',
    }
    liste.value.push(n)
    save()
    return n
  }

  /**
   * Renomme ou reclasse un niveau. La CLÉ ne change jamais : les classes, les
   * notes et les bulletins déjà enregistrés la portent. Renommer « 6ème » en
   * « Form 1 » ne doit pas détacher les classes existantes.
   */
  function modifier(value, { label, cycle } = {}) {
    _materialiser()
    const n = liste.value.find((x) => x.value === value)
    if (!n) return false
    if (label !== undefined && String(label).trim()) n.label = String(label).trim()
    if (cycle !== undefined && CYCLES_NIVEAU.includes(cycle)) n.cycle = cycle
    save()
    return true
  }

  /**
   * Retire un niveau. Refuse si des classes s'y rattachent encore : les orphaner
   * les ferait disparaître des écrans sans rien dire, ce qui est précisément le
   * genre de panne qu'on élimine. L'appelant fournit les classes existantes.
   */
  function retirer(value, classes = []) {
    _materialiser()
    const utilise = classes.some((c) => c.level === value)
    if (utilise) return { ok: false, raison: 'utilise' }
    const avant = liste.value.length
    liste.value = liste.value.filter((n) => n.value !== value)
    if (liste.value.length === avant) return { ok: false, raison: 'introuvable' }
    save()
    return { ok: true }
  }

  /** Déplace un niveau : l'ORDRE est ce qui définit la progression scolaire. */
  function deplacer(value, sens) {
    _materialiser()
    const i = liste.value.findIndex((n) => n.value === value)
    const j = sens === 'haut' ? i - 1 : i + 1
    if (i === -1 || j < 0 || j >= liste.value.length) return false
    const [n] = liste.value.splice(i, 1)
    liste.value.splice(j, 0, n)
    save()
    return true
  }

  /** Revient à l'amorce du pays et de l'édition. */
  function reinitialiser() {
    liste.value = null
    save()
  }

  /**
   * Niveau suivant dans l'ordre de l'école.
   * `null` = dernier niveau, donc fin de cycle. `undefined` = niveau inconnu.
   * La distinction est vitale : voir `niveauSuivant` dans year-transition.js.
   */
  function suivant(value) {
    const codes = valeurs.value
    const i = codes.indexOf(String(value || '').trim())
    if (i === -1) return undefined
    return i === codes.length - 1 ? null : codes[i + 1]
  }

  return {
    liste, loaded, niveaux, valeurs, personnalise,
    load, save, trouver, cycleDe, libelle, duCycle,
    ajouter, modifier, retirer, deplacer, reinitialiser, suivant,
  }
})
