<template>
  <div class="card cop">
    <div class="card-head"><Users :size="18" /><h3>{{ t('mia.coParentTitle') }}</h3></div>

    <!-- Démo : fonctionnalité multi-comptes → compte réel requis -->
    <p v-if="isDemo" class="muted small">{{ t('mia.coParentDemoNote') }}</p>

    <template v-else>
      <!-- Je SUIS un co-parent rattaché -->
      <div v-if="cop.ownerUid" class="linked">
        <p class="muted">{{ t('mia.coParentJoinedShort') }}</p>
        <button class="btn btn-outline btn-sm" :disabled="cop.busy" @click="doUnlink"><LogOut :size="14" /> <span>{{ t('mia.coParentLeave') }}</span></button>
      </div>

      <!-- Je suis propriétaire : inviter + gérer -->
      <template v-else>
        <p class="muted">{{ t('mia.coParentHint') }}</p>

        <div v-if="!inviteCode" class="row">
          <button class="btn btn-primary btn-sm" :disabled="cop.busy" @click="invite"><UserPlus :size="14" /> <span>{{ t('mia.coParentInvite') }}</span></button>
        </div>
        <div v-else class="code-box">
          <span class="code-label">{{ t('mia.coParentCode') }}</span>
          <div class="code-row">
            <span class="code-val">{{ inviteCode }}</span>
            <button class="btn btn-outline btn-sm" @click="copyCode"><Copy :size="13" /> <span>{{ copied ? t('mia.coParentCopied') : t('mia.coParentCopy') }}</span></button>
          </div>
          <p class="muted small">{{ t('mia.coParentCodeHint') }}</p>
        </div>

        <div v-if="cop.coParents.length" class="cp-list">
          <div class="cp-list-title">{{ t('mia.coParentList') }}</div>
          <div v-for="c in cop.coParents" :key="c.id" class="cp-row">
            <span class="cp-name">{{ c.name || t('mia.coParentOther') }}</span>
            <button class="cp-del" :title="t('mia.coParentRemove')" @click="remove(c.id)"><X :size="15" /></button>
          </div>
        </div>

        <!-- Rejoindre avec un code reçu -->
        <div class="join">
          <div class="join-title">{{ t('mia.coParentJoinTitle') }}</div>
          <div class="join-row">
            <input v-model="joinCode" class="input" :placeholder="t('mia.coParentJoinPh')" maxlength="8" @input="joinErr = ''" />
            <button class="btn btn-outline btn-sm" :disabled="cop.busy || !joinCode.trim()" @click="join">
              <component :is="cop.busy ? Loader2 : Check" :size="14" :class="{ spin: cop.busy }" /> <span>{{ t('mia.coParentJoin') }}</span>
            </button>
          </div>
          <p v-if="joinErr" class="err-line">{{ joinErr }}</p>
          <p v-if="joinOk" class="ok-line">{{ t('mia.coParentDone') }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useCoParentsStore } from '../stores/coParents'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { Users, UserPlus, Copy, Check, X, LogOut, Loader2 } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const cop = useCoParentsStore()
const enfants = useEnfantsAutonomesStore()

const isDemo = authStore.isDemo
const inviteCode = ref('')
const copied = ref(false)
const joinCode = ref('')
const joinErr = ref('')
const joinOk = ref(false)

onMounted(async () => {
  if (isDemo) return
  await cop.loadMyLink()
  if (!cop.ownerUid) await cop.loadCoParents()
})

async function invite() {
  const r = await cop.createInvite()
  if (r.ok) inviteCode.value = r.code
}
async function copyCode() {
  try { await navigator.clipboard.writeText(inviteCode.value); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { /* clipboard indispo */ }
}
async function remove(id) { await cop.removeCoParent(id) }

async function join() {
  joinErr.value = ''
  joinOk.value = false
  const r = await cop.redeemInvite(joinCode.value)
  if (r.ok) {
    joinOk.value = true
    joinCode.value = ''
    await enfants.hydrate() // recharge les enfants du parent propriétaire
  } else {
    joinErr.value = r.reason === 'self' ? t('mia.coParentSelf')
      : r.reason === 'invalid' ? t('mia.coParentInvalid')
      : r.reason === 'empty' ? t('mia.coParentInvalid')
      : t('mia.coParentNetwork')
  }
}

async function doUnlink() {
  await cop.unlink()
  await enfants.hydrate()
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.cop { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 12px; }
.small { font-size: 12.5px; }
.row { display: flex; gap: 10px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 8px 13px; font-size: 13px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.code-box { background: rgba(var(--pr-rgb),.05); border: 1px solid rgba(var(--pr-rgb),.15); border-radius: 12px; padding: 14px 16px; }
.code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--tx3); }
.code-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0 8px; }
.code-val { font-family: 'Poppins', monospace; font-size: 24px; font-weight: 800; letter-spacing: 4px; color: var(--pr); }

.cp-list { margin-top: 16px; }
.cp-list-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--tx3); margin-bottom: 8px; }
.cp-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; margin-bottom: 8px; }
.cp-name { font-weight: 600; font-size: 14px; color: var(--tx); }
.cp-del { background: none; border: none; color: var(--tx3); cursor: pointer; display: inline-flex; padding: 4px; border-radius: 8px; }
.cp-del:hover { color: #D93025; background: rgba(217,48,37,.08); }

.join { margin-top: 18px; border-top: 1px solid var(--bd); padding-top: 16px; }
.join-title { font-size: 13px; font-weight: 600; color: var(--tx); margin-bottom: 8px; }
.join-row { display: flex; gap: 10px; }
.input { flex: 1; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; background: #fff; color: var(--tx); }
.linked { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.ok-line { color: #1B8A5A; font-size: 13px; margin: 10px 0 0; }
</style>
