<template>
  <!-- Logo MAPO+ : un « M » dont la dernière branche verticale (à droite) porte
       un « + » à sa base (barre horizontale qui croise le pied de la branche). -->
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 40 V11 L24 31 L39 11 V40" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- barre du + à la base de la dernière branche (à droite) -->
    <path d="M33 35 H45" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  stroke: { type: Number, default: 5 },
})
</script>
