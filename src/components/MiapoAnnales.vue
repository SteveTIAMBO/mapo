<template>
  <div class="annales">
    <!-- ===== Choix ===== -->
    <div v-if="state === 'idle' || state === 'error'" class="card">
      <div class="card-head"><ClipboardList :size="18" /><h3>{{ t('mia.annalesTitle') }}</h3></div>
      <p class="muted">{{ t('mia.annalesHint') }}</p>
      <div class="pick">
        <select v-model="exam" class="input">
          <option v-for="e in examens" :key="e" :value="e">{{ e }}</option>
        </select>
        <select v-model="matiere" class="input">
          <option value="" disabled>{{ t('mia.chooseSubject') }}</option>
          <option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option>
        </select>
        <button class="btn btn-primary" :disabled="!matiere || !exam" @click="composer">
          <Sparkles :size="15" /> <span>{{ t('mia.annalesCompose') }}</span>
        </button>
      </div>
      <p class="foot"><Info :size="13" /> {{ t('mia.annalesTypeNote') }}</p>
      <p v-if="state === 'error'" class="err-line">{{ errorMsg }}</p>
    </div>

    <!-- ===== Chargement ===== -->
    <div v-else-if="state === 'loading'" class="card loading">
      <Loader2 :size="32" class="spin" /><p>{{ t('mia.annalesComposing', { exam }) }}</p><small>{{ t('mia.fewSeconds') }}</small>
    </div>

    <!-- ===== Sujet ===== -->
    <template v-else-if="state === 'done' && sujet">
      <div class="card">
        <div class="vr-head">
          <span class="vr-mat">{{ sujet.titre || (exam + ' — ' + matiere) }}</span>
          <span class="ia-badge"><MiapoOrbe :size="14" frozen /> MIAPO</span>
        </div>
        <div class="exam-meta"><ClipboardList :size="14" /> <span>{{ exam }} · {{ matiere }}</span></div>
        <div class="sujet-body">{{ sujet.document }}</div>

        <div class="conditions"><Timer :size="14" /> <span>{{ t('mia.annalesConditions') }}</span></div>

        <!-- Corrigé masqué jusqu'à la tentative -->
        <div v-if="sujet.corrige" class="corrige">
          <button class="corrige-toggle" @click="showCorrige = !showCorrige">
            <component :is="showCorrige ? ChevronDown : ChevronRight" :size="16" />
            <span>{{ showCorrige ? t('mia.annalesHideCorrige') : t('mia.annalesShowCorrige') }}</span>
          </button>
          <div v-if="showCorrige" class="corrige-body">{{ sujet.corrige }}</div>
        </div>

        <div class="row-actions">
          <button class="btn btn-outline btn-sm" @click="copier"><Copy :size="14" /> <span>{{ copied ? t('mia.annalesCopied') : t('mia.annalesCopy') }}</span></button>
          <button class="btn btn-ghost btn-sm" @click="composer"><RefreshCw :size="14" /> <span>{{ t('mia.annalesNew') }}</span></button>
          <button class="btn btn-ghost btn-sm" @click="reset">{{ t('mia.annalesChange') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { NIVEAUX_PRIMAIRE, isNiveauSuperieur, PAYS } from '../stores/enfantsAutonomes'
import { ClipboardList, Sparkles, Loader2, RefreshCw, Copy, ChevronRight, ChevronDown, Timer, Info } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'

const props = defineProps({
  enfant: { type: Object, default: null },
  // ⚠️ Reçue, plus déduite. L'appel local oubliait le PAYS : un élève sénégalais
  // ou ivoirien se voyait proposer les matières camerounaises pour ses annales.
  matieres: { type: Array, default: () => [] },
})
const { t } = useI18n({ useScope: 'global' })
const cours = useCoursStore()

const niveau = computed(() => props.enfant?.niveau || '')
const pays = computed(() => props.enfant?.pays || 'CM')
const matieresList = computed(() => props.matieres)

// Cycle déduit du niveau → examen(s) national/nationaux du pays.
function cycleOf(n) {
  if (NIVEAUX_PRIMAIRE.includes(n)) return 'primaire'
  if (['6ème', '5ème', '4ème', '3ème'].includes(n)) return 'college'
  if (/^(2nde|1ère|Tle)/.test(n)) return 'lycee'
  if (isNiveauSuperieur(n)) return 'superieur'
  return 'college'
}
const EXAMENS = {
  CM: { primaire: ['CEP', 'Entrée en 6e'], college: ['BEPC', 'GCE O Level'], lycee: ['Probatoire', 'Baccalauréat', 'GCE A Level'] },
  SN: { primaire: ['CFEE'], college: ['BFEM'], lycee: ['Baccalauréat'] },
  CI: { primaire: ['CEPE'], college: ['BEPC'], lycee: ['Baccalauréat'] },
  GA: { primaire: ['CEP'], college: ['BEPC'], lycee: ['Baccalauréat'] },
  FR: { primaire: ['Évaluations nationales'], college: ['Brevet (DNB)'], lycee: ['Baccalauréat'] },
}
const GENERIC = { primaire: ['Examen de fin de primaire'], college: ['Brevet'], lycee: ['Baccalauréat'], superieur: ['Examen de fin de semestre'] }
const examens = computed(() => {
  const cyc = cycleOf(niveau.value)
  return (EXAMENS[pays.value] && EXAMENS[pays.value][cyc]) || GENERIC[cyc] || GENERIC.college
})
const paysLabel = computed(() => PAYS.find((p) => p.code === pays.value)?.label || '')

const exam = ref('')
const matiere = ref('')
watch(examens, (list) => { if (!list.includes(exam.value)) exam.value = list[0] || '' }, { immediate: true })

const state = ref('idle') // idle | loading | done | error
const errorMsg = ref('')
const sujet = ref(null)
const showCorrige = ref(false)
const copied = ref(false)

async function composer() {
  if (!matiere.value || !exam.value) return
  state.value = 'loading'
  showCorrige.value = false
  copied.value = false
  const theme = t('mia.annalesPrompt', { exam: exam.value, subject: matiere.value, pays: paysLabel.value, niveau: niveau.value })
  const res = await cours.preparerAvecMiapo({ type: 'examen', matiere: matiere.value, niveau: niveau.value, theme })
  if (res?.ok && res.document) {
    sujet.value = { titre: res.titre, document: res.document, corrige: res.corrige }
    state.value = 'done'
  } else {
    errorMsg.value = res?.reason || t('mia.annalesUnavailable')
    state.value = 'error'
  }
}

function reset() { state.value = 'idle'; sujet.value = null }
async function copier() {
  const txt = [sujet.value?.titre, sujet.value?.document, showCorrige.value ? '\n' + sujet.value?.corrige : ''].filter(Boolean).join('\n\n')
  try { await navigator.clipboard.writeText(txt); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { /* clipboard indispo */ }
}
</script>

<style scoped>
.annales { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }
.pick { display: flex; flex-wrap: wrap; gap: 10px; }
.input { flex: 1 1 160px; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 14px; background: #fff; color: var(--tx); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn-ghost { background: none; color: var(--tx3); }
.btn-sm { padding: 7px 12px; font-size: 13px; }
.foot { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; font-size: 12px; color: var(--tx3); }
.err-line { color: #D93025; font-size: 13px; margin: 12px 0 0; }
.loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 44px 24px; text-align: center; }
.loading p { margin: 0; font-size: 15px; color: var(--tx); }
.loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }

.vr-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.vr-mat { font-weight: 700; font-size: 16px; color: var(--tx); }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }
.exam-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--pr); background: rgba(var(--pr-rgb),.06); padding: 5px 11px; border-radius: 20px; margin-bottom: 14px; }
.sujet-body { white-space: pre-wrap; font-size: 14.5px; line-height: 1.6; color: var(--tx); }
.conditions { display: flex; align-items: center; gap: 7px; margin-top: 16px; padding: 9px 13px; background: rgba(232,149,10,.09); color: #B87A00; border-radius: 10px; font-size: 12.5px; font-weight: 500; }
.corrige { margin-top: 14px; border-top: 1px solid var(--bd); padding-top: 14px; }
.corrige-toggle { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--pr); font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; padding: 0; }
.corrige-body { white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: var(--tx2); margin-top: 12px; padding: 14px; background: rgba(27,138,90,.05); border-radius: 12px; }
.row-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
</style>
