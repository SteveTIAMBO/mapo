<template>
  <div class="sp">
    <div class="sp-intro">
      <h1 class="sp-h1">Paiements & relances</h1>
      <p class="sp-sub">
        Registre des encaissements et pilotage des relances. Niveau 1 à J+15, niveau 2 à J+30,
        niveau 3 à J+45 (procédure contentieuse).
      </p>
    </div>

    <!-- KPIs -->
    <div class="sp-kpis">
      <div class="sp-kpi">
        <div class="sp-kpi-num">{{ store.paiements.length }}</div>
        <div class="sp-kpi-lab">Paiements enregistrés</div>
      </div>
      <div class="sp-kpi">
        <div class="sp-kpi-num">{{ fmtMontant(totalPaiements) }}</div>
        <div class="sp-kpi-lab">Total encaissé</div>
      </div>
      <div class="sp-kpi" :class="{ 'is-alert': store.relancesAFaire.length > 0 }">
        <div class="sp-kpi-num">{{ store.relancesAFaire.length }}</div>
        <div class="sp-kpi-lab">Relances à envoyer</div>
      </div>
      <div class="sp-kpi">
        <div class="sp-kpi-num">{{ store.relances.length }}</div>
        <div class="sp-kpi-lab">Relances envoyées</div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="sp-tabs">
      <button class="sp-tab" :class="{ active: tab === 'paiements' }" @click="tab = 'paiements'">
        Registre des paiements
      </button>
      <button class="sp-tab" :class="{ active: tab === 'relances' }" @click="tab = 'relances'">
        Relances
        <span v-if="store.relancesAFaire.length > 0" class="sp-tab-badge">
          {{ store.relancesAFaire.length }}
        </span>
      </button>
    </div>

    <!-- Registre des paiements -->
    <section v-if="tab === 'paiements'" class="sp-card">
      <div class="sp-filters">
        <input
          v-model="filtres.search"
          @input="setF('search', filtres.search)"
          type="text"
          placeholder="Rechercher étudiant ou référence…"
          class="sp-input"
        />
        <select v-model="filtres.methode" @change="setF('methode', filtres.methode)" class="sp-select">
          <option value="">Toutes les méthodes</option>
          <option v-for="m in methodes" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
        <input type="date" v-model="filtres.dateDebut" @change="setF('dateDebut', filtres.dateDebut)" class="sp-input" />
        <input type="date" v-model="filtres.dateFin" @change="setF('dateFin', filtres.dateFin)" class="sp-input" />
      </div>

      <div class="sp-table-wrap">
        <table class="sp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Étudiant</th>
              <th>Référence</th>
              <th>Méthode</th>
              <th class="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in store.filteredPaiements" :key="item.paiement.id">
              <td>{{ fmtDate(item.paiement.date) }}</td>
              <td>
                <div class="sp-etu-nom">{{ item.etudiant?.nomComplet || '—' }}</div>
                <div class="sp-etu-mat">{{ item.etudiant?.matricule }}</div>
              </td>
              <td class="ref">{{ item.paiement.reference }}</td>
              <td>
                <span class="sp-meth">{{ methodeLabel(item.paiement.methode) }}</span>
              </td>
              <td class="num"><strong>{{ fmtMontant(item.paiement.montant) }}</strong></td>
            </tr>
            <tr v-if="store.filteredPaiements.length === 0">
              <td colspan="5" class="sp-empty">Aucun paiement ne correspond.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Relances -->
    <section v-if="tab === 'relances'" class="sp-card">
      <div v-if="store.relancesAFaire.length === 0" class="sp-empty-state">
        <div class="sp-empty-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3>Aucune relance en attente</h3>
        <p>Toutes les échéances en retard ont déjà reçu la relance attendue. Bon travail.</p>
      </div>

      <div v-else>
        <p class="sp-relance-intro">
          {{ store.relancesAFaire.length }} échéances en retard nécessitent une relance.
          Cliquez sur « Envoyer » pour générer la communication.
        </p>
        <div class="sp-relance-list">
          <div v-for="r in store.relancesAFaire" :key="r.echeance.id" class="sp-relance">
            <div class="sp-relance-info">
              <div class="sp-relance-name">{{ r.etudiant?.nomComplet || '—' }}</div>
              <div class="sp-relance-sub">
                Échéance {{ fmtDate(r.echeance.dateEcheance) }} —
                <strong>{{ fmtMontant(r.echeance.montantDu - r.echeance.montantPaye) }}</strong> restant ·
                <span class="sp-relance-days">{{ r.joursRetard }} jours de retard</span>
              </div>
            </div>
            <div class="sp-relance-action">
              <span class="sp-niveau" :class="`niv-${r.prochainNiveau}`">Niveau {{ r.prochainNiveau }}</span>
              <button class="sp-btn-primary" type="button" @click="envoyer(r)">
                Envoyer
              </button>
            </div>
          </div>
        </div>

        <!-- Historique des relances -->
        <h3 class="sp-h3">Historique récent</h3>
        <table class="sp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Étudiant</th>
              <th>Niveau</th>
              <th>Canal</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rel in historiqueRelances" :key="rel.id">
              <td>{{ fmtDate(rel.date) }}</td>
              <td>{{ rel.etudiantNom || '—' }}</td>
              <td><span class="sp-niveau" :class="`niv-${rel.niveau}`">N{{ rel.niveau }}</span></td>
              <td>{{ rel.canal }}</td>
              <td>
                <span class="sp-statut" :class="rel.envoyee ? 'ok' : 'ko'">
                  {{ rel.envoyee ? 'Envoyée' : 'En attente' }}
                </span>
              </td>
            </tr>
            <tr v-if="historiqueRelances.length === 0">
              <td colspan="5" class="sp-empty">Aucun historique.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore, fmtMontant, fmtDate, METHODES_PAIEMENT } from '../../stores/finance'

