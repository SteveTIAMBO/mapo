<template>
  <div class="sdec">
    <div class="sdec-header">
      <div class="sdec-header-text">
        <h1>{{ t('sup.decrochage.title') }}</h1>
        <p>{{ t('sup.decrochage.subtitle') }}</p>
      </div>
      <select v-if="promoOptions.length > 1" v-model="promoFilter" class="sdec-filter">
        <option value="">{{ t('sup.decrochage.allPromotions') }}</option>
        <option v-for="p in promoOptions" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <!-- Insight MIAPO -->
    <div class="sdec-panel sdec-insight">
      <div class="sdec-insight-ico">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>
      </div>
      <div>
        <strong>{{ t('sup.decrochage.miapoFlags') }}</strong>
        <p>{{ insight }}</p>
      </div>
    </div>

    <!-- Répartition du risque -->
    <div class="sdec-stats" v-if="filteredStudents.length">
      <div class="sdec-stat">
        <span class="sdec-stat-v">{{ filteredStudents.length }}</span>
        <span class="sdec-stat-l">{{ t('sup.decrochage.studentsToTrack') }}</span>
      </div>
      <div class="sdec-stat is-high">
        <span class="sdec-stat-v">{{ countByLevel.eleve }}</span>
        <span class="sdec-stat-l">{{ t('sup.decrochage.highRisk') }}</span>
      </div>
      <div class="sdec-stat is-watch">
        <span class="sdec-stat-v">{{ countByLevel.moyen }}</span>
        <span class="sdec-stat-l">{{ t('sup.decrochage.toWatch') }}</span>
      </div>
    </div>

    <!-- Étudiants à risque -->
    <div class="sdec-panel">
      <div class="sdec-panel-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3>{{ t('sup.decrochage.atRiskStudents', { n: filteredStudents.length }) }}</h3>
      </div>

      <div v-if="filteredStudents.length === 0" class="sdec-empty">
        <p>{{ t('sup.decrochage.noSignal') }}</p>
      </div>

      <div v-else class="sdec-list">
        <div v-for="s in filteredStudents" :key="s.id" class="sdec-item">
          <div class="sdec-avatar" :class="s.sexe === 'F' ? 'av-f' : 'av-m'">{{ s.initials }}</div>
          <div class="sdec-item-main">
            <div class="sdec-item-top">
              <span class="sdec-name">{{ s.nomComplet }}</span>
              <span class="sdec-promo">{{ s.promoNom }}</span>
              <span class="sdec-badge" :class="'risk-' + s.niveau">{{ s.niveau === 'eleve' ? t('sup.decrochage.highRisk') : t('sup.decrochage.toWatch') }}</span>
            </div>
            <div class="sdec-factors">
              <span v-for="f in s.facteurs" :key="f.key" class="sdec-chip" :class="f.strong ? 'is-strong' : ''">
                <span class="sdec-chip-ico" v-html="f.icon"></span> {{ f.label }}
              </span>
            </div>
          </div>
          <div class="sdec-item-meta">
            <button class="sdec-act" type="button" @click="contacter(s)" :title="t('sup.decrochage.contactTitle')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              <span>{{ t('sup.decrochage.contact') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="sdec-foot">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      {{ t('sup.decrochage.footNote') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import { useSuperieurPresencesStore } from '../../stores/superieurPresences'
import { computeDecrochage } from '../../utils/supDecrochage'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const presences = useSuperieurPresencesStore()
const goTab = inject('supGoTab', () => {})

onMounted(() => presences.loadPresences())

const promoFilter = ref('')

// Icônes des facteurs (SVG inline avec width/height explicites — v-html).
const ICON_AVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>'
const ICON_CREDIT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
const ICON_ABS = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M15 15l-4 4M11 15l4 4"/></svg>'

const promoById = computed(() => {
  const m = {}
  for (const p of store.promotions) m[p.id] = p
  return m
})

// Convertit un facteur brut (util) en facteur d'affichage (icône + libellé i18n).
function displayFactor(f) {
  if (f.key === 'abs') return { key: 'abs', icon: ICON_ABS, strong: f.strong, label: t('sup.decrochage.factorAbs', { pct: f.pct, n: f.n }) }
  if (f.key === 'avg') return { key: 'avg', icon: ICON_AVG, strong: f.strong, label: t('sup.decrochage.factorAvg', { avg: f.avg.toFixed(1) }) }
  return { key: 'credit', icon: ICON_CREDIT, strong: f.strong, label: t('sup.decrochage.factorCredits', { n: f.n }) }
}

