<template>
  <!-- Bouton flottant MIAPO (bas-droite) -->
  <Teleport to="body">
    <transition name="smb-pop">
      <button
        v-if="!isOpen"
        class="smb-fab"
        title="Demander à MIAPO (Ctrl+J)"
        aria-label="Ouvrir MIAPO"
        @click="open"
      >
        <Sparkles :size="24" />
      </button>
    </transition>
  </Teleport>

  <Teleport to="body">
    <transition name="smb-fade">
      <div v-if="isOpen" class="smb-overlay" @click.self="close" />
    </transition>
    <transition name="smb-scale">
      <div v-if="isOpen" class="smb-container">
        <div class="smb-modal">
          <div class="smb-head">
            <div class="smb-brand">
              <span class="smb-spark"><Sparkles :size="16" /></span>
              <span class="smb-name">MIAPO</span>
              <span class="smb-subt">votre copilote</span>
            </div>
            <button class="smb-close" @click="close" aria-label="Fermer"><X :size="18" /></button>
          </div>

          <div class="smb-input-row">
            <input
              ref="inputEl"
              v-model="instruction"
              type="text"
              class="smb-input"
              placeholder="Demandez à MIAPO en langage naturel…"
              :disabled="copilot.thinking"
              @keydown.enter.prevent="submit"
              @keydown.escape="close"
            />
            <button class="smb-send" :disabled="!instruction.trim() || copilot.thinking" @click="submit"><ArrowUp :size="18" /></button>
          </div>

          <div class="smb-body">
            <div v-if="copilot.thinking" class="smb-thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="smb-thinking-text">MIAPO réfléchit…</span>
            </div>

            <div v-else-if="step === 'idle'" class="smb-examples">
              <p class="smb-examples-title">Essayez :</p>
              <button v-for="(ex, i) in EXEMPLES_SUP" :key="i" class="smb-example" @click="runExample(ex)">
                <CornerDownRight :size="14" /> {{ ex }}
              </button>
            </div>

            <div v-else-if="step === 'answer'" class="smb-answer">
              <span class="smb-spark sm"><Sparkles :size="14" /></span>
              <div class="smb-answer-body">
                <p>{{ answer }}</p>
                <button v-if="navTab" class="smb-nav-btn" @click="goNav"><ArrowRight :size="15" /> Ouvrir {{ navLabel }}</button>
              </div>
            </div>
          </div>

          <div class="smb-foot">MIAPO propose, vous validez.</div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, inject, onMounted, onUnmounted } from 'vue'
import { Sparkles, X, ArrowUp, ArrowRight, CornerDownRight } from 'lucide-vue-next'
import { useMiapoCopilotStore } from '../../stores/miapoCopilot'

const copilot = useMiapoCopilotStore()
// Fourni par SuperieurView : choisirTab(key) — navigation par onglets (≠ routes).
const goTab = inject('supGoTab', null)

const isOpen = ref(false)
const instruction = ref('')
const inputEl = ref(null)
const step = ref('idle')   // idle | answer
const answer = ref('')
const navTab = ref('')
const navLabel = ref('')

const EXEMPLES_SUP = [
  'Ouvre la liste des étudiants',
  'Montre la comptabilité',
  "Affiche l'emploi du temps",
  'Qui est en risque de décrochage ?',
  'Va aux rapports',
]

// Mappe une « vue » renvoyée par le copilote (vocabulaire Secondaire) vers un
// onglet du Supérieur. Les intents inconnus → simple réponse, sans navigation.
const VUE_TO_TAB = {
  dashboard: { tab: 'dashboard', label: 'le tableau de bord' },
  eleves: { tab: 'etudiants', label: 'les étudiants' },
  classes: { tab: 'formation', label: "l'offre de formation" },
  notes: { tab: 'notes', label: 'les notes' },
  presences: { tab: 'assiduite', label: "l'assiduité" },
  'emploi-du-temps': { tab: 'edt', label: "l'emploi du temps" },
  facturation: { tab: 'finance', label: 'la comptabilité' },
  rapports: { tab: 'rapports', label: 'les rapports' },
  personnel: { tab: 'intervenants', label: 'les intervenants' },
  messagerie: { tab: 'messagerie', label: 'la messagerie' },
  inscriptions: { tab: 'inscriptions', label: 'les inscriptions' },
}

function open() { isOpen.value = true; nextTick(() => inputEl.value?.focus()) }
function close() { isOpen.value = false }
function reset() { step.value = 'idle'; answer.value = ''; navTab.value = ''; navLabel.value = '' }

