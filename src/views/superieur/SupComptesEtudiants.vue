<template>
  <div class="sc">
    <div class="sc-intro">
      <div>
        <h1 class="sc-h1">Comptes étudiants</h1>
        <p class="sc-sub">
          Vue d'ensemble des comptes financiers. Cliquez sur un étudiant pour voir son échéancier complet,
          ses paiements, ses bourses et ses financements.
        </p>
      </div>
    </div>

    <!-- KPIs ligne -->
    <div class="sc-kpis">
      <div class="sc-kpi">
        <div class="sc-kpi-num">{{ store.comptes.length }}</div>
        <div class="sc-kpi-lab">Comptes ouverts</div>
      </div>
      <div class="sc-kpi">
        <div class="sc-kpi-num">{{ store.comptes.filter(c => c.statut === 'a_jour').length }}</div>
        <div class="sc-kpi-lab">À jour</div>
      </div>
      <div class="sc-kpi">
        <div class="sc-kpi-num">{{ store.comptes.filter(c => c.statut === 'partiel').length }}</div>
        <div class="sc-kpi-lab">Paiements partiels</div>
      </div>
      <div class="sc-kpi" :class="{ 'is-alert': nbRetard > 0 }">
        <div class="sc-kpi-num">{{ nbRetard }}</div>
        <div class="sc-kpi-lab">En retard</div>
      </div>
      <div class="sc-kpi">
        <div class="sc-kpi-num">{{ store.comptes.filter(c => c.statut === 'solde').length }}</div>
        <div class="sc-kpi-lab">Soldés</div>
      </div>
    </div>

    <!-- Filtres -->
    <section class="sc-card">
      <div class="sc-filters">
        <input
          :value="filtresState.search"
          @input="(e) => updateFiltre('search', e.target.value)"
          type="text"
          placeholder="Rechercher un étudiant, matricule…"
          class="sc-input"
        />
        <select :value="filtresState.statut" @change="(e) => updateFiltre('statut', e.target.value)" class="sc-select">
          <option value="">Tous les statuts</option>
          <option value="a_jour">À jour</option>
          <option value="partiel">Paiements partiels</option>
          <option value="en_retard">En retard</option>
          <option value="solde">Soldés</option>
        </select>
        <select :value="filtresState.promotionId" @change="(e) => updateFiltre('promotionId', e.target.value)" class="sc-select">
          <option value="">Toutes les promotions</option>
          <option v-for="p in promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
        <select :value="filtresState.boursier" @change="(e) => updateFiltre('boursier', e.target.value)" class="sc-select">
          <option value="">Boursiers et non-boursiers</option>
          <option value="oui">Boursiers seulement</option>
          <option value="non">Non-boursiers</option>
        </select>
      </div>

      <!-- Tableau -->
      <div class="sc-table-wrap">
        <table class="sc-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Promotion</th>
              <th>Échéancier</th>
              <th class="num">Dû</th>
              <th class="num">Payé</th>
              <th class="num">Reste</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in store.filteredComptes"
              :key="item.compte.id"
              @click="openDetail(item)"
              class="sc-row"
            >
              <td>
                <div class="sc-etudiant">
                  <div class="sc-etu-avatar">{{ initiales(item.etudiant.nomComplet) }}</div>
                  <div>
                    <div class="sc-etu-nom">{{ item.etudiant.nomComplet }}</div>
                    <div class="sc-etu-mat">
                      {{ item.etudiant.matricule }}
                      <span v-if="item.compte.bourses.length > 0" class="sc-tag-bourse">Boursier</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sc-promo">{{ item.etudiant.programmeNom }}</div>
                <div class="sc-promo-annee">{{ item.etudiant.anneeNom }}</div>
              </td>
              <td>{{ item.compte.modeleEcheancierLabel }}</td>
              <td class="num">{{ fmtMontant(item.compte.totalDu) }}</td>
              <td class="num">{{ fmtMontant(item.compte.totalPaye) }}</td>
              <td class="num">
                <strong>{{ fmtMontant(item.compte.totalRestant) }}</strong>
              </td>
              <td><span class="sc-statut" :class="`st-${item.compte.statut}`">{{ labelStatut(item.compte.statut) }}</span></td>
            </tr>
            <tr v-if="store.filteredComptes.length === 0">
              <td colspan="7" class="sc-empty">Aucun compte ne correspond à vos filtres.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Fiche détail -->
    <div v-if="detail" class="sc-modal" @click.self="closeDetail">
      <div class="sc-modal-content">
        <header class="sc-modal-head">
          <div>
            <h3>{{ detail.etudiant.nomComplet }}</h3>
            <p class="sc-modal-sub">
              {{ detail.etudiant.programmeNom }} — {{ detail.etudiant.anneeNom }} ·
              Matricule {{ detail.etudiant.matricule }}
            </p>
          </div>
          <button class="sc-modal-close" type="button" @click="closeDetail">×</button>
        </header>
        <div class="sc-modal-body">
          <!-- Synthèse -->
          <div class="sc-synthese">
            <div class="sc-syn">
              <div class="sc-syn-lab">Total dû</div>
              <div class="sc-syn-val">{{ fmtMontant(detail.compte.totalDu) }}</div>
            </div>
            <div class="sc-syn">
              <div class="sc-syn-lab">Total payé</div>
              <div class="sc-syn-val ok">{{ fmtMontant(detail.compte.totalPaye) }}</div>
            </div>
            <div class="sc-syn">
              <div class="sc-syn-lab">Reste à encaisser</div>
              <div class="sc-syn-val" :class="detail.compte.totalRestant === 0 ? 'ok' : 'danger'">
                {{ fmtMontant(detail.compte.totalRestant) }}
              </div>
            </div>
            <div class="sc-syn" v-if="detail.compte.reductionBourse > 0">
              <div class="sc-syn-lab">Bourse appliquée</div>
              <div class="sc-syn-val gold">−{{ fmtMontant(detail.compte.reductionBourse) }}</div>
            </div>
          </div>

          <!-- Bourses -->
          <div v-if="detailBourses.length > 0" class="sc-section">
            <h4 class="sc-section-h">Bourses</h4>
            <div class="sc-bourses">
              <div v-for="b in detailBourses" :key="b.id" class="sc-bourse">
                <div class="sc-bourse-lib">{{ b.libelle }}</div>
                <div class="sc-bourse-val">
                  {{ b.mode === 'pourcentage' ? `${b.valeur} %` : fmtMontant(b.valeur) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Financements -->
          <div v-if="detailFinancements.length > 0" class="sc-section">
            <h4 class="sc-section-h">Financements tiers</h4>
            <table class="sc-mini-table">
              <thead>
                <tr><th>Type</th><th>Tiers</th><th class="num">Montant</th><th>Statut</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in detailFinancements" :key="f.id">
                  <td>{{ typeLabel(f.type) }}</td>
                  <td>{{ f.employeur || f.opco || '—' }}</td>
                  <td class="num">{{ fmtMontant(f.montant) }}</td>
                  <td><span class="sc-statut" :class="`st-${f.statut}`">{{ statutConventionLabel(f.statut) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Échéancier -->
          <div class="sc-section">
            <h4 class="sc-section-h">Échéancier ({{ detail.compte.modeleEcheancierLabel }})</h4>
            <table class="sc-mini-table">
              <thead>
                <tr><th>Date</th><th class="num">Dû</th><th class="num">Payé</th><th>Statut</th></tr>
              </thead>
              <tbody>
                <tr v-for="ech in detailEcheances" :key="ech.id">
                  <td>{{ fmtDate(ech.dateEcheance) }}</td>
                  <td class="num">{{ fmtMontant(ech.montantDu) }}</td>
                  <td class="num">{{ fmtMontant(ech.montantPaye) }}</td>
                  <td><span class="sc-statut" :class="`st-${ech.statut}`">{{ statutEcheanceLabel(ech.statut) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paiements -->
          <div v-if="detailPaiements.length > 0" class="sc-section">
            <h4 class="sc-section-h">Paiements ({{ detailPaiements.length }})</h4>
            <table class="sc-mini-table">
              <thead>
                <tr><th>Date</th><th class="num">Montant</th><th>Méthode</th><th>Référence</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in detailPaiements" :key="p.id">
                  <td>{{ fmtDate(p.date) }}</td>
                  <td class="num">{{ fmtMontant(p.montant) }}</td>
                  <td>{{ methodeLabel(p.methode) }}</td>
                  <td class="ref">{{ p.reference }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Action enregistrer paiement -->
          <div class="sc-action">
            <button class="sc-btn-primary" type="button" @click="openPaiement">
              + Enregistrer un paiement
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini modale paiement -->
    <div v-if="paiementModal" class="sc-modal" @click.self="closePaiement">
      <div class="sc-modal-content sc-modal-small">
        <header class="sc-modal-head">
          <h3>Nouveau paiement</h3>
          <button class="sc-modal-close" type="button" @click="closePaiement">×</button>
        </header>
        <div class="sc-modal-body">
          <div class="sc-form">
            <label>
              <span>Échéance</span>
              <select v-model="paiementForm.echeanceId">
                <option value="">— Hors échéancier —</option>
                <option v-for="ech in detailEcheances.filter(e => e.statut !== 'payee')" :key="ech.id" :value="ech.id">
                  {{ fmtDate(ech.dateEcheance) }} — {{ fmtMontant(ech.montantDu - ech.montantPaye) }} restant
                </option>
              </select>
            </label>
            <label>
              <span>Montant (FCFA)</span>
              <input type="number" min="0" step="10" v-model.number="paiementForm.montant" />
            </label>
            <label>
              <span>Date</span>
              <input type="date" v-model="paiementForm.date" />
            </label>
            <label>
              <span>Méthode</span>
              <select v-model="paiementForm.methode">
                <option v-for="m in methodes" :key="m.key" :value="m.key">{{ m.label }}</option>
              </select>
            </label>
            <label>
              <span>Référence (optionnel)</span>
              <input type="text" v-model="paiementForm.reference" placeholder="N° transaction, chèque…" />
            </label>
          </div>
        </div>
        <footer class="sc-modal-foot">
          <button class="sc-btn-secondary" type="button" @click="closePaiement">Annuler</button>
          <button class="sc-btn-primary" type="button" @click="enregistrerPaiement" :disabled="!paiementForm.montant">Enregistrer</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  useFinanceStore,
  fmtMontant, fmtDate,
  METHODES_PAIEMENT, STATUTS_PAIEMENT, STATUTS_CONVENTION, TYPES_FINANCEMENT,
  FIN_TODAY,
} from '../../stores/finance'
import { PROMOTIONS } from '../../stores/superieur'

const store = useFinanceStore()
const promotions = PROMOTIONS
const methodes = METHODES_PAIEMENT

// Lecture directe des filtres du store (source de vérité)
const filtresState = computed(() => store.comptesFilters)
function updateFiltre(k, v) { store.setCompteFilter(k, v) }

const nbRetard = computed(() => store.comptes.filter((c) => c.statut === 'en_retard').length)

const detail = ref(null)
function openDetail(item) {
  detail.value = item
}
function closeDetail() {
  detail.value = null
  paiementModal.value = false
}
const detailEcheances = computed(() =>
  detail.value ? store.echeancesDuCompte(detail.value.compte.id) : []
)
const detailPaiements = computed(() =>
  detail.value ? store.paiementsDuCompte(detail.value.compte.id).sort((a,b)=>b.date.localeCompare(a.date)) : []
)
const detailBourses = computed(() =>
  detail.value ? detail.value.compte.bourses.map((id) => store.getBourse(id)).filter(Boolean) : []
)
const detailFinancements = computed(() =>
  detail.value ? store.financementsDeLEtudiant(detail.value.etudiant.id) : []
)

const paiementModal = ref(false)
const paiementForm = ref({ echeanceId: '', montant: 0, date: FIN_TODAY, methode: 'virement', reference: '' })
function openPaiement() {
  paiementModal.value = true
  paiementForm.value = { echeanceId: '', montant: 0, date: FIN_TODAY, methode: 'virement', reference: '' }
}
function closePaiement() { paiementModal.value = false }
function enregistrerPaiement() {
  if (!detail.value || !paiementForm.value.montant) return
  store.addPaiement({
    compteId: detail.value.compte.id,
    etudiantId: detail.value.etudiant.id,
    echeanceId: paiementForm.value.echeanceId || null,
    montant: paiementForm.value.montant,
    date: paiementForm.value.date,
    methode: paiementForm.value.methode,
    reference: paiementForm.value.reference,
  })
  closePaiement()
}

function initiales(nom) {
  if (!nom) return '?'
  return nom.split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase() || '').join('')
}
function labelStatut(s) {
  return { a_jour: 'À jour', partiel: 'Partiel', en_retard: 'En retard', solde: 'Soldé' }[s] || s
}
function statutEcheanceLabel(s) { return STATUTS_PAIEMENT[s]?.label || s }
function statutConventionLabel(s) { return STATUTS_CONVENTION[s]?.label || s }
function methodeLabel(k) { return METHODES_PAIEMENT.find((m) => m.key === k)?.label || k }
function typeLabel(k) { return TYPES_FINANCEMENT[k]?.label || k }
</script>

<style scoped>
.sc { display: flex; flex-direction: column; gap: 22px; }
.sc-intro { padding: 8px 0; }
.sc-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sc-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }

.sc-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.sc-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: center;
}
.sc-kpi.is-alert { border-color: rgba(178, 59, 59, 0.35); background: rgba(178, 59, 59, 0.04); }
.sc-kpi-num {
  font-family: 'Poppins', sans-serif;
  font-size: 22px; font-weight: 800; color: #1A1D1F;
}
.sc-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sc-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 18px 20px;
}
.sc-filters {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 14px;
}
.sc-input, .sc-select {
  padding: 9px 12px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13px; font-family: inherit; color: #1A1D1F;
  background: #fff;
}
.sc-input { flex: 1; min-width: 240px; }
.sc-input:focus, .sc-select:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

.sc-table-wrap { overflow-x: auto; }
.sc-table { width: 100%; border-collapse: collapse; }
.sc-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
  white-space: nowrap;
}
.sc-table th.num, .sc-table td.num { text-align: right; }
.sc-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px; color: #1A1D1F;
}
.sc-row { cursor: pointer; transition: background 0.12s ease; }
.sc-row:hover { background: rgba(var(--pr-rgb), 0.04); }
.sc-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }

