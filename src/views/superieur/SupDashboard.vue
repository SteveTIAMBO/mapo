<template>
  <div class="sd">
    <div class="sd-intro">
      <div>
        <h1 class="sd-h1">{{ t('sup.dash.title') }}</h1>
        <p class="sd-sub">{{ t('sup.dash.subtitle', { year: store.ecole.anneeAcademique }) }}</p>
      </div>
    </div>

    <!-- Indicateurs clés (cartes cliquables) -->
    <div class="sd-kpis">
      <button v-for="k in kpis" :key="k.label" type="button" class="sd-kpi" :class="'tone-' + k.tone" @click="goTab(k.tab)">
        <div class="sd-kpi-ic"><component :is="k.icon" :size="20" /></div>
        <div class="sd-kpi-body">
          <div class="sd-kpi-value">{{ k.value }}<span v-if="k.unit" class="sd-kpi-unit">{{ k.unit }}</span></div>
          <div class="sd-kpi-label">{{ k.label }}</div>
          <div class="sd-kpi-foot" :class="k.footClass">{{ k.foot }}</div>
        </div>
        <ChevronRight class="sd-kpi-arrow" :size="17" />
      </button>
    </div>

    <!-- Analyse MIAPO (masquée si désactivée dans Paramètres → MIAPO) -->
    <section v-if="miapoGlobal.isEnabled('dashboard')" class="sd-miapo">
      <div class="sd-miapo-head">
        <div class="sd-miapo-badge"><Sparkles :size="15" /> MIAPO</div>
        <div>
          <h2 class="sd-miapo-title">{{ t('sup.dash.miapoTitle') }}</h2>
          <p class="sd-miapo-sub">{{ t('sup.dash.miapoSub') }}</p>
        </div>
      </div>
      <div class="sd-miapo-grid">
        <button v-for="i in miapoInsights" :key="i.label" type="button" class="sd-miapo-item" :class="i.tone" @click="goTab(i.tab)">
          <div class="sd-miapo-ic"><component :is="i.icon" :size="18" /></div>
          <div class="sd-miapo-txt">
            <div class="sd-miapo-val">{{ i.value }}</div>
            <div class="sd-miapo-lab">{{ i.label }}</div>
          </div>
          <ArrowRight :size="15" class="sd-miapo-arrow" />
        </button>
      </div>
    </section>

    <!-- Actions rapides -->
    <section class="sd-card sd-actions">
      <h2 class="sd-h2">{{ t('sup.dash.quickActions') }}</h2>
      <div class="sd-actions-grid">
        <button v-for="a in actions" :key="a.label" type="button" class="sd-action" @click="goTab(a.tab)">
          <div class="sd-action-ic"><component :is="a.icon" :size="19" /></div>
          <span>{{ a.label }}</span>
        </button>
      </div>
    </section>

    <div class="sd-grid">
      <!-- Répartition par programme -->
      <section class="sd-card">
        <div class="sd-card-h">
          <h2 class="sd-h2">{{ t('sup.dash.headcountByProgram') }}</h2>
          <button type="button" class="sd-more" @click="goTab('etudiants')">{{ t('sup.dash.seeStudents') }}</button>
        </div>
        <div class="sd-prog-list">
          <div v-for="p in s.parProgramme" :key="p.id" class="sd-prog">
            <div class="sd-prog-head">
              <div>
                <span class="sd-prog-niveau" :class="`n-${p.niveau.toLowerCase()}`">{{ p.niveau }}</span>
                <span class="sd-prog-nom">{{ p.nom }}</span>
              </div>
              <span class="sd-prog-eff">{{ p.effectif }}</span>
            </div>
            <div class="sd-prog-track">
              <div class="sd-prog-fill" :style="{ width: barWidth(p.effectif) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="isDemoTenant" class="sd-demo-note">
      {{ t('sup.dash.demoNote') }}
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import { useSuperieurMiapoStore } from '../../stores/superieurMiapo'
import { useFinanceStore } from '../../stores/finance'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import {
  Users, GraduationCap, Award, TrendingUp, Wallet, Presentation,
  Sparkles, ArrowRight, ChevronRight, AlertTriangle, PiggyBank,
  UserPlus, FileText, CreditCard, ClipboardList, CalendarDays, BellRing,
} from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })

const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

const store = useSuperieurStore()
const miapoGlobal = useSuperieurMiapoStore()
const s = computed(() => store.stats)

const financeStore = useFinanceStore()
const fin = computed(() => financeStore.stats || {})

// Navigation vers un onglet (fournie par SuperieurView).
const goTab = inject('supGoTab', () => {})

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
const fmtFcfa = (n) => `${fmt(Math.round(n || 0))} FCFA`

// ── Cartes KPI cliquables ─────────────────────────────────────────────
const kpis = computed(() => [
  {
    label: t('sup.dash.kpiEtudiants'), tone: 'blue', icon: Users, tab: 'etudiants',
    value: fmt(s.value.nbEtudiants), foot: t('sup.dash.kpiBoursiers', { n: s.value.boursiers }),
  },
  {
    label: t('sup.dash.kpiProgrammes'), tone: 'violet', icon: GraduationCap, tab: 'formation',
    value: s.value.nbProgrammes, foot: t('sup.dash.kpiPromotions', { n: s.value.nbPromotions }),
  },
  {
    label: t('sup.dash.kpiMoyenne'), tone: 'gold', icon: Award, tab: 'notes',
    value: s.value.moyenneGenerale, unit: '/20',
    foot: t('sup.dash.kpiEnDifficulte', { n: s.value.enDifficulte }),
    footClass: s.value.enDifficulte > 0 ? 'is-warn' : 'is-ok',
  },
  {
    label: t('sup.dash.kpiCredits'), tone: 'teal', icon: TrendingUp, tab: 'notes',
    value: s.value.tauxProgressionEcts, unit: '%', foot: t('sup.dash.kpiProgressionMoyenne'),
  },
  {
    label: t('sup.dash.kpiRecouvrement'), tone: 'green', icon: Wallet, tab: 'finance_dash',
    value: fin.value.tauxRecouvrement ?? 0, unit: '%',
    foot: fin.value.montantEnRetard ? t('sup.dash.kpiEnRetard', { m: fmtFcfa(fin.value.montantEnRetard) }) : t('sup.dash.kpiAJour'),
    footClass: fin.value.montantEnRetard ? 'is-warn' : 'is-ok',
  },
  {
    label: t('sup.dash.kpiIntervenants'), tone: 'indigo', icon: Presentation, tab: 'intervenants',
    value: s.value.nbIntervenants, foot: t('sup.dash.kpiVacataires', { n: s.value.vacataires }),
  },
])

// ── Analyse MIAPO (insights calculés) ─────────────────────────────────
const miapoInsights = computed(() => {
  const out = []
  const diff = s.value.enDifficulte
  out.push({
    label: diff > 0 ? t('sup.dash.miapoDiffLabel') : t('sup.dash.miapoNoDiffLabel'),
    value: diff > 0 ? `${diff}` : t('sup.dash.miapoOk'),
    icon: AlertTriangle, tab: 'etudiants', tone: diff > 0 ? 'warn' : 'ok',
  })
  const tr = fin.value.tauxRecouvrement ?? 0
  out.push({
    label: fin.value.nbEnRetard ? t('sup.dash.miapoRetardLabel', { m: fmtFcfa(fin.value.montantEnRetard) }) : t('sup.dash.miapoRecouvrementOk'),
    value: `${tr}%`,
    icon: PiggyBank, tab: 'finance_echeanciers', tone: tr < 80 ? 'warn' : 'ok',
  })
  out.push({
    label: t('sup.dash.miapoCreditsLabel'),
    value: `${s.value.tauxProgressionEcts}%`,
    icon: TrendingUp, tab: 'notes', tone: 'info',
  })
  return out
})

