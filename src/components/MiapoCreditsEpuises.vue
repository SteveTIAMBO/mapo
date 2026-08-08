<template>
  <div class="ce">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" /><circle cx="12" cy="16" r=".6" fill="currentColor" />
    </svg>

    <!-- Compte ENFANT : aucun appel à l'achat. Un mineur n'a ni moyen de paiement
         ni le droit d'en engager un ; le renvoyer vers une grille tarifaire, c'est
         lui demander quelque chose qu'il ne peut pas faire, et le mettre en
         situation de réclamer de l'argent. C'est son parent qui recharge. -->
    <template v-if="estEnfant">
      <h3>{{ t('mia.epuiseTitreEnfant') }}</h3>
      <p>{{ t('mia.epuiseTexteEnfant') }}</p>
      <div class="ce-act">
        <button class="btn-ghost" @click="$emit('quit')">{{ t('common.later') }}</button>
      </div>
    </template>

    <!-- Compte adulte (parent ou apprenant majeur) : l'offre a du sens. -->
    <template v-else>
      <h3>{{ t('mia.alerteEpuiseTitre') }}</h3>
      <p>{{ t('mia.epuiseTexteAdulte') }}</p>
      <div class="ce-act">
        <button class="btn-primary" @click="$emit('abonnement')">{{ t('mia.creditsBuy') }}</button>
        <button class="btn-ghost" @click="$emit('quit')">{{ t('common.later') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Écran « crédits épuisés », partagé par tous les exercices (quiz, appariement,
 * dictée, chat). Il existe parce que le message DIFFÈRE selon qui regarde, et
 * qu'il était auparavant recopié dans chaque exercice : la version enfant n'a
 * donc été corrigée nulle part.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'

defineEmits(['quit', 'abonnement'])
const { t } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()
// Un compte enfant est, par construction, celui d'un mineur : il est créé par un
// parent depuis son espace, jamais en autonomie.
const estEnfant = computed(() => store.isCompteEnfant)
</script>

<style scoped>
.ce {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 30px; text-align: center;
}
.ce svg { width: 30px; height: 30px; color: var(--pr); }
.ce h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--tx); }
.ce p { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tx2, #4b5563); max-width: 380px; }
.ce-act { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
</style>
