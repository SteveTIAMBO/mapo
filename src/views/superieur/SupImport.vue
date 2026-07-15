<template>
  <div class="si">
    <div class="si-intro">
      <h1 class="si-h1">Import groupé des étudiants</h1>
      <p class="si-sub">
        Importez une promotion entière depuis un fichier Excel ou CSV.
        MAPO lit le fichier, vous relisez l'aperçu, puis vous validez la création.
      </p>
    </div>

    <!-- Classeur de démarrage -->
    <div class="si-starter">
      <div class="si-starter-text">
        <span class="si-starter-ico">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><path d="m19 10-7 7-7-7"/><path d="M5 21h14"/></svg>
        </span>
        <div>
          <strong>Classeur de démarrage</strong>
          <span>Un modèle Excel pré-rempli d'exemples (promotions réelles de l'établissement) à compléter puis réimporter.</span>
        </div>
      </div>
      <button class="si-btn-ghost" type="button" @click="downloadStarterWorkbook">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Télécharger le classeur
      </button>
    </div>

    <!-- Colonnes attendues -->
    <div class="si-panel">
      <div class="si-panel-head">
        <div>
          <h3 class="si-panel-title">Colonnes attendues</h3>
          <p class="si-panel-desc">Le fichier doit comporter au minimum le nom et le prénom. La promotion peut être indiquée par colonne ou choisie ci-dessous.</p>
        </div>
        <button class="si-btn-ghost si-btn-sm" type="button" @click="downloadTemplate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Modèle vierge
        </button>
      </div>
      <div class="si-cols">
        <span v-for="c in COLUMNS" :key="c.key" class="si-col-tag" :class="{ req: c.required }">
          {{ c.label }}{{ c.required ? ' *' : '' }}
        </span>
      </div>
      <div class="si-fallback">
        <label class="si-fallback-label">Promotion par défaut</label>
        <select v-model="fallbackPromotionId" class="si-select" @change="revalidate">
          <option v-for="p in store.promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
        <span class="si-fallback-hint">Appliquée aux lignes sans colonne « Promotion » reconnaissable.</span>
      </div>
    </div>

    <!-- Zone d'import -->
    <div
      class="si-drop"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!parsedData.length">
        <svg class="si-drop-ico" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <p class="si-drop-text">Glissez un fichier ici, ou</p>
        <label class="si-btn-primary si-drop-btn">
          <input type="file" accept=".xlsx,.xls,.csv" @change="onFileSelect" style="display:none" />
          Choisir un fichier
        </label>
        <p class="si-drop-hint">Formats acceptés : .xlsx, .xls, .csv</p>
      </template>
      <template v-else>
        <div class="si-file">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--pr)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span><strong>{{ fileName }}</strong> — {{ parsedData.length }} ligne(s) détectée(s)</span>
          <button class="si-btn-ghost si-btn-sm" type="button" @click="clearImport">Changer de fichier</button>
        </div>
      </template>
    </div>

    <!-- Erreur de lecture -->
    <div v-if="parseError" class="si-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ parseError }}</span>
    </div>

    <!-- Aperçu -->
    <div v-if="parsedData.length" class="si-panel">
      <div class="si-preview-head">
        <h3 class="si-panel-title">Aperçu avant import</h3>
        <div class="si-stats">
          <span class="si-stat-ok">{{ validCount }} valide(s)</span>
          <span v-if="errorCount" class="si-stat-err">{{ errorCount }} en erreur</span>
        </div>
      </div>

      <div class="si-table-wrap">
        <table class="si-table">
          <thead>
            <tr>
              <th class="si-num">#</th>
              <th v-for="c in COLUMNS" :key="c.key">{{ c.label }}</th>
              <th>Promotion cible</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewRows" :key="i" :class="{ 'si-row-err': row._errors.length }">
              <td class="si-num">{{ i + 1 }}</td>
              <td v-for="c in COLUMNS" :key="c.key" :class="{ 'si-cell-err': row._errors.includes(c.key) }">
                {{ row[c.key] ?? '' }}
              </td>
              <td class="si-promo">{{ row._promoLabel }}</td>
              <td>
                <span v-if="row._errors.length" class="si-badge si-badge-err">{{ row._errors.length }} erreur(s)</span>
                <span v-else class="si-badge si-badge-ok">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="parsedData.length > maxPreview" class="si-more">
        + {{ parsedData.length - maxPreview }} autre(s) ligne(s) non affichée(s)
      </div>

      <div class="si-actions">
        <button class="si-btn-ghost" type="button" @click="clearImport">Annuler</button>
        <button class="si-btn-primary" type="button" :disabled="validCount === 0 || importing" @click="executeImport">
          {{ importing ? 'Import en cours…' : `Importer ${validCount} étudiant(s)` }}
        </button>
      </div>
    </div>

    <!-- Résultat -->
    <div v-if="importResult" class="si-result" :class="importResult.type">
      <svg v-if="importResult.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <p class="si-result-title">{{ importResult.title }}</p>
        <p class="si-result-detail">{{ importResult.detail }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()

// XLSX chargé à la demande (évite d'alourdir le bundle initial).
let XLSX = null
async function loadXLSX() {
  if (!XLSX) XLSX = await import('xlsx')
  return XLSX
}

// ── Colonnes du fichier étudiants ─────────────────────────────────
const COLUMNS = [
  { key: 'matricule', label: 'Matricule', required: false },
  { key: 'nom', label: 'Nom', required: true },
  { key: 'prenom', label: 'Prénom', required: true },
  { key: 'promotion', label: 'Promotion', required: false },
  { key: 'villeOrigine', label: "Ville d'origine", required: false },
  { key: 'moyenne', label: 'Moyenne /20', required: false },
  { key: 'statut', label: 'Statut', required: false },
  { key: 'boursier', label: 'Boursier (oui/non)', required: false },
]
const HEADER_MAP = {
  'matricule': 'matricule', 'mle': 'matricule', 'matricule etudiant': 'matricule', 'matricule etudiant(e)': 'matricule',
  'nom': 'nom', 'nom de famille': 'nom', 'last name': 'nom',
  'prenom': 'prenom', 'first name': 'prenom',
  'promotion': 'promotion', 'promo': 'promotion', 'classe': 'promotion', 'niveau': 'promotion', 'programme': 'promotion', 'filiere': 'promotion', 'annee': 'promotion',
  'ville': 'villeOrigine', "ville d'origine": 'villeOrigine', 'ville origine': 'villeOrigine', 'origine': 'villeOrigine',
  'moyenne': 'moyenne', 'moyenne /20': 'moyenne', 'moy': 'moyenne',
  'statut': 'statut', 'status': 'statut',
  'boursier': 'boursier', 'bourse': 'boursier', 'boursier (oui/non)': 'boursier',
}

const fallbackPromotionId = ref(store.promotions[0]?.id || '')

// ── Normalisation + résolution de promotion ───────────────────────
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
function resolvePromotion(text) {
  const q = norm(text)
  if (!q) return null
  const promos = store.promotions
  // 1. Libellé combiné exact « programme année » ou « année programme »
  for (const p of promos) {
    if (q === norm(`${p.programmeNom} ${p.anneeNom}`) || q === norm(`${p.anneeNom} ${p.programmeNom}`)) return p
  }
  // 2. Contient le programme ET l'année
  for (const p of promos) {
    const prog = norm(p.programmeNom), annee = norm(p.anneeNom)
    if (prog && annee && q.includes(prog) && q.includes(annee)) return p
  }
  // 3. Identifiant de promotion
  for (const p of promos) {
    if (norm(p.id) && q.includes(norm(p.id))) return p
  }
  return null
}

// ── State ─────────────────────────────────────────────────────────
const isDragging = ref(false)
const parsedData = ref([])
const fileName = ref('')
const parseError = ref('')
const importing = ref(false)
const importResult = ref(null)
const maxPreview = 20

const previewRows = computed(() => parsedData.value.slice(0, maxPreview))
const validCount = computed(() => parsedData.value.filter((r) => !r._errors.length).length)
const errorCount = computed(() => parsedData.value.filter((r) => r._errors.length).length)

// ── Lecture du fichier ────────────────────────────────────────────
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
      // Onglet « Etudiants » si présent, sinon le premier.
      const wanted = ['etudiants', 'etudiant', 'eleves']
      const matchName = workbook.SheetNames.find((n) => wanted.includes(norm(n)))
      const sheet = workbook.Sheets[matchName || workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if (!raw.length) { parseError.value = 'Le fichier ne contient aucune ligne exploitable.'; return }

      const rawHeaders = Object.keys(raw[0])
      const mapping = {}
      for (const header of rawHeaders) {
        const clean = header.toLowerCase().replace(/[*_]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ')
        if (HEADER_MAP[clean]) mapping[header] = HEADER_MAP[clean]
        else {
          const col = COLUMNS.find((c) => c.label.toLowerCase().replace(/[*_]/g, '').trim() === clean || c.key.toLowerCase() === clean)
          if (col) mapping[header] = col.key
        }
      }

      const rows = []
      for (const rawRow of raw) {
        const firstVal = String(Object.values(rawRow)[0] || '').toLowerCase().trim()
        if (firstVal === 'obligatoire' || firstVal === 'optionnel') continue
        const row = {}
        let hasVal = false
        for (const [rawKey, fieldKey] of Object.entries(mapping)) {
          const str = String(rawRow[rawKey] ?? '').trim()
          row[fieldKey] = str
          if (str) hasVal = true
        }
        if (hasVal) rows.push(row)
      }
      parsedData.value = rows.map(validateRow)
    } catch (err) {
      parseError.value = `Lecture impossible : ${err.message}`
    }
  }
  reader.readAsArrayBuffer(file)
}

