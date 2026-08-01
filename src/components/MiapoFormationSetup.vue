<template>
  <div class="fs-overlay">
    <div class="fs-card">
      <div class="fs-brand">
        <div class="fs-mark">M+</div>
        <div class="fs-brand-txt">MAPO+</div>
      </div>

      <h1 class="fs-title">{{ t('miaForm.title') }}</h1>
      <p class="fs-sub">{{ t('miaForm.sub') }}</p>

      <div class="fs-field">
        <label class="fs-label">{{ t('miaForm.school') }}</label>
        <input v-model="ecole" class="fs-input" :placeholder="t('miaForm.schoolPlaceholder')" />
      </div>
      <div class="fs-field">
        <label class="fs-label">{{ t('miaForm.formation') }}</label>
        <input v-model="formation" class="fs-input" :placeholder="t('miaForm.formationPlaceholder')" />
      </div>
      <div class="fs-field">
        <label class="fs-label">{{ t('miaForm.url') }} <span class="fs-opt">{{ t('miaForm.optional') }}</span></label>
        <input v-model="url" class="fs-input" type="url" :placeholder="t('miaForm.urlPlaceholder')" />
      </div>
      <div class="fs-field">
        <label class="fs-label">{{ t('miaForm.paste') }} <span class="fs-opt">{{ t('miaForm.optional') }}</span></label>
        <textarea v-model="texte" class="fs-input" rows="2" :placeholder="t('miaForm.pastePlaceholder')"></textarea>
      </div>

      <!-- Matières : SOIT saisie manuelle (toujours visible), SOIT proposition IA.
           Les deux ne sont pas cumulatives — l'une OU l'autre suffit à valider. -->
      <div class="fs-field fs-modules">
        <label class="fs-label">{{ t('miaForm.modules') }} <span class="fs-opt">{{ t('miaForm.modulesManualHint') }}</span></label>
        <textarea v-model="modules" class="fs-input" rows="3" :placeholder="t('miaForm.modulesPlaceholder')"></textarea>
        <div v-if="moduleChips.length" class="fs-chips">
          <span v-for="(m, i) in moduleChips" :key="i" class="fs-chip">{{ m }}</span>
        </div>
      </div>

      <div class="fs-or"><span>{{ t('miaForm.or') }}</span></div>
      <button type="button" class="fs-btn propose" :disabled="!formation.trim() || loading" @click="propose">
        <span v-if="loading" class="fs-spin"></span>
        <span>{{ loading ? t('miaForm.proposing') : t('miaForm.proposeOptional') }}</span>
      </button>
      <p v-if="error" class="fs-err">{{ error }}</p>

      <div class="fs-nav">
        <button type="button" class="fs-btn ghost" @click="skip">{{ t('miaForm.later') }}</button>
        <span class="fs-spacer"></span>
        <button type="button" class="fs-btn primary" :disabled="!canSave" @click="save">{{ t('miaForm.validate') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'

const props = defineProps({ enfant: { type: Object, required: true } })
const emit = defineEmits(['done', 'skip'])
const { t } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()

const ecole = ref(props.enfant.ecole || '')
const formation = ref(props.enfant.formation || '')
const url = ref(props.enfant.formationUrl || '')
const texte = ref('')
const modules = ref((props.enfant.formationModules || ''))
const loading = ref(false)
const error = ref('')
const proposed = ref(false)

const moduleChips = computed(() => modules.value.split(',').map((m) => m.trim()).filter(Boolean))
const canSave = computed(() => moduleChips.value.length > 0)

async function propose() {
  if (!formation.value.trim() || loading.value) return
  loading.value = true; error.value = ''
  try {
    // L'IA propose une structure à partir du nom de la formation, de l'école et
    // du programme éventuellement collé. L'apprenant corrige/valide ensuite.
    const res = await tuteur.extraireModules({ formation: formation.value.trim(), ecole: ecole.value.trim(), texte: texte.value.trim() })
    if (res && res.ok && res.modules && res.modules.length) {
      const existing = moduleChips.value
      const merged = existing.concat(res.modules.filter((m) => !existing.includes(m)))
      modules.value = merged.join(', ')
      proposed.value = true
    } else {
      error.value = (res && res.reason) || t('miaForm.proposeFail')
    }
  } catch { error.value = t('miaForm.proposeFail') } finally { loading.value = false }
}

function save() {
  if (!canSave.value) return
  store.updateEnfant(props.enfant.id, {
    ecole: ecole.value.trim(),
    formation: formation.value.trim(),
    formationUrl: url.value.trim(),
    formationModules: moduleChips.value.join(', '),
  })
  emit('done')
}
function skip() { emit('skip') }
</script>

<style scoped>
.fs-overlay {
  position: fixed; inset: 0; z-index: 62;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  overflow-y: auto;
  background:
    radial-gradient(1100px 520px at 12% -10%, color-mix(in srgb, var(--pr, #7c3aed) 16%, transparent), transparent 60%),
    #f6f7fb;
}
.fs-card {
  width: 100%; max-width: 460px; margin: auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(20, 20, 43, 0.16);
  padding: 24px 22px 20px;
}
.fs-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.fs-mark {
  width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
  font-weight: 800; font-size: 15px; color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}
.fs-brand-txt { font-size: 17px; font-weight: 800; color: #1c1e27; letter-spacing: -0.02em; }
.fs-title { font-size: 20px; font-weight: 800; color: #1c1e27; margin: 0 0 6px; line-height: 1.25; }
.fs-sub { font-size: 13.8px; color: #626878; margin: 0 0 18px; line-height: 1.5; }
.fs-field { margin-bottom: 13px; }
.fs-modules { margin-top: 4px; }
.fs-or { display: flex; align-items: center; text-align: center; gap: 10px; margin: 12px 0 10px; color: #9aa0ad; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
.fs-or::before, .fs-or::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
.fs-label { display: block; font-size: 13px; font-weight: 600; color: #565b68; margin-bottom: 6px; }
.fs-opt { font-weight: 500; color: #9aa0ad; }
.fs-input {
  width: 100%; box-sizing: border-box; border: 1.5px solid #e0e2ea; border-radius: 12px;
  padding: 11px 13px; font-size: 14.5px; color: #1c1e27; background: #fff; outline: none;
  font-family: inherit; resize: vertical;
}
.fs-input:focus { border-color: var(--pr, #7c3aed); }
.fs-btn { border: none; border-radius: 12px; padding: 11px 18px; font-size: 14.5px; font-weight: 700; cursor: pointer; }
.fs-btn:disabled { opacity: 0.5; cursor: default; }
.fs-btn.propose {
  width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--pr, #7c3aed); background: color-mix(in srgb, var(--pr, #7c3aed) 9%, #fff);
  border: 1.5px solid color-mix(in srgb, var(--pr, #7c3aed) 35%, #fff); margin-bottom: 6px;
}
.fs-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
}
.fs-btn.ghost { color: #565b68; background: #eef0f5; }
.fs-err { font-size: 13px; font-weight: 600; color: #b4560a; background: #fff3e6; border-radius: 10px; padding: 8px 11px; margin: 4px 0 0; }
.fs-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.fs-chip { font-size: 12.5px; font-weight: 600; color: #5b3a8e; background: color-mix(in srgb, var(--pr, #7c3aed) 12%, #fff); border-radius: 999px; padding: 4px 10px; }
.fs-nav { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.fs-spacer { flex: 1; }
.fs-spin { width: 15px; height: 15px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: fs-rot 0.7s linear infinite; }
@keyframes fs-rot { to { transform: rotate(360deg); } }
</style>