// ── Actions rapides ───────────────────────────────────────────────────
const actions = computed(() => [
  { label: t('sup.dash.actionInscrire'), icon: UserPlus, tab: 'etudiants' },
  { label: t('sup.dash.actionNotes'), icon: FileText, tab: 'notes' },
  { label: t('sup.dash.actionPaiement'), icon: CreditCard, tab: 'finance_paiements' },
  { label: t('sup.dash.actionEdt'), icon: CalendarDays, tab: 'edt' },
  { label: t('sup.dash.actionRelance'), icon: BellRing, tab: 'finance_echeanciers' },
])

const maxEffectif = computed(() => Math.max(...s.value.parProgramme.map((p) => p.effectif), 1))
function barWidth(effectif) {
  return Math.round((effectif / maxEffectif.value) * 100)
}
</script>

<style scoped>
.sd-intro {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.sd-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.sd-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}
.sd-group-badge {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: var(--pr);
  background: rgba(var(--pr-rgb), 0.1);
  border: 1px solid rgba(var(--pr-rgb), 0.2);
  border-radius: 100px;
  padding: 6px 14px;
  white-space: nowrap;
}

/* KPIs cliquables */
.sd-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.sd-kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 16px 18px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}
.sd-kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(20, 32, 64, 0.1);
  border-color: var(--accent);
}
.sd-kpi-ic {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  background: var(--accent-bg);
}
.sd-kpi-body { flex: 1; min-width: 0; }
.sd-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 25px;
  font-weight: 800;
  color: var(--tx);
  line-height: 1;
}
.sd-kpi-unit { font-size: 15px; font-weight: 700; color: var(--tx2); margin-left: 2px; }
.sd-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx);
  margin: 5px 0 2px;
}
.sd-kpi-foot { font-size: 12px; color: var(--tx3); }
.sd-kpi-foot.is-ok { color: var(--success); }
.sd-kpi-foot.is-warn { color: var(--warn); }
.sd-kpi-arrow { color: var(--tx3); flex-shrink: 0; opacity: 0; transition: opacity 0.12s ease; }
.sd-kpi:hover .sd-kpi-arrow { opacity: 1; }

/* Accent par carte */
.tone-blue { --accent: #2563EB; --accent-bg: rgba(37, 99, 235, 0.1); }
.tone-violet { --accent: #7C3AED; --accent-bg: rgba(124, 58, 237, 0.1); }
.tone-gold { --accent: #B7791F; --accent-bg: rgba(183, 121, 31, 0.12); }
.tone-teal { --accent: #0D9488; --accent-bg: rgba(13, 148, 136, 0.1); }
.tone-green { --accent: #128A5B; --accent-bg: rgba(18, 138, 91, 0.1); }
.tone-indigo { --accent: #4F46E5; --accent-bg: rgba(79, 70, 229, 0.1); }

/* Analyse MIAPO */
.sd-miapo {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  border-radius: var(--card-radius);
  padding: 20px 22px;
  margin-bottom: 18px;
  color: #fff;
}
.sd-miapo-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.sd-miapo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 100px;
  padding: 5px 13px;
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
  font-size: 12.5px;
  flex-shrink: 0;
}
.sd-miapo-title { font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 700; margin: 0; }
.sd-miapo-sub { font-size: 13px; margin: 2px 0 0; color: rgba(255, 255, 255, 0.85); }
.sd-miapo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.sd-miapo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  color: #fff;
  font-family: inherit;
  transition: background 0.12s ease;
}
.sd-miapo-item:hover { background: rgba(255, 255, 255, 0.2); }
.sd-miapo-ic {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
}
.sd-miapo-item.warn .sd-miapo-ic { background: rgba(255, 209, 102, 0.28); color: #FFE08A; }
.sd-miapo-txt { flex: 1; min-width: 0; }
.sd-miapo-val { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 800; line-height: 1; }
.sd-miapo-lab { font-size: 12px; color: rgba(255, 255, 255, 0.85); margin-top: 3px; line-height: 1.35; }
.sd-miapo-arrow { flex-shrink: 0; opacity: 0.7; }

/* Actions rapides */
.sd-actions { margin-bottom: 18px; }
.sd-actions-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.sd-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  text-align: center;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 16px 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx);
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}
.sd-action:hover { transform: translateY(-2px); border-color: var(--pr); background: rgba(var(--pr-rgb), 0.05); }
.sd-action-ic {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pr);
  background: rgba(var(--pr-rgb), 0.1);
}

/* Grid + cards */
.sd-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.sd-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 18px 20px;
}
.sd-card-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sd-more {
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--pr);
  padding: 0;
}
.sd-more:hover { text-decoration: underline; }

