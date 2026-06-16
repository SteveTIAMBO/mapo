<template>
  <div class="ex-page">
    <!-- ====== Liste des examens ====== -->
    <template v-if="!selectedExam">
      <header class="ex-head">
        <div>
          <h1 class="ex-title">Examens nationaux</h1>
          <p class="ex-sub">Inscriptions, résultats et taux de réussite (CEP, BEPC, Probatoire, Baccalauréat).</p>
        </div>
        <button class="btn btn-primary" type="button" @click="showCreate = true">+ Nouvel examen</button>
      </header>

      <!-- KPIs globaux -->
      <div class="ex-kpis">
        <div class="ex-kpi">
          <div class="ex-kpi-label">Sessions</div>
          <div class="ex-kpi-value">{{ store.exams.length }}</div>
        </div>
        <div class="ex-kpi">
          <div class="ex-kpi-label">Candidats</div>
          <div class="ex-kpi-value">{{ globalStats.candidats }}</div>
        </div>
        <div class="ex-kpi">
          <div class="ex-kpi-label">Admis</div>
          <div class="ex-kpi-value">{{ globalStats.admis }}</div>
        </div>
        <div class="ex-kpi ex-kpi-accent">
          <div class="ex-kpi-label">Taux de réussite moyen</div>
          <div class="ex-kpi-value">{{ globalStats.taux }}%</div>
        </div>
      </div>

      <div v-if="!store.exams.length" class="ex-empty">
        Aucun examen pour l'instant. Cliquez sur « Nouvel examen » pour commencer.
      </div>
      <div v-else class="ex-grid">
        <article v-for="ex in store.examsSorted" :key="ex.id" class="ex-card" @click="openExam(ex.id)">
          <div class="ex-c-head">
            <div>
              <div class="ex-c-name">{{ ex.label }}</div>
              <div class="ex-c-meta">{{ niveauLabel(ex.niveau) }} · {{ ex.annee }}</div>
            </div>
            <button class="ex-c-del" type="button" title="Supprimer" @click.stop="supprimer(ex.id)">✕</button>
          </div>
          <div class="ex-c-taux">
            <span class="ex-c-taux-val">{{ statOf(ex.id).taux }}%</span>
            <span class="ex-c-taux-lbl">de réussite</span>
          </div>
          <div class="ex-bar"><div class="ex-bar-fill" :style="{ width: statOf(ex.id).taux + '%' }"></div></div>
          <div class="ex-c-foot">
            <span>{{ statOf(ex.id).admis }} admis / {{ statOf(ex.id).presents }} présents</span>
            <span>{{ statOf(ex.id).inscrits }} inscrits</span>
          </div>
        </article>
      </div>
    </template>

    <!-- ====== Détail d'un examen (candidats) ====== -->
    <template v-else>
      <button class="ex-back" type="button" @click="selectedExamId = null">← Tous les examens</button>
      <header class="ex-head">
        <div>
          <h1 class="ex-title">{{ selectedExam.label }} <span class="ex-title-year">{{ selectedExam.annee }}</span></h1>
          <p class="ex-sub">{{ niveauLabel(selectedExam.niveau) }} — {{ store.getType(selectedExam.type)?.desc }}</p>
        </div>
        <div class="ex-detail-actions">
          <button v-if="candidats.length" class="btn btn-outline btn-sm" type="button" @click="exporter">Exporter</button>
          <button class="btn btn-primary btn-sm" type="button" @click="inscrire">Inscrire la {{ niveauLabel(selectedExam.niveau) }}</button>
        </div>
      </header>

      <!-- Stats de la session -->
      <div class="ex-stats">
        <div class="ex-stat"><b>{{ detailStats.inscrits }}</b><span>Inscrits</span></div>
        <div class="ex-stat"><b>{{ detailStats.presents }}</b><span>Présents</span></div>
        <div class="ex-stat ex-stat-ok"><b>{{ detailStats.admis }}</b><span>Admis</span></div>
        <div class="ex-stat ex-stat-ko"><b>{{ detailStats.ajournes }}</b><span>Ajournés</span></div>
        <div class="ex-stat"><b>{{ detailStats.absents }}</b><span>Absents</span></div>
        <div class="ex-stat ex-stat-accent"><b>{{ detailStats.taux }}%</b><span>Réussite</span></div>
      </div>

      <div v-if="!candidats.length" class="ex-empty">
        Aucun candidat. Cliquez sur « Inscrire la {{ niveauLabel(selectedExam.niveau) }} » pour ajouter automatiquement les élèves du niveau.
      </div>
      <section v-else class="ex-tablecard">
        <table class="ex-table">
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Classe</th>
              <th>N° table</th>
              <th>Résultat</th>
              <th>Mention</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in candidats" :key="c.eleveId">
              <td class="ex-td-name">{{ c.eleveName }}</td>
              <td>{{ c.className }}</td>
              <td>
                <input class="ex-input ex-input-sm" :value="c.numeroTable"
                  @change="store.updateCandidat(selectedExam.id, c.eleveId, { numeroTable: $event.target.value })" placeholder="—" />
              </td>
              <td>
                <select class="ex-input" :value="c.statut"
                  @change="onStatut(c, $event.target.value)">
                  <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </td>
              <td>
                <select v-if="c.statut === 'admis'" class="ex-input" :value="c.mention"
                  @change="store.updateCandidat(selectedExam.id, c.eleveId, { mention: $event.target.value })">
                  <option value="">— Mention —</option>
                  <option v-for="m in mentions" :key="m" :value="m">{{ m }}</option>
                </select>
                <span v-else class="ex-dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Modale création d'examen -->
    <transition name="ex-fade">
      <div v-if="showCreate" class="ex-overlay" @click.self="showCreate = false">
        <div class="ex-modal">
          <h2 class="ex-modal-title">Nouvel examen</h2>
          <div class="ex-field">
            <label>Examen</label>
            <div class="ex-radio-group">
              <label v-for="t in types" :key="t.key" class="ex-radio" :class="{ active: createType === t.key }">
                <input type="radio" :value="t.key" v-model="createType" />
                <span class="ex-radio-main">{{ t.label }}</span>
                <span class="ex-radio-desc">{{ niveauLabel(t.niveau) }} — {{ t.desc }}</span>
              </label>
            </div>
          </div>
          <div class="ex-field">
            <label>Année</label>
            <input class="ex-input" v-model="createAnnee" placeholder="2025-2026" />
          </div>
          <div class="ex-modal-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="showCreate = false">Annuler</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!createType" @click="creer">Créer</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useExamensStore, EXAM_TYPES, RESULT_STATUS, MENTIONS } from '../stores/examens'
