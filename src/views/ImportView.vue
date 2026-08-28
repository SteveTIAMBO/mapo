<template>
  <div class="import-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('imp.title') }}</h1>
        <p>{{ t('imp.subtitle') }}</p>
      </div>
    </div>

    <!-- Classeur de démarrage : un seul fichier pour initialiser une école -->
    <div class="starter-banner">
      <div class="starter-banner-text">
        <PackageOpen :size="24" />
        <div>
          <strong>{{ t('imp.starterTitle') }}</strong>
          <span>{{ t('imp.starterDesc') }}</span>
        </div>
      </div>
      <div class="starter-actions">
        <button class="btn btn-outline btn-sm starter-btn" @click="downloadStarterWorkbook" type="button">
          <Download :size="15" />
          {{ t('imp.starterBtn') }}
        </button>
        <!-- Le geste que la bannière promettait : UN fichier, tous les onglets.
             L'ordre d'écriture est décidé par le code (cf. ORDRE_CLASSEUR), pas
             par l'école — c'est lui qui évite le directeur en double. -->
        <label class="btn btn-primary btn-sm starter-btn" :class="{ disabled: importing }">
          <Upload :size="15" />
          <span>{{ importing ? t('imp.importing') : t('imp.starterImportBtn') }}</span>
          <input type="file" accept=".xlsx,.xls" style="display:none" :disabled="importing" @change="onClasseurSelect" />
        </label>
      </div>
    </div>

    <!-- Setup express : photo d'un registre → élèves (MIAPO vision) -->
    <div class="card express-card">
      <div class="express-head">
        <span class="express-spark"><Sparkles :size="18" /></span>
        <div>
          <h3>{{ t('imp.expressTitle') }}</h3>
          <p>{{ t('imp.expressDesc') }}</p>
        </div>
      </div>

      <div class="express-controls">
        <div class="express-fg">
          <label>{{ t('imp.expressClass') }}</label>
          <select v-model="expressClass" class="input">
            <option value="">{{ t('imp.expressClassNone') }}</option>
            <option v-for="c in classesStore.classes" :key="c.id || c.name" :value="c.name">{{ c.name }}</option>
          </select>
        </div>
        <label class="btn btn-outline"><Camera :size="16" /> <span>{{ expressImage ? t('imp.expressChange') : t('imp.expressPick') }}</span>
          <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickRegistre" />
        </label>
        <button v-if="expressImage" class="btn btn-primary" :disabled="expressBusy" @click="runRegistre">
          <component :is="expressBusy ? Loader2 : Sparkles" :size="16" :class="{ spin: expressBusy }" />
          <span>{{ expressBusy ? t('imp.expressReading') : t('imp.expressRun') }}</span>
        </button>
      </div>

      <p v-if="expressError" class="express-err"><AlertCircle :size="14" /> {{ expressError }}</p>
      <p v-if="expressDone" class="express-ok-banner"><CheckCircle2 :size="15" /> {{ t('imp.expressCreated', { n: expressDone }) }}</p>

      <div v-if="expressRows.length" class="express-result">
        <div class="express-result-head">
          <strong>{{ t('imp.expressReview', { n: expressRows.length }) }}</strong>
          <span class="express-hint">{{ t('imp.expressReviewHint') }}</span>
        </div>
        <div class="express-table-wrap">
          <table class="express-table">
            <thead><tr><th>{{ t('imp.expressColLast') }}</th><th>{{ t('imp.expressColFirst') }}</th><th>{{ t('imp.expressColSex') }}</th><th>{{ t('imp.expressColClass') }}</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in expressRows" :key="i">
                <td><input v-model="r.nom" class="cell" /></td>
                <td><input v-model="r.prenom" class="cell" /></td>
                <td>
                  <select v-model="r.sexe" class="cell">
                    <option value="">—</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </td>
                <td><input v-model="r.classe" class="cell" :placeholder="expressClass || '—'" /></td>
                <td><button class="icon-x" :title="t('imp.expressRemove')" @click="expressRows.splice(i, 1)"><Trash2 :size="14" /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="express-actions">
          <button class="btn btn-ghost btn-sm" @click="expressRows.push({ nom: '', prenom: '', sexe: '', classe: expressClass })"><Plus :size="14" /> {{ t('imp.expressAddRow') }}</button>
          <button class="btn btn-primary" :disabled="!creatableCount || expressCreating" @click="createFromRegistre">
            <span>{{ expressCreating ? t('imp.expressCreating') : t('imp.expressCreate', { n: creatableCount }) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Module tabs -->
    <div class="tabs-bar">
      <button
        v-for="tab in modules"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeModule === tab.id }"
        @click="switchModule(tab.id)"
      >
        <component :is="tab.icon" :size="16" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Instructions -->
    <div class="card info-card">
      <div class="info-card-header">
        <FileSpreadsheet :size="20" style="color: var(--pr);" />
        <div>
          <h3>{{ currentModule.label }}</h3>
          <p>{{ currentModule.desc }}</p>
        </div>
      </div>
      <div class="info-columns">
        <span class="info-col-label">{{ t('imp.expectedCols') }}</span>
        <span v-for="col in currentModule.columns" :key="col.key" class="info-col-tag" :class="{ required: col.required }">
          {{ col.label }}{{ col.required ? ' *' : '' }}
        </span>
      </div>
      <button class="btn btn-outline btn-sm" @click="downloadTemplate" type="button">
        <Download :size="14" />
        {{ t('imp.downloadTemplate') }}
      </button>
    </div>

    <!-- Upload zone -->
    <div
      class="upload-zone card"
      :class="{ 'dragging': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!parsedData.length">
        <Upload :size="32" style="color: var(--tx3); margin-bottom: 8px;" />
        <p class="upload-text">{{ t('imp.dropHere') }}</p>
        <label class="btn btn-primary btn-sm upload-btn">
          <input type="file" accept=".xlsx,.xls,.csv" @change="onFileSelect" style="display:none" />
          {{ t('imp.chooseFile') }}
        </label>
        <p class="upload-hint">{{ t('imp.acceptedFormats') }}</p>
      </template>
      <template v-else>
        <div class="file-info">
          <FileSpreadsheet :size="20" style="color: var(--success);" />
          <span>{{ t('imp.rowsDetected', { file: fileName, n: parsedData.length }) }}</span>
          <button class="btn btn-outline btn-sm" @click="clearImport" type="button">{{ t('imp.changeFile') }}</button>
        </div>
      </template>
    </div>

    <!-- Parsing error -->
    <div v-if="parseError" class="card error-card">
      <AlertCircle :size="16" />
      <span>{{ parseError }}</span>
    </div>

    <!-- Preview table -->
    <div v-if="parsedData.length > 0" class="card preview-card">
      <div class="preview-header">
        <h3>{{ t('imp.previewTitle') }}</h3>
        <div class="preview-stats">
          <span class="stat-ok">{{ t('imp.valid', { n: validCount }) }}</span>
          <span v-if="errorCount > 0" class="stat-err">{{ t('imp.errors', { n: errorCount }) }}</span>
        </div>
      </div>

      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th v-for="col in currentModule.columns" :key="col.key">{{ col.label }}</th>
              <th>{{ t('imp.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewRows" :key="i" :class="{ 'row-error': row._errors?.length }">
              <td class="row-num">{{ i + 1 }}</td>
              <td v-for="col in currentModule.columns" :key="col.key" :class="{ 'cell-error': row._errors?.includes(col.key) }">
                {{ row[col.key] ?? '' }}
              </td>
              <td>
                <span v-if="row._errors?.length" class="status-badge badge-error">
                  {{ t('imp.errors', { n: row._errors.length }) }}
                </span>
                <span v-else class="status-badge badge-ok">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="parsedData.length > maxPreview" class="preview-more">
        {{ t('imp.moreRows', { n: parsedData.length - maxPreview }) }}
      </div>

      <!-- Import mode -->
      <div class="import-options">
        <label class="radio-label">
          <input type="radio" v-model="importMode" value="add" />
          <span>{{ t('imp.modeAdd') }}</span>
        </label>
        <label class="radio-label">
          <input type="radio" v-model="importMode" value="update" />
          <span>{{ t('imp.modeUpdate') }}</span>
        </label>
      </div>

      <!-- Actions -->
      <div class="import-actions">
        <button class="btn btn-outline" @click="clearImport" type="button">{{ t('imp.cancel') }}</button>
        <button
          class="btn btn-primary"
          :disabled="validCount === 0 || importing"
          @click="executeImport"
          type="button"
        >
          <Loader2 v-if="importing" :size="16" class="spin-icon" />
          {{ importing ? t('imp.importing') : t('imp.importBtn', { n: validCount }) }}
        </button>
      </div>
    </div>

    <!-- Import result -->
    <div v-if="importResult" class="card result-card" :class="importResult.type">
      <CheckCircle2 v-if="importResult.type === 'success'" :size="20" />
      <AlertCircle v-else :size="20" />
      <div>
        <p class="result-title">{{ importResult.title }}</p>
        <p class="result-detail">{{ importResult.detail }}</p>
      </div>
    </div>

    <!-- Constat sur les matières : jamais bloquant, jamais présenté en erreur.
         Ce sont les intitulés de l'école qui font foi ; MIAPO ne fait que dire
         ce qui ne figure pas au programme officiel, quand il en existe un. -->
    <div v-if="constatMatieres" class="card constat-card">
      <Sparkles :size="18" />
      <div>
        <p class="result-title">{{ t('imp.constatTitle') }}</p>
        <p v-if="constatMatieres.ajoutees.length" class="result-detail">
          {{ t('imp.constatAjoutees', { n: constatMatieres.ajoutees.length }) }}
          <strong>{{ constatMatieres.ajoutees.join(' · ') }}</strong>
        </p>
        <p v-else class="result-detail">{{ t('imp.constatAucuneNouvelle') }}</p>
        <p v-if="!constatMatieres.comparaisonPossible" class="result-detail">
          {{ t('imp.constatPasDeReferentiel') }}
        </p>
        <p v-else-if="constatMatieres.horsReferentiel.length" class="result-detail">
          {{ t('imp.constatHorsRef', { n: constatMatieres.horsReferentiel.length }) }}
          <strong>{{ constatMatieres.horsReferentiel.join(' · ') }}</strong>
        </p>
        <p v-else class="result-detail">{{ t('imp.constatConforme') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Upload, Download, FileSpreadsheet, AlertCircle,
  CheckCircle2, Loader2, Users, Briefcase, BookOpen, GraduationCap, Calendar, Building2, PackageOpen,
  Camera, Sparkles, Trash2, Plus
} from 'lucide-vue-next'
import { analyserRegistre } from '../services/aiVision'
// XLSX is lazy-loaded on demand to avoid 437KB in the initial bundle
let XLSX = null
async function loadXLSX() {
  if (!XLSX) XLSX = await import('xlsx')
  return XLSX
}
import { useElevesStore } from '../stores/eleves'
import { usePersonnelStore } from '../stores/personnel'
import { useClassesStore, LEVELS, LEVELS_TOUS } from '../stores/classes'
import { useSubjectsStore, SUBJECT_DEFAULT_COLORS } from '../stores/subjects'
import { useActivityStore } from '../stores/activity'
import { useSchoolStore } from '../stores/school'
import { useEditionStore } from '../stores/edition'
import { useDisciplinesPrimaireStore, amorcePays, programmeOfficiel } from '../stores/disciplinesPrimaire'

const { t } = useI18n({ useScope: 'global' })
const elevesStore = useElevesStore()
const personnelStore = usePersonnelStore()
const classesStore = useClassesStore()
const subjectsStore = useSubjectsStore()
const activityStore = useActivityStore()
const schoolStore = useSchoolStore()
const editionStore = useEditionStore()
const discPrimaire = useDisciplinesPrimaireStore()

// ── Setup express : photo d'un registre → élèves (MIAPO vision) ──
// MIAPO lit la photo, le directeur RELIT/corrige le tableau, puis valide la
// création. Filet de sécurité : rien n'est créé sans clic explicite.
const expressClass = ref('')
const expressImage = ref('')     // photo réduite en data URL
const expressBusy = ref(false)   // lecture IA en cours
const expressError = ref('')
const expressRows = ref([])      // [{ nom, prenom, sexe, classe }]
const expressCreating = ref(false)
const expressDone = ref(0)

function expressDownscale(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (Math.max(width, height) > maxDim) { const r = maxDim / Math.max(width, height); width = Math.round(width * r); height = Math.round(height * r) }
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height); URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')) }
    img.src = url
  })
}
function matchClass(name) {
  if (!name) return ''
  const n = String(name).toLowerCase().replace(/\s+/g, '')
  const hit = (classesStore.classes || []).find((c) => String(c.name).toLowerCase().replace(/\s+/g, '') === n)
  return hit ? hit.name : name
}
async function onPickRegistre(e) {
  const file = e.target.files?.[0]; if (e.target) e.target.value = ''
  if (!file) return
  expressError.value = ''; expressDone.value = 0
  try { expressImage.value = await expressDownscale(file); expressRows.value = [] }
  catch { expressError.value = t('imp.expressBlurry') }
}
async function runRegistre() {
  if (!expressImage.value || expressBusy.value) return
  expressBusy.value = true; expressError.value = ''; expressDone.value = 0
  try {
    const res = await analyserRegistre({ imageDataUrl: expressImage.value, niveau: expressClass.value })
    if (res.ok) {
      if (!expressClass.value && res.classe) expressClass.value = matchClass(res.classe)
      const fallbackClass = expressClass.value || matchClass(res.classe)
      expressRows.value = (res.eleves || []).map((el) => ({ nom: el.nom, prenom: el.prenom, sexe: el.sexe, classe: fallbackClass }))
      if (!expressRows.value.length) expressError.value = t('imp.expressEmpty')
    } else {
      expressError.value = res.reason || t('imp.expressFail')
    }
  } catch { expressError.value = t('imp.expressFail') } finally { expressBusy.value = false }
}
const creatableCount = computed(() => expressRows.value.filter((r) => (r.nom || r.prenom) && (r.classe || expressClass.value)).length)
async function createFromRegistre() {
  if (!creatableCount.value || expressCreating.value) return
  expressCreating.value = true
  try {
    await elevesStore.loadEleves()
    let n = 0
    for (const r of expressRows.value) {
      const className = (r.classe || expressClass.value || '').trim()
      if (!(r.nom || r.prenom) || !className) continue
      await elevesStore.addEleve({
        lastName: (r.nom || '').trim(),
        firstName: (r.prenom || '').trim(),
        gender: r.sexe === 'F' ? 'F' : (r.sexe === 'M' ? 'M' : ''),
        className,
        status: 'inscrit',
        matricule: elevesStore.generateNextMatricule(),
      })
      n++
    }
    expressDone.value = n
    try { activityStore.log('import', `Registre photo : ${n} élève(s) créé(s)`) } catch { /* noop */ }
    expressRows.value = []
    expressImage.value = ''
  } finally {
    expressCreating.value = false
  }
}

// ── Module definitions ─────────────────────────────────
const modules = [
  {
    id: 'ecole',
    label: 'Configuration',
    icon: markRaw(Building2),
    desc: "Identité de l'établissement et compte du directeur — pour initialiser une nouvelle école.",
    single: true, // une seule ligne de configuration
    columns: [
      { key: 'schoolName', label: "Nom de l'école", required: true },
      { key: 'schoolType', label: 'Type (Collège/Lycée/Primaire)', required: false },
      { key: 'city', label: 'Ville', required: false },
      { key: 'country', label: 'Pays', required: false },
      { key: 'address', label: 'Adresse / Quartier', required: false },
      { key: 'phone', label: "Téléphone école", required: false },
      { key: 'email', label: "Email école", required: false },
      { key: 'academicYear', label: 'Année scolaire', required: false },
      { key: 'currency', label: 'Devise', required: false },
      { key: 'primaryColor', label: 'Couleur (hex)', required: false },
      { key: 'directorLastName', label: 'Nom du directeur', required: false },
      { key: 'directorFirstName', label: 'Prénom du directeur', required: false },
      { key: 'directorPhone', label: 'Tél du directeur', required: false },
      { key: 'directorEmail', label: 'Email du directeur', required: false },
    ],
    headerMap: {
      "nom de l'école": 'schoolName', "nom de l'ecole": 'schoolName', 'nom ecole': 'schoolName', 'nom école': 'schoolName', "ecole": 'schoolName', "école": 'schoolName', 'school name': 'schoolName', 'etablissement': 'schoolName', 'établissement': 'schoolName',
      'type': 'schoolType', 'type (collège/lycée/primaire)': 'schoolType', 'type (college/lycee/primaire)': 'schoolType', "type d'école": 'schoolType',
      'ville': 'city', 'city': 'city',
      'pays': 'country', 'country': 'country',
      'adresse': 'address', 'adresse / quartier': 'address', 'quartier': 'address', 'address': 'address',
      'telephone ecole': 'phone', 'téléphone école': 'phone', 'tel ecole': 'phone', 'téléphone': 'phone', 'telephone': 'phone',
      'email ecole': 'email', 'email école': 'email', 'email': 'email', 'e-mail': 'email', 'mail': 'email',
      'annee scolaire': 'academicYear', 'année scolaire': 'academicYear', 'annee': 'academicYear', 'année': 'academicYear',
      'devise': 'currency', 'monnaie': 'currency', 'currency': 'currency',
      'couleur': 'primaryColor', 'couleur (hex)': 'primaryColor', 'color': 'primaryColor', 'couleur principale': 'primaryColor',
      'nom du directeur': 'directorLastName', 'nom directeur': 'directorLastName',
      'prenom du directeur': 'directorFirstName', 'prénom du directeur': 'directorFirstName', 'prenom directeur': 'directorFirstName', 'prénom directeur': 'directorFirstName',
      'tel du directeur': 'directorPhone', 'tél du directeur': 'directorPhone', 'tel directeur': 'directorPhone', 'téléphone directeur': 'directorPhone',
      'email du directeur': 'directorEmail', 'email directeur': 'directorEmail', 'mail directeur': 'directorEmail',
    },
  },
  {
    id: 'eleves',
    label: 'Elèves',
    icon: markRaw(Users),
    desc: 'Importer la liste des élèves avec leurs informations.',
    columns: [
      { key: 'lastName', label: 'Nom', required: true },
      // Prénom facultatif : un nom unique est courant dans les registres du
      // Nord-Cameroun. Au moins un des deux est exigé (cf. validateRow).
      { key: 'firstName', label: 'Prénom', required: false },
      { key: 'gender', label: 'Sexe (M/F)', required: true },
      { key: 'dateOfBirth', label: 'Date naissance', required: false },
      { key: 'niveau', label: 'Niveau', required: false },
      { key: 'section', label: 'Classe', required: false },
      { key: 'city', label: 'Ville', required: false },
      { key: 'quartier', label: 'Quartier', required: false },
      { key: 'parentLastName', label: 'Nom parent', required: false },
      { key: 'parentFirstName', label: 'Prénom parent', required: false },
      { key: 'parentPhone', label: 'Tél parent', required: false },
      { key: 'parentPhone2', label: 'Tél 2', required: false },
      { key: 'parentEmail', label: 'Email parent', required: false },
      { key: 'matricule', label: 'Matricule', required: false },
    ],
    // Excel column → field mapping (header text → key)
    headerMap: {
      'nom': 'lastName', 'nom de famille': 'lastName', 'last name': 'lastName',
      'prenom': 'firstName', 'prénom': 'firstName', 'first name': 'firstName',
      'sexe': 'gender', 'sexe (m/f)': 'gender', 'genre': 'gender', 'gender': 'gender',
      'date de naissance': 'dateOfBirth', 'date naissance': 'dateOfBirth', 'naissance': 'dateOfBirth',
      'niveau': 'niveau', 'level': 'niveau',
      'classe': 'section', 'classe (a, b, c)': 'section', 'section': 'section', 'class': 'section',
      'ville': 'city', 'city': 'city',
      'quartier': 'quartier', 'quarter': 'quartier',
      'nom parent': 'parentLastName', 'parent nom': 'parentLastName',
      'prenom parent': 'parentFirstName', 'prénom parent': 'parentFirstName', 'parent prenom': 'parentFirstName', 'parent prénom': 'parentFirstName',
      'telephone': 'parentPhone', 'téléphone': 'parentPhone', 'tel parent': 'parentPhone', 'tél parent': 'parentPhone', 'phone': 'parentPhone',
      'telephone 2': 'parentPhone2', 'tel 2': 'parentPhone2', 'tél 2': 'parentPhone2',
      'email parent': 'parentEmail', 'parent email': 'parentEmail', 'email': 'parentEmail', 'mail parent': 'parentEmail', 'e-mail parent': 'parentEmail',
      'matricule': 'matricule', 'matric': 'matricule', 'mle': 'matricule', 'matricule eleve': 'matricule', 'matricule élève': 'matricule',
    },
  },
  {
    id: 'personnel',
    label: 'Personnel',
    icon: markRaw(Briefcase),
    desc: 'Importer la liste du personnel enseignant et administratif.',
    columns: [
      { key: 'lastName', label: 'Nom', required: true },
      // Idem élèves : le directeur de la première école réelle n'a qu'un nom.
      { key: 'firstName', label: 'Prénom', required: false },
      { key: 'category', label: 'Catégorie', required: true },
      { key: 'role', label: 'Fonction', required: false },
      { key: 'gender', label: 'Sexe (M/F)', required: false },
      { key: 'email', label: 'Email', required: false },
      { key: 'phone', label: 'Téléphone', required: false },
      { key: 'subjects', label: 'Matières (séparées par ;)', required: false },
    ],
    headerMap: {
      'nom': 'lastName', 'nom de famille': 'lastName', 'last name': 'lastName',
      'prenom': 'firstName', 'prénom': 'firstName', 'first name': 'firstName',
      'categorie': 'category', 'catégorie': 'category', 'category': 'category', 'type': 'category', 'cat': 'category',
      'fonction': 'role', 'role': 'role', 'poste': 'role',
      'sexe': 'gender', 'sexe (m/f)': 'gender', 'genre': 'gender', 'gender': 'gender',
      'email': 'email', 'e-mail': 'email', 'mail': 'email',
      'telephone': 'phone', 'téléphone': 'phone', 'tel': 'phone', 'tél': 'phone', 'phone': 'phone',
      'matieres': 'subjects', 'matières': 'subjects', 'matières (séparées par ;)': 'subjects', 'matieres (separees par ;)': 'subjects', 'subjects': 'subjects', 'discipline': 'subjects', 'disciplines': 'subjects',
    },
  },
  {
    id: 'matieres',
    label: 'Matières',
    icon: markRaw(GraduationCap),
    desc: 'Importer les matières et leurs coefficients par niveau.',
    columns: [
      { key: 'name', label: 'Matière', required: true },
      { key: 'cycle', label: 'Cycle', required: true },
      { key: 'coef_6e', label: 'Coef 6e', required: false },
      { key: 'coef_5e', label: 'Coef 5e', required: false },
      { key: 'coef_4e', label: 'Coef 4e', required: false },
      { key: 'coef_3e', label: 'Coef 3e', required: false },
      { key: 'coef_2nde', label: 'Coef 2nde', required: false },
      { key: 'coef_1ere', label: 'Coef 1ère', required: false },
      { key: 'coef_Tle', label: 'Coef Tle', required: false },
    ],
    headerMap: {
      'matiere': 'name', 'matière': 'name', 'nom': 'name', 'nom matiere': 'name', 'nom matière': 'name', 'name': 'name', 'subject': 'name', 'discipline': 'name',
      'cycle': 'cycle', 'cycles': 'cycle',
      'coef 6e': 'coef_6e', 'coefficient 6e': 'coef_6e', '6e': 'coef_6e', '6eme': 'coef_6e', '6ème': 'coef_6e',
      'coef 5e': 'coef_5e', 'coefficient 5e': 'coef_5e', '5e': 'coef_5e', '5eme': 'coef_5e', '5ème': 'coef_5e',
      'coef 4e': 'coef_4e', 'coefficient 4e': 'coef_4e', '4e': 'coef_4e', '4eme': 'coef_4e', '4ème': 'coef_4e',
      'coef 3e': 'coef_3e', 'coefficient 3e': 'coef_3e', '3e': 'coef_3e', '3eme': 'coef_3e', '3ème': 'coef_3e',
      'coef 2nde': 'coef_2nde', 'coefficient 2nde': 'coef_2nde', '2nde': 'coef_2nde', '2de': 'coef_2nde',
      'coef 1ere': 'coef_1ere', 'coef 1ère': 'coef_1ere', 'coefficient 1ere': 'coef_1ere', '1ere': 'coef_1ere', '1ère': 'coef_1ere',
      'coef tle': 'coef_Tle', 'coefficient tle': 'coef_Tle', 'tle': 'coef_Tle', 'terminale': 'coef_Tle',
    },
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: markRaw(BookOpen),
    desc: 'Importer la structure des classes et niveaux.',
    columns: [
      { key: 'level', label: 'Niveau', required: true },
      { key: 'serie', label: 'Série (A/B/C/D)', required: false },
      { key: 'capacity', label: 'Effectif max', required: false },
    ],
    headerMap: {
      'niveau': 'level', 'level': 'level',
      'classe': 'serie', 'classe (a, b, c)': 'serie', 'section': 'serie', 'serie': 'serie', 'série': 'serie', 'série (a/c/d)': 'serie', 'serie (a/c/d)': 'serie', 'série (a/b/c/d)': 'serie', 'serie (a/b/c/d)': 'serie', 'class': 'serie',
      'effectif': 'capacity', 'effectif max': 'capacity', 'capacite': 'capacity', 'capacité': 'capacity', 'max': 'capacity', 'capacity': 'capacity',
      // Le nom de la classe est dérivé (Niveau + Série). On garde ces alias en
      // rétro-compat : un ancien fichier avec une colonne « Nom classe » reste importable.
      'nom': 'name', 'nom classe': 'name', 'nom (auto)': 'name', 'name': 'name',
    },
  },
]

// Données d'exemple par module (modèles + classeur de démarrage).
const IMPORT_EXAMPLES = {
  ecole: [
    { schoolName: 'Collège Bilingue La Réussite', schoolType: 'Collège', city: 'Yaoundé', country: 'Cameroun', address: 'Quartier Mvog-Ada', phone: '+237 222 00 11 22', email: 'contact@lareussite.cm', academicYear: '2025-2026', currency: 'FCFA', primaryColor: '#1558B0', directorLastName: 'Nkoulou', directorFirstName: 'Joseph', directorPhone: '+237 699 00 11 22', directorEmail: 'directeur@lareussite.cm' },
  ],
  eleves: [
    { lastName: 'Kamga', firstName: 'Jean', gender: 'M', dateOfBirth: '2012-03-15', niveau: '6ème', section: 'A', city: 'Yaoundé', quartier: 'Bastos', parentLastName: 'Kamga', parentFirstName: 'Paul', parentPhone: '+237 699 112 233', parentPhone2: '' },
    { lastName: 'Ngo', firstName: 'Marie', gender: 'F', dateOfBirth: '2013-08-22', niveau: '6ème', section: '', city: 'Yaoundé', quartier: 'Mvan', parentLastName: 'Ngo', parentFirstName: 'Rose', parentPhone: '+237 677 445 566', parentPhone2: '' },
  ],
  personnel: [
    { lastName: 'Mbarga', firstName: 'Paul', category: 'enseignement', role: 'Professeur', gender: 'M', email: 'p.mbarga@ecole.com', phone: '+237 677 445 566', subjects: 'Français' },
    { lastName: 'Fouda', firstName: 'Marie', category: 'administration', role: 'Secrétaire', gender: 'F', email: 'secretariat@ecole.com', phone: '+237 699 112 233', subjects: '' },
  ],
  matieres: [
    { name: 'Mathématiques', cycle: 'Les deux', coef_6e: '6', coef_5e: '6', coef_4e: '5', coef_3e: '5', coef_2nde: '5', coef_1ere: '4', coef_Tle: '4' },
    { name: 'Philosophie', cycle: 'Second cycle', coef_6e: '', coef_5e: '', coef_4e: '', coef_3e: '', coef_2nde: '2', coef_1ere: '3', coef_Tle: '4' },
  ],
  classes: [
    { level: '6ème', serie: 'A', capacity: '60' },
    { level: '1ère', serie: 'C', capacity: '45' },
  ],
}

// Exemples pour l'édition PRIMAIRE (SIL→CM2, disciplines APC).
const IMPORT_EXAMPLES_PRIMAIRE = {
  ecole: [
    { schoolName: 'École Primaire Les Lauréats', schoolType: 'École primaire', city: 'Douala', country: 'Cameroun', address: 'Quartier Bonapriso', phone: '+237 233 00 22 33', email: 'contact@leslaureats.cm', academicYear: '2025-2026', currency: 'FCFA', primaryColor: '#1558B0', directorLastName: 'Eyenga', directorFirstName: 'Sylvie', directorPhone: '+237 699 22 33 44', directorEmail: 'direction@leslaureats.cm' },
  ],
  eleves: [
    { lastName: 'Biya', firstName: 'Estelle', gender: 'F', dateOfBirth: '2018-05-12', niveau: 'CP', section: 'A', city: 'Douala', quartier: 'Bonapriso', parentLastName: 'Biya', parentFirstName: 'Georges', parentPhone: '+237 699 12 34 56', parentPhone2: '' },
    { lastName: 'Mballa', firstName: 'Junior', gender: 'M', dateOfBirth: '2015-09-03', niveau: 'CM1', section: '', city: 'Douala', quartier: 'Akwa', parentLastName: 'Mballa', parentFirstName: 'Diane', parentPhone: '+237 677 65 43 21', parentPhone2: '' },
  ],
  personnel: [
    { lastName: 'Atangana', firstName: 'Bernadette', category: 'enseignement', role: 'Institutrice', gender: 'F', email: 'b.atangana@leslaureats.cm', phone: '+237 677 11 22 33', subjects: '' },
    { lastName: 'Eyenga', firstName: 'Sylvie', category: 'administration', role: 'Directrice', gender: 'F', email: 'direction@leslaureats.cm', phone: '+237 699 22 33 44', subjects: '' },
  ],
  matieres: [
    { name: 'Français', cycle: 'Primaire' },
    { name: 'Mathématiques', cycle: 'Primaire' },
    { name: 'Sciences et technologie', cycle: 'Primaire' },
  ],
  classes: [
    { level: 'SIL', serie: 'A', capacity: '45' },
    { level: 'CE1', serie: 'B', capacity: '45' },
    { level: 'CM2', serie: 'A', capacity: '40' },
  ],
}

// Jeu d'exemples selon l'édition active (Primaire vs Secondaire).
function currentExamples() {
  return editionStore.isPrimaire ? IMPORT_EXAMPLES_PRIMAIRE : IMPORT_EXAMPLES
}

// ── State ──────────────────────────────────────────────
const activeModule = ref('eleves')
const isDragging = ref(false)
const parsedData = ref([])
const fileName = ref('')
const parseError = ref('')
const importMode = ref('add')
const importing = ref(false)
const importResult = ref(null)
// Constat sur les matières après un import de personnel. Volontairement séparé
// de `importResult` : ce n'est ni un succès ni une erreur, c'est une remarque.
const constatMatieres = ref(null)
const maxPreview = 20

const currentModule = computed(() => modules.find(m => m.id === activeModule.value))

const previewRows = computed(() => parsedData.value.slice(0, maxPreview))

const validCount = computed(() => parsedData.value.filter(r => !r._errors?.length).length)
const errorCount = computed(() => parsedData.value.filter(r => r._errors?.length).length)

// ── Module switch ──────────────────────────────────────
function switchModule(id) {
  activeModule.value = id
  clearImport()
  // En changeant d'onglet, le compte rendu de l'import précédent n'a plus de
  // sens : il porterait sur un autre module.
  importResult.value = null
  constatMatieres.value = null
}

// ── File handling ──────────────────────────────────────
function onFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseFile(file)
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) parseFile(file)
}

