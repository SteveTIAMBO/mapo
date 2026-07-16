<template>
  <div class="sg">
    <div class="sg-intro">
      <div>
        <h1 class="sg-h1">Grilles tarifaires</h1>
        <p class="sg-sub">
          Une grille par promotion. Inclut les frais d'inscription, de scolarité et divers.
          Modèles d'échéancier proposés aux étudiants à l'inscription.
        </p>
      </div>
    </div>

    <!-- Modèles d'échéancier -->
    <section class="sg-card">
      <h2 class="sg-h2">Modèles d'échéancier disponibles</h2>
      <div class="sg-modeles">
        <div v-for="m in modeles" :key="m.key" class="sg-modele">
          <div class="sg-modele-head">
            <span class="sg-modele-nb">{{ m.nbEcheances }}×</span>
            <span class="sg-modele-label">{{ m.label }}</span>
          </div>
          <div class="sg-modele-desc">
            Échéances aux mois : {{ formatMois(m.mois) }}
          </div>
        </div>
      </div>
    </section>

    <!-- Tableau des grilles -->
    <section class="sg-card">
      <h2 class="sg-h2">Grilles 2025-2026 par promotion</h2>
      <div class="sg-table-wrap">
        <table class="sg-table">
          <thead>
            <tr>
              <th>Programme</th>
              <th>Année</th>
              <th class="num">Inscription</th>
              <th class="num">Scolarité</th>
              <th class="num">Divers</th>
              <th class="num">Total annuel</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in store.tarifs" :key="t.id">
              <td>
                <span class="sg-prog">{{ t.programmeNom }}</span>
                <span class="sg-niveau" :class="niveauClass(t.niveau)">{{ t.niveau }}</span>
              </td>
              <td>{{ t.anneeNom }}</td>
              <td class="num">{{ fmtMontant(t.fraisInscription) }}</td>
              <td class="num">{{ fmtMontant(t.fraisScolarite) }}</td>
              <td class="num">{{ fmtMontant(t.fraisDivers) }}</td>
              <td class="num total">{{ fmtMontant(t.total) }}</td>
              <td>
                <button class="sg-btn-edit" type="button" @click="openEdit(t)" title="Modifier">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Liste mobile : cartes tappables (tableau masqué sur petit écran) -->
      <ul class="sg-mlist">
        <li v-for="t in store.tarifs" :key="t.id" class="sg-mrow" @click="openEdit(t)">
          <div class="sg-mrow-main">
            <div class="sg-mrow-name">{{ t.programmeNom }}</div>
            <div class="sg-mrow-sub"><span class="sg-niveau" :class="niveauClass(t.niveau)">{{ t.niveau }}</span> {{ t.anneeNom }}</div>
            <div class="sg-mrow-meta"><span class="sg-mrow-total">Total {{ fmtMontant(t.total) }}</span></div>
          </div>
          <svg class="sg-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </li>
        <li v-if="store.tarifs.length === 0" class="sg-mempty">Aucune grille tarifaire.</li>
      </ul>
    </section>

    <!-- Modale édition -->
    <div v-if="modal" class="sg-modal" @click.self="closeModal">
      <div class="sg-modal-content">
        <header class="sg-modal-head">
          <h3>Modifier la grille</h3>
          <button class="sg-modal-close" type="button" @click="closeModal">×</button>
        </header>
        <div class="sg-modal-body">
          <p class="sg-modal-target">
            {{ modal.programmeNom }} — <strong>{{ modal.anneeNom }}</strong>
          </p>
          <div class="sg-form">
            <label>
              <span>Frais d'inscription (FCFA)</span>
              <input type="number" min="0" step="50" v-model.number="form.fraisInscription" />
            </label>
            <label>
              <span>Frais de scolarité (FCFA)</span>
              <input type="number" min="0" step="100" v-model.number="form.fraisScolarite" />
            </label>
            <label>
              <span>Frais divers (FCFA)</span>
              <input type="number" min="0" step="50" v-model.number="form.fraisDivers" />
            </label>
            <div class="sg-form-total">
              Nouveau total : <strong>{{ fmtMontant(totalForm) }}</strong>
            </div>
          </div>
        </div>
        <footer class="sg-modal-foot">
          <button class="sg-btn-secondary" type="button" @click="closeModal">Annuler</button>
          <button class="sg-btn-primary" type="button" @click="enregistrer">Enregistrer</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore, fmtMontant, MODELES_ECHEANCIER } from '../../stores/finance'

const store = useFinanceStore()
const modeles = MODELES_ECHEANCIER

const modal = ref(null)
const form = ref({ fraisInscription: 0, fraisScolarite: 0, fraisDivers: 0 })

