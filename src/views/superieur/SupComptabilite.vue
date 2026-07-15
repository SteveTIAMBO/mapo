<template>
  <div class="sco">
    <!-- Un seul module « Comptabilité » regroupant toute la finance en onglets,
         calqué sur la structure du module Facturation du Secondaire (frais →
         paiements → salaires → charges → synthèse → grille), + les onglets
         spécifiques au Supérieur (échéanciers, bourses, financements tiers). -->
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
import SupComptesEtudiants from './SupComptesEtudiants.vue'
import SupPaiements from './SupPaiements.vue'
import SupSalaires from './SupSalaires.vue'
import SupCharges from './SupCharges.vue'
import SupSynthese from './SupSynthese.vue'
import SupGrillesTarifaires from './SupGrillesTarifaires.vue'
import SupEcheanciers from './SupEcheanciers.vue'
import SupBourses from './SupBourses.vue'
import SupFinancements from './SupFinancements.vue'

// Icônes (inline SVG, cohérentes avec le reste de l'app)
const icoComptes = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
const icoPay = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
const icoSalaires = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
const icoCharges = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>'
const icoSynthese = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>'
const icoTarifs = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'
const icoEch = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
const icoBourses = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
const icoFin = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'

// Ordre : structure Secondaire d'abord, spécificités Supérieur ensuite.
const tabs = [
  { key: 'comptes', label: 'Frais étudiants', icon: icoComptes },
  { key: 'paiements', label: 'Paiements', icon: icoPay },
  { key: 'salaires', label: 'Salaires', icon: icoSalaires },
  { key: 'charges', label: 'Charges', icon: icoCharges },
  { key: 'synthese', label: 'Synthèse', icon: icoSynthese },
  { key: 'tarifs', label: 'Grille tarifaire', icon: icoTarifs },
  { key: 'echeanciers', label: 'Échéanciers', icon: icoEch },
  { key: 'bourses', label: 'Bourses', icon: icoBourses },
  { key: 'financements', label: 'Financements tiers', icon: icoFin },
]

const panels = {
  comptes: SupComptesEtudiants,
  paiements: SupPaiements,
  salaires: SupSalaires,
  charges: SupCharges,
  synthese: SupSynthese,
  tarifs: SupGrillesTarifaires,
  echeanciers: SupEcheanciers,
  bourses: SupBourses,
  financements: SupFinancements,
}

const activeTab = ref('comptes')
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

@media (max-width: 700px) {
  .sco-tabs { gap: 2px; overflow-x: auto; flex-wrap: nowrap; }
  .sco-tab { padding: 9px 11px; font-size: 12.5px; white-space: nowrap; }
}
</style>