function validateRow(row) {
  const errors = []
  for (const c of COLUMNS) {
    if (c.required && !row[c.key]) errors.push(c.key)
  }
  const promo = resolvePromotion(row.promotion) || store.promotions.find((p) => p.id === fallbackPromotionId.value) || null
  if (!promo) errors.push('promotion')
  row._promoId = promo ? promo.id : null
  row._promoLabel = promo ? `${promo.programmeNom} — ${promo.anneeNom}` : '—'
  row._errors = errors
  return row
}
function revalidate() {
  if (parsedData.value.length) parsedData.value = parsedData.value.map(validateRow)
}

function clearImport() {
  parsedData.value = []
  fileName.value = ''
  parseError.value = ''
}

// ── Import réel (append-only, non destructif) ─────────────────────
function executeImport() {
  importing.value = true
  importResult.value = null
  try {
    const valid = parsedData.value.filter((r) => !r._errors.length)
    let added = 0
    for (const row of valid) {
      const boursier = /^(oui|o|yes|y|1|vrai|true)$/i.test(String(row.boursier || '').trim())
      const statut = norm(row.statut).includes('diffic') ? 'en_difficulte' : 'inscrit'
      store.addEtudiant({
        promotionId: row._promoId,
        matricule: row.matricule,
        nom: row.nom,
        prenom: row.prenom,
        villeOrigine: row.villeOrigine,
        moyenne: row.moyenne,
        statut,
        boursier,
      })
      added++
    }
    importResult.value = {
      type: 'success',
      title: 'Import terminé',
      detail: `${added} étudiant(s) ajouté(s) à l'établissement. Ils apparaissent dès maintenant dans la liste des étudiants.`,
    }
    clearImport()
  } catch (err) {
    importResult.value = { type: 'error', title: "Échec de l'import", detail: err.message || 'Erreur inconnue.' }
  } finally {
    importing.value = false
  }
}

