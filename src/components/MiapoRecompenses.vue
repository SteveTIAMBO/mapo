<template>
  <div class="recompenses">
    <!-- Résumé : total de révisions + série en cours -->
    <div class="card rc-head-card">
      <div class="rc-stat">
        <span class="rc-num">{{ stats.total || 0 }}</span>
        <span class="rc-lbl">{{ en ? 'revisions' : 'révisions' }}</span>
      </div>
      <div class="rc-stat">
        <span class="rc-num"><Flame :size="20" class="rc-flame" /> {{ serie }}</span>
        <span class="rc-lbl">{{ en ? 'day streak' : 'jours d\'affilée' }}</span>
      </div>
      <div class="rc-stat">
        <span class="rc-num">{{ earned.length }}<small>/{{ badges.length }}</small></span>
        <span class="rc-lbl">{{ en ? 'badges' : 'badges' }}</span>
      </div>
    </div>

    <!-- Badges obtenus -->
    <div class="card">
      <div class="card-head"><Trophy :size="18" /><h3><DualText :text="en ? 'My badges' : 'Mes badges'" /></h3></div>
      <p v-if="!earned.length" class="muted small">{{ en ? 'No badge yet — do a revision to unlock your first one!' : 'Aucun badge pour l\'instant — fais une révision pour débloquer le premier !' }}</p>
      <div v-else class="rc-grid">
        <MiapoBadge v-for="b in earned" :key="b.id" :badge="b" />
      </div>
    </div>

    <!-- Badges à débloquer (teasés avec progression) -->
    <div v-if="locked.length" class="card">
      <div class="card-head"><Target :size="18" /><h3><DualText :text="en ? 'To unlock' : 'À débloquer'" /></h3></div>
      <p class="muted small">{{ en ? 'Keep going — you\'re getting closer!' : 'Continue — tu t\'en rapproches !' }}</p>
      <div class="rc-grid">
        <MiapoBadge v-for="b in locked" :key="b.id" :badge="b" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trophy, Target, Flame } from 'lucide-vue-next'
import MiapoBadge from './MiapoBadge.vue'
import DualText from './DualText.vue'
import { calculerBadges, statsRecompenses, serieActuelle } from '../utils/recompenses'
import { useTuteurStore } from '../stores/tuteur'

const props = defineProps({ studentId: { type: String, default: 'me' } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const tuteur = useTuteurStore()

// revisionsVersion bump après chaque révision → recalcul réactif des badges.
const badges = computed(() => { void tuteur.revisionsVersion; return calculerBadges(props.studentId) })
const stats = computed(() => { void tuteur.revisionsVersion; return statsRecompenses(props.studentId) })
const serie = computed(() => { void tuteur.revisionsVersion; return serieActuelle(props.studentId) })
// Obtenus d'abord ; verrouillés triés par proximité (le plus proche en premier).
const earned = computed(() => badges.value.filter((b) => b.earned))
const locked = computed(() => badges.value.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress))
</script>

<style scoped>
.recompenses { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 12px; }
.muted.small { font-size: 12.5px; }
.rc-head-card { display: flex; gap: 12px; justify-content: space-around; padding: 18px 22px; }
.rc-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.rc-num { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-display, inherit); font-size: 26px; font-weight: 800; color: var(--tx, #1f2937); line-height: 1; }
.rc-num small { font-size: 15px; font-weight: 600; color: var(--tx3, #9098a6); }
.rc-flame { color: #E8950A; }
.rc-lbl { font-size: 11.5px; color: var(--tx3, #6b7280); text-transform: uppercase; letter-spacing: .03em; }
.rc-grid { display: flex; flex-wrap: wrap; gap: 16px 8px; justify-content: flex-start; }
</style>