async function submit() {
  const text = instruction.value.trim()
  if (!text || copilot.thinking) return
  reset()
  const r = await copilot.interpret({ instruction: text, vueActuelle: 'superieur' })
  instruction.value = ''
  answer.value = r.reponse || (r.ok ? "C'est noté." : "MIAPO n'a pas pu répondre pour le moment.")
  const m = r.vue ? VUE_TO_TAB[r.vue] : null
  if (m && goTab) { navTab.value = m.tab; navLabel.value = m.label }
  step.value = 'answer'
}
function runExample(ex) { instruction.value = ex; submit() }
function goNav() { if (navTab.value && goTab) { goTab(navTab.value); close() } }

function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
    e.preventDefault()
    isOpen.value ? close() : open()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.smb-fab {
  position: fixed; right: 24px; bottom: 24px; z-index: 60;
  width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
  background: var(--pr, #1558B0); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.28);
}
.smb-fab:hover { filter: brightness(1.05); }
.smb-fab:active { transform: scale(0.96); }
.smb-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(16, 24, 40, 0.45); }
.smb-container {
  position: fixed; inset: 0; z-index: 61;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 72px 16px 0; pointer-events: none;
}
.smb-modal {
  pointer-events: auto; width: 100%; max-width: 560px;
  background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3); overflow: hidden;
}
.smb-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #ECECE8; }
.smb-brand { display: flex; align-items: center; gap: 8px; }
.smb-spark { color: var(--pr, #1558B0); display: inline-flex; }
.smb-name { font-family: 'Poppins', sans-serif; font-weight: 800; color: #1A1D1F; }
.smb-subt { font-size: 12.5px; color: #6F767E; }
.smb-close { width: 32px; height: 32px; border: none; background: #F4F4F0; border-radius: 8px; color: #6F767E; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.smb-input-row { display: flex; gap: 8px; padding: 14px 18px; }
.smb-input { flex: 1; height: 42px; padding: 0 14px; border: 1.5px solid #DCDCD8; border-radius: 10px; font-size: 14px; color: #1A1D1F; outline: none; }
.smb-input:focus { border-color: var(--pr, #1558B0); }
.smb-send { width: 42px; height: 42px; border: none; border-radius: 10px; background: var(--pr, #1558B0); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.smb-send:disabled { opacity: 0.5; cursor: not-allowed; }
.smb-body { padding: 4px 18px 14px; min-height: 90px; max-height: 50vh; overflow-y: auto; }
.smb-thinking { display: flex; align-items: center; gap: 6px; color: #6F767E; font-size: 13.5px; padding: 10px 0; }
.smb-thinking .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pr, #1558B0); animation: smb-bounce 1s infinite; }
.smb-thinking .dot:nth-child(2) { animation-delay: 0.15s; }
.smb-thinking .dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes smb-bounce { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.smb-examples-title { font-size: 12px; color: #9A9FA5; margin: 8px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.smb-example { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 10px; padding: 9px 12px; margin-bottom: 6px; font-size: 13.5px; color: #1A1D1F; cursor: pointer; }
.smb-example:hover { border-color: var(--pr, #1558B0); }
.smb-answer { display: flex; gap: 10px; padding: 8px 0; }
.smb-answer-body { min-width: 0; }
.smb-answer p { margin: 0 0 8px; font-size: 14px; color: #1A1D1F; line-height: 1.5; }
.smb-nav-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--pr, #1558B0); color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }
.smb-spark.sm { color: var(--pr, #1558B0); flex-shrink: 0; }
.smb-foot { padding: 10px 18px; border-top: 1px solid #F2F1ED; font-size: 12px; color: #9A9FA5; }
.smb-pop-enter-active, .smb-pop-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.smb-pop-enter-from, .smb-pop-leave-to { transform: scale(0.7); opacity: 0; }
.smb-fade-enter-active, .smb-fade-leave-active { transition: opacity 0.2s ease; }
.smb-fade-enter-from, .smb-fade-leave-to { opacity: 0; }
.smb-scale-enter-active, .smb-scale-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.smb-scale-enter-from, .smb-scale-leave-to { transform: translateY(-8px) scale(0.98); opacity: 0; }
/* Mobile : remonter le bouton au-dessus de la barre basse du Supérieur */
@media (max-width: 560px) {
  .smb-fab { right: 16px; bottom: 76px; width: 52px; height: 52px; }
  .smb-container { padding: 56px 10px 0; }
}
</style>
