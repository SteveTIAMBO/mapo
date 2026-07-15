<template>
  <div class="sco">
    <!-- Un seul module « Comptabilité » regroupant toute la finance en onglets -->
    <div class="sco-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="sco-tab"
        :class="{ active: activeTab === t.key }"
        type="button"
        @click="activeTab = t.key"
      >
        <span class="sco-tab-ico" v-html="t.icon"></span>
        {{ t.label }}
      </button>
    </div>

    <div class="sco-body">
      <keep-alive>
        <component :is="panels[activeTab]" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SupFinanceDashboard from './SupFinanceDashboard.vue'
import SupGrillesTarifaires from './SupGrillesTarifaires.vue'
import SupEcheanciers from './SupEcheanciers.vue'
import SupComptesEtudiants from './SupComptesEtudiants.vue'
import SupPaiements from './SupPaiements.vue'
import SupBourses from './SupBourses.vue'
import SupFinancements from './SupFinancements.vue'

const icoDash = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
const icoTarifs = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'
const icoEch = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
const icoComptes = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
const icoPay = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
const icoBourses = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
const icoFin = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'

const tabs = [
  { key: 'dash', label: 'Pilotage', icon: icoDash },
  { key: 'tarifs', label: 'Grilles tarifaires', icon: icoTarifs },
  { key: 'echeanciers', label: 'Échéanciers', icon: icoEch },
  { key: 'comptes', label: 'Comptes étudiants', icon: icoComptes },
  { key: 'paiements', label: 'Paiements & relances', icon: icoPay },
  { key: 'bourses', label: 'Bourses', icon: icoBourses },
  { key: 'financements', label: 'Financements tiers', icon: icoFin },
]

const panels = {
  dash: SupFinanceDashboard,
  tarifs: SupGrillesTarifaires,
  echeanciers: SupEcheanciers,
  comptes: SupComptesEtudiants,
  paiements: SupPaiements,
  bourses: SupBourses,
  financements: SupFinancements,
}

const activeTab = ref('dash')
</script>

<style scoped>
.sco { display: flex; flex-direction: column; gap: 16px; }
.sco-tabs {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--divider, rgba(20,32,64,.08));
}
.sco-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px;
  background: transparent; border: none;
  border-bottom: 2px solid transparent;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600; color: var(--tx2, #5b6472);
  cursor: pointer; transition: color .15s ease, border-color .15s ease;
  margin-bottom: -5px;
}
.sco-tab:hover { color: var(--pr); }
.sco-tab.active { color: var(--pr); border-bottom-color: var(--pr); }
.sco-tab-ico { display: inline-flex; }
.sco-body { min-height: 200px; }
</style>
