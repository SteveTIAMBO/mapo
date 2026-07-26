<template>
  <div class="mescours">
    <!-- Importer un cours -->
    <div class="card">
      <div class="card-head"><FolderOpen :size="18" /><h3>{{ t('mia.mcTitle') }}</h3></div>
      <p class="muted">{{ t('mia.mcHint') }}</p>
      <div class="mc-row">
        <input v-if="newSubjectMode" v-model="newSubject" class="input" :placeholder="t('mia.mcNewSubjectPh')" @keydown.enter.prevent />
        <select v-else v-model="matiere" class="input" @change="onMatiereChange">
          <option value="">{{ t('mia.chooseSubject') }}</option>
          <option v-for="m in matieres" :key="m" :value="m">{{ m }}</option>
          <option value="__new__">＋ {{ t('mia.mcNewSubject') }}</option>
        </select>
        <input v-model="titre" class="input" :placeholder="t('mia.mcTitlePh')" />
      </div>
      <textarea v-model="contenu" class="course-input" rows="6" :placeholder="t('mia.mcPastePh')"></textarea>
      <div class="mc-actions">
        <button class="btn btn-outline btn-sm" :disabled="importing" @click="pickFile">
          <Upload :size="14" /> <span>{{ importing ? t('mia.mcImporting') : t('mia.mcImport') }}</span>
        </button>
        <input ref="fileInput" type="file" accept=".pdf,.txt,text/plain,application/pdf" class="hidden-file" @change="onFile" />
        <button class="btn btn-outline btn-sm" :disabled="importing" @click="pickPhoto">
          <Camera :size="14" /> <span>{{ t('mia.mcPhoto') }}</span>
        </button>
        <input ref="photoInput" type="file" accept="image/*" capture="environment" class="hidden-file" @change="onPhoto" />
        <span v-if="info" class="muted small mc-info">{{ info }}</span>
        <button class="btn btn-primary btn-sm mc-save" :disabled="!contenu.trim()" @click="save">
          <Plus :size="14" /> <span>{{ t('mia.mcSave') }}</span>
        </button>
      </div>
    </div>

    <!-- Mes cours enregistrés -->
    <div class="card">
      <div class="card-head"><Layers :size="18" /><h3>{{ t('mia.mcMine') }}</h3></div>
      <div v-if="docs.length" class="mc-list">
        <div v-for="d in docs" :key="d.id" class="mc-item">
          <div class="mc-item-main">
            <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}<span v-if="d.matiere" class="mc-badge">{{ d.matiere }}</span></span>
            <span class="mc-meta">{{ fmt(d.at) }} · {{ (d.contenu || '').length }} {{ t('mia.mcChars') }}</span>
          </div>
          <button class="mc-del" :title="t('mia.remove')" @click="del(d.id)"><Trash2 :size="15" /></button>
        </div>
      </div>
      <p v-else class="muted small">{{ t('mia.mcEmpty') }}</p>
      <p class="mc-priv"><ShieldCheck :size="13" /> {{ t('mia.mcPrivacy') }}</p>
    </div>

    <!-- Carré : notes de cours comme source du sous-RAG (périmètre choisi).
         L'app Carré (sœur de l'écosystème) s'ouvre depuis ici — plus dans le menu. -->
    <div class="card">
      <div class="card-head"><span class="mc-carre-badge">C</span><h3>{{ t('mia.mcCarreTitle') }}</h3></div>
      <template v-if="connecteurs.carreConnected">
        <p class="muted">{{ t('mia.mcCarreOn') }}</p>
        <label class="int-label">{{ t('mia.mcCarreScope') }}</label>
        <input v-model="carreScope" class="input mc-scope" :placeholder="t('mia.mcCarreScopePh')" @change="saveScope" />
        <p class="muted small mc-scope-note">{{ t('mia.mcCarreScopeNote') }}</p>
        <div class="mc-carre-actions">
          <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
          <button class="btn btn-ghost btn-sm" @click="connecteurs.disconnectCarre()">{{ t('mia.carreDisconnect') }}</button>
        </div>
      </template>
      <template v-else>
        <p class="muted">{{ t('mia.mcCarreOff') }}</p>
        <div class="mc-carre-actions">
          <button class="btn btn-primary btn-sm" @click="connecteurs.connectCarre()"><Link2 :size="15" /> <span>{{ t('mia.carreConnect') }}</span></button>
          <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'
import { listCoursPerso, addCoursPerso, removeCoursPerso } from '../utils/coursPerso'
import { fileToText } from '../utils/pdfText'
import { useConnecteursStore } from '../stores/connecteurs'
import { useTuteurStore } from '../stores/tuteur'
import { FolderOpen, Layers, Upload, Plus, Trash2, ShieldCheck, ExternalLink, Link2, Camera } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t, locale } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()
const tuteur = useTuteurStore()

