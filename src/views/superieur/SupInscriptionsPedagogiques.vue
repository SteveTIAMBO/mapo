<template>
  <div class="sip">
    <div class="sip-intro">
      <h1 class="sip-h1">Inscriptions pédagogiques</h1>
      <p class="sip-sub">
        Le responsable de formation pose les UE obligatoires ; chaque étudiant choisit ses électives dans ce cadre. Suivi pour le semestre en cours.
      </p>
    </div>

    <!-- KPIs -->
    <div class="sip-kpis">
      <div class="sip-kpi">
        <div class="sip-kpi-label">Inscriptions</div>
        <div class="sip-kpi-value">{{ s.total }}</div>
        <div class="sip-kpi-foot">étudiants concernés</div>
      </div>
      <div class="sip-kpi">
        <div class="sip-kpi-label">Validées par scolarité</div>
        <div class="sip-kpi-value">{{ s.validee }}</div>
        <div class="sip-kpi-foot is-ok">{{ pct(s.validee) }}%</div>
      </div>
      <div class="sip-kpi">
        <div class="sip-kpi-label">Complètes — à valider</div>
        <div class="sip-kpi-value">{{ s.complete }}</div>
        <div class="sip-kpi-foot">{{ pct(s.complete) }}%</div>
      </div>
      <div class="sip-kpi">
        <div class="sip-kpi-label">Incomplètes</div>
        <div class="sip-kpi-value">{{ s.incomplete }}</div>
        <div class="sip-kpi-foot" :class="s.incomplete > 0 ? 'is-warn' : 'is-ok'">
          {{ pct(s.incomplete) }}% — électifs manquants
        </div>
      </div>
    </div>

    <div class="sip-grid">
      <!-- Liste filtrable -->
      <section class="sip-main">
        <div class="sip-filters">
          <div class="sip-filter">
            <span class="sip-filter-label">Promotion</span>
            <select :value="store.inscriptionsFilters.promotionId" @change="store.setInscriptionFilter('promotionId', $event.target.value)">
              <option value="">Toutes les promotions</option>
              <option v-for="p in store.promotions" :key="p.id" :value="p.id">
                {{ p.programmeNom }} — {{ p.anneeNom }}
              </option>
            </select>
          </div>
          <div class="sip-filter">
            <span class="sip-filter-label">Statut</span>
            <select :value="store.inscriptionsFilters.statut" @change="store.setInscriptionFilter('statut', $event.target.value)">
              <option value="">Tous les statuts</option>
              <option value="validee">Validée par scolarité</option>
              <option value="complete">Complète — à valider</option>
              <option value="incomplete">Incomplète</option>
            </select>
          </div>
          <div class="sip-filter sip-filter-search">
            <span class="sip-filter-label">Recherche</span>
            <input
              type="text"
              :value="store.inscriptionsFilters.search"
              @input="store.setInscriptionFilter('search', $event.target.value)"
              placeholder="Nom ou matricule…"
            />
          </div>
          <button v-if="hasFilters" class="sip-reset" type="button" @click="store.resetInscriptionFilters()">
            Réinitialiser
          </button>
          <span class="sip-count">{{ store.inscriptionsList.length }} étudiant{{ store.inscriptionsList.length > 1 ? 's' : '' }}</span>
        </div>

        <div class="sip-table-wrap">
          <table class="sip-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Promotion</th>
                <th class="num">UE choisies</th>
                <th class="num">Électives</th>
                <th class="num">crédits</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in store.inscriptionsList" :key="row.etudiant.id" class="sip-row" @click="selected = row">
                <td>
                  <div class="sip-mat">{{ row.etudiant.matricule }}</div>
                  <div class="sip-name">{{ row.etudiant.nomComplet }}</div>
                </td>
                <td>
                  <span class="sip-niveau" :class="`n-${row.etudiant.niveau.toLowerCase()}`">{{ row.etudiant.niveau }}</span>
                  {{ row.etudiant.anneeNom }}
                </td>
                <td class="num">{{ row.inscription.ueChoisies.length }}</td>
                <td class="num">
                  {{ row.inscription.ueElectivesChoisies.length }} / {{ row.inscription.ueElectivesDispo.length }}
                </td>
                <td class="num">
                  <span :class="row.inscription.ectsChoisis < row.inscription.ectsRequis ? 'sip-warn-text' : ''">
                    {{ row.inscription.ectsChoisis }}/{{ row.inscription.ectsRequis }}
                  </span>
                </td>
                <td>
                  <span class="sip-pill" :class="`st-${row.inscription.statut}`">
                    {{ statutLabel(row.inscription.statut) }}
                  </span>
                </td>
              </tr>
              <tr v-if="store.inscriptionsList.length === 0">
                <td colspan="6" class="sip-empty">Aucune inscription ne correspond aux filtres.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Popularité des électifs -->
      <aside class="sip-side">
        <div class="sip-card">
          <h2 class="sip-h2">Popularité des cours électifs</h2>
          <p class="sip-card-hint">Nombre d'étudiants ayant choisi chaque électif.</p>
          <ul class="sip-elec-list">
            <li v-for="e in topElectifs" :key="e.id" class="sip-elec">
              <div class="sip-elec-head">
                <span class="sip-elec-code">{{ e.code }}</span>
                <span class="sip-elec-nb">{{ e.nbInscrits }}</span>
              </div>
              <div class="sip-elec-nom">{{ e.intitule }}</div>
              <div class="sip-elec-bar">
                <div class="sip-elec-fill" :style="{ width: barWidth(e.nbInscrits) + '%' }"></div>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Modale détail -->
    <transition name="sip-fade">
      <div v-if="selected" class="sip-modal-overlay" @click.self="selected = null">
        <div class="sip-modal">
          <div class="sip-modal-head">
            <div>
              <div class="sip-mat">{{ selected.etudiant.matricule }}</div>
              <h3 class="sip-modal-title">{{ selected.etudiant.nomComplet }}</h3>
              <p class="sip-modal-loc">
                {{ selected.etudiant.programmeNom }} · {{ selected.etudiant.anneeNom }} ·
                Semestre {{ selected.inscription.semestre }}
              </p>
            </div>
            <button class="sip-modal-close" type="button" @click="selected = null">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="sip-modal-section">
            <div class="sip-section-label">UE choisies ({{ selected.inscription.ueChoisies.length }})</div>
            <ul class="sip-ue-list">
              <li v-for="u in ueChoisiesDetail" :key="u.id" class="sip-ue">
                <span class="sip-ue-code">{{ u.code }}</span>
                <span class="sip-ue-nom">{{ u.intitule }}</span>
                <span class="sip-ue-tags">
                  <span class="sip-tag" :class="`t-${u.type}`">{{ typeLabel(u.type) }}</span>
                  <span class="sip-ue-ects">{{ u.ects }} crédits</span>
                </span>
              </li>
            </ul>
          </div>

          <div v-if="ueElectivesManquantes.length > 0" class="sip-modal-section">
            <div class="sip-section-label is-warn">Électives à choisir ({{ ueElectivesManquantes.length }})</div>
            <ul class="sip-ue-list">
              <li v-for="u in ueElectivesManquantes" :key="u.id" class="sip-ue is-missing">
                <span class="sip-ue-code">{{ u.code }}</span>
                <span class="sip-ue-nom">{{ u.intitule }}</span>
                <span class="sip-ue-tags">
                  <span class="sip-tag t-electif">Électif</span>
                  <span class="sip-ue-ects">{{ u.ects }} crédits</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { UE_TYPES } from '../../stores/superieur'

