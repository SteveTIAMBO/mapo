<template>
  <div class="spa">
    <div class="spa-hero">
      <div class="spa-avatar">{{ initials }}</div>
      <div class="spa-hero-info">
        <div class="spa-hello">{{ t('sup.espaceParent.title') }}</div>
        <div class="spa-sub">{{ t('sup.espaceParent.followingPre') }} <strong>{{ enfant.nomComplet }}</strong> · {{ enfant.programmeNom }} · {{ enfant.anneeNom }}</div>
      </div>
    </div>

    <div class="spa-kpis">
      <div class="spa-kpi"><div class="spa-kpi-lab">{{ t('sup.espaceParent.kpiMoyenne') }}</div><div class="spa-kpi-val">{{ releve ? releve.moyenne.toFixed(2) : (enfant.moyenne != null ? enfant.moyenne.toFixed(2) : '—') }}<span>/20</span></div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">{{ t('sup.espaceParent.kpiCredits') }}</div><div class="spa-kpi-val">{{ enfant.ectsValides }}<span> / {{ enfant.ectsRequis }}</span></div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">{{ t('sup.espaceParent.kpiStatut') }}</div><div class="spa-kpi-val spa-statut" :class="enfant.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">{{ enfant.statut === 'en_difficulte' ? t('sup.espaceParent.enDifficulte') : t('sup.espaceParent.inscrit') }}</div></div>
      <div class="spa-kpi"><div class="spa-kpi-lab">{{ t('sup.espaceParent.kpiReste') }}</div><div class="spa-kpi-val spa-reste">{{ formatFcfa(scolarite.reste) }}<span> FCFA</span></div></div>
    </div>

    <div class="spa-grid">
      <!-- Scolarité & paiements -->
      <section class="spa-card">
        <h2 class="spa-h2">{{ t('sup.espaceParent.scolTitle') }}</h2>
        <div class="spa-scol-sum">
          <div><span>{{ t('sup.espaceParent.totalScol') }}</span><strong>{{ formatFcfa(scolarite.total) }} FCFA</strong></div>
          <div><span>{{ t('sup.espaceParent.dejaPaye') }}</span><strong class="is-ok">{{ formatFcfa(scolarite.paye) }} FCFA</strong></div>
          <div><span>{{ t('sup.espaceParent.reste') }}</span><strong class="is-warn">{{ formatFcfa(scolarite.reste) }} FCFA</strong></div>
        </div>
        <table class="spa-table">
          <thead><tr><th>{{ t('sup.espaceParent.thEcheance') }}</th><th>{{ t('sup.espaceParent.thDate') }}</th><th class="num">{{ t('sup.espaceParent.thMontant') }}</th><th>{{ t('sup.espaceParent.thStatut') }}</th></tr></thead>
          <tbody>
            <tr v-for="(ech, i) in echeances" :key="i">
              <td>{{ t('sup.espaceParent.tranche', { n: i + 1 }) }}</td>
              <td>{{ ech.date }}</td>
              <td class="num">{{ formatFcfa(ech.montant) }} FCFA</td>
              <td>
                <span v-if="ech.paye" class="spa-pay-st is-ok">{{ t('sup.espaceParent.payee') }}</span>
                <button v-else class="spa-pay-btn" type="button" @click="payer(i)">{{ t('sup.espaceParent.payer') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="spa-pay-hint">{{ t('sup.espaceParent.payHint') }}</p>
      </section>

      <div class="spa-side">
        <!-- Suivi pédagogique -->
        <section class="spa-card">
          <h2 class="spa-h2">{{ t('sup.espaceParent.suiviTitle') }}</h2>
          <div v-if="releve && releve.lignes.length">
            <div v-for="l in releve.lignes.slice(0, 5)" :key="l.ueId" class="spa-note">
              <div class="spa-note-int">{{ l.ueIntitule }}</div>
              <div class="spa-note-val" :class="l.note != null && l.note < 10 ? 'is-bad' : ''">{{ l.note != null ? l.note.toFixed(1) : '—' }}</div>
            </div>
          </div>
          <p v-else class="spa-empty">{{ t('sup.espaceParent.releveSoon') }}</p>
        </section>

        <!-- MIAPO+ pour la famille (promo vers l'app B2C MIAPO+ — hors contrôle école) -->
        <section class="spa-card spa-miapo">
          <div class="spa-miapo-badge">MIAPO+</div>
          <h2 class="spa-h2 spa-miapo-h2">{{ t('sup.espaceParent.miapoTitle', { name: enfant.prenom }) }}</h2>
          <p class="spa-miapo-txt">{{ t('sup.espaceParent.miapoTxt') }}</p>
          <a class="spa-miapo-cta" href="https://miapo.app-edufrem.com" target="_blank" rel="noopener">{{ t('sup.espaceParent.miapoCta') }}</a>
        </section>
      </div>
    </div>

    <!-- Guichet Mobile Money (Tranzak : MTN MoMo / Orange Money) -->
    <div v-if="showPay" class="spa-ov" @click.self="!payProcessing && closePay()">
      <div class="spa-modal">
        <div class="spa-modal-head">
          <h3>{{ t('sup.espaceParent.payModalTitle') }}</h3>
          <button v-if="!payProcessing" class="spa-x" type="button" @click="closePay">✕</button>
        </div>

        <div v-if="paySuccess" class="spa-pay-done">
          <div class="spa-check">✓</div>
          <p class="spa-done-t">{{ t('sup.espaceParent.payConfirmed') }}</p>
          <small>{{ t('sup.espaceParent.payRef', { amount: formatFcfa(payAmount), tx: payTx }) }}</small>
          <button class="spa-pay-btn spa-wide" type="button" @click="closePay">{{ t('sup.espaceParent.close') }}</button>
        </div>

        <template v-else-if="!payProcessing">
          <div class="spa-pay-amount"><span>{{ t('sup.espaceParent.amountToPay') }}</span><strong>{{ formatFcfa(payAmount) }} FCFA</strong></div>
          <div class="spa-op-grid">
            <button v-for="op in OPERATORS" :key="op.key" type="button" class="spa-op" :class="{ on: payOperator === op.key }" @click="payOperator = op.key">
              <span class="spa-op-dot" :style="{ background: op.color }"></span>{{ op.label }}
            </button>
          </div>
          <label class="spa-lab">{{ t('sup.espaceParent.momoNumber') }}</label>
          <input v-model="payPhone" type="tel" class="spa-input" :placeholder="t('sup.espaceParent.momoPlaceholder')" />
          <small class="spa-hint">{{ t('sup.espaceParent.sandboxHint') }}</small>
          <p v-if="payErr" class="spa-err">{{ payErr }}</p>
          <div class="spa-modal-actions">
            <button class="spa-btn-ghost" type="button" @click="closePay">{{ t('sup.espaceParent.cancel') }}</button>
            <button class="spa-pay-btn" type="button" @click="doPay">{{ t('sup.espaceParent.payAmount', { amount: formatFcfa(payAmount) }) }}</button>
          </div>
        </template>

        <div v-else class="spa-pay-wait">
          <div class="spa-spin"></div>
          <p class="spa-wait-t">{{ t('sup.espaceParent.requestSent', { phone: payPhone }) }}</p>
          <small>{{ t('sup.espaceParent.validateOnPhone') }}</small>
          <p v-if="payErr" class="spa-err" style="margin-top:12px;">{{ payErr }}</p>
          <button class="spa-btn-ghost spa-wide" type="button" @click="closePay">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import { useTranzakStore } from '../../stores/tranzak'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const tranzak = useTranzakStore()
const enfant = computed(() =>
  store.etudiants.find((e) => e.niveau === 'Licence' && e.moyenne >= 11) ||
  store.etudiants.find((e) => e.moyenne >= 11) ||
  store.etudiants[0]
).value

const releve = computed(() => (enfant ? store.releveEtudiant(enfant.id) : null)).value
const initials = (enfant ? (enfant.nomComplet || '') : '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const TARIF = { BTS: 450000, Licence: 550000, Master: 750000 }
const total = TARIF[enfant && enfant.niveau] || 550000

// Échéancier réactif : le paiement d'une tranche met à jour « Reste à payer » en direct.
const echeances = ref([
  { date: '05 oct. 2025', montant: Math.round(total * 0.4), paye: true },
  { date: '10 janv. 2026', montant: Math.round(total * 0.3), paye: true },
  { date: '10 avr. 2026', montant: total - Math.round(total * 0.4) - Math.round(total * 0.3), paye: false },
])
const scolarite = computed(() => {
  const paye = echeances.value.filter((t) => t.paye).reduce((s, t) => s + t.montant, 0)
  return { total, paye, reste: Math.max(0, total - paye) }
})

// ── Guichet Mobile Money (Tranzak) ────────────────────────────────────
const OPERATORS = [
  { key: 'orange', label: 'Orange Money', color: '#FF6600' },
  { key: 'mtn', label: 'MTN MoMo', color: '#FFCB05' },
]
const showPay = ref(false)
const payTranche = ref(-1)
const payAmount = ref(0)
const payPhone = ref('237674000009')   // démo sandbox : numéro « succès »
const payOperator = ref('orange')
const payProcessing = ref(false)
const paySuccess = ref(false)
const payErr = ref('')
const payTx = ref('')
let payTimer = null
let payDeadline = 0

function payer(i) {
  payTranche.value = i
  payAmount.value = echeances.value[i].montant
  payPhone.value = '237674000009'
  payOperator.value = 'orange'
  payProcessing.value = false
  paySuccess.value = false
  payErr.value = ''
  payTx.value = ''
  showPay.value = true
}

async function doPay() {
  payErr.value = ''
  const phone = tranzak.normalizePhone(payPhone.value)
  if (!phone) { payErr.value = t('sup.espaceParent.errInvalidNumber'); return }
  payProcessing.value = true
  const res = await tranzak.initPayment({
    amount: payAmount.value,
    currency: 'XAF',
    description: `Scolarite ${enfant?.nomComplet || ''}`.trim().slice(0, 110),
    mobileWalletNumber: phone,
    metadata: enfant?.matricule || enfant?.id || '',
    customerName: enfant?.nomComplet || 'Parent',
  })
  if (!res.ok) { payErr.value = res.error || t('sup.espaceParent.errCantStart'); payProcessing.value = false; return }
  payTx.value = res.transaction_id
  startPayPoll()
}

function startPayPoll() {
  stopPayPoll()
  payDeadline = Date.now() + 90 * 1000
  payTimer = setInterval(runPayCheck, 3000)
  runPayCheck()
}
function stopPayPoll() { if (payTimer) { clearInterval(payTimer); payTimer = null } }
async function runPayCheck() {
  if (!payTx.value) return
  if (Date.now() > payDeadline) { stopPayPoll(); payErr.value = t('sup.espaceParent.errStillWaiting'); payProcessing.value = false; return }
  const r = await tranzak.checkPayment(payTx.value)
  if (r.status === 'ACCEPTED') {
    stopPayPoll()
    if (payTranche.value >= 0 && echeances.value[payTranche.value]) echeances.value[payTranche.value].paye = true
    payProcessing.value = false
    paySuccess.value = true
  } else if (r.status === 'REFUSED') {
    stopPayPoll(); payErr.value = t('sup.espaceParent.errRefused'); payProcessing.value = false
  }
}
function closePay() { stopPayPoll(); showPay.value = false; payProcessing.value = false }
onUnmounted(() => stopPayPoll())

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
.spa-pay-hint { margin-top: 12px; font-size: 12.5px; color: var(--muted, #6b7280); }
/* Guichet mobile money */
.spa-ov { position: fixed; inset: 0; background: rgba(16,22,40,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.spa-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 420px; padding: 22px 24px; box-shadow: 0 24px 60px rgba(16,22,40,.28); }
.spa-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.spa-modal-head h3 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 17px; color: var(--text, #1A1D1F); margin: 0; }
.spa-x { background: none; border: none; font-size: 16px; color: var(--muted, #9AA2B1); cursor: pointer; padding: 4px 8px; border-radius: 8px; }
.spa-pay-amount { display: flex; align-items: center; justify-content: space-between; background: var(--input-bg, rgba(20,32,64,.04)); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
.spa-pay-amount span { font-size: 12.5px; color: var(--muted, #6b7280); }
.spa-pay-amount strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 18px; color: var(--text, #1A1D1F); }
.spa-op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.spa-op { display: flex; align-items: center; gap: 8px; background: #fff; border: 1.5px solid var(--border, rgba(20,32,64,.12)); border-radius: 12px; padding: 11px 14px; font-family: inherit; font-weight: 600; font-size: 13.5px; color: var(--text, #23262E); cursor: pointer; }
.spa-op.on { border-color: var(--pr); background: rgba(var(--pr-rgb), .06); }
.spa-op-dot { width: 12px; height: 12px; border-radius: 50%; }
.spa-lab { display: block; font-size: 12.5px; font-weight: 600; color: var(--muted, #6b7280); margin-bottom: 6px; }
.spa-input { width: 100%; border: 1.5px solid var(--border, rgba(20,32,64,.12)); border-radius: 12px; padding: 11px 14px; font-family: inherit; font-size: 14px; color: var(--text, #1A1D1F); box-sizing: border-box; }
.spa-input:focus { outline: none; border-color: var(--pr); }
.spa-hint { display: block; margin-top: 7px; font-size: 11.5px; color: var(--muted, #9AA2B1); }
.spa-err { margin: 12px 0 0; font-size: 12.5px; color: #DC2626; font-weight: 600; }
.spa-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.spa-btn-ghost { background: none; border: 1.5px solid var(--border, rgba(20,32,64,.12)); border-radius: 10px; font-family: inherit; font-weight: 600; font-size: 13.5px; color: var(--text, #23262E); padding: 9px 16px; cursor: pointer; }
.spa-wide { width: 100%; margin-top: 18px; }
.spa-pay-wait, .spa-pay-done { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 0 4px; }
.spa-wait-t, .spa-done-t { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--text, #1A1D1F); margin: 14px 0 4px; }
.spa-pay-wait small, .spa-pay-done small { font-size: 12.5px; color: var(--muted, #6b7280); }
.spa-spin { width: 40px; height: 40px; border-radius: 50%; border: 3px solid rgba(var(--pr-rgb), .2); border-top-color: var(--pr); animation: spa-spin 0.8s linear infinite; }
@keyframes spa-spin { to { transform: rotate(360deg); } }
.spa-check { width: 52px; height: 52px; border-radius: 50%; background: rgba(14,124,90,.14); color: #0E7C5A; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
@media (max-width: 900px) { .spa-kpis { grid-template-columns: repeat(2, 1fr); } .spa-grid { grid-template-columns: 1fr; } }
</style>
