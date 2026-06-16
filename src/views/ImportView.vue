<template>
  <div class="import-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Import de données</h1>
        <p>Importez des données depuis un fichier Excel (.xlsx)</p>
      </div>
    </div>

    <!-- Classeur de démarrage : un seul fichier pour initialiser une école -->
    <div class="starter-banner">
      <div class="starter-banner-text">
        <PackageOpen :size="24" />
        <div>
          <strong>Nouvelle école ? Démarrez avec un seul fichier.</strong>
          <span>Téléchargez le classeur complet (configuration, classes, personnel, élèves), remplissez-le sur le terrain, puis importez chaque onglet.</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm starter-btn" @click="downloadStarterWorkbook" type="button">
        <Download :size="15" />
        Classeur de démarrage
      </button>
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
        <span class="info-col-label">Colonnes attendues :</span>
        <span v-for="col in currentModule.columns" :key="col.key" class="info-col-tag" :class="{ required: col.required }">
          {{ col.label }}{{ col.required ? ' *' : '' }}
        </span>
      </div>
      <button class="btn btn-outline btn-sm" @click="downloadTemplate" type="button">
        <Download :size="14" />
        Télécharger le modèle Excel
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
        <p class="upload-text">Glissez un fichier Excel ici ou</p>
        <label class="btn btn-primary btn-sm upload-btn">
          <input type="file" accept=".xlsx,.xls,.csv" @change="onFileSelect" style="display:none" />
          Choisir un fichier
        </label>
        <p class="upload-hint">Formats acceptés : .xlsx, .xls, .csv</p>
      </template>
      <template v-else>
        <div class="file-info">
          <FileSpreadsheet :size="20" style="color: var(--success);" />
          <span>{{ fileName }} — {{ parsedData.length }} ligne(s) détectée(s)</span>
          <button class="btn btn-outline btn-sm" @click="clearImport" type="button">Changer de fichier</button>
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
        <h3>Aperçu des données</h3>
        <div class="preview-stats">
          <span class="stat-ok">{{ validCount }} valides</span>
          <span v-if="errorCount > 0" class="stat-err">{{ errorCount }} erreur(s)</span>
        </div>
      </div>

      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th v-for="col in currentModule.columns" :key="col.key">{{ col.label }}</th>
              <th>Statut</th>
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
                  {{ row._errors.length }} erreur(s)
                </span>
                <span v-else class="status-badge badge-ok">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="parsedData.length > maxPreview" class="preview-more">
        ... et {{ parsedData.length - maxPreview }} autre(s) ligne(s)
      </div>

      <!-- Import mode -->
      <div class="import-options">
        <label class="radio-label">
          <input type="radio" v-model="importMode" value="add" />
          <span>Ajouter uniquement (nouvelles entrées)</span>
        </label>
        <label class="radio-label">
          <input type="radio" v-model="importMode" value="update" />
          <span>Mettre à jour les existants + ajouter les nouveaux</span>
        </label>
      </div>

      <!-- Actions -->
      <div class="import-actions">
        <button class="btn btn-outline" @click="clearImport" type="button">Annuler</button>
        <button
          class="btn btn-primary"
          :disabled="validCount === 0 || importing"
          @click="executeImport"
          type="button"
        >
          <Loader2 v-if="importing" :size="16" class="spin-icon" />
          {{ importing ? 'Import en cours...' : `Importer ${validCount} entrée(s)` }}
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
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import {
  Upload, Download, FileSpreadsheet, AlertCircle,
  CheckCircle2, Loader2, Users, Briefcase, BookOpen, GraduationCap, Calendar, Building2, PackageOpen
} from 'lucide-vue-next'
// XLSX is lazy-loaded on demand to avoid 437KB in the initial bundle
let XLSX = null
async function loadXLSX() {
  if (!XLSX) XLSX = await import('xlsx')
  return XLSX
}
import { useElevesStore } from '../stores/eleves'
import { usePersonnelStore } from '../stores/personnel'
import { useClassesStore } from '../stores/classes'
import { useSubjectsStore, SUBJECT_DEFAULT_COLORS } from '../stores/subjects'
import { useActivityStore } from '../stores/activity'
import { useSchoolStore } from '../stores/school'

