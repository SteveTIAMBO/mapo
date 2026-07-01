<template>
  <div class="welcome-page">
    <!-- Gradient background (ARIS) -->
    <div class="welcome-bg"></div>

    <div class="welcome-inner">
      <!-- Logo + intro -->
      <header class="welcome-head">
        <div class="welcome-logo">
          <div class="welcome-logo-mark">M</div>
          <div>
            <div class="welcome-logo-title">MAPO</div>
            <div class="welcome-logo-sub">by EDUFREM</div>
          </div>
        </div>
        <h1 class="welcome-title">{{ t('wv.title') }}</h1>
        <p class="welcome-subtitle">
          {{ t('wv.subtitle') }}
        </p>
      </header>

      <!-- Choice cards -->
      <div class="welcome-choices">
        <!-- Primaire -->
        <button class="choice-card" type="button" @click="choisir('primaire')">
          <span class="choice-badge">{{ t('wv.new') }}</span>
          <span class="choice-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 7c-1.5-1.2-3.6-2-6-2-1 0-2 .1-3 .4v13c1-.3 2-.4 3-.4 2.4 0 4.5.8 6 2 1.5-1.2 3.6-2 6-2 1 0 2 .1 3 .4v-13c-1-.3-2-.4-3-.4-2.4 0-4.5.8-6 2z" />
              <path d="M12 7v13" />
            </svg>
          </span>
          <span class="choice-name">{{ t('wv.primary') }}</span>
          <span class="choice-tagline">{{ t('wv.primaryTag') }}</span>
          <span class="choice-context">
            {{ t('wv.primaryContext') }}
          </span>
          <span class="choice-cta">
            {{ t('wv.discover') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

        <!-- Secondaire -->
        <button class="choice-card" type="button" @click="choisir('secondaire')">
          <span class="choice-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V8l7-4 7 4v13" />
              <path d="M9 21v-5h6v5" />
              <path d="M9 11h.01M15 11h.01" />
            </svg>
          </span>
          <span class="choice-name">{{ t('wv.secondary') }}</span>
          <span class="choice-tagline">{{ t('wv.secondaryTag') }}</span>
          <span class="choice-context">
            {{ t('wv.secondaryContext') }}
          </span>
          <span class="choice-cta">
            {{ t('wv.discover') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

        <!-- Enseignement Supérieur -->
        <button class="choice-card" type="button" @click="choisir('superieur')">
          <span class="choice-badge">{{ t('wv.new') }}</span>
          <span class="choice-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10L12 5 2 10l10 5 10-5z" />
              <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              <path d="M22 10v6" />
            </svg>
          </span>
          <span class="choice-name">{{ t('wv.higher') }}</span>
          <span class="choice-tagline">{{ t('wv.higherTag') }}</span>
          <span class="choice-context">
            {{ t('wv.higherContext') }}
          </span>
          <span class="choice-cta">
            {{ t('wv.discover') }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

      </div>

      <!-- Accès complexe scolaire (groupe multi-écoles) -->
      <div class="welcome-complexe">
        <button type="button" class="welcome-complexe-link" @click="router.push('/complexe')">{{ t('wv.complexeLink') }}</button>
      </div>

      <!-- Footer -->
      <footer class="welcome-footer">
        <p class="welcome-footer-org">EDUFREM SAS</p>
        <p class="welcome-footer-copy">{{ t('wv.copy') }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useEditionStore } from '../stores/edition'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const editionStore = useEditionStore()

function choisir(edition) {
  editionStore.setEdition(edition)
  if (edition === 'superieur') {
    router.push('/superieur')
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
/* ── Page ── */
.welcome-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  overflow: hidden;
}

/* ── Gradient background (ARIS-exact) ── */
.welcome-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(145deg,
    rgb(3, 8, 20) 0%,
    rgb(6, 18, 42) 35%,
    rgb(14, 56, 126) 70%,
    rgb(21, 88, 176) 100%
  );
}

.welcome-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1040px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Header ── */
.welcome-head {
  text-align: center;
  margin-bottom: 40px;
}
.welcome-logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.welcome-logo-mark {
  width: 52px;
  height: 52px;
  background: var(--pr);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(var(--pr-rgb), 0.45);
}
.welcome-logo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  text-align: left;
}
.welcome-logo-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
  text-align: left;
}
.welcome-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 10px;
}
.welcome-subtitle {
  font-family: 'Outfit', sans-serif;
  font-size: 16.5px;
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
}

/* ── Choice cards ── */
.welcome-choices {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}
.choice-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 32px 30px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  font-family: 'Outfit', sans-serif;
}
.choice-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 32px 72px rgba(0, 0, 0, 0.34);
  border-color: rgba(var(--pr-rgb), 0.4);
}
.choice-card:focus-visible {
  outline: 3px solid rgba(var(--pr-rgb), 0.45);
  outline-offset: 3px;
}

.choice-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 4px 11px;
  background: var(--gold, #B8892A);
  color: #fff;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.choice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 17px;
  background: rgba(var(--pr-rgb), 0.1);
  color: var(--pr);
  margin-bottom: 20px;
}

.choice-name {
  font-family: 'Poppins', sans-serif;
  font-size: 21px;
  font-weight: 700;
  color: #1A1D1F;
  line-height: 1.25;
}
.choice-tagline {
  font-size: 15px;
  font-weight: 600;
  color: var(--pr);
  margin-top: 6px;
}
.choice-context {
  font-size: 14.5px;
  color: #6F767E;
  margin-top: 12px;
  line-height: 1.55;
  flex: 1;
}
.choice-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  font-family: 'Poppins', sans-serif;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pr);
  transition: gap 0.2s ease;
}
.choice-card:hover .choice-cta {
  gap: 12px;
}

/* ── Accès complexe scolaire ── */
.welcome-complexe {
  text-align: center;
  margin-top: 30px;
}
.welcome-complexe-link {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 18px;
  border-radius: 22px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.welcome-complexe-link:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.32);
}

/* ── Footer ── */
.welcome-footer {
  text-align: center;
  margin-top: 40px;
}
.welcome-footer-org {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}
.welcome-footer-copy {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.35);
  margin: 4px 0 0;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .welcome-choices {
    grid-template-columns: 1fr;
    gap: 18px;
    max-width: 460px;
    margin: 0 auto;
  }
  .choice-card {
    min-height: auto;
  }
}
@media (max-width: 720px) {
  .welcome-title {
    font-size: 26px;
  }
  .welcome-subtitle {
    font-size: 15px;
  }
  .choice-card {
    padding: 26px 24px;
  }
}
</style>
