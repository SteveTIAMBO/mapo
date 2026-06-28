<template>
  <div class="miapo-page">
    <div class="miapo-bg"></div>

    <div class="miapo-inner">
      <!-- Logo + intro -->
      <header class="miapo-head">
        <div class="miapo-logo">
          <div class="miapo-logo-mark">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z" />
            </svg>
          </div>
          <div>
            <div class="miapo-logo-title">MIAPO<span class="plus">+</span></div>
            <div class="miapo-logo-sub">par EDUFREM</div>
          </div>
        </div>
        <h1 class="miapo-title">Le tuteur intelligent qui accompagne chaque enfant</h1>
        <p class="miapo-subtitle">
          Révisions, suivi et orientation par l'IA — à la maison comme à l'école.
        </p>
      </header>

      <!-- Choix du profil -->
      <div class="miapo-choices">
        <!-- Parent -->
        <button class="m-card" type="button" @click="entrer('parent')">
          <span class="m-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="8" r="3" />
              <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <circle cx="17.5" cy="9.5" r="2.3" />
              <path d="M16 20c0-2.6 1.4-4.9 3.6-6" />
            </svg>
          </span>
          <span class="m-name">Je suis un parent</span>
          <span class="m-tagline">Espace famille</span>
          <span class="m-context">
            Suivez la scolarité de votre enfant — notes, présences, devoirs — et
            activez son tuteur intelligent pour l'aider à progresser.
          </span>
          <span class="m-cta">
            Entrer dans l'espace parent
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>

        <!-- Enfant / élève -->
        <button class="m-card" type="button" @click="entrer('eleve')">
          <span class="m-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10L12 5 2 10l10 5 10-5z" />
              <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              <path d="M22 10v6" />
            </svg>
          </span>
          <span class="m-name">Je suis un élève</span>
          <span class="m-tagline">Espace élève</span>
          <span class="m-context">
            Révise avec ton tuteur intelligent, fais des quiz adaptés à ton niveau
            et garde le fil de tes cours, à ton rythme.
          </span>
          <span class="m-cta">
            Entrer dans l'espace élève
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>

      <!-- Compte en ligne -->
      <div class="miapo-account">
        <button type="button" class="miapo-login-link" @click="goLogin">
          J'ai déjà un compte MIAPO+
        </button>
      </div>

      <!-- Footer -->
      <footer class="miapo-footer">
        <p class="miapo-footer-org">EDUFREM SAS</p>
        <p class="miapo-footer-copy">&copy; 2026 MIAPO+ — Apprendre, accompagné</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEditionStore } from '../stores/edition'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'

const router = useRouter()
const editionStore = useEditionStore()
const authStore = useAuthStore()
const miapoStore = useEnfantsAutonomesStore()

// Les deux entrées ouvrent l'APPLI MIAPO+ (le tuteur qu'on a construit), pas
// les espaces parent/élève standards de MAPO : compte démo B2C 'miapo' (confiné
// à MIAPO+ par le guard), en réglant juste le point de vue —
//   parent   : un parent qui suit son enfant (« Mes enfants »)
//   apprenant : l'élève qui pilote son propre apprentissage (« Mon profil »).
function entrer(profil) {
  editionStore.setEdition('secondaire')
  const result = authStore.loginDemo('miapo', 'demo1234')
  if (result && result.success) {
    miapoStore.setMode(profil === 'parent' ? 'parent' : 'apprenant')
    router.push('/parent/miapo')
  } else {
    router.push('/login')
  }
}

function goLogin() {
  editionStore.setEdition('secondaire')
  router.push('/login')
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

/* Fond dégradé MIAPO+ (violet profond) */
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
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
.m-card {
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
.m-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 32px 72px rgba(0, 0, 0, 0.4);
  border-color: rgba(var(--m-accent-rgb), 0.45);
}
.m-card:focus-visible {
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
.m-card:hover .m-cta {
  gap: 12px;
}

/* Compte en ligne */
.miapo-account {
  margin-top: 26px;
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
@media (max-width: 900px) {
  .miapo-choices {
    grid-template-columns: 1fr;
    gap: 18px;
    max-width: 460px;
  }
}
@media (max-width: 720px) {
  .miapo-title { font-size: 25px; }
  .miapo-subtitle { font-size: 15px; }
  .m-card { padding: 26px 24px; }
}
</style>
