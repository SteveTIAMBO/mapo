<template>
  <div class="ve-page">
    <div class="ve-bg"></div>

    <div class="ve-card">
      <div class="ve-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <div class="ve-logo">
        <div class="ve-logo-mark">M+</div>
        <div class="ve-logo-title">MAPO+</div>
      </div>

      <div class="ve-badge" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
      </div>

      <h1 class="ve-title">{{ t('verifyEmail.title') }}</h1>
      <p class="ve-text">{{ t('verifyEmail.sentTo') }}</p>
      <p class="ve-email">{{ email }}</p>
      <p class="ve-hint">{{ t('verifyEmail.checkSpam') }}</p>

      <p v-if="notice" class="ve-notice" :class="{ warn: noticeWarn }">{{ notice }}</p>

      <button class="ve-btn primary" :disabled="checking" @click="iActivated">
        {{ checking ? t('verifyEmail.checking') : t('verifyEmail.iActivated') }}
      </button>
      <button class="ve-btn ghost" :disabled="cooldown > 0" @click="resend">
        {{ cooldown > 0 ? t('verifyEmail.resendWait', { s: cooldown }) : t('verifyEmail.resend') }}
      </button>

      <button class="ve-link" @click="doSignOut">{{ t('verifyEmail.signOut') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { setLang } from '../i18n'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const auth = useAuthStore()

const email = computed(() => auth.user?.email || '')
const checking = ref(false)
const cooldown = ref(0)
const notice = ref('')
const noticeWarn = ref(false)
let timer = null

async function iActivated() {
  checking.value = true
  notice.value = ''
  const ok = await auth.ensureEmailVerified()
  checking.value = false
  if (ok) {
    router.push('/mon-espace')
  } else {
    noticeWarn.value = true
    notice.value = t('verifyEmail.notYet')
  }
}

async function resend() {
  notice.value = ''
  const ok = await auth.resendVerification()
  noticeWarn.value = !ok
  notice.value = ok ? t('verifyEmail.resendDone') : t('verifyEmail.resendErr')
  cooldown.value = 45
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) { clearInterval(timer); timer = null }
  }, 1000)
}

async function doSignOut() {
  await auth.logout()
  router.push('/')
}

// Retour depuis le lien d'activation (souvent un autre onglet) : on revérifie
// dès que la fenêtre reprend le focus, et une fois au montage.
async function recheck() {
  const ok = await auth.ensureEmailVerified()
  if (ok) router.push('/mon-espace')
}

onMounted(() => {
  window.addEventListener('focus', recheck)
  recheck()
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', recheck)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.ve-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.ve-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1100px 520px at 15% -10%, color-mix(in srgb, var(--pr, #8e24a9) 16%, transparent), transparent 60%),
    radial-gradient(900px 480px at 110% 10%, color-mix(in srgb, var(--pr, #8e24a9) 10%, transparent), transparent 55%),
    #f6f7fb;
  z-index: 0;
}
.ve-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(20, 20, 43, 0.14);
  padding: 30px 28px 26px;
  text-align: center;
}
.ve-lang {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 4px;
}
.ve-lang button {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  color: #9aa0ad;
  padding: 3px 7px;
  border-radius: 8px;
  cursor: pointer;
}
.ve-lang button.on {
  background: color-mix(in srgb, var(--pr, #8e24a9) 14%, transparent);
  color: var(--pr, #8e24a9);
}
.ve-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}
.ve-logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 17px;
  color: #fff;
  background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 55%, #ff6d4d));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--pr, #8e24a9) 35%, transparent);
}
.ve-logo-title {
  font-size: 20px;
  font-weight: 800;
  color: #1c1e27;
  letter-spacing: -0.02em;
}
.ve-badge {
  width: 62px;
  height: 62px;
  margin: 4px auto 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--pr, #8e24a9);
  background: color-mix(in srgb, var(--pr, #8e24a9) 12%, #fff);
}
.ve-title {
  font-size: 20px;
  font-weight: 800;
  color: #1c1e27;
  margin: 0 0 8px;
}
.ve-text {
  font-size: 14.5px;
  color: #565b68;
  margin: 0 0 2px;
  line-height: 1.5;
}
.ve-email {
  font-size: 15px;
  font-weight: 700;
  color: #1c1e27;
  margin: 0 0 10px;
  word-break: break-all;
}
.ve-hint {
  font-size: 13px;
  color: #8a90a0;
  margin: 0 0 18px;
  line-height: 1.5;
}
.ve-notice {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pr, #8e24a9);
  background: color-mix(in srgb, var(--pr, #8e24a9) 10%, #fff);
  border-radius: 12px;
  padding: 9px 12px;
  margin: 0 0 14px;
}
.ve-notice.warn {
  color: #b4560a;
  background: #fff3e6;
}
.ve-btn {
  width: 100%;
  border: none;
  border-radius: 13px;
  padding: 13px 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 10px;
  transition: transform 0.06s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.ve-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.ve-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--pr, #8e24a9), color-mix(in srgb, var(--pr, #8e24a9) 60%, #ff6d4d));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--pr, #8e24a9) 32%, transparent);
}
.ve-btn.primary:not(:disabled):active {
  transform: translateY(1px);
}
.ve-btn.ghost {
  color: var(--pr, #8e24a9);
  background: color-mix(in srgb, var(--pr, #8e24a9) 10%, #fff);
}
.ve-link {
  border: none;
  background: transparent;
  color: #8a90a0;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  padding: 6px;
}
.ve-link:hover {
  color: #565b68;
}
</style>
