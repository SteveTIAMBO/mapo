<template>
  <div class="mpu">
    <div class="mpu-intro">
      <div>
        <h1 class="mpu-h1">Comptes MAPO+</h1>
        <p class="mpu-sub">
          Registre des inscriptions MAPO+ (B2C) : parents et apprenants,
          leur pays et leur date d'inscription. Source : base utilisateurs.
        </p>
      </div>
      <button class="mpu-refresh" type="button" @click="reload" :disabled="store.loading">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
        Actualiser
      </button>
    </div>

    <div v-if="isSample" class="mpu-note">
      Aucune inscription réelle pour l'instant — affichage d'un <strong>échantillon</strong>.
      Les vrais comptes apparaîtront ici dès les premières inscriptions MAPO+.
    </div>

    <!-- KPIs -->
    <div class="mpu-kpis">
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Comptes</div>
        <div class="mpu-kpi-value">{{ k.totalUsers }}</div>
      </div>
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Parents</div>
        <div class="mpu-kpi-value">{{ k.parents }}</div>
      </div>
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Apprenants</div>
        <div class="mpu-kpi-value">{{ k.apprenants }}</div>
      </div>
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Nouveaux (7 j)</div>
        <div class="mpu-kpi-value mpu-green">{{ k.nouveaux7 }}</div>
      </div>
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Actifs (7 j)</div>
        <div class="mpu-kpi-value mpu-green">{{ k.actifs7 }}</div>
      </div>
      <div class="mpu-kpi">
        <div class="mpu-kpi-label">Pays</div>
        <div class="mpu-kpi-value">{{ k.pays }}</div>
      </div>
    </div>

    <!-- Liste des inscrits -->
    <section class="mpu-card">
      <div class="mpu-card-head">
        <h2 class="mpu-h2">Inscriptions récentes</h2>
        <span class="mpu-count">{{ store.recentUsers.length }}</span>
      </div>

      <div v-if="store.loading" class="mpu-empty">Chargement…</div>
      <div v-else-if="store.recentUsers.length === 0" class="mpu-empty">
        Aucun compte MAPO+ pour l'instant.
      </div>
      <table v-else class="mpu-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Profil</th>
            <th>Pays</th>
            <th class="num">Inscrit</th>
            <th class="num">Dernière activité</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.recentUsers" :key="u.id">
            <td>
              <div class="mpu-name">{{ u.displayName || '—' }}</div>
              <div class="mpu-mail">{{ u.email || u.uid || u.id }}</div>
            </td>
            <td><span class="mpu-pill" :class="u.persona === 'apprenant' ? 'mpu-pill-app' : 'mpu-pill-par'">{{ personaLabel(u.persona) }}</span></td>
            <td>{{ u.pays || '—' }}</td>
            <td class="num mpu-muted">{{ fmtDate(u.createdMs) }}</td>
            <td class="num mpu-muted">{{ relTime(u.lastSeenMs) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useMapoplusUsersStore } from '../../stores/mapoplusUsers'

const store = useMapoplusUsersStore()
const k = computed(() => store.kpis)

// Vrai si on affiche l'échantillon de démonstration (ids 'd1'..)
const isSample = computed(() => store.users.length > 0 && String(store.users[0]?.id || '').startsWith('d'))

function personaLabel(p) {
  if (p === 'apprenant') return 'Apprenant'
  return 'Parent'
}
function fmtDate(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
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
function reload() { store.loadUsers() }

onMounted(() => { store.loadUsers() })
</script>

<style scoped>
.mpu { padding: 4px 0 24px; }
.mpu-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.mpu-h1 { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; color: var(--tx, #1a1d1f); margin: 0 0 4px; }
.mpu-sub { font-size: 13px; color: var(--tx3, #6f767e); margin: 0; max-width: 640px; line-height: 1.5; }
.mpu-refresh { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--card-border, rgba(0,0,0,.08)); background: #fff; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--tx2, #4a4a4a); cursor: pointer; white-space: nowrap; }
.mpu-refresh:hover { background: #f6f6f4; }
.mpu-refresh:disabled { opacity: .5; cursor: default; }

.mpu-note { background: #FFF8E6; border: 1px solid #F2D98C; color: #8A6D1A; font-size: 12.5px; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }

.mpu-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
.mpu-kpi { background: #fff; border: 1px solid var(--card-border, rgba(0,0,0,.06)); border-radius: 14px; padding: 14px 16px; }
.mpu-kpi-label { font-size: 11.5px; color: var(--tx3, #6f767e); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.mpu-kpi-value { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 700; color: var(--tx, #1a1d1f); margin-top: 4px; line-height: 1.1; }
.mpu-green { color: #1B8A5A; }

.mpu-card { background: #fff; border: 1px solid var(--card-border, rgba(0,0,0,.06)); border-radius: 16px; overflow: hidden; }
.mpu-card-head { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.05)); }
.mpu-h2 { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; margin: 0; }
.mpu-count { font-size: 12px; font-weight: 700; color: var(--tx3, #6f767e); background: #f0f0ee; border-radius: 100px; padding: 2px 10px; }
.mpu-empty { padding: 32px; text-align: center; color: var(--tx3, #9aa0a6); font-size: 13px; }

.mpu-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mpu-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: var(--tx3, #9aa0a6); font-weight: 700; padding: 10px 16px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.06)); }
.mpu-table td { padding: 11px 16px; border-bottom: 1px solid var(--card-border, rgba(0,0,0,.04)); }
.mpu-table .num { text-align: right; }
.mpu-table th.num { text-align: right; }
.mpu-name { font-weight: 600; color: var(--tx, #1a1d1f); }
.mpu-mail { font-size: 12px; color: var(--tx3, #9aa0a6); margin-top: 1px; }
.mpu-muted { color: var(--tx3, #9aa0a6); }
.mpu-pill { font-size: 11px; font-weight: 600; border-radius: 100px; padding: 2px 10px; }
.mpu-pill-par { background: rgba(var(--pr-rgb, 10,132,255), .12); color: var(--pr, #0A84FF); }
.mpu-pill-app { background: rgba(124,58,237,.12); color: #7c3aed; }

@media (max-width: 900px) {
  .mpu-kpis { grid-template-columns: repeat(2, 1fr); }
  .mpu-intro { flex-direction: column; }
  .mpu-table { display: block; overflow-x: auto; white-space: nowrap; }
}
</style>
