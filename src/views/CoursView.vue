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
    <!-- Enseignant sans matière assignée → publication bloquée -->
    <div v-if="blockedNoSubject" class="card block-card">
      <div class="card-head"><Lock :size="18" /><h3>{{ t('cours.blockedTitle') }}</h3></div>
      <p class="muted">{{ t('cours.blockedText') }}</p>
    </div>

    <div v-else-if="!isDirecteur" class="card publish-card">
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

        <!-- Options de génération (calibrage MIAPO) -->
        <div class="pub-row gen-opts">
          <div class="fg"><label>{{ t('cours.difficulty') }}</label>
            <select v-model="form.difficulte" class="input">
              <option value="facile">{{ t('cours.diffEasy') }}</option>
              <option value="moyen">{{ t('cours.diffMedium') }}</option>
              <option value="difficile">{{ t('cours.diffHard') }}</option>
            </select>
          </div>
          <template v-if="form.type === 'devoir' || form.type === 'examen'">
            <div class="fg"><label>{{ t('cours.duration') }}</label><input v-model="form.duree" class="input" type="number" min="0" step="5" placeholder="45" /></div>
            <div class="fg"><label>{{ t('cours.exercises') }}</label><input v-model="form.nbExercices" class="input" type="number" min="1" max="20" placeholder="5" /></div>
          </template>
        </div>

        <div class="fg"><label>{{ t('cours.itemTitle') }}</label><input v-model="form.titre" class="input" :placeholder="t('cours.titlePlaceholder')" /></div>
        <div class="fg"><label>{{ t('cours.content') }}</label><textarea v-model="form.contenu" class="input" rows="6" :placeholder="t('cours.contentPlaceholder')"></textarea></div>
        <div v-if="form.corrige" class="fg"><label>{{ t('cours.answerKey') }} <span class="muted small">{{ t('cours.answerKeyNote') }}</span></label><textarea v-model="form.corrige" class="input" rows="4"></textarea></div>

        <!-- Adapter le contenu généré en un clic -->
        <div v-if="form.contenu" class="adapt-row">
          <span class="adapt-label"><Sparkles :size="13" /> {{ t('cours.adapt') }}</span>
          <button type="button" class="chip" :disabled="store.preparing" @click="prepare('simplifie : rends le contenu plus facile et accessible')">{{ t('cours.adaptSimpler') }}</button>
          <button type="button" class="chip" :disabled="store.preparing" @click="prepare('complexifie : rends le contenu plus exigeant')">{{ t('cours.adaptHarder') }}</button>
          <button type="button" class="chip" :disabled="store.preparing" @click="prepare('raccourcis : propose une version plus courte')">{{ t('cours.adaptShorter') }}</button>
          <button type="button" class="chip" :disabled="store.preparing" @click="prepare('reformule differemment en gardant le meme niveau')">{{ t('cours.adaptRephrase') }}</button>
        </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { useAuthStore } from '../stores/auth'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { usePersonnelStore } from '../stores/personnel'
import { openCarre } from '../services/carreSso'
import { uploadCoursFile, hasFile, isViewable, downloadCoursFile } from '../services/coursFiles'
import CoursFileViewer from '../components/CoursFileViewer.vue'
import { Sparkles, Upload, BookOpen, Trash2, Info, Loader2, NotebookPen, Link as LinkIcon, Paperclip, Eye, Download, FileText, X, Lock } from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
const store = useCoursStore()
const authStore = useAuthStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()
const staffChecked = ref(false) // vrai une fois les matières du prof résolues (évite le flash)

