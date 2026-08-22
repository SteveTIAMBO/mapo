<template>
  <div class="util">
    <!-- Jauge de tokens (usage de la semaine) -->
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
      <!-- Le POURCENTAGE seul ne suffit pas à voir une petite consommation :
           une question de chat coûte quelques milliers de crédits, soit
           quelques pour cent, et l'utilisateur conclut que rien n'a bougé. Le
           chiffre exact tranche, lui, sans ambiguïté. -->
      <!-- Le total affiché suit la MÊME référence que la jauge : le plafond
           pour un enfant rationné, sinon la dotation complète (quota + crédits
           achetés ou offerts). Afficher « 24 600 / 25 000 » à côté d'une jauge
           à 49 % rendait les deux chiffres incompréhensibles ensemble. -->
      <p class="conso-ligne">{{ t('mia.usageConsomme', { n: fmtNombre(abo.jaugeUtilise), total: fmtNombre(abo.jaugeTotal) }) }}</p>
      <p class="muted xsmall">{{ t('mia.aboWeeklyReset') }}</p>
      <p class="muted xsmall">{{ t('mia.usageOrdre') }}</p>
      <p v-if="abo.renewAt" class="muted small">{{ t('mia.aboRenew', { date: dateFr(abo.renewAt) }) }}</p>
      <p v-if="abo.épuisé" class="err-line">{{ t('mia.aboExhausted') }}</p>
      <button class="btn btn-primary btn-sm manage" @click="openAbo">
        <CreditCard :size="15" /> <span>{{ t('mia.utilManage') }}</span>
      </button>
    </div>

    <!-- Pot de crédits de la FAMILLE.
         Il n'était affiché nulle part : un parent qui venait d'ajouter 200 000
         crédits ne les voyait pas, puisque cet écran ne montrait que sa jauge
         hebdomadaire. Or c'est ce pot, et non sa jauge, qui sert à ses enfants
         une fois leur quota personnel épuisé. -->
    <div v-if="abo.potFamille > 0 || abo.bonus > 0" class="card pot-card">
      <div class="ac-head">
        <div>
          <span class="ac-label">{{ t('mia.potTitre') }}</span>
          <h3>{{ fmtNombre(abo.potFamille || abo.bonus) }}</h3>
        </div>
        <Wallet :size="22" class="pot-ico" />
      </div>
      <p class="muted small">{{ t('mia.potHint') }}</p>
    </div>

    <!-- Consommation de CHAQUE enfant.
         La jauge du parent ne lui apprend rien : il ne révise pas, elle reste
         pleine pendant que son enfant est bloqué. C'est celle-ci qu'il vient
         chercher. -->
    <div v-if="enfantsAffiches.length" class="card enfants-card">
      <div class="ac-head"><div><span class="ac-label">{{ t('mia.usageEnfantsTitre') }}</span></div></div>
      <div v-for="e in enfantsAffiches" :key="e.enfantId" class="enf-ligne">
        <div class="enf-head">
          <strong>{{ e.prenom }}</strong>
          <span class="enf-reste">{{ fmtNombre(e.conso) }}</span>
        </div>
        <!-- Barre seulement s'il y a un plafond : sans limite, une barre
             n'aurait aucun repère et laisserait croire à un quota. -->
        <div v-if="e.plafond > 0" class="ac-bar"><div class="ac-bar-fill" :class="e.classe" :style="{ width: e.pct + '%' }"></div></div>
        <p class="muted xsmall enf-note">
          {{ e.plafond > 0 ? t('mia.enfConsoPlafond', { n: fmtNombre(e.conso), max: fmtNombre(e.plafond) }) : t('mia.enfConsoLibre', { n: fmtNombre(e.conso) }) }}
        </p>
        <div class="enf-plaf">
          <label class="form-label">{{ t('mia.plafondLabel') }}</label>
          <input v-model.number="brouillonPlafond[e.enfantId]" class="input plaf-input" type="number" min="0" step="5000" :placeholder="t('mia.plafondAucun')" />
          <button class="btn btn-outline btn-sm" @click="enregistrerPlafond(e.enfantId)">{{ t('mia.saved2') }}</button>
        </div>
      </div>
      <p class="muted xsmall">{{ t('mia.usageEnfantsHint') }}</p>
    </div>

    <!-- Cycle mensuel (facturation) : progression jusqu'au renouvellement -->
    <div v-if="abo.renewAt" class="card cycle-card">
      <div class="ac-head">
        <div><span class="ac-label">{{ t('mia.cycleMonth') }}</span></div>
        <div class="ac-credits"><strong>{{ joursRestants }}</strong><span>{{ t('mia.cycleDaysLeft') }}</span></div>
      </div>
      <div class="ac-bar"><div class="ac-bar-fill is-ok" :style="{ width: cyclePct + '%' }"></div></div>
      <p class="muted small">{{ t('mia.aboRenew', { date: dateFr(abo.renewAt) }) }}</p>
    </div>

    <p class="muted small hint">{{ t('mia.utilHint') }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAbonnementStore } from '../stores/abonnement'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { CreditCard, Wallet } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const abo = useAbonnementStore()