const students = computed(() =>
  computeDecrochage(store.etudiants, promoById.value, (id) => presences.statsFor(id))
    .map((r) => ({ ...r, facteurs: r.factors.map(displayFactor) }))
)

const filteredStudents = computed(() =>
  promoFilter.value ? students.value.filter((s) => s.promoNom === promoFilter.value) : students.value
)

const promoOptions = computed(() => [...new Set(students.value.map((s) => s.promoNom))].sort())

const countByLevel = computed(() => ({
  eleve: filteredStudents.value.filter((s) => s.niveau === 'eleve').length,
  moyen: filteredStudents.value.filter((s) => s.niveau === 'moyen').length,
}))

const insight = computed(() => {
  const n = filteredStudents.value.length
  if (n === 0) return t('sup.decrochage.insightNone')
  const eleve = countByLevel.value.eleve
  if (eleve > 0) {
    return n > 1 ? t('sup.decrochage.insightHighMany', { n, high: eleve }) : t('sup.decrochage.insightHighOne', { n, high: eleve })
  }
  return n > 1 ? t('sup.decrochage.insightWatchMany', { n }) : t('sup.decrochage.insightWatchOne', { n })
})

// Réutilise la messagerie de la direction pour joindre l'étudiant / la famille.
function contacter() {
  goTab('messagerie')
}
</script>

<style scoped>
.sdec { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.sdec-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.sdec-header h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; margin: 0 0 4px; color: var(--tx, #1A1D1F); }
.sdec-header p { font-size: 14px; color: var(--tx2, #5b6472); margin: 0; }
.sdec-filter { padding: 8px 14px; border: 1px solid var(--border, rgba(20,32,64,.12)); border-radius: 10px; font-family: inherit; font-size: 13px; background: #fff; color: var(--tx, #1A1D1F); max-width: 100%; }

.sdec-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.sdec-panel-head { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; color: var(--pr); }
.sdec-panel-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; margin: 0; color: var(--tx, #1A1D1F); }

.sdec-insight { display: flex; gap: 14px; align-items: flex-start; background: rgba(var(--pr-rgb),.05); border-color: rgba(var(--pr-rgb),.15); }
.sdec-insight-ico { width: 40px; height: 40px; border-radius: 11px; background: rgba(var(--pr-rgb),.12); color: var(--pr); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sdec-insight strong { color: var(--pr); font-family: 'Poppins', sans-serif; }
.sdec-insight p { margin: 4px 0 0; font-size: 14px; color: var(--tx, #23262E); line-height: 1.5; }

.sdec-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sdec-stat { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
.sdec-stat-v { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); }
.sdec-stat-l { font-size: 12px; color: var(--tx2, #5b6472); }
.sdec-stat.is-high .sdec-stat-v { color: #D93025; }
.sdec-stat.is-watch .sdec-stat-v { color: #B07308; }

.sdec-list { display: flex; flex-direction: column; }
.sdec-item { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); }
.sdec-item:last-child { border-bottom: none; }
.sdec-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr), #3b82f6); }
.av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.sdec-item-main { flex: 1; min-width: 0; }
.sdec-item-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sdec-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--tx, #1A1D1F); }
.sdec-promo { font-size: 12px; color: var(--tx3, #9AA2B1); background: var(--input-bg, rgba(20,32,64,.05)); padding: 1px 8px; border-radius: 20px; }
.sdec-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
.sdec-badge.risk-eleve { background: rgba(217,48,37,.10); color: #D93025; }
.sdec-badge.risk-moyen { background: rgba(184,122,0,.12); color: #B07308; }
.sdec-factors { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.sdec-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--tx2, #5b6472); background: var(--input-bg, rgba(20,32,64,.05)); padding: 3px 9px; border-radius: 20px; }
.sdec-chip-ico { display: inline-flex; }
.sdec-chip.is-strong { color: #B3261E; background: rgba(217,48,37,.07); }
.sdec-item-meta { text-align: right; flex-shrink: 0; }
.sdec-act { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--border, rgba(20,32,64,.12)); background: #fff; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--pr); cursor: pointer; }
.sdec-act:hover { background: rgba(var(--pr-rgb),.06); }

.sdec-empty { text-align: center; color: var(--tx3, #9AA2B1); padding: 28px 16px; font-size: 14px; }
.sdec-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3, #9AA2B1); margin: 0; }

@media (max-width: 560px) {
  .sdec-header h1 { font-size: 20px; }
  .sdec-stat-v { font-size: 20px; }
  .sdec-act span { display: none; }
}
</style>