import { useElevesStore } from '../stores/eleves'
import { exportToExcel } from '../utils/exportExcel'

const store = useExamensStore()
const elevesStore = useElevesStore()

const types = EXAM_TYPES
const statuses = RESULT_STATUS
const mentions = MENTIONS

const selectedExamId = ref(null)
const showCreate = ref(false)
const createType = ref('bac')
const createAnnee = ref(anneeParDefaut())

function anneeParDefaut() {
  const t = new Date()
  const y = t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1
  return `${y}-${y + 1}`
}

onMounted(async () => {
  if (!elevesStore.eleves.length) await elevesStore.loadEleves()
  store.seedDemo(elevesStore.eleves)
})

const selectedExam = computed(() => store.exams.find(e => e.id === selectedExamId.value) || null)
const candidats = computed(() => selectedExam.value
  ? [...store.getCandidats(selectedExam.value.id)].sort((a, b) => (a.eleveName || '').localeCompare(b.eleveName || ''))
  : [])
const detailStats = computed(() => selectedExam.value ? store.getStats(selectedExam.value.id) : {})

const globalStats = computed(() => {
  let candidats = 0, admis = 0, presents = 0
  for (const ex of store.exams) {
    const s = store.getStats(ex.id)
    candidats += s.inscrits; admis += s.admis; presents += s.presents
  }
  return { candidats, admis, taux: presents > 0 ? Math.round((admis / presents) * 100) : 0 }
})

function statOf(id) { return store.getStats(id) }
function niveauLabel(n) {
  const map = { '6e': '6ème', '5e': '5ème', '4e': '4ème', '3e': '3ème', '2nde': '2nde', '1ere': '1ère', 'Tle': 'Terminale', 'CM2': 'CM2' }
  return map[n] || n
}

function openExam(id) { selectedExamId.value = id }
function creer() {
  const ex = store.addExam({ type: createType.value, annee: createAnnee.value })
  showCreate.value = false
  if (ex) selectedExamId.value = ex.id
}
function supprimer(id) {
  if (confirm("Supprimer cette session d'examen et ses résultats ?")) store.removeExam(id)
}
function inscrire() {
  const n = store.inscrireNiveau(selectedExam.value.id, elevesStore.eleves)
  // (aucun message bloquant ; la table se met à jour)
}
function onStatut(c, val) {
  const patch = { statut: val }
  if (val !== 'admis') patch.mention = ''
  store.updateCandidat(selectedExam.value.id, c.eleveId, patch)
}
function exporter() {
  const rows = candidats.value.map(c => ({
    'Candidat': c.eleveName, 'Classe': c.className, 'N° table': c.numeroTable,
    'Résultat': (statuses.find(s => s.value === c.statut) || {}).label || c.statut,
    'Mention': c.mention || '',
  }))
  exportToExcel(rows, `${selectedExam.value.label}_${selectedExam.value.annee}`)
}
</script>

<style scoped>
.ex-page { max-width: 1100px; margin: 0 auto; }
.ex-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ex-title { font-size: 26px; font-weight: 700; color: var(--tx); margin: 0; }
.ex-title-year { font-size: 18px; font-weight: 600; color: var(--tx3); }
.ex-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.ex-detail-actions { display: flex; gap: 10px; }
.ex-back { background: none; border: none; color: var(--pr); font: inherit; font-size: 14px; cursor: pointer; margin-bottom: 12px; padding: 0; }

