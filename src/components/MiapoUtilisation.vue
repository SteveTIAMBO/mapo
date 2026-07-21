<template>
  <div class="util">
    <!-- Jauge de tokens (usage de la semaine) -->
    <div class="card abo-current">
      <div class="ac-head">
        <div>
          <span class="ac-label">{{ t('mia.aboCurrentPlan') }}</span>
          <h3>{{ abo.offre.nom }}</h3>
        </div>
        <div class="ac-credits" :class="{ warn: abo.pourcentage >= 90 }">
          <strong>{{ restePct }}%</strong>
          <span>{{ t('mia.aboPctLeft') }}</span>
        </div>
      </div>
      <div class="ac-bar"><div class="ac-bar-fill" :class="jaugeClass" :style="{ width: abo.pourcentage + '%' }"></div></div>
      <p class="muted xsmall">{{ t('mia.aboWeeklyReset') }}</p>
      <p v-if="abo.renewAt" class="muted small">{{ t('mia.aboRenew', { date: dateFr(abo.renewAt) }) }}</p>
      <p v-if="abo.épuisé" class="err-line">{{ t('mia.aboExhausted') }}</p>
      <button class="btn btn-primary btn-sm manage" @click="openAbo">
        <CreditCard :size="15" /> <span>{{ t('mia.utilManage') }}</span>
      </button>
    </div>

    <!-- Cycle mensuel (facturation) : progression jusqu'au renouvellement -->
    <div v-if="abo.renewAt" class="card cycle-card">
      <div class="ac-head">
        <div><span class="ac-label">{{ t('mia.cycleMonth') }}</span></div>
        <div class="ac-credits"><strong>{{ joursRestants }}</strong><span>{{ t('mia.cycleDaysLeft') }}</span></div>
      </div>
      <div class="ac-bar"><div class="ac-bar-fill is-ok" :style="{ width: cyclePct + '%' }"></div></div>
      <p class="muted small">{{ t('mia.aboRenew', { date: dateFr(abo.renewAt) }) }}</p>
    </div>

    <p class="muted small hint">{{ t('mia.utilHint') }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAbonnementStore } from '../stores/abonnement'
import { CreditCard } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const abo = useAbonnementStore()

const restePct = computed(() => Math.max(0, 100 - abo.pourcentage))
const jaugeClass = computed(() => abo.pourcentage >= 90 ? 'is-danger' : abo.pourcentage >= 70 ? 'is-warn' : 'is-ok')
// Cycle mensuel : jours restants + progression jusqu'au renouvellement (tierExpiry).
const cycleJours = computed(() => abo.offre?.cycleJours || 30)
const joursRestants = computed(() => { if (!abo.renewAt) return 0; const ms = new Date(abo.renewAt) - new Date(); return Math.max(0, Math.ceil(ms / 86400000)) })
const cyclePct = computed(() => Math.min(100, Math.max(0, Math.round((1 - joursRestants.value / cycleJours.value) * 100))))

onMounted(() => abo.load())
function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }
// Ouvre Paramètres → Abonnement (upgrade / achat de crédits).
function openAbo() { window.dispatchEvent(new CustomEvent('open-miapo-settings', { detail: { tab: 'abonnement' } })) }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.ac-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ac-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--tx3); }
.ac-head h3 { margin: 2px 0 0; font-size: 18px; color: var(--tx); }
.ac-credits { text-align: right; color: var(--pr); }
.ac-credits strong { font-size: 22px; display: block; }
.ac-credits span { font-size: 11px; color: var(--tx3); }
.ac-credits.warn { color: #D93025; }
.ac-bar { height: 8px; border-radius: 6px; background: rgba(var(--pr-rgb),.10); overflow: hidden; margin: 12px 0 4px; }
.ac-bar-fill { height: 100%; border-radius: 6px; transition: width .4s ease; }
.ac-bar-fill.is-ok { background: var(--pr); }
.ac-bar-fill.is-warn { background: #E8A317; }
.ac-bar-fill.is-danger { background: #D93025; }
.muted { color: var(--tx3); font-size: 14px; margin: 8px 0 0; }
.small { font-size: 12.5px; } .xsmall { font-size: 12px; }
.hint { margin-top: 14px; }
.cycle-card { margin-top: 16px; }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.manage { margin-top: 14px; }
</style>
