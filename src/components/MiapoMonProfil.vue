<template>
  <div class="monprofil">
    <!-- Compétences -->
    <div class="card">
      <div class="card-head"><Target :size="18" /><h3>{{ t('mia.mpCompetences') }}</h3></div>
      <template v-if="hasEval">
        <Radar6C :scores="enfant.comp6c || {}" />
        <div v-if="bilan" class="mp-bilan">
          <p v-if="bilan.synthese" class="mp-syn">{{ bilan.synthese }}</p>
          <div v-if="bilan.forces && bilan.forces.length" class="mp-block mp-forts">
            <strong><ThumbsUp :size="14" /> {{ t('mia.mpStrengths') }}</strong>
            <ul><li v-for="(f, i) in bilan.forces" :key="i">{{ f }}</li></ul>
          </div>
          <div v-if="bilan.axes && bilan.axes.length" class="mp-block mp-axes">
            <strong><TrendingUp :size="14" /> {{ t('mia.mpToImprove') }}</strong>
            <ul><li v-for="(a, i) in bilan.axes" :key="i">{{ a }}</li></ul>
          </div>
          <p v-if="bilan.conseil" class="mp-conseil"><Sparkles :size="14" /> {{ bilan.conseil }}</p>
        </div>
        <button class="btn btn-outline btn-sm mp-edit" @click="goto('competences')"><Sliders :size="15" /> <span>{{ t('mia.mpEditCompetences') }}</span></button>
      </template>
      <template v-else>
        <p class="muted">{{ t('mia.mpNoEval') }}</p>
        <button class="btn btn-primary btn-sm" @click="goto('competences')"><Sliders :size="15" /> <span>{{ t('mia.mpDoQuestionnaire') }}</span></button>
      </template>
    </div>

    <!-- Centres d'intérêt -->
    <div class="card">
      <div class="card-head"><Heart :size="18" /><h3>{{ t('mia.interTitle') }}</h3></div>
      <p v-if="interets" class="mp-text">{{ interets }}</p>
      <p v-else class="muted">{{ t('mia.mpNoInterests') }}</p>
      <p v-if="metiers" class="mp-metiers"><Compass :size="14" /> {{ metiers }}</p>
      <button class="btn btn-outline btn-sm mp-edit" @click="goto('interets')"><Pencil :size="15" /> <span>{{ t('mia.mpEditInterests') }}</span></button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Radar6C from './Radar6C.vue'
import { Target, Heart, Sliders, Sparkles, Compass, Pencil, ThumbsUp, TrendingUp } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t } = useI18n({ useScope: 'global' })

const hasEval = computed(() => !!(props.enfant && props.enfant.comp6c && Object.keys(props.enfant.comp6c).length >= 6))
const bilan = computed(() => (props.enfant && props.enfant.comp6cBilan) || null)
const interets = computed(() => (props.enfant && props.enfant.interets) || '')
const metiers = computed(() => (props.enfant && props.enfant.metiersVises) || '')

function goto(tab) {
  try { window.dispatchEvent(new CustomEvent('open-miapo-settings', { detail: { tab } })) } catch { /* silent */ }
}
</script>

<style scoped>
.monprofil { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 12px; }
.mp-bilan { margin: 14px 0 4px; display: flex; flex-direction: column; gap: 12px; }
.mp-syn { font-size: 14px; color: var(--tx, #1f2937); line-height: 1.5; margin: 0; }
.mp-block strong { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--tx2, #4b5563); }
.mp-block ul { margin: 6px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 3px; }
.mp-block li { font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.4; }
.mp-forts strong { color: #1B8A5A; }
.mp-axes strong { color: #B87A00; }
.mp-conseil { display: flex; align-items: flex-start; gap: 7px; margin: 0; font-size: 13px; color: var(--pr); font-weight: 600; line-height: 1.45; }
.mp-text { font-size: 13.5px; color: var(--tx, #1f2937); line-height: 1.55; white-space: pre-wrap; margin: 0 0 8px; }
.mp-metiers { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 13px; color: var(--tx2, #4b5563); }
.mp-edit { margin-top: 14px; }
</style>
