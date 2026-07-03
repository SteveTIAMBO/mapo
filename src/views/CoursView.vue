<template>
  <div class="cours-view">
    <header class="cv-head">
      <div>
        <h1>{{ t('cours.title') }}</h1>
        <p class="muted">{{ isDirecteur ? t('cours.subDirector') : t('cours.subTeacher') }}</p>
      </div>
      <div class="cv-head-actions">
        <span v-if="isDirecteur" class="ro-pill">{{ t('cours.readOnly') }}</span>
        <button v-if="carreEnabled" class="btn btn-outline btn-sm" :disabled="carreLoading" @click="openCarreBtn">
          <component :is="carreLoading ? Loader2 : NotebookPen" :size="16" :class="{ spin: carreLoading }" />
          <span>Carré</span>
        </button>
      </div>
    </header>

    <!-- ENSEIGNANT : préparer + publier -->
    <div v-if="!isDirecteur" class="card publish-card">
      <div class="card-head"><Sparkles :size="18" /><h3>{{ t('cours.publishTitle') }}</h3></div>
      <div class="pub-row">
        <div class="fg"><label>{{ t('cours.subject') }}</label><select v-model="form.matiere" class="input"><option value="" disabled>{{ t('cours.choose') }}</option><option v-for="s in subjects" :key="s.id || s.name" :value="s.name">{{ s.name }}</option></select></div>
        <div class="fg"><label>{{ t('cours.classLabel') }}</label><select v-model="form.classe" class="input"><option value="">{{ t('cours.allClasses') }}</option><option v-for="c in classes" :key="c.id || c.name" :value="c.name">{{ c.name }}</option></select></div>
        <div class="fg"><label>{{ t('cours.type') }}</label><select v-model="form.type" class="input"><option value="cours">{{ t('cours.typeCours') }}</option><option value="devoir">{{ t('cours.typeDevoir') }}</option><option value="examen">{{ t('cours.typeExamen') }}</option><option value="ressource">{{ t('cours.typeRessource') }}</option></select></div>
      </div>

      <!-- Cours / devoir / examen : prépa MIAPO -->
      <template v-if="form.type !== 'ressource'">
        <div class="pub-row">
          <div class="fg grow"><label>{{ t('cours.theme') }} <span class="muted small">{{ t('cours.optional') }}</span></label><input v-model="form.theme" class="input" :placeholder="t('cours.themePlaceholder')" /></div>
          <button class="btn btn-outline miapo-btn" :disabled="!form.matiere || store.preparing" @click="prepare">
            <component :is="store.preparing ? Loader2 : Sparkles" :size="16" :class="{ spin: store.preparing }" />
            <span>{{ store.preparing ? t('cours.preparing') : t('cours.prepareWithMiapo') }}</span>
          </button>
        </div>
        <div class="fg"><label>{{ t('cours.itemTitle') }}</label><input v-model="form.titre" class="input" :placeholder="t('cours.titlePlaceholder')" /></div>
        <div class="fg"><label>{{ t('cours.content') }}</label><textarea v-model="form.contenu" class="input" rows="6" :placeholder="t('cours.contentPlaceholder')"></textarea></div>
        <div v-if="form.corrige" class="fg"><label>{{ t('cours.answerKey') }} <span class="muted small">{{ t('cours.answerKeyNote') }}</span></label><textarea v-model="form.corrige" class="input" rows="4"></textarea></div>
      </template>

      <!-- Ressource : lien -->
      <template v-else>
        <div class="fg"><label>{{ t('cours.itemTitle') }}</label><input v-model="form.titre" class="input" :placeholder="t('cours.resourceTitlePlaceholder')" /></div>
        <div class="fg"><label>{{ t('cours.link') }}</label><input v-model="form.url" class="input" type="url" placeholder="https://…" /></div>
        <div class="fg"><label>{{ t('cours.note') }} <span class="muted small">{{ t('cours.optional') }}</span></label><textarea v-model="form.contenu" class="input" rows="2"></textarea></div>
      </template>

      <!-- Pièce jointe PDF / PPT — commune à tous les types -->
      <div class="fg file-fg">
        <label>{{ t('cours.attachFile') }} <span class="muted small">{{ t('cours.attachHint') }}</span></label>
        <div class="file-row">
          <label class="btn btn-outline btn-sm"><Paperclip :size="15" /> <span>{{ t('cours.chooseFile') }}</span><input type="file" accept=".pdf,.ppt,.pptx" style="display:none" @change="onPickFile" /></label>
          <span v-if="uploading" class="muted small up-load"><Loader2 :size="14" class="spin" /> {{ t('cours.uploading') }}</span>
          <span v-else-if="pendingFile.fileName" class="file-chip"><FileText :size="14" /> {{ pendingFile.fileName }} <button class="chip-x" @click="clearFile"><X :size="12" /></button></span>
        </div>
        <span v-if="fileError" class="err-txt small">{{ fileError }}</span>
      </div>

      <div class="pub-actions">
        <button class="btn btn-primary" :disabled="!canPublish" @click="doPublish"><Upload :size="16" /> <span>{{ t('cours.publish') }}</span></button>
        <span v-if="justPublished" class="muted small ok">{{ t('cours.published') }}</span>
      </div>
    </div>

    <!-- Liste des contenus -->
    <div class="card">
      <div class="card-head"><BookOpen :size="18" /><h3>{{ isDirecteur ? t('cours.allContent') : t('cours.myContent') }}</h3><span v-if="!isDirecteur" class="count">{{ visibleItems.length }}</span></div>
      <div v-if="visibleItems.length" class="items">
        <div v-for="it in visibleItems" :key="it.id" class="item" :class="'t-' + it.type">
          <div class="it-main">
            <div class="it-top"><span class="it-type">{{ typeLabel(it.type) }}</span><span class="it-mat">{{ it.matiere }}</span><span v-if="it.classe" class="it-classe">{{ it.classe }}</span></div>
            <strong class="it-title">{{ it.titre || t('cours.untitled') }}</strong>
            <p v-if="it.contenu" class="it-preview">{{ it.contenu.slice(0, 180) }}{{ it.contenu.length > 180 ? '…' : '' }}</p>
            <a v-if="it.url" :href="it.url" target="_blank" rel="noopener" class="it-link"><LinkIcon :size="13" /> {{ t('cours.openLink') }}</a>
            <div v-if="hasFile(it)" class="it-file">
              <button v-if="isViewable(it)" class="btn btn-outline btn-xs" @click="viewer = it"><Eye :size="13" /> <span>{{ t('cours.viewFile') }}</span></button>
              <button class="btn btn-ghost btn-xs" @click="dl(it)"><Download :size="13" /> <span>{{ t('cours.download') }}</span></button>
              <span class="it-fname">{{ it.fileName }}</span>
            </div>
            <div class="it-meta">{{ it.auteur }} · {{ fmtDate(it.createdAt) }}</div>
          </div>
          <button v-if="!isDirecteur && isMine(it)" class="btn btn-ghost btn-xs" :title="t('cours.remove')" @click="store.remove(it.id)"><Trash2 :size="15" /></button>
        </div>
      </div>
      <p v-else class="muted empty">{{ isDirecteur ? t('cours.emptyDirector') : t('cours.emptyTeacher') }}</p>
    </div>

    <CoursFileViewer v-if="viewer" :item="viewer" @close="viewer = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { useAuthStore } from '../stores/auth'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { openCarre } from '../services/carreSso'
