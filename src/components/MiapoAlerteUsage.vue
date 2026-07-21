<template>
  <transition name="slide">
    <div v-if="visible" class="alerte" :class="niveauClass" role="status">
      <AlertTriangle :size="17" class="ico" />
      <span class="txt">{{ message }}</span>
      <button type="button" class="cta" @click="goAbo">{{ t('mia.alertCta') }}</button>
      <button type="button" class="close" :aria-label="t('mia.close')" @click="fermer"><X :size="16" /></button>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAbonnementStore } from '../stores/abonnement'
import { AlertTriangle, X } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const abo = useAbonnementStore()
const KEY = 'mapo_alerte_usage'
const dismissed = ref(0)

// Semaine ISO (aaaaWW) — la jauge se recharge le lundi, on réinitialise les
// fermetures d'alerte à chaque nouvelle semaine.
function weekId() {
  const d = new Date()
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const wk = 1 + Math.round(((d - first) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7)
  return d.getUTCFullYear() * 100 + wk
}

// Palier atteint : 100 / 90 / 50 / 0. On réaffiche à chaque palier franchi.
const niveau = computed(() => abo.pourcentage >= 100 ? 100 : abo.pourcentage >= 90 ? 90 : abo.pourcentage >= 50 ? 50 : 0)
const visible = computed(() => niveau.value > 0 && niveau.value > dismissed.value)
const niveauClass = computed(() => niveau.value >= 100 ? 'is-full' : niveau.value >= 90 ? 'is-high' : 'is-mid')
const message = computed(() => niveau.value >= 100 ? t('mia.alert100') : niveau.value >= 90 ? t('mia.alert90') : t('mia.alert50'))

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    dismissed.value = (s && s.week === weekId()) ? (s.dismissed || 0) : 0
  } catch { dismissed.value = 0 }
}
function fermer() {
  dismissed.value = niveau.value
  try { localStorage.setItem(KEY, JSON.stringify({ week: weekId(), dismissed: dismissed.value })) } catch { /* quota */ }
}
function goAbo() { window.dispatchEvent(new CustomEvent('open-miapo-settings', { detail: { tab: 'abonnement' } })) }

onMounted(() => { abo.load(); load() })
// Recharge (l'usage repasse sous le palier fermé) → on ré-autorise l'alerte.
watch(niveau, (n) => { if (n < dismissed.value) dismissed.value = 0 })
</script>

<style scoped>
.alerte { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 12px; margin-bottom: 14px; font-size: 13.5px; font-weight: 500; }
.alerte.is-mid { background: rgba(var(--pr-rgb), .10); color: var(--tx); }
.alerte.is-high { background: rgba(232, 163, 23, .16); color: #8a5a00; }
.alerte.is-full { background: rgba(217, 48, 37, .12); color: #b3261e; }
.ico { flex-shrink: 0; }
.txt { flex: 1; min-width: 0; }
.cta { flex-shrink: 0; border: none; background: var(--pr); color: #fff; font-family: inherit; font-size: 12.5px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.alerte.is-full .cta { background: #b3261e; }
.alerte.is-high .cta { background: #8a5a00; }
.close { flex-shrink: 0; border: none; background: none; color: inherit; opacity: .6; cursor: pointer; padding: 2px; display: flex; }
.close:hover { opacity: 1; }
.slide-enter-active, .slide-leave-active { transition: opacity .2s ease, transform .2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
