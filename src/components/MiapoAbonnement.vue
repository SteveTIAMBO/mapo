<template>
  <div class="abo">
    <!-- Offre courante + jauge de tokens -->
    <div class="card abo-current">
      <div class="ac-head">
        <div>
          <span class="ac-label">{{ t('mia.aboCurrentPlan') }}</span>
          <h3>{{ abo.offre.nom }}</h3>
        </div>
        <div class="ac-credits" :class="{ warn: abo.pourcentage >= 90 }">
          <strong>{{ restePct }}%</strong>
          <span>{{ t('mia.aboPctLeft') }}</span>
        </div>
      </div>
      <div class="ac-bar"><div class="ac-bar-fill" :class="jaugeClass" :style="{ width: abo.pourcentage + '%' }"></div></div>
      <p class="muted xsmall">{{ t('mia.aboWeeklyReset') }}</p>
      <p v-if="abo.renewAt" class="muted small">{{ t('mia.aboRenew', { date: dateFr(abo.renewAt) }) }}</p>
      <p v-if="abo.épuisé" class="err-line">{{ t('mia.aboExhausted') }}</p>
    </div>

    <!-- Les offres -->
    <div class="offres">
      <div v-for="o in abo.offres" :key="o.id" class="card offre" :class="{ actif: o.id === abo.offreId }">
        <div class="of-head">
          <h4>{{ o.nom }}</h4>
          <div class="of-price">
            <template v-if="o.prix > 0"><strong>{{ fcfa(o.prix) }}</strong><span>/{{ t('mia.aboMonth') }}</span></template>
            <strong v-else>{{ t('mia.aboFree') }}</strong>
          </div>
        </div>
        <div class="of-credits">
          <template v-if="o.prix === 0">{{ t('mia.aboBaseUsage') }}</template>
          <template v-else>×{{ multiple(o) }} {{ t('mia.aboMoreUsage') }}</template>
        </div>
        <ul class="of-feats">
          <li v-for="f in o.features" :key="f"><Check :size="14" /> {{ t('mia.' + f) }}</li>
        </ul>
        <button v-if="o.id === abo.offreId" class="btn btn-ghost btn-sm" disabled>{{ t('mia.aboCurrent') }}</button>
        <button v-else-if="o.prix > 0" class="btn btn-primary btn-sm" @click="choisir(o)">{{ t('mia.aboChoose') }}</button>
      </div>
    </div>

    <p class="muted xsmall monthly">{{ t('mia.aboMonthlyNote') }}</p>

    <!-- Panneau de paiement -->
    <div v-if="choisie" class="card pay">
      <div class="card-head"><CreditCard :size="18" /><h3>{{ t('mia.aboPayTitle', { offre: choisie.nom, prix: fcfa(choisie.prix) }) }}</h3></div>

      <template v-if="status === 'idle'">
        <p class="muted">{{ t('mia.aboPayHint') }}</p>
        <div class="form-group">
          <label class="form-label">{{ t('mia.aboPhoneLabel') }}</label>
          <input v-model="phone" class="input" type="tel" placeholder="2376XXXXXXXX" />
        </div>
        <div class="row">
          <button class="btn btn-primary btn-sm" :disabled="pay.busy" @click="payer">
            <component :is="pay.busy ? Loader2 : Smartphone" :size="15" :class="{ spin: pay.busy }" />
            <span>{{ t('mia.aboPayMomo', { prix: fcfa(choisie.prix) }) }}</span>
          </button>
          <button class="btn btn-ghost btn-sm" @click="annuler">{{ t('mia.cancel') }}</button>
        </div>
      </template>

      <div v-else-if="status === 'pending'" class="pay-state">
        <Loader2 :size="20" class="spin" /> <span>{{ t('mia.aboPending') }}</span>
      </div>
      <p v-else-if="status === 'ok'" class="ok-line">{{ t('mia.aboSuccess', { offre: choisie.nom }) }}</p>
      <p v-else-if="status === 'refused'" class="err-line">{{ t('mia.aboRefused') }} <button class="link" @click="status = 'idle'">{{ t('mia.retry') }}</button></p>
      <p v-else-if="status === 'timeout'" class="err-line">{{ t('mia.aboTimeout') }} <button class="link" @click="status = 'idle'">{{ t('mia.retry') }}</button></p>
      <p v-else-if="status === 'error'" class="err-line">{{ t('mia.aboError') }} <button class="link" @click="status = 'idle'">{{ t('mia.retry') }}</button></p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useAbonnementStore } from '../stores/abonnement'
