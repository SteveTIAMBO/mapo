<template>
  <div class="miapo-page">
    <div class="miapo-bg"></div>

    <div class="miapo-inner">
      <!-- Sélecteur de langue -->
      <div class="miapo-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <!-- Logo + intro -->
      <header class="miapo-head">
        <div class="miapo-logo">
          <div class="miapo-logo-mark">
            <LogoMapoPlus :size="28" />
          </div>
          <div>
            <div class="miapo-logo-title">MIAPO<span class="plus">+</span></div>
            <div class="miapo-logo-sub">{{ t('common.byEdufrem') }}</div>
          </div>
        </div>
        <h1 class="miapo-title">{{ t('welcome.title') }}</h1>
        <p class="miapo-subtitle">{{ t('welcome.subtitle') }}</p>
      </header>

      <!-- Choix du profil -->
      <div class="miapo-choices">
        <!-- Parent -->
        <button class="m-tile" type="button" @click="entrer('parent')">
          <span class="m-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="8" r="3" />
              <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <circle cx="17.5" cy="9.5" r="2.3" />
              <path d="M16 20c0-2.6 1.4-4.9 3.6-6" />
            </svg>
          </span>
          <span class="m-name">{{ t('welcome.parentName') }}</span>
          <span class="m-tagline">{{ t('welcome.parentTag') }}</span>
          <span class="m-context">{{ t('welcome.parentText') }}</span>
          <span class="m-cta">
            {{ t('welcome.parentCta') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

        <!-- Enfant / élève -->
        <button class="m-tile" type="button" @click="entrer('eleve')">
          <span class="m-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10L12 5 2 10l10 5 10-5z" />
              <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              <path d="M22 10v6" />
            </svg>
          </span>
          <span class="m-name">{{ t('welcome.eleveName') }}</span>
          <span class="m-tagline">{{ t('welcome.eleveTag') }}</span>
          <span class="m-context">{{ t('welcome.eleveText') }}</span>
          <span class="m-cta">
            {{ t('welcome.eleveCta') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

        <!-- Apprenant adulte / formation pro & certifications (hors catalogue) -->
        <button class="m-tile" type="button" @click="entrer('pro')">
          <span class="m-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M2 13h20" />
            </svg>
          </span>
          <span class="m-name">{{ t('welcome.proName') }}</span>
          <span class="m-tagline">{{ t('welcome.proTag') }}</span>
          <span class="m-context">{{ t('welcome.proText') }}</span>
          <span class="m-cta">
            {{ t('welcome.proCta') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>

      <!-- Créer un compte (vraie instance persistante) / se connecter -->
      <div class="miapo-account">
        <p class="miapo-demo-hint">{{ t('welcome.demoHint') }}</p>
        <button type="button" class="miapo-create-btn" @click="goCreate">{{ t('welcome.createAccount') }}</button>
        <button type="button" class="miapo-login-link" @click="goLogin">{{ t('welcome.haveAccount') }}</button>
      </div>

      <!-- Footer -->
      <footer class="miapo-footer">
        <p class="miapo-footer-org">EDUFREM SAS</p>
        <p class="miapo-footer-copy">{{ t('welcome.footerCopy') }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useEditionStore } from '../stores/edition'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { setLang } from '../i18n'
import LogoMapoPlus from '../components/LogoMapoPlus.vue'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const editionStore = useEditionStore()
const authStore = useAuthStore()
const miapoStore = useEnfantsAutonomesStore()

// Les deux entrées ouvrent l'APPLI MAPO+ (le tuteur qu'on a construit), pas
// les espaces parent/élève standards de MAPO : compte démo B2C 'miapo' (confiné
// à MAPO+ par le guard), en réglant juste le point de vue —
//   parent   : un parent qui suit son enfant (« Mes enfants »)
//   apprenant : l'élève qui pilote son propre apprentissage (« Mon profil »).
// Trois portes d'entrée :
//   parent : un parent qui suit son enfant (« Mes enfants »)
//   eleve  : l'élève qui pilote son propre apprentissage (« Mon profil »)
//   pro    : l'adulte en formation (MBA, concours, certif…) — apprenant
//            hors-catalogue qui apprend à partir de son propre programme.
function entrer(profil) {
  editionStore.setEdition('secondaire')
  const result = authStore.loginDemo('miapo', 'demo1234')
  if (result && result.success) {
    miapoStore.setMode(profil === 'parent' ? 'parent' : 'apprenant')
    // Démo : on pose le persona correspondant (écolier vs apprenant adulte).
    miapoStore.seedDemoAs(profil === 'pro' ? 'pro' : 'ecolier')
    router.push('/parent/miapo')
  } else {
    router.push('/login')
  }
}

function goLogin() {
  editionStore.setEdition('secondaire')
  router.push('/login')
}

// Créer un VRAI compte (persistant, propre à chaque personne) : on ouvre la page
// de connexion directement en mode inscription (?signup=1). C'est le chemin à
// privilégier pour les utilisateurs à qui on partage MAPO+ (les cartes ci-dessus
// restent une démo commune, non persistante).
function goCreate() {
  editionStore.setEdition('secondaire')
  router.push({ path: '/login', query: { signup: '1' } })
}
</script>

<style scoped>
.miapo-page {
  --m-accent: #7c3aed;
  --m-accent-rgb: 124, 58, 237;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  overflow: hidden;
}

/* Fond dégradé MAPO+ (violet profond) */
.miapo-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg,
    #2a2550 0%,
    #3a3470 42%,
    #574e93 78%,
    #7468be 100%
  );
}

.miapo-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 980px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Sélecteur de langue */
.miapo-lang {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
}
.miapo-lang button {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  padding: 5px 13px;
  border-radius: 100px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.miapo-lang button.on {
  background: #fff;
  color: var(--m-accent);
}

/* Header */
.miapo-head {
  text-align: center;
  margin-bottom: 38px;
}
.miapo-logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}
.miapo-logo-mark {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5);
}
.miapo-logo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  text-align: left;
  letter-spacing: 0.01em;
}
.miapo-logo-title .plus {
  color: #c4b5fd;
}
.miapo-logo-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
  margin-top: 4px;
  text-align: left;
}
.miapo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 12px;
  line-height: 1.2;
  max-width: 680px;
}
.miapo-subtitle {
  font-family: 'Outfit', sans-serif;
  font-size: 16.5px;
  color: rgba(255, 255, 255, 0.74);
  margin: 0 auto;
  max-width: 540px;
}