const normFeuille = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** Nom de l'onglet correspondant à ce module, ou `null` s'il n'y en a pas. */
function feuilleDuModule(workbook, mod) {
  const vises = [normFeuille(mod.label), normFeuille(mod.id)]
  return workbook.SheetNames.find((n) => vises.includes(normFeuille(n))) || null
}

/**
 * Lit UN onglet et rend ses lignes validées pour ce module.
 *
 * Extrait de `parseFile` le 27/08/2026 pour servir aussi à l'import du classeur
 * entier : la bannière promettait « un seul fichier » alors que le bouton ne
 * faisait que TÉLÉCHARGER le modèle, l'import restant onglet par onglet.
 *
 * `exigerFeuille` : en import d'un seul module on accepte le premier onglet
 * venu (l'école exporte souvent une feuille isolée) ; en import du classeur
 * complet, non — prendre le premier onglet pour « Classes » importerait le mode
 * d'emploi comme s'il s'agissait de classes.
 */
function lireFeuille(workbook, mod, { exigerFeuille = false } = {}) {
  const nom = feuilleDuModule(workbook, mod)
  if (!nom && exigerFeuille) return null
  const sheet = workbook.Sheets[nom || workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!raw.length) return []

  const rawHeaders = Object.keys(raw[0])
  const mapping = {}

  for (const header of rawHeaders) {
    // Normalize: lowercase, strip *, _, accents-safe, trim extra spaces
    const clean = header.toLowerCase().replace(/[*_]/g, '').trim().replace(/\s+/g, ' ')
    if (mod.headerMap[clean]) {
      mapping[header] = mod.headerMap[clean]
    } else {
      // Fuzzy: check if column label matches (also cleaned)
      const col = mod.columns.find(c => {
        const labelClean = c.label.toLowerCase().replace(/[*_]/g, '').trim()
        return labelClean === clean || c.key.toLowerCase() === clean
      })
      if (col) mapping[header] = col.key
    }
  }

  // Parse rows — skip instruction rows (OBLIGATOIRE/optionnel)
  const rows = []
  for (const rawRow of raw) {
    // Detect instruction row: first cell value is "OBLIGATOIRE" or "optionnel"
    const firstVal = String(Object.values(rawRow)[0] || '').toLowerCase().trim()
    if (firstVal === 'obligatoire' || firstVal === 'optionnel') continue

    const row = {}
    let hasAnyValue = false
    for (const [rawKey, fieldKey] of Object.entries(mapping)) {
      let val = rawRow[rawKey]
      if (val instanceof Date) {
        val = `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
      }
      const str = String(val ?? '').trim()
      row[fieldKey] = str
      if (str) hasAnyValue = true
    }
    // Skip completely empty rows
    if (hasAnyValue) rows.push(row)
  }

  return rows.map((row) => validateRow(row, mod))
}

/** Ouvre le fichier et rend le classeur XLSX. */
async function ouvrirClasseur(file) {
  await loadXLSX()
  const data = await file.arrayBuffer()
  return XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true })
}

function parseFile(file) {
  parseError.value = ''
  importResult.value = null
  fileName.value = file.name
  ouvrirClasseur(file)
    .then((workbook) => {
      const lignes = lireFeuille(workbook, currentModule.value)
      if (!lignes.length) { parseError.value = t('imp.errEmpty'); return }
      parsedData.value = lignes
    })
    .catch((err) => { parseError.value = t('imp.errRead', { msg: err.message }) })
}

/** Compare deux intitulés sans se laisser piéger par la casse ni les accents. */
function cleMatiere(nom) {
  return String(nom || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Enregistre les matières ÉCRITES PAR L'ÉCOLE, telles quelles.
 *
 * MAPO n'a pas de programme à imposer : c'est l'école qui nomme ses matières.
 * Avant le 27/08/2026, les intitulés du fichier étaient posés sur la fiche de
 * l'enseignant sans devenir des matières de l'école — l'établissement se
 * retrouvait avec des enseignants rattachés à des matières inexistantes, et une
 * liste de matières qui n'était pas la sienne.
 *
 * On n'ALIGNE rien, on ne renomme rien, on ne bloque rien. On se contente de
 * dire, à la fin, ce qui ne figure pas au programme officiel du pays — quand un
 * programme officiel est réellement sourcé, ce qui n'est pas le cas partout.
 *
 * Renvoie `{ ajoutees, horsReferentiel, comparaisonPossible, pays }` ou `null`
 * si le fichier ne déclare aucune matière.
 */
async function enregistrerMatieresEcole(libellesBruts) {
  const libelles = [...new Map(
    libellesBruts
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .map((s) => [cleMatiere(s), s]),
  ).values()]
  if (!libelles.length) return null

  const pays = schoolStore.schoolSettings?.country || ''
  const ajoutees = []

  if (editionStore.isPrimaire) {
    await discPrimaire.load()
    // `ajouter` renvoie false sur doublon : on ne compte que les vraies ajouts.
    for (const nom of libelles) if (discPrimaire.ajouter(nom)) ajoutees.push(nom)
  } else {
    await subjectsStore.loadSubjects()
    for (const nom of libelles) {
      if (subjectsStore.getSubjectByName(nom)) continue
      subjectsStore.addSubject({
        name: nom, cycles: ['college', 'lycee'], coefficients: {},
        color: SUBJECT_DEFAULT_COLORS[nom] || '#CBD5E1',
      })
      ajoutees.push(nom)
    }
  }

  // ⚠️ Ne comparer QUE s'il existe un programme officiel sourcé. Signaler
  // « hors référentiel » en s'appuyant sur une simple amorce serait une
  // affirmation sans source — et une école de Dakar verrait sa liste entière
  // déclarée non conforme à un programme camerounais.
  const comparaisonPossible = editionStore.isPrimaire && programmeOfficiel(pays)
  let horsReferentiel = []
  if (comparaisonPossible) {
    const officiel = new Set(amorcePays(pays).map((d) => cleMatiere(d.name)))
    horsReferentiel = libelles.filter((n) => !officiel.has(cleMatiere(n)))
  }
  return { ajoutees, horsReferentiel, comparaisonPossible, pays }
}

function validateRow(row, mod) {
  const errors = []
  for (const col of mod.columns) {
    if (col.required && !row[col.key]) {
      errors.push(col.key)
    }
  }

  // ⚠️ Un nom unique n'est pas un nom incomplet (27/08/2026).
  //
  // Mesuré sur le registre de la première école réelle (Garoua) : 6 écoliers sur
  // 447 et LE DIRECTEUR lui-même sont inscrits sous un seul nom. Exiger un
  // prénom, c'est imposer une convention occidentale et refuser des gens qui
  // existent — le directeur de l'école serait le premier rejeté.
  //
  // On exige donc « au moins un des deux » plutôt que les deux.
  if (mod.id === 'eleves' || mod.id === 'personnel') {
    const nom = String(row.lastName || '').trim()
    const prenom = String(row.firstName || '').trim()
    if (!nom && !prenom) {
      if (!errors.includes('lastName')) errors.push('lastName')
    } else {
      // Le champ manquant n'est pas une erreur : on retire le grief éventuel.
      for (const cle of ['lastName', 'firstName']) {
        const i = errors.indexOf(cle)
        if (i >= 0) errors.splice(i, 1)
      }
    }
  }

  // Module-specific validation
  if (mod.id === 'eleves') {
    if (row.gender && !['M', 'F'].includes(row.gender.toUpperCase())) {
      errors.push('gender')
    } else if (row.gender) {
      row.gender = row.gender.toUpperCase()
    }
    // Composition de la classe : Niveau + Section (« 6ème » + « A » → « 6ème A »).
    // Avant la rentrée, l'école peut ne renseigner que le Niveau (la répartition
    // par classe se fait ensuite dans MAPO). Rétro-compat : un ancien fichier qui
    // met le nom complet dans « Classe » arrive ici comme section → className = ce nom.
    if (!row.className) {
      const lvl = LEVELS_TOUS.find(l => l.value === row.niveau || l.label === row.niveau)
      const niveauLabel = lvl ? lvl.label : (row.niveau || '')
      row.className = [niveauLabel, row.section].filter(Boolean).join(' ').trim()
    }
    if (!row.className) errors.push('niveau') // ni niveau ni classe : on ne sait pas où ranger l'élève
    const niveauOnly = !!row.niveau && !row.section // niveau seul (avant la rentrée) : pas de classe à recaler
    // Anti-typo : si des classes existent ET qu'une section précise est donnée,
    // la classe doit correspondre à une classe réelle (faute mineure recalée).
    if (row.className && classesStore.classes.length && !niveauOnly) {
      const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
      const match = classesStore.classes.find(c => norm(c.name) === norm(row.className))
      if (match) row.className = match.name
      else errors.push('className')
    }
  }
  if (mod.id === 'personnel') {
    const validCats = ['enseignement', 'administration', 'support']
    if (row.category && !validCats.includes(row.category.toLowerCase())) {
      // Try to guess
      const lower = row.category.toLowerCase()
      if (lower.includes('enseign') || lower.includes('prof')) row.category = 'enseignement'
      else if (lower.includes('admin') || lower.includes('secr')) row.category = 'administration'
      else if (lower.includes('support') || lower.includes('entret') || lower.includes('agent')) row.category = 'support'
      else errors.push('category')
    } else if (row.category) {
      row.category = row.category.toLowerCase()
    }
    // Parse subjects string → array
    if (row.subjects && typeof row.subjects === 'string') {
      row._subjectsList = row.subjects.split(/[;,]/).map(s => s.trim()).filter(Boolean)
    }
    // Sexe (optionnel)
    if (row.gender) {
      if (['M', 'F'].includes(row.gender.toUpperCase())) row.gender = row.gender.toUpperCase()
      else errors.push('gender')
    }
  }
  if (mod.id === 'matieres') {
    const cyc = (row.cycle || '').toLowerCase()
    if (cyc.includes('deux') || cyc.includes('both') || cyc.includes('tout')) row._cycles = ['college', 'lycee']
    else if (cyc.includes('premier') || cyc.includes('collège') || cyc.includes('college')) row._cycles = ['college']
    else if (cyc.includes('second') || cyc.includes('lycée') || cyc.includes('lycee')) row._cycles = ['lycee']
    else row._cycles = null

    const lvlMap = { coef_6e: '6e', coef_5e: '5e', coef_4e: '4e', coef_3e: '3e', coef_2nde: '2nde', coef_1ere: '1ere', coef_Tle: 'Tle' }
    const coeffs = {}
    for (const [k, lvl] of Object.entries(lvlMap)) {
      const v = parseInt(row[k], 10)
      if (!isNaN(v) && v > 0) coeffs[lvl] = v
    }
    row._coefficients = coeffs

    // Si le cycle n'est pas renseigné, on le déduit des coefficients fournis
    if (!row._cycles) {
      const cy = []
      if (['6e', '5e', '4e', '3e'].some(l => coeffs[l])) cy.push('college')
      if (['2nde', '1ere', 'Tle'].some(l => coeffs[l])) cy.push('lycee')
      if (cy.length) {
        row._cycles = cy
        const idx = errors.indexOf('cycle')
        if (idx !== -1) errors.splice(idx, 1)
      }
    }
  }
  if (mod.id === 'classes') {
    // OUVERT par conception : c'est l'école qui définit SES niveaux et sections
    // à la création. Le logiciel vise aussi l'anglophone (Form 1…) et le
    // technique (F1…), qui n'ont pas les mêmes dénominations. On ne REJETTE
    // donc aucun niveau : on tente seulement de canoniser les niveaux
    // francophones courants (ex. « 6ème » → « 6e ») par confort, sinon on garde
    // la dénomination de l'école telle quelle.
    if (row.level) {
      const known = LEVELS_TOUS.map(l => l.value)
      if (!known.includes(row.level)) {
        const l = row.level.toLowerCase().replace('è', 'e')
        // L'égalité passe AVANT le rapprochement par préfixe, sinon un « CP1 »
        // congolais serait recalé en « CP » camerounais : le niveau change sans
        // rien signaler, et l'école ne comprend pas où sont passés ses écoliers.
        const match = known.find(v => v.toLowerCase() === l)
          || known.find(v => l.startsWith(v.toLowerCase()))
        if (match) row.level = match
      }
    }
    // Série / section : libre (définie par l'école). Normalisation de casse seule.
    if (row.serie) row.serie = String(row.serie).toUpperCase().trim()
    if (row.capacity) row.capacity = parseInt(row.capacity, 10) || 60
    // Le nom de la classe = Niveau + Section (« 6ème A »). Plus besoin de le
    // saisir : on le dérive si absent (rétro-compat s'il est fourni directement).
    if (!row.name) {
      const lvl = LEVELS_TOUS.find(l => l.value === row.level)
      const niveauLabel = lvl ? lvl.label : (row.level || '')
      row.name = [niveauLabel, row.serie].filter(Boolean).join(' ').trim()
    }
  }

  row._errors = errors
  return row
}

/**
 * Vide l'ÉTAT DU FICHIER — pas le compte rendu de l'import.
 *
 * ⚠️ Défaut trouvé le 27/08/2026 : cette fonction remettait aussi
 * `importResult` à null, et elle est appelée juste APRÈS l'avoir renseigné en
 * fin d'import. Résultat : le bandeau « 447 ajoutés » s'effaçait dans le même
 * tick. L'école lançait un import de 447 écoliers et n'obtenait RIEN à
 * l'écran — un succès indistinguable d'un échec.
 */
function clearImport() {
  parsedData.value = []
  fileName.value = ''
  parseError.value = ''
}

// ── Template download ──────────────────────────────────
async function downloadTemplate() {
  await loadXLSX()
  const mod = currentModule.value

  // Example data per module (partagé avec le classeur de démarrage)
  const examples = currentExamples()

  // Build rows: instruction row + header row + example data
  // Row 1: Instructions (will be in row 1, above the headers which start row 2)
  const headers = mod.columns.map(c => c.label)

  // Build data rows from examples
  const exRows = (examples[mod.id] || []).map(exData => {
    const row = {}
    mod.columns.forEach(c => { row[c.label] = exData[c.key] || '' })
    return row
  })

  // Create worksheet with aoa (array of arrays) for full control
  const instrRow = mod.columns.map(c => c.required ? 'OBLIGATOIRE' : 'optionnel')
  const headerRow = headers
  const dataRows = exRows.map(r => mod.columns.map(c => r[c.label]))

  const aoa = [headerRow, instrRow, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Style: column widths
  ws['!cols'] = mod.columns.map(c => ({ wch: Math.max(c.label.length + 2, 16) }))

  // Color required headers in red and instruction row
  // SheetJS community edition doesn't support styles, but we can use cell comments
  // Instead, let's mark required columns clearly in the instruction row
  // The instruction row (row 2) already says OBLIGATOIRE / optionnel

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, mod.label)

  // Add a second sheet with instructions
  const instrData = [
    ['INSTRUCTIONS POUR REMPLIR CE FICHIER'],
    [''],
    ['1. La ligne 1 contient les noms des colonnes — NE PAS LA MODIFIER'],
    ['2. La ligne 2 indique les colonnes OBLIGATOIRES — SUPPRIMEZ-LA avant import'],
    ['3. Les lignes 3+ sont des exemples — REMPLACEZ-LES par vos données'],
    [''],
    ['Colonnes obligatoires :'],
    ...mod.columns.filter(c => c.required).map(c => [`   - ${c.label}`]),
    [''],
    ['Colonnes optionnelles :'],
    ...mod.columns.filter(c => !c.required).map(c => [`   - ${c.label}`]),
  ]

  if (mod.id === 'eleves') {
    instrData.push([''], ['NOTES :'],
      ['   - Sexe : M (masculin) ou F (féminin)'],
      ['   - Date naissance : format AAAA-MM-JJ (ex: 2012-03-15)'],
      ['   - Classe : nom exact tel que créé dans MAPO (ex: 4ème A, 6ème B)'],
    )
  } else if (mod.id === 'personnel') {
    instrData.push([''], ['NOTES :'],
      ['   - Catégorie : enseignement, administration, ou support'],
      ['   - Matières : séparez par point-virgule (ex: Français;Anglais)'],
    )
  } else if (mod.id === 'matieres') {
    instrData.push([''], ['NOTES :'],
      ['   - Cycle : Premier cycle (6e-3e), Second cycle (2nde-Tle), ou Les deux'],
      ['   - Coefficients : remplir uniquement les niveaux concernés, laisser vide sinon'],
    )
  } else if (mod.id === 'classes') {
    instrData.push([''], ['NOTES :'],
      ['   - Niveau : le niveau de votre établissement (SIL…CM2 au primaire ; 6e…Tle au secondaire).'],
      ['   - Série (A/B/C/D) : section ou série, optionnelle (ex. A, B ; ou C/D en 1ère et Tle).'],
      ['   - Le NOM de la classe est généré automatiquement : Niveau + Série (ex. « 6ème A »). Rien à saisir.'],
    )
  }

  const instrWs = XLSX.utils.aoa_to_sheet(instrData)
  instrWs['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions')

  XLSX.writeFile(wb, `modele_${mod.id}_MAPO.xlsx`)
}

// ── Classeur de démarrage complet (multi-onglets) ───────
// Un seul fichier Excel à apporter aux écoles : Configuration + Classes +
// Personnel + Élèves. Chaque onglet reste importable séparément.
async function downloadStarterWorkbook() {
  await loadXLSX()
  const wb = XLSX.utils.book_new()

  const guide = [
    ['CLASSEUR DE DÉMARRAGE MAPO'],
    [''],
    ["Ce fichier sert à initialiser une école : remplissez les onglets puis"],
    ['importez-le dans MAPO : menu Import, bouton « Importer le classeur ».'],
    ["MAPO lit tous les onglets en une fois et les enregistre dans le bon ordre."],
    [''],
    ['Onglets :'],
    ["   • Configuration — identité de l'école + directeur (1 seule ligne)"],
    ['   • Classes — structure des classes'],
    ['   • Personnel — enseignants et administratifs'],
    ['   • Elèves — liste des élèves'],
    [''],
    ['Dans chaque onglet :'],
    ['   - Ligne 1 = noms des colonnes (NE PAS modifier)'],
    ['   - Ligne 2 = OBLIGATOIRE / optionnel (à SUPPRIMER avant import)'],
    ['   - Lignes 3+ = exemples à REMPLACER par vos données'],
    [''],
    ['Astuce : vous pouvez aussi importer un seul onglet (ex. juste les élèves).'],
  ]
  const guideWs = XLSX.utils.aoa_to_sheet(guide)
  guideWs['!cols'] = [{ wch: 72 }]
  XLSX.utils.book_append_sheet(wb, guideWs, 'Mode demploi')

  const order = ['ecole', 'classes', 'personnel', 'eleves']
  for (const id of order) {
    const mod = modules.find(m => m.id === id)
    if (!mod) continue
    const headerRow = mod.columns.map(c => c.label)
    const instrRow = mod.columns.map(c => c.required ? 'OBLIGATOIRE' : 'optionnel')
    const exRows = (currentExamples()[id] || []).map(ex => mod.columns.map(c => ex[c.key] ?? ''))
    const ws = XLSX.utils.aoa_to_sheet([headerRow, instrRow, ...exRows])
    ws['!cols'] = mod.columns.map(c => ({ wch: Math.max(c.label.length + 2, 16) }))
    XLSX.utils.book_append_sheet(wb, ws, mod.label)
  }
  XLSX.writeFile(wb, 'classeur_demarrage_MAPO.xlsx')
}

// ── Execute import ─────────────────────────────────────
/**
 * Importe RÉELLEMENT les lignes valides d'un module. Rend { added, updated,
 * skipped }.
 *
 * Extrait de `executeImport` pour que l'import du classeur entier passe par le
 * MÊME code que l'import d'un onglet : deux chemins d'écriture pour une même
 * opération finissent toujours par diverger, et c'est celui qu'on teste le
 * moins qui casse.
 */
async function importerModule(modId, validRows) {
  let added = 0, updated = 0, skipped = 0

  if (modId === 'ecole') {
    const row = validRows[0]
    if (row) {
      const patch = {}
      const set = (k, v) => { if (v !== undefined && v !== null && String(v).trim() !== '') patch[k] = String(v).trim() }
      set('schoolName', row.schoolName)
      set('schoolType', row.schoolType)
      set('city', row.city)
      set('country', row.country)
      set('address', row.address)
      set('phone', row.phone)
      set('email', row.email)
      set('academicYear', row.academicYear)
      set('currency', row.currency)
      set('primaryColor', row.primaryColor)
      if (row.directorLastName || row.directorFirstName) {
        set('directorLastName', row.directorLastName)
        set('directorFirstName', row.directorFirstName)
        patch.directorName = [row.directorLastName, row.directorFirstName].filter(Boolean).join(' ')
        patch.directorTitle = 'Directeur'
      }
      set('directorPhone', row.directorPhone)
      set('directorEmail', row.directorEmail)
      await schoolStore.saveSettings(patch)
      // Créer le compte directeur dans le personnel (s'il n'existe pas déjà)
      if (row.directorLastName || row.directorFirstName) {
        try {
          await personnelStore.loadStaff()
          const exists = personnelStore.staff.find(m => (m.role || '').toLowerCase().includes('directeur'))
          if (!exists) {
            await personnelStore.addStaff({
              lastName: row.directorLastName || '', firstName: row.directorFirstName || '',
              category: 'administration', role: 'Directeur',
              phone: row.directorPhone || '', email: row.directorEmail || '',
              subjects: [], status: 'Actif',
            })
          }
        } catch (e) { /* non bloquant */ }
      }
      added = 1
    }
    activityStore.log('import', `Configuration de l'école importée`)
  }

  if (modId === 'eleves') {
    await elevesStore.loadEleves()
    for (const row of validRows) {
      // Clean row (remove internal fields)
      const data = { ...row }
      delete data._errors
      delete data.niveau   // intermédiaires : la classe finale est dans className
      delete data.section
      data.status = data.status || 'inscrit'
      if (!data.matricule) data.matricule = elevesStore.generateNextMatricule()

      if (importMode.value === 'update') {
        const existing = elevesStore.eleves.find(e =>
          e.lastName?.toLowerCase() === data.lastName?.toLowerCase() &&
          e.firstName?.toLowerCase() === data.firstName?.toLowerCase() &&
          e.className === data.className
        )
        if (existing) {
          await elevesStore.updateEleve(existing.id, data)
          updated++
          continue
        }
      }
      await elevesStore.addEleve(data)
      added++
    }
    activityStore.log('import', `Import élèves : ${added} ajouté(s), ${updated} mis à jour`)
  }

  else if (modId === 'personnel') {
    await personnelStore.loadStaff()
    // Les intitulés du fichier sont enregistrés AVANT la boucle : les fiches
    // du personnel doivent pointer sur des matières qui existent déjà.
    constatMatieres.value = await enregistrerMatieresEcole(
      validRows.flatMap((r) => r._subjectsList || []),
    )
    for (const row of validRows) {
      const data = { ...row }
      delete data._errors
      data.subjects = data._subjectsList || []
      delete data._subjectsList
      data.status = 'Actif'

      if (importMode.value === 'update') {
        const existing = personnelStore.staff.find(m =>
          m.lastName?.toLowerCase() === data.lastName?.toLowerCase() &&
          m.firstName?.toLowerCase() === data.firstName?.toLowerCase()
        )
        if (existing) {
          await personnelStore.updateStaff(existing.id, data)
          updated++
          continue
        }
      }
      await personnelStore.addStaff(data)
      added++
    }
    activityStore.log('import', `Import personnel : ${added} ajouté(s), ${updated} mis à jour`)
  }

  else if (modId === 'matieres') {
    await subjectsStore.loadSubjects()
    for (const row of validRows) {
      const data = {
        name: row.name,
        cycles: (row._cycles && row._cycles.length) ? row._cycles : ['college', 'lycee'],
        coefficients: row._coefficients || {},
        color: SUBJECT_DEFAULT_COLORS[row.name] || '#CBD5E1',
      }
      const existing = subjectsStore.getSubjectByName(data.name)
      if (existing) {
        if (importMode.value === 'update') {
          subjectsStore.updateSubject(existing.id, data)
          updated++
        } else {
          skipped++
        }
      } else {
        subjectsStore.addSubject(data)
        added++
      }
    }
    activityStore.log('import', `Import matières : ${added} ajoutée(s), ${updated} mise(s) à jour`)
  }

  else if (modId === 'classes') {
    await classesStore.loadClasses()
    for (const row of validRows) {
      const data = { ...row }
      delete data._errors
      data.capacity = parseInt(data.capacity, 10) || 60

      if (importMode.value === 'update') {
        const existing = classesStore.classes.find(c =>
          c.name?.toLowerCase() === data.name?.toLowerCase()
        )
        if (existing) {
          await classesStore.updateClass(existing.id, data)
          updated++
          continue
        }
      }
      await classesStore.addClass(data)
      added++
    }
    activityStore.log('import', `Import classes : ${added} ajoutée(s), ${updated} mise(s) à jour`)
  }

  return { added, updated, skipped }
}

/**
 * ORDRE d'import du classeur complet — il n'est PAS celui des onglets.
 *
 * ⚠️ Deux pièges mesurés sur la première école réelle :
 *   • les élèves sont recalés sur des classes existantes → Classes d'abord ;
 *   • l'import de Configuration crée un compte directeur s'il n'en existe pas
 *     encore. En passant Personnel AVANT, le directeur du fichier est reconnu
 *     et n'est pas créé une seconde fois.
 * Laisser l'école deviner cet ordre, c'est lui garantir un directeur en double.
 */
const ORDRE_CLASSEUR = ['classes', 'personnel', 'ecole', 'eleves']

/**
 * Importe le CLASSEUR ENTIER, onglet par onglet mais en un seul geste.
 *
 * La bannière promettait « un seul fichier » depuis le début, alors que le
 * bouton ne faisait que TÉLÉCHARGER le modèle. Steve : « je croyais que c'était
 * le fichier de démarrage à importer via le bouton qui lisait directement tous
 * les onglets ». Il avait raison de le croire : c'est ce qui était écrit.
 */
async function importerClasseur(file) {
  importing.value = true
  importResult.value = null
  constatMatieres.value = null
  parseError.value = ''
  fileName.value = file.name
  const lignes = []
  try {
    const workbook = await ouvrirClasseur(file)
    let touche = 0
    for (const id of ORDRE_CLASSEUR) {
      const mod = modules.find((m) => m.id === id)
      // `exigerFeuille` : sans onglet portant ce nom, on NE PREND PAS le premier
      // venu — importer le mode d'emploi comme des classes serait pire que rien.
      const rows = lireFeuille(workbook, mod, { exigerFeuille: true })
      if (rows === null) { lignes.push(`${mod.label} : onglet absent`); continue }
      const valides = rows.filter((r) => !r._errors?.length)
      const refuses = rows.length - valides.length
      if (!valides.length) {
        lignes.push(`${mod.label} : ${rows.length ? `${rows.length} ligne(s), aucune valide` : 'vide'}`)
        continue
      }
      // Le module actif suit : le tableau d'aperçu et le constat « matières »
      // doivent parler du même onglet que ce qu'on est en train d'écrire.
      activeModule.value = id
      parsedData.value = rows
      const bilan = await importerModule(id, valides)
      touche++
      lignes.push(`${mod.label} : ${resume(bilan)}${refuses ? ` — ${refuses} ligne(s) en erreur, non importée(s)` : ''}`)
    }
    importResult.value = {
      type: touche ? 'success' : 'error',
      title: touche ? t('imp.resultDoneTitle') : t('imp.resultErrTitle'),
      detail: lignes.join(' · '),
    }
    clearImport()
  } catch (err) {
    // On dit CE QUI A DÉJÀ ÉTÉ ÉCRIT avant l'échec : un simple message d'erreur
    // laisserait croire que rien n'a été importé, et l'école relancerait tout.
    importResult.value = {
      type: 'error',
      title: t('imp.resultErrTitle'),
      detail: [err.message || t('imp.errUnknown'), ...lignes].join(' · '),
    }
  } finally {
    importing.value = false
  }
}

function onClasseurSelect(e) {
  const file = e.target.files?.[0]
  if (file) importerClasseur(file)
  e.target.value = ''
}

/** Libellé « N ajouté(s), M mis à jour, K ignoré(s) ». */
function resume({ added, updated, skipped }) {
  return t('imp.added', { n: added })
    + (updated > 0 ? t('imp.updatedSuffix', { n: updated }) : '')
    + (skipped > 0 ? t('imp.skippedSuffix', { n: skipped }) : '')
}

async function executeImport() {
  importing.value = true
  importResult.value = null
  constatMatieres.value = null
  try {
    const validRows = parsedData.value.filter((r) => !r._errors?.length)
    const bilan = await importerModule(activeModule.value, validRows)
    importResult.value = { type: 'success', title: t('imp.resultDoneTitle'), detail: resume(bilan) }
    clearImport()
  } catch (err) {
    importResult.value = {
      type: 'error',
      title: t('imp.resultErrTitle'),
      detail: err.message || t('imp.errUnknown'),
    }
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.import-page {
  max-width: 960px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 { margin-bottom: 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.starter-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
  padding: 16px 18px; margin-bottom: 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(var(--pr-rgb), .10), rgba(var(--pr-rgb), .04));
  border: 1px solid rgba(var(--pr-rgb), .22);
}
.starter-banner-text { display: flex; align-items: center; gap: 12px; color: var(--pr); }
.starter-banner-text strong { display: block; font-size: 14.5px; color: var(--tx); }
.starter-banner-text span { display: block; font-size: 13px; color: var(--tx2); margin-top: 2px; max-width: 620px; }
.starter-btn { white-space: nowrap; flex-shrink: 0; }
.starter-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
/* Le second bouton est un <label> (il porte un input file caché) : on lui rend
   le comportement d'un bouton, y compris désactivé pendant un import. */
.starter-actions label.btn { cursor: pointer; }
.starter-actions label.btn.disabled { opacity: .6; pointer-events: none; }

.tabs-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--divider);
  padding-bottom: 0;
}
.tab-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  background: none;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--tx2);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}
.tab-button:hover { color: var(--tx); }
.tab-button.active { color: var(--pr); border-bottom-color: var(--pr); font-weight: 600; }

