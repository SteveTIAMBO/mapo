<template>
  <div class="mrd">
    <div class="card">
      <div class="card-head">
        <Landmark :size="18" />
        <h3>Redevance EDUFREM, par pays</h3>
      </div>
      <p class="muted">
        Le taux et les coordonnées de versement valent pour <strong>toutes les écoles
        d'un pays</strong>. Chaque école lit ici combien elle doit et où verser ;
        elle ne peut rien y changer. La redevance est due dès qu'un élève passe
        « inscrit », c'est-à-dire au premier paiement de la famille.
      </p>

      <p v-if="store.erreur" class="err-line">
        Lecture du barème impossible ({{ store.erreur }}). Les écoles verront le taux
        par défaut de {{ TAUX_DEFAUT }} % et aucune coordonnée.
      </p>

      <div class="mrd-pays">
        <button
          v-for="p in PAYS" :key="p.code"
          class="mrd-onglet" :class="{ active: paysActif === p.code }"
          type="button" @click="choisirPays(p.code)"
        >
          {{ p.nom }}
          <!-- Distinguer « pas encore renseigné » de « renseigné » : un pays vide
               laisse ses écoles sans moyen de payer, il faut que ça se voie. -->
          <span v-if="!store.paysRenseigne(p.code)" class="mrd-pastille">à faire</span>
        </button>
      </div>

      <div class="mrd-form">
        <div class="form-group">
          <label class="form-label" for="mrd-taux">Taux de commission</label>
          <div class="mrd-taux">
            <input id="mrd-taux" v-model.number="fiche.taux" class="input" type="number" min="0" max="100" step="0.5" />
            <span class="muted">% de la scolarité annuelle</span>
          </div>
          <small class="muted xsmall">
            Prélevé une seule fois par élève et par année. {{ TAUX_DEFAUT }} % est le
            modèle en vigueur ; un pilote peut avoir un taux négocié.
          </small>
        </div>
        <div class="form-group grow">
          <label class="form-label" for="mrd-titulaire">Titulaire du compte</label>
          <input id="mrd-titulaire" v-model="fiche.titulaire" class="input" placeholder="Ex. EDUFREM SAS" />
        </div>
      </div>

      <div class="mrd-form">
        <div class="form-group grow">
          <label class="form-label" for="mrd-rib">Virement bancaire (IBAN / RIB)</label>
          <input id="mrd-rib" v-model="fiche.rib" class="input" placeholder="Laisser vide si l'on ne verse pas par banque dans ce pays" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mrd-banque">Banque</label>
          <input id="mrd-banque" v-model="fiche.banque" class="input" />
        </div>
      </div>

      <div class="mrd-form">
        <div class="form-group">
          <label class="form-label" for="mrd-om">Orange Money</label>
          <input id="mrd-om" v-model="fiche.orangeMoney" class="input" placeholder="Ex. +237 6XX XXX XXX" />
        </div>
        <div class="form-group grow">
          <label class="form-label" for="mrd-note">Note affichée à l'école</label>
          <input id="mrd-note" v-model="fiche.note" class="input" placeholder="Ex. préciser le nom de l'école en référence du virement" />
        </div>
      </div>

      <!-- ⚠️ Ni RIB ni Orange Money : l'école ne PEUT pas payer. On le dit avant
           d'enregistrer, plutôt que de la laisser découvrir un écran vide. -->
      <p v-if="aucunMoyen" class="mrd-avert">
        Aucun moyen de versement renseigné pour ce pays. Les écoles concernées liront
        « coordonnées non renseignées » et devront te les demander.
      </p>

      <div class="mrd-actions">
        <button class="btn btn-primary btn-sm" :disabled="busy" @click="enregistrer">
          <component :is="busy ? Loader2 : Check" :size="15" :class="{ spin: busy }" />
          <span>Enregistrer pour {{ nomPaysActif }}</span>
        </button>
        <span v-if="message" class="mrd-msg" :class="{ err: erreur }">{{ message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Landmark, Check, Loader2 } from 'lucide-vue-next'
import { useRedevancesStore, TAUX_DEFAUT, baremeVide } from '../../stores/redevances'
import { PAYS_DEMO, CODES_PAYS_DEMO } from '../../data/paysDemo'

/**
 * Barème de redevance EDUFREM — un écran EDUFREM, pas un écran école.
 *
 * Décision de Steve (28/08/2026) : « le taux et les coordonnées plutôt par pays,
 * pas par école ». Les règles Firestore le verrouillent aussi : `edufrem/{doc}`
 * n'est écrit que par un super-admin.
 *
 * ⚠️ Aucune coordonnée n'est pré-remplie et rien n'est deviné : un RIB
 * plausible mais faux enverrait l'argent d'une école ailleurs.
 */
const store = useRedevancesStore()

// Les pays servis sont ceux du catalogue MAPO — même source que la démo et les
// barèmes de paie, pour qu'un pays ajouté un jour apparaisse ici sans y penser.
const PAYS = CODES_PAYS_DEMO.map((code) => ({ code, nom: PAYS_DEMO[code].nom }))

const paysActif = ref(PAYS[0]?.code || 'CM')
const fiche = reactive(baremeVide(paysActif.value))
const busy = ref(false)
const message = ref('')
const erreur = ref(false)

const nomPaysActif = computed(() => PAYS.find((p) => p.code === paysActif.value)?.nom || paysActif.value)
const aucunMoyen = computed(() => !String(fiche.rib || '').trim() && !String(fiche.orangeMoney || '').trim())

function charger(code) {
  Object.assign(fiche, store.baremePays(code))
  message.value = ''
  erreur.value = false
}

function choisirPays(code) {
  paysActif.value = code
  charger(code)
}

async function enregistrer() {
  busy.value = true
  message.value = ''
  erreur.value = false
  const r = await store.enregistrer(paysActif.value, { ...fiche })
  busy.value = false
  if (r.ok) {
    message.value = `Barème enregistré pour ${nomPaysActif.value}.`
    return
  }
  erreur.value = true
  // On nomme le motif : « échec » sans raison laisse l'opérateur réessayer à
  // l'identique.
  message.value = {
    taux: 'Le taux doit être un nombre entre 0 et 100.',
    interdit: "Réservé à l'équipe EDUFREM.",
    pays: 'Choisis un pays.',
  }[r.reason] || `Échec de l'enregistrement (${r.reason}).`
}

onMounted(async () => {
  await store.charger(true)
  charger(paysActif.value)
})
</script>

<style scoped>
.mrd { display: flex; flex-direction: column; gap: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.card-head h3 { margin: 0; font-size: 15px; }
.muted { color: var(--tx3); font-size: 13px; line-height: 1.5; }
.xsmall { font-size: 11.5px; }

.mrd-pays { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 18px; }
.mrd-onglet {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 12px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--divider); background: transparent;
  color: var(--tx2); font-size: 13px; font-weight: 600;
}
.mrd-onglet.active {
  border-color: rgba(var(--pr-rgb), .45);
  background: rgba(var(--pr-rgb), .10);
  color: var(--pr);
}
/* « à faire » plutôt qu'une couleur seule : un pays non renseigné doit se lire,
   pas se devenir. */
.mrd-pastille {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; color: #A33227;
}

.mrd-form { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
.form-group.grow { flex: 1 1 320px; }
.form-label { font-size: 12.5px; font-weight: 600; color: var(--tx2); }
.mrd-taux { display: flex; align-items: center; gap: 8px; }
.mrd-taux .input { max-width: 110px; }

.mrd-avert {
  margin: 0 0 14px; padding: 10px 12px; border-radius: 10px;
  font-size: 13px; line-height: 1.5;
  background: rgba(var(--pr-rgb), .07); color: var(--tx);
}
.mrd-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mrd-msg { font-size: 13px; color: var(--tx2); }
.mrd-msg.err, .err-line { color: #A33227; font-size: 13px; }
.spin { animation: mrd-spin 1s linear infinite; }
@keyframes mrd-spin { to { transform: rotate(360deg); } }
</style>
