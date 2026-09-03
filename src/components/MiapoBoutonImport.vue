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

  ⚠️ LE MENU EST TÉLÉPORTÉ, ET C'EST INDISPENSABLE (Steve, 03/09/2026, mesuré en
  prod). Il était en `position: absolute` dans son parent. Ouvert depuis la
  modale « Ajouter un document » de Mes cours, il débordait DEUX fois :

    • verticalement — le menu allait de y=573 à y=700, le corps de la modale
      s'arrête à y=626 avec `overflow: auto` : 74 px sur 127 étaient CLIPPÉS ;
    • horizontalement — `right: 0` sur un bouton dont le bord droit est à x=160,
      pour un menu de 244 px de large : `left: -84`, soit 84 px hors écran.

  Il ne restait qu'une bande inutilisable. Steve : « la modale qui s'affiche est
  invisible, impossible de cliquer sur PDF ou prendre une photo. »

  D'où `Teleport` vers `<body>` + `position: fixed`, positionné à partir du rect
  du bouton, avec bascule vers le HAUT s'il n'y a pas la place en bas et
  recadrage horizontal dans la fenêtre. Aucun `overflow` d'ancêtre ne peut plus
  le rogner — ce composant sert aussi dans l'emploi du temps, la copie d'examen
  et le bulletin, tous dans des conteneurs à `overflow` différents.
-->
<template>
  <div ref="racine" class="bi-wrap">
    <button
      type="button" class="btn btn-outline btn-sm bi-btn"
      :disabled="disabled || busy"
      :aria-expanded="ouvert" aria-haspopup="menu"
      @click="basculer"
    >
      <Loader2 v-if="busy" :size="15" class="bi-spin" />
      <Upload v-else :size="15" />
      <span>{{ busy ? (labelOccupe || t('mia.impBusy')) : (label || t('mia.impLabel')) }}</span>
      <ChevronDown v-if="!busy" :size="14" class="bi-chev" />
    </button>

    <Teleport to="body">
      <div v-if="ouvert" ref="menu" class="bi-menu" role="menu" :style="styleMenu">
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
    </Teleport>

    <!-- Deux entrées distinctes : c'est l'attribut `capture` qui les sépare, et
         il ne peut pas être posé conditionnellement sans réinitialiser l'entrée. -->
    <input ref="entreeFichier" type="file" :accept="accept" class="bi-hidden" @change="onChange" />
    <input ref="entreePhoto" type="file" accept="image/*" capture="environment" class="bi-hidden" @change="onChange" />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
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
const menu = ref(null)
const styleMenu = ref({})
const entreeFichier = ref(null)
const entreePhoto = ref(null)

const MARGE = 8

/**
 * Place le menu à partir du rect du BOUTON, en coordonnées de la fenêtre.
 *
 * ⚠️ On mesure APRÈS le rendu (`nextTick`) : la hauteur du menu dépend du texte
 * d'aide, qui varie d'un écran à l'autre. La deviner ferait retomber le menu
 * hors de l'écran là où l'aide est longue — c'est-à-dire précisément là où on
 * l'a écrite parce qu'elle était utile.
 */
function positionner() {
  const bouton = racine.value?.querySelector('.bi-btn')
  if (!bouton || !menu.value) return
  const b = bouton.getBoundingClientRect()
  const m = menu.value.getBoundingClientRect()
  // Aligné à droite du bouton, puis RAMENÉ dans la fenêtre. C'est ce recadrage
  // qui manquait : `right: 0` donnait `left: -84` sur un écran étroit.
  const gauche = Math.min(Math.max(MARGE, b.right - m.width), window.innerWidth - m.width - MARGE)
  // En bas si ça tient, sinon au-dessus du bouton, sinon collé en bas.
  let haut = b.bottom + 6
  if (haut + m.height > window.innerHeight - MARGE) {
    const dessus = b.top - m.height - 6
    haut = dessus >= MARGE ? dessus : Math.max(MARGE, window.innerHeight - m.height - MARGE)
  }
  styleMenu.value = { top: Math.round(haut) + 'px', left: Math.round(gauche) + 'px' }
}

async function basculer() {
  if (ouvert.value) { ouvert.value = false; return }
  // Hors écran tant qu'on ne l'a pas mesuré : sans ça, le menu apparaît une
  // frame en haut à gauche avant de sauter à sa place.
  styleMenu.value = { top: '-9999px', left: '-9999px' }
  ouvert.value = true
  await nextTick()
  positionner()
}

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
  if (!ouvert.value) return
  // ⚠️ Le menu n'est plus DANS `racine` (téléporté vers <body>) : le tester
  // aussi, sinon un clic sur « Importer un fichier » refermerait le menu avant
  // que l'entrée fichier ne s'ouvre.
  const dedans = (racine.value && racine.value.contains(e.target))
    || (menu.value && menu.value.contains(e.target))
  if (!dedans) ouvert.value = false
}
function fermerSiEchap(e) { if (e.key === 'Escape') ouvert.value = false }
// Le menu est ancré à des coordonnées de FENÊTRE : dès que la page bouge, elles
// ne valent plus rien. On ferme plutôt que d'afficher un menu qui a décroché de
// son bouton. `capture: true` pour attraper aussi le défilement d'un conteneur
// interne (le corps de la modale), qui ne remonte pas jusqu'à `window`.
function fermerSiBouge() { if (ouvert.value) ouvert.value = false }
onMounted(() => {
  document.addEventListener('click', fermerSiDehors)
  document.addEventListener('keydown', fermerSiEchap)
  window.addEventListener('scroll', fermerSiBouge, true)
  window.addEventListener('resize', fermerSiBouge)
})
onUnmounted(() => {
  document.removeEventListener('click', fermerSiDehors)
  document.removeEventListener('keydown', fermerSiEchap)
  window.removeEventListener('scroll', fermerSiBouge, true)
  window.removeEventListener('resize', fermerSiBouge)
})
</script>

<style scoped>
.bi-wrap { position: relative; display: inline-block; }
.bi-btn { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.bi-chev { opacity: .55; }
.bi-hidden { display: none; }
.bi-spin { animation: bi-rot 1s linear infinite; }
@keyframes bi-rot { to { transform: rotate(360deg); } }

/* ⚠️ `fixed` + z-index AU-DESSUS des modales (`.mc-modal-fond` est à 9800).
   Le menu vit maintenant dans <body> : aucun `overflow` d'ancêtre ne le rogne,
   et sa position vient de `styleMenu`. Ne pas remettre `absolute` ici. */
.bi-menu {
  position: fixed; z-index: 9900;
  width: 244px; max-width: calc(100vw - 16px); padding: 6px;
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

@media (max-width: 480px) {
  .bi-menu { width: 210px; }
}
</style>
