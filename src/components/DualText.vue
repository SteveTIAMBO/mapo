<template>
  <span class="dualtext">{{ text }}<small v-if="sec" class="dualtext2" dir="auto">{{ sec }}</small></span>
</template>

<script setup>
// Affiche un libellé + sa traduction dans la SECONDE LANGUE en sous-titre (si
// activée). Sûr à poser sur n'importe quel titre/bouton/texte court.
import { computed } from 'vue'
import { useLangue2Store } from '../stores/langue2'
const props = defineProps({ text: { type: String, default: '' } })
const lang2 = useLangue2Store()
const sec = computed(() => (lang2.enabled ? lang2.tr(props.text) : ''))
</script>

<style scoped>
.dualtext { display: inline-flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.dualtext2 { font-size: 0.72em; font-weight: 500; color: var(--tx3, #9098a6); opacity: 0.9; white-space: normal; }
</style>