/* Info card */
.info-card {
  padding: 20px;
  margin-bottom: 16px;
}
.info-card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.info-card-header h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px;
}
.info-card-header p {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
}
.info-columns {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.info-col-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
}
.info-col-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba(0,0,0,.04);
  color: var(--tx2);
}
.info-col-tag.required {
  background: rgba(var(--pr-rgb),.08);
  color: var(--pr);
  font-weight: 600;
}

/* Upload zone */
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  border: 2px dashed var(--divider);
  text-align: center;
  transition: all 0.2s ease;
  margin-bottom: 16px;
}
.upload-zone.dragging {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb),.03);
}
.upload-text {
  font-size: 14px;
  color: var(--tx2);
  margin: 0 0 12px;
}
.upload-hint {
  font-size: 12px;
  color: var(--tx3);
  margin: 10px 0 0;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
}

/* Error card */
.error-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
  font-size: 13px;
  margin-bottom: 16px;
}

/* Preview */
.preview-card {
  padding: 0;
  overflow: hidden;
  margin-bottom: 16px;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--divider);
}
.preview-header h3 { font-size: 15px; font-weight: 600; margin: 0; }
.preview-stats { display: flex; gap: 12px; font-size: 13px; font-weight: 600; }
.stat-ok { color: var(--success); }
.stat-err { color: #dc2626; }

.preview-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.preview-table th {
  background: rgba(0,0,0,.03);
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--tx2);
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.preview-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--divider);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-num {
  width: 36px;
  text-align: center;
  color: var(--tx3);
}
.row-error { background: #fef2f2; }
.cell-error { color: #dc2626; font-weight: 600; }

.status-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
}
.badge-ok { background: #ecfdf5; color: #065f46; }
.badge-error { background: #fef2f2; color: #b91c1c; }

.preview-more {
  padding: 10px 18px;
  font-size: 12px;
  color: var(--tx3);
  text-align: center;
  border-top: 1px solid var(--divider);
}

/* Import options */
.import-options {
  display: flex;
  gap: 24px;
  padding: 14px 18px;
  border-top: 1px solid var(--divider);
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--tx2);
}
.radio-label input { accent-color: var(--pr); }

/* Actions */
.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--divider);
}