const store = useFinanceStore()
const methodes = METHODES_PAIEMENT
const tab = ref('paiements')

const filtres = ref({ ...store.paiementsFilters })
function setF(k, v) { store.setPaiementFilter(k, v) }
watch(filtres, (v) => {
  for (const k of Object.keys(v)) store.setPaiementFilter(k, v[k])
}, { deep: true })

const totalPaiements = computed(() => store.paiements.reduce((s, p) => s + p.montant, 0))

function envoyer(r) {
  store.envoyerRelance(r.echeance.id, r.prochainNiveau)
}

function methodeLabel(k) { return METHODES_PAIEMENT.find((m) => m.key === k)?.label || k }

// Historique enrichi avec nom étudiant
const historiqueRelances = computed(() => {
  // Snapshot des étudiants pour récupérer le nom
  let etuMap = {}
  try {
    const raw = localStorage.getItem('sup_etudiants_v1')
    if (raw) {
      const arr = JSON.parse(raw)
      etuMap = Object.fromEntries(arr.map((e) => [e.id, e.nomComplet]))
    }
  } catch (e) { /* silent */ }
  return [...store.relances]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map((r) => ({ ...r, etudiantNom: etuMap[r.etudiantId] }))
})
</script>

<style scoped>
.sp { display: flex; flex-direction: column; gap: 22px; }
.sp-intro { padding: 8px 0; }
.sp-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sp-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }
.sp-h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  margin: 24px 0 12px;
}

