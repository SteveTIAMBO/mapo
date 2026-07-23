<template>
  <div class="mod-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Infirmerie &amp; santé</h1>
        <p>Registre des passages et fiches santé des élèves.</p>
      </div>
      <button class="btn btn-primary" @click="showAddPassage = !showAddPassage"><Plus :size="16" /> <span>Nouveau passage</span></button>
    </div>

    <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item"><span class="stat-bar-dot blue"></span><div><div class="stat-bar-value">{{ store.passagesDuJour }}</div><div class="stat-bar-label">Passages du jour</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot" style="background: var(--tx3)"></span><div><div class="stat-bar-value">{{ store.totalPassages }}</div><div class="stat-bar-label">Passages (total)</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot green"></span><div><div class="stat-bar-value">{{ store.totalFiches }}</div><div class="stat-bar-label">Fiches santé</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot orange"></span><div><div class="stat-bar-value">{{ store.totalAllergies }}</div><div class="stat-bar-label">Allergies signalées</div></div></div>
    </div>

    <div v-if="showAddPassage" class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">Nouveau passage</h3>
      <div class="form-grid">
        <div class="field"><label>Élève</label><input v-model="np.eleve" class="input" placeholder="Nom de l'élève" /></div>
        <div class="field"><label>Classe</label><input v-model="np.classe" class="input" placeholder="Ex. 3ème C" /></div>
        <div class="field"><label>Motif</label><input v-model="np.motif" class="input" placeholder="Ex. Maux de tête" /></div>
        <div class="field"><label>Soin apporté</label><input v-model="np.soin" class="input" placeholder="Ex. Repos + paracétamol" /></div>
        <div class="field"><label>Suite</label>
          <select v-model="np.sortie" class="input"><option>Retour en classe</option><option>Parent appelé</option><option>Renvoyé à la maison</option><option>Transféré (hôpital)</option></select>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" @click="showAddPassage = false">Annuler</button>
        <button class="btn btn-primary" :disabled="!np.eleve.trim()" @click="savePassage"><Check :size="15" /> Enregistrer</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">Registre des passages</h3>
      <table class="data-table" v-if="store.passagesOrdonnes.length">
        <thead><tr><th>Date</th><th>Élève</th><th>Classe</th><th>Motif</th><th>Soin</th><th>Suite</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in store.passagesOrdonnes" :key="p.id">
            <td>{{ fmtDate(p.date) }}</td>
            <td>{{ p.eleve }}</td>
            <td class="muted">{{ p.classe }}</td>
            <td>{{ p.motif || '—' }}</td>
            <td class="muted">{{ p.soin || '—' }}</td>
            <td><span class="chip">{{ p.sortie }}</span></td>
            <td class="ta-right"><button class="icon-btn" title="Supprimer" @click="store.removePassage(p.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucun passage enregistré.</p>
    </div>

    <div class="card">
      <div class="card-head-row">
        <h3 class="card-title">Fiches santé</h3>
        <button class="btn btn-outline btn-sm" @click="showAddFiche = !showAddFiche"><Plus :size="14" /> Nouvelle fiche</button>
      </div>
      <div v-if="showAddFiche" class="sub-form">
        <div class="form-grid">
          <div class="field"><label>Élève</label><input v-model="nf.eleve" class="input" placeholder="Nom de l'élève" /></div>
          <div class="field"><label>Classe</label><input v-model="nf.classe" class="input" placeholder="Ex. 3ème A" /></div>
          <div class="field"><label>Groupe sanguin</label><input v-model="nf.groupeSanguin" class="input" placeholder="Ex. O+" /></div>
          <div class="field"><label>Allergies</label><input v-model="nf.allergies" class="input" placeholder="Ex. Arachides" /></div>
          <div class="field"><label>Traitement en cours</label><input v-model="nf.traitement" class="input" placeholder="Ex. Ventoline" /></div>
          <div class="field"><label>Contact d'urgence</label><input v-model="nf.contact" class="input" placeholder="Téléphone parent" /></div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" @click="showAddFiche = false">Annuler</button>
          <button class="btn btn-primary" :disabled="!nf.eleve.trim()" @click="saveFiche"><Check :size="15" /> Enregistrer</button>
        </div>
      </div>
      <table class="data-table" v-if="store.fiches.length">
        <thead><tr><th>Élève</th><th>Classe</th><th>Groupe</th><th>Allergies</th><th>Traitement</th><th>Urgence</th><th></th></tr></thead>
        <tbody>
          <tr v-for="f in store.fiches" :key="f.id">
            <td>{{ f.eleve }}</td>
            <td class="muted">{{ f.classe }}</td>
            <td>{{ f.groupeSanguin || '—' }}</td>
            <td><span v-if="hasAllergy(f)" class="chip warn">{{ f.allergies }}</span><span v-else class="muted">{{ f.allergies || '—' }}</span></td>
            <td class="muted">{{ f.traitement || '—' }}</td>
            <td class="muted">{{ f.contact || '—' }}</td>
            <td class="ta-right"><button class="icon-btn" title="Supprimer" @click="store.removeFiche(f.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucune fiche santé.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Check, Trash2 } from 'lucide-vue-next'
import { useInfirmerieStore } from '../stores/infirmerie'

const store = useInfirmerieStore()
const showAddPassage = ref(false)
const showAddFiche = ref(false)
const np = ref({ eleve: '', classe: '', motif: '', soin: '', sortie: 'Retour en classe' })
const nf = ref({ eleve: '', classe: '', groupeSanguin: '', allergies: '', traitement: '', contact: '' })

function fmtDate(d) { if (!d) return '—'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }
function hasAllergy(f) { return (f.allergies || '').trim() && !/aucune/i.test(f.allergies) }
function savePassage() {
  if (!np.value.eleve.trim()) return
  store.addPassage({ ...np.value })
  np.value = { eleve: '', classe: '', motif: '', soin: '', sortie: 'Retour en classe' }
  showAddPassage.value = false
}
function saveFiche() {
  if (!nf.value.eleve.trim()) return
  store.addFiche({ ...nf.value })
  nf.value = { eleve: '', classe: '', groupeSanguin: '', allergies: '', traitement: '', contact: '' }
  showAddFiche.value = false
}
</script>

<style scoped>
.mod-page { max-width: 1100px; }
.card-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--tx); margin: 0 0 14px; }
.card-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-head-row .card-title { margin: 0; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--tx3); }
.row-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.sub-form { padding: 14px; border: 1px solid var(--divider); border-radius: 12px; margin-bottom: 16px; background: var(--input-bg, #f7f8fa); }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3); font-weight: 700; padding: 8px 10px; border-bottom: 1px solid var(--divider); }
.data-table td { padding: 11px 10px; border-bottom: 1px solid var(--divider); color: var(--tx); }
.data-table tr:last-child td { border-bottom: none; }
.ta-right { text-align: right; }
.muted { color: var(--tx3); }
.chip { display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(var(--pr-rgb), .1); color: var(--pr); font-size: 12px; font-weight: 600; }
.chip.warn { background: rgba(217, 48, 37, .1); color: #D93025; }
.icon-btn { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; }
.icon-btn:hover { background: rgba(217, 48, 37, .1); color: var(--danger, #D93025); }
.empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
</style>