.sc-etudiant { display: flex; align-items: center; gap: 10px; }
.sc-etu-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(var(--pr-rgb), 0.12);
  color: var(--pr);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700;
  flex-shrink: 0;
}
.sc-etu-nom { font-family: 'Poppins', sans-serif; font-weight: 700; }
.sc-etu-mat { font-size: 11.5px; color: #6F767E; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.sc-tag-bourse {
  background: rgba(184, 137, 42, 0.15);
  color: #B07308;
  font-family: 'Poppins', sans-serif;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px;
  border-radius: 100px;
}
.sc-promo { font-size: 12.5px; font-weight: 600; }
.sc-promo-annee { font-size: 11px; color: #6F767E; margin-top: 1px; }

.sc-statut {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
}
.sc-statut.st-a_jour { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sc-statut.st-partiel { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sc-statut.st-en_retard { background: rgba(178, 59, 59, 0.14); color: #B23B3B; }
.sc-statut.st-solde { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }
.sc-statut.st-payee { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sc-statut.st-partielle { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sc-statut.st-due { background: rgba(149, 149, 149, 0.14); color: #6F767E; }
.sc-statut.st-enRetard { background: rgba(178, 59, 59, 0.14); color: #B23B3B; }
.sc-statut.st-encaissee { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sc-statut.st-facturee { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }
.sc-statut.st-signee { background: rgba(149, 149, 149, 0.16); color: #4F5258; }
.sc-statut.st-en_negociation { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sc-statut.st-echouee { background: rgba(178, 59, 59, 0.14); color: #B23B3B; }

/* Modale */
.sc-modal {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
.sc-modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 760px;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.4);
  max-height: 90vh;
}
.sc-modal-small { max-width: 460px; }
.sc-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #ECECE8;
}
.sc-modal-head h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 700; color: #1A1D1F; margin: 0;
}
.sc-modal-sub { font-size: 12.5px; color: #6F767E; margin: 2px 0 0; }
.sc-modal-close {
  background: transparent; border: none;
  font-size: 28px; color: #6F767E; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
}
.sc-modal-close:hover { background: #F4F4F0; color: #1A1D1F; }
.sc-modal-body { padding: 18px 22px; overflow-y: auto; }

.sc-synthese {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.sc-syn {
  padding: 11px 13px;
  background: #FBFAF7;
  border: 1px solid #ECECE8;
  border-radius: 10px;
}
.sc-syn-lab { font-size: 10.5px; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.sc-syn-val {
  font-family: 'Poppins', sans-serif;
  font-size: 16px; font-weight: 800; color: #1A1D1F;
  margin-top: 4px;
}
.sc-syn-val.ok { color: #2E8B57; }
.sc-syn-val.danger { color: #B23B3B; }
.sc-syn-val.gold { color: #B07308; }

.sc-section { margin-top: 18px; }
.sc-section-h {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  margin: 0 0 8px;
}

.sc-bourses { display: flex; flex-wrap: wrap; gap: 8px; }
.sc-bourse {
  padding: 8px 12px;
  background: rgba(184, 137, 42, 0.08);
  border: 1px solid rgba(184, 137, 42, 0.25);
  border-radius: 10px;
  display: flex; flex-direction: column; gap: 2px;
}
.sc-bourse-lib { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; color: #1A1D1F; }
.sc-bourse-val { font-size: 11.5px; color: #B07308; font-weight: 600; }

.sc-mini-table { width: 100%; border-collapse: collapse; }
.sc-mini-table th {
  text-align: left;
  font-size: 10.5px; font-weight: 600; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 7px 8px;
  border-bottom: 1px solid #ECECE8;
}
.sc-mini-table th.num, .sc-mini-table td.num { text-align: right; }
.sc-mini-table td {
  padding: 8px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 12.5px; color: #1A1D1F;
}
.sc-mini-table td.ref { color: #6F767E; font-family: monospace; font-size: 11.5px; }

.sc-action {
  margin-top: 16px; display: flex; justify-content: flex-end;
}

.sc-form { display: flex; flex-direction: column; gap: 11px; }
.sc-form label { display: flex; flex-direction: column; gap: 4px; }
.sc-form label span {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: #6F767E;
}
.sc-form input, .sc-form select {
  padding: 9px 11px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13.5px; font-family: inherit; color: #1A1D1F;
}
.sc-form input:focus, .sc-form select:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

.sc-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 22px; border-top: 1px solid #ECECE8;
}
.sc-btn-secondary, .sc-btn-primary {
  padding: 9px 16px;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.sc-btn-secondary {
  background: #fff; color: #6F767E; border-color: #DCDCD8;
}
.sc-btn-secondary:hover { background: #F4F4F0; color: #1A1D1F; }
.sc-btn-primary { background: var(--pr); color: #fff; }
.sc-btn-primary:hover { background: #11498F; }
.sc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 700px) {
  .sc-h1 { font-size: 22px; }
  .sc-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .sc-card { padding: 14px 14px; }
  .sc-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .sc-filters { flex-direction: column; gap: 8px; }
  .sc-filters input, .sc-filters select { width: 100%; min-width: 0; }
  .sc-table th, .sc-table td { padding: 10px 10px; font-size: 12.5px; }
  .sc-table-wrap { overflow-x: auto; }
  .sc-modal { padding: 0; align-items: flex-end; }
  .sc-modal-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
  }
}
</style>
