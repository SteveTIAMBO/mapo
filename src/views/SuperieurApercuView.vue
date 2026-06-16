<template>
  <div class="sup-page">
    <div class="sup-bg"></div>

    <div class="sup-inner">
      <!-- Retour -->
      <button class="sup-back" type="button" @click="retour">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
        Retour au choix
      </button>

      <div class="sup-card">
        <!-- En-tête -->
        <div class="sup-head">
          <div class="sup-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10L12 5 2 10l10 5 10-5z" />
              <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              <path d="M22 10v6" />
            </svg>
          </div>
          <div>
            <div class="sup-eyebrow">MAPO — Enseignement Supérieur</div>
            <h1 class="sup-title">La version supérieur arrive bientôt</h1>
          </div>
        </div>

        <p class="sup-lead">
          Cette édition de MAPO s'adresse aux universités, écoles supérieures et BTS.
          Elle est conçue pour être compatible avec l'enseignement supérieur français
          (crédits ECTS, unités d'enseignement, semestres) tout en restant adaptée au
          contexte africain. La démonstration interactive est en préparation.
        </p>

        <!-- Modules à venir -->
        <div class="sup-section-label">Ce que couvrira cette version</div>
        <div class="sup-modules">
          <div v-for="m in modules" :key="m.title" class="sup-module">
            <span class="sup-module-icon" v-html="m.icon"></span>
            <div>
              <div class="sup-module-title">{{ m.title }}</div>
              <div class="sup-module-desc">{{ m.desc }}</div>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div class="sup-note">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <span>
            En attendant, la version <strong>Secondaire &amp; Primaire</strong> est entièrement
            disponible en démonstration.
          </span>
        </div>

        <!-- Actions -->
        <div class="sup-actions">
          <button class="sup-btn-primary" type="button" @click="allerSecondaire">
            Découvrir la version Secondaire &amp; Primaire
          </button>
          <button class="sup-btn-ghost" type="button" @click="retour">
            Revenir au choix
          </button>
        </div>
      </div>

      <footer class="sup-footer">
        <p class="sup-footer-org">EDUFREM SAS</p>
        <p class="sup-footer-copy">&copy; 2026 MAPO</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEditionStore } from '../stores/edition'

const router = useRouter()
const editionStore = useEditionStore()

const modules = [
  {
    title: 'Gestion des étudiants',
    desc: 'Dossiers, inscriptions administratives, parcours et statuts.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    title: 'UE & crédits ECTS',
    desc: "Unités d'enseignement, coefficients, capitalisation et compensation.",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  },
  {
    title: 'Inscriptions pédagogiques',
    desc: "Choix des cours et options par l'étudiant, prérequis et parcours.",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
  {
    title: 'Emploi du temps & salles',
    desc: 'Planification par cours, par groupe et par intervenant, sans conflit.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  },
  {
    title: 'Intervenants & vacataires',
    desc: 'Statuts, coûts horaires, plans de charge et suivi des interventions.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
  },
  {
    title: 'Relevés de notes & jurys',
    desc: 'Évaluations par semestre, délibérations et diplomation.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  },
]

function retour() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}

function allerSecondaire() {
  editionStore.setEdition('secondaire')
  router.push('/login')
}
</script>

<style scoped>
.sup-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  overflow: hidden;
}
.sup-bg {
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
.sup-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Back ── */
.sup-back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 16px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  transition: all 0.15s ease;
}
.sup-back:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

/* ── Card ── */
.sup-card {
  width: 100%;
  padding: 38px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-family: 'Outfit', sans-serif;
}

/* ── Head ── */
.sup-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}
.sup-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: rgba(var(--pr-rgb), 0.1);
  color: var(--pr);
  flex-shrink: 0;
}
.sup-eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pr);
  margin-bottom: 4px;
}
.sup-title {
  font-family: 'Poppins', sans-serif;
  font-size: 23px;
  font-weight: 800;
  color: #1A1D1F;
  line-height: 1.25;
}

.sup-lead {
  font-size: 15px;
  color: #6F767E;
  line-height: 1.6;
  margin: 0 0 26px;
}

/* ── Section label ── */
.sup-section-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9A9FA5;
  margin-bottom: 14px;
}

/* ── Modules ── */
.sup-modules {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 26px;
}
.sup-module {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: rgba(var(--pr-rgb), 0.045);
  border: 1px solid rgba(var(--pr-rgb), 0.1);
  border-radius: 14px;
}
.sup-module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  color: var(--pr);
  flex-shrink: 0;
}
.sup-module-title {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1A1D1F;
}
.sup-module-desc {
  font-size: 13px;
  color: #6F767E;
  line-height: 1.45;
  margin-top: 3px;
}

/* ── Note ── */
.sup-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(184, 137, 42, 0.08);
  border: 1px solid rgba(184, 137, 42, 0.22);
  border-radius: 12px;
  font-size: 14px;
  color: #6F767E;
  line-height: 1.5;
  margin-bottom: 26px;
}
.sup-note svg {
  color: var(--gold, #B8892A);
  flex-shrink: 0;
  margin-top: 1px;
}
.sup-note strong {
  color: #1A1D1F;
  font-weight: 700;
}

/* ── Actions ── */
.sup-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sup-btn-primary {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}
.sup-btn-primary:hover {
  background: #0E3F7E;
}
.sup-btn-ghost {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #6F767E;
  border: 1.5px solid var(--input-border, #E0DED8);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.sup-btn-ghost:hover {
  border-color: var(--pr);
  color: var(--pr);
}

/* ── Footer ── */
.sup-footer {
  text-align: center;
  margin-top: 28px;
}
.sup-footer-org {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}
.sup-footer-copy {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin: 3px 0 0;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .sup-card {
    padding: 28px 22px;
  }
  .sup-head {
    gap: 14px;
  }
  .sup-icon {
    width: 52px;
    height: 52px;
  }
  .sup-title {
    font-size: 20px;
  }
  .sup-modules {
    grid-template-columns: 1fr;
  }
}
</style>
