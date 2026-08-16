<template>
  <nav v-if="onglets.length" class="mtab" aria-label="Navigation MAPO+">
    <button
      v-for="o in onglets" :key="o.key" type="button"
      class="mtab-it" :class="{ actif: section === o.key }"
      :aria-current="section === o.key ? 'page' : undefined"
      @click="$emit('aller', o.key)"
    >
      <component :is="o.icon" :size="21" />
      <span class="mtab-lb">{{ o.label }}</span>
    </button>
    <!-- « Plus » ouvre le menu complet : une barre à 5 places ne doit jamais
         amputer l'application de ses autres sections. -->
    <button type="button" class="mtab-it" @click="$emit('menu')">
      <MoreHorizontal :size="21" />
      <span class="mtab-lb">{{ t('mia.more') }}</span>
    </button>
  </nav>
</template>

<script setup>
/**
 * Barre d'onglets basse — MAPO+ sur mobile.
 *
 * POURQUOI un composant à part de MobileBottomBar (l'ERP) : cette barre-là
 * navigue par ROUTES, et MAPO+ n'a qu'une seule route (`/mon-espace`) dont les
 * écrans sont pilotés par une variable `section`. Une barre par routes ne
 * pouvait donc rien piloter ici — c'est pour ça que le B2C n'avait AUCUNE barre
 * basse sur mobile, en ligne comme hors ligne.
 *
 * Les onglets sont choisis dans les sections RÉELLEMENT disponibles pour le
 * persona : une barre figée finirait tôt ou tard par pointer une section que
 * l'utilisateur n'a pas (l'école reliée, l'âge et le rôle en retirent).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoreHorizontal } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  // Sections disponibles, telles que calculées par la vue : [{ key, label, icon }]
  sections: { type: Array, default: () => [] },
  section: { type: String, default: '' },
  isApprenant: { type: Boolean, default: false },
})
defineEmits(['aller', 'menu'])

// Ordre de préférence. On en retient 4 au plus : au-delà, sur un écran de
// 360 px, les libellés deviennent illisibles et les cibles trop étroites pour
// le pouce.
const PREF_APPRENANT = ['accueil', 'tuteur', 'progression', 'recompenses']
const PREF_PARENT = ['accueil', 'enfants', 'progression', 'planning']

const onglets = computed(() => {
  const dispo = new Map((props.sections || []).filter((s) => s && s.key).map((s) => [s.key, s]))
  const pref = props.isApprenant ? PREF_APPRENANT : PREF_PARENT
  const choisis = pref.map((k) => dispo.get(k)).filter(Boolean)
  // Si la préférence ne donne rien (persona inattendu), on prend simplement les
  // premières sections plutôt que d'afficher une barre vide.
  const base = choisis.length ? choisis : [...dispo.values()].slice(0, 4)
  return base.slice(0, 4)
})
</script>

<style scoped>
.mtab {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 9500;
  display: none; align-items: stretch;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-top: 1px solid var(--bd, #e5e7eb);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.mtab-it {
  flex: 1 1 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  padding: 8px 2px 7px; border: none; background: transparent; cursor: pointer;
  color: var(--tx3, #6b7280); font-family: inherit;
  transition: color .15s;
}
/* L'onglet actif est signalé par la COULEUR et le poids, jamais par une barre
   latérale colorée (règle de design maison). */
.mtab-it.actif { color: var(--pr); }
.mtab-it.actif .mtab-lb { font-weight: 700; }
.mtab-lb {
  font-size: 10.5px; line-height: 1.1; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (max-width: 768px) { .mtab { display: flex; } }
</style>
