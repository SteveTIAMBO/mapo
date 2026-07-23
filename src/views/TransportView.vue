<template>
  <div class="mod-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Transport scolaire</h1>
        <p>Circuits de ramassage, chauffeurs et élèves abonnés.</p>
      </div>
      <button class="btn btn-primary" @click="showAddLigne = !showAddLigne"><Plus :size="16" /> <span>Ajouter une ligne</span></button>
    </div>

    <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item"><span class="stat-bar-dot blue"></span><div><div class="stat-bar-value">{{ store.totalLignes }}</div><div class="stat-bar-label">Lignes</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot green"></span><div><div class="stat-bar-value">{{ store.totalAbonnes }}</div><div class="stat-bar-label">Abonnés</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot orange"></span><div><div class="stat-bar-value">{{ store.placesRestantes }}</div><div class="stat-bar-label">Places libres</div></div></div>
      <div class="stat-bar-item"><span class="stat-bar-dot" style="background: var(--danger, #D93025)"></span><div><div class="stat-bar-value">{{ store.totalImpayes }}</div><div class="stat-bar-label">Impayés</div></div></div>
    </div>

    <div v-if="showAddLigne" class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">Nouvelle ligne</h3>
      <div class="form-grid">
        <div class="field"><label>Nom / trajet</label><input v-model="nlg.nom" class="input" placeholder="Ex. Ligne A — Centre-ville" /></div>
        <div class="field"><label>Chauffeur</label><input v-model="nlg.chauffeur" class="input" placeholder="Nom du chauffeur" /></div>
        <div class="field"><label>Immatriculation</label><input v-model="nlg.immat" class="input" placeholder="Ex. CE 4521 A" /></div>
        <div class="field"><label>Capacité</label><input v-model.number="nlg.capacite" type="number" min="1" class="input" /></div>
        <div class="field"><label>Départ</label><input v-model="nlg.depart" type="time" class="input" /></div>
        <div class="field"><label>Tarif (FCFA)</label><input v-model.number="nlg.tarif" type="number" min="0" class="input" /></div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" @click="showAddLigne = false">Annuler</button>
        <button class="btn btn-primary" :disabled="!nlg.nom.trim()" @click="saveLigne"><Check :size="15" /> Enregistrer</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="card-head-row">
        <h3 class="card-title">Élèves abonnés</h3>
        <button class="btn btn-outline btn-sm" @click="showAddAbo = !showAddAbo"><Plus :size="14" /> Nouvel abonné</button>
      </div>
      <div v-if="showAddAbo" class="sub-form">
        <div class="form-grid">
          <div class="field"><label>Ligne</label>
            <select v-model="nab.ligneId" class="input">
              <option value="" disabled>Choisir une ligne</option>
              <option v-for="l in store.lignes" :key="l.id" :value="l.id">{{ l.nom }}</option>
            </select>
          </div>
          <div class="field"><label>Élève</label><input v-model="nab.eleve" class="input" placeholder="Nom de l'élève" /></div>
          <div class="field"><label>Classe</label><input v-model="nab.classe" class="input" placeholder="Ex. 3ème C" /></div>
          <div class="field"><label>Arrêt</label><input v-model="nab.arret" class="input" placeholder="Point de montée" /></div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" @click="showAddAbo = false">Annuler</button>
          <button class="btn btn-primary" :disabled="!nab.ligneId || !nab.eleve.trim()" @click="saveAbo"><Check :size="15" /> Enregistrer</button>
        </div>
      </div>
      <table class="data-table" v-if="store.abonnes.length">
        <thead><tr><th>Élève</th><th>Classe</th><th>Ligne</th><th>Arrêt</th><th>Paiement</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in store.abonnes" :key="a.id">
            <td>{{ a.eleve }}</td>
            <td>{{ a.classe }}</td>
            <td class="muted">{{ store.nomLigne(a.ligneId) }}</td>
            <td class="muted">{{ a.arret || '—' }}</td>
            <td><button class="chip-btn" :class="a.statut" @click="store.toggleStatut(a.id)">{{ a.statut === 'a_jour' ? 'À jour' : 'Impayé' }}</button></td>
            <td class="ta-right"><button class="icon-btn" title="Retirer" @click="store.removeAbonne(a.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucun élève abonné.</p>
    </div>

    <div class="card">
      <h3 class="card-title">Lignes & chauffeurs</h3>
      <table class="data-table" v-if="store.lignes.length">
        <thead><tr><th>Ligne</th><th>Chauffeur</th><th>Immat.</th><th>Départ</th><th>Occupation</th><th>Tarif</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in store.lignes" :key="l.id">
            <td>{{ l.nom }}</td>
            <td class="muted">{{ l.chauffeur || '—' }}</td>
            <td class="muted">{{ l.immat || '—' }}</td>
            <td>{{ l.depart || '—' }}</td>
            <td>{{ store.abonnesDe(l.id).length }} / {{ l.capacite }}</td>
            <td>{{ fmtMoney(l.tarif) }}</td>
            <td class="ta-right"><button class="icon-btn" title="Supprimer" @click="store.removeLigne(l.id)"><Trash2 :size="15" /></button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Aucune ligne. Ajoutez-en une pour commencer.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Check, Trash2 } from 'lucide-vue-next'
import { useTransportStore } from '../stores/transport'

const store = useTransportStore()
const showAddLigne = ref(false)
const showAddAbo = ref(false)
const nlg = ref({ nom: '', chauffeur: '', immat: '', capacite: 25, depart: '', tarif: 0 })
const nab = ref({ ligneId: '', eleve: '', classe: '', arret: '' })

function fmtMoney(n) { const v = Number(n) || 0; return v ? v.toLocaleString('fr-FR') + ' F' : '—' }
function saveLigne() {
  if (!nlg.value.nom.trim()) return
  store.addLigne({ ...nlg.value })
  nlg.value = { nom: '', chauffeur: '', immat: '', capacite: 25, depart: '', tarif: 0 }
  showAddLigne.value = false
}
function saveAbo() {
  if (!nab.value.ligneId || !nab.value.eleve.trim()) return
  store.addAbonne({ ...nab.value })
  nab.value = { ligneId: '', eleve: '', classe: '', arret: '' }
  showAddAbo.value = false
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
.chip-btn { border: none; cursor: pointer; padding: 3px 11px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.chip-btn.a_jour { background: rgba(52, 168, 83, .12); color: #1e8e3e; }
.chip-btn.impaye { background: rgba(217, 48, 37, .1); color: #D93025; }
.icon-btn { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; }
.icon-btn:hover { background: rgba(217, 48, 37, .1); color: var(--danger, #D93025); }
.empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
</style>
