<template>
  <div class="sen">
    <div class="sen-hero">
      <div class="sen-avatar">{{ initials }}</div>
      <div class="sen-hero-info">
        <div class="sen-hello">{{ t('sup.espaceEnseignant.hello', { name: prenom }) }}</div>
        <div class="sen-sub">{{ moi.specialite }} · {{ moi.statut === 'vacataire' ? t('sup.espaceEnseignant.vacataire') : t('sup.espaceEnseignant.permanent') }}</div>
      </div>
    </div>

    <div class="sen-kpis">
      <div class="sen-kpi"><div class="sen-kpi-lab">{{ t('sup.espaceEnseignant.kpiUe') }}</div><div class="sen-kpi-val">{{ mesUe.length }}</div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">{{ t('sup.espaceEnseignant.kpiVolume') }}</div><div class="sen-kpi-val">{{ moi.volumeHoraire }}<span> h</span></div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">{{ t('sup.espaceEnseignant.kpiStudents') }}</div><div class="sen-kpi-val">{{ nbEtudiants }}</div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">{{ t('sup.espaceEnseignant.kpiNotes') }}</div><div class="sen-kpi-val" :class="{ 'is-warn': aSaisir > 0 }">{{ aSaisir }}</div></div>
    </div>

    <!-- Accès rapide aux rubriques -->
    <div class="sen-quick">
      <button v-for="q in quickLinks" :key="q.key" type="button" class="sen-quick-item" @click="goTab(q.key)">
        <span class="sen-quick-ico" v-html="q.icon"></span>
        <span class="sen-quick-lab">{{ q.label }}</span>
      </button>
    </div>

    <div class="sen-grid">
      <!-- Mes enseignements -->
      <section class="sen-card sen-card-wide">
        <div class="sen-card-head">
          <h2 class="sen-h2">{{ t('sup.espaceEnseignant.teaching') }}</h2>
          <button type="button" class="sen-link" @click="goTab('ens_ue')">{{ t('sup.espaceEnseignant.seeAll') }}</button>
        </div>
        <div v-for="u in mesUe" :key="u.id" class="sen-ue">
          <div>
            <div class="sen-ue-code">{{ u.code }} · {{ u.intitule }}</div>
            <div class="sen-ue-int">{{ u.semestre }} · {{ t('sup.espaceEnseignant.credits', { n: u.ects }) }}</div>
          </div>
          <div class="sen-ue-h">{{ u.volumeHoraire }} h</div>
        </div>
        <p v-if="!mesUe.length" class="sen-empty">{{ t('sup.espaceEnseignant.noUe') }}</p>
      </section>

      <div class="sen-side">
        <!-- Assistant IA (masqué si MIAPO désactivé pour la préparation de cours) -->
        <section v-if="miapoGlobal.isEnabled('preparationCours')" class="sen-card sen-ia">
          <div class="sen-ia-badge">MIAPO</div>
          <h2 class="sen-h2 sen-ia-h2">{{ t('sup.espaceEnseignant.iaTitle') }}</h2>
          <p class="sen-ia-txt">{{ t('sup.espaceEnseignant.iaText') }}</p>
          <button class="sen-ia-cta" type="button" @click="goTab('ens_devoirs')">{{ t('sup.espaceEnseignant.iaCta') }}</button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useSuperieurMiapoStore } from '../../stores/superieurMiapo'