// ── Génération des modèles Excel ──────────────────────────────────
function exampleRows() {
  const p0 = store.promotions[0]
  const p1 = store.promotions.find((p) => p.id !== p0?.id) || p0
  const lbl = (p) => (p ? `${p.programmeNom} — ${p.anneeNom}` : '')
  return [
    { matricule: '', nom: 'Nkoulou', prenom: 'Jean', promotion: lbl(p0), villeOrigine: 'Yaoundé', moyenne: '13.5', statut: 'inscrit', boursier: 'non' },
    { matricule: '', nom: 'Bello', prenom: 'Aïssatou', promotion: lbl(p1), villeOrigine: 'Maroua', moyenne: '15', statut: 'inscrit', boursier: 'oui' },
    { matricule: '', nom: 'Fotso', prenom: 'Armand', promotion: lbl(p0), villeOrigine: 'Bafoussam', moyenne: '9.5', statut: 'en_difficulte', boursier: 'non' },
  ]
}
function buildEtudiantsSheet() {
  const headerRow = COLUMNS.map((c) => c.label)
  const instrRow = COLUMNS.map((c) => (c.required ? 'OBLIGATOIRE' : 'optionnel'))
  const dataRows = exampleRows().map((ex) => COLUMNS.map((c) => ex[c.key] ?? ''))
  const ws = XLSX.utils.aoa_to_sheet([headerRow, instrRow, ...dataRows])
  ws['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(c.label.length + 2, 16) }))
  return ws
}
async function downloadTemplate() {
  await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildEtudiantsSheet(), 'Etudiants')
  XLSX.writeFile(wb, 'modele_import_etudiants_MAPO.xlsx')
}
async function downloadStarterWorkbook() {
  await loadXLSX()
  const wb = XLSX.utils.book_new()
  const guide = [
    ['CLASSEUR DE DÉMARRAGE — IMPORT DES ÉTUDIANTS'],
    [''],
    ["Complétez l'onglet « Etudiants » puis réimportez ce fichier dans MAPO."],
    [''],
    ["   - Ligne 1 = noms des colonnes (NE PAS modifier)"],
    ['   - Ligne 2 = OBLIGATOIRE / optionnel (à SUPPRIMER avant import)'],
    ['   - Lignes 3+ = exemples à REMPLACER par vos données'],
    [''],
    ['Colonnes obligatoires : Nom, Prénom.'],
    ['Promotion : recopiez le libellé exact d\'une promotion de l\'établissement'],
    ['(ex. « Licence Management & Stratégie — Licence 1 »). Laissée vide, la'],
    ['promotion par défaut choisie à l\'écran est appliquée.'],
    ['Boursier : « oui » ou « non ». Statut : « inscrit » ou « en_difficulte ».'],
    [''],
    ['Promotions disponibles :'],
    ...store.promotions.map((p) => [`   • ${p.programmeNom} — ${p.anneeNom}`]),
  ]
  const guideWs = XLSX.utils.aoa_to_sheet(guide)
  guideWs['!cols'] = [{ wch: 76 }]
  XLSX.utils.book_append_sheet(wb, guideWs, 'Mode demploi')
  XLSX.utils.book_append_sheet(wb, buildEtudiantsSheet(), 'Etudiants')
  XLSX.writeFile(wb, 'classeur_demarrage_etudiants_MAPO.xlsx')
}
</script>

