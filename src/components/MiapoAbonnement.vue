<template>
  <div class="abo">
    <!-- Bandeau offre famille -->
    <div v-if="remisePct" class="fam-note">
      <Users :size="16" /> <span>{{ t('mia.aboFamilyNote', { pct: remisePct, n: remiseMin }) }}</span>
    </div>

    <!-- Les offres (4 paliers, avantages en accordéon) -->
    <div class="offres">
      <div v-for="o in abo.offres" :key="o.id" class="card offre" :class="{ actif: o.id === abo.offreId, promo: o.promo }">
        <span v-if="o.promo" class="promo-badge">{{ t('mia.aboRecommended') }}</span>
        <div class="of-head">
          <h4>{{ o.nom }}</h4>
          <div class="of-price">
            <template v-if="prix(o) > 0"><strong>{{ fmtPrix(o) }}</strong><span>/{{ t('mia.aboMonth') }}</span></template>
            <strong v-else>{{ t('mia.aboFree') }}</strong>
          </div>
        </div>
        <div class="of-credits">
          <template v-if="prix(o) === 0">{{ t('mia.aboBaseUsage') }}</template>
          <template v-else>×{{ multiple(o) }} {{ t('mia.aboMoreUsage') }}</template>
        </div>
        <!-- Accordéon : avantages -->
        <button type="button" class="acc-toggle" :aria-expanded="isOpen(o.id) ? 'true' : 'false'" @click="toggle(o.id)">
          <span>{{ t('mia.aboSeeAdvantages') }}</span>
          <ChevronDown :size="16" class="acc-chev" :class="{ rot: isOpen(o.id) }" />
        </button>
        <ul v-show="isOpen(o.id)" class="of-feats">
          <li v-for="f in o.avantages" :key="f"><Check :size="14" /> {{ avantageLabel(f) }}</li>
        </ul>
        <button v-if="o.id === abo.offreId" class="btn btn-ghost btn-sm" disabled>{{ t('mia.aboCurrent') }}</button>
        <button v-else-if="prix(o) > 0" class="btn btn-sm" :class="o.promo ? 'btn-primary' : 'btn-outline'" @click="choisir(o)">{{ t('mia.aboChoose') }}</button>
      </div>
    </div>

    <p class="muted xsmall monthly">{{ t('mia.aboMonthlyNote') }}</p>

    <!-- Recharge de crédits ponctuelle (PAYG) -->
    <div class="card packs">
      <div class="card-head"><Zap :size="18" /><h3>{{ t('mia.creditsTitle') }}</h3></div>
      <p class="muted small">{{ t('mia.creditsHint') }}</p>
      <p v-if="abo.bonus > 0" class="bonus-line"><Check :size="14" /> {{ t('mia.creditsBonus', { n: Math.round(abo.bonus / 3000) }) }}</p>
      <div class="packs-grid">
        <div v-for="p in abo.packs" :key="p.id" class="pack">
          <strong>{{ p.nom }}</strong>
          <span class="pk-qty">≈ {{ Math.round(p.tokens / 3000) }} {{ t('mia.creditsRevisions') }}</span>
          <span class="pk-price">{{ fmtPrix(p) }}</span>
          <button class="btn btn-outline btn-sm" @click="choisirPack(p)">{{ t('mia.creditsBuy') }}</button>
        </div>
      </div>
    </div>

    <!-- Panneau de paiement -->
    <div v-if="choisie" class="card pay">
      <div class="card-head"><CreditCard :size="18" /><h3>{{ t('mia.aboPayTitle', { offre: choisie.nom, prix: fmtPrix(choisie) }) }}</h3></div>

      <template v-if="status === 'idle'">
        <!-- Afrique : Mobile Money (Tranzak) -->
        <template v-if="abo.guichet === 'tranzak'">
          <p class="muted">{{ t('mia.aboPayHint') }}</p>
          <div class="form-group">
            <label class="form-label">{{ t('mia.aboPhoneLabel') }}</label>
            <input v-model="phone" class="input" type="tel" placeholder="2376XXXXXXXX" />
          </div>
          <div class="row">
            <button class="btn btn-primary btn-sm" :disabled="pay.busy" @click="payer">
              <component :is="pay.busy ? Loader2 : Smartphone" :size="15" :class="{ spin: pay.busy }" />
              <span>{{ t('mia.aboPayMomo', { prix: fmtPrix(choisie) }) }}</span>
            </button>
            <button class="btn btn-ghost btn-sm" @click="annuler">{{ t('mia.cancel') }}</button>
          </div>
        </template>
        <!-- Europe : carte bancaire (Stripe) -->
        <template v-else>
          <p class="muted">{{ t('mia.aboPayCardHint') }}</p>
          <div class="row">
            <button class="btn btn-primary btn-sm" :disabled="pay.busy" @click="payer">
              <component :is="pay.busy ? Loader2 : CreditCard" :size="15" :class="{ spin: pay.busy }" />
              <span>{{ t('mia.aboPayCard', { prix: fmtPrix(choisie) }) }}</span>
            </button>
            <button class="btn btn-ghost btn-sm" @click="annuler">{{ t('mia.cancel') }}</button>
          </div>
        </template>
      </template>

      <div v-else-if="status === 'pending'" class="pay-state">
        <Loader2 :size="20" class="spin" /> <span>{{ t('mia.aboPending') }}</span>
      </div>
      <p v-else-if="status === 'ok'" class="ok-line">{{ t('mia.aboSuccess', { offre: choisie.nom }) }}</p>
      <p v-else-if="status === 'soon'" class="muted">{{ t('mia.aboCardSoon') }} <button class="link" @click="annuler">{{ t('mia.cancel') }}</button></p>
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
import { useFacturationMiapoStore } from '../stores/facturationMiapo'
import { prixOffre, fmtMontant } from '../utils/devise'
import { Check, CreditCard, Smartphone, Loader2, ChevronDown, Users, Zap } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const isDemo = useAuthStore().isDemo
const abo = useAbonnementStore()
const pay = usePaiementStore()
const fact = useFacturationMiapoStore()