const isDirecteur = computed(() => authStore.isDirecteur)
// Matières enseignées par l'utilisateur : d'abord le profil (démo / profil enrichi),
// sinon on retrouve sa fiche personnel par e-mail et on lit ses matières.
const mySubjects = computed(() => {
  let s = authStore.userProfile?.subjects
  if (typeof s === 'string') s = s.split(/[;,]/)
  let list = Array.isArray(s) ? s.map((x) => String(x).trim()).filter(Boolean) : []
  if (list.length) return list
  // Repli : fiche personnel retrouvée par e-mail OU par nom (getTeacherStaffRecord).
  const me = personnelStore.getTeacherStaffRecord?.(authStore.userProfile)
  if (me && Array.isArray(me.subjects) && me.subjects.length) {
    return me.subjects.map((x) => String(x).trim()).filter(Boolean)
  }
  return list
})
// Un enseignant ne publie QUE dans ses matières ; le directeur (lecture seule) voit
// tout. Si aucune matière n'est définie sur son profil, on ne bloque pas (toutes).
const subjects = computed(() => {
  const all = subjectsStore.subjects || []
  if (isDirecteur.value) return all
  if (!mySubjects.value.length) return [] // prof sans matière assignée → aucune (publication bloquée)
  const set = new Set(mySubjects.value.map((x) => x.toLowerCase()))
  const filtered = all.filter((s) => set.has(String(s.name || '').toLowerCase()))
  return filtered.length ? filtered : mySubjects.value.map((name) => ({ name }))
})
// Enseignant sans aucune matière assignée → publication bloquée (après chargement).
const blockedNoSubject = computed(() => !isDirecteur.value && staffChecked.value && !subjects.value.length)
// Classes proposées : directeur = toutes ; enseignant = ses classes pour la matière
// sélectionnée (affectations), repli sur toutes ses classes, sinon toutes (jamais bloquant).
const classes = computed(() => {
  const all = classesStore.classes || []
  if (isDirecteur.value) return all
  const subj = form.value.matiere
  if (subj) {
    const ids = personnelStore.getTeacherClassIdsForSubject?.(authStore.userProfile, subj) || []
    if (ids.length) return all.filter((c) => ids.includes(c.id))
  }
  const allIds = personnelStore.getTeacherClassIds?.(authStore.userProfile) || []
  return allIds.length ? all.filter((c) => allIds.includes(c.id)) : all
})
const carreEnabled = computed(() => !!schoolStore.schoolSettings?.carreEnabled)
const myUid = computed(() => authStore.userProfile?.uid || authStore.user?.uid || null)

const form = ref({ matiere: '', classe: '', type: 'cours', theme: '', difficulte: 'moyen', duree: '', nbExercices: '', titre: '', contenu: '', corrige: '', url: '' })
const justPublished = ref(false)
const pendingFile = ref({ fileName: '', fileExt: '', fileId: '', fileData: '', fileViewable: false })
const uploading = ref(false)
const fileError = ref('')
const viewer = ref(null)

const visibleItems = computed(() => isDirecteur.value ? store.items : store.forAuteur(myUid.value))
const hasAttachment = computed(() => !!pendingFile.value.fileName)
const canPublish = computed(() => form.value.matiere && form.value.titre.trim() && (form.value.contenu.trim() || form.value.url.trim() || hasAttachment.value))

// Enseignant d'une seule matière → on la présélectionne (il ne publie que là).
watch(subjects, (list) => {
  if (!isDirecteur.value && list.length === 1 && !form.value.matiere) form.value.matiere = list[0].name
}, { immediate: true })

// Enseignant : présélectionne la classe s'il n'en a qu'une pour cette matière,
// et réinitialise la classe si elle n'est plus dans son périmètre.
watch(() => [form.value.matiere, classes.value.length], () => {
  if (isDirecteur.value) return
  const list = classes.value
  if (list.length === 1) form.value.classe = list[0].name
  else if (form.value.classe && !list.some((c) => c.name === form.value.classe)) form.value.classe = ''
}, { immediate: true })

function isMine(it) { return !it.auteurId || it.auteurId === myUid.value }
function typeLabel(ty) { return t('cours.type' + ty.charAt(0).toUpperCase() + ty.slice(1)) }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR') } catch { return '' } }

