<template>
  <div class="dvr">
    <div class="dvr-head">
      <div>
        <h1 class="dvr-h1">Devoirs &amp; examens</h1>
        <p class="dvr-sub">Créez et suivez les évaluations de vos unités d'enseignement.</p>
      </div>
    </div>

    <!-- Créer -->
    <section class="dvr-panel">
      <h2 class="dvr-h2">Nouvelle évaluation</h2>
      <div class="dvr-row">
        <div class="dvr-fg">
          <label>Type</label>
          <select v-model="form.type" class="dvr-input">
            <option value="devoir">Devoir</option>
            <option value="examen">Examen</option>
          </select>
        </div>
        <div class="dvr-fg dvr-grow">
          <label>Unité d'enseignement</label>
          <select v-model="form.ueId" class="dvr-input">
            <option value="">— Choisir une UE —</option>
            <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
          </select>
        </div>
        <div class="dvr-fg">
          <label>Date</label>
          <input v-model="form.date" class="dvr-input" type="date" />
        </div>
      </div>
      <div class="dvr-fg">
        <label>Titre</label>
        <input v-model="form.titre" class="dvr-input" type="text" placeholder="Ex. Devoir surveillé n°2" />
      </div>
      <div class="dvr-fg">
        <div class="dvr-consigne-lab">
          <label>Consignes</label>
          <button class="dvr-miapo" type="button" @click="genererMiapo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>
            Générer avec MIAPO
          </button>
        </div>
        <textarea v-model="form.consignes" class="dvr-input" rows="5" placeholder="Énoncé, barème, durée conseillée…"></textarea>
      </div>
      <div class="dvr-actions">
        <button class="dvr-btn" type="button" :disabled="!canCreate" @click="creer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Créer l'évaluation
        </button>
        <transition name="dvr-fade"><span v-if="justCreated" class="dvr-ok">✓ Enregistré</span></transition>
      </div>
    </section>

    <!-- Liste -->
    <section class="dvr-panel">
      <div class="dvr-panel-head">
        <h2 class="dvr-h2">Évaluations programmées</h2>
        <span class="dvr-count">{{ items.length }}</span>
      </div>
      <table v-if="items.length" class="dvr-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Titre</th>
            <th>UE</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td><span class="dvr-badge" :class="'t-' + it.type">{{ it.type === 'examen' ? 'Examen' : 'Devoir' }}</span></td>
            <td class="dvr-title">{{ it.titre }}</td>
            <td class="dvr-ue">{{ it.ueCode || '—' }}</td>
            <td>{{ fmtDate(it.date) }}</td>
            <td class="dvr-right">
              <button class="dvr-del" type="button" title="Supprimer" @click="supprimer(it.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="dvr-empty">Aucune évaluation programmée pour l'instant.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// ── Persistance localStorage (démo) : clé sup_devoirs ──
const LS_KEY = 'sup_devoirs'
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch (e) { return [] }
}
const items = ref(load())
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items.value)) } catch (e) { /* silent */ }
}

const form = reactive({ type: 'devoir', ueId: '', date: '', titre: '', consignes: '' })
const justCreated = ref(false)
const canCreate = computed(() => form.titre.trim() && form.ueId)

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch (e) { return iso }
}

// « Générer avec MIAPO » — suggestion LOCALE (aucun appel réseau). Pré-remplit
// des consignes structurées à partir de l'UE et du type choisis, que
// l'enseignant peut ensuite ajuster.
function genererMiapo() {
  const ue = mesUe.find((u) => u.id === form.ueId)
  const intitule = ue ? ue.intitule : "l'unité d'enseignement"
  const estExamen = form.type === 'examen'
  const duree = estExamen ? '2 heures' : '1 heure'
  const lignes = [
    `${estExamen ? 'Examen' : 'Devoir'} — ${intitule}`,
    `Durée conseillée : ${duree}. Documents non autorisés.`,
    '',
    'Exercice 1 (8 pts) — Questions de cours : définir les notions clés et illustrer par un exemple.',
    'Exercice 2 (7 pts) — Étude de cas : analyser la situation proposée et justifier votre raisonnement.',
    'Exercice 3 (5 pts) — Application chiffrée : résoudre et commenter les résultats obtenus.',
    '',
    'Barème sur 20. Le soin de la rédaction et la clarté du raisonnement sont valorisés.',
  ]
  if (!form.titre.trim()) {
    form.titre = `${estExamen ? 'Examen' : 'Devoir'} — ${ue ? ue.code : ''}`.trim()
  }
  form.consignes = lignes.join('\n')
}

