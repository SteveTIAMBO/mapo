<template>
  <!-- Logo MAPO+ : un « M » dont la dernière branche verticale (à droite) porte
       un « + » à sa base (barre horizontale qui croise le pied de la branche). -->
  <svg :width="size" :height="size" viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- M -->
    <path d="M8 39 V12 L22 30 L36 12 V39" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- + séparé du M, à la base à droite (deux traits distincts) -->
    <path d="M40 35 H48" stroke="currentColor" :stroke-width="plusStroke" stroke-linecap="round" />
    <path d="M44 31 V39" stroke="currentColor" :stroke-width="plusStroke" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  stroke: { type: Number, default: 5 },
  plusStroke: { type: Number, default: 4 },
})
</script>
