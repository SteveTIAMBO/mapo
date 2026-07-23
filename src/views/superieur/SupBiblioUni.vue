<template>
  <div class="svc">
    <div class="svc-intro">
      <div>
        <h1 class="svc-h1">Bibliothèque universitaire</h1>
        <p class="svc-sub">Fonds documentaire, mémoires archivés et périodiques.</p>
      </div>
      <button class="svc-btn" type="button" @click="showAdd = !showAdd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Ajouter une référence
      </button>
    </div>

    <div class="svc-kpis">
      <div class="svc-kpi"><div class="svc-kpi-label">Références</div><div class="svc-kpi-value">{{ store.biblio.length }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Exemplaires</div><div class="svc-kpi-value">{{ store.biblioTotal }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Disponibles</div><div class="svc-kpi-value">{{ store.biblioDispo }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Mémoires archivés</div><div class="svc-kpi-value">{{ store.biblioMemoires }}</div></div>
    </div>

    <div v-if="showAdd" class="svc-card">
      <div class="svc-form">
        <div class="fld"><label>Titre</label><input v-model="nb.titre" class="in" placeholder="Titre de la référence" /></div>
        <div class="fld"><label>Auteur</label><input v-model="nb.auteur" class="in" placeholder="Auteur" /></div>
        <div class="fld"><label>Type</label>
          <select v-model="nb.type" class="in"><option>Ouvrage</option><option>Mémoire</option><option>Thèse</option><option>Périodique</option><option>Support de cours</option></select>
        </div>
        <div class="fld"><label>Cote</label><input v-model="nb.cote" class="in" placeholder="Ex. QA76.6" /></div>
        <div class="fld"><label>Exemplaires</label><input v-model.number="nb.total" type="number" min="1" class="in" /></div>
      </div>
      <div class="svc-actions">
        <button class="svc-btn-ghost" @click="showAdd = false">Annuler</button>
        <button class="svc-btn" :disabled="!nb.titre.trim()" @click="save">Enregistrer</button>
      </div>
    </div>

    <div class="svc-card">
      <table class="svc-table" v-if="store.biblio.length">
        <thead><tr><th>Titre</th><th>Auteur</th><th>Type</th><th>Cote</th><th>Disponibles</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in store.biblio" :key="o.id">
            <td><strong>{{ o.titre }}</strong></td>
            <td class="svc-muted">{{ o.auteur || '—' }}</td>
            <td><span class="svc-badge" :class="typeClass(o.type)">{{ o.type }}</span></td>
            <td class="svc-muted"><code class="svc-ref">{{ o.cote || '—' }}</code></td>
            <td>{{ o.dispo }} / {{ o.total }}</td>
            <td class="svc-r">
              <button class="svc-icon" title="Supprimer" @click="store.removeBiblio(o.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="svc-empty">Aucune référence. Ajoutez-en une pour commencer.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSuperieurServicesStore } from '../../stores/superieurServices'

const store = useSuperieurServicesStore()
const showAdd = ref(false)
const nb = ref({ titre: '', auteur: '', type: 'Ouvrage', cote: '', total: 1 })

function typeClass(t) { return t === 'Mémoire' || t === 'Thèse' ? 'mem' : t === 'Périodique' ? 'per' : 'ouv' }
function save() {
  if (!nb.value.titre.trim()) return
  store.addBiblio({ ...nb.value })
  nb.value = { titre: '', auteur: '', type: 'Ouvrage', cote: '', total: 1 }
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
.svc-muted { color: var(--tx3); }
.svc-ref { font-family: ui-monospace, monospace; font-size: 12px; }
.svc-r { text-align: right; white-space: nowrap; }
.svc-badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.svc-badge.ouv { background: rgba(var(--pr-rgb), .1); color: var(--pr); }
.svc-badge.mem { background: rgba(124, 92, 255, .14); color: #6b46ff; }
.svc-badge.per { background: rgba(251, 188, 5, .16); color: #b26a00; }
.svc-icon { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; vertical-align: middle; }
.svc-icon:hover { background: rgba(217, 48, 37, .1); color: #D93025; }
.svc-empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
</style>