import { uploadCoursFile, hasFile, isViewable, downloadCoursFile } from '../services/coursFiles'
import CoursFileViewer from '../components/CoursFileViewer.vue'
import { Sparkles, Upload, BookOpen, Trash2, Info, Loader2, NotebookPen, Link as LinkIcon, Paperclip, Eye, Download, FileText, X } from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
const store = useCoursStore()
const authStore = useAuthStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()

const isDirecteur = computed(() => authStore.isDirecteur)
const subjects = computed(() => subjectsStore.subjects || [])
const classes = computed(() => classesStore.classes || [])
const carreEnabled = computed(() => !!schoolStore.schoolSettings?.carreEnabled)
const myUid = computed(() => authStore.userProfile?.uid || authStore.user?.uid || null)

const form = ref({ matiere: '', classe: '', type: 'cours', theme: '', titre: '', contenu: '', corrige: '', url: '' })
const justPublished = ref(false)
const pendingFile = ref({ fileName: '', fileExt: '', fileId: '', fileData: '', fileViewable: false })
const uploading = ref(false)
const fileError = ref('')
const viewer = ref(null)

const visibleItems = computed(() => isDirecteur.value ? store.items : store.forAuteur(myUid.value))
const hasAttachment = computed(() => !!pendingFile.value.fileName)
const canPublish = computed(() => form.value.matiere && form.value.titre.trim() && (form.value.contenu.trim() || form.value.url.trim() || hasAttachment.value))

function isMine(it) { return !it.auteurId || it.auteurId === myUid.value }
function typeLabel(ty) { return t('cours.type' + ty.charAt(0).toUpperCase() + ty.slice(1)) }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR') } catch { return '' } }