const choisie = ref(null)
const phone = ref('')
const status = ref('idle') // idle | pending | ok | soon | refused | timeout | error
const open = ref({})       // accordéons ouverts par id d'offre

const remisePct = computed(() => abo.remiseFamille?.pct || 0)
const remiseMin = computed(() => abo.remiseFamille?.minEnfants || 2)
// « ×N d'usage » relatif à l'offre gratuite (façon Claude) — pas de nombre de crédits.
const baseCap = computed(() => { const f = abo.offres.find((o) => o.prix === 0) || abo.offres[0]; return (f && f.capTokens) || 1 })
function multiple(o) { return Math.max(1, Math.round((o.capTokens || 0) / baseCap.value)) }

const prix = (o) => prixOffre(o, abo.devise)
const fmtPrix = (o) => fmtMontant(prixOffre(o, abo.devise), abo.devise)

function toggle(id) { open.value = { ...open.value, [id]: !open.value[id] } }
function isOpen(id) { return !!open.value[id] }
function avantageLabel(f) {
  if (f === 'featFamille') return t('mia.featFamille', { pct: remisePct.value || 35 })
  return t('mia.' + f)
}

onMounted(async () => {
  await abo.load()
  // La devise (FCFA/EUR) est pilotée par ParentMiapoView (watch sur le pays de
  // l'enfant actif) → autorité unique, pas de recalcul ici.
  // Ouvre par défaut l'accordéon de l'offre recommandée.
  const promo = abo.offres.find((o) => o.promo)
  if (promo) open.value = { [promo.id]: true }
})

const choisieType = ref('tier') // 'tier' (palier) | 'pack' (recharge de crédits)
function choisir(o) { choisie.value = o; choisieType.value = 'tier'; status.value = 'idle'; phone.value = '' }
function choisirPack(p) { choisie.value = p; choisieType.value = 'pack'; status.value = 'idle'; phone.value = '' }
function annuler() { choisie.value = null; status.value = 'idle' }

