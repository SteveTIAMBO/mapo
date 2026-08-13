<template>
  <div class="pos">
    <!-- Retour toujours accessible, à toutes les étapes. Sans lui, l'apprenant
         qui ouvrait une matière par erreur était pris au piège de l'écran de
         positionnement — la seule sortie était de changer de section. -->
    <button type="button" class="pos-back" @click="$emit('quitter')">
      <ChevronLeft :size="16" /> <span>Retour</span>
    </button>
    <!-- Proposition : on demande, on n'impose pas. Un apprenant pressé doit
         pouvoir réviser tout de suite. -->
    <div v-if="etape === 'invitation'" class="card pos-invit">
      <Compass :size="30" />
      <h3>Avant de commencer en {{ matiere }}</h3>
      <p>
        Huit questions rapides pour trouver ton point de départ. Ce n’est pas noté,
        et personne ne le verra : ça sert juste à ce que MIAPO ne te propose ni
        trop facile, ni trop dur.
      </p>
      <div class="pos-act">
        <button class="btn btn-primary" :disabled="busy" @click="lancer">
          <component :is="busy ? Loader2 : Compass" :size="15" :class="{ spin: busy }" />
          <span>Trouver mon niveau</span>
        </button>
        <button class="btn btn-ghost" @click="$emit('passer')">Commencer directement</button>
      </div>
      <p v-if="erreur" class="err-line">{{ erreur }}</p>
    </div>

    <!-- Le test. Volontairement SANS minuteur et SANS score affiché : on mesure
         un niveau, on ne met pas la pression au premier contact. -->
    <div v-else-if="etape === 'test'" class="card pos-test">
      <div class="pos-head">
        <span class="pos-compteur">Question {{ index + 1 }} / {{ questions.length }}</span>
        <div class="pos-bar"><div class="pos-fill" :style="{ width: (index / questions.length * 100) + '%' }"></div></div>
      </div>
      <h2 class="pos-q">{{ courante.q }}</h2>
      <div class="pos-choix">
        <button v-for="(c, i) in courante.choices" :key="i" class="pos-choice" @click="repondre(i)">
          <span class="pos-lettre">{{ 'ABCD'[i] }}</span>
          <span>{{ c }}</span>
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" @click="$emit('passer')">Passer le test</button>
    </div>

    <!-- Résultat : on nomme ce que l'apprenant a montré, jamais ce qui lui
         manque. C'est son premier contact avec la matière ici. -->
    <div v-else class="card pos-fin">
      <Sparkles :size="30" />
      <h3>C’est parti</h3>
      <p>{{ message }}</p>
      <p class="pos-palier">Niveau de départ : {{ palier }} sur 5</p>
      <button class="btn btn-primary" @click="$emit('termine', palier)">Commencer à réviser</button>
    </div>
  </div>
</template>

<script setup>
/**
 * Test de positionnement au lancement d'une matière.
 *
 * Sans bulletin — le cas courant en B2C — tout le monde démarrait au palier 1.
 * Un élève à l'aise s'ennuyait plusieurs séances avant que l'adaptation le
 * rattrape, et abandonnait avant.
 *
 * Trois partis pris :
 *   - c'est une PROPOSITION, jamais un passage obligé ;
 *   - pas de minuteur, pas de score affiché : on situe, on ne juge pas ;
 *   - le résultat dit ce que l'apprenant maîtrise, pas ce qui lui manque.
 */
import { ref, computed } from 'vue'
import { Compass, Loader2, Sparkles, ChevronLeft } from 'lucide-vue-next'
import { useTuteurStore } from '../stores/tuteur'
import { palierDeDepart, messagePositionnement } from '../utils/positionnement'

const props = defineProps({
  matiere: { type: String, required: true },
  niveau: { type: String, default: '' },
  themes: { type: String, default: '' },
})
const emit = defineEmits(['termine', 'passer', 'quitter'])

const tuteur = useTuteurStore()
const etape = ref('invitation') // invitation | test | fin
const busy = ref(false)
const erreur = ref('')
const questions = ref([])
const index = ref(0)
const reponses = ref([])
const palier = ref(1)

const courante = computed(() => questions.value[index.value] || { q: '', choices: [] })
const message = computed(() => messagePositionnement(palier.value, props.matiere))

async function lancer() {
  busy.value = true
  erreur.value = ''
  const r = await tuteur.genererPositionnement({ matiere: props.matiere, niveau: props.niveau, themes: props.themes })
  busy.value = false
  if (!r.ok) {
    // On ne bloque JAMAIS l'accès à la révision sur l'échec du positionnement :
    // c'est un confort, pas une porte.
    erreur.value = r.reason === 'credits_epuises' || r.reason === 'plafond_atteint'
      ? 'Test indisponible pour le moment. Tu peux commencer directement.'
      : 'Test indisponible. Tu peux commencer directement.'
    return
  }
  questions.value = r.questions
  index.value = 0
  reponses.value = []
  etape.value = 'test'
}

function repondre(i) {
  const q = courante.value
  reponses.value.push({ niveau: Number(q.niveau) || 1, correct: i === q.answer })
  if (index.value + 1 < questions.value.length) {
    index.value++
  } else {
    palier.value = palierDeDepart(reponses.value)
    etape.value = 'fin'
  }
}
</script>

<style scoped>
.pos-back {
  display: inline-flex; align-items: center; gap: 5px; margin-bottom: 10px;
  padding: 6px 10px 6px 6px; border: none; border-radius: 9px; background: transparent;
  color: var(--tx3, #6b7280); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.pos-back:hover { background: rgba(120,120,128,.12); color: var(--tx); }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 18px; padding: 26px 22px; }
.pos-invit, .pos-fin { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
.pos-invit > svg, .pos-fin > svg { color: var(--pr); }
.pos h3 { margin: 0; font-size: 18px; color: var(--tx); }
.pos p { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--tx2, #4b5563); max-width: 420px; }
.pos-act { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.pos-palier { font-weight: 700; color: var(--pr); }
.pos-head { margin-bottom: 16px; }
.pos-compteur { font-size: 12px; font-weight: 700; color: var(--tx3, #6b7280); }
.pos-bar { height: 6px; border-radius: 4px; background: rgba(var(--pr-rgb,21,88,176),.10); overflow: hidden; margin-top: 6px; }
.pos-fill { height: 100%; background: var(--pr); border-radius: 4px; transition: width .3s ease; }
.pos-q { font-size: 18px; line-height: 1.4; color: var(--tx); margin: 0 0 16px; }
.pos-choix { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.pos-choice {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1.5px solid var(--bd, #e5e7eb); border-radius: 12px; background: #fff;
  cursor: pointer; font-size: 15px; text-align: left; color: var(--tx); font-family: inherit;
  transition: border-color .15s, background .15s;
}
.pos-choice:hover { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.03); }
.pos-lettre {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,.05);
  font-weight: 700; font-size: 13px;
}
.err-line { color: #b91c1c; font-size: 13px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
