<template>
  <div class="inst">
    <!-- Déjà installée : rien à proposer -->
    <div v-if="installee" class="inst-ok"><Check :size="14" /> <span>{{ t('mia.instDone') }}</span></div>

    <template v-else>
      <button class="inst-btn" @click="clic">
        <Download :size="15" /> <span>{{ t('mia.instCta') }}</span>
      </button>

      <!-- Pas de prompt natif (iPhone, ou évènement manqué) → mode d'emploi -->
      <div v-if="aide" class="inst-help">
        <p class="inst-why">{{ t('mia.instWhy') }}</p>
        <ol class="inst-steps">
          <li v-for="(s, i) in etapes" :key="i">{{ s }}</li>
        </ol>
        <button class="inst-close" @click="aide = false">{{ t('mia.instClose') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, Check } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const prompt = ref(null)     // évènement natif d'installation (Android/Chrome)
const installee = ref(false)
const aide = ref(false)

// Plateforme : sur iPhone, aucun prompt natif n'existe — il faut passer par
// « Partager → Sur l'écran d'accueil ». Ailleurs, Chrome propose l'installation.
const plateforme = computed(() => {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
})
const etapes = computed(() => {
  const k = plateforme.value
  return [t(`mia.instStep1_${k}`), t(`mia.instStep2_${k}`), t(`mia.instStep3_${k}`)]
})

function onPrompt(e) { e.preventDefault(); prompt.value = e }
function onInstalled() { installee.value = true; aide.value = false }

onMounted(() => {
  try {
    installee.value = !!(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone)
  } catch { /* silencieux */ }
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
})
onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
  window.removeEventListener('appinstalled', onInstalled)
})

async function clic() {
  // Android/Chrome : installation en un tap. Sinon, on explique la manip.
  if (prompt.value) {
    prompt.value.prompt()
    try { const r = await prompt.value.userChoice; if (r?.outcome === 'accepted') installee.value = true } catch { /* ignoré */ }
    prompt.value = null
    return
  }
  aide.value = !aide.value
}
</script>

<style scoped>
.inst { margin: 4px 0; }
.inst-btn { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 12px; border: 1px dashed rgba(var(--pr-rgb), .5); background: rgba(var(--pr-rgb), .05); color: var(--pr); border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; }
.inst-btn:hover { background: rgba(var(--pr-rgb), .12); border-style: solid; }
.inst-ok { display: flex; align-items: center; gap: 7px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; color: #1B8A5A; }
.inst-help { margin-top: 8px; padding: 12px 14px; background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; }
.inst-why { margin: 0 0 8px; font-size: 12.5px; color: var(--tx2); line-height: 1.45; }
.inst-steps { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--tx2); line-height: 1.7; }
.inst-close { margin-top: 8px; background: none; border: none; color: var(--tx3); font-family: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }
</style>