async function payer() {
  const estPack = choisieType.value === 'pack'
  const desc = (estPack ? 'Recharge MAPO+ ' : 'Abonnement MAPO+ ') + choisie.value.nom
  const ids = estPack ? { packId: choisie.value.id } : { offerId: choisie.value.id }
  // En démo (pas de compte), on simule l'encaissement pour montrer le parcours.
  if (isDemo) {
    status.value = 'pending'
    setTimeout(() => {
      estPack ? abo.activerDemoCredits(choisie.value.id) : abo.activerDemo(choisie.value.id)
      fact.ajouterDemo({
        label: desc,
        montant: abo.devise === 'EUR' ? choisie.value.prixEur : choisie.value.prix,
        devise: abo.devise,
        moyen: abo.guichet === 'stripe' ? 'Carte (démo)' : 'Mobile Money (démo)',
        type: estPack ? 'credits' : 'tier',
      })
      status.value = 'ok'
    }, 1200)
    return
  }
  // Europe → Stripe (carte) ; Afrique → Tranzak (Mobile Money). L'offre/recharge est
  // accordée CÔTÉ SERVEUR à la confirmation → on rafraîchit l'état ensuite.
  if (abo.guichet === 'stripe') {
    const r = await pay.initStripe({ amount: choisie.value.prixEur, description: desc, ...ids })
    if (!r.ok) { status.value = r.error === 'not_configured' ? 'soon' : 'error'; return }
    if (r.payment_url) window.open(r.payment_url, '_blank')
    status.value = 'pending'
    const issue = await pay.attendreResultat(r.transaction_id, { guichet: 'stripe' })
    if (issue === 'ACCEPTED') { await abo.fetchState(); status.value = 'ok' }
    else if (issue === 'REFUSED') status.value = 'refused'
    else status.value = 'timeout'
    return
  }
  const r = await pay.init({ amount: choisie.value.prix, description: desc, phone: phone.value, ...ids })
  if (!r.ok) { status.value = 'error'; return }
  if (r.payment_url) { window.open(r.payment_url, '_blank') }
  status.value = 'pending'
  const issue = await pay.attendreResultat(r.transaction_id, { guichet: 'tranzak' })
  if (issue === 'ACCEPTED') { await abo.fetchState(); status.value = 'ok' }
  else if (issue === 'REFUSED') status.value = 'refused'
  else status.value = 'timeout'
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.muted { color: var(--tx3); font-size: 14px; margin: 8px 0 0; }
.small { font-size: 12.5px; } .xsmall { font-size: 12px; }
.monthly { text-align: center; margin: 12px 0 4px; }

/* Bandeau offre famille */
.fam-note { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 14px; border-radius: 12px; background: rgba(var(--pr-rgb),.08); color: var(--tx); font-size: 13px; font-weight: 500; }
.fam-note svg { color: var(--pr); flex-shrink: 0; }

.offres { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; align-items: start; }
@media (max-width: 640px) { .offres { grid-template-columns: 1fr; } }
.offre { display: flex; flex-direction: column; gap: 10px; position: relative; }
.offre.actif { border-color: var(--pr); box-shadow: 0 0 0 1px var(--pr) inset; }
.offre.promo { border-color: var(--pr); box-shadow: 0 0 0 2px var(--pr) inset, 0 6px 20px rgba(var(--pr-rgb),.16); padding-top: 28px; }
.promo-badge { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: var(--pr); color: #fff; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
/* Nom au-dessus, prix en dessous → tient sur une ligne (devise non coupée). */
.of-head { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.of-head h4 { margin: 0; font-size: 16px; color: var(--tx); }
.of-price { white-space: nowrap; }
.of-price strong { font-size: 19px; color: var(--pr); } .of-price span { font-size: 12.5px; color: var(--tx3); }
.of-credits { font-size: 13px; font-weight: 600; color: var(--tx); background: rgba(var(--pr-rgb),.06); border-radius: 8px; padding: 6px 10px; }
.acc-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 7px 2px; border: none; background: none; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--pr); cursor: pointer; }
.acc-chev { transition: transform .2s ease; } .acc-chev.rot { transform: rotate(180deg); }
.of-feats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.of-feats li { display: flex; align-items: flex-start; gap: 6px; font-size: 13px; color: var(--tx2, #444); }
.of-feats svg { color: #1B8A5A; flex-shrink: 0; margin-top: 2px; }

/* Recharges de crédits (PAYG) */
.packs { margin-top: 16px; }
.bonus-line { display: flex; align-items: center; gap: 6px; color: #1B8A5A; font-size: 13px; font-weight: 600; margin: 8px 0 0; }
.bonus-line svg { flex-shrink: 0; }
.packs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
@media (max-width: 560px) { .packs-grid { grid-template-columns: 1fr; } }
.pack { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 12px 14px; }
.pack strong { font-size: 14px; color: var(--tx); }
.pk-qty { font-size: 12px; color: var(--tx3); }
.pk-price { font-size: 15px; font-weight: 700; color: var(--pr); margin: 2px 0 6px; }

.pay { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--tx); }
.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; background: #fff; color: var(--tx); }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pay-state { display: flex; align-items: center; gap: 10px; color: var(--tx); font-size: 14px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; } .btn-ghost { background: none; color: var(--tx3); }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.ok-line { color: #1B8A5A; font-size: 14px; font-weight: 600; margin: 6px 0 0; }
.link { background: none; border: none; color: var(--pr); cursor: pointer; font: inherit; text-decoration: underline; padding: 0; }
</style>
