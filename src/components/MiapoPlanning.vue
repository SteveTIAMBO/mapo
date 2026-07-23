<template>
  <div class="pl">
    <div class="pl-tabs">
      <button :class="{ on: tab === 'devoirs' }" @click="tab = 'devoirs'">{{ t('mia.planHomework') }}</button>
      <button :class="{ on: tab === 'semaine' }" @click="tab = 'semaine'">{{ t('mia.planWeek') }}</button>
    </div>

    <!-- ===== Devoirs à rendre ===== -->
    <div v-if="tab === 'devoirs'">
      <div class="card">
        <div class="card-head"><ClipboardCheck :size="18" /><h3>{{ t('mia.planHomework') }}</h3>
          <button v-if="canEdit" class="pl-add" @click="showAdd = !showAdd"><Plus :size="14" /> {{ t('mia.planAdd') }}</button>
        </div>
        <p class="pl-muted">{{ t('mia.planHomeworkHint') }}</p>

        <div v-if="showAdd && canEdit" class="pl-form">
          <div class="pl-grid">
            <input v-model="nd.matiere" class="pl-in" :placeholder="t('mia.planSubject')" list="pl-mats" />
            <datalist id="pl-mats"><option v-for="m in matieres" :key="m" :value="m" /></datalist>
            <input v-model="nd.titre" class="pl-in" :placeholder="t('mia.planTitle')" />
            <input v-model="nd.echeance" type="date" class="pl-in" />
          </div>
          <div class="pl-actions">
            <button class="pl-ghost" @click="showAdd = false">{{ t('mia.planCancel') }}</button>
            <button class="pl-primary" :disabled="!nd.titre.trim() || !nd.echeance" @click="ajouter">{{ t('mia.planSave') }}</button>
          </div>
        </div>

        <div v-if="aVenir.length" class="pl-list">
          <div v-for="d in aVenir" :key="d.id" class="pl-item" :class="{ late: enRetard(d), done: d.fait }">
            <button class="pl-check" :class="{ on: d.fait }" @click="canEdit && toggle(d.id)" :aria-label="t('mia.planDone')">
              <Check v-if="d.fait" :size="13" />
            </button>
            <div class="pl-item-main">
              <div class="pl-item-title"><span class="pl-mat">{{ d.matiere || '—' }}</span> {{ d.titre }}</div>
              <div class="pl-item-due" :class="{ late: enRetard(d) }">{{ echeanceLabel(d) }}</div>
            </div>
            <button v-if="canEdit" class="pl-del" @click="supprimer(d.id)" :aria-label="t('mia.planRemove')"><X :size="14" /></button>
          </div>
        </div>
        <p v-else class="pl-empty">{{ t('mia.planEmpty') }}</p>
      </div>
    </div>

    <!-- ===== Cette semaine (jour par jour) ===== -->
    <div v-else class="pl-week">
      <div v-for="j in semaine" :key="j.iso" class="card pl-day" :class="{ today: j.isToday }">
        <div class="pl-day-head">
          <span class="pl-day-name">{{ j.label }}</span>
          <span v-if="j.isToday" class="pl-day-badge">{{ t('mia.planToday') }}</span>
        </div>
        <div v-if="j.devoirs.length" class="pl-day-items">
          <div v-for="d in j.devoirs" :key="d.id" class="pl-day-item"><span class="pl-dot"></span>{{ d.matiere ? d.matiere + ' · ' : '' }}{{ d.titre }}</div>
        </div>
        <div v-if="j.reviser.length" class="pl-day-rev">
          <span class="pl-rev-label">{{ t('mia.planRevise') }}</span>
          <button v-for="m in j.reviser" :key="m" class="pl-chip" @click="$emit('revise', m)">{{ m }}</button>
        </div>
        <p v-if="!j.devoirs.length && !j.reviser.length" class="pl-day-empty">—</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, Plus, Check, X } from 'lucide-vue-next'

const props = defineProps({
  enfantId: { type: String, default: 'me' },
  matieres: { type: Array, default: () => [] },
  aReviser: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: true },
})
defineEmits(['revise'])

const { t, locale } = useI18n({ useScope: 'global' })
const KEY = () => 'mapo_b2c_devoirs_' + (props.enfantId || 'me')
const load = () => { try { const r = localStorage.getItem(KEY()); return r ? JSON.parse(r) : seed() } catch { return [] } }
const save = () => { try { localStorage.setItem(KEY(), JSON.stringify(devoirs.value)) } catch { /* quota */ } }
function seed() {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
  return [
    { id: 's1', matiere: 'Mathématiques', titre: 'Exercices 12 à 18 p.44', echeance: d(1), fait: false },
    { id: 's2', matiere: 'Français', titre: 'Rédaction — argumentation', echeance: d(3), fait: false },
    { id: 's3', matiere: 'Histoire-Géo', titre: 'Fiche de révision chap. 4', echeance: d(-1), fait: false },
  ]
}

const tab = ref('devoirs')
const showAdd = ref(false)
const devoirs = ref(load())
// Persiste le jeu initial dès le montage pour que l'accueil (rappels) puisse le lire.
try { if (!localStorage.getItem(KEY())) save() } catch { /* silent */ }
const nd = ref({ matiere: '', titre: '', echeance: '' })

const today = new Date().toISOString().slice(0, 10)
function enRetard(d) { return !d.fait && d.echeance && d.echeance < today }
const aVenir = computed(() =>
  [...devoirs.value].sort((a, b) => (a.fait - b.fait) || (a.echeance || '').localeCompare(b.echeance || '')))

