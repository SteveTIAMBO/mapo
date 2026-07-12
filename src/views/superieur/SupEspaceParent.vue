<template>
  <div class="spa">
    <div class="spa-hero">
      <div class="spa-avatar">{{ initials }}</div>
      <div class="spa-hero-info">
        <div class="spa-hello">Espace parent</div>
        <div class="spa-sub">Vous suivez <strong>{{ enfant.nomComplet }}</strong> · {{ enfant.programmeNom }} · {{ enfant.anneeNom }}</div>
      </div>
    </div>

    <div class="spa-kpis">
      <div class="spa-kpi"><div class="spa-kpi-lab">Moyenne</div><div class="spa-kpi-val">{{ releve ? releve.moyenne.toFixed(2) : (enfant.moyenne != null ? enfant.moyenne.toFixed(2) : '—') }}<span>/20</span></div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">Crédits acquis</div><div class="spa-kpi-val">{{ enfant.ectsValides }}<span> / {{ enfant.ectsRequis }}</span></div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">Statut</div><div class="spa-kpi-val spa-statut" :class="enfant.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">{{ enfant.statut === 'en_difficulte' ? 'En difficulté' : 'Inscrit' }}</div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">Reste à payer</div><div class="spa-kpi-val spa-reste">{{ formatFcfa(scolarite.reste) }}<span> FCFA</span></div></div>
    </div>

    <div class="spa-grid">
      <!-- Scolarité & paiements -->
      <section class="spa-card">
        <h2 class="spa-h2">Scolarité &amp; paiements</h2>
        <div class="spa-scol-sum">
          <div><span>Total scolarité</span><strong>{{ formatFcfa(scolarite.total) }} FCFA</strong></div>
          <div><span>Déjà payé</span><strong class="is-ok">{{ formatFcfa(scolarite.paye) }} FCFA</strong></div>
          <div><span>Reste</span><strong class="is-warn">{{ formatFcfa(scolarite.reste) }} FCFA</strong></div>
        </div>
        <table class="spa-table">
          <thead><tr><th>Échéance</th><th>Date</th><th class="num">Montant</th><th>Statut</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in echeances" :key="i">
              <td>Tranche {{ i + 1 }}</td>
              <td>{{ t.date }}</td>
              <td class="num">{{ formatFcfa(t.montant) }} FCFA</td>
              <td>
                <span v-if="t.paye" class="spa-pay-st is-ok">Payée</span>
                <button v-else class="spa-pay-btn" type="button" @click="payer(i)">Payer</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="payMsg" class="spa-pay-msg">{{ payMsg }}</p>
      </section>

      <div class="spa-side">
        <!-- Suivi pédagogique -->
        <section class="spa-card">
          <h2 class="spa-h2">Suivi pédagogique</h2>
          <div v-if="releve && releve.lignes.length">
            <div v-for="l in releve.lignes.slice(0, 5)" :key="l.ueId" class="spa-note">
              <div class="spa-note-int">{{ l.ueIntitule }}</div>
              <div class="spa-note-val" :class="l.note != null && l.note < 10 ? 'is-bad' : ''">{{ l.note != null ? l.note.toFixed(1) : '—' }}</div>
            </div>
          </div>
          <p v-else class="spa-empty">Relevé bientôt disponible.</p>
        </section>

        <!-- MIAPO+ pour la famille -->
        <section class="spa-card spa-miapo">
          <div class="spa-miapo-badge">MIAPO+</div>
          <h2 class="spa-h2 spa-miapo-h2">Aidez {{ enfant.prenom }} à progresser</h2>
          <p class="spa-miapo-txt">MIAPO+, le tuteur intelligent : révisions, quiz et suivi de progression à la maison, 24h/24. Offert 1 mois aux familles de l'établissement.</p>
          <a class="spa-miapo-cta" href="https://miapo.app-edufrem.com" target="_blank" rel="noopener">Découvrir MIAPO+</a>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()
const enfant = computed(() =>
  store.etudiants.find((e) => e.niveau === 'Licence' && e.moyenne >= 11) ||
  store.etudiants.find((e) => e.moyenne >= 11) ||
  store.etudiants[0]
).value

