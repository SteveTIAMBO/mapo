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

const props = defineProps({
  // Sections disponibles, telles que calculées par la vue : [{ key, label, icon }]
  sections: { type: Array, default: () => [] },
  section: { type: String, default: '' },
  isApprenant: { type: Boolean, default: false },
})
defineEmits(['aller'])

// Ordre de préférence. Cinq places au plus : au-delà, sur un écran de 360 px,
// les libellés deviennent illisibles et les cibles trop étroites pour le pouce.
//
// PAS d'onglet « Plus » : le hamburger de l'en-tête ouvre déjà le menu complet
// (Steve, 16/08). Deux chemins vers la même chose, c'est une place gâchée sur
// la barre et une hésitation de plus pour l'utilisateur.
const MAX_ONGLETS = 5
const PREF_APPRENANT = ['accueil', 'tuteur', 'progression', 'recompenses', 'historique']
const PREF_PARENT = ['accueil', 'enfants', 'progression', 'planning', 'edt']

const onglets = computed(() => {
  const dispo = new Map((props.sections || []).filter((s) => s && s.key).map((s) => [s.key, s]))
  const pref = props.isApprenant ? PREF_APPRENANT : PREF_PARENT
  const choisis = pref.map((k) => dispo.get(k)).filter(Boolean)
  // Si la préférence ne donne rien (persona inattendu), on prend simplement les
  // premières sections plutôt que d'afficher une barre vide.
  const base = choisis.length ? choisis : [...dispo.values()]
  return base.slice(0, MAX_ONGLETS)
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