function ajouter() {
  if (!nd.value.titre.trim() || !nd.value.echeance) return
  devoirs.value.unshift({ id: 'd' + Date.now().toString(36), matiere: nd.value.matiere.trim(), titre: nd.value.titre.trim(), echeance: nd.value.echeance, fait: false })
  save()
  nd.value = { matiere: '', titre: '', echeance: '' }
  showAdd.value = false
}
function toggle(id) { const d = devoirs.value.find((x) => x.id === id); if (d) { d.fait = !d.fait; save() } }
function supprimer(id) { devoirs.value = devoirs.value.filter((x) => x.id !== id); save() }

function fmt(iso) {
  const [y, m, j] = iso.split('-')
  return `${j}/${m}`
}
function echeanceLabel(d) {
  if (d.fait) return t('mia.planDone')
  if (enRetard(d)) return t('mia.planLate', { date: fmt(d.echeance) })
  if (d.echeance === today) return t('mia.planDueToday')
  return t('mia.planDueOn', { date: fmt(d.echeance) })
}

// Vue « cette semaine » : 7 jours à partir d'aujourd'hui.
const semaine = computed(() => {
  const days = []
  const weak = (props.aReviser || []).map((w) => w.matiere).filter(Boolean)
  for (let i = 0; i < 7; i++) {
    const dt = new Date(); dt.setDate(dt.getDate() + i)
    const iso = dt.toISOString().slice(0, 10)
    const label = dt.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    const dev = devoirs.value.filter((d) => d.echeance === iso && !d.fait)
    // Suggestion de révision : on répartit les matières faibles sur la semaine (1 par jour).
    const rev = weak.length ? [weak[i % weak.length]] : []
    days.push({ iso, label: label.charAt(0).toUpperCase() + label.slice(1), isToday: i === 0, devoirs: dev, reviser: rev })
  }
  return days
})
</script>

<style scoped>
.pl-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.pl-tabs button { border: 1px solid var(--divider); background: none; color: var(--tx3); border-radius: 999px; padding: 7px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.pl-tabs button.on { background: var(--pr); color: #fff; border-color: var(--pr); }
.card { background: var(--surface, #fff); border: 1px solid var(--divider); border-radius: 16px; padding: 18px; margin-bottom: 14px; }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.pl-add { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; background: rgba(var(--pr-rgb), .1); color: var(--pr); border: none; border-radius: 9px; padding: 6px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.pl-muted { color: var(--tx3); font-size: 13px; margin: 0 0 12px; }
.pl-form { border: 1px solid var(--divider); border-radius: 12px; padding: 13px; margin-bottom: 14px; background: var(--input-bg, #f7f8fa); }
.pl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.pl-in { border: 1px solid var(--divider); border-radius: 9px; padding: 9px 11px; font-size: 14px; background: #fff; color: var(--tx); width: 100%; }
.pl-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 12px; }
.pl-ghost { background: none; border: 1px solid var(--divider); color: var(--tx); border-radius: 9px; padding: 8px 13px; font-size: 13px; font-weight: 600; cursor: pointer; }
.pl-primary { background: var(--pr); color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.pl-primary:disabled { opacity: .5; cursor: not-allowed; }
.pl-list { display: flex; flex-direction: column; gap: 8px; }
.pl-item { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border: 1px solid var(--divider); border-radius: 12px; }
.pl-item.late { border-color: rgba(217, 48, 37, .4); background: rgba(217, 48, 37, .03); }
.pl-item.done { opacity: .55; }
.pl-check { flex: none; width: 22px; height: 22px; border-radius: 7px; border: 2px solid var(--divider); background: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.pl-check.on { background: #1e8e3e; border-color: #1e8e3e; }
.pl-item-main { flex: 1; min-width: 0; }
.pl-item-title { font-size: 14px; color: var(--tx); }
.pl-item.done .pl-item-title { text-decoration: line-through; }
.pl-mat { font-weight: 600; color: var(--pr); }
.pl-item-due { font-size: 12px; color: var(--tx3); margin-top: 2px; }
.pl-item-due.late { color: #D93025; font-weight: 600; }
.pl-del { flex: none; border: none; background: none; color: var(--tx3); cursor: pointer; padding: 5px; border-radius: 7px; }
.pl-del:hover { background: rgba(217, 48, 37, .1); color: #D93025; }
.pl-empty { color: var(--tx3); font-size: 14px; padding: 6px 2px; }
.pl-week { display: flex; flex-direction: column; gap: 10px; }
.pl-day { padding: 14px 16px; margin-bottom: 0; }
.pl-day.today { border-color: var(--pr); box-shadow: 0 0 0 1px var(--pr) inset; }
.pl-day-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
.pl-day-name { font-weight: 600; color: var(--tx); font-size: 14px; }
.pl-day-badge { font-size: 11px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), .1); padding: 2px 8px; border-radius: 999px; }
.pl-day-items { display: flex; flex-direction: column; gap: 5px; margin-bottom: 6px; }
.pl-day-item { font-size: 13.5px; color: var(--tx); display: flex; align-items: center; gap: 8px; }
.pl-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pr); flex: none; }
.pl-day-rev { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 4px; }
.pl-rev-label { font-size: 12px; color: var(--tx3); font-weight: 600; }
.pl-chip { border: 1px solid var(--divider); background: none; color: var(--pr); border-radius: 999px; padding: 3px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.pl-chip:hover { background: rgba(var(--pr-rgb), .08); }
.pl-day-empty { color: var(--tx3); font-size: 13px; margin: 0; }
</style>
