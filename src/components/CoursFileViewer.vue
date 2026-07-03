<template>
  <div class="cfv-overlay" @click.self="$emit('close')">
    <div class="cfv-modal">
      <div class="cfv-head">
        <span class="cfv-name">{{ item.fileName || item.titre }}</span>
        <div class="cfv-actions">
          <button class="btn btn-outline btn-sm" @click="dl"><Download :size="15" /> <span>{{ t('cours.download') }}</span></button>
          <button class="btn btn-ghost btn-sm cfv-close" @click="$emit('close')"><X :size="18" /></button>
        </div>
      </div>
      <div class="cfv-body">
        <div v-if="state === 'loading'" class="cfv-msg"><Loader2 :size="30" class="spin" /><p>{{ t('cours.loadingFile') }}</p></div>
        <iframe v-else-if="state === 'ok'" :src="url" class="cfv-frame" title="document"></iframe>
        <div v-else class="cfv-msg"><FileText :size="30" /><p>{{ t('cours.viewError') }}</p><button class="btn btn-primary btn-sm" @click="dl">{{ t('cours.download') }}</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { viewCoursFileUrl, downloadCoursFile } from '../services/coursFiles'
import { X, Download, Loader2, FileText } from 'lucide-vue-next'

const props = defineProps({ item: { type: Object, required: true } })
defineEmits(['close'])
const { t } = useI18n({ useScope: 'global' })
const state = ref('loading')
const url = ref('')

onMounted(async () => {
  try { url.value = await viewCoursFileUrl(props.item); state.value = 'ok' } catch { state.value = 'error' }
})
onBeforeUnmount(() => { if (url.value && url.value.startsWith('blob:')) URL.revokeObjectURL(url.value) })
function dl() { downloadCoursFile(props.item) }
</script>

<style scoped>
.cfv-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(15,20,35,.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.cfv-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 900px; height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
.cfv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--bd, #e5e7eb); }
.cfv-name { font-weight: 600; font-size: 14px; color: var(--tx, #1f2937); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cfv-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.cfv-body { flex: 1; min-height: 0; background: #f4f5f7; }
.cfv-frame { width: 100%; height: 100%; border: none; }
.cfv-msg { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--tx3, #6b7280); text-align: center; padding: 20px; }
.cfv-msg p { margin: 0; font-size: 14px; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .cfv-overlay { padding: 0; }
  .cfv-modal { max-width: 100%; height: 100vh; border-radius: 0; }
  .cfv-actions .btn span { display: none; }
}
</style>