/* Cartes de choix */
.miapo-choices {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 940px;
  margin: 0 auto;
}
.m-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 32px 30px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 22px;
  box-shadow: 0 20px 48px rgba(20, 16, 50, 0.28);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  font-family: 'Outfit', sans-serif;
}
.m-tile:hover {
  transform: translateY(-6px);
  box-shadow: 0 32px 72px rgba(0, 0, 0, 0.4);
  border-color: rgba(var(--m-accent-rgb), 0.45);
}
.m-tile:focus-visible {
  outline: 3px solid rgba(var(--m-accent-rgb), 0.5);
  outline-offset: 3px;
}
.m-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 17px;
  background: rgba(var(--m-accent-rgb), 0.12);
  color: var(--m-accent);
  margin-bottom: 20px;
}
.m-name {
  font-family: 'Poppins', sans-serif;
  font-size: 21px;
  font-weight: 700;
  color: #1A1D1F;
  line-height: 1.25;
}
.m-tagline {
  font-size: 15px;
  font-weight: 600;
  color: var(--m-accent);
  margin-top: 6px;
}
.m-context {
  font-size: 14.5px;
  color: #6F767E;
  margin-top: 12px;
  line-height: 1.55;
  flex: 1;
}
.m-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  font-family: 'Poppins', sans-serif;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--m-accent);
  transition: gap 0.2s ease;
}
.m-tile:hover .m-cta {
  gap: 12px;
}

/* Créer un compte / se connecter */
.miapo-account {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.miapo-demo-hint {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
  max-width: 540px;
  text-align: center;
  margin: 0 0 2px;
  line-height: 1.5;
}
.miapo-create-btn {
  background: #fff;
  border: none;
  color: var(--m-accent);
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 700;
  padding: 13px 30px;
  border-radius: 100px;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(20, 16, 50, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.miapo-create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.36);
}
.miapo-login-link {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 22px;
  border-radius: 100px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.miapo-login-link:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Footer */
.miapo-footer {
  text-align: center;
  margin-top: 36px;
}
.miapo-footer-org {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}
.miapo-footer-copy {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.36);
  margin: 4px 0 0;
}

/* Responsive */
@media (max-width: 940px) {
  .miapo-choices {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    max-width: 620px;
  }
}
@media (max-width: 620px) {
  .miapo-choices {
    grid-template-columns: 1fr;
    max-width: 420px;
  }
}
@media (max-width: 720px) {
  .miapo-title { font-size: 25px; }
  .miapo-subtitle { font-size: 15px; }
  .m-tile { padding: 26px 24px; }
}
</style>
