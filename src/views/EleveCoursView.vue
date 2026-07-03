<template>
  <div class="ec-view">
    <header class="ec-head">
      <div>
        <h1>{{ t('cours.title') }}</h1>
        <p class="muted">{{ t('cours.subStudent') }}</p>
      </div>
      <button v-if="carreEnabled" class="btn btn-outline btn-sm" :disabled="carreLoading" @click="openCarreBtn">
        <component :is="carreLoading ? Loader2 : NotebookPen" :size="16" :class="{ spin: carreLoading }" />
        <span>Carré</span>
      </button>
    </header>

    <div v-if="groups.length" class="groups">
      <div v-for="g in groups" :key="g.matiere" class="card">
        <div class="card-head"><BookOpen :size="18" /><h3>{{ g.matiere }}</h3><span class="count">{{ g.items.length }}</span></div>
        <div class="items">
          <div v-for="it in g.items" :key="it.id" class="item" :class="'t-' + it.type">
            <div class="it-top"><span class="it-type">{{ typeLabel(it.type) }}</span><span v-if="it.classe" class="it-classe">{{ it.classe }}</span><span class="it-meta">{{ it.auteur }}</span></div>
            <button class="it-title" @click="toggle(it.id)"><ChevronRight :size="16" class="chev" :class="{ open: opened === it.id }" /> {{ it.titre || t('cours.untitled') }}</button>
            <div v-if="opened === it.id" class="it-body">
              <p v-if="it.contenu" class="it-contenu">{{ it.contenu }}</p>
              <div class="it-actions">
                <a v-if="it.url" :href="it.url" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><LinkIcon :size="14" /> {{ t('cours.openResource') }}</a>
                <button v-if="isViewable(it)" class="btn btn-primary btn-sm" @click="viewer = it"><Eye :size="14" /> {{ t('cours.viewFile') }}</button>
                <button v-if="hasFile(it)" class="btn btn-outline btn-sm" @click="dl(it)"><Download :size="14" /> {{ t('cours.download') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="card empty-card">
      <BookOpen :size="30" />
      <p>{{ t('cours.emptyStudent') }}</p>
    </div>

    <CoursFileViewer v-if="viewer" :item="viewer" @close="viewer = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { openCarre } from '../services/carreSso'
import { hasFile, isViewable, downloadCoursFile } from '../services/coursFiles'
import CoursFileViewer from '../components/CoursFileViewer.vue'
import { BookOpen, ChevronRight, Loader2, NotebookPen, Link as LinkIcon, Eye, Download } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const store = useCoursStore()
const authStore = useAuthStore()
const schoolStore = useSchoolStore()

const carreEnabled = computed(() => !!schoolStore.schoolSettings?.carreEnabled)
const opened = ref('')
const viewer = ref(null)
function toggle(id) { opened.value = opened.value === id ? '' : id }
function dl(it) { downloadCoursFile(it) }
function typeLabel(ty) { return t('cours.type' + ty.charAt(0).toUpperCase() + ty.slice(1)) }

const studentClass = computed(() => {
  const p = authStore.userProfile || {}
  return p.className || p.classe || p.class || ''
})
const list = computed(() => studentClass.value ? store.forClasse(studentClass.value) : store.items)
const groups = computed(() => {
  const map = new Map()
  for (const it of list.value) {
    if (!map.has(it.matiere)) map.set(it.matiere, [])
    map.get(it.matiere).push(it)
  }
  return [...map.entries()].map(([matiere, items]) => ({ matiere: matiere || t('cours.otherSubject'), items }))
})

const carreLoading = ref(false)
async function openCarreBtn() {
  if (carreLoading.value) return
  carreLoading.value = true
  try { await openCarre() } catch (e) { window.alert(e?.code === 403 ? t('nav.carreNotEnabled') : t('nav.carreError')) } finally { carreLoading.value = false }
}

onMounted(() => store.load())
</script>

<style scoped>
.ec-view { display: flex; flex-direction: column; gap: 16px; }
.ec-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ec-head h1 { margin: 0; font-size: 22px; } .muted { color: var(--tx3, #6b7280); margin: 2px 0 0; }
.groups { display: flex; flex-direction: column; gap: 14px; }
.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 16px 18px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; color: var(--pr, #1558B0); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; flex: 1; color: var(--tx, #1f2937); }
.count { font-size: 12px; font-weight: 700; color: var(--tx2); background: var(--input-bg, #eef1f4); padding: 2px 9px; border-radius: 20px; }
.items { display: flex; flex-direction: column; gap: 8px; }
.item { border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 10px 13px; }
.it-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
/* Différenciation par couleur = pastille de type teintée (pas de ligne sur la tranche). */
.it-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: #1558B0; background: rgba(21, 88, 176, .10); padding: 2px 8px; border-radius: 20px; }
.item.t-devoir .it-type { color: #C2751A; background: rgba(232, 149, 58, .16); }
.item.t-examen .it-type { color: #B3261E; background: rgba(179, 38, 30, .10); }
.item.t-ressource .it-type { color: #1B8A5A; background: rgba(27, 138, 90, .12); }
.it-classe { font-size: 11px; color: var(--tx3); background: var(--input-bg, #eef1f4); padding: 1px 8px; border-radius: 20px; }
.it-meta { font-size: 11.5px; color: var(--tx3); margin-left: auto; }
.it-title { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left; background: none; border: none; cursor: pointer; font-size: 15px; font-weight: 600; color: var(--tx, #1f2937); padding: 6px 0 0; font-family: inherit; }
.chev { transition: transform .15s; flex-shrink: 0; color: var(--tx3); } .chev.open { transform: rotate(90deg); }
.it-body { padding: 6px 0 4px 22px; }
.it-contenu { margin: 0 0 10px; font-size: 13.5px; color: var(--tx2, #4b5563); line-height: 1.6; white-space: pre-line; }
.it-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.empty-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; text-align: center; color: var(--tx3); }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 640px) {
  .ec-head { flex-direction: column; align-items: stretch; gap: 8px; }
  .ec-head h1 { font-size: 20px; }
  .ec-head .btn { align-self: flex-start; }
  .card { padding: 14px 15px; }
  .it-meta { margin-left: 0; width: 100%; }
  .it-top { gap: 6px; }
  .it-body { padding-left: 14px; }
}
</style>
