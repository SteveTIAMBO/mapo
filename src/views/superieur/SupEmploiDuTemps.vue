<template>
  <div class="st">
    <div class="st-intro">
      <h1 class="st-h1">Emploi du temps</h1>
      <p class="st-sub">Planning hebdomadaire par promotion — semestre en cours</p>
    </div>

    <!-- Sélecteur de promotion -->
    <div class="st-bar">
      <div class="st-filter">
        <span class="st-filter-label">Promotion</span>
        <select :value="store.selectedPromotionId" @change="store.setPromotion($event.target.value)">
          <option v-for="p in store.promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
      </div>
      <div class="st-context">
        <span class="st-context-sem">Semestre {{ store.selectedPromotion.semestreCourant }}</span>
        <span class="st-context-count">{{ store.emploiDuTemps.length }} séances / semaine</span>
      </div>
      <div class="st-legend">
        <span v-for="t in legend" :key="t.key" class="st-legend-item">
          <span class="st-legend-dot" :class="`t-${t.key}`"></span>{{ t.label }}
        </span>
      </div>
    </div>

    <!-- Grille -->
    <div class="st-grid-wrap">
      <table class="st-grid">
        <thead>
          <tr>
            <th class="st-corner"></th>
            <th v-for="jour in jours" :key="jour">{{ jour }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cr in creneaux" :key="cr.debut">
            <td class="st-creneau">
              <span class="st-creneau-h">{{ cr.debut }}</span>
              <span class="st-creneau-sep">—</span>
              <span class="st-creneau-h">{{ cr.fin }}</span>
            </td>
            <td v-for="jour in jours" :key="jour" class="st-cell">
              <div
                v-if="getSession(jour, cr.debut)"
                class="st-session"
                :class="`t-${getSession(jour, cr.debut).type}`"
              >
                <div class="st-session-code">{{ getSession(jour, cr.debut).ueCode }}</div>
                <div class="st-session-nom">{{ getSession(jour, cr.debut).ueIntitule }}</div>
                <div class="st-session-meta">
                  <span>{{ getSession(jour, cr.debut).intervenantNom }}</span>
                  <span class="st-session-salle">{{ getSession(jour, cr.debut).salle }}</span>
                </div>
              </div>
              <div v-else class="st-empty-cell"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="isDemoTenant" class="st-demo-note">Données de démonstration — planning fictif.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { UE_TYPES } from '../../stores/superieur'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'

const store = useSuperieurStore()
const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const creneaux = [
  { debut: '08:00', fin: '10:00' },
  { debut: '10:15', fin: '12:15' },
  { debut: '14:00', fin: '16:00' },
  { debut: '16:15', fin: '18:15' },
]

const legend = [
  UE_TYPES.fondamentale,
  UE_TYPES.methodologique,
  UE_TYPES.professionnelle,
  UE_TYPES.electif,
]

// Index des séances par jour + heure de début
const sessionMap = computed(() => {
  const map = {}
  for (const s of store.emploiDuTemps) {
    map[`${s.jour}__${s.debut}`] = s
  }
  return map
})
function getSession(jour, debut) {
  return sessionMap.value[`${jour}__${debut}`] || null
}
</script>

<style scoped>
.st-intro {
  margin-bottom: 16px;
}
.st-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.st-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}

/* Barre */
.st-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.st-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.st-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.st-filter select {
  height: 38px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  min-width: 260px;
}
.st-filter select:focus {
  border-color: var(--pr);
}
.st-context {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.st-context-sem {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--tx);
}
.st-context-count {
  font-size: 12.5px;
  color: var(--tx2);
}
.st-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-left: auto;
}
.st-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--tx2);
}
.st-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.st-legend-dot.t-fondamentale {
  background: var(--pr);
}
.st-legend-dot.t-methodologique {
  background: var(--success);
}
.st-legend-dot.t-professionnelle {
  background: var(--gold);
}
.st-legend-dot.t-electif {
  background: #6366F1;
}

/* Grille */
.st-grid-wrap {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 4px;
  overflow-x: auto;
}
.st-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 6px;
  min-width: 760px;
}
.st-grid thead th {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx2);
  padding: 8px;
  text-align: center;
}
.st-corner {
  width: 92px;
}
.st-creneau {
  width: 92px;
  text-align: center;
  vertical-align: middle;
  background: var(--input-bg);
  border-radius: 9px;
  padding: 8px 4px;
}
.st-creneau-h {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx);
}
.st-creneau-sep {
  display: block;
  font-size: 10px;
  color: var(--tx3);
  line-height: 1;
}
.st-cell {
  vertical-align: top;
  width: 18%;
}
.st-empty-cell {
  height: 92px;
  background: var(--input-bg);
  border-radius: 9px;
  opacity: 0.5;
}
.st-session {
  min-height: 92px;
  box-sizing: border-box;
  padding: 9px 11px;
  border-radius: 9px;
}
.st-session.t-fondamentale {
  background: var(--pr-light);
}
.st-session.t-methodologique {
  background: rgba(27, 138, 90, 0.09);
}
.st-session.t-professionnelle {
  background: rgba(184, 137, 42, 0.1);
}
.st-session.t-electif {
  background: rgba(99, 102, 241, 0.09);
}
.st-session-code {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--tx3);
}
.st-session-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx);
  margin: 2px 0 6px;
  line-height: 1.3;
}
.st-session-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;
  color: var(--tx2);
}
.st-session-salle {
  color: var(--tx3);
  font-weight: 500;
}

.st-demo-note {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--tx3);
}

@media (max-width: 680px) {
  .st-legend {
    margin-left: 0;
    width: 100%;
  }
}
</style>
