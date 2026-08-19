<template>
  <div class="cx-shell">
    <!-- Barre supérieure -->
    <header class="cx-top">
      <div class="cx-brand">
        <div class="cx-brand-ic"><Building2 :size="20" /></div>
        <div class="cx-brand-tx"><strong>{{ t('cx.appTitle') }}</strong><small>{{ t('cx.appSub') }}</small></div>
      </div>
      <div class="cx-top-right">
        <div class="cx-lang">
          <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
          <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <button type="button" class="cx-logout" @click="logout"><LogOut :size="16" /> <span>{{ t('cx.logout') }}</span></button>
      </div>
    </header>

    <main class="cx-main">
      <!-- En-tête du complexe -->
      <div class="cx-head">
        <div class="cx-head-tx">
          <h1>{{ identity.name }}</h1>
          <p class="cx-head-meta">
            <span v-if="identity.ville">{{ identity.ville }}<span v-if="identity.pays"> · {{ identity.pays }}</span></span>
            <span v-if="identity.directeur" class="cx-sep">·</span>
            <span v-if="identity.directeur">{{ t('cx.director') }} : {{ identity.directeur }}</span>
          </p>
        </div>
        <div class="cx-head-badge">{{ t('cx.nSchools', { n: totalSchools }) }}</div>
      </div>

      <div v-if="store.isDemo" class="cx-demo-note"><Info :size="15" /> <span>{{ t('cx.demoNote') }}</span></div>

      <!-- KPI consolidés -->
      <div class="cx-kpis">
        <div class="cx-tile">
          <div class="cx-tile-ic ic-blue"><Building :size="20" /></div>
          <div><div class="cx-tile-v">{{ totalSchools }}</div><div class="cx-tile-l">{{ t('cx.kpiSchools') }}</div></div>
        </div>
        <div class="cx-tile">
          <div class="cx-tile-ic ic-green"><Users :size="20" /></div>
          <div><div class="cx-tile-v">{{ totalEleves.toLocaleString(numLocale) }}</div><div class="cx-tile-l">{{ t('cx.kpiStudents') }}</div></div>
        </div>
        <div class="cx-tile">
          <div class="cx-tile-ic ic-violet"><GraduationCap :size="20" /></div>
          <div><div class="cx-tile-v">{{ totalPersonnel.toLocaleString(numLocale) }}</div><div class="cx-tile-l">{{ t('cx.kpiStaff') }}</div></div>
        </div>
        <div class="cx-tile">
          <div class="cx-tile-ic ic-amber"><Wallet :size="20" /></div>
          <div><div class="cx-tile-v">{{ formatMoney(totalRecettes) }}</div><div class="cx-tile-l">{{ t('cx.kpiRevenue') }}</div></div>
        </div>
      </div>

      <!-- Répartition des effectifs par école -->
      <div class="cx-panel">
        <div class="cx-panel-head"><BarChart3 :size="18" /><h3>{{ t('cx.studentsPerSchool') }}</h3></div>
        <div class="cx-bars">
          <div v-for="s in store.schools" :key="s.id" class="cx-bar-row">
            <span class="cx-bar-name">{{ s.name }}</span>
            <div class="cx-bar-track">
              <div class="cx-bar-fill" :class="'ty-' + s.type" :style="{ width: barW(s.eleves) }"></div>
            </div>
            <span class="cx-bar-val">{{ s.eleves.toLocaleString(numLocale) }}</span>
          </div>
        </div>
      </div>

      <!-- Écoles du complexe -->
      <div class="cx-panel-head cx-schools-head"><Building2 :size="18" /><h3>{{ t('cx.mySchools') }}</h3></div>
      <div class="cx-schools">
        <div v-for="s in store.schools" :key="s.id" class="cx-school">
          <div class="cx-school-top">
            <span class="cx-badge" :class="'ty-' + s.type">{{ t('cx.types.' + s.type) }}</span>
            <span class="cx-top-right-min">
              <span class="cx-edition">{{ t('cx.editions.' + s.edition) }}</span>
              <span class="cx-lang-chip" :title="t('cx.defaultLang')">{{ (s.lang || 'fr').toUpperCase() }}</span>
            </span>
          </div>
          <h4 class="cx-school-name">{{ s.name }}</h4>
          <div v-if="s.directeur" class="cx-school-dir"><UserRound :size="14" /> {{ s.directeur }}</div>
          <div class="cx-school-stats">
            <div><span class="cx-ss-v">{{ s.eleves.toLocaleString(numLocale) }}</span><span class="cx-ss-l">{{ t('cx.kpiStudents') }}</span></div>
            <div><span class="cx-ss-v">{{ s.personnel.toLocaleString(numLocale) }}</span><span class="cx-ss-l">{{ t('cx.kpiStaff') }}</span></div>
          </div>
          <button class="cx-open" type="button" @click="store.openSchool(s)"><ExternalLink :size="15" /> <span>{{ t('cx.openSchool') }}</span></button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { setLang } from '../i18n'
