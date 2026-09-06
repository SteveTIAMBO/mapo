<template>
  <div class="card lie-pane">
    <div v-if="busy && !loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
    <p v-else-if="err" class="lie-err"><Info :size="14" /> {{ err }}</p>

    <template v-else>
      <!-- ── Assiduité : le taux d'abord, le détail ensuite ── -->
      <div class="vs-block">
        <h4 class="vs-h">{{ en ? 'Attendance' : 'Assiduité' }}</h4>

        <p v-if="!resume.total" class="lie-empty">
          {{ en ? 'Your school has not recorded any attendance yet.' : "Votre école n'a pas encore enregistré d'appel." }}
        </p>

        <template v-else>
          <div class="vs-resume">
            <div class="vs-taux" :style="{ color: tauxColor }">
              {{ fmtTaux(resume.tauxPresence) }}<small>%</small>
              <span class="vs-taux-lab">{{ en ? 'Attendance rate' : 'Taux de présence' }}</span>
            </div>
            <div class="vs-compteurs">
              <span class="vs-cpt"><strong>{{ resume.absent }}</strong> {{ en ? 'unexcused' : 'non justifiée(s)' }}</span>
              <span class="vs-cpt"><strong>{{ resume.excuse }}</strong> {{ en ? 'excused' : 'justifiée(s)' }}</span>
              <span class="vs-cpt"><strong>{{ resume.retard }}</strong> {{ en ? 'late' : 'retard(s)' }}</span>
              <span class="vs-cpt vs-cpt-tot">{{ en ? 'over' : 'sur' }} {{ resume.total }} {{ en ? 'school days' : 'jours d\'appel' }}</span>
            </div>
          </div>

          <p v-if="!absences.length" class="vs-parfait">
            <Check :size="14" /> {{ en ? 'No absence or lateness recorded.' : 'Aucune absence ni retard enregistré.' }}
          </p>
          <ul v-else class="vs-list">
            <li v-for="(a, i) in absences" :key="'a' + i" class="vs-item">
              <span class="vs-pastille" :style="{ background: statutColor(a.status) }"></span>
              <div class="vs-item-txt">
                <strong>{{ statutLabel(a.status) }}</strong>
                <span class="vs-date">{{ formatDate(a.date) }}</span>
                <p v-if="a.note" class="vs-note">{{ a.note }}</p>
              </div>
            </li>
          </ul>
        </template>
      </div>

      <!-- ── Discipline ── -->
      <div class="vs-block">
        <h4 class="vs-h">{{ en ? 'Conduct' : 'Discipline' }}</h4>

        <p v-if="!incidents.length" class="vs-parfait">
          <Check :size="14" /> {{ en ? 'No incident reported.' : 'Aucun incident signalé.' }}
        </p>
        <ul v-else class="vs-list">
          <li v-for="inc in incidents" :key="inc.id" class="vs-item">
            <span class="vs-pastille" :style="{ background: incidentColor(inc.type) }"></span>
            <div class="vs-item-txt">
              <strong>{{ incidentLabel(inc.type) }}</strong>
              <span class="vs-date">{{ formatDate(inc.date) }}</span>
              <p v-if="inc.description" class="vs-note">{{ inc.description }}</p>
              <p class="vs-meta">
                <span v-if="inc.sanction">{{ en ? 'Measure' : 'Sanction' }} : {{ sanctionLabel(inc.sanction) }}</span>
                <span v-if="inc.reportedBy">{{ en ? 'Reported by' : 'Signalé par' }} {{ inc.reportedBy }}</span>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Une famille qui conteste doit savoir où s'adresser, et ce n'est pas ici. -->
      <p class="vs-pied">
        <Info :size="13" />
        {{ en ? 'This information comes from your school. To discuss it, use Messages.' : "Ces informations proviennent de votre école. Pour en discuter, passez par la messagerie." }}
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Info, Check } from 'lucide-vue-next'
import { useLienEcoleStore } from '../stores/lienEcole'