.ex-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
@media (max-width: 720px) { .ex-kpis { grid-template-columns: repeat(2, 1fr); } }
.ex-kpi { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 14px; padding: 16px; }
.ex-kpi-accent { background: linear-gradient(135deg, rgba(var(--pr-rgb,10,132,255),.1), rgba(var(--pr-rgb,10,132,255),.03)); border-color: rgba(var(--pr-rgb,10,132,255),.25); }
.ex-kpi-label { font-size: 12px; color: var(--tx2); font-weight: 600; }
.ex-kpi-value { font-size: 28px; font-weight: 700; color: var(--tx); margin-top: 4px; }
.ex-kpi-accent .ex-kpi-value { color: var(--pr); }

.ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.ex-card { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 18px; cursor: pointer; transition: box-shadow .15s, transform .15s; }
.ex-card:hover { box-shadow: 0 10px 30px rgba(0,0,0,.08); transform: translateY(-2px); }
.ex-c-head { display: flex; justify-content: space-between; align-items: flex-start; }
.ex-c-name { font-size: 17px; font-weight: 700; color: var(--tx); }
.ex-c-meta { font-size: 12.5px; color: var(--tx2); margin-top: 2px; }
.ex-c-del { background: none; border: none; color: var(--tx3); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 6px; }
.ex-c-del:hover { background: rgba(192,57,43,.1); color: var(--danger, #c0392b); }
.ex-c-taux { display: flex; align-items: baseline; gap: 6px; margin: 14px 0 8px; }
.ex-c-taux-val { font-size: 34px; font-weight: 800; color: var(--pr); }
.ex-c-taux-lbl { font-size: 13px; color: var(--tx2); }
.ex-bar { height: 8px; background: rgba(0,0,0,.06); border-radius: 6px; overflow: hidden; }
.ex-bar-fill { height: 100%; background: var(--pr); border-radius: 6px; }
.ex-c-foot { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--tx2); margin-top: 10px; }

.ex-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 18px; }
@media (max-width: 720px) { .ex-stats { grid-template-columns: repeat(3, 1fr); } }
.ex-stat { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 12px; padding: 12px; text-align: center; }
.ex-stat b { display: block; font-size: 22px; font-weight: 700; color: var(--tx); }
.ex-stat span { font-size: 11.5px; color: var(--tx2); }
.ex-stat-ok b { color: var(--success, #1b8a5a); }
.ex-stat-ko b { color: var(--danger, #c0392b); }
.ex-stat-accent { background: rgba(var(--pr-rgb,10,132,255),.08); border-color: rgba(var(--pr-rgb,10,132,255),.25); }
.ex-stat-accent b { color: var(--pr); }

.ex-tablecard { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 6px; overflow-x: auto; }
.ex-table { width: 100%; border-collapse: collapse; }
.ex-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--tx2); padding: 12px; border-bottom: 1px solid var(--divider, #eee); }
.ex-table td { padding: 9px 12px; border-bottom: 1px solid var(--divider, #f3f3f3); font-size: 13.5px; color: var(--tx); }
.ex-td-name { font-weight: 600; }
.ex-input { padding: 7px 10px; font: inherit; font-size: 13px; color: var(--tx); background: #fff; border: 1.5px solid var(--divider, #dcdcd8); border-radius: 8px; outline: none; }
.ex-input:focus { border-color: var(--pr); }
.ex-input-sm { width: 90px; }
.ex-dash { color: var(--tx3); }

.ex-empty { font-size: 14px; color: var(--tx3); text-align: center; padding: 40px 0; }

.ex-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; padding: 20px; }
.ex-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; padding: 22px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25); }
.ex-modal-title { font-size: 18px; font-weight: 700; color: var(--tx); margin: 0 0 16px; }
.ex-field { margin-bottom: 14px; }
.ex-field > label { display: block; font-size: 12.5px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
.ex-radio-group { display: flex; flex-direction: column; gap: 8px; }
.ex-radio { display: flex; flex-direction: column; border: 1.5px solid var(--divider, #e5e5e5); border-radius: 11px; padding: 10px 12px; cursor: pointer; position: relative; padding-left: 36px; }
.ex-radio.active { border-color: var(--pr); background: rgba(var(--pr-rgb,10,132,255),.05); }
.ex-radio input { position: absolute; left: 12px; top: 12px; }
.ex-radio-main { font-size: 14px; font-weight: 600; color: var(--tx); }
.ex-radio-desc { font-size: 12px; color: var(--tx2); }
.ex-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.ex-fade-enter-active, .ex-fade-leave-active { transition: opacity .15s; }
.ex-fade-enter-from, .ex-fade-leave-to { opacity: 0; }
</style>