import { useComplexeStore } from '../stores/complexe'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { fmtMontant } from '../utils/monnaie'
import { Building2, Building, Users, GraduationCap, Wallet, BarChart3, ExternalLink, UserRound, LogOut, Info } from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const store = useComplexeStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()

const { identity, totalSchools, totalEleves, totalPersonnel, totalRecettes } = storeRefs()
function storeRefs() {
  return {
    identity: computed(() => store.identity),
    totalSchools: computed(() => store.totalSchools),
    totalEleves: computed(() => store.totalEleves),
    totalPersonnel: computed(() => store.totalPersonnel),
    totalRecettes: computed(() => store.totalRecettes),
  }
}

const numLocale = computed(() => (locale.value === 'en' ? 'en-GB' : 'fr-FR'))
function formatMoney(n) { return fmtMontant(n, schoolStore.schoolSettings?.currency) }
function barW(n) { return Math.round(((n || 0) / store.maxEleves) * 100) + '%' }

async function logout() { await authStore.logout(); router.push('/bienvenue') }

onMounted(() => { store.load() })
</script>

<style scoped>
.cx-shell { min-height: 100vh; background: linear-gradient(165deg, #f4f6fb 0%, #eceef6 100%); }

.cx-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 26px; background: rgba(255,255,255,.75); backdrop-filter: blur(14px); border-bottom: 1px solid #e5e8f0; position: sticky; top: 0; z-index: 10; }
.cx-brand { display: flex; align-items: center; gap: 11px; }
.cx-brand-ic { width: 40px; height: 40px; border-radius: 11px; background: linear-gradient(135deg, #1558B0, #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; }
.cx-brand-tx { display: flex; flex-direction: column; line-height: 1.2; }
.cx-brand-tx strong { font-family: 'Poppins', sans-serif; font-size: 16px; color: #1A1D1F; }
.cx-brand-tx small { font-size: 11.5px; color: #8a90a0; }
.cx-top-right { display: flex; align-items: center; gap: 12px; }
.cx-lang { display: flex; gap: 2px; background: #eef1f5; border-radius: 9px; padding: 3px; }
.cx-lang button { border: none; background: none; padding: 5px 10px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: #6b7280; cursor: pointer; }
.cx-lang button.on { background: #fff; color: #1558B0; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.cx-logout { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #e0e3ec; background: #fff; color: #4b5563; padding: 7px 13px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; }
.cx-logout:hover { border-color: #D93025; color: #D93025; }

.cx-main { max-width: 1080px; margin: 0 auto; padding: 26px 24px 48px; }

.cx-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.cx-head-tx h1 { font-family: 'Poppins', sans-serif; font-size: 25px; font-weight: 700; color: #1A1D1F; margin: 0 0 5px; }
.cx-head-meta { font-size: 13.5px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 7px; margin: 0; }
.cx-sep { color: #cbd2e0; }
.cx-head-badge { flex-shrink: 0; background: rgba(21,88,176,.10); color: #1558B0; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 20px; }

.cx-demo-note { display: flex; align-items: center; gap: 8px; background: rgba(214,158,46,.10); color: #8a6100; border: 1px solid rgba(214,158,46,.25); border-radius: 11px; padding: 9px 14px; font-size: 13px; margin-bottom: 18px; }

.cx-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.cx-tile { background: #fff; border: 1px solid #e6e9f0; border-radius: 15px; padding: 16px; display: flex; align-items: center; gap: 13px; box-shadow: 0 1px 3px rgba(20,40,90,.04); }
.cx-tile-ic { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic-blue { background: rgba(21,88,176,.12); color: #1558B0; }
.ic-green { background: rgba(27,138,90,.12); color: #1B8A5A; }
.ic-violet { background: rgba(124,58,237,.12); color: #7c3aed; }
.ic-amber { background: rgba(214,158,46,.14); color: #b7791f; }
.cx-tile-v { font-family: 'Poppins', sans-serif; font-size: 21px; font-weight: 700; color: #1A1D1F; line-height: 1.1; }
.cx-tile-l { font-size: 12px; color: #8a90a0; margin-top: 2px; }

.cx-panel { background: #fff; border: 1px solid #e6e9f0; border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(20,40,90,.04); margin-bottom: 18px; }
.cx-panel-head { display: flex; align-items: center; gap: 9px; color: #1558B0; margin-bottom: 14px; }
.cx-panel-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 600; color: #1A1D1F; margin: 0; }
.cx-schools-head { margin: 4px 2px 12px; }

.cx-bars { display: flex; flex-direction: column; gap: 11px; }
.cx-bar-row { display: grid; grid-template-columns: minmax(120px, 1.4fr) 3fr auto; align-items: center; gap: 12px; }
.cx-bar-name { font-size: 13px; color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cx-bar-track { background: #eef1f6; border-radius: 8px; height: 14px; overflow: hidden; }
.cx-bar-fill { height: 100%; border-radius: 8px; transition: width .5s ease; }
.cx-bar-val { font-size: 13px; font-weight: 700; color: #1A1D1F; min-width: 48px; text-align: right; }

.ty-francophone { background: #1558B0; } .cx-badge.ty-francophone { background: rgba(21,88,176,.12); color: #1558B0; }
.ty-anglophone { background: #0e7c66; } .cx-badge.ty-anglophone { background: rgba(14,124,102,.12); color: #0e7c66; }
.ty-primaire { background: #b7791f; } .cx-badge.ty-primaire { background: rgba(183,121,31,.14); color: #b7791f; }
.ty-secondaire { background: #7c3aed; } .cx-badge.ty-secondaire { background: rgba(124,58,237,.12); color: #7c3aed; }
.ty-superieur { background: #be123c; } .cx-badge.ty-superieur { background: rgba(190,18,60,.10); color: #be123c; }

.cx-schools { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.cx-school { background: #fff; border: 1px solid #e6e9f0; border-radius: 15px; padding: 16px 17px; box-shadow: 0 1px 3px rgba(20,40,90,.04); display: flex; flex-direction: column; gap: 9px; }
.cx-school-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cx-badge { font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
.cx-top-right-min { display: inline-flex; align-items: center; gap: 8px; }
.cx-edition { font-size: 11.5px; color: #9aa0b0; text-transform: capitalize; }
.cx-lang-chip { font-size: 10.5px; font-weight: 700; letter-spacing: .03em; color: #4b5563; background: #eef1f5; border-radius: 6px; padding: 2px 6px; }
.cx-school-name { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600; color: #1A1D1F; margin: 0; line-height: 1.35; }
.cx-school-dir { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #6b7280; }
.cx-school-stats { display: flex; gap: 22px; padding: 6px 0 2px; }
.cx-ss-v { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 700; color: #1A1D1F; display: block; line-height: 1.1; }
.cx-ss-l { font-size: 11.5px; color: #8a90a0; }
.cx-open { margin-top: 4px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #d9deea; background: #fff; color: #1558B0; padding: 9px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s, border-color .15s; }
.cx-open:hover { background: rgba(21,88,176,.06); border-color: #1558B0; }

@media (max-width: 760px) {
  .cx-kpis { grid-template-columns: repeat(2, 1fr); }
  .cx-bar-row { grid-template-columns: minmax(90px, 1.2fr) 2fr auto; }
  .cx-main { padding: 18px 14px 40px; }
}
</style>
