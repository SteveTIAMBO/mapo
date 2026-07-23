<template>
  <div class="svc">
    <div class="svc-intro">
      <div>
        <h1 class="svc-h1">Congés du personnel</h1>
        <p class="svc-sub">Demandes de congé des enseignants et du personnel administratif.</p>
      </div>
      <button class="svc-btn" type="button" @click="showAdd = !showAdd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Nouvelle demande
      </button>
    </div>

    <div class="svc-kpis">
      <div class="svc-kpi"><div class="svc-kpi-label">Demandes</div><div class="svc-kpi-value">{{ store.conges.length }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">En attente</div><div class="svc-kpi-value">{{ store.congesEnAttente }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Approuvés</div><div class="svc-kpi-value">{{ store.congesApprouves }}</div></div>
    </div>

    <div v-if="showAdd" class="svc-card">
      <div class="svc-form">
        <div class="fld"><label>Agent</label><input v-model="nc.agent" class="in" placeholder="Nom" /></div>
        <div class="fld"><label>Fonction</label><input v-model="nc.fonction" class="in" placeholder="Ex. Enseignant-chercheur" /></div>
        <div class="fld"><label>Type de congé</label>
          <select v-model="nc.type" class="in"><option>Congé annuel</option><option>Congé maladie</option><option>Congé maternité</option><option>Congé sans solde</option><option>Autorisation d'absence</option></select>
        </div>
        <div class="fld"><label>Début</label><input v-model="nc.debut" type="date" class="in" /></div>
        <div class="fld"><label>Fin</label><input v-model="nc.fin" type="date" class="in" /></div>
      </div>
      <div class="svc-actions">
        <button class="svc-btn-ghost" @click="showAdd = false">Annuler</button>
        <button class="svc-btn" :disabled="!nc.agent.trim() || !nc.debut" @click="save">Enregistrer la demande</button>
      </div>
    </div>

    <div class="svc-card">
      <table class="svc-table" v-if="store.conges.length">
        <thead><tr><th>Agent</th><th>Type</th><th>Période</th><th>Durée</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in store.conges" :key="c.id">
            <td><strong>{{ c.agent }}</strong><div class="svc-muted">{{ c.fonction }}</div></td>
            <td>{{ c.type }}</td>
            <td>{{ fmtDate(c.debut) }} → {{ fmtDate(c.fin) }}</td>
            <td>{{ duree(c) }} j</td>
            <td><span class="svc-badge" :class="c.statut">{{ statutLabel(c.statut) }}</span></td>
            <td class="svc-r">
              <template v-if="c.statut === 'en_attente'">
                <button class="svc-mini ok" @click="store.setCongeStatut(c.id, 'approuve')">Approuver</button>
                <button class="svc-mini no" @click="store.setCongeStatut(c.id, 'refuse')">Refuser</button>
              </template>
              <button class="svc-icon" title="Supprimer" @click="store.removeConge(c.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="svc-empty">Aucune demande de congé.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSuperieurServicesStore } from '../../stores/superieurServices'

const store = useSuperieurServicesStore()
const showAdd = ref(false)
const nc = ref({ agent: '', fonction: '', type: 'Congé annuel', debut: '', fin: '' })

function fmtDate(d) { if (!d) return '—'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }
function duree(c) {
  if (!c.debut || !c.fin) return '—'
  const a = new Date(c.debut), b = new Date(c.fin)
  const n = Math.round((b - a) / 86400000) + 1
  return n > 0 ? n : '—'
}
function statutLabel(s) { return s === 'approuve' ? 'Approuvé' : s === 'refuse' ? 'Refusé' : 'En attente' }
function save() {
  if (!nc.value.agent.trim() || !nc.value.debut) return
  store.addConge({ ...nc.value })
  nc.value = { agent: '', fonction: '', type: 'Congé annuel', debut: '', fin: '' }
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
.svc-btn-ghost { background: none; border: 1px solid var(--divider); color: var(--tx); border-radius: 10px; padding: 9px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
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
.svc-badge.en_attente { background: rgba(251, 188, 5, .16); color: #b26a00; }
.svc-badge.approuve { background: rgba(52, 168, 83, .14); color: #1e8e3e; }
.svc-badge.refuse { background: rgba(217, 48, 37, .1); color: #D93025; }
.svc-mini { border: 1px solid var(--divider); background: none; color: var(--tx); border-radius: 8px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-right: 6px; }
.svc-mini.ok:hover { border-color: #1e8e3e; color: #1e8e3e; }
.svc-mini.no:hover { border-color: #D93025; color: #D93025; }
.svc-icon { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; vertical-align: middle; }
.svc-icon:hover { background: rgba(217, 48, 37, .1); color: #D93025; }
.svc-empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
</style>