import { usePaiementStore } from '../stores/paiement'
import { Check, CreditCard, Smartphone, Loader2 } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const isDemo = useAuthStore().isDemo
const abo = useAbonnementStore()
const pay = usePaiementStore()

const choisie = ref(null)
const phone = ref('')
const status = ref('idle') // idle | pending | ok | refused | timeout | error

const jaugeClass = computed(() => abo.pourcentage >= 90 ? 'is-danger' : abo.pourcentage >= 70 ? 'is-warn' : 'is-ok')
const restePct = computed(() => Math.max(0, 100 - abo.pourcentage))
// « ×N d'usage » relatif à l'offre gratuite (façon Claude) — pas de nombre de crédits.
const baseCap = computed(() => { const f = abo.offres.find((o) => o.prix === 0) || abo.offres[0]; return (f && f.capTokens) || 1 })
function multiple(o) { return Math.max(1, Math.round((o.capTokens || 0) / baseCap.value)) }

onMounted(() => abo.load())

function fcfa(n) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }
function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }
function choisir(o) { choisie.value = o; status.value = 'idle'; phone.value = '' }
function annuler() { choisie.value = null }

async function payer() {
  // En démo (pas de compte), on simule l'encaissement pour montrer le parcours.
  // Avec un vrai compte : Tranzak encaisse, et l'offre est accordée CÔTÉ SERVEUR
  // à la confirmation (mapo-pay-tranzak.php) → on rafraîchit l'état depuis le serveur.
  if (isDemo) {
    status.value = 'pending'
    setTimeout(() => { abo.activerDemo(choisie.value.id); status.value = 'ok' }, 1200)
    return
  }
  const r = await pay.init({ amount: choisie.value.prix, description: 'Abonnement MAPO+ ' + choisie.value.nom, phone: phone.value, offerId: choisie.value.id })
  if (!r.ok) { status.value = 'error'; return }
  if (r.payment_url) { window.open(r.payment_url, '_blank') }
  status.value = 'pending'
  const issue = await pay.attendreResultat(r.transaction_id)
  if (issue === 'ACCEPTED') { await abo.fetchState(); status.value = 'ok' }
  else if (issue === 'REFUSED') status.value = 'refused'
  else status.value = 'timeout'
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.abo-current { margin-bottom: 16px; }
.ac-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ac-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--tx3); }
.ac-head h3 { margin: 2px 0 0; font-size: 18px; color: var(--tx); }
.ac-credits { text-align: right; color: var(--pr); }
.ac-credits strong { font-size: 22px; display: block; }
.ac-credits span { font-size: 11px; color: var(--tx3); }
.ac-credits.warn { color: #D93025; }
.ac-bar { height: 8px; border-radius: 6px; background: rgba(var(--pr-rgb),.10); overflow: hidden; margin: 12px 0 4px; }
.ac-bar-fill { height: 100%; border-radius: 6px; transition: width .4s ease; }
.ac-bar-fill.is-ok { background: var(--pr); }
.ac-bar-fill.is-warn { background: #E8A317; }
.ac-bar-fill.is-danger { background: #D93025; }
.muted { color: var(--tx3); font-size: 14px; margin: 8px 0 0; }
.small { font-size: 12.5px; } .xsmall { font-size: 12px; }
.monthly { text-align: center; margin: 12px 0 4px; }

.offres { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.offre { display: flex; flex-direction: column; gap: 10px; }
.offre.actif { border-color: var(--pr); box-shadow: 0 0 0 1px var(--pr) inset; }
.of-head { display: flex; align-items: baseline; justify-content: space-between; }
.of-head h4 { margin: 0; font-size: 16px; color: var(--tx); }
.of-price strong { font-size: 18px; color: var(--pr); } .of-price span { font-size: 12px; color: var(--tx3); }
.of-credits { font-size: 13px; font-weight: 600; color: var(--tx); background: rgba(var(--pr-rgb),.06); border-radius: 8px; padding: 6px 10px; }
.of-feats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.of-feats li { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--tx2, #444); }
.of-feats svg { color: #1B8A5A; flex-shrink: 0; }

.pay { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--tx); }
.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; background: #fff; color: var(--tx); }
.row { display: flex; align-items: center; gap: 10px; }
.pay-state { display: flex; align-items: center; gap: 10px; color: var(--tx); font-size: 14px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; } .btn-ghost { background: none; color: var(--tx3); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.ok-line { color: #1B8A5A; font-size: 14px; font-weight: 600; margin: 6px 0 0; }
.link { background: none; border: none; color: var(--pr); cursor: pointer; font: inherit; text-decoration: underline; padding: 0; }
</style>
