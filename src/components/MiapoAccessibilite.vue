<template>
  <div class="card a11y">
    <div class="card-head"><Accessibility :size="18" /><h3>{{ t('mia.accessTitle') }}</h3></div>
    <p class="muted">{{ t('mia.accessHint') }}</p>

    <ul class="opts">
      <li>
        <div class="opt-txt">
          <span class="opt-title">{{ t('mia.accessContrast') }}</span>
          <span class="opt-desc">{{ t('mia.accessContrastDesc') }}</span>
        </div>
        <button
          type="button" role="switch" class="switch" :class="{ on: a11y.contraste }"
          :aria-checked="a11y.contraste ? 'true' : 'false'"
          :aria-label="t('mia.accessContrast')"
          @click="a11y.contraste = !a11y.contraste"
        ><span class="knob" /></button>
      </li>
      <li>
        <div class="opt-txt">
          <span class="opt-title">{{ t('mia.accessBigText') }}</span>
          <span class="opt-desc">{{ t('mia.accessBigTextDesc') }}</span>
        </div>
        <button
          type="button" role="switch" class="switch" :class="{ on: a11y.grandTexte }"
          :aria-checked="a11y.grandTexte ? 'true' : 'false'"
          :aria-label="t('mia.accessBigText')"
          @click="a11y.grandTexte = !a11y.grandTexte"
        ><span class="knob" /></button>
      </li>
      <li>
        <div class="opt-txt">
          <span class="opt-title">{{ t('mia.accessReduceMotion') }}</span>
          <span class="opt-desc">{{ t('mia.accessReduceMotionDesc') }}</span>
        </div>
        <button
          type="button" role="switch" class="switch" :class="{ on: a11y.animOff }"
          :aria-checked="a11y.animOff ? 'true' : 'false'"
          :aria-label="t('mia.accessReduceMotion')"
          @click="a11y.animOff = !a11y.animOff"
        ><span class="knob" /></button>
      </li>
    </ul>

    <button v-if="a11y.actif()" type="button" class="btn btn-ghost btn-sm reset" @click="reset">
      {{ t('mia.accessReset') }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useAccessibiliteStore } from '../stores/accessibilite'
import { Accessibility } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const a11y = useAccessibiliteStore()

function reset() { a11y.contraste = false; a11y.grandTexte = false; a11y.animOff = false }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }
.opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.opts li { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-top: 1px solid var(--bd, #eef0f6); }
.opts li:first-child { border-top: none; }
.opt-txt { display: flex; flex-direction: column; gap: 2px; }
.opt-title { font-size: 14.5px; font-weight: 600; color: var(--tx); }
.opt-desc { font-size: 12.5px; color: var(--tx3); }
/* Interrupteur accessible */
.switch { position: relative; flex-shrink: 0; width: 46px; height: 28px; border-radius: 999px; border: none; background: #d5d9e2; cursor: pointer; transition: background .2s ease; padding: 0; }
.switch.on { background: var(--pr); }
.switch .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .2s ease; }
.switch.on .knob { transform: translateX(18px); }
.switch:focus-visible { outline: 2px solid var(--pr); outline-offset: 2px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-ghost { background: none; color: var(--tx3); }
.reset { margin-top: 14px; }
</style>
