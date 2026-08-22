<template>
  <div class="ex-page">
    <!-- ====== Liste des examens ====== -->
    <template v-if="!selectedExam">
      <header class="ex-head">
        <div>
          <h1 class="ex-title">{{ t('examens.title') }}</h1>
          <p class="ex-sub">{{ t('examens.subtitle', { liste: listeExamens }) }}</p>
        </div>
        <button class="btn btn-primary" type="button" @click="showCreate = true">{{ t('examens.newExam') }}</button>
      </header>

      <!-- KPIs globaux -->
      <div class="ex-kpis">
        <div class="ex-kpi">
          <div class="ex-kpi-label">{{ t('examens.kpiSessions') }}</div>
          <div class="ex-kpi-value">{{ store.exams.length }}</div>
        </div>
        <div class="ex-kpi">
          <div class="ex-kpi-label">{{ t('examens.kpiCandidates') }}</div>
          <div class="ex-kpi-value">{{ globalStats.candidats }}</div>
        </div>
        <div class="ex-kpi">
          <div class="ex-kpi-label">{{ t('examens.kpiAdmitted') }}</div>
          <div class="ex-kpi-value">{{ globalStats.admis }}</div>
        </div>
        <div class="ex-kpi ex-kpi-accent">
          <div class="ex-kpi-label">{{ t('examens.kpiAvgRate') }}</div>
          <div class="ex-kpi-value">{{ globalStats.taux }}%</div>
        </div>
      </div>

      <div v-if="!store.exams.length" class="ex-empty">
        {{ t('examens.emptyList') }}
      </div>
      <div v-else class="ex-grid">
        <article v-for="ex in store.examsSorted" :key="ex.id" class="ex-card" @click="openExam(ex.id)">
          <div class="ex-c-head">
            <div>
              <div class="ex-c-name">{{ ex.label }}</div>
              <div class="ex-c-meta">{{ niveauLabel(ex.niveau) }} · {{ ex.annee }}</div>
            </div>
            <button class="ex-c-del" type="button" :title="t('examens.deleteTitle')" @click.stop="supprimer(ex.id)">✕</button>
          </div>
          <div class="ex-c-taux">
            <span class="ex-c-taux-val">{{ statOf(ex.id).taux }}%</span>
            <span class="ex-c-taux-lbl">{{ t('examens.successRate') }}</span>
          </div>
          <div class="ex-bar"><div class="ex-bar-fill" :style="{ width: statOf(ex.id).taux + '%' }"></div></div>
          <div class="ex-c-foot">
            <span>{{ t('examens.admittedPresent', { admis: statOf(ex.id).admis, presents: statOf(ex.id).presents }) }}</span>
            <span>{{ t('examens.registered', { n: statOf(ex.id).inscrits }) }}</span>
          </div>
        </article>
      </div>
    </template>

    <!-- ====== Détail d'un examen (candidats) ====== -->
    <template v-else>
      <button class="ex-back" type="button" @click="selectedExamId = null">{{ t('examens.backAll') }}</button>
      <header class="ex-head">
        <div>
          <h1 class="ex-title">{{ selectedExam.label }} <span class="ex-title-year">{{ selectedExam.annee }}</span></h1>
          <p class="ex-sub">{{ niveauLabel(selectedExam.niveau) }} — {{ typeDesc(selectedExam.type) }}</p>
        </div>
        <div class="ex-detail-actions">
          <ExportMenu v-if="candidats.length" :excel="exporter" :pdf="exporterPdf" />
          <button v-if="detailStats.admis" class="btn btn-primary btn-sm" type="button" :disabled="emitting" @click="emettreDiplomesAdmis">{{ emitting ? t('examens.emitting') : t('examens.emitDiplomas', { n: detailStats.admis }) }}</button>
          <button class="btn btn-outline btn-sm" type="button" @click="inscrire">{{ t('examens.registerLevel', { niveau: niveauLabel(selectedExam.niveau) }) }}</button>
        </div>
      </header>

      <p v-if="emitFeedback" class="ex-emit-feedback">{{ emitFeedback }}</p>

      <!-- Stats de la session -->
      <div class="ex-stats">
        <div class="ex-stat"><b>{{ detailStats.inscrits }}</b><span>{{ t('examens.statInscrits') }}</span></div>
        <div class="ex-stat"><b>{{ detailStats.presents }}</b><span>{{ t('examens.statPresents') }}</span></div>
        <div class="ex-stat ex-stat-ok"><b>{{ detailStats.admis }}</b><span>{{ t('examens.statAdmis') }}</span></div>
        <div class="ex-stat ex-stat-ko"><b>{{ detailStats.ajournes }}</b><span>{{ t('examens.statAjournes') }}</span></div>
        <div class="ex-stat"><b>{{ detailStats.absents }}</b><span>{{ t('examens.statAbsents') }}</span></div>
        <div class="ex-stat ex-stat-accent"><b>{{ detailStats.taux }}%</b><span>{{ t('examens.statRate') }}</span></div>
      </div>

      <div v-if="!candidats.length" class="ex-empty">
        {{ t('examens.emptyCandidates', { niveau: niveauLabel(selectedExam.niveau) }) }}
      </div>
      <section v-else class="ex-tablecard">
        <table class="ex-table">
          <thead>
            <tr>
              <th>{{ t('examens.thCandidate') }}</th>
              <th>{{ t('examens.thClass') }}</th>
              <th>{{ t('examens.thTableNo') }}</th>
              <th>{{ t('examens.thResult') }}</th>
              <th>{{ t('examens.thMention') }}</th>
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
                  <option v-for="s in statuses" :key="s.value" :value="s.value">{{ statusLabel(s.value) }}</option>
                </select>
              </td>
              <td>
                <select v-if="c.statut === 'admis'" class="ex-input" :value="c.mention"
                  @change="store.updateCandidat(selectedExam.id, c.eleveId, { mention: $event.target.value })">
                  <option value="">{{ t('examens.mentionPlaceholder') }}</option>
                  <option v-for="m in mentions" :key="m" :value="m">{{ m }}</option>
                </select>
                <span v-else class="ex-dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Liste mobile : cartes (le tableau est masqué sur petit écran) -->
        <ul class="ex-mlist">
          <li v-for="c in candidats" :key="c.eleveId" class="ex-mrow">
            <div class="ex-mrow-head">
              <div class="ex-mrow-name">{{ c.eleveName }}</div>
              <div class="ex-mrow-sub">{{ c.className }}</div>
            </div>
            <div class="ex-mrow-fields">
              <label class="ex-mrow-field">
                <span>{{ t('examens.thTableNo') }}</span>
                <input class="ex-input ex-input-sm" :value="c.numeroTable" @change="store.updateCandidat(selectedExam.id, c.eleveId, { numeroTable: $event.target.value })" placeholder="—" />
              </label>
              <label class="ex-mrow-field">
                <span>{{ t('examens.thResult') }}</span>
                <select class="ex-input" :value="c.statut" @change="onStatut(c, $event.target.value)">
                  <option v-for="s in statuses" :key="s.value" :value="s.value">{{ statusLabel(s.value) }}</option>
                </select>
              </label>
              <label v-if="c.statut === 'admis'" class="ex-mrow-field">
                <span>{{ t('examens.thMention') }}</span>
                <select class="ex-input" :value="c.mention" @change="store.updateCandidat(selectedExam.id, c.eleveId, { mention: $event.target.value })">
                  <option value="">{{ t('examens.mentionPlaceholder') }}</option>
                  <option v-for="m in mentions" :key="m" :value="m">{{ m }}</option>
                </select>
              </label>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Modale création d'examen -->
    <transition name="ex-fade">
      <div v-if="showCreate" class="ex-overlay" @click.self="showCreate = false">
        <div class="ex-modal">
          <h2 class="ex-modal-title">{{ t('examens.modalTitle') }}</h2>
          <div class="ex-field">
            <label>{{ t('examens.examField') }}</label>
            <div class="ex-radio-group">
              <label v-for="et in types" :key="et.key" class="ex-radio" :class="{ active: createType === et.key }">
                <input type="radio" :value="et.key" v-model="createType" />
                <span class="ex-radio-main">{{ et.label }}</span>
                <span class="ex-radio-desc">{{ niveauLabel(et.niveau) }} — {{ typeDesc(et.key) }}</span>
              </label>
            </div>
          </div>
          <div class="ex-field">
            <label>{{ t('examens.yearField') }}</label>
            <input class="ex-input" v-model="createAnnee" placeholder="2025-2026" />
          </div>
          <div class="ex-modal-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="showCreate = false">{{ t('examens.cancel') }}</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!createType" @click="creer">{{ t('examens.create') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExamensStore, examTypesPays, RESULT_STATUS, MENTIONS } from '../stores/examens'
import { useElevesStore } from '../stores/eleves'
import { exportToExcel } from '../utils/exportExcel'
import { exportToPdf } from '../utils/exportPdf'
import ExportMenu from '../components/ExportMenu.vue'
import { useDiplomesStore } from '../stores/diplomes'
import { useSchoolStore } from '../stores/school'
import { useAuthStore } from '../stores/auth'

const { t, locale } = useI18n({ useScope: 'global' })
const store = useExamensStore()
const elevesStore = useElevesStore()
const dipStore = useDiplomesStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()

const schoolName = computed(() => schoolStore.schoolSettings?.schoolName || t('examens.schoolFallback'))
const schoolAcronym = computed(() => {
  const acro = schoolName.value.split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return acro.slice(0, 5) || 'EDFM'
})
const emitting = ref(false)
const emitFeedback = ref('')

// Les examens dépendent du PAYS de l'école : un CEP camerounais n'a rien à
// faire dans une école de Dakar ou de Kinshasa.
const types = computed(() => examTypesPays(schoolStore.schoolSettings?.country))

// Le sous-titre énumérait « CEP, BEPC, Probatoire, Baccalauréat » EN DUR : des
// examens camerounais, affichés tels quels à une école congolaise qui n'a pas
// de Probatoire. Il suit désormais le pays, comme le reste de l'écran.
const listeExamens = computed(() => types.value.map((t) => t.label).join(', '))
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
  await schoolStore.loadSettings()
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
function statusLabel(v) {
  const k = `examens.status.${v}`
  const lbl = t(k)
  return lbl === k ? v : lbl
}
function typeDesc(key) {
  const k = `examens.examDesc.${key}`
  const lbl = t(k)
  return lbl === k ? (store.getType(key)?.desc || '') : lbl
}

function openExam(id) { selectedExamId.value = id }
function creer() {
  const ex = store.addExam({ type: createType.value, annee: createAnnee.value })
  showCreate.value = false
  if (ex) selectedExamId.value = ex.id
}
function supprimer(id) {
  if (confirm(t('examens.confirmDelete'))) store.removeExam(id)
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
function buildCandidatsExport() {
  const columns = [
    { key: 'candidate', label: t('examens.exportCols.candidate'), width: 26 },
    { key: 'className', label: t('examens.exportCols.class'), width: 16 },
    { key: 'tableNo', label: t('examens.exportCols.tableNo'), width: 12 },
    { key: 'result', label: t('examens.exportCols.result'), width: 16 },
    { key: 'mention', label: t('examens.exportCols.mention'), width: 16 },
  ]
  const data = candidats.value.map(c => ({
    candidate: c.eleveName,
    className: c.className,
    tableNo: c.numeroTable,
    result: statusLabel(c.statut),
    mention: c.mention || '',
  }))
  return { data, columns }
}
function exporter() {
  const { data, columns } = buildCandidatsExport()
  exportToExcel(data, columns, `${selectedExam.value.label}_${selectedExam.value.annee}`, 'Résultats')
}
function exporterPdf() {
  const { data, columns } = buildCandidatsExport()
  if (!data.length) return
  exportToPdf(data, columns, `${selectedExam.value.label}_${selectedExam.value.annee}`, { title: `Résultats — ${selectedExam.value.label} ${selectedExam.value.annee}` })
}

// ── Émettre les diplômes vérifiables des candidats ADMIS (intégration Diplômes) ──
function seriesFromClass(cn) {
  const m = (cn || '').match(/\b([A-D])\b/i)
  return m ? m[1].toUpperCase() : ''
}
async function emettreDiplomesAdmis() {
  const ex = selectedExam.value
  if (!ex || emitting.value) return
  emitting.value = true
  emitFeedback.value = ''
  const admis = candidats.value.filter(c => c.statut === 'admis')
  let issued = 0, skipped = 0
  for (const c of admis) {
    const exists = dipStore.diplomes.some(d => d.eleveId === c.eleveId && d.type === ex.type && d.annee === ex.annee && d.statut === 'valide')
    if (exists) { skipped++; continue }
    await dipStore.emettre({
      eleveId: c.eleveId, eleveName: c.eleveName, type: ex.type,
      serie: seriesFromClass(c.className), mention: c.mention, annee: ex.annee,
      ecoleNom: schoolName.value, ecoleAcronyme: schoolAcronym.value,
      emisPar: authStore.userProfile?.displayName || t('examens.directionFallback'),
    })
    issued++
  }
  emitting.value = false
  emitFeedback.value = issued
    ? t('examens.feedbackIssued', { issued, extra: skipped ? t('examens.feedbackExisting', { n: skipped }) : '' })
    : (skipped ? t('examens.feedbackAllHave', { n: skipped }) : t('examens.feedbackNone'))
}
</script>

<style scoped>
.ex-page { max-width: 1100px; margin: 0 auto; }
.ex-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ex-title { font-size: 26px; font-weight: 700; color: var(--tx); margin: 0; }
.ex-title-year { font-size: 18px; font-weight: 600; color: var(--tx3); }
.ex-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.ex-detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.ex-emit-feedback { margin: -4px 0 16px; padding: 10px 14px; border-radius: 10px; background: rgba(27,138,90,.08); color: #157a4f; font-size: 13.5px; }
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

/* ── Liste mobile (remplace le tableau des candidats, <=560px) ── */
.ex-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.ex-mrow { padding: 12px 10px; border-bottom: 1px solid var(--divider, #eee); }
.ex-mrow:last-child { border-bottom: none; }
.ex-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx, #1A1D1F); }
.ex-mrow-sub { font-size: 12.5px; color: var(--tx3, #6f767e); margin-top: 1px; }
.ex-mrow-fields { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.ex-mrow-field { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 90px; }
.ex-mrow-field > span { font-size: 10.5px; font-weight: 600; color: var(--tx3, #6f767e); text-transform: uppercase; letter-spacing: .03em; }
@media (max-width: 560px) {
  .ex-table { display: none; }
  .ex-mlist { display: block; }
}
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
