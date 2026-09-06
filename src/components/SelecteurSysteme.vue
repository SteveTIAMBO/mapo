<template>
  <!-- Rien du tout dans une école à un seul système : ni bouton, ni espace, ni
       question. Une école qui n'est pas bilingue ne doit jamais apprendre que
       cette notion existe. -->
  <div v-if="school.estBilingue" class="sys-chips" role="group" :aria-label="t('sys.aria')">
    <button
      type="button"
      class="chip"
      :class="{ active: !filtre.actif }"
      @click="filtre.choisir('')"
    >{{ t('sys.tous') }}</button>
    <button
      v-for="s in school.systemes"
      :key="s"
      type="button"
      class="chip"
      :class="{ active: filtre.actif === s }"
      @click="filtre.choisir(s)"
    >{{ t('sys.' + s) }}</button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useSchoolStore } from '../stores/school'
import { useSystemeFiltreStore } from '../stores/systemeFiltre'

const { t } = useI18n()
const school = useSchoolStore()
const filtre = useSystemeFiltreStore()
</script>

<style scoped>
.sys-chips { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
