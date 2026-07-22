<template>
  <div class="carre-cb">
    <div class="carre-cb-card">
      <MiapoOrbe :size="46" />
      <p v-if="phase === 'working'">{{ t('mia.carreLinking') }}</p>
      <p v-else-if="phase === 'ok'" class="ok">{{ t('mia.carreConnectedMsg') }}</p>
      <p v-else class="err">{{ t('mia.carreLinkError') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth as fbAuth } from '../firebase'
import { useConnecteursStore } from '../stores/connecteurs'
import MiapoOrbe from '../components/MiapoOrbe.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()
const phase = ref('working')

// La session Firebase se restaure de façon asynchrone au retour de Carré :
// on attend qu'elle soit prête avant d'échanger le code.
function waitAuth() {
  return new Promise((res) => {
    if (fbAuth.currentUser) return res(fbAuth.currentUser)
    const unsub = fbAuth.onAuthStateChanged((u) => { unsub(); res(u) })
    setTimeout(() => res(fbAuth.currentUser), 6000)
  })
}

function finish(status) {
  setTimeout(() => { router.replace({ name: 'ParentMiapo', query: { carre: status } }) }, 1100)
}

onMounted(async () => {
  const code = route.query.code
  const state = route.query.state
  if (!code || !state) { phase.value = 'error'; return finish('error') }
  await waitAuth()
  if (!fbAuth.currentUser) { phase.value = 'error'; return finish('error') }
  const r = await connecteurs.completeCallback(String(code), String(state))
  phase.value = r.ok ? 'ok' : 'error'
  finish(r.ok ? 'ok' : 'error')
})
</script>

<style scoped>
.carre-cb { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg, #f6f7fb); }
.carre-cb-card { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px 40px; text-align: center; }
.carre-cb-card p { font-size: 15px; color: var(--tx, #1a1a2e); margin: 0; }
.carre-cb-card .ok { color: #16a34a; font-weight: 600; }
.carre-cb-card .err { color: #d93025; font-weight: 600; }
</style>