const store = useSuperieurStore()
const selected = ref(null)

const s = computed(() => store.inscriptionsStats)
const topElectifs = computed(() => store.populariteElectifs.slice(0, 8))

const hasFilters = computed(() => {
  const f = store.inscriptionsFilters
  return !!(f.promotionId || f.statut || f.search)
})

const maxInscrits = computed(() => Math.max(...store.populariteElectifs.map((e) => e.nbInscrits), 1))
function barWidth(n) { return Math.round((n / maxInscrits.value) * 100) }

const ueChoisiesDetail = computed(() => {
  if (!selected.value) return []
  return selected.value.inscription.ueChoisies.map((id) => store.getUe(id)).filter(Boolean)
})
const ueElectivesManquantes = computed(() => {
  if (!selected.value) return []
  const choisies = new Set(selected.value.inscription.ueElectivesChoisies)
  return selected.value.inscription.ueElectivesDispo
    .filter((id) => !choisies.has(id))
    .map((id) => store.getUe(id))
    .filter(Boolean)
})

const pct = (n) => store.inscriptionsStats.total ? Math.round((n / store.inscriptionsStats.total) * 100) : 0
const statutLabel = (s) => ({ validee: 'Validée', complete: 'Complète', incomplete: 'Incomplète' }[s] || s)
const typeLabel = (t) => UE_TYPES[t]?.label || t
</script>

<style scoped>
.sip-intro { margin-bottom: 18px; }
.sip-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px; font-weight: 800; color: var(--tx); margin: 0;
}
.sip-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

/* KPIs */
.sip-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.sip-kpi {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px;
}
.sip-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.sip-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px; font-weight: 800; color: var(--tx);
  margin: 6px 0 4px; line-height: 1;
}
.sip-kpi-foot { font-size: 12px; color: var(--tx2); }
.sip-kpi-foot.is-ok { color: var(--success); }
.sip-kpi-foot.is-warn { color: var(--warn); }

/* Grid */
.sip-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; }
.sip-main { display: flex; flex-direction: column; gap: 14px; }

