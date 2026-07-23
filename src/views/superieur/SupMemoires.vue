<template>
  <div class="svc">
    <div class="svc-intro">
      <div>
        <h1 class="svc-h1">Mémoires &amp; soutenances</h1>
        <p class="svc-sub">Suivi des mémoires, jurys et dates de soutenance.</p>
      </div>
      <button class="svc-btn" type="button" @click="showAdd = !showAdd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Enregistrer un mémoire
      </button>
    </div>

    <div class="svc-kpis">
      <div class="svc-kpi"><div class="svc-kpi-label">Total</div><div class="svc-kpi-value">{{ store.memoires.length }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">En cours</div><div class="svc-kpi-value">{{ store.memEnCours }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Soutenances planifiées</div><div class="svc-kpi-value">{{ store.memPlanifies }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Soutenus</div><div class="svc-kpi-value">{{ store.memSoutenus }}</div></div>
    </div>

    <div v-if="showAdd" class="svc-card">
      <div class="svc-form">
        <div class="fld"><label>Titre du mémoire</label><input v-model="nm.titre" class="in" placeholder="Sujet" /></div>
        <div class="fld"><label>Étudiant</label><input v-model="nm.etudiant" class="in" placeholder="Nom" /></div>
        <div class="fld"><label>Formation</label><input v-model="nm.formation" class="in" placeholder="Ex. Master 2 Informatique" /></div>
        <div class="fld"><label>Directeur de mémoire</label><input v-model="nm.directeur" class="in" placeholder="Encadrant" /></div>
        <div class="fld"><label>Date de soutenance</label><input v-model="nm.date" type="date" class="in" /></div>
        <div class="fld"><label>Statut</label>
          <select v-model="nm.statut" class="in"><option value="en_cours">En cours</option><option value="planifie">Soutenance planifiée</option><option value="soutenu">Soutenu</option></select>
        </div>
      </div>
      <div class="svc-actions">
        <button class="svc-btn-ghost" @click="showAdd = false">Annuler</button>
        <button class="svc-btn" :disabled="!nm.titre.trim() || !nm.etudiant.trim()" @click="save">Enregistrer</button>
      </div>
    </div>

    <div class="svc-card">
      <table class="svc-table" v-if="store.memoires.length">
        <thead><tr><th>Mémoire</th><th>Étudiant</th><th>Directeur</th><th>Soutenance</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          <tr v-for="m in store.memoires" :key="m.id">
            <td><strong>{{ m.titre }}</strong><div class="svc-muted">{{ m.formation }}</div></td>
            <td>{{ m.etudiant }}</td>
            <td class="svc-muted">{{ m.directeur || '—' }}</td>
            <td>{{ fmtDate(m.date) }}</td>
            <td>
              <span class="svc-badge" :class="m.statut">{{ statutLabel(m.statut) }}</span>
              <span v-if="m.mention" class="svc-mention">{{ m.mention }}</span>
            </td>
            <td class="svc-r">
              <button v-if="m.statut !== 'soutenu'" class="svc-mini" @click="marquerSoutenu(m)">Marquer soutenu</button>
              <button class="svc-icon" title="Supprimer" @click="store.removeMemoire(m.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="svc-empty">Aucun mémoire enregistré.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSuperieurServicesStore } from '../../stores/superieurServices'

const store = useSuperieurServicesStore()
const showAdd = ref(false)
const nm = ref({ titre: '', etudiant: '', formation: '', directeur: '', date: '', statut: 'en_cours' })

function fmtDate(d) { if (!d) return '—'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }
function statutLabel(s) { return s === 'soutenu' ? 'Soutenu' : s === 'planifie' ? 'Planifiée' : 'En cours' }
function marquerSoutenu(m) {
  const mention = window.prompt('Mention (Passable, Assez bien, Bien, Très bien, Excellent) :', 'Bien')
  store.setMemoireStatut(m.id, 'soutenu', (mention || '').trim())
}
function save() {
  if (!nm.value.titre.trim() || !nm.value.etudiant.trim()) return
  store.addMemoire({ ...nm.value })
  nm.value = { titre: '', etudiant: '', formation: '', directeur: '', date: '', statut: 'en_cours' }
  showAdd.value = false
}
</script>

<style scoped>
.svc { max-width: 1100px; }
.svc-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.svc-h1 { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--tx); margin: 0 0 4px; }
.svc-sub { color: var(--tx3); font-size: 14px; margin: 0; }
.svc-btn { display: inline-flex; align-items: center; gap: 7px; background: var(--pr); color: #fff; border: none; border-radius: 10px; padding: 9px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.svc-btn:disabled { opacity: .5; cursor: not-allowed; }
.svc-btn-ghost { background: none; border: 1px solid var(--divider); color: var(--tx2, var(--tx)); border-radius: 10px; padding: 9px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.svc-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.svc-kpi { background: var(--surface, #fff); border: 1px solid var(--divider); border-radius: 14px; padding: 14px 16px; }
.svc-kpi-label { font-size: 12px; color: var(--tx3); font-weight: 600; margin-bottom: 6px; }
.svc-kpi-value { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--tx); }
.svc-card { background: var(--surface, #fff); border: 1px solid var(--divider); border-radius: 16px; padding: 18px; margin-bottom: 18px; }
.svc-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 12px; font-weight: 600; color: var(--tx3); }
.in { border: 1px solid var(--divider); border-radius: 9px; padding: 9px 11px; font-size: 14px; background: var(--input-bg, #fff); color: var(--tx); width: 100%; }
.svc-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.svc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.svc-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3); font-weight: 700; padding: 8px 10px; border-bottom: 1px solid var(--divider); }
.svc-table td { padding: 11px 10px; border-bottom: 1px solid var(--divider); color: var(--tx); vertical-align: middle; }
.svc-table tr:last-child td { border-bottom: none; }
.svc-muted { color: var(--tx3); font-size: 12.5px; }
.svc-r { text-align: right; white-space: nowrap; }
.svc-badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.svc-badge.en_cours { background: rgba(var(--pr-rgb), .1); color: var(--pr); }
.svc-badge.planifie { background: rgba(251, 188, 5, .16); color: #b26a00; }
.svc-badge.soutenu { background: rgba(52, 168, 83, .14); color: #1e8e3e; }
.svc-mention { margin-left: 7px; font-size: 12px; color: var(--tx3); }
.svc-mini { border: 1px solid var(--divider); background: none; color: var(--tx); border-radius: 8px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-right: 8px; }
.svc-mini:hover { border-color: var(--pr); color: var(--pr); }
.svc-icon { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; vertical-align: middle; }
.svc-icon:hover { background: rgba(217, 48, 37, .1); color: #D93025; }
.svc-empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
</style>
