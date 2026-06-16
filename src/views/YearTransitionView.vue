<template>
  <div class="transition-page">
    <!-- Progress Bar -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Passage d'année scolaire</h1>
        <p>{{ schoolStore.schoolSettings?.academicYear }} vers {{ transitionStore.nextAcademicYear }}</p>
      </div>
    </div>

    <div class="progress-bar card" style="margin-bottom: 20px;">
      <div class="progress-steps">
        <div v-for="(step, idx) in steps" :key="idx" class="progress-step" :class="{ active: idx === transitionStore.transitionStep, done: idx < transitionStore.transitionStep }">
          <div class="step-dot">{{ idx < transitionStore.transitionStep ? '✓' : idx + 1 }}</div>
          <span class="step-name">{{ step }}</span>
        </div>
      </div>
    </div>

    <!-- ═══════ STEP 0: BILAN ═══════ -->
    <div v-if="transitionStore.transitionStep === 0" class="card step-card">
      <h2>Bilan de l'année {{ schoolStore.schoolSettings?.academicYear }}</h2>
      <p class="step-desc">Résumé des résultats de l'année scolaire en cours.</p>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ transitionStore.transitionStats.total }}</span>
          <span class="stat-label">Élèves</span>
        </div>
        <div class="stat-card stat-success">
          <span class="stat-value">{{ transitionStore.transitionStats.tauxReussite }}%</span>
          <span class="stat-label">Taux de réussite</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ transitionStore.transitionStats.moyenneGenerale !== null ? transitionStore.transitionStats.moyenneGenerale.toFixed(2) : '-' }}/20</span>
          <span class="stat-label">Moyenne générale</span>
        </div>
        <div class="stat-card stat-warn">
          <span class="stat-value">{{ transitionStore.transitionStats.redoublants }}</span>
          <span class="stat-label">Redoublants</span>
        </div>
      </div>

      <div class="bilan-breakdown">
        <div class="breakdown-row">
          <span class="breakdown-label">Admis en classe supérieure</span>
          <span class="breakdown-value success-text">{{ transitionStore.transitionStats.admis }}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">Diplômés (Terminale)</span>
          <span class="breakdown-value">{{ transitionStore.transitionStats.diplomes }}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">Redoublants</span>
          <span class="breakdown-value warn-text">{{ transitionStore.transitionStats.redoublants }}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">Transférés</span>
          <span class="breakdown-value">{{ transitionStore.transitionStats.transferes }}</span>
        </div>
      </div>

      <div v-if="studentsWithoutAvg > 0" class="warning-banner" style="margin-top: 16px;">
        <AlertCircle :size="16" />
        <span><strong>{{ studentsWithoutAvg }}</strong> élèves n'ont pas de moyenne annuelle. Leurs décisions devront être ajustées manuellement à l'étape suivante.</span>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="$router.push('/parametres')">Annuler</button>
        <button class="btn btn-primary" @click="transitionStore.transitionStep = 1">
          Continuer
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>

    <!-- ═══════ STEP 1: DECISIONS PAR ELEVE ═══════ -->
    <div v-if="transitionStore.transitionStep === 1" class="card step-card">
      <h2>Décisions individuelles</h2>
      <p class="step-desc">Vérifiez et ajustez les décisions pour chaque élève. Les décisions sont pré-remplies en fonction de la moyenne annuelle (admis si >= 10/20).</p>

      <!-- Class filter -->
      <div class="toolbar" style="margin-bottom: 16px;">
        <div class="field" style="margin-bottom:0; min-width:180px;">
          <label>Filtrer par classe</label>
          <select v-model="filterClass" class="input">
            <option value="">Toutes les classes</option>
            <option v-for="c in classesStore.classes" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:0; min-width:150px;">
          <label>Filtrer par décision</label>
          <select v-model="filterDecision" class="input">
            <option value="">Toutes</option>
            <option value="admis">Admis</option>
            <option value="redoublant">Redoublant</option>
            <option value="diplome">Diplômé</option>
            <option value="transfere">Transféré</option>
          </select>
        </div>
        <div class="toolbar-spacer"></div>
        <div class="mini-stats">
          <span>{{ filteredResults.length }} élèves affichés</span>
        </div>
      </div>

      <div class="decisions-table-wrap">
        <table class="decisions-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th>Nom</th>
              <th>Classe</th>
              <th>Moyenne</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in filteredResults" :key="r.eleveId" :class="{ 'row-fail': getDecision(r.eleveId) === 'redoublant', 'row-success': getDecision(r.eleveId) === 'admis' || getDecision(r.eleveId) === 'diplome' }">
              <td class="col-rank">{{ idx + 1 }}</td>
              <td><strong>{{ r.lastName }}</strong> {{ r.firstName }}</td>
              <td>{{ r.className }}</td>
              <td :class="{ 'note-cell-fail': r.annualAvg !== null && r.annualAvg < 10, 'note-cell-success': r.annualAvg !== null && r.annualAvg >= 10 }">
                {{ r.annualAvg !== null ? r.annualAvg.toFixed(2) : '-' }}
              </td>
              <td>
                <select :value="getDecision(r.eleveId)" @change="transitionStore.setDecision(r.eleveId, $event.target.value)" class="input decision-select" :class="'decision-' + getDecision(r.eleveId)">
                  <option value="admis">Admis</option>
                  <option value="redoublant">Redoublant</option>
                  <option v-if="r.level === 'Tle'" value="diplome">Diplômé</option>
                  <option value="transfere">Transféré</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="transitionStore.transitionStep = 0">
          <ArrowLeft :size="16" />
          Précédent
        </button>
        <button class="btn btn-primary" @click="transitionStore.transitionStep = 2">
          Continuer
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>

    <!-- ═══════ STEP 2: PARAMETRES NOUVELLE ANNEE ═══════ -->
    <div v-if="transitionStore.transitionStep === 2" class="card step-card">
      <h2>Paramètres {{ transitionStore.nextAcademicYear }}</h2>
      <p class="step-desc">Vérifiez et ajustez les informations de l'établissement pour la nouvelle année scolaire. Les données de l'année en cours sont pré-remplies.</p>

      <form class="settings-form">
        <div class="form-row">
          <div class="field">
            <label>Nom de l'établissement</label>
            <input v-model="transitionStore.newYearSettings.schoolName" class="input" type="text" />
          </div>
          <div class="field">
            <label>Année scolaire</label>
            <input v-model="transitionStore.newYearSettings.academicYear" class="input" type="text" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>Directeur</label>
            <input v-model="transitionStore.newYearSettings.directorName" class="input" type="text" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input v-model="transitionStore.newYearSettings.phone" class="input" type="text" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>Email</label>
            <input v-model="transitionStore.newYearSettings.email" class="input" type="email" />
          </div>
          <div class="field">
            <label>Adresse</label>
            <input v-model="transitionStore.newYearSettings.address" class="input" type="text" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>Ville</label>
            <input v-model="transitionStore.newYearSettings.city" class="input" type="text" />
          </div>
          <div class="field">
            <label>Type d'évaluation</label>
            <select v-model="transitionStore.newYearSettings.evaluationType" class="input">
              <option value="2_sequences">2 séquences par trimestre</option>
              <option value="1_evaluation">1 évaluation par trimestre</option>
            </select>
          </div>
        </div>
      </form>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="transitionStore.transitionStep = 1">
          <ArrowLeft :size="16" />
          Précédent
        </button>
        <button class="btn btn-primary" @click="transitionStore.transitionStep = 3">
          Continuer
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>

    <!-- ═══════ STEP 3: PREVISUALISATION ═══════ -->
    <div v-if="transitionStore.transitionStep === 3" class="card step-card">
      <h2>Prévisualisation {{ transitionStore.nextAcademicYear }}</h2>
      <p class="step-desc">Voici l'aperçu des classes et effectifs pour la nouvelle année. Les élèves admis montent en classe supérieure, les redoublants restent. Tous passent en "en attente d'inscription".</p>

      <div class="preview-grid">
        <div v-for="(data, className) in transitionStore.newYearPreview" :key="className" class="preview-class-card" :class="{ 'preview-empty': data.students.length === 0 }">
          <div class="preview-class-header">
            <h3>{{ className }}</h3>
            <span class="preview-count" :class="{ 'count-warn': data.students.length > data.capacity }">{{ data.students.length }} / {{ data.capacity }}</span>
          </div>
          <div class="preview-teacher">Prof. principal : {{ data.homeroomTeacher || '-' }}</div>
          <div class="preview-students">
            <div v-for="s in data.students.slice(0, 5)" :key="s.eleveId" class="preview-student">
              <span :class="'decision-badge badge-' + s.decision">{{ s.decision === 'redoublant' ? 'R' : '↑' }}</span>
              <span>{{ s.lastName }} {{ s.firstName }}</span>
            </div>
            <div v-if="data.students.length > 5" class="preview-more">
              + {{ data.students.length - 5 }} autres élèves
            </div>
            <div v-if="data.students.length === 0" class="preview-empty-msg">
              Aucun élève affecté
            </div>
          </div>
        </div>
      </div>

      <div class="summary-banner" style="margin-top: 20px;">
        <div class="summary-row"><strong>Total élèves reportés :</strong> {{ transitionStore.transitionStats.admis + transitionStore.transitionStats.redoublants }}</div>
        <div class="summary-row"><strong>Diplômés (sortants) :</strong> {{ transitionStore.transitionStats.diplomes }}</div>
        <div class="summary-row"><strong>Transférés (sortants) :</strong> {{ transitionStore.transitionStats.transferes }}</div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="transitionStore.transitionStep = 2">
          <ArrowLeft :size="16" />
          Précédent
        </button>
        <button class="btn btn-primary" @click="transitionStore.transitionStep = 4">
          Confirmer et exécuter
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>

    <!-- ═══════ STEP 4: CONFIRMATION FINALE ═══════ -->
    <div v-if="transitionStore.transitionStep === 4" class="card step-card">
      <template v-if="!transitionStore.transitionComplete">
        <h2>Confirmation</h2>
        <p class="step-desc">Vous êtes sur le point de clôturer l'année <strong>{{ schoolStore.schoolSettings?.academicYear }}</strong> et de démarrer <strong>{{ transitionStore.nextAcademicYear }}</strong>.</p>

        <div class="confirm-summary">
          <div class="confirm-item"><strong>{{ transitionStore.transitionStats.admis }}</strong> élèves passeront en classe supérieure</div>
          <div class="confirm-item"><strong>{{ transitionStore.transitionStats.redoublants }}</strong> élèves redoubleront</div>
          <div class="confirm-item"><strong>{{ transitionStore.transitionStats.diplomes }}</strong> élèves seront diplômés</div>
          <div class="confirm-item"><strong>{{ transitionStore.transitionStats.transferes }}</strong> élèves seront transférés</div>
        </div>

        <div class="warning-banner" style="margin: 20px 0;">
          <AlertCircle :size="16" />
          <span>Cette action est irréversible. Les notes de l'année en cours seront archivées et les compteurs remis à zéro pour la nouvelle année.</span>
        </div>

        <div class="step-actions">
          <button class="btn btn-ghost" @click="transitionStore.transitionStep = 3">
            <ArrowLeft :size="16" />
            Revenir
          </button>
          <button class="btn btn-danger" @click="executeTransition" :disabled="transitionStore.isExecuting">
            <template v-if="transitionStore.isExecuting">
              <Loader2 :size="16" class="spin" />
              Transition en cours...
            </template>
            <template v-else>
              Clôturer et démarrer {{ transitionStore.nextAcademicYear }}
            </template>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="success-card">
          <CheckCircle :size="48" class="success-icon" />
          <h2>Transition terminée</h2>
          <p>L'année <strong>{{ transitionStore.nextAcademicYear }}</strong> est prête. Tous les élèves sont en statut "en attente d'inscription".</p>
          <p>Vous pouvez maintenant confirmer les inscriptions dans le module Élèves.</p>
          <div class="step-actions" style="justify-content: center;">
            <button class="btn btn-primary" @click="$router.push('/dashboard')">
              Aller au tableau de bord
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useYearTransitionStore } from '../stores/year-transition'
import { useSchoolStore } from '../stores/school'
import { useClassesStore } from '../stores/classes'
import { AlertCircle, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-vue-next'

const router = useRouter()
const transitionStore = useYearTransitionStore()
const schoolStore = useSchoolStore()
const classesStore = useClassesStore()

const filterClass = ref('')
const filterDecision = ref('')

onMounted(() => {
  transitionStore.initTransition()
})

const studentsWithoutAvg = computed(() => {
  return transitionStore.studentResults.filter(r => r.annualAvg === null).length
})

const filteredResults = computed(() => {
  let results = transitionStore.studentResults
  if (filterClass.value) {
    results = results.filter(r => r.className === filterClass.value)
  }
  if (filterDecision.value) {
    results = results.filter(r => getDecision(r.eleveId) === filterDecision.value)
  }
  return results
})

function getDecision(eleveId) {
  return transitionStore.studentDecisions[eleveId] || 'redoublant'
}

async function executeTransition() {
  try {
    await transitionStore.executeTransition()
  } catch (err) {
    alert('Erreur lors de la transition: ' + err.message)
  }
}
</script>

<style scoped>
.transition-page {
  padding: 0;
}

.progress-bar {
  padding: 16px 24px;
}

.progress-steps {
  display: flex;
  align-items: center;
  gap: 4px;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
}

.progress-step::after {
  content: '';
  flex: 1;
  height: 2px;
  background: #e0e0e0;
  margin: 0 8px;
}

.progress-step:last-child::after {
  display: none;
}

.progress-step.done::after {
  background: var(--primary, var(--pr));
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: #e8e8e8;
  color: #888;
  flex-shrink: 0;
}

.progress-step.active .step-dot {
  background: var(--primary, var(--pr));
  color: white;
}

.progress-step.done .step-dot {
  background: #22c55e;
  color: white;
}

.step-name {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  display: none;
}

@media (min-width: 768px) {
  .step-name { display: block; }
}

.progress-step.active .step-name {
  color: var(--primary, var(--pr));
  font-weight: 600;
}

.step-card {
  padding: 32px;
}

.step-card h2 {
  margin: 0 0 4px 0;
  font-size: 22px;
}

.step-desc {
  color: var(--muted, #888);
  margin: 0 0 24px 0;
  font-size: 14px;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-light, #f8f7f5);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-card.stat-success {
  background: rgba(34, 197, 94, 0.08);
}

.stat-card.stat-warn {
  background: rgba(239, 68, 68, 0.08);
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text, #1a1a1a);
}

.stat-label {
  display: block;
  font-size: 13px;
  color: var(--muted, #888);
  margin-top: 4px;
}

.stat-success .stat-value { color: #22c55e; }
.stat-warn .stat-value { color: #ef4444; }

/* Bilan breakdown */
.bilan-breakdown {
  background: var(--bg-light, #f8f7f5);
  border-radius: 12px;
  padding: 16px 20px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.breakdown-row:last-child { border-bottom: none; }

.breakdown-label { font-size: 14px; color: var(--text); }
.breakdown-value { font-size: 14px; font-weight: 600; }
.success-text { color: #22c55e; }
.warn-text { color: #ef4444; }

/* Warning banner */
.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(239, 158, 41, 0.08);
  border: 1px solid rgba(239, 158, 41, 0.2);
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;
}

/* Decisions table */
.decisions-table-wrap {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  margin-bottom: 20px;
}

.decisions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.decisions-table th {
  background: var(--bg-light, #f8f7f5);
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--muted);
  position: sticky;
  top: 0;
  z-index: 1;
}

.decisions-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.decisions-table .col-rank { width: 40px; text-align: center; color: var(--muted); }

.row-fail { background: rgba(239, 68, 68, 0.03); }
.row-success { background: rgba(34, 197, 94, 0.03); }

.decision-select {
  padding: 6px 10px;
  font-size: 13px;
  min-width: 130px;
}

.decision-admis { color: #22c55e; font-weight: 600; }
.decision-redoublant { color: #ef4444; font-weight: 600; }
.decision-diplome { color: var(--pr); font-weight: 600; }
.decision-transfere { color: #888; }

/* Settings form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
}

/* Preview grid */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.preview-class-card {
  background: var(--bg-light, #f8f7f5);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0,0,0,0.06);
}

.preview-class-card.preview-empty {
  opacity: 0.5;
}

.preview-class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-class-header h3 {
  margin: 0;
  font-size: 16px;
}

.preview-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.count-warn { color: #ef4444; }

.preview-teacher {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 12px;
}

.preview-student {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}

.decision-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.badge-admis { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge-redoublant { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.preview-more {
  font-size: 12px;
  color: var(--muted);
  padding: 4px 0;
  font-style: italic;
}

.preview-empty-msg {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

/* Summary banner */
.summary-banner {
  background: var(--bg-light, #f8f7f5);
  border-radius: 12px;
  padding: 16px 20px;
}

.summary-row {
  padding: 6px 0;
  font-size: 14px;
}

/* Confirm */
.confirm-summary {
  background: var(--bg-light, #f8f7f5);
  border-radius: 12px;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.confirm-item {
  font-size: 14px;
}

.confirm-item strong {
  font-size: 18px;
  display: block;
  margin-bottom: 2px;
}

/* Success */
.success-card {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  color: #22c55e;
  margin-bottom: 16px;
}

.success-card h2 {
  color: #22c55e;
}

.success-card p {
  color: var(--muted);
  max-width: 500px;
  margin: 8px auto;
}

/* Buttons */
.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0,0,0,0.06);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--primary, var(--pr));
  color: white;
}

.btn-primary:hover { opacity: 0.9; }

.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid rgba(0,0,0,0.1);
}

.btn-ghost:hover { background: rgba(0,0,0,0.02); }

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover { background: #dc2626; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Note cells */
.note-cell-fail { color: #ef4444; }
.note-cell-success { color: #22c55e; font-weight: 600; }

/* Mini stats / toolbar (reuse from app) */
.toolbar { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.mini-stats { font-size: 13px; color: var(--muted); display: flex; gap: 12px; align-items: center; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }

/* ═══ MOBILE RESPONSIVENESS ═══ */
@media (max-width: 768px) {
  /* Steps compact on mobile */
  .steps-bar { padding: 12px 16px; }
  .step-item { padding: 8px 12px; font-size: 12px; }
  .step-number { width: 28px; height: 28px; font-size: 11px; }

  /* Toolbar stacks */
  .toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
  .toolbar-spacer { display: none; }
  .toolbar .field { margin-bottom: 0; }
  .toolbar select, .toolbar input { width: 100%; font-size: 16px; min-height: 44px; }

  /* Decision table scrolls horizontally */
  .decision-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .decision-table { font-size: 12px; }
  .decision-table th { padding: 8px 6px; font-size: 10px; }
  .decision-table td { padding: 6px; }

  /* Stats 2 columns */
  .stat-bar { grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px; }
  .stat-card { padding: 12px 16px; }
  .stat-card-value { font-size: 18px; }
  .stat-card-label { font-size: 11px; }

  /* Confirm summary card */
  .confirm-summary { grid-template-columns: 1fr; gap: 10px; padding: 14px; }
  .confirm-item { font-size: 12px; }
  .confirm-item strong { font-size: 16px; margin-bottom: 2px; }

  /* Summary banner compact */
  .summary-banner { padding: 12px 16px; }
  .summary-row { padding: 4px 0; font-size: 12px; }

  /* Success card */
  .success-card { padding: 24px 16px; }
  .success-icon { margin-bottom: 12px; }
  .success-card h2 { font-size: 18px; }
  .success-card p { font-size: 12px; }

  /* Step actions responsive */
  .step-actions { flex-direction: column; gap: 10px; margin-top: 16px; padding-top: 16px; }
  .step-actions .btn { width: 100%; }

  /* Buttons touch targets */
  .btn { min-height: 44px; font-size: 14px; }
  .btn-sm { min-height: 40px; padding: 8px 12px; }

  /* Preview section responsive */
  .preview-section { padding: 12px 16px; }
  .preview-header { flex-direction: column; align-items: flex-start; }
  .preview-stats { font-size: 11px; flex-wrap: wrap; }

  /* Mini stats on mobile */
  .mini-stats { font-size: 12px; flex-wrap: wrap; gap: 8px; }

  /* Page header responsive */
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-text h1 { font-size: 24px; }
  .page-header-actions { width: 100%; flex-direction: column; }
  .page-header-actions .btn { width: 100%; }

  /* Card padding on mobile */
  .card { padding: 16px; }
}
</style>
