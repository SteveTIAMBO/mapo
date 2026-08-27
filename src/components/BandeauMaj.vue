<!--
  « Une nouvelle version est prête » + un bouton pour l'appliquer.

  Choix de Steve (27/08) : on PROPOSE, on n'impose pas. Recharger de soi-même
  au mauvais moment effacerait une séance de révision en cours ; la personne,
  elle, sait si elle est au milieu de quelque chose.

  Monté à la racine (App.vue) et non dans une vue : la mise à jour concerne
  l'ERP comme MAPO+, et le faire ici évite de toucher aux écrans de l'autre chat.

  Discret par construction : rien ne s'affiche tant qu'aucune version n'attend,
  et l'encart se ferme — refermer ne perd rien, la version reste prête et
  s'appliquera au prochain vrai chargement.
-->
<template>
  <Transition name="bm-fade">
    <div v-if="majDisponible && !masque" class="bm" role="status">
      <RefreshCw :size="16" class="bm-ico" />
      <span class="bm-txt">{{ t('maj.ready') }}</span>
      <button type="button" class="bm-btn" @click="appliquerMaj">{{ t('maj.reload') }}</button>
      <button type="button" class="bm-x" :aria-label="t('maj.later')" @click="masque = true"><X :size="15" /></button>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, X } from 'lucide-vue-next'
import { majDisponible, appliquerMaj } from '../utils/majApp'

const { t } = useI18n({ useScope: 'global' })
const masque = ref(false)
</script>

<style scoped>
.bm {
  position: fixed; z-index: 10000;
  left: 50%; transform: translateX(-50%);
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; gap: 10px;
  max-width: calc(100vw - 24px);
  padding: 9px 10px 9px 14px;
  background: #fff; border: 1px solid rgba(0, 0, 0, .08); border-radius: 999px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, .16);
  font-size: 13.5px; color: var(--tx);
}
.bm-ico { color: var(--pr); flex: 0 0 auto; }
.bm-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bm-btn {
  flex: 0 0 auto; padding: 6px 13px; border: 0; border-radius: 999px;
  background: var(--pr); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
}
.bm-btn:hover { filter: brightness(1.06); }
.bm-x {
  flex: 0 0 auto; display: flex; padding: 5px; border: 0; border-radius: 50%;
  background: transparent; color: inherit; opacity: .5; cursor: pointer;
}
.bm-x:hover { opacity: .85; background: rgba(0, 0, 0, .05); }

.bm-fade-enter-active, .bm-fade-leave-active { transition: opacity .2s, transform .2s; }
.bm-fade-enter-from, .bm-fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }

/* Au-dessus de la barre d'onglets basse de MAPO+ (mobile), sinon l'encart se
   poserait dessus et masquerait la navigation. */
@media (max-width: 768px) {
  .bm { bottom: calc(72px + env(safe-area-inset-bottom, 0px)); font-size: 13px; }
}
</style>