import { generateFichePaie, fichePaieDetail, moisLabel } from '../../utils/pdfFichePaie'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const miapoGlobal = useSuperieurMiapoStore()
const goTab = inject('supGoTab', () => {})
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const quickLinks = computed(() => [
  { key: 'ens_ue', label: t('sup.espaceEnseignant.qlUe'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
  { key: 'ens_notes', label: t('sup.espaceEnseignant.qlNotes'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' },
  { key: 'ens_cours', label: t('sup.espaceEnseignant.qlCours'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { key: 'ens_devoirs', label: t('sup.espaceEnseignant.qlDevoirs'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
  { key: 'ens_edt', label: t('sup.espaceEnseignant.qlEdt'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
  { key: 'ens_messagerie', label: t('sup.espaceEnseignant.qlMessagerie'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { key: 'ens_paie', label: t('sup.espaceEnseignant.qlPaie'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
])

const prenom = moi.prenom || (moi.nomComplet || '').split(' ').slice(-1)[0] || t('sup.espaceEnseignant.profFallback')
const initials = ((moi.prenom || '') + ' ' + (moi.nom || '')).trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'PR'

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// ── Fiches de paie de l'intervenant connecté (moi) ──
const paie = computed(() => fichePaieDetail(moi))
const nowPaie = new Date()
const moisDispo = computed(() => {
  const arr = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(nowPaie.getFullYear(), nowPaie.getMonth() - i, 1)
    arr.push({ year: d.getFullYear(), monthIndex: d.getMonth(), label: `${moisLabel(d.getMonth())} ${d.getFullYear()}` })
  }
  return arr
})
function telechargerPaie(m) { generateFichePaie(moi, m.year, m.monthIndex, ECOLE) }
function fmtFcfa(n) { return (n ?? 0).toLocaleString('fr-FR') }

const ueSelId = ref(mesUe[0] ? mesUe[0].id : '')
const ueSel = computed(() => mesUe.find((u) => u.id === ueSelId.value))
// Étudiants inscrits à l'UE + leurs notes CC/Examen (forme objet du store)
const notesUE = computed(() => (ueSelId.value ? store.notesPourUE(ueSelId.value) : []))
const rosterPromo = computed(() => {
  const p = store.promotions.find((pr) => pr.id === (ueSel.value && ueSel.value.promotionId))
  return p ? `${p.programmeNom} · ${p.anneeNom}` : ''
})

const nbEtudiants = (() => {
  const promoIds = new Set(mesUe.map((u) => u.promotionId))
  return store.etudiants.filter((e) => promoIds.has(e.promotionId)).length
})()
// « Notes à saisir » = nombre de notes d'UE encore en attente sur toutes mes UE
const aSaisir = computed(() => {
  let n = 0
  for (const u of mesUe) {
    for (const row of store.notesPourUE(u.id)) if (row.note == null) n++
  }
  return n
})

// Saisie RÉELLE : chaque note (CC / Examen) est persistée via le store (setSupNote).
// La note d'UE (CC 40 % + Examen 60 %) et la validation se recalculent en direct.
const saved = ref(false)
let savedTimer = null
function saveNote(etudiantId, field, value) {
  store.setSupNote(etudiantId, ueSelId.value, field, value)
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 2000)
}

const iaMsg = ref('')
function iaClick() { iaMsg.value = "L'assistant MIAPO génère cours, devoirs et examens avec corrigé. Fonction pleinement disponible dans l'espace enseignant connecté." }
</script>

<style scoped>
.sen { display: flex; flex-direction: column; gap: 18px; }
.sen-hero { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, rgba(var(--pr-rgb), 0.10), rgba(var(--pr-rgb), 0.02)); border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 18px; padding: 20px 24px; }
.sen-avatar { width: 58px; height: 58px; border-radius: 15px; background: var(--pr); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; }
.sen-hello { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: var(--text, #1A1D1F); }
.sen-sub { font-size: 14px; color: var(--muted, #5b6472); margin-top: 2px; }
.sen-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sen-quick { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.sen-quick-item { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 16px; cursor: pointer; transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; font-family: inherit; text-align: left; }
.sen-quick-item:hover { border-color: var(--pr); transform: translateY(-2px); box-shadow: 0 8px 22px rgba(20,32,64,.10); }
.sen-quick-ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: rgba(var(--pr-rgb), .10); color: var(--pr); }
.sen-quick-lab { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--text, #1A1D1F); }
.sen-link { background: none; border: none; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--pr); cursor: pointer; }
.sen-kpi { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 16px 18px; }
.sen-kpi-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); }
.sen-kpi-val { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--text, #1A1D1F); margin-top: 4px; }
.sen-kpi-val span { font-size: 14px; color: var(--muted, #9AA2B1); font-weight: 600; }
.sen-kpi-val.is-warn { color: #B45309; }
.sen-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
.sen-side { display: flex; flex-direction: column; gap: 16px; }
.sen-card { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.sen-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.sen-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--text, #1A1D1F); margin: 0 0 14px; }
.sen-card-head .sen-h2 { margin: 0; }
.sen-select { font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--text, #23262E); background: var(--input-bg, rgba(20,32,64,.05)); border: 1px solid var(--border, rgba(20,32,64,.10)); border-radius: 9px; padding: 6px 10px; max-width: 260px; }
.sen-note { font-size: 12.5px; color: var(--muted, #6b7280); margin: 0 0 12px; }
.sen-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sen-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sen-table th.num, .sen-table td.num { text-align: right; }
.sen-table td { padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.sen-mat { font-weight: 700; color: var(--pr); }
.sen-note-input { width: 70px; text-align: right; font-family: inherit; font-size: 13px; border: 1px solid var(--border, rgba(20,32,64,.14)); border-radius: 8px; padding: 5px 8px; }
.sen-note-input:focus { outline: none; border-color: var(--pr); }
.sen-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.sen-btn { background: var(--pr); color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 700; font-size: 13.5px; padding: 9px 18px; cursor: pointer; }
.sen-saved { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.sen-saved-auto { font-size: 12.5px; color: var(--muted, #6b7280); }
.sen-legend { margin-left: 8px; font-size: 11.5px; font-weight: 600; color: var(--muted, #9AA2B1); }
.sen-ok { color: #0E7C5A; }
.sen-bad { color: #D93025; }
.sen-wait { color: var(--muted, #9AA2B1); font-weight: 600; }
.sen-val { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.sen-val.is-ok { background: rgba(14,124,90,.1); color: #0E7C5A; }
.sen-val.is-bad { background: rgba(217,48,37,.08); color: #D93025; }
.sen-val.is-wait { background: var(--input-bg, rgba(20,32,64,.05)); color: #9AA2B1; }
.sen-fade-enter-active, .sen-fade-leave-active { transition: opacity .3s ease; }
.sen-fade-enter-from, .sen-fade-leave-to { opacity: 0; }
.sen-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 16px 0; text-align: center; }
.sen-paie-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 8px 0 12px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); margin-bottom: 6px; }
.sen-paie-head span { font-size: 12.5px; color: var(--muted, #6b7280); }
.sen-paie-head strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 15px; color: var(--text, #1A1D1F); }
.sen-paie-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.sen-paie-mois { font-size: 13px; font-weight: 600; color: var(--text, #23262E); }
.sen-paie-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 6px 10px; cursor: pointer; transition: background .15s ease; }
.sen-paie-btn:hover { background: rgba(var(--pr-rgb), .18); }
.sen-ue { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.sen-ue-code { font-weight: 700; color: var(--pr); font-size: 13px; }
.sen-ue-int { font-size: 12.5px; color: var(--muted, #5b6472); }
.sen-ue-h { font-size: 13px; font-weight: 600; color: var(--text, #23262E); }
.sen-ia { background: linear-gradient(150deg, #4F46E5, #7C3AED); color: #fff; border: none; }
.sen-ia-badge { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-weight: 800; font-size: 12px; }
.sen-ia-h2 { color: #fff; margin-top: 12px; }
.sen-ia-txt { font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.92); }
.sen-ia-cta { margin-top: 14px; background: #fff; color: #5B21B6; font-weight: 700; font-size: 13.5px; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; }
.sen-ia-msg { margin-top: 10px; font-size: 12.5px; color: rgba(255,255,255,.95); }
@media (max-width: 900px) { .sen-kpis { grid-template-columns: repeat(2, 1fr); } .sen-grid { grid-template-columns: 1fr; } }
</style>
