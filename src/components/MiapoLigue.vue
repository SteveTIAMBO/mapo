<template>
  <!-- Ligue MASQUÉE tant que la population est trop faible pour qu'un
       classement veuille dire quelque chose. « 1er sur 1 » ne motive personne
       et donne l'image d'un produit vide, précisément aux premiers arrivés.
       ⚠️ Les points continuent d'être comptés : le jour de l'ouverture,
       personne ne repart de zéro. Voir MIN_LIGUE_VISIBLE. -->
  <div v-if="ligueVisible" class="lg">
    <div class="card">
      <div class="card-head">
        <Trophy :size="18" />
        <h3>Classement de la semaine</h3>
      </div>
      <p class="muted small">
        Tu es avec des élèves de {{ niveau || 'ton niveau' }}. Le classement compte
        ton <strong>travail</strong>, pas tes notes : réviser régulièrement rapporte
        plus qu'un sans-faute isolé. Tout repart à zéro chaque lundi.
      </p>

      <p v-if="ligue.chargement" class="muted small">Chargement du classement…</p>

      <!-- Ligue vide : on le DIT, au lieu d'afficher un tableau vide qui laisse
           croire à une panne. -->
      <p v-else-if="!ligue.membres.length" class="muted small vide">
        Personne n'est encore classé cette semaine. Termine une révision et tu
        seras le premier.
      </p>

      <ol v-else class="lg-liste">
        <li
          v-for="(m, i) in ligue.membres" :key="m.uid"
          class="lg-ligne" :class="[zone(i + 1), { moi: m.uid === monUid }]"
        >
          <span class="lg-rang">{{ i + 1 }}</span>
          <span class="lg-nom">{{ m.prenom || 'Un apprenant' }}<span v-if="m.uid === monUid" class="lg-moi">toi</span></span>
          <span class="lg-pts">{{ m.points }}</span>
        </li>
      </ol>

      <!-- Les zones ne sont annoncées QUE si elles s'appliquent : dans une
           cohorte qui démarre, personne ne monte ni ne descend, et promettre
           une promotion qu'on ne donnera pas serait un mensonge. -->
      <p v-if="ligue.membres.length >= MIN_LIGUE_CLASSANTE" class="muted xsmall lg-regle">
        Les {{ PROMUS }} premiers montent d'une ligue lundi.
        <template v-if="ligue.membres.length >= TAILLE_LIGUE">
          Les {{ RELEGUES }} derniers descendent.
        </template>
      </p>
    </div>

    <!-- Détail des derniers points gagnés : un point gagné sans savoir pourquoi
         n'encourage rien. -->
    <div v-if="detail && detail.length" class="card lg-gain">
      <div class="card-head"><Sparkles :size="18" /><h3>Tes derniers points</h3></div>
      <ul class="lg-detail">
        <li v-for="(d, i) in detail" :key="i"><span>{{ d.libelle }}</span><strong>+{{ d.points }}</strong></li>
      </ul>
    </div>
  </div>
</template>

<script setup>
/**
 * Classement de ligue — vue de l'apprenant.
 *
 * Rappels de conception, pour qui reprendra ce fichier :
 *   - on classe sur l'EFFORT, pas sur la maîtrise. Un élève en difficulté qui
 *     travaille chaque jour doit pouvoir finir premier ;
 *   - la ligue est petite (~30) : être 7e sur 30 fait revenir, être 4 512e
 *     écrase. C'est pour ça qu'il n'y a pas de classement mondial ;
 *   - on n'affiche QUE le prénom. Ce sont des mineurs.
 */
import { computed, onMounted, watch } from 'vue'
import { Trophy, Sparkles } from 'lucide-vue-next'
import { auth } from '../firebase'
import { useLigueStore } from '../stores/ligue'
import { zoneClassement, PROMUS, RELEGUES, TAILLE_LIGUE, MIN_LIGUE_CLASSANTE, MIN_LIGUE_VISIBLE } from '../utils/pointsEffort'

const props = defineProps({
  niveau: { type: String, default: '' },
  // Détail des points de la dernière séance, remonté par le quiz.
  detail: { type: Array, default: () => [] },
})

const ligue = useLigueStore()
const monUid = computed(() => (auth.currentUser ? auth.currentUser.uid : null))
function zone(rang) { return zoneClassement(rang, ligue.membres.length) }

// Le classement ne s'affiche qu'à partir d'une population qui le rend sensé.
// On charge la ligue quand même : c'est elle qui nous dit combien ils sont.
const ligueVisible = computed(() => ligue.membres.length >= MIN_LIGUE_VISIBLE)

onMounted(() => ligue.charger(props.niveau))
// Changer d'enfant depuis l'espace parent change de ligue : sans ça on
// afficherait le classement du frère.
watch(() => props.niveau, (n) => ligue.charger(n))
</script>

<style scoped>
.lg { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.card-head h3 { margin: 0; font-size: 16px; color: var(--tx); }
.card-head svg { color: var(--pr); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 6px 0 0; }
.small { font-size: 13px; } .xsmall { font-size: 12px; }
.vide { font-style: italic; }
.lg-liste { list-style: none; margin: 14px 0 0; padding: 0; }
.lg-ligne {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px; border-radius: 10px; font-size: 14.5px;
}
.lg-ligne + .lg-ligne { margin-top: 2px; }
/* La ligne de l'apprenant est mise en avant par un FOND teinté, jamais par une
   bordure gauche colorée (règle de design maison). */
.lg-ligne.moi { background: rgba(var(--pr-rgb,21,88,176),.09); font-weight: 700; }
.lg-ligne.promotion .lg-rang { background: #16a34a; color: #fff; }
.lg-ligne.relegation .lg-rang { background: #d1d5db; color: #6b7280; }
.lg-rang {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(0,0,0,.05); font-size: 12.5px; font-weight: 700;
}
.lg-nom { flex: 1; color: var(--tx); display: flex; align-items: center; gap: 8px; }
.lg-moi {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.14);
  padding: 2px 7px; border-radius: 20px;
}
.lg-pts { font-weight: 700; color: var(--pr); }
.lg-regle { margin-top: 12px; }
.lg-detail { list-style: none; margin: 10px 0 0; padding: 0; }
.lg-detail li {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 7px 0; font-size: 14px; color: var(--tx2, #4b5563);
}
.lg-detail li + li { border-top: 1px solid var(--bd, #e5e7eb); }
.lg-detail strong { color: #16a34a; }
</style>