function openEdit(t) {
  modal.value = t
  form.value = {
    fraisInscription: t.fraisInscription,
    fraisScolarite: t.fraisScolarite,
    fraisDivers: t.fraisDivers,
  }
}
function closeModal() { modal.value = null }
function enregistrer() {
  if (!modal.value) return
  store.updateTarif(modal.value.id, {
    fraisInscription: Number(form.value.fraisInscription) || 0,
    fraisScolarite: Number(form.value.fraisScolarite) || 0,
    fraisDivers: Number(form.value.fraisDivers) || 0,
  })
  closeModal()
}
const totalForm = computed(() =>
  (Number(form.value.fraisInscription) || 0) +
  (Number(form.value.fraisScolarite) || 0) +
  (Number(form.value.fraisDivers) || 0)
)
function niveauClass(n) { return n === 'Master' ? 'n-master' : n === 'Doctorat' ? 'n-doctorat' : 'n-licence' }

const MOIS_NOMS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
function formatMois(mois) {
  return mois.map((m) => MOIS_NOMS[m - 1]).join(', ')
}
</script>

<style scoped>
.sg { display: flex; flex-direction: column; gap: 22px; }
.sg-intro { padding: 8px 0; }
.sg-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 26px; font-weight: 800; color: #1A1D1F;
  margin: 0 0 4px;
}
.sg-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }

.sg-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 20px 22px;
}
.sg-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px;
  font-weight: 700;
  color: #1A1D1F;
  margin: 0 0 14px;
}

.sg-modeles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.sg-modele {
  padding: 12px 14px;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  background: #FBFAF7;
}
.sg-modele-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
.sg-modele-nb {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: var(--pr);
}
.sg-modele-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: #1A1D1F;
}
.sg-modele-desc { font-size: 11.5px; color: #6F767E; line-height: 1.4; }

.sg-table-wrap { overflow-x: auto; }
.sg-table {
  width: 100%;
  border-collapse: collapse;
}
.sg-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  color: #6F767E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
  white-space: nowrap;
}
.sg-table th.num, .sg-table td.num { text-align: right; }
.sg-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px;
  color: #1A1D1F;
  vertical-align: middle;
}
.sg-table td.total {
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
  color: var(--pr);
}
.sg-prog {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  margin-bottom: 2px;
}
.sg-niveau {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
}
.sg-niveau.n-master { background: rgba(184, 137, 42, 0.15); color: #B07308; }
.sg-niveau.n-doctorat { background: rgba(124, 58, 237, 0.14); color: #6D28D9; }
.sg-niveau.n-licence { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }

.sg-btn-edit {
  background: rgba(var(--pr-rgb), 0.08);
  color: var(--pr);
  border: none;
  border-radius: 8px;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sg-btn-edit:hover { background: rgba(var(--pr-rgb), 0.18); }

/* Modale */
.sg-modal {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.sg-modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.4);
}
.sg-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #ECECE8;
}
.sg-modal-head h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 16px; font-weight: 700; color: #1A1D1F; margin: 0;
}
.sg-modal-close {
  background: transparent; border: none;
  font-size: 28px; color: #6F767E; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
}
.sg-modal-close:hover { background: #F4F4F0; color: #1A1D1F; }
.sg-modal-body { padding: 18px 20px; }
.sg-modal-target { font-size: 13.5px; color: #6F767E; margin: 0 0 14px; }
.sg-form { display: flex; flex-direction: column; gap: 12px; }
.sg-form label { display: flex; flex-direction: column; gap: 4px; }
.sg-form label span {
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 600; color: #6F767E;
}
.sg-form input {
  padding: 10px 12px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 14px;
  font-family: inherit;
  color: #1A1D1F;
}
.sg-form input:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}
.sg-form-total {
  margin-top: 6px;
  padding: 10px 12px;
  background: rgba(var(--pr-rgb), 0.06);
  border-radius: 9px;
  font-size: 13.5px;
  color: #1A1D1F;
}
.sg-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 20px; border-top: 1px solid #ECECE8;
}
.sg-btn-secondary, .sg-btn-primary {
  padding: 9px 16px;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.sg-btn-secondary {
  background: #fff; color: #6F767E; border-color: #DCDCD8;
}
.sg-btn-secondary:hover { background: #F4F4F0; color: #1A1D1F; }
.sg-btn-primary { background: var(--pr); color: #fff; }
.sg-btn-primary:hover { background: #11498F; }

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.sg-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.sg-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.sg-mrow:last-child { border-bottom: none; }
.sg-mrow:active { background: rgba(var(--pr-rgb), .07); }
.sg-mrow-main { flex: 1; min-width: 0; }
.sg-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sg-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 3px; }
.sg-mrow-total { font-size: 12px; font-weight: 700; color: var(--tx2, #6f767e); }
.sg-mrow-chev { color: var(--tx3, #9aa2b1); flex-shrink: 0; }
.sg-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .sg-table-wrap { display: none; }
  .sg-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .sg-intro { flex-direction: column; align-items: stretch; gap: 12px; }
}
</style>
