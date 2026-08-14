<template>
  <div class="chap">
    <button type="button" class="chap-back" @click="$emit('quitter')">
      <ChevronLeft :size="16" /> <span>Retour</span>
    </button>

    <div class="card chap-card">
      <BookOpen :size="30" />
      <h3>Qu’est-ce que tu veux réviser en {{ matiere }} ?</h3>
      <p>
        Écris-le avec tes mots — un chapitre, une leçon, ce qui tombe au prochain
        contrôle. MIAPO préparera les questions là-dessus.
      </p>

      <!-- Reprise en un clic : au bout de deux séances, c'est le chemin le plus
           utilisé (on révise rarement un chapitre une seule fois). -->
      <div v-if="recents.length" class="chap-recents">
        <button v-for="c in recents" :key="c" type="button" class="chap-chip" @click="valider(c)">
          <RotateCcw :size="13" /> <span>{{ c }}</span>
        </button>
      </div>

      <form class="chap-form" @submit.prevent="valider(texte)">
        <input
          ref="champ" v-model="texte" type="text" class="chap-input"
          :maxlength="MAX_LONGUEUR" :placeholder="exemple" autocomplete="off"
        />
        <button class="btn btn-primary" type="submit" :disabled="!nettoyerChapitre(texte)">
          <ArrowRight :size="15" /><span>Commencer</span>
        </button>
      </form>

      <!-- Toujours une sortie : celui qui ne sait pas quoi réviser est
           justement celui qu'il ne faut pas bloquer à l'entrée. -->
      <button type="button" class="btn btn-ghost btn-sm" @click="$emit('passer')">
        Je ne sais pas, MIAPO choisit
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Demande du chapitre à réviser, en langage naturel.
 *
 * S'affiche uniquement quand MAPO n'est pas relié : sans l'école, MIAPO ignore
 * où en est l'élève dans le programme. Voir src/utils/chapitreLibre.js pour le
 * détail de la décision.
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { BookOpen, ChevronLeft, ArrowRight, RotateCcw } from 'lucide-vue-next'
import { chapitresRecents, memoriserChapitre, nettoyerChapitre, MAX_LONGUEUR } from '../utils/chapitreLibre'

const props = defineProps({
  matiere: { type: String, required: true },
  studentId: { type: String, default: '' },
})
const emit = defineEmits(['choisi', 'passer', 'quitter'])

const texte = ref('')
const champ = ref(null)
const recents = ref(chapitresRecents(props.studentId, props.matiere))

// Exemple adapté à la matière : un placeholder générique n'aide personne à
// comprendre le niveau de détail attendu.
const exemple = computed(() => {
  const m = String(props.matiere || '').toLowerCase()
  if (m.includes('math')) return 'ex. les fractions, le théorème de Pythagore…'
  if (m.includes('angl') || m.includes('engl')) return 'ex. le présent simple, le vocabulaire de la ville…'
  if (m.includes('fran')) return 'ex. l’accord du participe passé, le passé simple…'
  if (m.includes('hist') || m.includes('géo') || m.includes('geo')) return 'ex. la colonisation, le relief du Cameroun…'
  if (m.includes('phys') || m.includes('chim')) return 'ex. les forces, les atomes…'
  if (m.includes('svt') || m.includes('bio')) return 'ex. la digestion, la photosynthèse…'
  return 'ex. le chapitre 3, la leçon d’hier…'
})

function valider(v) {
  const propre = nettoyerChapitre(v)
  if (!propre) return
  memoriserChapitre(props.studentId, props.matiere, propre)
  emit('choisi', propre)
}

onMounted(async () => { await nextTick(); if (champ.value) champ.value.focus() })
</script>

<style scoped>
.chap-back {
  display: inline-flex; align-items: center; gap: 5px; margin-bottom: 10px;
  padding: 6px 10px 6px 6px; border: none; border-radius: 9px; background: transparent;
  color: var(--tx3, #6b7280); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.chap-back:hover { background: rgba(120,120,128,.12); color: var(--tx); }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 18px; padding: 26px 22px; }
.chap-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
.chap-card > svg { color: var(--pr); }
.chap h3 { margin: 0; font-size: 18px; color: var(--tx); }
.chap p { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--tx2, #4b5563); max-width: 440px; }
.chap-recents { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 4px; }
.chap-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
  border: 1px solid var(--bd, #e5e7eb); border-radius: 20px; background: #fff;
  font-size: 13px; color: var(--tx2, #4b5563); cursor: pointer; font-family: inherit;
}
.chap-chip:hover { border-color: var(--pr); color: var(--pr); }
.chap-chip svg { color: var(--tx3, #9ca3af); flex-shrink: 0; }
.chap-chip:hover svg { color: var(--pr); }
.chap-form { display: flex; gap: 8px; width: 100%; max-width: 460px; margin-top: 8px; flex-wrap: wrap; }
.chap-input {
  flex: 1 1 220px; min-width: 0; padding: 12px 14px; font-size: 15px; font-family: inherit;
  border: 1.5px solid var(--bd, #e5e7eb); border-radius: 12px; color: var(--tx); background: #fff;
}
.chap-input:focus { outline: none; border-color: var(--pr); }
</style>