const enfantsStore = useEnfantsAutonomesStore()

// On croise ce que le serveur renvoie (consommation, par enfantId) avec les
// prénoms connus du client : le serveur n'a pas à connaître les prénoms.
const enfantsAffiches = computed(() => (abo.enfantsUsage || []).map((u) => {
  const e = (enfantsStore.enfants || []).find((x) => x.id === u.enfantId)
  // Sans plafond il n'y a rien à remplir : la barre n'a de sens que rapportée
  // à une limite fixée par le parent.
  const pct = u.plafond > 0 ? Math.min(100, Math.round(((u.conso || 0) / u.plafond) * 100)) : 0
  return {
    enfantId: u.enfantId,
    prenom: e?.firstName || t('mia.usageEnfantInconnu'),
    conso: u.conso || 0,
    plafond: u.plafond || 0,
    pct,
    classe: pct >= 90 ? 'is-danger' : pct >= 70 ? 'is-warn' : 'is-ok',
  }
}))

function fmtNombre(n) { return Number(n || 0).toLocaleString('fr-FR') }

// Plafond par enfant : c'est un RÉGLAGE réversible, pas un transfert. Rien
// n'est immobilisé sur le compte de l'enfant, et le reste du pot demeure
// disponible pour la fratrie.
const brouillonPlafond = ref({})
async function enregistrerPlafond(enfantId) {
  const v = Number(brouillonPlafond.value[enfantId]) || 0
  await abo.definirPlafondEnfant(enfantId, v)
}

const restePct = computed(() => Math.max(0, 100 - abo.pourcentage))
const jaugeClass = computed(() => abo.pourcentage >= 90 ? 'is-danger' : abo.pourcentage >= 70 ? 'is-warn' : 'is-ok')
// Cycle mensuel : jours restants + progression jusqu'au renouvellement (tierExpiry).
const cycleJours = computed(() => abo.offre?.cycleJours || 30)
const joursRestants = computed(() => { if (!abo.renewAt) return 0; const ms = new Date(abo.renewAt) - new Date(); return Math.max(0, Math.ceil(ms / 86400000)) })
const cyclePct = computed(() => Math.min(100, Math.max(0, Math.round((1 - joursRestants.value / cycleJours.value) * 100))))

onMounted(async () => {
  await abo.load()
  // Un compte ENFANT n'a rien à surveiller : cette vue est celle du parent.
  if (enfantsStore.isCompteEnfant) return
  const ids = (enfantsStore.enfants || []).map((e) => e.id).filter(Boolean)
  if (ids.length) {
    await abo.fetchEnfantsUsage(ids)
    for (const u of abo.enfantsUsage) brouillonPlafond.value[u.enfantId] = u.plafond || null
  }
})
function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }
// Ouvre Paramètres → Abonnement (upgrade / achat de crédits).
function openAbo() { window.dispatchEvent(new CustomEvent('open-miapo-settings', { detail: { tab: 'abonnement' } })) }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
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
.hint { margin-top: 14px; }
.cycle-card { margin-top: 16px; }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.manage { margin-top: 14px; }

/* Pot de crédits de la famille + consommation par enfant. */
.pot-card, .enfants-card { margin-top: 16px; }
.pot-card .ac-head { align-items: center; }
.pot-ico { color: var(--pr); flex-shrink: 0; }
.pot-card h3 { margin: 2px 0 0; font-size: 22px; }
.enfants-card .enf-ligne { margin-top: 14px; }
.enf-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.enf-head strong { font-size: 14.5px; color: var(--tx); }
.enf-reste { font-size: 13px; font-weight: 700; color: var(--tx3, #6b7280); }
.enf-reste.warn { color: #b45309; }
.enf-note { margin: 5px 0 0; }
.enf-plaf { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.enf-plaf .form-label { font-size: 12px; color: var(--tx3); margin: 0; }
.plaf-input { width: 120px; }
.btn-outline { background: transparent; border: 1px solid var(--bd, #e5e7eb); color: var(--tx); }
.conso-ligne { margin: 6px 0 0; font-size: 13px; font-weight: 600; color: var(--tx2, #4b5563); }
</style>