.sd-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--tx);
  margin: 0 0 14px;
}

/* Programmes */
.sd-prog-list { display: flex; flex-direction: column; gap: 16px; }
.sd-prog-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 7px; }
.sd-prog-niveau {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  margin-right: 8px;
}
.sd-prog-niveau.n-licence { background: var(--pr-light); color: var(--pr); }
.sd-prog-niveau.n-master { background: var(--gold-light); color: var(--gold); }
.sd-prog-niveau.n-bts { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
.sd-prog-niveau.n-doctorat { background: rgba(124, 58, 237, 0.12); color: #6D28D9; }
.sd-prog-nom { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; color: var(--tx); }
.sd-prog-eff { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 800; color: var(--tx); }
.sd-prog-track { height: 8px; background: var(--input-bg); border-radius: 100px; overflow: hidden; }
.sd-prog-fill { height: 100%; background: var(--pr); border-radius: 100px; }

/* Progression */
.sd-progress { display: flex; align-items: center; gap: 20px; }
.sd-progress-ring { flex-shrink: 0; }
.sd-ring-num { font-family: 'Poppins', sans-serif; font-size: 21px; font-weight: 800; fill: var(--tx); }
.sd-ring-cap { font-family: 'Poppins', sans-serif; font-size: 9px; font-weight: 600; fill: var(--tx3); text-transform: uppercase; letter-spacing: 0.04em; }
.sd-progress-text p { font-size: 14px; color: var(--tx2); line-height: 1.55; margin: 0 0 8px; }
.sd-progress-text strong { color: var(--tx); font-weight: 700; }
.sd-progress-note { font-size: 13px !important; color: var(--tx3) !important; }

/* Mobilité */
.sd-mob-card { margin-top: 16px; }
.sd-mob-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.sd-mob-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.sd-mob-kpi { background: rgba(var(--pr-rgb), 0.04); border: 1px solid rgba(var(--pr-rgb), 0.12); border-radius: 10px; padding: 12px 14px; text-align: center; }
.sd-mob-kpi.is-alert { background: rgba(178, 59, 59, 0.05); border-color: rgba(178, 59, 59, 0.28); }
.sd-mob-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: var(--tx); }
.sd-mob-kpi-lab { font-size: 11px; color: var(--tx2); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

/* Campus */
.sd-campus-card { margin-top: 18px; }
.sd-campus-sub { font-size: 13.5px; color: var(--tx2); margin: 2px 0 16px; }
.sd-campus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.sd-campus { border: 1px solid var(--card-border); border-radius: 14px; padding: 16px 18px; background: var(--input-bg); }
.sd-campus-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sd-campus-nom { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--tx); }
.sd-campus-siege { font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), 0.12); border-radius: 20px; padding: 2px 9px; }
.sd-campus-eff { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 30px; color: var(--tx); line-height: 1.05; }
.sd-campus-cap { font-size: 12px; color: var(--tx2); }
.sd-campus-dir { margin-top: 10px; font-size: 12.5px; color: var(--tx2); border-top: 1px solid var(--card-border); padding-top: 8px; }

.sd-demo-note { margin-top: 18px; text-align: center; font-size: 12px; color: var(--tx3); }

@media (max-width: 1100px) {
  .sd-kpis { grid-template-columns: repeat(2, 1fr); }
  .sd-miapo-grid { grid-template-columns: 1fr; }
  .sd-actions-grid { grid-template-columns: repeat(3, 1fr); }
  .sd-grid { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .sd-kpis { grid-template-columns: 1fr; }
  .sd-actions-grid { grid-template-columns: repeat(2, 1fr); }
  .sd-progress { flex-direction: column; text-align: center; }
  .sd-h1 { font-size: 22px; }
  .sd-card { padding: 14px 14px; }
}
</style>
