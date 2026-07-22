<template>
  <!-- Logo MAPO+ : un « M » (couleur du texte) et un « + » DISTINCT, à côté du M,
       GROS (proportionnel à la hauteur du M) et de couleur CLAIRE (bleu clair),
       centré verticalement — pour lire « MAPO + » sans effet de croix. -->
  <svg :width="size" :height="size" viewBox="0 0 70 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8 40 V12 L23 31 L38 12 V40" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- + : bleu clair, plus gros, centré sur la hauteur du M (y ≈ 12→40, centre 26) -->
    <path d="M46 26 H64" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
    <path d="M55 17 V35" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  stroke: { type: Number, default: 5 },
  plusStroke: { type: Number, default: 5 },
  plusColor: { type: String, default: '#4C9FFF' },
})
</script>
