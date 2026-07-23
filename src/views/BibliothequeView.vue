<template>
  <div class="biblio-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Bibliothèque</h1>
        <p>Fonds documentaire, emprunts et retours.</p>
      </div>
      <button class="btn btn-primary" @click="showAddBook = !showAddBook"><Plus :size="16" /> <span>Ajouter un ouvrage</span></button>
    </div>

    <!-- Stats -->
    <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item"><span class="stat-bar-dot blue"></span><div><div class="stat-bar-value">{{ store.totalOuvrages }}</div><div class="stat-bar-label">Exemplaires</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot green"></span><div><div class="stat-bar-value">{{ store.totalDisponibles }}</div><div class="stat-bar-label">Disponibles</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot orange"></span><div><div class="stat-bar-value">{{ store.empruntsEnCours.length }}</div><div class="stat-bar-label">Empruntés</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot" style="background: var(--danger, #D93025)"></span><div><div class="stat-bar-value">{{ store.enRetard.length }}</div><div class="stat-bar-label">En retard</div></div></div>
    </div>

    <!-- Ajout d'ouvrage (repliable) -->
    <div v-if="showAddBook" class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">Nouvel ouvrage</h3>
      <div class="form-grid">
        <div class="field"><label>Titre</label><input v-model="nb.titre" class="input" placeholder="Titre de l'ouvrage" /></div>
        <div class="field"><label>Auteur</label><input v-model="nb.auteur" class="input" placeholder="Auteur" /></div>
        <div class="field"><label>Catégorie</label>
          <select v-model="nb.categorie" class="input"><option>Manuel</option><option>Roman</option><option>Documentaire</option><option>Revue</option><option>Autre</option></select>
        </div>
        <div class="field"><label>ISBN</label><input v-model="nb.isbn" class="input" placeholder="ISBN (optionnel)" /></div>
        <div class="field"><label>Exemplaires</label><input v-model.number="nb.total" type="number" min="1" class="input" /></div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" @click="showAddBook = false">Annuler</button>
        <button class="btn btn-primary" :disabled="!nb.titre.trim()" @click="saveBook"><Check :size="15" /> Enregistrer</button>
      </div>
    </div>

    <!-- Emprunts en cours -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-head-row">
        <h3 class="card-title">Emprunts en cours</h3>
        <button class="btn btn-outline btn-sm" @click="showLoan = !showLoan"><Plus :size="14" /> Nouvel emprunt</button>
      </div>

      <div v-if="showLoan" class="loan-form">
        <div class="form-grid">
          <div class="field"><label>Ouvrage</label>
            <select v-model="nl.livreId" class="input">
              <option value="" disabled>Choisir un ouvrage</option>
              <option v-for="o in dispoBooks" :key="o.id" :value="o.id">{{ o.titre }} ({{ o.dispo }} dispo)</option>
            </select>
          </div>
          <div class="field"><label>Élève</label><input v-model="nl.eleve" class="input" placeholder="Nom de l'élève" /></div>
          <div class="field"><label>Classe</label><input v-model="nl.classe" class="input" placeholder="Ex. 3ème C" /></div>
          <div class="field"><label>À rendre avant</label><input v-model="nl.rendreAvant" type="date" class="input" /></div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" @click="showLoan = false">Annuler</button>
          <button class="btn btn-primary" :disabled="!nl.livreId || !nl.eleve.trim()" @click="saveLoan"><Check :size="15" /> Enregistrer l'emprunt</button>
        </div>
      </div>

      <table class="data-table" v-if="store.empruntsEnCours.length">
        <thead><tr><th>Ouvrage</th><th>Élève</th><th>Classe</th><th>Emprunté le</th><th>À rendre</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in store.empruntsEnCours" :key="e.id" :class="{ 'row-late': isLate(e) }">
            <td>{{ e.livreTitre }}</td>
            <td>{{ e.eleve }}</td>
            <td>{{ e.classe }}</td>
            <td>{{ fmtDate(e.empruntLe) }}</td>
            <td><span :class="['due', { late: isLate(e) }]">{{ fmtDate(e.rendreAvant) }}<span v-if="isLate(e)"> · en retard</span></span></td>
            <td class="ta-right"><button class="btn btn-outline btn-sm" @click="store.rendre(e.id)"><Check :size="14" /> Rendre</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucun emprunt en cours.</p>
    </div>

    <!-- Fonds documentaire -->
    <div class="card">
      <h3 class="card-title">Fonds documentaire</h3>
      <table class="data-table" v-if="store.ouvrages.length">
        <thead><tr><th>Titre</th><th>Auteur</th><th>Catégorie</th><th>Disponibles</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in store.ouvrages" :key="o.id">
            <td>{{ o.titre }}</td>
            <td class="muted">{{ o.auteur }}</td>
            <td><span class="chip">{{ o.categorie }}</span></td>
            <td>{{ o.dispo }} / {{ o.total }}</td>
            <td class="ta-right"><button class="icon-btn" title="Supprimer" @click="store.removeOuvrage(o.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucun ouvrage. Ajoutez-en un pour commencer.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Check, Trash2 } from 'lucide-vue-next'
import { useBibliothequeStore } from '../stores/bibliotheque'

const store = useBibliothequeStore()
const showAddBook = ref(false)
const showLoan = ref(false)
const nb = ref({ titre: '', auteur: '', categorie: 'Manuel', isbn: '', total: 1 })
const nl = ref({ livreId: '', eleve: '', classe: '', rendreAvant: '' })

const dispoBooks = computed(() => store.ouvrages.filter((o) => o.dispo > 0))
const today = new Date().toISOString().slice(0, 10)
function isLate(e) { return e.rendreAvant && e.rendreAvant < today }
function fmtDate(d) { if (!d) return '—'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }

function saveBook() {
  if (!nb.value.titre.trim()) return
  store.addOuvrage({ ...nb.value })
  nb.value = { titre: '', auteur: '', categorie: 'Manuel', isbn: '', total: 1 }
  showAddBook.value = false
}
function saveLoan() {
  if (!nl.value.livreId || !nl.value.eleve.trim()) return
  store.emprunter({ ...nl.value })
  nl.value = { livreId: '', eleve: '', classe: '', rendreAvant: '' }
  showLoan.value = false
}
</script>

<style scoped>
.biblio-page { max-width: 1100px; }
.card-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--tx); margin: 0 0 14px; }
.card-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-head-row .card-title { margin: 0; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--tx3); }
.row-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.loan-form { padding: 14px; border: 1px solid var(--divider); border-radius: 12px; margin-bottom: 16px; background: var(--input-bg, #f7f8fa); }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3); font-weight: 700; padding: 8px 10px; border-bottom: 1px solid var(--divider); }
.data-table td { padding: 11px 10px; border-bottom: 1px solid var(--divider); color: var(--tx); }
.data-table tr:last-child td { border-bottom: none; }
.ta-right { text-align: right; }
.muted { color: var(--tx3); }
.chip { display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(var(--pr-rgb), .1); color: var(--pr); font-size: 12px; font-weight: 600; }
.due.late { color: var(--danger, #D93025); font-weight: 600; }
.row-late td { background: rgba(217, 48, 37, .04); }
.icon-btn { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; }
.icon-btn:hover { background: rgba(217, 48, 37, .1); color: var(--danger, #D93025); }
.empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
</style>
