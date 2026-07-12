<template>
  <div class="gd">
    <div class="gd-intro">
      <div>
        <h1 class="gd-h1">Direction du groupe</h1>
        <p class="gd-sub">Vue consolidée · {{ campusData.length }} campus · année {{ ecole.anneeAcademique }}</p>
      </div>
      <span class="gd-who">{{ profileName }}</span>
    </div>

    <!-- KPIs agrégés (tous campus confondus) -->
    <div class="gd-kpis">
      <div v-for="k in kpis" :key="k.label" class="gd-kpi" :class="'tone-' + k.tone">
        <div class="gd-kpi-ic"><component :is="k.icon" :size="20" /></div>
        <div>
          <div class="gd-kpi-val">{{ k.value }}<span v-if="k.unit" class="gd-kpi-unit">{{ k.unit }}</span></div>
          <div class="gd-kpi-lab">{{ k.label }}</div>
        </div>
      </div>
    </div>

    <!-- Campus (drill-in) -->
    <div class="gd-campus-head">
      <h2 class="gd-h2">Vos campus</h2>
      <p class="gd-hint">Cliquez sur un campus pour accéder à sa gestion complète — vous y disposez d'un accès directeur.</p>
    </div>
    <div class="gd-grid">
      <button v-for="c in campusData" :key="c.id" type="button" class="gd-campus" @click="enter(c.id)">
        <div class="gd-campus-top">
          <div>
            <div class="gd-campus-ville">{{ c.ville }}<span v-if="c.siege" class="gd-siege">Siège</span></div>
            <div class="gd-campus-dir">{{ c.directeur }}</div>
          </div>
          <div class="gd-campus-arrow"><ArrowRight :size="18" /></div>
        </div>
        <div class="gd-campus-kpis">
          <div class="gd-cs"><strong>{{ fmt(c.effectif) }}</strong><span>étudiants</span></div>
          <div class="gd-cs"><strong>{{ c.moyenne }}</strong><span>moyenne /20</span></div>
          <div class="gd-cs"><strong>{{ c.recouvrement }}%</strong><span>recouvrement</span></div>
          <div class="gd-cs" :class="{ 'is-warn': c.enDifficulte > 0 }"><strong>{{ c.enDifficulte }}</strong><span>en difficulté</span></div>
        </div>
        <div class="gd-campus-cta">Ouvrir la gestion du campus <ArrowRight :size="14" /></div>
      </button>
    </div>

    <div v-if="isDemoTenant" class="gd-demo">Données de démonstration — établissement fictif.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { inject } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { useFinanceStore } from '../../stores/finance'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { Users, Building2, Award, Wallet, Presentation, ArrowRight } from 'lucide-vue-next'

const store = useSuperieurStore()
const fin = useFinanceStore()
const authSup = useSuperieurAuthStore()
const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

// Fournie par SuperieurView : ouvre un campus (accès directeur).
const enter = inject('supEnterCampus', () => {})

const ecole = store.ecole
const s = computed(() => store.stats)               // agrégé (campusScope null en vue groupe)
const finStats = computed(() => fin.stats || {})
const recParCampus = computed(() => fin.recouvrementParCampus || {})
const profileName = computed(() => authSup.profile?.displayName || 'Direction du groupe')

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')

const campusData = computed(() =>
  s.value.parCampus.map((c) => ({
    ...c,
    recouvrement: recParCampus.value[c.id]?.taux ?? 0,
  })),
)

const kpis = computed(() => [
  { label: 'Étudiants (groupe)', tone: 'blue', icon: Users, value: fmt(s.value.nbEtudiants) },
  { label: 'Campus', tone: 'violet', icon: Building2, value: campusData.value.length },
  { label: 'Moyenne groupe', tone: 'gold', icon: Award, value: s.value.moyenneGenerale, unit: '/20' },
  { label: 'Recouvrement', tone: 'green', icon: Wallet, value: (finStats.value.tauxRecouvrement ?? 0), unit: '%' },
  { label: 'Intervenants', tone: 'indigo', icon: Presentation, value: fmt(s.value.nbIntervenants) },
])
</script>

<style scoped>
.gd-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.gd-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx); margin: 0; }
.gd-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.gd-who { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), 0.1); border: 1px solid rgba(var(--pr-rgb), 0.2); border-radius: 100px; padding: 6px 14px; white-space: nowrap; }

.gd-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 26px; }
.gd-kpi { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--card-border); border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 15px 16px; }
.gd-kpi-ic { flex-shrink: 0; width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; color: var(--accent); background: var(--accent-bg); }
.gd-kpi-val { font-family: 'Poppins', sans-serif; font-size: 23px; font-weight: 800; color: var(--tx); line-height: 1; }
.gd-kpi-unit { font-size: 14px; font-weight: 700; color: var(--tx2); margin-left: 2px; }
.gd-kpi-lab { font-size: 12px; color: var(--tx2); margin-top: 4px; }
.tone-blue { --accent: #2563EB; --accent-bg: rgba(37, 99, 235, 0.1); }
.tone-violet { --accent: #7C3AED; --accent-bg: rgba(124, 58, 237, 0.1); }
.tone-gold { --accent: #B7791F; --accent-bg: rgba(183, 121, 31, 0.12); }
.tone-green { --accent: #128A5B; --accent-bg: rgba(18, 138, 91, 0.1); }
.tone-indigo { --accent: #4F46E5; --accent-bg: rgba(79, 70, 229, 0.1); }

.gd-campus-head { margin-bottom: 14px; }
.gd-h2 { font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 700; color: var(--tx); margin: 0; }
.gd-hint { font-size: 13px; color: var(--tx2); margin: 3px 0 0; }

.gd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.gd-campus { text-align: left; background: var(--card); border: 1px solid var(--card-border); border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 18px 20px; cursor: pointer; font-family: inherit; transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease; }
.gd-campus:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(20, 32, 64, 0.12); border-color: var(--pr); }
.gd-campus-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.gd-campus-ville { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 18px; color: var(--tx); display: flex; align-items: center; gap: 8px; }
.gd-siege { font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), 0.12); border-radius: 20px; padding: 2px 9px; }
.gd-campus-dir { font-size: 12.5px; color: var(--tx2); margin-top: 3px; }
.gd-campus-arrow { width: 34px; height: 34px; border-radius: 9px; background: rgba(var(--pr-rgb), 0.08); color: var(--pr); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gd-campus-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 14px 0; border-top: 1px solid var(--card-border); border-bottom: 1px solid var(--card-border); }
.gd-cs { display: flex; flex-direction: column; }
.gd-cs strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 18px; color: var(--tx); line-height: 1; }
.gd-cs span { font-size: 10.5px; color: var(--tx3); margin-top: 3px; }
.gd-cs.is-warn strong { color: var(--warn); }
.gd-campus-cta { display: flex; align-items: center; gap: 5px; margin-top: 14px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; color: var(--pr); }

.gd-demo { margin-top: 22px; text-align: center; font-size: 12px; color: var(--tx3); }

@media (max-width: 1100px) { .gd-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 680px) { .gd-kpis { grid-template-columns: repeat(2, 1fr); } .gd-campus-kpis { grid-template-columns: repeat(2, 1fr); } }
</style>
