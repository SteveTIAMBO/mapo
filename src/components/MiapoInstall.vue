<template>
  <!-- Rien à afficher si l'app est déjà installée (ouverte en mode standalone). -->
  <div v-if="!installee" class="inst">
    <button class="inst-btn" @click="clic">
      <span class="inst-ic"><Download :size="16" /></span>
      <span class="inst-tx">
        <strong>{{ t('mia.instCta') }}</strong>
        <small>{{ t('mia.instSub') }}</small>
      </span>
    </button>

    <!-- Pas de prompt natif (iPhone, ou évènement manqué) → mode d'emploi -->
    <div v-if="aide" class="inst-help">
      <p class="inst-why">{{ t('mia.instWhy') }}</p>
      <ol class="inst-steps">
        <li v-for="(s, i) in etapes" :key="i">{{ s }}</li>
      </ol>
      <button class="inst-close" @click="aide = false">{{ t('mia.instClose') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download } from 'lucide-vue-next'

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
// Détecte l'installation : mode standalone (app ouverte depuis l'écran d'accueil).
function detectInstalled() {
  try {
    return !!(window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches
      || window.navigator.standalone)
  } catch { return false }
}

onMounted(() => {
  installee.value = detectInstalled()
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
/* CTA d'installation — vrai bouton mis en avant (dégradé de la marque). */
.inst-btn {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 11px 13px; border: none; border-radius: 13px;
  background: linear-gradient(135deg, var(--pr), #7c5cff); color: #fff;
  font-family: inherit; cursor: pointer; text-align: left;
  box-shadow: 0 6px 16px rgba(var(--pr-rgb), .30);
  transition: transform .15s ease, box-shadow .15s ease;
}
.inst-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(var(--pr-rgb), .38); }
.inst-btn:active { transform: translateY(0); box-shadow: 0 4px 12px rgba(var(--pr-rgb), .30); }
.inst-ic {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  background: rgba(255, 255, 255, .22);
}
.inst-tx { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.inst-tx strong { font-size: 14px; font-weight: 700; }
.inst-tx small { font-size: 11.5px; opacity: .9; }
.inst-help { margin-top: 8px; padding: 12px 14px; background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; }
.inst-why { margin: 0 0 8px; font-size: 12.5px; color: var(--tx2); line-height: 1.45; }
.inst-steps { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--tx2); line-height: 1.7; }
.inst-close { margin-top: 8px; background: none; border: none; color: var(--tx3); font-family: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }
</style>
