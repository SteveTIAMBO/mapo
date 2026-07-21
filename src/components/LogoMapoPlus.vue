<template>
  <!-- Logo MAPO+ : un « M » dont la dernière branche (à droite) est RACCOURCIE,
       et un « + » DISTINCT (couleur différente, légèrement décalé) posé à la base
       à droite — pour bien lire « M + » et non une croix. -->
  <svg :width="size" :height="size" viewBox="0 0 66 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8 40 V12 L23 31 L38 12 V40" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- + DISTINCT : couleur propre + espace net à droite du M (deux traits) -->
    <path d="M50 35 H60" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
    <path d="M55 30 V40" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  stroke: { type: Number, default: 5 },
  plusStroke: { type: Number, default: 4.5 },
  plusColor: { type: String, default: '#111318' },
})
</script>