<style scoped>
.si { display: flex; flex-direction: column; gap: 18px; max-width: 1080px; }
.si-intro { padding: 2px 0; }
.si-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.si-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 760px; line-height: 1.5; }

/* Classeur de démarrage */
.si-starter {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 18px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(var(--pr-rgb), .10), rgba(var(--pr-rgb), .04));
  border: 1px solid rgba(var(--pr-rgb), .22);
}
.si-starter-text { display: flex; align-items: center; gap: 12px; }
.si-starter-ico { color: var(--pr); flex-shrink: 0; }
.si-starter-text strong { display: block; font-family: 'Poppins', sans-serif; font-size: 14.5px; color: #1A1D1F; }
.si-starter-text span { display: block; font-size: 12.5px; color: #6F767E; margin-top: 2px; max-width: 620px; }

/* Panneaux */
.si-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }
.si-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.si-panel-title { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #1A1D1F; margin: 0 0 3px; }
.si-panel-desc { font-size: 12.5px; color: #6F767E; margin: 0; max-width: 620px; line-height: 1.45; }

.si-cols { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 4px; }
.si-col-tag { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 100px; background: #F2F1ED; color: #6F767E; }
.si-col-tag.req { background: rgba(var(--pr-rgb), .10); color: var(--pr); }

.si-fallback { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid #F2F1ED; }
.si-fallback-label { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6F767E; }
.si-fallback-hint { font-size: 12px; color: #9A9FA5; }
.si-select {
  height: 38px; padding: 0 12px; font-family: 'Outfit', sans-serif; font-size: 14px; color: #1A1D1F;
  background: var(--input-bg); border: 1.5px solid var(--input-border); border-radius: 9px; outline: none;
}
.si-select:focus { border-color: var(--pr); }

/* Zone d'import */
.si-drop {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 30px 20px; text-align: center;
  background: #fff; border: 1.5px dashed #D8D8D2; border-radius: 14px;
  transition: border-color .15s ease, background .15s ease;
}
.si-drop.dragging { border-color: var(--pr); background: rgba(var(--pr-rgb), .04); }
.si-drop-ico { color: #B7BCC2; }
.si-drop-text { font-size: 14px; color: #6F767E; margin: 0; }
.si-drop-hint { font-size: 12px; color: #9A9FA5; margin: 2px 0 0; }
.si-drop-btn { margin: 4px 0 2px; }
.si-file { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13.5px; color: #1A1D1F; }

/* Erreur */
.si-error {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  background: rgba(178, 59, 59, .06); border: 1px solid rgba(178, 59, 59, .2); border-radius: 12px;
  font-size: 13px; color: #B23B3B;
}

/* Aperçu */
.si-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.si-stats { display: flex; gap: 10px; }
.si-stat-ok { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: #2E8B57; }
.si-stat-err { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: #B23B3B; }

.si-table-wrap { overflow-x: auto; border: 1px solid #ECECE8; border-radius: 12px; }
.si-table { width: 100%; border-collapse: collapse; min-width: 780px; }
.si-table thead th {
  background: #FAFAF7; font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .03em; color: #6F767E;
  text-align: left; padding: 10px 12px; border-bottom: 1px solid #ECECE8; white-space: nowrap;
}
.si-table td { font-size: 13px; color: #1A1D1F; padding: 9px 12px; border-bottom: 1px solid #F2F1ED; }
.si-table tbody tr:last-child td { border-bottom: none; }
.si-num { width: 34px; text-align: center; color: #9A9FA5; }
.si-promo { font-size: 12px; color: #6F767E; }
.si-row-err { background: rgba(178, 59, 59, .04); }
.si-cell-err { color: #B23B3B; font-weight: 600; }
.si-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700; }
.si-badge-ok { background: rgba(46, 139, 87, .1); color: #2E8B57; }
.si-badge-err { background: rgba(178, 59, 59, .1); color: #B23B3B; }
.si-more { font-size: 12px; color: #9A9FA5; margin-top: 10px; font-style: italic; }

.si-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

/* Résultat */
.si-result { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-radius: 12px; }
.si-result.success { background: rgba(46, 139, 87, .07); border: 1px solid rgba(46, 139, 87, .25); color: #2E8B57; }
.si-result.error { background: rgba(178, 59, 59, .07); border: 1px solid rgba(178, 59, 59, .25); color: #B23B3B; }
.si-result-title { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; margin: 0; color: #1A1D1F; }
.si-result-detail { font-size: 13px; margin: 2px 0 0; color: #6F767E; }

/* Boutons */
.si-btn-primary {
  display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px;
  background: var(--pr); color: #fff; border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer;
  transition: background .15s ease;
}
.si-btn-primary:hover { background: var(--pr-dark, #0E3F7E); }
.si-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.si-btn-ghost {
  display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 15px;
  background: transparent; border: 1.5px solid var(--input-border); border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #6F767E; cursor: pointer;
  transition: all .15s ease; white-space: nowrap;
}
.si-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.si-btn-sm { height: 34px; padding: 0 12px; font-size: 12.5px; }

@media (max-width: 720px) {
  .si-h1 { font-size: 20px; }
  .si-panel-head { flex-direction: column; }
  .si-actions { flex-direction: column; }
  .si-actions button { width: 100%; }
}
</style>
