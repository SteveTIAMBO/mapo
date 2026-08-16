<template>
  <div class="card am">
    <div class="card-head"><Plus :size="18" /><h3>Ajouter une matière</h3></div>
    <p class="muted small">
      Une matière qui n'est pas au programme de ta classe — pour prendre de
      l'avance, ou par curiosité. Elle s'ajoute à tes matières, elle ne remplace
      rien. MIAPO te fera d'abord un test pour trouver ton niveau.
    </p>

    <div v-if="ajoutees.length" class="am-mes">
      <span v-for="m in ajoutees" :key="m" class="am-chip">
        {{ m }}
        <button type="button" :aria-label="'Retirer ' + m" @click="retirer(m)"><X :size="13" /></button>
      </span>
    </div>

    <div v-for="g in proposees" :key="g.groupe" class="am-groupe">
      <span class="am-gtitre">{{ g.groupe }}</span>
      <div class="am-liste">
        <button v-for="m in g.matieres" :key="m" type="button" class="am-btn" @click="ajouter(m)">
          <Plus :size="13" /> <span>{{ m }}</span>
        </button>
      </div>
    </div>

    <form class="am-libre" @submit.prevent="ajouter(saisie)">
      <input v-model="saisie" type="text" class="am-input" maxlength="40" placeholder="Autre matière…" />
      <button class="btn btn-outline btn-sm" type="submit" :disabled="!nettoyerMatiere(saisie)">Ajouter</button>
    </form>
  </div>
</template>

<script setup>
/**
 * Ajout d'une matière hors programme.
 *
 * Le catalogue proposé se limite aux matières où un modèle de langue
 * généraliste est fiable : l'application génère les questions par IA, et une
 * matière dont l'IA inventerait le contenu serait pire que pas de matière.
 * Voir src/utils/matieresSup.js pour le détail de ce choix.
 */
import { ref, computed } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { proposablesPour, ajouterMatiere, retirerMatiere, nettoyerMatiere } from '../utils/matieresSup'

const props = defineProps({
  // Matières du programme officiel (non retirables).
  base: { type: Array, default: () => [] },
  // Matières déjà ajoutées par l'apprenant.
  ajoutees: { type: Array, default: () => [] },
})
const emit = defineEmits(['changer'])

const saisie = ref('')
const proposees = computed(() => proposablesPour(props.base, props.ajoutees))

function ajouter(nom) {
  const suivante = ajouterMatiere(props.ajoutees, nom)
  if (suivante !== props.ajoutees) emit('changer', suivante)
  saisie.value = ''
}
function retirer(nom) { emit('changer', retirerMatiere(props.ajoutees, nom)) }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.card-head h3 { margin: 0; font-size: 16px; color: var(--tx); }
.card-head svg { color: var(--pr); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 6px 0 0; }
.small { font-size: 13px; }
.am-mes { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
.am-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px;
  border-radius: 20px; background: rgba(var(--pr-rgb, 21, 88, 176), .10);
  color: var(--pr); font-size: 13px; font-weight: 600;
}
.am-chip button {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 50%;
  background: rgba(var(--pr-rgb, 21, 88, 176), .16); color: var(--pr); cursor: pointer;
}
.am-groupe { margin-top: 14px; }
.am-gtitre {
  display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; color: var(--tx3, #9ca3af); margin-bottom: 7px;
}
.am-liste { display: flex; flex-wrap: wrap; gap: 8px; }
.am-btn {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px;
  border: 1px solid var(--bd, #e5e7eb); border-radius: 20px; background: #fff;
  font-size: 13px; color: var(--tx2, #4b5563); cursor: pointer; font-family: inherit;
}
.am-btn:hover { border-color: var(--pr); color: var(--pr); }
.am-libre { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.am-input {
  flex: 1 1 180px; min-width: 0; padding: 10px 12px; font-family: inherit;
  border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; color: var(--tx); background: #fff;
}
.am-input:focus { outline: none; border-color: var(--pr); }
</style>
