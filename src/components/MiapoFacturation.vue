<template>
  <div class="fact">
    <div class="card">
      <div class="card-head"><Receipt :size="18" /><h3>{{ t('mia.billTitle') }}</h3></div>
      <p class="muted">{{ t('mia.billHint') }}</p>

      <!-- Liste des factures -->
      <div v-if="factures.length" class="fact-list">
        <div v-for="f in factures" :key="f.id" class="fact-row">
          <div class="fr-info">
            <strong>{{ f.label }}</strong>
            <small>{{ dateFr(f.date) }} · {{ f.numero }}</small>
          </div>
          <div class="fr-amount">{{ fmtMontant(f.montant, f.devise) }}</div>
          <button class="btn btn-outline btn-sm" @click="voir(f)"><Download :size="14" /> <span>{{ t('mia.billDownload') }}</span></button>
        </div>
      </div>

      <!-- État vide -->
      <div v-else class="fact-empty">
        <Receipt :size="34" />
        <p>{{ t('mia.billEmpty') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fmtMontant } from '../utils/devise'
import { Receipt, Download } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const factures = ref([]) // rempli par le registre serveur (tâche Facturation)

onMounted(() => { /* fetchFactures() — branché à la tranche Facturation */ })
function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }
function voir() { /* génération du reçu/facture — tranche Facturation */ }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }
.fact-list { display: flex; flex-direction: column; }
.fact-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-top: 1px solid var(--bd, #eef0f6); }
.fact-row:first-child { border-top: none; }
.fr-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.fr-info strong { font-size: 14px; color: var(--tx); }
.fr-info small { font-size: 12px; color: var(--tx3); }
.fr-amount { font-size: 14px; font-weight: 700; color: var(--tx); }
.fact-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 10px; color: var(--tx3); text-align: center; }
.fact-empty svg { opacity: .5; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
</style>