.sp-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.sp-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  padding: 13px 16px;
  text-align: center;
}
.sp-kpi.is-alert { border-color: rgba(178, 59, 59, 0.35); background: rgba(178, 59, 59, 0.04); }
.sp-kpi-num {
  font-family: 'Poppins', sans-serif;
  font-size: 22px; font-weight: 800; color: #1A1D1F;
}
.sp-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sp-tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid #ECECE8;
  padding-bottom: 0;
}
.sp-tab {
  background: transparent; border: none; cursor: pointer;
  padding: 10px 18px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 600; color: #6F767E;
  border-bottom: 2px solid transparent;
  display: inline-flex; align-items: center; gap: 8px;
}
.sp-tab:hover { color: #1A1D1F; }
.sp-tab.active { color: var(--pr); border-bottom-color: var(--pr); font-weight: 700; }
.sp-tab-badge {
  background: #B23B3B; color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 1px 7px;
  border-radius: 100px;
}

.sp-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 18px 20px;
}
.sp-filters {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 14px;
}
.sp-input, .sp-select {
  padding: 9px 12px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13px; font-family: inherit; color: #1A1D1F;
  background: #fff;
}
.sp-input { flex: 1; min-width: 200px; }
.sp-input[type="date"] { flex: 0 0 auto; min-width: 140px; }
.sp-input:focus, .sp-select:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

.sp-table-wrap { overflow-x: auto; }
.sp-table { width: 100%; border-collapse: collapse; }
.sp-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
}
.sp-table th.num, .sp-table td.num { text-align: right; }
.sp-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px; color: #1A1D1F;
}
.sp-table td.ref { color: #6F767E; font-family: monospace; font-size: 12px; }
.sp-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }
.sp-etu-nom { font-family: 'Poppins', sans-serif; font-weight: 700; }
.sp-etu-mat { font-size: 11.5px; color: #6F767E; margin-top: 2px; }

.sp-meth {
  background: rgba(var(--pr-rgb), 0.08);
  color: var(--pr);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
}

.sp-relance-intro {
  font-size: 13px; color: #6F767E; margin: 0 0 14px;
}
.sp-relance-list { display: flex; flex-direction: column; gap: 8px; }
.sp-relance {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(178, 59, 59, 0.04);
  border: 1px solid rgba(178, 59, 59, 0.18);
  border-radius: 10px;
}
.sp-relance-info { flex: 1; min-width: 0; }
.sp-relance-name {
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700; color: #1A1D1F;
}
.sp-relance-sub { font-size: 12px; color: #6F767E; margin-top: 3px; }
.sp-relance-sub strong { color: #B23B3B; }
.sp-relance-days { color: #B23B3B; font-weight: 600; }
.sp-relance-action {
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}

.sp-niveau {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
}
.sp-niveau.niv-1 { background: rgba(184, 137, 42, 0.15); color: #B07308; }
.sp-niveau.niv-2 { background: rgba(217, 84, 84, 0.18); color: #B23B3B; }
.sp-niveau.niv-3 { background: #B23B3B; color: #fff; }

.sp-statut {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
}
.sp-statut.ok { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sp-statut.ko { background: rgba(149, 149, 149, 0.16); color: #6F767E; }

.sp-btn-primary {
  background: var(--pr); color: #fff;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
}
.sp-btn-primary:hover { background: #11498F; }

.sp-empty-state {
  text-align: center;
  padding: 40px 20px;
}
.sp-empty-icon {
  width: 64px; height: 64px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: rgba(46, 139, 87, 0.1);
  color: #2E8B57;
  display: flex; align-items: center; justify-content: center;
}
.sp-empty-state h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 700; color: #1A1D1F; margin: 0 0 6px;
}
.sp-empty-state p { font-size: 13px; color: #6F767E; margin: 0; }

@media (max-width: 700px) {
  .sp-h1 { font-size: 22px; }
  .sp-card { padding: 14px 14px; }
  .sp-filters { flex-direction: column; gap: 8px; }
  .sp-filters input, .sp-filters select { width: 100%; min-width: 0; }
  .sp-table th, .sp-table td { padding: 10px 10px; font-size: 12.5px; }
  .sp-table-wrap { overflow-x: auto; }
  .sp-modal { padding: 0; align-items: flex-end; }
  .sp-modal-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
  }
}
</style>
