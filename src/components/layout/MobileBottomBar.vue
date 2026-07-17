<template>
  <nav v-if="items.length" class="mbbar" aria-label="Navigation rapide">
    <RouterLink
      v-for="it in items"
      :key="it.to"
      :to="it.to"
      class="mbbar-item"
      active-class="is-active"
    >
      <component :is="it.icon" :size="22" class="mbbar-ic" />
      <span class="mbbar-lb">{{ t(it.label) }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import {
  LayoutDashboard, Users, FileText, Clock, ClipboardCheck,
  CreditCard, Wallet, MessageSquare, BarChart3, Sparkles,
} from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

// Barre basse fixe (mobile) — 5 accès à plat par profil, avec icônes.
// Même parti pris que la barre basse du Supérieur, adapté à la navigation
// par routes de l'édition Secondaire/Primaire (partagée par les 2 éditions).
const items = computed(() => {
  const role = authStore.userProfile?.role
  if (role === 'eleve') return [
    { to: '/espace-eleve', icon: LayoutDashboard, label: 'bbar.accueil' },
    { to: '/eleve/notes', icon: FileText, label: 'bbar.notes' },
    { to: '/eleve/emploi-du-temps', icon: Clock, label: 'bbar.edt' },
    { to: '/eleve/revisions', icon: Sparkles, label: 'bbar.revisions' },
    { to: '/eleve/messagerie', icon: MessageSquare, label: 'bbar.messages' },
  ]
  if (role === 'parent') return [
    { to: '/espace-parent', icon: LayoutDashboard, label: 'bbar.accueil' },
    { to: '/parent/notes', icon: FileText, label: 'bbar.notes' },
    { to: '/parent/finances', icon: CreditCard, label: 'bbar.paiements' },
    { to: '/parent/miapo', icon: Sparkles, label: 'bbar.miapo' },
    { to: '/parent/messagerie', icon: MessageSquare, label: 'bbar.messages' },
  ]
  if (role === 'comptable') return [
    { to: '/dashboard', icon: LayoutDashboard, label: 'bbar.accueil' },
    { to: '/facturation', icon: CreditCard, label: 'bbar.compta' },
    { to: '/salaire', icon: Wallet, label: 'bbar.salaire' },
    { to: '/eleves', icon: Users, label: 'bbar.eleves' },
    { to: '/messagerie', icon: MessageSquare, label: 'bbar.messages' },
  ]
  if (role === 'enseignant') return [
    { to: '/dashboard', icon: LayoutDashboard, label: 'bbar.accueil' },
    { to: '/notes', icon: FileText, label: 'bbar.notes' },
    { to: '/emploi-du-temps', icon: Clock, label: 'bbar.edt' },
    { to: '/devoirs', icon: ClipboardCheck, label: 'bbar.devoirs' },
    { to: '/messagerie', icon: MessageSquare, label: 'bbar.messages' },
  ]
  // Direction (directeur / directeur_complexe / admin) — profil par défaut
  return [
    { to: '/dashboard', icon: LayoutDashboard, label: 'bbar.accueil' },
    { to: '/eleves', icon: Users, label: 'bbar.eleves' },
    { to: '/facturation', icon: CreditCard, label: 'bbar.compta' },
    { to: '/messagerie', icon: MessageSquare, label: 'bbar.messages' },
    { to: '/rapports', icon: BarChart3, label: 'bbar.rapports' },
  ]
})
</script>

<style scoped>
/* Masquée sur desktop ; visible uniquement en mobile étroit (<=560px). */
.mbbar { display: none; }

@media (max-width: 560px) {
  .mbbar {
    display: flex;
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40; /* sous le tiroir (backdrop 49 / sidebar) */
    background: var(--card, #fff);
    border-top: 1px solid var(--card-border, #ECECE8);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -4px 16px rgba(16, 24, 40, 0.06);
  }
  .mbbar-item {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 4px 2px;
    text-decoration: none;
    color: var(--tx3, #9aa2b1);
    min-width: 0;
  }
  .mbbar-ic { display: block; flex-shrink: 0; }
  .mbbar-lb {
    font-family: 'Poppins', sans-serif;
    font-size: 10.5px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
  }
  .mbbar-item.is-active { color: var(--pr); }
}
</style>
