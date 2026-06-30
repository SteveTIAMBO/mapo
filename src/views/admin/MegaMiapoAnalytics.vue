<template>
  <div class="mma">
    <div class="mma-intro">
      <div>
        <h1 class="mma-h1">MIAPO+ · Adoption</h1>
        <p class="mma-sub">
          Suivi de l'usage du tuteur intelligent (B2C). Installs, utilisateurs actifs,
          sessions et progression moyenne — pour voir si le projet prend.
        </p>
      </div>
      <button class="mma-refresh" type="button" @click="reload" :disabled="store.loading">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
        Actualiser
      </button>
    </div>

    <div v-if="isSample" class="mma-note">
      Aucune donnée réelle pour l'instant — affichage d'un <strong>échantillon</strong> pour
      illustrer le tableau de bord. Les vraies données apparaîtront dès les premiers comptes MIAPO+.
    </div>

    <!-- KPIs -->
    <div class="mma-kpis">
      <div class="mma-kpi">
        <div class="mma-kpi-label">Utilisateurs</div>
        <div class="mma-kpi-value">{{ k.totalUsers }}</div>
      </div>
      <div class="mma-kpi">
        <div class="mma-kpi-label">Actifs (7 j)</div>
        <div class="mma-kpi-value mma-green">{{ k.active7 }}</div>
        <div class="mma-kpi-sub">{{ k.active30 }} sur 30 j</div>
      </div>
      <div class="mma-kpi">
        <div class="mma-kpi-label">Sessions tuteur</div>
        <div class="mma-kpi-value">{{ k.totalSessions }}</div>
      </div>
      <div class="mma-kpi">
        <div class="mma-kpi-label">Quiz complétés</div>
        <div class="mma-kpi-value">{{ k.totalQuizzes }}</div>
      </div>
      <div class="mma-kpi">
        <div class="mma-kpi-label">Progression moyenne</div>
        <div class="mma-kpi-value" :class="progClass(k.avgProgression)">{{ k.avgProgression }}%</div>
        <div class="mma-kpi-sub">score moyen aux quiz</div>
      </div>
      <div class="mma-kpi">
        <div class="mma-kpi-label">Installs PWA</div>
        <div class="mma-kpi-value">{{ k.installs }}</div>
        <div class="mma-kpi-sub">{{ k.installRate }}% des comptes</div>
      </div>
    </div>

    <!-- Liste des utilisateurs -->
    <section class="mma-card">
      <div class="mma-card-head">
        <h2 class="mma-h2">Utilisateurs récents</h2>
        <span class="mma-count">{{ store.recentUsers.length }}</span>
      </div>

      <div v-if="store.loading" class="mma-empty">Chargement…</div>
      <div v-else-if="store.recentUsers.length === 0" class="mma-empty">
        Aucun utilisateur MIAPO+ pour l'instant.
      </div>
      <table v-else class="mma-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Profil</th>
            <th>Pays</th>
            <th class="num">Sessions</th>
            <th class="num">Quiz</th>
            <th class="num">Score moy.</th>
            <th class="num">Install</th>
            <th class="num">Dernière activité</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.recentUsers" :key="u.id">
            <td><div class="mma-mail">{{ u.email || u.uid || u.id }}</div></td>
            <td><span class="mma-pill" :class="u.persona === 'apprenant' ? 'mma-pill-app' : 'mma-pill-par'">{{ personaLabel(u.persona) }}</span></td>
            <td>{{ u.country || '—' }}</td>
            <td class="num">{{ u.sessionsCount || 0 }}</td>
            <td class="num">{{ u.quizzesCompleted || 0 }}</td>
            <td class="num">
              <span v-if="u.avgScore !== null" :class="progClass(u.avgScore)">{{ u.avgScore }}%</span>
              <span v-else class="mma-muted">—</span>
            </td>
            <td class="num">
              <span v-if="u.installed" class="mma-yes" title="A installé le PWA">✓</span>
              <span v-else class="mma-muted">—</span>
            </td>
            <td class="num mma-muted">{{ relTime(u.lastSeenMs) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useMiapoAnalyticsStore } from '../../stores/miapoAnalytics'

const store = useMiapoAnalyticsStore()
const k = computed(() => store.kpis)

// Vrai si on affiche l'échantillon de démonstration (ids 'd1'..)
const isSample = computed(() => store.users.length > 0 && String(store.users[0]?.id || '').startsWith('d'))

function personaLabel(p) {
  if (p === 'apprenant') return 'Apprenant'
  if (p === 'parent') return 'Parent'
  return 'Parent'
}
function progClass(v) {
  if (v >= 70) return 'mma-green'
  if (v >= 40) return 'mma-orange'
  return 'mma-red'
}
function relTime(ms) {
  if (!ms) return '—'
  const diff = Date.now() - ms
  const day = 864e5
  if (diff < day) return "aujourd'hui"
  const days = Math.floor(diff / day)
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  const months = Math.floor(days / 30)
  return `il y a ${months} mois`
}
function reload() { store.loadAnalytics() }

onMounted(() => { store.loadAnalytics() })
</script>

<style scoped>
.mma { padding: 4px 0 24px; }
.mma-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.mma-h1 { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; color: var(--tx, #1a1d1f); margin: 0 0 4px; }
.mma-sub { font-size: 13px; color: var(--tx3, #6f767e); margin: 0; max-width: 640px; line-height: 1.5; }
.mma-refresh { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--card-border, rgba(0,0,0,.08)); background: #fff; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--tx2, #4a4a4a); cursor: pointer; white-space: nowrap; }
.mma-refresh:hover { background: #f6f6f4; }
.mma-refresh:disabled { opacity: .5; cursor: default; }

.mma-note { background: #FFF8E6; border: 1px solid #F2D98C; color: #8A6D1A; font-size: 12.5px; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }

.mma-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
.mma-kpi { background: #fff; border: 1px solid var(--card-border, rgba(0,0,0,.06)); border-radius: 14px; padding: 14px 16px; }
.mma-kpi-label { font-size: 11.5px; color: var(--tx3, #6f767e); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.mma-kpi-value { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 700; color: var(--tx, #1a1d1f); margin-top: 4px; line-height: 1.1; }
.mma-kpi-sub { font-size: 11px; color: var(--tx3, #9aa0a6); margin-top: 2px; }
.mma-green { color: #1B8A5A; }
.mma-orange { color: #C77A14; }
.mma-red { color: #D93025; }

.mma-card { background: #fff; border: 1px solid var(--card-border, rgba(0,0,0,.06)); border-radius: 16px; overflow: hidden; }
.mma-card-head { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.05)); }
.mma-h2 { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; margin: 0; }
.mma-count { font-size: 12px; font-weight: 700; color: var(--tx3, #6f767e); background: #f0f0ee; border-radius: 100px; padding: 2px 10px; }
.mma-empty { padding: 32px; text-align: center; color: var(--tx3, #9aa0a6); font-size: 13px; }

.mma-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mma-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: var(--tx3, #9aa0a6); font-weight: 700; padding: 10px 16px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.06)); }
.mma-table td { padding: 11px 16px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.04)); }
.mma-table .num { text-align: right; }
.mma-table th.num { text-align: right; }
.mma-mail { font-weight: 600; color: var(--tx, #1a1d1f); }
.mma-muted { color: var(--tx3, #9aa0a6); }
.mma-yes { color: #1B8A5A; font-weight: 700; }
.mma-pill { font-size: 11px; font-weight: 600; border-radius: 100px; padding: 2px 10px; }
.mma-pill-par { background: rgba(var(--pr-rgb, 10,132,255), .12); color: var(--pr, #0A84FF); }
.mma-pill-app { background: rgba(124,58,237,.12); color: #7c3aed; }

@media (max-width: 900px) {
  .mma-kpis { grid-template-columns: repeat(2, 1fr); }
  .mma-intro { flex-direction: column; }
  .mma-table { display: block; overflow-x: auto; white-space: nowrap; }
}
</style>
