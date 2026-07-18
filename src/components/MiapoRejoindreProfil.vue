<template>
  <!-- Compte ENFANT : je rejoins MON profil avec le code donné par mon parent.
       Affiché quand aucun profil n'existe encore sur ce compte réel. -->
  <div v-if="!isDemo" class="join">
    <div class="join-title">{{ t('mia.joinChildTitle') }}</div>
    <div class="join-row">
      <input v-model="code" class="input" :placeholder="t('mia.coParentJoinPh')" maxlength="8" @input="err = ''" />
      <button class="btn btn-outline btn-sm" :disabled="eco.busy || !code.trim()" @click="join">
        <component :is="eco.busy ? Loader2 : Check" :size="14" :class="{ spin: eco.busy }" />
        <span>{{ t('mia.joinChildBtn') }}</span>
      </button>
    </div>
    <p v-if="err" class="err-line">{{ err }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useEnfantsComptesStore } from '../stores/enfantsComptes'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { Check, Loader2 } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const isDemo = useAuthStore().isDemo
const eco = useEnfantsComptesStore()
const enfants = useEnfantsAutonomesStore()

const code = ref('')
const err = ref('')

async function join() {
  err.value = ''
  const r = await eco.redeemInvite(code.value)
  if (r.ok) {
    code.value = ''
    await enfants.hydrate() // charge MON profil (et bascule en mode apprenant)
  } else {
    err.value = r.reason === 'self' ? t('mia.coParentSelf')
      : r.reason === 'invalid' || r.reason === 'empty' ? t('mia.coParentInvalid')
      : t('mia.coParentNetwork')
  }
}
</script>

<style scoped>
.join { margin-top: 20px; border-top: 1px solid var(--bd); padding-top: 16px; text-align: left; }
.join-title { font-size: 13px; font-weight: 600; color: var(--tx); margin-bottom: 8px; }
.join-row { display: flex; gap: 10px; }
.input { flex: 1; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; background: #fff; color: var(--tx); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid var(--bd); background: #fff; color: var(--tx); font-family: inherit; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
</style>
