<template>
  <div class="sass">
    <div class="sass-header">
      <div class="sass-header-text">
        <h1>{{ t('sup.assiduite.title') }}</h1>
        <p>{{ t('sup.assiduite.subtitle') }}</p>
      </div>
      <select v-if="promoOptions.length > 1" v-model="promoFilter" class="sass-filter">
        <option value="">{{ t('sup.assiduite.allPromotions') }}</option>
        <option v-for="p in promoOptions" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <div class="sass-stats" v-if="filtered.length">
      <div class="sass-stat">
        <span class="sass-stat-v">{{ filtered.length }}</span>
        <span class="sass-stat-l">{{ t('sup.assiduite.studentsTracked') }}</span>
      </div>
      <div class="sass-stat">
        <span class="sass-stat-v">{{ avgPresence }}<span class="sass-stat-u">%</span></span>
        <span class="sass-stat-l">{{ t('sup.assiduite.avgPresence') }}</span>
      </div>
      <div class="sass-stat is-low">
        <span class="sass-stat-v">{{ lowCount }}</span>
        <span class="sass-stat-l">{{ t('sup.assiduite.lowAssiduity') }}</span>
      </div>
    </div>

    <div class="sass-panel">
      <div v-if="filtered.length === 0" class="sass-empty"><p>{{ t('sup.assiduite.empty') }}</p></div>
      <div v-else class="sass-list">
        <div v-for="s in filtered" :key="s.id" class="sass-item" :class="{ 'is-low': s.low }">
          <div class="sass-avatar" :class="s.sexe === 'F' ? 'av-f' : 'av-m'">{{ s.initials }}</div>
          <div class="sass-main">
            <div class="sass-top">
              <span class="sass-name">{{ s.nomComplet }}</span>
              <span class="sass-promo">{{ s.promoNom }}</span>
              <span v-if="s.low" class="sass-badge">{{ t('sup.assiduite.lowBadge') }}</span>
            </div>
            <div class="sass-bar"><div class="sass-bar-fill" :class="s.low ? 'is-low' : ''" :style="{ width: s.tauxPresence + '%' }"></div></div>
            <div class="sass-meta">
              <span class="sass-rate" :class="s.low ? 'is-low' : ''">{{ t('sup.assiduite.rate', { n: s.tauxPresence }) }}</span>
              <span class="sass-sep">·</span>
              <span>{{ t('sup.assiduite.absences', s.absent, { n: s.absent }) }}</span>
              <span class="sass-sep">·</span>
              <span>{{ t('sup.assiduite.retards', s.retard, { n: s.retard }) }}</span>
            </div>
          </div>
          <div class="sass-actions">
            <button class="sass-act is-present" type="button" @click="marquer(s.id, 'present')" :title="t('sup.assiduite.recordPresent')">✓</button>
            <button class="sass-act is-absent" type="button" @click="marquer(s.id, 'absent')" :title="t('sup.assiduite.recordAbsent')">✕</button>
          </div>
        </div>
      </div>
    </div>

    <p class="sass-foot">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      {{ t('sup.assiduite.footNote') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import { useSuperieurPresencesStore } from '../../stores/superieurPresences'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const presences = useSuperieurPresencesStore()

const promoFilter = ref('')
const LOW_PRESENCE = 85 // < 85 % de présence = assiduité préoccupante

onMounted(() => presences.loadPresences())

const promoById = computed(() => {
  const m = {}
  for (const p of store.promotions) m[p.id] = p
  return m
})
function initials(e) {
  return `${(e.prenom || '')[0] || ''}${(e.nom || '')[0] || ''}`.toUpperCase()
}

const rows = computed(() => {
  const out = []
  for (const e of store.etudiants) {
    if (e.statut && e.statut !== 'inscrit' && e.statut !== 'en_difficulte') continue
    const st = presences.statsFor(e.id)
    const promo = promoById.value[e.promotionId]
    const promoNom = promo ? `${promo.programmeNom} · ${promo.anneeNom}` : (e.programmeNom || '')
    const tauxPresence = Math.round(st.tauxPresence * 100)
    out.push({
      id: e.id, nomComplet: e.nomComplet || `${e.nom || ''} ${e.prenom || ''}`.trim(),
      sexe: e.sexe, initials: initials(e), promoNom,
      absent: st.absent, retard: st.retard, tauxPresence, low: tauxPresence < LOW_PRESENCE,
    })
  }
  return out.sort((a, b) => a.tauxPresence - b.tauxPresence)
})

const filtered = computed(() => promoFilter.value ? rows.value.filter((r) => r.promoNom === promoFilter.value) : rows.value)
const promoOptions = computed(() => [...new Set(rows.value.map((r) => r.promoNom))].sort())
const avgPresence = computed(() => {
  const list = filtered.value
  if (!list.length) return 0
  return Math.round(list.reduce((s, r) => s + r.tauxPresence, 0) / list.length)
})
const lowCount = computed(() => filtered.value.filter((r) => r.low).length)

function marquer(id, statut) { presences.enregistrer(id, statut) }
</script>

<style scoped>
.sass { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.sass-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.sass-header h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; margin: 0 0 4px; color: var(--tx, #1A1D1F); }
.sass-header p { font-size: 14px; color: var(--tx2, #5b6472); margin: 0; }
.sass-filter { padding: 8px 14px; border: 1px solid var(--border, rgba(20,32,64,.12)); border-radius: 10px; font-family: inherit; font-size: 13px; background: #fff; color: var(--tx, #1A1D1F); max-width: 100%; }

.sass-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sass-stat { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
.sass-stat-v { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); }
.sass-stat-u { font-size: 14px; color: var(--tx3, #9AA2B1); font-weight: 700; }
.sass-stat-l { font-size: 12px; color: var(--tx2, #5b6472); }
.sass-stat.is-low .sass-stat-v { color: #D93025; }

.sass-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 8px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.sass-list { display: flex; flex-direction: column; }
.sass-item { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); }
.sass-item:last-child { border-bottom: none; }
.sass-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr), #3b82f6); }
.av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.sass-main { flex: 1; min-width: 0; }
.sass-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sass-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--tx, #1A1D1F); }
.sass-promo { font-size: 12px; color: var(--tx3, #9AA2B1); background: var(--input-bg, rgba(20,32,64,.05)); padding: 1px 8px; border-radius: 20px; }
.sass-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; background: rgba(217,48,37,.10); color: #D93025; }
.sass-bar { height: 6px; border-radius: 100px; background: var(--input-bg, rgba(20,32,64,.08)); margin: 8px 0 6px; overflow: hidden; }
.sass-bar-fill { height: 100%; border-radius: 100px; background: #0E7C5A; }
.sass-bar-fill.is-low { background: #D93025; }
.sass-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 12.5px; color: var(--tx2, #5b6472); }
.sass-rate { font-weight: 700; color: #0E7C5A; }
.sass-rate.is-low { color: #D93025; }
.sass-sep { color: var(--tx3, #c3c8d0); }
.sass-actions { display: flex; gap: 6px; flex-shrink: 0; }
.sass-act { width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--border, rgba(20,32,64,.12)); background: #fff; font-size: 15px; font-weight: 800; cursor: pointer; line-height: 1; }
.sass-act.is-present { color: #0E7C5A; }
.sass-act.is-present:hover { background: rgba(14,124,90,.08); }
.sass-act.is-absent { color: #D93025; }
.sass-act.is-absent:hover { background: rgba(217,48,37,.08); }

.sass-empty { text-align: center; color: var(--tx3, #9AA2B1); padding: 28px 16px; font-size: 14px; }
.sass-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3, #9AA2B1); margin: 0; }

@media (max-width: 560px) {
  .sass-header h1 { font-size: 20px; }
  .sass-stat-v { font-size: 20px; }
}
</style>