const elevesStore = useElevesStore()
const personnelStore = usePersonnelStore()
const classesStore = useClassesStore()
const subjectsStore = useSubjectsStore()
const activityStore = useActivityStore()
const schoolStore = useSchoolStore()

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
      { key: 'firstName', label: 'Prénom', required: true },
      { key: 'gender', label: 'Sexe (M/F)', required: true },
      { key: 'dateOfBirth', label: 'Date naissance', required: false },
      { key: 'className', label: 'Classe', required: true },
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
      'classe': 'className', 'class': 'className',
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
      { key: 'firstName', label: 'Prénom', required: true },
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
      { key: 'name', label: 'Nom classe', required: true },
      { key: 'level', label: 'Niveau', required: true },
      { key: 'serie', label: 'Série (A/C/D)', required: false },
      { key: 'capacity', label: 'Effectif max', required: false },
    ],
    headerMap: {
      'nom': 'name', 'nom classe': 'name', 'classe': 'name', 'class': 'name', 'name': 'name',
      'niveau': 'level', 'level': 'level',
      'serie': 'serie', 'série': 'serie', 'série (a/c/d)': 'serie', 'serie (a/c/d)': 'serie',
      'effectif': 'capacity', 'effectif max': 'capacity', 'capacite': 'capacity', 'capacité': 'capacity', 'max': 'capacity', 'capacity': 'capacity',
    },
  },
]

// Données d'exemple par module (modèles + classeur de démarrage).
const IMPORT_EXAMPLES = {
  ecole: [
    { schoolName: 'Collège Bilingue La Réussite', schoolType: 'Collège', city: 'Yaoundé', country: 'Cameroun', address: 'Quartier Mvog-Ada', phone: '+237 222 00 11 22', email: 'contact@lareussite.cm', academicYear: '2025-2026', currency: 'FCFA', primaryColor: '#1558B0', directorLastName: 'Nkoulou', directorFirstName: 'Joseph', directorPhone: '+237 699 00 11 22', directorEmail: 'directeur@lareussite.cm' },
  ],
  eleves: [
    { lastName: 'Kamga', firstName: 'Jean', gender: 'M', dateOfBirth: '2012-03-15', className: '4ème A', city: 'Yaoundé', quartier: 'Bastos', parentLastName: 'Kamga', parentFirstName: 'Paul', parentPhone: '+237 699 112 233', parentPhone2: '' },
    { lastName: 'Ngo', firstName: 'Marie', gender: 'F', dateOfBirth: '2013-08-22', className: '5ème B', city: 'Yaoundé', quartier: 'Mvan', parentLastName: 'Ngo', parentFirstName: 'Rose', parentPhone: '+237 677 445 566', parentPhone2: '' },
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
    { name: '6ème A', level: '6e', serie: '', capacity: '60' },
    { name: '1ère C', level: '1ere', serie: 'C', capacity: '45' },
  ],
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
const maxPreview = 20

const currentModule = computed(() => modules.find(m => m.id === activeModule.value))

const previewRows = computed(() => parsedData.value.slice(0, maxPreview))

const validCount = computed(() => parsedData.value.filter(r => !r._errors?.length).length)
const errorCount = computed(() => parsedData.value.filter(r => r._errors?.length).length)

// ── Module switch ──────────────────────────────────────
function switchModule(id) {
  activeModule.value = id
  clearImport()
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

function parseFile(file) {
  parseError.value = ''
  importResult.value = null
  fileName.value = file.name

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      await loadXLSX()
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array', cellDates: true })
      // Classeur multi-onglets : on prend l'onglet qui correspond au module
      // actif (par son nom), sinon le premier. Permet d'importer un module
      // précis depuis le « classeur de démarrage » complet.
      const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
      const mod0 = currentModule.value
      const wanted = [norm(mod0.label), norm(mod0.id)]
      const matchName = workbook.SheetNames.find((n) => wanted.includes(norm(n)))
      const sheetName = matchName || workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (!raw.length) {
        parseError.value = 'Le fichier est vide ou le format est invalide.'
        return
      }

      // Map headers to fields
      const mod = currentModule.value
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

      // Validate
      const validated = rows.map(row => validateRow(row, mod))
      parsedData.value = validated
    } catch (err) {
      parseError.value = `Erreur de lecture : ${err.message}`
    }
  }
  reader.readAsArrayBuffer(file)
}

