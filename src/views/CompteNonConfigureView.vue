<template>
  <div class="cnc-page">
    <div class="cnc-bg"></div>

    <div class="cnc-card">
      <div class="cnc-icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>

      <h1 class="cnc-title">Compte non configuré</h1>

      <p class="cnc-text">
        Votre connexion a bien fonctionné, mais ce compte
        <strong>{{ email }}</strong> n'est rattaché à aucun établissement.
      </p>
      <p class="cnc-text">
        Pour accéder à MAPO, votre établissement doit d'abord vous inviter.
        Contactez l'administrateur de votre école — ou EDUFREM si vous êtes
        le directeur — afin qu'une invitation soit créée pour cette adresse.
      </p>

      <div class="cnc-contact">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6"/></svg>
        contact@edufrem.com
      </div>

      <button class="cnc-btn" type="button" @click="seDeconnecter">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        Se déconnecter
      </button>
    </div>

    <div class="cnc-footer">
      <p>EDUFREM SAS</p>
      <p>&copy; 2026 MAPO</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = computed(() => authStore.user?.email || 'inconnu')

async function seDeconnecter() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.cnc-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
}
.cnc-bg {
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
.cnc-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 460px;
  padding: 38px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  text-align: center;
  font-family: 'Outfit', sans-serif;
}
.cnc-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 17px;
  background: rgba(232, 149, 10, 0.12);
  color: #E8950A;
  margin-bottom: 18px;
}
.cnc-title {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1A1D1F;
  margin: 0 0 14px;
}
.cnc-text {
  font-size: 14.5px;
  color: #6F767E;
  line-height: 1.6;
  margin: 0 0 12px;
}
.cnc-text strong {
  color: #1A1D1F;
  font-weight: 700;
}
.cnc-contact {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 22px;
  padding: 9px 16px;
  background: rgba(var(--pr-rgb), 0.06);
  border: 1px solid rgba(var(--pr-rgb), 0.14);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pr);
}
.cnc-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  color: #6F767E;
  border: 1.5px solid #E0DED8;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cnc-btn:hover {
  border-color: var(--pr);
  color: var(--pr);
}
.cnc-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-top: 24px;
}
.cnc-footer p {
  margin: 2px 0;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 480px) {
  .cnc-card {
    padding: 28px 24px;
  }
}
</style>