/* Result */
.result-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
}
.result-card.success {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}
.result-card.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.result-title { font-weight: 600; font-size: 14px; margin: 0 0 2px; }
.result-detail { font-size: 13px; margin: 0; opacity: 0.8; }

/* Constat sur les matières : ni vert ni rouge — ce n'est pas un verdict.
   Teinte d'accent de l'école, comme les autres remarques informatives. */
.constat-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 18px; margin-top: 12px;
  background: rgba(var(--pr-rgb), .06);
  border-color: rgba(var(--pr-rgb), .22);
  color: var(--tx);
}
.constat-card .result-detail { margin-top: 4px; }
/* Les intitulés de l'école en capitales : choix d'AFFICHAGE seulement, la donnée
   reste écrite telle que l'école l'a saisie. */
.constat-card strong { text-transform: uppercase; letter-spacing: .02em; }

/* Spin animation */
.spin-icon { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-sm { font-size: 13px; padding: 7px 16px; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-primary:hover { background: var(--pr-dark, #0E3F7E); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  background: transparent;
  border: 1.5px solid var(--divider);
  color: var(--tx2);
}
.btn-outline:hover { background: rgba(0,0,0,.03); }

@media (max-width: 768px) {
  /* Steps/tabs stack on mobile */
  .tabs-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
  .tab-item { flex-shrink: 0; white-space: nowrap; }

  /* File drop area full-width */
  .file-drop-area { padding: 24px 16px; min-height: 120px; }
  .drop-icon { margin-bottom: 12px; }
  .drop-text { font-size: 13px; }
  .drop-hint { font-size: 12px; }

  /* Import options stack */
  .import-options { flex-direction: column; gap: 10px; padding: 12px 16px; }
  .radio-label { font-size: 13px; }
  .info-columns { flex-direction: column; gap: 8px; }

  /* Preview table scrolls horizontally */
  .preview-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .preview-table { font-size: 12px; }
  .preview-table th { padding: 8px 6px; font-size: 10px; }
  .preview-table td { padding: 6px; max-width: 100px; }
  .row-num { width: 32px; font-size: 11px; }

  /* Preview header on mobile */
  .preview-header { padding: 12px 16px; flex-direction: column; gap: 8px; align-items: flex-start; }
  .preview-header h3 { font-size: 14px; }
  .preview-stats { font-size: 12px; flex-wrap: wrap; }

  /* Result card on mobile */
  .result-card { padding: 14px 16px; flex-direction: column; }
  .result-title { font-size: 13px; }
  .result-detail { font-size: 12px; }

  /* Buttons */
  .btn { min-height: 44px; font-size: 14px; }
  .btn-sm { min-height: 40px; padding: 8px 12px; }

  /* Import actions stack */
  .import-actions { flex-direction: column; padding: 12px 16px; gap: 8px; }
  .import-actions .btn { width: 100%; }

  /* Form elements touch-friendly */
  .field { margin-bottom: 12px; }
  .input, select { width: 100%; font-size: 16px; min-height: 44px; padding: 12px; }

  /* Status badges on mobile */
  .status-badge { font-size: 9px; padding: 2px 6px; }

  /* Page header responsive */
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-actions { width: 100%; flex-direction: column; }
  .page-header-actions .btn { width: 100%; }
  .express-controls { flex-direction: column; align-items: stretch; }
  .express-fg { min-width: 0; }
}

/* ── Setup express (photo du registre → élèves) ── */
.express-card { margin-bottom: 18px; }
.express-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.express-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--tx); }
.express-head p { margin: 3px 0 0; font-size: 13px; color: var(--tx2); line-height: 1.45; }
.express-spark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 10px; color: #fff; flex-shrink: 0;
  background: linear-gradient(135deg, var(--pr), #7c5cff);
  box-shadow: 0 3px 10px rgba(var(--pr-rgb), .35);
}
.express-controls { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.express-fg { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
.express-fg label { font-size: 12.5px; font-weight: 600; color: var(--tx2); }
.express-err { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 13px; color: #b3261e; }
.express-ok-banner { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 13px; color: #1B8A5A; font-weight: 600; }
.express-result { margin-top: 16px; border-top: 1px solid var(--divider, #eee); padding-top: 14px; }
.express-result-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.express-result-head strong { font-size: 14px; color: var(--tx); }
.express-hint { font-size: 12px; color: var(--tx3); }
.express-table-wrap { overflow-x: auto; }
.express-table { width: 100%; border-collapse: collapse; }
.express-table th {
  text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em;
  color: var(--tx3); font-weight: 600; padding: 4px 8px; border-bottom: 1px solid var(--divider, #eee);
}
.express-table td { padding: 4px 8px; border-bottom: 1px solid var(--divider, #f0f0f0); }
.express-table .cell {
  width: 100%; padding: 7px 9px; border: 1px solid var(--divider, #e5e7eb); border-radius: 8px;
  background: var(--input-bg, #fff); color: var(--tx); font-size: 13px; font-family: inherit; outline: none;
}
.express-table .cell:focus { border-color: var(--pr); }
.icon-x { border: none; background: transparent; color: var(--tx3); cursor: pointer; padding: 5px; border-radius: 6px; display: inline-flex; }
.icon-x:hover { background: rgba(217,48,37,.08); color: var(--danger, #b3261e); }
.express-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.spin { animation: spin 1s linear infinite; }
</style>
