<template>
  <!-- Logo MAPO+ : un « M » dont la dernière branche (à droite) est RACCOURCIE,
       et un « + » DISTINCT (couleur différente, légèrement décalé) posé à la base
       à droite — pour bien lire « M + » et non une croix. -->
  <svg :width="size" :height="size" viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 40 V11 L24 30 L39 11 V24" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- + distinct : couleur propre + décalé à droite de la branche -->
    <path d="M38 35 H48" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
    <path d="M43 30 V40" :stroke="plusColor" :stroke-width="plusStroke" stroke-linecap="round" />
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
