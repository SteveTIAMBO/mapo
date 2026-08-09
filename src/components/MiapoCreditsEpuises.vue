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
      <!-- `btn` porte la forme et l'espacement, `btn-primary`/`btn-ghost` ne
           donnent que la couleur : sans les deux, les boutons se rendaient en
           texte brut. -->
      <div class="ce-act">
        <button v-if="!prevenu" class="btn btn-primary" :disabled="envoiEnCours" @click="prevenirParent">
          <BellRing :size="15" />
          <span>{{ t('mia.epuisePrevenirParent') }}</span>
        </button>
        <span v-else class="ce-ok"><Check :size="15" /> {{ dejaFait ? t('mia.epuiseParentPrevenuDejaFait') : t('mia.epuiseParentPrevenu') }}</span>
        <button class="btn btn-ghost" @click="$emit('quit')">{{ t('common.later') }}</button>
      </div>
    </template>

    <!-- Compte adulte (parent ou apprenant majeur) : l'offre a du sens. -->
    <template v-else>
      <h3>{{ t('mia.alerteEpuiseTitre') }}</h3>
      <p>{{ t('mia.epuiseTexteAdulte') }}</p>
      <div class="ce-act">
        <button class="btn btn-primary" @click="$emit('abonnement')">{{ t('mia.creditsBuy') }}</button>
        <button class="btn btn-ghost" @click="$emit('quit')">{{ t('common.later') }}</button>
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BellRing, Check } from 'lucide-vue-next'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { usePushStore } from '../stores/push'

defineEmits(['quit', 'abonnement'])
const { t, locale } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()
const push = usePushStore()
// Un compte enfant est, par construction, celui d'un mineur : il est créé par un
// parent depuis son espace, jamais en autonomie.
const estEnfant = computed(() => store.isCompteEnfant)

const envoiEnCours = ref(false)
const prevenu = ref(false)
const dejaFait = ref(false)

async function prevenirParent() {
  envoiEnCours.value = true
  const r = await push.prevenirParent(locale.value.startsWith('en') ? 'en' : 'fr')
  envoiEnCours.value = false
  // Même si l'envoi échoue, on confirme à l'enfant : le parent est de toute
  // façon alerté automatiquement au franchissement du seuil (côté serveur).
  // Lui afficher une erreur qu'il ne peut pas résoudre n'aiderait personne.
  prevenu.value = true
  dejaFait.value = !!(r && r.deja)
}
</script>

<style scoped>
.ce {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 30px; text-align: center;
}
/* `>` : uniquement la grande icône d'en-tête. Sans ça, les petites icônes
   placées DANS les boutons héritaient de 30 px et les déformaient. */
.ce > svg { width: 30px; height: 30px; color: var(--pr); }
.ce h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--tx); }
.ce p { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tx2, #4b5563); max-width: 380px; }
.ce-act { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; justify-content: center; align-items: center; }
.ce-ok { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: #16a34a; }
</style>