const releve = computed(() => (enfant ? store.releveEtudiant(enfant.id) : null)).value
const initials = (enfant ? (enfant.nomComplet || '') : '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const TARIF = { BTS: 450000, Licence: 550000, Master: 750000 }
const scolarite = computed(() => {
  const total = TARIF[enfant && enfant.niveau] || 550000
  const paye = Math.round(total * 0.66)
  return { total, paye, reste: Math.max(0, total - paye) }
}).value

const echeances = computed(() => {
  const t = scolarite.total
  return [
    { date: '05 oct. 2025', montant: Math.round(t * 0.4), paye: true },
    { date: '10 janv. 2026', montant: Math.round(t * 0.3), paye: scolarite.paye > t * 0.5 },
    { date: '10 avr. 2026', montant: t - Math.round(t * 0.4) - Math.round(t * 0.3), paye: false },
  ]
}).value

const payMsg = ref('')
function payer(i) {
  payMsg.value = `Paiement de la tranche ${i + 1} : redirection vers le paiement mobile money / carte (démo). En production, l'encaissement passe par le module Paiements de MAPO.`
}

function formatFcfa(n) { return (n ?? 0).toLocaleString('fr-FR') }
</script>

<style scoped>
.spa { display: flex; flex-direction: column; gap: 18px; }
.spa-hero { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, rgba(var(--pr-rgb), 0.10), rgba(var(--pr-rgb), 0.02)); border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 18px; padding: 20px 24px; }
.spa-avatar { width: 58px; height: 58px; border-radius: 15px; background: var(--pr); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; }
.spa-hello { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: var(--text, #1A1D1F); }
.spa-sub { font-size: 14px; color: var(--muted, #5b6472); margin-top: 2px; }
.spa-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.spa-kpi { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 16px 18px; }
.spa-kpi-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); }
.spa-kpi-val { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 25px; color: var(--text, #1A1D1F); margin-top: 4px; }
.spa-kpi-val span { font-size: 13px; color: var(--muted, #9AA2B1); font-weight: 600; }
.spa-statut.is-ok { color: #0E7C5A; } .spa-statut.is-warn { color: #B45309; }
.spa-reste { color: #B45309; }
.spa-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: start; }
.spa-side { display: flex; flex-direction: column; gap: 16px; }
.spa-card { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.spa-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--text, #1A1D1F); margin: 0 0 14px; }
.spa-scol-sum { display: flex; gap: 22px; flex-wrap: wrap; margin-bottom: 16px; }
.spa-scol-sum div { display: flex; flex-direction: column; }
.spa-scol-sum span { font-size: 11.5px; color: var(--muted, #9AA2B1); text-transform: uppercase; letter-spacing: .4px; }
.spa-scol-sum strong { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--text, #1A1D1F); }
.spa-scol-sum strong.is-ok { color: #0E7C5A; } .spa-scol-sum strong.is-warn { color: #B45309; }
.spa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.spa-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.spa-table th.num, .spa-table td.num { text-align: right; }
.spa-table td { padding: 10px 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.spa-pay-st { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 10px; }
.spa-pay-st.is-ok { background: rgba(14,124,90,.12); color: #0E7C5A; }
.spa-pay-btn { background: var(--pr); color: #fff; border: none; border-radius: 8px; font-family: inherit; font-weight: 700; font-size: 12px; padding: 5px 14px; cursor: pointer; }
.spa-pay-msg { margin-top: 12px; font-size: 12.5px; color: var(--muted, #5b6472); background: var(--input-bg, rgba(20,32,64,.04)); border-radius: 10px; padding: 10px 14px; }
.spa-note { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.spa-note-int { font-size: 13px; color: var(--text, #23262E); }
.spa-note-val { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--text, #1A1D1F); }
.spa-note-val.is-bad { color: #DC2626; }
.spa-empty { color: var(--muted, #6b7280); font-size: 13px; padding: 12px 0; text-align: center; }
.spa-miapo { background: linear-gradient(150deg, #4F46E5, #7C3AED); color: #fff; border: none; }
.spa-miapo-badge { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-weight: 800; font-size: 12px; }
.spa-miapo-h2 { color: #fff; margin-top: 12px; }
.spa-miapo-txt { font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.92); }
.spa-miapo-cta { display: inline-block; margin-top: 14px; background: #fff; color: #5B21B6; font-weight: 700; font-size: 13.5px; border-radius: 10px; padding: 9px 18px; text-decoration: none; }
@media (max-width: 900px) { .spa-kpis { grid-template-columns: repeat(2, 1fr); } .spa-grid { grid-template-columns: 1fr; } }
</style>
