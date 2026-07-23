<template>
  <div class="mod-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Cantine</h1>
        <p>Menu de la semaine et demi-pensionnaires.</p>
      </div>
      <button class="btn btn-primary" @click="showAddInscrit = !showAddInscrit"><Plus :size="16" /> <span>Inscrire un élève</span></button>
    </div>

    <div class="stat-bar" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item"><span class="stat-bar-dot blue"></span><div><div class="stat-bar-value">{{ store.totalInscrits }}</div><div class="stat-bar-label">Demi-pensionnaires</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot green"></span><div><div class="stat-bar-value">{{ store.totalAJour }}</div><div class="stat-bar-label">À jour</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot" style="background: var(--danger, #D93025)"></span><div><div class="stat-bar-value">{{ store.totalImpayes }}</div><div class="stat-bar-label">Impayés</div></div></div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">Menu de la semaine</h3>
      <table class="data-table">
        <thead><tr><th style="width: 130px;">Jour</th><th>Plat principal</th><th>Accompagnement</th><th></th></tr></thead>
        <tbody>
          <tr v-for="m in store.menuOrdonne" :key="m.id">
            <td><strong>{{ m.jour }}</strong></td>
            <template v-if="editJour === m.jour">
              <td><input v-model="em.plat" class="input" placeholder="Plat" /></td>
              <td><input v-model="em.accompagnement" class="input" placeholder="Accompagnement" /></td>
              <td class="ta-right"><button class="btn btn-primary btn-sm" @click="saveMenu(m.jour)"><Check :size="14" /></button></td>
            </template>
            <template v-else>
              <td>{{ m.plat || '—' }}</td>
              <td class="muted">{{ m.accompagnement || '—' }}</td>
              <td class="ta-right"><button class="icon-btn edit" title="Modifier" @click="startEdit(m)"><Pencil :size="15" /></button></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-head-row">
        <h3 class="card-title">Demi-pensionnaires</h3>
        <button class="btn btn-outline btn-sm" @click="showAddInscrit = !showAddInscrit"><Plus :size="14" /> Inscrire</button>
      </div>
      <div v-if="showAddInscrit" class="sub-form">
        <div class="form-grid">
          <div class="field"><label>Élève</label><input v-model="ni.eleve" class="input" placeholder="Nom de l'élève" /></div>
          <div class="field"><label>Classe</label><input v-model="ni.classe" class="input" placeholder="Ex. 3ème C" /></div>
          <div class="field"><label>Formule</label>
            <select v-model="ni.formule" class="input"><option>Mensuel</option><option>Trimestriel</option><option>Annuel</option><option>Ticket</option></select>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" @click="showAddInscrit = false">Annuler</button>
          <button class="btn btn-primary" :disabled="!ni.eleve.trim()" @click="saveInscrit"><Check :size="15" /> Enregistrer</button>
        </div>
      </div>
      <table class="data-table" v-if="store.inscrits.length">
        <thead><tr><th>Élève</th><th>Classe</th><th>Formule</th><th>Paiement</th><th></th></tr></thead>
        <tbody>
          <tr v-for="i in store.inscrits" :key="i.id">
            <td>{{ i.eleve }}</td>
            <td>{{ i.classe }}</td>
            <td><span class="chip">{{ i.formule }}</span></td>
            <td><button class="chip-btn" :class="i.statut" @click="store.toggleStatut(i.id)">{{ i.statut === 'a_jour' ? 'À jour' : 'Impayé' }}</button></td>
            <td class="ta-right"><button class="icon-btn" title="Retirer" @click="store.removeInscrit(i.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucun demi-pensionnaire.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Check, Trash2, Pencil } from 'lucide-vue-next'
import { useCantineStore } from '../stores/cantine'

const store = useCantineStore()
const showAddInscrit = ref(false)
const ni = ref({ eleve: '', classe: '', formule: 'Mensuel' })
const editJour = ref('')
const em = ref({ plat: '', accompagnement: '' })

function startEdit(m) { editJour.value = m.jour; em.value = { plat: m.plat, accompagnement: m.accompagnement } }
function saveMenu(jour) { store.setMenu({ jour, ...em.value }); editJour.value = '' }
function saveInscrit() {
  if (!ni.value.eleve.trim()) return
  store.addInscrit({ ...ni.value })
  ni.value = { eleve: '', classe: '', formule: 'Mensuel' }
  showAddInscrit.value = false
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
.data-table td { padding: 11px 10px; border-bottom: 1px solid var(--divider); color: var(--tx); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.ta-right { text-align: right; }
.muted { color: var(--tx3); }
.chip { display: inline-block; padding: 3px 9px; border-radius: 999px; background: rgba(var(--pr-rgb), .1); color: var(--pr); font-size: 12px; font-weight: 600; }
.chip-btn { border: none; cursor: pointer; padding: 3px 11px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.chip-btn.a_jour { background: rgba(52, 168, 83, .12); color: #1e8e3e; }
.chip-btn.impaye { background: rgba(217, 48, 37, .1); color: #D93025; }
.icon-btn { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; }
.icon-btn:hover { background: rgba(217, 48, 37, .1); color: var(--danger, #D93025); }
.icon-btn.edit:hover { background: rgba(var(--pr-rgb), .12); color: var(--pr); }
.empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
</style>
