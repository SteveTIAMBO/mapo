<template>
  <div v-if="e" class="rc">
    <div class="card">
      <div class="card-head"><Gift :size="18" /><h3>Échanger mes points</h3></div>
      <p class="muted small">
        Tes points de la semaine servent au classement, et tu peux aussi les
        échanger contre des révisions supplémentaires avec MIAPO.
      </p>

      <div class="rc-solde">
        <span class="rc-pts">{{ e.points }}</span>
        <span class="rc-lb">points cette semaine</span>
      </div>

      <!-- Barre de progression vers la prochaine conversion : voir qu'il reste
           80 points fait revenir ; « pas assez » tout seul décourage. -->
      <div class="rc-bar"><div class="rc-fill" :style="{ width: pct + '%' }"></div></div>
      <p class="muted xsmall rc-cible">
        {{ e.coutConversion }} points = {{ fmt(e.tokensParConversion) }} crédits MIAPO,
        de quoi faire une révision de plus.
      </p>

      <button
        class="btn btn-primary rc-cta"
        :disabled="!e.peutConvertir || points.chargement"
        @click="echanger"
      >
        <component :is="points.chargement ? Loader2 : ArrowLeftRight" :size="15" :class="{ spin: points.chargement }" />
        <span>Échanger {{ e.coutConversion }} points</span>
      </button>

      <!-- On dit POURQUOI c'est indisponible. Un bouton grisé sans explication
           se lit comme une panne. -->
      <p v-if="!e.peutConvertir" class="muted xsmall rc-why">
        <template v-if="e.conversionsRestantes === 0">
          Tu as atteint le maximum d'échanges pour ce mois-ci. Tes points
          continuent de compter pour le classement, et le compteur repart au
          mois prochain.
        </template>
        <template v-else>
          Il te manque {{ e.coutConversion - e.points }} points. Encore une ou
          deux révisions.
        </template>
      </p>
      <p v-else class="muted xsmall rc-why">
        Encore {{ e.conversionsRestantes }} échange{{ e.conversionsRestantes > 1 ? 's' : '' }} possible{{ e.conversionsRestantes > 1 ? 's' : '' }} ce mois-ci.
      </p>

      <p v-if="message" class="rc-msg" :class="{ ok: messageOk }">{{ message }}</p>
      <p v-if="points.horsLigne" class="muted xsmall">
        Hors connexion : tes points seront comptés à ton retour en ligne.
      </p>
    </div>

    <!-- Bons partenaires : aucun partenaire n'est signé à ce jour. On annonce
         le palier atteint SANS promettre de bon précis — promettre à un enfant
         un avantage qu'on ne peut pas livrer se paierait cher. -->
    <div class="card">
      <div class="card-head"><Store :size="18" /><h3>Bons partenaires</h3></div>
      <p class="muted small">
        À partir de {{ fmt(e.seuilBon) }} points gagnés au total, tu fais partie
        des apprenants les plus assidus. EDUFREM prépare des avantages chez des
        enseignes éducatives : librairies, papeteries, centres de formation.
      </p>
      <p class="muted small rc-cumul">Tu en es à <strong>{{ fmt(e.totalCumule) }}</strong> points gagnés.</p>

      <template v-if="e.bonEligible">
        <button v-if="!e.bonDemande" class="btn btn-outline" @click="points.demanderBon()">
          <Bell :size="15" /><span>Me prévenir quand c'est prêt</span>
        </button>
        <p v-else class="muted xsmall">
          C'est noté. On te préviendra dès qu'un partenariat est ouvert dans ton pays.
        </p>
      </template>
      <p v-else class="muted xsmall">Encore {{ fmt(e.seuilBon - e.totalCumule) }} points pour y être.</p>
    </div>
  </div>
</template>

<script setup>
/**
 * Échange des points d'effort contre des crédits MIAPO. d'effort contre des crédits MIAPO.
 *
 * Tout ce qui compte ici est décidé par le SERVEUR : le solde, le droit
 * d'échanger, le plafond mensuel. Cet écran ne fait qu'afficher et demander ;
 * il ne calcule aucun montant. C'était la condition pour que des points aient
 * une valeur — un total tenu par le navigateur serait forgeable.
 */
import { computed, ref, onMounted } from 'vue'
import { Gift, Store, Bell, ArrowLeftRight, Loader2 } from 'lucide-vue-next'
import { useRecompensesPointsStore } from '../stores/recompensesPoints'

const points = useRecompensesPointsStore()
const e = computed(() => points.etat)
const message = ref('')
const messageOk = ref(false)

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0)
const pct = computed(() => {
  if (!e.value || !e.value.coutConversion) return 0
  return Math.min(100, Math.round((e.value.points / e.value.coutConversion) * 100))
})

async function echanger() {
  message.value = ''
  const r = await points.convertir()
  if (r && r.ok) {
    messageOk.value = true
    message.value = `${fmt(r.tokens)} crédits ajoutés. Bien joué.`
  } else {
    messageOk.value = false
    message.value = r && r.error === 'plafond_mensuel'
      ? 'Maximum d’échanges atteint pour ce mois-ci.'
      : 'Échange impossible pour le moment.'
  }
}

onMounted(() => points.charger())
</script>

<style scoped>
.rc { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.card-head h3 { margin: 0; font-size: 16px; color: var(--tx); }
.card-head svg { color: var(--pr); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 6px 0 0; }
.small { font-size: 13px; } .xsmall { font-size: 12px; }
.rc-solde { display: flex; align-items: baseline; gap: 8px; margin: 14px 0 8px; }
.rc-pts { font-size: 30px; font-weight: 800; color: var(--pr); font-family: 'Poppins', sans-serif; line-height: 1; }
.rc-lb { font-size: 13px; color: var(--tx3, #6b7280); }
.rc-bar { height: 8px; border-radius: 5px; background: rgba(var(--pr-rgb, 21, 88, 176), .10); overflow: hidden; }
.rc-fill { height: 100%; background: var(--pr); border-radius: 5px; transition: width .35s ease; }
.rc-cible { margin-top: 7px; }
.rc-cta { margin-top: 12px; }
.rc-why { margin-top: 8px; }
.rc-cumul { margin-top: 10px; }
.rc-msg { margin: 10px 0 0; font-size: 13.5px; font-weight: 600; color: #b91c1c; }
.rc-msg.ok { color: #16a34a; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
