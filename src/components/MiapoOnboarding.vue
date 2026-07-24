<template>
  <div class="mo-overlay">
    <div class="mo-card">
      <!-- Marque -->
      <div class="mo-brand">
        <div class="mo-mark">M+</div>
        <div class="mo-brand-txt">MAPO+</div>
      </div>

      <!-- Progression -->
      <div class="mo-dots">
        <span v-for="i in 3" :key="i" class="mo-dot" :class="{ on: i - 1 <= step, done: i - 1 < step }"></span>
      </div>

      <!-- Étape 1 : persona -->
      <div v-if="step === 0" class="mo-step">
        <h1 class="mo-title">{{ t('miaOnb.lead') }}</h1>
        <p class="mo-sub">{{ t('miaOnb.personaQ') }}</p>
        <div class="mo-choices">
          <button type="button" class="mo-choice" :class="{ sel: persona === 'parent' }" @click="persona = 'parent'">
            <span class="mo-choice-ic" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <span class="mo-choice-name">{{ t('miaOnb.personaParent') }}</span>
            <span class="mo-choice-hint">{{ t('miaOnb.personaParentHint') }}</span>
          </button>
          <button type="button" class="mo-choice" :class="{ sel: persona === 'apprenant' }" @click="persona = 'apprenant'">
            <span class="mo-choice-ic" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>
            </span>
            <span class="mo-choice-name">{{ t('miaOnb.personaLearner') }}</span>
            <span class="mo-choice-hint">{{ t('miaOnb.personaLearnerHint') }}</span>
          </button>
        </div>
      </div>

      <!-- Étape 2 : pays + niveau -->
      <div v-else-if="step === 1" class="mo-step">
        <h1 class="mo-title">{{ t('miaOnb.levelQ') }}</h1>
        <p class="mo-sub">{{ t('miaOnb.levelSub') }}</p>
        <div class="mo-field">
          <label class="mo-label">{{ t('login.countryLabel') }}</label>
          <select v-model="pays" class="mo-input">
            <option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option>
          </select>
        </div>
        <div class="mo-field">
          <label class="mo-label">{{ t('mia.classLabel') }}</label>
          <select v-model="niveau" class="mo-input">
            <optgroup :label="t('mia.cyclePrimary')">
              <option v-for="n in niveauxPrimairePays(pays)" :key="n" :value="n">{{ n }}</option>
            </optgroup>
            <optgroup :label="t('mia.cycleSecondary')">
              <option v-for="n in niveauxSecondairePays(pays)" :key="n" :value="n">{{ n }}</option>
            </optgroup>
            <optgroup v-if="pays !== 'FR'" :label="t('mia.cycleHigher')">
              <option v-for="n in NIVEAUX_SUPERIEUR" :key="n" :value="n">{{ n }}</option>
            </optgroup>
            <option :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option>
          </select>
        </div>
        <div v-if="niveau === NIVEAU_HORS_CATALOGUE" class="mo-field">
          <label class="mo-label">{{ t('mia.formationName') }}</label>
          <input v-model="formation" class="mo-input" :placeholder="t('mia.formationPlaceholder')" />
        </div>
      </div>

      <!-- Étape 3 : prénom + école -->
      <div v-else class="mo-step">
        <h1 class="mo-title">{{ t('miaOnb.detailsQ') }}</h1>
        <p class="mo-sub">{{ t('miaOnb.detailsSub') }}</p>
        <div class="mo-field">
          <label class="mo-label">{{ persona === 'apprenant' ? t('miaOnb.learnerName') : t('miaOnb.childName') }}</label>
          <input v-model="firstName" class="mo-input" autocomplete="off" :placeholder="t('login.namePlaceholder')" />
        </div>
        <div v-if="niveau !== NIVEAU_HORS_CATALOGUE" class="mo-field">
          <label class="mo-label">{{ t('mia.school') }} <span class="mo-opt">{{ t('mia.optional') }}</span></label>
          <input v-model="ecole" class="mo-input" :placeholder="t('mia.schoolPlaceholder')" />
        </div>
        <p v-if="error" class="mo-error">{{ error }}</p>
      </div>

      <!-- Navigation -->
      <div class="mo-nav">
        <button v-if="step > 0" type="button" class="mo-btn ghost" @click="back">{{ t('miaOnb.back') }}</button>
        <span class="mo-spacer"></span>
        <button v-if="step < 2" type="button" class="mo-btn primary" :disabled="!canNext" @click="next">{{ t('miaOnb.next') }}</button>
        <button v-else type="button" class="mo-btn primary" @click="finish">{{ t('miaOnb.start') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import {
  useEnfantsAutonomesStore,
  PAYS, paysParDefaut, setPaysParDefaut,
  niveauxPrimairePays, niveauxSecondairePays, NIVEAUX_SUPERIEUR, NIVEAU_HORS_CATALOGUE,
} from '../stores/enfantsAutonomes'

const emit = defineEmits(['done'])
const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const store = useEnfantsAutonomesStore()

// Pré-remplissage éventuel depuis l'inscription : l'apprenant a pu saisir son
// prénom + niveau/formation dès la création du compte → onboarding plus rapide.
let _prefill = {}
try { _prefill = JSON.parse(localStorage.getItem('mapo_signup_prefill') || '{}') } catch { _prefill = {} }

// Si le persona a déjà été choisi à l'inscription, on saute l'étape « qui es-tu »
// (l'utilisateur peut toujours revenir en arrière pour la changer).
const step = ref(_prefill.persona ? 1 : 0)
const persona = ref(_prefill.persona || (store.mode === 'apprenant' ? 'apprenant' : 'parent'))
const pays = ref(_prefill.pays || paysParDefaut() || 'CM')
const niveau = ref(_prefill.niveau || '3ème')
const formation = ref(_prefill.formation || '')
// Pour l'apprenant, on pré-remplit avec le nom du compte (souvent le sien).
const firstName = ref(_prefill.firstName || (store.mode === 'apprenant' ? (auth.userFirstName || '') : ''))
const ecole = ref('')
const error = ref('')

const canNext = computed(() => {
  if (step.value === 0) return !!persona.value
  if (step.value === 1) return niveau.value !== NIVEAU_HORS_CATALOGUE || !!formation.value.trim()
  return true
})

function back() { error.value = ''; if (step.value > 0) step.value -= 1 }
function next() { error.value = ''; if (canNext.value && step.value < 2) step.value += 1 }

function finish() {
  if (!firstName.value.trim()) { error.value = t('miaOnb.nameRequired'); return }
  const isHC = niveau.value === NIVEAU_HORS_CATALOGUE
  if (isHC && !formation.value.trim()) { error.value = t('miaOnb.formationRequired'); step.value = 1; return }
  store.setMode(persona.value)
  setPaysParDefaut(pays.value)
  store.addEnfant({
    firstName: firstName.value.trim(),
    niveau: niveau.value,
    pays: pays.value,
    ecole: isHC ? '' : ecole.value.trim(),
    formation: isHC ? formation.value.trim() : '',
  })
  try { localStorage.removeItem('mapo_signup_prefill') } catch { /* ignore */ }
  emit('done')
}
</script>

<style scoped>
.mo-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(1100px 520px at 12% -10%, color-mix(in srgb, var(--pr, #8e24a9) 16%, transparent), transparent 60%),
    #f6f7fb;
}
.mo-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(20, 20, 43, 0.16);
  padding: 26px 24px 22px;
}
.mo-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.mo-mark {
  width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center;
  font-weight: 800; font-size: 16px; color: #fff;
  background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 55%, #ff6d4d));
}
.mo-brand-txt { font-size: 18px; font-weight: 800; color: #1c1e27; letter-spacing: -0.02em; }
.mo-dots { display: flex; gap: 7px; margin-bottom: 20px; }
.mo-dot { width: 26px; height: 5px; border-radius: 3px; background: #e2e4ec; transition: background 0.25s; }
.mo-dot.on { background: color-mix(in srgb, var(--pr, #8e24a9) 55%, #d9b8e6); }
.mo-dot.done { background: var(--pr, #8e24a9); }
.mo-step { min-height: 232px; }
.mo-title { font-size: 20px; font-weight: 800; color: #1c1e27; margin: 0 0 6px; line-height: 1.25; }
.mo-sub { font-size: 14px; color: #626878; margin: 0 0 18px; line-height: 1.5; }
.mo-choices { display: flex; flex-direction: column; gap: 12px; }
.mo-choice {
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  text-align: left; padding: 15px 16px; border-radius: 15px; cursor: pointer;
  border: 1.5px solid #e6e7ee; background: #fff; transition: border-color 0.15s, background 0.15s;
}
.mo-choice.sel { border-color: var(--pr, #8e24a9); background: color-mix(in srgb, var(--pr, #8e24a9) 7%, #fff); }
.mo-choice-ic { color: var(--pr, #8e24a9); margin-bottom: 4px; }
.mo-choice-name { font-size: 15.5px; font-weight: 700; color: #1c1e27; }
.mo-choice-hint { font-size: 13px; color: #7a8090; line-height: 1.4; }
.mo-field { margin-bottom: 14px; }
.mo-label { display: block; font-size: 13px; font-weight: 600; color: #565b68; margin-bottom: 6px; }
.mo-opt { font-weight: 500; color: #9aa0ad; }
.mo-input {
  width: 100%; box-sizing: border-box; border: 1.5px solid #e0e2ea; border-radius: 12px;
  padding: 12px 13px; font-size: 15px; color: #1c1e27; background: #fff; outline: none;
}
.mo-input:focus { border-color: var(--pr, #8e24a9); }
.mo-error { font-size: 13.5px; font-weight: 600; color: #b4560a; background: #fff3e6; border-radius: 10px; padding: 8px 11px; margin: 4px 0 0; }
.mo-nav { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
.mo-spacer { flex: 1; }
.mo-btn { border: none; border-radius: 12px; padding: 12px 20px; font-size: 15px; font-weight: 700; cursor: pointer; }
.mo-btn:disabled { opacity: 0.5; cursor: default; }
.mo-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 60%, #ff6d4d));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--pr, #8e24a9) 30%, transparent);
}
.mo-btn.ghost { color: #565b68; background: #eef0f5; }
</style>
