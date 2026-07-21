<template>
  <!-- Logo MAPO+ : un « M » dont la dernière branche verticale (à droite) est
       RACCOURCIE, et un « + » distinct posé sous elle, à la hauteur de la base
       du M, sans toucher la barre (deux traits séparés). -->
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- M : branche droite raccourcie (s'arrête à mi-hauteur) -->
    <path d="M9 40 V11 L24 30 L39 11 V24" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" />
    <!-- + distinct, sous la branche droite, base alignée sur celle du M -->
    <path d="M33 34 H45" stroke="currentColor" :stroke-width="plusStroke" stroke-linecap="round" />
    <path d="M39 28 V40" stroke="currentColor" :stroke-width="plusStroke" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  stroke: { type: Number, default: 5 },
  plusStroke: { type: Number, default: 4 },
})
</script>