function validateRow(row, mod) {
  const errors = []
  for (const col of mod.columns) {
    if (col.required && !row[col.key]) {
      errors.push(col.key)
    }
  }

  // Module-specific validation
  if (mod.id === 'eleves') {
    if (row.gender && !['M', 'F'].includes(row.gender.toUpperCase())) {
      errors.push('gender')
    } else if (row.gender) {
      row.gender = row.gender.toUpperCase()
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
    const validLevels = ['6e', '5e', '4e', '3e', '2nde', '1ere', 'Tle']
    if (row.level && !validLevels.includes(row.level)) {
      // Try to normalize
      const l = row.level.toLowerCase().replace('è', 'e').replace('nde', 'nde')
      const match = validLevels.find(v => v.toLowerCase() === l || l.startsWith(v.toLowerCase()))
      if (match) row.level = match
      else errors.push('level')
    }
    if (row.serie && !['A', 'C', 'D', ''].includes(row.serie.toUpperCase())) {
      errors.push('serie')
    } else if (row.serie) {
      row.serie = row.serie.toUpperCase()
    }
    if (row.capacity) row.capacity = parseInt(row.capacity, 10) || 60
  }

  row._errors = errors
  return row
}

function clearImport() {
  parsedData.value = []
  fileName.value = ''
  parseError.value = ''
  importResult.value = null
}

// ── Template download ──────────────────────────────────
async function downloadTemplate() {
  await loadXLSX()
  const mod = currentModule.value

  // Example data per module (partagé avec le classeur de démarrage)
  const examples = IMPORT_EXAMPLES

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
      ['   - Niveau : 6e, 5e, 4e, 3e, 2nde, 1ère, ou Tle'],
      ['   - Série : A, C, ou D (uniquement pour 1ère et Tle)'],
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
    ['importez-le dans MAPO (menu Import, onglet par onglet).'],
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
    const exRows = (IMPORT_EXAMPLES[id] || []).map(ex => mod.columns.map(c => ex[c.key] ?? ''))
    const ws = XLSX.utils.aoa_to_sheet([headerRow, instrRow, ...exRows])
    ws['!cols'] = mod.columns.map(c => ({ wch: Math.max(c.label.length + 2, 16) }))
    XLSX.utils.book_append_sheet(wb, ws, mod.label)
  }
  XLSX.writeFile(wb, 'classeur_demarrage_MAPO.xlsx')
}

// ── Execute import ─────────────────────────────────────
async function executeImport() {
  importing.value = true
  importResult.value = null

  try {
    const validRows = parsedData.value.filter(r => !r._errors?.length)
    let added = 0, updated = 0, skipped = 0

    if (activeModule.value === 'ecole') {
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

    if (activeModule.value === 'eleves') {
      await elevesStore.loadEleves()
      for (const row of validRows) {
        // Clean row (remove internal fields)
        const data = { ...row }
        delete data._errors
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

    else if (activeModule.value === 'personnel') {
      await personnelStore.loadStaff()
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

    else if (activeModule.value === 'matieres') {
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

    else if (activeModule.value === 'classes') {
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

    importResult.value = {
      type: 'success',
      title: 'Import terminé',
      detail: `${added} ajouté(s)${updated > 0 ? `, ${updated} mis à jour` : ''}${skipped > 0 ? `, ${skipped} ignoré(s)` : ''}`
    }
    clearImport()
  } catch (err) {
    importResult.value = {
      type: 'error',
      title: 'Erreur lors de l\'import',
      detail: err.message || 'Erreur inconnue'
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
}
</style>