// Périmètre Carré (dossier / mot-clé) à synchroniser vers le sous-RAG.
const carreScope = ref('')
try { carreScope.value = localStorage.getItem('mapo_carre_scope') || '' } catch { /* silent */ }
function saveScope() { try { localStorage.setItem('mapo_carre_scope', (carreScope.value || '').trim()) } catch { /* silent */ } }

const enfantId = computed(() => props.enfant?.id || 'me')
const niveau = computed(() => props.enfant?.niveau || '')
const matieres = computed(() => matieresPourNiveau(niveau.value))

const matiere = ref('')
const newSubjectMode = ref(false) // saisie d'une nouvelle matière (hors liste)
const newSubject = ref('')
const titre = ref('')
const contenu = ref('')
const importing = ref(false)
const info = ref('')
const fileInput = ref(null)
const docs = ref([])

// « + Nouvelle matière » dans le sélecteur → bascule en saisie libre.
function onMatiereChange() {
  if (matiere.value === '__new__') { matiere.value = ''; newSubject.value = ''; newSubjectMode.value = true }
}
// Matière effective : saisie libre si mode « nouvelle matière », sinon sélection.
const matiereEffective = computed(() => (newSubjectMode.value ? newSubject.value.trim() : matiere.value))

function refresh() { docs.value = listCoursPerso(enfantId.value) }
onMounted(refresh)
watch(enfantId, refresh)

const photoInput = ref(null)
function pickPhoto() { photoInput.value?.click() }
// Photo d'un cours → transcription IA en texte (l'image n'est pas conservée ;
// les données personnelles sont ignorées côté serveur).
async function onPhoto(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  importing.value = true; info.value = ''
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(file)
    })
    const res = await tuteur.transcrireCours({ imageDataUrl: dataUrl, niveau: niveau.value })
    if (res.ok && res.texte) {
      contenu.value = contenu.value ? (contenu.value + '\n\n' + res.texte) : res.texte
      info.value = t('mia.mcPhotoOk')
    } else if (res.reason === 'annule') {
      info.value = ''
    } else {
      info.value = res.reason === 'illisible' ? t('mia.mcPhotoUnreadable') : t('mia.mcImportError')
    }
  } catch {
    info.value = t('mia.mcImportError')
  } finally {
    importing.value = false
    if (photoInput.value) photoInput.value.value = ''
  }
}

function pickFile() { fileInput.value?.click() }
async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  importing.value = true; info.value = ''
  try {
    const text = (await fileToText(file)).trim()
    if (text) {
      contenu.value = text
      if (!titre.value) titre.value = file.name.replace(/\.(pdf|txt)$/i, '')
      info.value = t('mia.mcImported', { name: file.name })
    } else {
      info.value = t('mia.mcImportError')
    }
  } catch {
    info.value = t('mia.mcImportError')
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function save() {
  if (!contenu.value.trim()) return
  addCoursPerso(enfantId.value, { matiere: matiereEffective.value, titre: titre.value, contenu: contenu.value })
  matiere.value = ''; newSubject.value = ''; newSubjectMode.value = false; titre.value = ''; contenu.value = ''; info.value = ''
  refresh()
}
function del(id) { removeCoursPerso(enfantId.value, id); refresh() }

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString(locale.value.startsWith('en') ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' }
}
</script>

<style scoped>
.mescours { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 12px; }
.muted.small { font-size: 12.5px; }
.mc-row { display: flex; gap: 10px; margin-bottom: 10px; }
.mc-row .input { flex: 1; min-width: 0; }
.course-input { width: 100%; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 13px; font-family: inherit; font-size: 13.5px; resize: vertical; }
.mc-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.mc-info { flex: 1; min-width: 120px; }
.mc-save { margin-left: auto; }
.hidden-file { display: none; }
.mc-list { display: flex; flex-direction: column; gap: 8px; }
.mc-item { display: flex; align-items: center; gap: 12px; padding: 10px 13px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; }
.mc-item-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.mc-name { font-size: 14px; font-weight: 700; color: var(--tx, #1f2937); display: inline-flex; align-items: center; gap: 8px; overflow: hidden; }
.mc-badge { font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 1px 8px; border-radius: 20px; white-space: nowrap; }
.mc-meta { font-size: 12px; color: var(--tx3, #6b7280); }
.mc-del { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid var(--bd, #e5e7eb); background: none; border-radius: 9px; color: var(--tx3, #6b7280); cursor: pointer; }
.mc-del:hover { background: rgba(217,48,37,.07); color: #D93025; border-color: rgba(217,48,37,.3); }
.mc-priv { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 12px; color: var(--tx3, #6b7280); }
.mc-carre-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #0f172a; color: #fff; font-weight: 800; font-size: 12px; }
.int-label { display: block; font-size: 13px; font-weight: 700; color: var(--tx, #1f2937); margin: 10px 0 6px; }
.mc-scope { width: 100%; max-width: 340px; }
.mc-scope-note { margin: 6px 0 12px; }
.mc-carre-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mc-carre-actions .btn { text-decoration: none; }
</style>
