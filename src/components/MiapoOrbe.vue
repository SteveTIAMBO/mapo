<template>
  <!-- Orbe MIAPO : sphère sombre vivante (deux lumières qui orbitent à
       l'intérieur), reprise de l'orbe du site edufrem.com. Purement décorative. -->
  <span class="orbe" :class="{ 'is-static': frozen }" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <span class="orbe-sphere">
      <span class="orbe-light"></span>
      <span class="orbe-light orbe-light-2"></span>
    </span>
  </span>
</template>

<script setup>
// `frozen` = orbe figée (pas d'animation) — pour les petits marqueurs IA.
defineProps({
  size: { type: Number, default: 54 },
  frozen: { type: Boolean, default: false },
})
</script>

<style scoped>
.orbe { display: grid; place-items: center; position: relative; flex-shrink: 0; }
.orbe::before {
  content: ''; position: absolute; inset: -12%; border-radius: 50%;
  background: radial-gradient(circle, rgba(142, 36, 169, .5), rgba(0, 119, 180, .28), transparent 70%);
  filter: blur(9px); opacity: .6; z-index: -1;
}
.orbe-sphere {
  position: relative; width: 100%; height: 100%; border-radius: 50%;
  overflow: hidden; isolation: isolate;
  background: radial-gradient(circle at 50% 40%, #1c2140 0%, #0a0a14 80%);
  border: 1px solid rgba(255, 255, 255, .16);
  box-shadow: 0 6px 22px -6px rgba(142, 36, 169, .55), 0 0 16px rgba(0, 119, 180, .35);
}
.orbe-light {
  position: absolute; top: 50%; left: 50%; width: 72%; height: 72%; margin: -36% 0 0 -36%;
  border-radius: 50%; filter: blur(5px); mix-blend-mode: screen;
  background: radial-gradient(circle, rgba(255, 255, 255, .95) 0%, rgba(160, 90, 220, .55) 38%, transparent 70%);
  animation: orbe-a 5s ease-in-out infinite;
}
.orbe-light-2 {
  width: 58%; height: 58%; margin: -29% 0 0 -29%;
  background: radial-gradient(circle, rgba(180, 225, 255, .85) 0%, rgba(0, 160, 210, .4) 45%, transparent 72%);
  animation: orbe-b 6.5s ease-in-out infinite;
}
@keyframes orbe-a {
  0%   { transform: translate(-16%, -12%) scale(1); }
  25%  { transform: translate(15%, -14%) scale(1.12); }
  50%  { transform: translate(17%, 14%) scale(1); }
  75%  { transform: translate(-14%, 16%) scale(1.12); }
  100% { transform: translate(-16%, -12%) scale(1); }
}
@keyframes orbe-b {
  0%   { transform: translate(14%, 12%) scale(1.05); }
  25%  { transform: translate(-15%, 14%) scale(.95); }
  50%  { transform: translate(-16%, -13%) scale(1.05); }
  75%  { transform: translate(15%, -15%) scale(.95); }
  100% { transform: translate(14%, 12%) scale(1.05); }
}
/* Orbe figée (petits marqueurs) : lumières positionnées, sans animation. */
.orbe.is-static .orbe-light { animation: none; transform: translate(-15%, -17%) scale(1.06); }
.orbe.is-static .orbe-light-2 { animation: none; transform: translate(16%, 15%) scale(1); }
</style>
