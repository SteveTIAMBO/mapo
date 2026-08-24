<template>
  <div class="card mf">
    <div class="card-head"><ListChecks :size="18" /><h3>{{ t('mia.myModules') }}</h3></div>
    <p class="muted small">{{ t('mia.modulesHint') }}</p>

    <p v-if="!modules.length" class="muted small mf-vide">{{ t('mia.modulesEmpty') }}</p>

    <div v-else class="mf-liste">
      <template v-for="m in modules" :key="m">
        <form v-if="enEdition === m" class="mf-edit" @submit.prevent="validerRenommage(m)">
          <input
            ref="champEdition" v-model="saisieEdition" type="text" class="mf-input" maxlength="60"
            @keyup.esc="annulerRenommage"
          />
          <button class="btn btn-outline btn-sm" type="submit" :disabled="!saisieEdition.trim()">
            {{ t('mia.moduleSave') }}
          </button>
          <button class="btn btn-outline btn-sm" type="button" @click="annulerRenommage">
            {{ t('mia.moduleCancel') }}
          </button>
        </form>
        <span v-else class="mf-chip">
          <button type="button" class="mf-nom" :title="t('mia.moduleRename')" @click="ouvrirRenommage(m)">{{ m }}</button>
          <button type="button" class="mf-x" :aria-label="t('mia.moduleRemove') + ' ' + m" @click="retirer(m)">
            <X :size="13" />
          </button>
        </span>
      </template>
    </div>

    <form class="mf-ajout" @submit.prevent="ajouter()">
      <input v-model="saisie" type="text" class="mf-input" maxlength="60" :placeholder="t('mia.modulePlaceholder')" />
      <button class="btn btn-outline btn-sm" type="submit" :disabled="!saisie.trim()">
        <Plus :size="13" /> <span>{{ t('mia.moduleAdd') }}</span>
      </button>
    </form>
  </div>
</template>

<script setup>
/**
 * Liste éditable des modules d'une formation hors catalogue.
 *
 * POURQUOI. Les modules d'un MBA, d'un BTS ou d'une prépa concours ne viennent
 * d'aucun référentiel : ils sont proposés par l'IA à partir du NOM de la
 * formation, donc parfois à côté. Jusqu'ici l'apprenant ne pouvait pas les
 * corriger — le module « Ajouter une matière » de Mes cours reçoit un catalogue
 * VIDE pour une formation hors catalogue, et écrit dans un champ que la liste du
 * Tuteur ne lit pas. Restait un champ à virgules, dans Paramètres.
 *
 * Ce composant ne connaît PAS le stockage : il reçoit la chaîne, émet la
 * nouvelle chaîne. Toute la logique (doublons, casse, virgule interdite dans un
 * intitulé) vit dans utils/modulesFormation.js, avec ses tests.
 */
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListChecks, Plus, X } from 'lucide-vue-next'
import { listeModules, ajouterModule, retirerModule, renommerModule } from '../utils/modulesFormation'

const props = defineProps({
  // Chaîne stockée dans le profil (`formationModules`).
  valeur: { type: String, default: '' },
})
const emit = defineEmits(['changer'])
const { t } = useI18n({ useScope: 'global' })

const modules = computed(() => listeModules(props.valeur))
const saisie = ref('')
const enEdition = ref('')
const saisieEdition = ref('')
const champEdition = ref(null)

function ajouter() {
  const suivant = ajouterModule(props.valeur, saisie.value)
  saisie.value = ''
  if (suivant !== props.valeur) emit('changer', suivant)
}

function retirer(nom) {
  const suivant = retirerModule(props.valeur, nom)
  if (suivant !== props.valeur) emit('changer', suivant)
}

async function ouvrirRenommage(nom) {
  enEdition.value = nom
  saisieEdition.value = nom
  await nextTick()
  // `champEdition` est un tableau : le champ vit dans un v-for.
  const el = Array.isArray(champEdition.value) ? champEdition.value[0] : champEdition.value
  el?.focus()
}

function annulerRenommage() { enEdition.value = ''; saisieEdition.value = '' }

function validerRenommage(ancien) {
  const suivant = renommerModule(props.valeur, ancien, saisieEdition.value)
  annulerRenommage()
  if (suivant !== props.valeur) emit('changer', suivant)
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 4px; }
.card-head h3 { margin: 0; font-size: 16px; color: var(--tx); }
.card-head svg { color: var(--pr); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 6px 0 0; }
.small { font-size: 13px; }
.mf-vide { margin-top: 14px; font-style: italic; }
.mf-liste { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
.mf-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 6px 4px 4px;
  border-radius: 20px; background: rgba(var(--pr-rgb, 21, 88, 176), .10); color: var(--pr);
}
.mf-nom {
  border: none; background: none; font-family: inherit; font-size: 13px; font-weight: 600;
  color: inherit; cursor: text; padding: 3px 4px 3px 8px; border-radius: 16px;
}
.mf-nom:hover { background: rgba(var(--pr-rgb, 21, 88, 176), .12); }
.mf-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 50%;
  background: rgba(var(--pr-rgb, 21, 88, 176), .16); color: var(--pr); cursor: pointer;
}
.mf-edit, .mf-ajout { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mf-edit { margin: 14px 0 4px; }
.mf-ajout { margin-top: 16px; }
.mf-input {
  flex: 1 1 180px; min-width: 0; padding: 10px 12px; font-family: inherit;
  border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; color: var(--tx); background: #fff;
}
.mf-input:focus { outline: none; border-color: var(--pr); }
.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px;
  font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit;
  border: 1px solid var(--bd, #e5e7eb); background: #fff; color: var(--tx2, #4b5563);
}
.btn:hover:not(:disabled) { border-color: var(--pr); color: var(--pr); }
.btn:disabled { opacity: .5; cursor: default; }
</style>