async function prepare() {
  if (!form.value.matiere) return
  const r = await store.preparerAvecMiapo({ type: form.value.type, matiere: form.value.matiere, niveau: form.value.classe || '', theme: form.value.theme })
  if (r.ok) { form.value.titre = r.titre || form.value.titre; form.value.contenu = r.document || ''; form.value.corrige = r.corrige || '' }
  else window.alert(r.reason || t('cours.miapoError'))
}
function doPublish() {
  if (!canPublish.value) return
  store.publish({ ...form.value, ...pendingFile.value })
  justPublished.value = true
  form.value = { matiere: form.value.matiere, classe: form.value.classe, type: form.value.type, theme: '', titre: '', contenu: '', corrige: '', url: '' }
  clearFile()
  setTimeout(() => { justPublished.value = false }, 2500)
}
async function onPickFile(ev) {
  const f = ev.target.files && ev.target.files[0]
  if (!f) return
  uploading.value = true; fileError.value = ''
  const r = await uploadCoursFile(f)
  uploading.value = false
  if (r.ok) pendingFile.value = { fileName: r.fileName, fileExt: r.fileExt, fileId: r.fileId || '', fileData: r.fileData || '', fileViewable: r.fileViewable }
  else fileError.value = r.reason === 'demo_too_large' ? t('cours.fileDemoTooLarge') : r.reason === 'too_large' ? t('cours.fileTooLarge') : r.reason === 'bad_type' ? t('cours.fileBadType') : t('cours.fileUploadError')
  ev.target.value = ''
}
function clearFile() { pendingFile.value = { fileName: '', fileExt: '', fileId: '', fileData: '', fileViewable: false } }
function dl(it) { downloadCoursFile(it) }

const carreLoading = ref(false)
async function openCarreBtn() {
  if (carreLoading.value) return
  carreLoading.value = true
  try { await openCarre() } catch (e) { window.alert(e?.code === 403 ? t('nav.carreNotEnabled') : t('nav.carreError')) } finally { carreLoading.value = false }
}

onMounted(() => {
  store.load()
  if (!subjectsStore.subjects?.length) subjectsStore.loadSubjects?.()
  if (!classesStore.classes?.length) classesStore.loadClasses?.()
})
</script>

<style scoped>
.cours-view { display: flex; flex-direction: column; gap: 16px; }
.cv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.cv-head h1 { margin: 0; font-size: 22px; }
.muted { color: var(--tx3, #6b7280); margin: 2px 0 0; } .small { font-size: 12px; }
.cv-head-actions { display: flex; align-items: center; gap: 10px; }
.ro-pill { font-size: 11px; font-weight: 700; color: var(--tx2); background: var(--input-bg, #eef1f4); padding: 4px 10px; border-radius: 20px; }
.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; color: var(--pr, #1558B0); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; flex: 1; color: var(--tx, #1f2937); }
.count { font-size: 12px; font-weight: 700; color: var(--tx2); background: var(--input-bg, #eef1f4); padding: 2px 9px; border-radius: 20px; }
.pub-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.fg { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 150px; } .fg.grow { flex: 3; }
.fg label { font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); }
.miapo-btn { align-self: flex-end; white-space: nowrap; }
.pub-actions { display: flex; align-items: center; gap: 12px; margin-top: 4px; } .ok { color: #1B8A5A; font-weight: 600; }
.upload-note { display: flex; align-items: center; gap: 6px; }
.items { display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--bd, #e5e7eb); border-left: 3px solid var(--pr, #1558B0); border-radius: 12px; padding: 12px 14px; }
.item.t-devoir { border-left-color: #E8953A; } .item.t-examen { border-left-color: #B3261E; } .item.t-ressource { border-left-color: #1B8A5A; }
.it-main { flex: 1; min-width: 0; }
.it-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
.it-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--pr); }
.it-mat { font-size: 12px; color: var(--tx2); } .it-classe { font-size: 11px; color: var(--tx3); background: var(--input-bg, #eef1f4); padding: 1px 8px; border-radius: 20px; }
.it-title { display: block; font-size: 15px; color: var(--tx, #1f2937); }
.it-preview { margin: 4px 0 6px; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; white-space: pre-line; }
.it-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--pr); text-decoration: none; }
.it-meta { font-size: 11.5px; color: var(--tx3); margin-top: 6px; }
.empty { text-align: center; padding: 16px; }
.file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.file-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--tx2); background: var(--input-bg, #eef1f4); padding: 4px 8px 4px 10px; border-radius: 20px; }
.chip-x { display: inline-flex; background: none; border: none; cursor: pointer; color: var(--tx3); padding: 2px; }
.up-load { display: inline-flex; align-items: center; gap: 5px; }
.err-txt { color: #D93025; }
.it-file { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 6px 0 0; }
.it-fname { font-size: 11.5px; color: var(--tx3); }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 640px) {
  .cv-head { flex-direction: column; align-items: stretch; }
  .cv-head h1 { font-size: 20px; }
  .cv-head-actions { justify-content: space-between; }
  .card { padding: 14px 15px; border-radius: 14px; }
  .pub-row { flex-direction: column; gap: 10px; }
  .fg { min-width: 0; }
  .miapo-btn { align-self: stretch; justify-content: center; }
  .pub-actions { flex-wrap: wrap; }
  .pub-actions .btn { flex: 1; justify-content: center; }
  .item { flex-wrap: wrap; }
}
</style>