// Vie scolaire = assiduité + discipline, réunies parce que c'est ainsi que
// l'école les nomme et les traite. Deux appels au pont, un seul écran : le
// parent qui vient voir « pourquoi mon enfant a été puni » regarde presque
// toujours les absences dans la foulée.
const props = defineProps({ lien: { type: Object, default: () => ({}) } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const lienStore = useLienEcoleStore()

const sid = computed(() => props.lien?.schoolId)
const eid = computed(() => props.lien?.eleveId)

const absences = ref([])
const resume = ref({ total: 0, present: 0, absent: 0, retard: 0, excuse: 0, tauxPresence: null })
const incidents = ref([])
const busy = ref(false)
const err = ref('')
const loaded = ref(false)

// Mêmes couleurs et libellés que l'ERP (stores/presences.js, stores/discipline.js) :
// une famille et son école doivent lire la même chose au même endroit.
const STATUTS = {
  absent: { fr: 'Absence', en: 'Absence', color: '#D93025' },
  retard: { fr: 'Retard', en: 'Late', color: '#E8A838' },
  excuse: { fr: 'Absence justifiée', en: 'Excused absence', color: '#6366F1' },
  present: { fr: 'Présent', en: 'Present', color: '#1B8A5A' },
}
const INCIDENTS = {
  retard: { fr: 'Retard', en: 'Lateness', color: '#E8A838' },
  comportement: { fr: 'Comportement', en: 'Behaviour', color: '#D97706' },
  absence: { fr: 'Absence', en: 'Absence', color: '#D93025' },
  violence: { fr: 'Violence', en: 'Violence', color: '#B91C1C' },
  tenue: { fr: 'Tenue non conforme', en: 'Dress code', color: '#8B5CF6' },
  materiel: { fr: 'Dégradation de matériel', en: 'Damage to property', color: '#6366F1' },
  triche: { fr: 'Triche ou fraude', en: 'Cheating', color: '#B91C1C' },
  autre: { fr: 'Autre', en: 'Other', color: '#64748B' },
}
const SANCTIONS = {
  observation: { fr: 'Observation orale', en: 'Verbal warning' },
  avertissement: { fr: 'Avertissement écrit', en: 'Written warning' },
  retenue: { fr: 'Retenue', en: 'Detention' },
  convocation: { fr: 'Convocation des parents', en: 'Parents summoned' },
  exclusion_temp: { fr: 'Exclusion temporaire', en: 'Temporary exclusion' },
  conseil: { fr: 'Conseil de discipline', en: 'Disciplinary board' },
}

function pick(map, key, fallback) {
  const e = map[key]
  if (!e) return fallback || key || ''
  return en.value ? e.en : e.fr
}
function statutLabel(s) { return pick(STATUTS, s, s) }
function statutColor(s) { return STATUTS[s]?.color || '#64748B' }
function incidentLabel(t) { return pick(INCIDENTS, t, t) }
function incidentColor(t) { return INCIDENTS[t]?.color || '#64748B' }
function sanctionLabel(s) { return pick(SANCTIONS, s, s) }

function fmtTaux(n) { return n == null || isNaN(n) ? '—' : String(Math.round(n * 10) / 10).replace('.', ',') }
const tauxColor = computed(() => {
  const n = resume.value.tauxPresence
  if (n == null || isNaN(n)) return '#6b7280'
  return n >= 95 ? '#1B8A5A' : n >= 90 ? '#B87A00' : '#D93025'
})
function formatDate(s) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return s }
}

function msgTxt(reason) {
  if (reason === 'non_relie') return en.value ? 'Account not linked.' : 'Compte non relié.'
  if (reason === 'reseau') return en.value ? 'Network error, please retry.' : 'Erreur réseau, réessayez.'
  return en.value ? 'Something went wrong, please retry.' : 'Une erreur est survenue, réessayez.'
}

async function charger() {
  if (!sid.value || !eid.value) { err.value = msgTxt('non_relie'); loaded.value = true; return }
  busy.value = true
  const [a, d] = await Promise.all([
    lienStore.fetchAbsences(sid.value, eid.value),
    lienStore.fetchDiscipline(sid.value, eid.value),
  ])
  busy.value = false
  loaded.value = true
  // Un seul des deux appels qui échoue ne doit pas vider l'écran entier : on
  // affiche ce qu'on a. L'erreur ne s'affiche que si les DEUX ont échoué.
  if (a && a.ok) { absences.value = a.absences || []; if (a.resume) resume.value = a.resume }
  if (d && d.ok) incidents.value = d.incidents || []
  if (!(a && a.ok) && !(d && d.ok)) err.value = msgTxt((a && a.reason) || (d && d.reason))
}

onMounted(charger)
</script>

<style scoped>
.vs-block { margin-bottom: 22px; }
.vs-block:last-of-type { margin-bottom: 10px; }
.vs-h { margin: 0 0 10px; font-size: 15px; font-weight: 700; color: var(--text, #1f2937); }

.vs-resume { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; }
.vs-taux { display: flex; flex-direction: column; font-size: 30px; font-weight: 800; line-height: 1; }
.vs-taux small { font-size: 16px; font-weight: 700; }
.vs-taux-lab { margin-top: 4px; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
.vs-compteurs { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: #374151; }
.vs-cpt strong { font-weight: 700; }
.vs-cpt-tot { color: #6b7280; }

.vs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.vs-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
.vs-pastille { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; }
.vs-item-txt { min-width: 0; }
.vs-item-txt strong { font-size: 14px; }
.vs-date { margin-left: 8px; font-size: 12px; color: #6b7280; }
.vs-note { margin: 4px 0 0; font-size: 13px; color: #374151; }
.vs-meta { margin: 5px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: #6b7280; }

.vs-parfait { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 13px; color: #1B8A5A; }
.vs-pied { display: flex; align-items: flex-start; gap: 6px; margin: 16px 0 0; padding-top: 12px; border-top: 1px solid #eef0f3; font-size: 12px; color: #6b7280; }

@media (prefers-color-scheme: dark) {
  .vs-item { background: transparent; border-color: #303646; }
  .vs-note { color: #cbd5e1; }
  .vs-compteurs { color: #cbd5e1; }
}
</style>
