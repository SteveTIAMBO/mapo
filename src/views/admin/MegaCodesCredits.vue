<template>
  <div class="mcc">
    <div class="card">
      <div class="card-head">
        <Gift :size="18" />
        <h3>Offrir des crédits</h3>
      </div>
      <p class="muted">
        Un code donne des crédits IA à une famille ou à un apprenant, sans passer
        par un paiement. Il sert aux écoles pilotes, aux familles témoins et aux
        tests. Les crédits arrivent sur le compte de celui qui saisit le code, et
        ses enfants y puisent automatiquement.
      </p>

      <div class="mcc-form">
        <div class="form-group">
          <label class="form-label" for="mcc-tokens">Crédits offerts</label>
          <input id="mcc-tokens" v-model.number="tokens" class="input" type="number" min="1000" step="25000" />
          <small class="muted xsmall">{{ equivalence }}</small>
        </div>
        <div class="form-group">
          <label class="form-label" for="mcc-usages">Nombre de comptes</label>
          <input id="mcc-usages" v-model.number="usages" class="input" type="number" min="1" max="1000" />
          <small class="muted xsmall">Chaque compte ne peut l’utiliser qu’une fois.</small>
        </div>
        <div class="form-group grow">
          <label class="form-label" for="mcc-note">Note interne</label>
          <input id="mcc-note" v-model="note" class="input" placeholder="Ex. Pilote Extrême-Nord, lot 1" />
        </div>
      </div>

      <button class="btn btn-primary btn-sm" :disabled="busy || !tokens" @click="creer">
        <component :is="busy ? Loader2 : Gift" :size="15" :class="{ spin: busy }" />
        <span>Générer le code</span>
      </button>
      <p v-if="erreur" class="err-line">{{ erreur }}</p>
    </div>

    <!-- Codes générés pendant cette session.
         Le serveur ne les relit pas : le registre n'est pas exposé en lecture,
         par choix (un code lisible est un code utilisable). On les garde donc
         sous les yeux le temps de les recopier. -->
    <div v-if="codes.length" class="card">
      <div class="card-head"><Check :size="18" /><h3>Codes générés</h3></div>
      <p class="muted small">Recopiez-les maintenant : ils ne sont pas relisibles ensuite.</p>
      <div v-for="c in codes" :key="c.code" class="mcc-code">
        <div>
          <strong class="mcc-val">{{ c.code }}</strong>
          <span class="muted xsmall">{{ fmt(c.tokens) }} crédits · {{ c.usages }} compte(s)<template v-if="c.note"> · {{ c.note }}</template></span>
        </div>
        <button class="btn btn-outline btn-sm" @click="copier(c.code)">{{ copie === c.code ? 'Copié' : 'Copier' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * MegaAdmin — génération des codes de crédits MAPO+.
 *
 * Cet écran vit dans MegaAdmin et non dans le HUB : générer un code modifie
 * l'ÉTAT DU PRODUIT (le registre de crédits du serveur MAPO), il ne décrit pas
 * une relation commerciale. Le HUB pourra plus tard afficher « ce prospect a
 * reçu tel code », comme un fait rattaché au compte — c'est une lecture, pas
 * l'acte lui-même.
 *
 * L'autorisation est vérifiée CÔTÉ SERVEUR : mapo-pay.php relit
 * `superAdmins/{uid}` avec le jeton de l'appelant. Cacher le bouton ne protège
 * rien, c'est le refus du serveur qui protège.
 */
import { ref, computed } from 'vue'
import { auth } from '../../firebase'
import { Gift, Loader2, Check } from 'lucide-vue-next'
import { OFFRE_GRATUITE } from '../../config/offres'

const tokens = ref(250000)
const usages = ref(1)
const note = ref('')
const busy = ref(false)
const erreur = ref('')
const codes = ref([])
const copie = ref('')

// Un nombre de crédits ne parle à personne : on le rapporte à la semaine
// gratuite, qui est le repère de tout le monde.
const equivalence = computed(() => {
  const cap = OFFRE_GRATUITE.capTokens || 25000
  const n = Math.round((Number(tokens.value) || 0) / cap)
  return n >= 1 ? `Environ ${n} semaine(s) d’usage gratuit` : 'Moins d’une semaine d’usage gratuit'
})

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

async function creer() {
  erreur.value = ''
  busy.value = true
  try {
    const t = auth.currentUser ? await auth.currentUser.getIdToken() : null
    if (!t) { erreur.value = 'Session expirée, reconnectez-vous.'; return }
    const r = await fetch('/mapo-pay.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify({ action: 'code_creer', tokens: tokens.value, usages: usages.value, note: note.value }),
    })
    const d = await r.json().catch(() => null)
    if (!d || !d.ok) {
      erreur.value = d && d.error === 'non_superadmin'
        ? 'Votre compte n’est pas super administrateur EDUFREM.'
        : 'Le code n’a pas pu être généré.'
      return
    }
    codes.value.unshift({ code: d.code, tokens: d.tokens, usages: d.usages, note: note.value })
    note.value = ''
  } catch {
    erreur.value = 'Serveur injoignable.'
  } finally {
    busy.value = false
  }
}

async function copier(code) {
  try { await navigator.clipboard.writeText(code); copie.value = code; setTimeout(() => { copie.value = '' }, 1500) } catch { /* presse-papiers refusé */ }
}
</script>

<style scoped>
.mcc { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.card-head h3 { margin: 0; font-size: 16px; color: var(--tx); }
.card-head svg { color: var(--pr); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 6px 0 0; }
.small { font-size: 12.5px; } .xsmall { font-size: 12px; display: block; margin-top: 4px; }
.mcc-form { display: flex; gap: 12px; flex-wrap: wrap; margin: 14px 0; }
.form-group { display: flex; flex-direction: column; min-width: 150px; }
.form-group.grow { flex: 1; min-width: 220px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--tx3); margin-bottom: 5px; }
.input { padding: 9px 12px; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; font-family: inherit; font-size: 14px; }
.mcc-code {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 0; border-top: 1px solid var(--bd, #e5e7eb); flex-wrap: wrap;
}
.mcc-val {
  display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 19px; letter-spacing: .1em; color: var(--tx);
}
.err-line { color: #b91c1c; font-size: 13px; margin: 10px 0 0; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
