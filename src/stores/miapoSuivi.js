import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useAuthStore } from './auth'

// Lecture CÔTÉ ÉCOLE du suivi de révision MIAPO+ remonté par les élèves reliés.
// Les apprenants MIAPO+ poussent un instantané (Elo par matière + tendance) sous
// schools/{schoolId}/miapo_suivi/{eleveId} via le pont serveur (mapo-lien.php,
// action push_suivi). Ici l'ERP le RELIT directement en SDK : les règles Firestore
// autorisent déjà la lecture de cette sous-collection aux membres de l'école
// (isMember). Le document id EST l'id de l'élève ERP → jointure directe avec la
// fiche élève. Aucune donnée sensible : identité de classe + scores de progression.
//
// MODE DÉMO : aucune vraie remontée → on fabrique un échantillon déterministe à
// partir des élèves de démonstration, pour montrer l'écran enseignant sans serveur.

const MATIERES_DEMO = ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo']

export const useMiapoSuiviStore = defineStore('miapoSuivi', () => {
  const suivi = ref([])   // [{ eleveId, firstName, lastName, className, source, updatedAt, matieres:[{matiere,elo,tendance,attempts,enCalibrage,derniereActivite}] }]
  const loading = ref(false)
  const loaded = ref(false)

  const byEleveId = computed(() => {
    const m = {}
    for (const s of suivi.value) if (s.eleveId) m[s.eleveId] = s
    return m
  })

  // Normalise un document lu (ou fabriqué) : on ne garde que des champs bornés et
  // typés, jamais la donnée brute (le serveur a déjà assaini, on reste défensif).
  function norm(d) {
    const mats = Array.isArray(d.matieres) ? d.matieres : []
    return {
      eleveId: String(d.eleveId || ''),
      firstName: String(d.firstName || ''),
      lastName: String(d.lastName || ''),
      className: String(d.className || ''),
      source: String(d.source || 'miapo+'),
      updatedAt: d.updatedAt || null,
      matieres: mats.map((x) => ({
        matiere: String(x.matiere || ''),
        elo: Number.isFinite(x.elo) ? Math.round(x.elo) : 1000,
        tendance: Number.isFinite(x.tendance) ? Math.round(x.tendance) : 0,
        attempts: Number.isFinite(x.attempts) ? x.attempts : 0,
        enCalibrage: !!x.enCalibrage,
        derniereActivite: x.derniereActivite || null,
      })).filter((x) => x.matiere).slice(0, 40),
    }
  }

  // Échantillon EN MÉMOIRE (aucun stockage), déterministe : un sous-ensemble
  // d'élèves inscrits « révise à la maison » avec des tendances variées (certaines
  // en hausse, d'autres en baisse) pour rendre l'écran enseignant parlant.
  function buildDemo(eleves) {
    const inscrits = (eleves || []).filter((e) => e.status === 'inscrit')
    if (!inscrits.length) return []
    const byClass = {}
    for (const e of inscrits) (byClass[e.className] = byClass[e.className] || []).push(e)
    const now = Date.now()
    const tendances = [44, 27, 12, 0, -21, -37]
    const out = []
    let i = 0
    for (const cls of Object.keys(byClass).sort()) {
      for (const e of byClass[cls].slice(0, 2)) {
        if (out.length >= 8) break
        const nb = 2 + (i % 3) // 2 à 4 matières
        const mats = []
        for (let k = 0; k < nb; k++) {
          const matiere = MATIERES_DEMO[(i + k) % MATIERES_DEMO.length]
          const tendance = tendances[(i + k) % tendances.length]
          const elo = 980 + ((i * 37 + k * 53) % 300) + tendance
          const attempts = 5 + ((i + k * 2) % 16)
          const days = (i + k) % 6
          mats.push({
            matiere, tendance, elo: Math.round(elo), attempts,
            enCalibrage: false,
            derniereActivite: new Date(now - days * 86400000).toISOString(),
          })
        }
        out.push(norm({
          eleveId: e.id, firstName: e.firstName, lastName: e.lastName, className: e.className,
          source: 'miapo+', updatedAt: new Date(now - (i % 4) * 86400000).toISOString(), matieres: mats,
        }))
        i++
      }
    }
    return out
  }

  /**
   * Charge le suivi MIAPO+ de l'école. `demoEleves` sert uniquement à fabriquer
   * l'échantillon de démonstration ; en réel on lit la sous-collection Firestore.
   */
  async function load(demoEleves) {
    const authStore = useAuthStore()
    loading.value = true
    try {
      if (authStore.isDemo) {
        suivi.value = buildDemo(demoEleves)
        return
      }
      if (!authStore.schoolId) { suivi.value = []; return }
      const snap = await getDocs(collection(db, 'schools', authStore.schoolId, 'miapo_suivi'))
      suivi.value = snap.docs.map((d) => norm({ ...d.data(), eleveId: d.id }))
    } catch (e) {
      console.error('Erreur chargement suivi MIAPO+ (école) :', e)
      suivi.value = []
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  return { suivi, loading, loaded, byEleveId, load }
})