// Assemble les consignes envoyées à MIAPO : thème + calibrage (difficulté, durée,
// nombre d'exercices) + une éventuelle demande d'adaptation ("plus simple"…).
// Tout est concaténé dans `theme` (le serveur le lit tel quel), donc aucune
// dépendance à un redéploiement PHP.
function buildInstructions(adapt) {
  const parts = []
  if (form.value.theme && form.value.theme.trim()) parts.push(form.value.theme.trim())
  const diff = { facile: 'niveau facile', moyen: 'niveau moyen', difficile: 'niveau difficile' }[form.value.difficulte]
  if (diff) parts.push(diff)
  if (form.value.type === 'devoir' || form.value.type === 'examen') {
    if (form.value.duree) parts.push(`duree conseillee ${form.value.duree} min`)
    if (form.value.nbExercices) parts.push(`${form.value.nbExercices} exercices`)
  }
  if (adapt) parts.push(adapt)
  return parts.join(' ; ')
}
async function prepare(adapt) {
  if (!form.value.matiere || store.preparing) return
  const theme = buildInstructions(typeof adapt === 'string' ? adapt : '')
  const r = await store.preparerAvecMiapo({ type: form.value.type, matiere: form.value.matiere, niveau: form.value.classe || '', theme })
  if (r.ok) { form.value.titre = r.titre || form.value.titre; form.value.contenu = r.document || ''; form.value.corrige = r.corrige || '' }
  else window.alert(r.reason || t('cours.miapoError'))
}
function doPublish() {
  if (!canPublish.value) return
  store.publish({ ...form.value, ...pendingFile.value })
  justPublished.value = true
  form.value = { matiere: form.value.matiere, classe: form.value.classe, type: form.value.type, theme: '', difficulte: form.value.difficulte, duree: '', nbExercices: '', titre: '', contenu: '', corrige: '', url: '' }
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

onMounted(async () => {
  store.load()
  if (!subjectsStore.subjects?.length) subjectsStore.loadSubjects?.()
  if (!classesStore.classes?.length) classesStore.loadClasses?.()
  // Enseignant : on charge le personnel pour retrouver ses matières (si absentes du profil).
  if (!isDirecteur.value && !personnelStore.staff?.length) {
    try { await personnelStore.loadStaff?.() } catch { /* règle absente : on garde les matières du profil */ }
  }
  staffChecked.value = true
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
.gen-opts .fg { flex: 0 1 auto; min-width: 130px; }
.adapt-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 2px 0 12px; }
.adapt-label { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--pr); }
.adapt-row .chip {
  border: 1px solid var(--divider); background: transparent; color: var(--tx2, #4b5563);
  border-radius: 100px; padding: 5px 12px; font-size: 12.5px; font-family: inherit; cursor: pointer; transition: .15s;
}
.adapt-row .chip:hover:not(:disabled) { border-color: var(--pr); color: var(--pr); background: rgba(var(--pr-rgb), .05); }
.adapt-row .chip:disabled { opacity: .5; cursor: default; }
.pub-actions { display: flex; align-items: center; gap: 12px; margin-top: 4px; } .ok { color: #1B8A5A; font-weight: 600; }
.upload-note { display: flex; align-items: center; gap: 6px; }
.items { display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 12px 14px; }
.it-main { flex: 1; min-width: 0; }
.it-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
/* Différenciation par couleur = pastille de type teintée (pas de ligne sur la tranche). */
.it-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: #1558B0; background: rgba(21, 88, 176, .10); padding: 2px 8px; border-radius: 20px; }
.item.t-devoir .it-type { color: #C2751A; background: rgba(232, 149, 58, .16); }
.item.t-examen .it-type { color: #B3261E; background: rgba(179, 38, 30, .10); }
.item.t-ressource .it-type { color: #1B8A5A; background: rgba(27, 138, 90, .12); }
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
