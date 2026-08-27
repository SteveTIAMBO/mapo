<!--
  Un seul bouton pour « faire entrer un document », partout dans MAPO+.

  ⚠️ CE QU'IL REMPLACE (Steve, 27/08). Chaque écran s'était fait son propre
  geste, et aucun ne proposait les deux : l'emploi du temps avait un `<label>`
  déguisé en bouton qui ouvrait DIRECTEMENT l'appareil photo (`capture`), la
  copie d'examen aussi, le module Cours avait deux boutons côte à côte. Résultat :
  un emploi du temps reçu en PDF obligeait à photographier son propre écran.

  Un seul bouton, deux choix explicites — importer un fichier, ou photographier.

  `capture="environment"` n'est posé QUE sur l'entrée photo. Le retirer de
  l'entrée fichier ne retire pas l'appareil photo : le sélecteur du téléphone le
  propose toujours, parmi les fichiers. L'y forcer, en revanche, interdit le PDF.
-->
<template>
  <div ref="racine" class="bi-wrap">
    <button
      type="button" class="btn btn-outline btn-sm bi-btn"
      :disabled="disabled || busy"
      :aria-expanded="ouvert" aria-haspopup="menu"
      @click="ouvert = !ouvert"
    >
      <Loader2 v-if="busy" :size="15" class="bi-spin" />
      <Upload v-else :size="15" />
      <span>{{ busy ? (labelOccupe || t('mia.impBusy')) : (label || t('mia.impLabel')) }}</span>
      <ChevronDown v-if="!busy" :size="14" class="bi-chev" />
    </button>

    <div v-if="ouvert" class="bi-menu" role="menu">
      <button type="button" class="bi-item" role="menuitem" @click="choisir('fichier')">
        <FileUp :size="16" />
        <span>
          <strong>{{ t('mia.impMenuFile') }}</strong>
          <small v-if="aideFichier">{{ aideFichier }}</small>
        </span>
      </button>
      <button type="button" class="bi-item" role="menuitem" @click="choisir('photo')">
        <Camera :size="16" />
        <span>
          <strong>{{ t('mia.impMenuPhoto') }}</strong>
          <small>{{ t('mia.impMenuPhotoHint') }}</small>
        </span>
      </button>
    </div>

    <!-- Deux entrées distinctes : c'est l'attribut `capture` qui les sépare, et
         il ne peut pas être posé conditionnellement sans réinitialiser l'entrée. -->
    <input ref="entreeFichier" type="file" :accept="accept" class="bi-hidden" @change="onChange" />
    <input ref="entreePhoto" type="file" accept="image/*" capture="environment" class="bi-hidden" @change="onChange" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload, Camera, FileUp, ChevronDown, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  /** Types acceptés à l'import fichier (l'entrée photo reste `image/*`). */
  accept: { type: String, default: 'image/*,application/pdf,.pdf' },
  label: { type: String, default: '' },
  labelOccupe: { type: String, default: '' },
  /** Précision affichée sous « Importer un fichier » (ex. « PDF, image, .ics »). */
  aideFichier: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['fichier'])
const { t } = useI18n({ useScope: 'global' })

const ouvert = ref(false)
const racine = ref(null)
const entreeFichier = ref(null)
const entreePhoto = ref(null)

function choisir(quoi) {
  ouvert.value = false
  const cible = quoi === 'photo' ? entreePhoto.value : entreeFichier.value
  if (cible) cible.click()
}

function onChange(e) {
  const f = e.target.files?.[0]
  // ⚠️ Vider l'entrée AVANT d'émettre : sans ça, choisir deux fois le même
  // fichier ne déclenche aucun `change` (la valeur n'a pas bougé) et l'écran
  // paraît figé alors que rien n'est cassé.
  if (e.target) e.target.value = ''
  if (f) emit('fichier', f)
}

function fermerSiDehors(e) {
  if (ouvert.value && racine.value && !racine.value.contains(e.target)) ouvert.value = false
}
function fermerSiEchap(e) { if (e.key === 'Escape') ouvert.value = false }
onMounted(() => {
  document.addEventListener('click', fermerSiDehors)
  document.addEventListener('keydown', fermerSiEchap)
})
onUnmounted(() => {
  document.removeEventListener('click', fermerSiDehors)
  document.removeEventListener('keydown', fermerSiEchap)
})
</script>

<style scoped>
.bi-wrap { position: relative; display: inline-block; }
.bi-btn { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.bi-chev { opacity: .55; }
.bi-hidden { display: none; }
.bi-spin { animation: bi-rot 1s linear infinite; }
@keyframes bi-rot { to { transform: rotate(360deg); } }

.bi-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
  min-width: 244px; padding: 6px;
  background: #fff; border: 1px solid rgba(0, 0, 0, .08); border-radius: 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .13);
}
.bi-item {
  display: flex; align-items: flex-start; gap: 10px; width: 100%;
  padding: 9px 10px; border: 0; border-radius: 9px;
  background: transparent; text-align: left; cursor: pointer; color: inherit;
}
.bi-item:hover, .bi-item:focus-visible { background: rgba(0, 0, 0, .045); }
.bi-item svg { margin-top: 1px; flex: 0 0 auto; opacity: .75; }
.bi-item strong { display: block; font-size: 13.5px; font-weight: 600; }
.bi-item small { display: block; margin-top: 1px; font-size: 11.5px; opacity: .6; }

/* Sur mobile le menu se colle au bord droit de l'écran s'il déborde. */
@media (max-width: 480px) {
  .bi-menu { min-width: 210px; }
}
</style>