function creer() {
  if (!canCreate.value) return
  const ue = mesUe.find((u) => u.id === form.ueId)
  items.value.unshift({
    id: 'dvr-' + Date.now().toString(36),
    type: form.type,
    ueId: form.ueId,
    ueCode: ue ? ue.code : '',
    titre: form.titre.trim(),
    date: form.date || '',
    consignes: form.consignes.trim(),
    auteur: moi.nomComplet || '',
    createdAt: new Date().toISOString(),
  })
  persist()
  form.titre = ''; form.consignes = ''; form.date = ''
  justCreated.value = true
  setTimeout(() => { justCreated.value = false }, 2200)
}
function supprimer(id) {
  items.value = items.value.filter((x) => x.id !== id)
  persist()
}
</script>

<style scoped>
.dvr { display: flex; flex-direction: column; gap: 16px; }
.dvr-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dvr-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.dvr-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.dvr-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.dvr-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--tx, #1A1D1F); margin: 0 0 14px; }
.dvr-panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.dvr-panel-head .dvr-h2 { margin: 0; }
.dvr-count { font-size: 12px; font-weight: 700; color: var(--tx2); background: var(--input-bg, rgba(20,32,64,.05)); padding: 2px 9px; border-radius: 20px; }
.dvr-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.dvr-fg { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 170px; margin-bottom: 12px; }
.dvr-fg.dvr-grow { flex: 2; }
.dvr-row .dvr-fg { margin-bottom: 0; }
.dvr-fg label { font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); }
.dvr-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 14px; color: var(--tx, #23262E); background: var(--input-bg, rgba(20,32,64,.04)); border: 1px solid var(--border, rgba(20,32,64,.12)); border-radius: 9px; padding: 9px 12px; }
.dvr-input:focus { outline: none; border-color: var(--pr); background: #fff; }
textarea.dvr-input { resize: vertical; }
.dvr-consigne-lab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dvr-miapo { display: inline-flex; align-items: center; gap: 6px; background: rgba(124,58,237,.10); color: #7C3AED; border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 6px 11px; cursor: pointer; transition: background .15s ease; }
.dvr-miapo:hover { background: rgba(124,58,237,.18); }
.dvr-actions { display: flex; align-items: center; gap: 12px; }
.dvr-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--pr); color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 700; font-size: 13.5px; padding: 10px 18px; cursor: pointer; }
.dvr-btn:disabled { opacity: .5; cursor: not-allowed; }
.dvr-ok { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.dvr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dvr-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.dvr-table td { padding: 10px 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.dvr-table tbody tr:last-child td { border-bottom: none; }
.dvr-title { font-weight: 600; }
.dvr-ue { color: var(--pr); font-weight: 700; }
.dvr-right { text-align: right; }
.dvr-badge { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.dvr-badge.t-devoir { color: #C2751A; background: rgba(232, 149, 58, .16); }
.dvr-badge.t-examen { color: #B3261E; background: rgba(179, 38, 30, .10); }
.dvr-del { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--input-bg, rgba(20,32,64,.04)); border: none; border-radius: 8px; color: var(--tx3, #9AA2B1); cursor: pointer; transition: all .15s ease; }
.dvr-del:hover { background: rgba(217,48,37,.10); color: #D93025; }
.dvr-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
.dvr-fade-enter-active, .dvr-fade-leave-active { transition: opacity .3s ease; }
.dvr-fade-enter-from, .dvr-fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .dvr-h1 { font-size: 20px; } .dvr-fg { min-width: 0; } }
</style>
