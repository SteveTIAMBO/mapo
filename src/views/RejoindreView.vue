<template>
  <div class="rj-page">
    <div class="rj-bg"></div>

    <div class="rj-card">
      <div class="rj-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <div class="rj-logo">
        <div class="rj-logo-mark">M+</div>
        <div class="rj-logo-title">MAPO+</div>
      </div>

      <!-- Écran d'accueil : l'enfant confirme que c'est bien son téléphone -->
      <template v-if="phase === 'confirm'">
        <div class="rj-badge" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <h1 class="rj-title">{{ prenom ? t('rejoindre.helloName', { name: prenom }) : t('rejoindre.hello') }}</h1>
        <p class="rj-text">{{ t('rejoindre.intro') }}</p>
        <p class="rj-hint">{{ t('rejoindre.deviceNote') }}</p>
        <button class="rj-btn primary" :disabled="eco.busy" @click="join">
          {{ eco.busy ? t('rejoindre.opening') : t('rejoindre.open') }}
        </button>
      </template>

      <!-- Connexion en cours -->
      <template v-else-if="phase === 'joining'">
        <div class="rj-badge spin" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejoindre.opening') }}</h1>
        <p class="rj-text">{{ t('rejoindre.wait') }}</p>
      </template>

      <!-- Erreur -->
      <template v-else>
        <div class="rj-badge warn" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejoindre.oops') }}</h1>
        <p class="rj-text">{{ errorMsg }}</p>
        <button v-if="canRetry" class="rj-btn primary" :disabled="eco.busy" @click="join">
          {{ t('rejoindre.retry') }}
        </button>
        <button class="rj-link" @click="goHome">{{ t('rejoindre.goHome') }}</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { setLang } from '../i18n'
import { useAuthStore } from '../stores/auth'
import { useEnfantsComptesStore } from '../stores/enfantsComptes'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eco = useEnfantsComptesStore()
const enfants = useEnfantsAutonomesStore()

// Code porté par le lien : ?c=CODE (repli sur ?code=). Nettoyé + majuscules.
const code = String(route.query.c || route.query.code || '').trim().toUpperCase()
const prenom = ref(String(route.query.p || route.query.name || '').trim())

const phase = ref('confirm') // 'confirm' | 'joining' | 'error'
const errorReason = ref('')

// Codes d'erreur « temporaires » (service/IAM) → on propose de réessayer.
// Les codes « invalides » (code inconnu/incomplet) ne se réessaient pas.
const TEMP = new Set(['service_indisponible', 'jeton_echec', 'signin', 'network', 'server'])
const canRetry = computed(() => TEMP.has(errorReason.value))
const errorMsg = computed(() => {
  const r = errorReason.value
  if (r === 'missing') return t('rejoindre.errMissing')
  if (r === 'network') return t('rejoindre.errNetwork')
  if (TEMP.has(r)) return t('rejoindre.errService')
  return t('rejoindre.errInvalid') // code_inconnu / code_incomplet / code_invalide / empty
})

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function join() {
  if (!code) { errorReason.value = 'missing'; phase.value = 'error'; return }
  phase.value = 'joining'
  const r = await eco.joinViaLink(code)
  if (!r.ok) {
    errorReason.value = r.reason || 'server'
    phase.value = 'error'
    return
  }
  if (r.prenom) prenom.value = r.prenom
  // Attendre que l'état d'auth reflète le compte enfant, puis hydrater son
  // profil (mode apprenant) avant de naviguer — évite un écran vide fugace.
  for (let i = 0; i < 60 && authStore.user?.uid !== r.childUid; i++) await sleep(50)
  try { await enfants.hydrate() } catch { /* offline : ParentMiapo réessaiera */ }
  router.replace({ name: 'ParentMiapo' })
}

function goHome() { router.replace({ name: 'Home' }) }

onMounted(() => {
  if (!code) { errorReason.value = 'missing'; phase.value = 'error' }
})
</script>

<style scoped>
.rj-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; }
.rj-bg {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(1100px 520px at 15% -10%, color-mix(in srgb, var(--pr, #8e24a9) 16%, transparent), transparent 60%),
    radial-gradient(900px 480px at 110% 10%, color-mix(in srgb, var(--pr, #8e24a9) 10%, transparent), transparent 55%),
    #f6f7fb;
}
.rj-card {
  position: relative; z-index: 1; width: 100%; max-width: 420px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(20, 20, 43, 0.14);
  padding: 30px 28px 26px;
  text-align: center;
}
.rj-lang { position: absolute; top: 16px; right: 16px; display: flex; gap: 4px; }
.rj-lang button { border: none; background: transparent; font-size: 12px; font-weight: 700; color: #9aa0ad; padding: 3px 7px; border-radius: 8px; cursor: pointer; }
.rj-lang button.on { background: color-mix(in srgb, var(--pr, #8e24a9) 14%, transparent); color: var(--pr, #8e24a9); }
.rj-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
.rj-logo-mark { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; font-size: 17px; color: #fff; background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 55%, #ff6d4d)); box-shadow: 0 6px 16px color-mix(in srgb, var(--pr, #8e24a9) 35%, transparent); }
.rj-logo-title { font-size: 20px; font-weight: 800; color: #1c1e27; letter-spacing: -0.02em; }
.rj-badge { width: 62px; height: 62px; margin: 4px auto 14px; border-radius: 50%; display: grid; place-items: center; color: var(--pr, #8e24a9); background: color-mix(in srgb, var(--pr, #8e24a9) 12%, #fff); }
.rj-badge.warn { color: #b4560a; background: #fff3e6; }
.rj-badge.spin svg { animation: rjspin 0.9s linear infinite; }
@keyframes rjspin { to { transform: rotate(360deg); } }
.rj-title { font-size: 20px; font-weight: 800; color: #1c1e27; margin: 0 0 8px; }
.rj-text { font-size: 14.5px; color: #565b68; margin: 0 0 8px; line-height: 1.5; }
.rj-hint { font-size: 13px; color: #8a90a0; margin: 0 0 18px; line-height: 1.5; }
.rj-btn { width: 100%; border: none; border-radius: 13px; padding: 13px 16px; font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 10px; transition: transform 0.06s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
.rj-btn:disabled { opacity: 0.6; cursor: default; }
.rj-btn.primary { color: #fff; background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 60%, #ff6d4d)); box-shadow: 0 8px 20px color-mix(in srgb, var(--pr, #8e24a9) 32%, transparent); }
.rj-btn.primary:not(:disabled):active { transform: translateY(1px); }
.rj-link { border: none; background: transparent; color: #8a90a0; font-size: 13.5px; font-weight: 600; cursor: pointer; margin-top: 4px; padding: 6px; }
.rj-link:hover { color: #565b68; }
</style>