/* Filtres */
.sip-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
}
.sip-filter { display: flex; flex-direction: column; gap: 4px; }
.sip-filter-search { flex: 1; min-width: 200px; }
.sip-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--tx3);
}
.sip-filter select, .sip-filter input {
  height: 38px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sip-filter input { width: 100%; }
.sip-filter select:focus, .sip-filter input:focus { border-color: var(--pr); }
.sip-reset {
  height: 38px; padding: 0 14px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
}
.sip-reset:hover { border-color: var(--pr); color: var(--pr); }
.sip-count {
  margin-left: auto; align-self: center;
  font-family: 'Poppins', sans-serif; font-size: 13px;
  font-weight: 600; color: var(--pr);
}

/* Table */
.sip-table-wrap {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  overflow: hidden; max-height: 560px; overflow-y: auto;
}
.sip-table { width: 100%; border-collapse: collapse; }
.sip-table thead th {
  position: sticky; top: 0;
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; color: var(--tx2);
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap; z-index: 1;
}
.sip-table th.num { text-align: right; }
.sip-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.sip-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.sip-row { cursor: pointer; transition: background 0.12s ease; }
.sip-row:hover { background: var(--pr-light); }
.sip-mat {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
}
.sip-name { font-weight: 600; color: var(--tx); }
.sip-niveau {
  display: inline-block; padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700; margin-right: 6px;
}
.sip-niveau.n-licence { background: var(--pr-light); color: var(--pr); }
.sip-niveau.n-master { background: var(--gold-light); color: var(--gold); }
.sip-niveau.n-doctorat { background: rgba(124, 58, 237, 0.12); color: #6D28D9; }
.sip-warn-text { color: var(--warn); font-weight: 700; }

.sip-pill {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sip-pill.st-validee { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sip-pill.st-complete { background: var(--pr-light); color: var(--pr); }
.sip-pill.st-incomplete { background: rgba(232, 149, 10, 0.12); color: var(--warn); }

.sip-empty { padding: 26px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* Side */
.sip-card {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  padding: 18px 20px;
}
.sip-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 16px; font-weight: 700; color: var(--tx);
  margin: 0 0 4px;
}
.sip-card-hint { font-size: 12.5px; color: var(--tx3); margin: 0 0 14px; }

.sip-elec-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.sip-elec-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.sip-elec-code {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; color: var(--tx3);
}
.sip-elec-nb {
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 800; color: var(--pr);
}
.sip-elec-nom {
  font-size: 13px; color: var(--tx); margin-top: 2px;
  font-weight: 600;
}
.sip-elec-bar {
  height: 6px; background: var(--input-bg);
  border-radius: 100px; overflow: hidden; margin-top: 6px;
}
.sip-elec-fill {
  height: 100%; background: var(--pr);
  border-radius: 100px;
}

/* Modal */
.sip-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.sip-modal {
  width: 100%; max-width: 600px;
  max-height: 88vh; overflow-y: auto;
  background: var(--card); border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.sip-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; padding: 22px 24px 16px;
  border-bottom: 1px solid var(--divider);
}
.sip-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 19px; font-weight: 800; color: var(--tx);
  margin: 4px 0 4px;
}
.sip-modal-loc { font-size: 13px; color: var(--tx2); margin: 0; }
.sip-modal-close {
  flex-shrink: 0; width: 34px; height: 34px;
  border-radius: 9px; background: var(--input-bg);
  border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.sip-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

.sip-modal-section { padding: 18px 24px; }
.sip-section-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--tx3); margin-bottom: 10px;
}
.sip-section-label.is-warn { color: var(--warn); }
.sip-ue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sip-ue {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--input-bg); border-radius: 9px;
  font-size: 13px;
}
.sip-ue.is-missing { background: rgba(232, 149, 10, 0.07); }
.sip-ue-code {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700; color: var(--tx3);
  min-width: 70px;
}
.sip-ue-nom { flex: 1; color: var(--tx); font-weight: 500; }
.sip-ue-tags { display: flex; align-items: center; gap: 7px; }
.sip-ue-ects {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700; color: var(--pr);
}
.sip-tag {
  padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10px; font-weight: 700;
}
.sip-tag.t-fondamentale { background: var(--pr-light); color: var(--pr); }
.sip-tag.t-methodologique { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sip-tag.t-professionnelle { background: rgba(184, 137, 42, 0.12); color: var(--gold); }
.sip-tag.t-electif { background: rgba(99, 102, 241, 0.12); color: #6366F1; }

.sip-fade-enter-active, .sip-fade-leave-active { transition: opacity 0.2s ease; }
.sip-fade-enter-from, .sip-fade-leave-to { opacity: 0; }

@media (max-width: 1100px) {
  .sip-kpis { grid-template-columns: repeat(2, 1fr); }
  .sip-grid { grid-template-columns: 1fr; }
}
</style>
