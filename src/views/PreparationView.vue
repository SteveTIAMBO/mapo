<template>
  <div class="prep-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('prep.title') }}</h1>
        <p>{{ isDirection ? t('prep.subtitleDirection') : t('prep.subtitleProf') }}</p>
      </div>
      <div v-if="isDirection && store.enAttente.length" class="prep-pending">
        <ClipboardList :size="16" />
        <span>{{ t('prep.pending', { n: store.enAttente.length }) }}</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="prep-filters">
      <select v-model="periode" class="input">
        <option v-for="p in periodes" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="classe" class="input">
        <option value="">{{ t('prep.allClasses') }}</option>
        <option v-for="c in classesVisibles" :key="c.name" :value="c.name">{{ c.name }}</option>
      </select>
      <select v-model="statutFiltre" class="input">
        <option value="">{{ t('prep.allStatuses') }}</option>
        <option v-for="s in STATUTS" :key="s" :value="s">{{ t('prep.statut.' + s) }}</option>
      </select>
    </div>

    <!-- Créer une fiche : l'enseignant ne voit que SES matières -->
    <div v-if="!isDirection" class="card prep-new">
      <div class="card-body prep-new-row">
        <select v-model="newMatiere" class="input">
          <option value="">{{ t('prep.chooseSubject') }}</option>
          <option v-for="m in mesMatieres" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="newClasse" class="input">
          <option value="">{{ t('prep.chooseClass') }}</option>
          <option v-for="c in classesVisibles" :key="c.name" :value="c.name">{{ c.name }}</option>
        </select>
        <button class="btn btn-primary" :disabled="!newMatiere || !newClasse" @click="creer">
          <Plus :size="16" />
          <span>{{ t('prep.open') }}</span>
        </button>
      </div>
      <p v-if="!mesMatieres.length" class="prep-hint">{{ t('prep.noSubjectHint') }}</p>
    </div>

    <!-- Liste des fiches -->
    <div v-if="!fichesAffichees.length" class="card empty-state-card">
      <p>{{ t('prep.empty') }}</p>
    </div>

    <div v-for="f in fichesAffichees" :key="f.id" class="card prep-tile">
      <div class="prep-tile-head">
        <div>
          <div class="prep-tile-title">{{ f.matiere }} <span class="prep-tile-classe">{{ f.classe }}</span></div>
          <div class="prep-tile-meta">
            {{ f.periode }}
            <template v-if="f.auteurNom"> · {{ f.auteurNom }}</template>
            <template v-if="f.statut === 'valide' && f.validePar"> · {{ t('prep.validatedBy', { who: f.validePar }) }}</template>
          </div>
        </div>
        <div class="prep-tile-right">
          <span class="prep-badge" :class="'prep-badge-' + f.statut">{{ t('prep.statut.' + f.statut) }}</span>
          <span class="prep-progress">{{ store.avancement(f) }} %</span>
        </div>
      </div>

      <div v-if="f.statut === 'a_revoir' && f.motif" class="prep-motif">
        <AlertCircle :size="15" />
        <span>{{ f.motif }}</span>
      </div>

      <!-- Modules du plan -->
      <ol v-if="f.modules.length" class="prep-modules">
        <li v-for="m in f.modules" :key="m.id" class="prep-module">
          <label class="prep-check">
            <input type="checkbox" :checked="m.fait" :disabled="!peutSuivre(f)" @change="store.marquerFait(f.id, m.id, $event.target.checked)" />
          </label>
          <div class="prep-module-body">
            <div class="prep-module-titre" :class="{ 'prep-fait': m.fait }">{{ m.titre }}</div>
            <div v-if="m.objectifs" class="prep-module-obj">{{ m.objectifs }}</div>
          </div>
          <span v-if="m.semaines" class="prep-sem">{{ t('prep.weeks', { w: m.semaines }) }}</span>
          <div v-if="peutEditer(f)" class="prep-module-actions">
            <button class="btn btn-ghost btn-sm" :title="t('prep.moveUp')" @click="store.deplacerModule(f.id, m.id, 'haut')"><ChevronUp :size="15" /></button>
            <button class="btn btn-ghost btn-sm" :title="t('prep.moveDown')" @click="store.deplacerModule(f.id, m.id, 'bas')"><ChevronDown :size="15" /></button>
            <button class="btn btn-ghost btn-sm" :title="t('prep.remove')" @click="store.retirerModule(f.id, m.id)"><Trash2 :size="15" /></button>
          </div>
        </li>
      </ol>
      <p v-else class="prep-hint">{{ t('prep.noModule') }}</p>

      <!-- Ajout d'un module -->
      <div v-if="peutEditer(f)" class="prep-add">
        <input v-model="brouillons[f.id].titre" class="input" :placeholder="t('prep.modulePh')" @keyup.enter="ajouter(f)" />
        <input v-model="brouillons[f.id].objectifs" class="input" :placeholder="t('prep.objectivesPh')" @keyup.enter="ajouter(f)" />
        <input v-model="brouillons[f.id].semaines" class="input prep-input-sem" :placeholder="t('prep.weeksPh')" @keyup.enter="ajouter(f)" />
        <button class="btn btn-outline btn-sm" :disabled="!brouillons[f.id].titre.trim()" @click="ajouter(f)">
          <Plus :size="15" /><span>{{ t('prep.addModule') }}</span>
        </button>
      </div>

      <!-- Actions de circuit -->
      <div class="prep-actions">
        <button v-if="peutEditer(f) && f.statut !== 'soumis'" class="btn btn-primary btn-sm" :disabled="!f.modules.length" @click="store.soumettre(f.id)">
          {{ t('prep.submit') }}
        </button>
        <template v-if="isDirection && f.statut === 'soumis'">
          <button class="btn btn-primary btn-sm" @click="store.valider(f.id)">{{ t('prep.validate') }}</button>
          <button class="btn btn-outline btn-sm" @click="ouvrirRenvoi(f)">{{ t('prep.sendBack') }}</button>
        </template>
      </div>
    </div>

    <!-- Renvoi avec motif -->
    <div v-if="renvoiFiche" class="modal-overlay" @click.self="renvoiFiche = null">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3>{{ t('prep.sendBack') }}</h3>
          <button class="btn btn-ghost btn-sm" @click="renvoiFiche = null"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('prep.reason') }}</label>
            <textarea v-model="renvoiMotif" class="input" rows="3" :placeholder="t('prep.reasonPh')"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="renvoiFiche = null">{{ t('prep.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!renvoiMotif.trim()" @click="confirmerRenvoi">{{ t('prep.sendBack') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreparationStore, STATUTS } from '../stores/preparation'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { useClassesStore } from '../stores/classes'
import { usePersonnelStore } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { Plus, Trash2, ChevronUp, ChevronDown, X, AlertCircle, ClipboardList } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const store = usePreparationStore()
const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const classesStore = useClassesStore()
const personnelStore = usePersonnelStore()
const subjectsStore = useSubjectsStore()
const edtStore = useEmploiDuTempsStore()

const periode = ref('')
const classe = ref('')
const statutFiltre = ref('')
const newMatiere = ref('')
const newClasse = ref('')
const renvoiFiche = ref(null)
const renvoiMotif = ref('')
const brouillons = reactive({})

const isDirection = computed(() => !authStore.isTeacher)

// Périodes de l'école. Si elle n'en a pas encore déclaré, on ne bloque pas
// l'écran : le cahier de préparation se remplit souvent AVANT que les dates de
// trimestre soient saisies.
const periodes = computed(() => {
  const p = Object.keys(schoolStore.schoolSettings?.periods || {})
  return p.length ? p : ['T1', 'T2', 'T3']
})

// Cloisonnement : mêmes règles que Notes et Suivi des révisions. Ses classes via
// l'emploi du temps, ses matières via sa fiche de personnel.
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})

const classesVisibles = computed(() => {
  const ids = teacherClassIds.value
  if (!ids) return classesStore.classes
  return classesStore.classes.filter((c) => ids.includes(c.id))
})

const mesMatieres = computed(() => {
  const record = personnelStore.getTeacherStaffRecord(authStore.userProfile)
  const siennes = record?.subjects || []
  if (siennes.length) return siennes
  // Un enseignant sans matière renseignée dans sa fiche ne doit pas se retrouver
  // devant un menu vide sans explication : on lui propose les matières de l'école
  // et le message d'aide lui dit d'où vient la liste.
  return (subjectsStore.subjects || []).map((s) => s.name || s.label).filter(Boolean)
})

const fichesAffichees = computed(() => {
  const noms = classesVisibles.value.map((c) => c.name)
  return store.fiches
    .filter((f) => f.periode === periode.value)
    .filter((f) => (teacherClassIds.value ? noms.includes(f.classe) : true))
    .filter((f) => (classe.value ? f.classe === classe.value : true))
    .filter((f) => (statutFiltre.value ? f.statut === statutFiltre.value : true))
    .slice()
    .sort((a, b) => a.classe.localeCompare(b.classe) || a.matiere.localeCompare(b.matiere))
})

/** L'enseignant édite son plan ; la direction ne réécrit pas à sa place. */
function peutEditer(f) {
  if (isDirection.value) return false
  return !f.auteurId || f.auteurId === authStore.userProfile?.uid
}

/** Cocher l'avancement : l'enseignant de la fiche, et la direction en lecture d'avancement. */
function peutSuivre(f) {
  return peutEditer(f) || isDirection.value
}

function assurerBrouillon(id) {
  if (!brouillons[id]) brouillons[id] = { titre: '', objectifs: '', semaines: '' }
}

function creer() {
  const f = store.ouvrirFiche({ matiere: newMatiere.value, classe: newClasse.value, periode: periode.value })
  if (f) {
    assurerBrouillon(f.id)
    newMatiere.value = ''
    newClasse.value = ''
  }
}

function ajouter(f) {
  assurerBrouillon(f.id)
  const b = brouillons[f.id]
  if (!b.titre.trim()) return
  store.ajouterModule(f.id, { titre: b.titre, objectifs: b.objectifs, semaines: b.semaines })
  b.titre = ''
  b.objectifs = ''
  b.semaines = ''
}

function ouvrirRenvoi(f) {
  renvoiFiche.value = f
  renvoiMotif.value = ''
}

function confirmerRenvoi() {
  if (store.renvoyer(renvoiFiche.value.id, renvoiMotif.value)) renvoiFiche.value = null
}

watch(fichesAffichees, (list) => { for (const f of list) assurerBrouillon(f.id) }, { immediate: true })

onMounted(async () => {
  periode.value = periodes.value[0]
  await Promise.all([
    store.load(),
    classesStore.loadClasses?.(),
    personnelStore.loadStaff?.(),
    subjectsStore.loadSubjects?.(),
  ].filter(Boolean))
  for (const f of store.fiches) assurerBrouillon(f.id)
})
</script>

<style scoped>
.prep-page { padding-bottom: 32px; }
/* Accent translucide : rgba(var(--pr-rgb), …), jamais color-mix(). C'est la
   convention de main.css, et elle suit la couleur de l'école. */
.prep-pending { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: rgba(var(--pr-rgb), .12); color: var(--pr); font-size: 13px; font-weight: 600; }
.prep-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.prep-filters .input { max-width: 220px; }
.prep-new { margin-bottom: 16px; }
.prep-new-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.prep-new-row .input { max-width: 240px; }
.prep-hint { margin: 8px 0 0; font-size: 13px; color: var(--tx3); }

/* Volontairement « prep-tile » et pas « prep-card » : une règle !important de
   main.css repeint en blanc certaines classes en -card. */
.prep-tile { margin-bottom: 14px; padding: 16px 18px; }
.prep-tile-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.prep-tile-title { font-size: 15px; font-weight: 650; color: var(--tx1); }
.prep-tile-classe { font-weight: 500; color: var(--tx3); }
.prep-tile-meta { margin-top: 3px; font-size: 12.5px; color: var(--tx3); }
.prep-tile-right { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.prep-progress { font-size: 12.5px; color: var(--tx3); font-variant-numeric: tabular-nums; }

.prep-badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.prep-badge-brouillon { background: #EFF1F4; color: #5B6572; }
.prep-badge-soumis { background: #FFF3D6; color: #8A6100; }
.prep-badge-valide { background: #E3F5EA; color: #1B8A5A; }
.prep-badge-a_revoir { background: #FDE7E5; color: #C0392B; }

.prep-motif { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #FDF3F2; color: #A33227; font-size: 13px; }

.prep-modules { list-style: none; margin: 14px 0 0; padding: 0; }
.prep-module { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-top: 1px solid var(--card-border); }
.prep-check { padding-top: 2px; }
.prep-module-body { flex: 1; min-width: 0; }
.prep-module-titre { font-size: 14px; color: var(--tx1); }
.prep-fait { color: var(--tx3); text-decoration: line-through; }
.prep-module-obj { margin-top: 2px; font-size: 12.5px; color: var(--tx3); }
.prep-sem { font-size: 12px; color: var(--tx3); white-space: nowrap; }
.prep-module-actions { display: flex; gap: 2px; }

.prep-add { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.prep-add .input { flex: 1; min-width: 160px; }
.prep-input-sem { max-width: 110px; }
.prep-actions { display: flex; gap: 8px; margin-top: 14px; }

@media (max-width: 768px) {
  .prep-filters .input, .prep-new-row .input { max-width: none; width: 100%; }
  .prep-tile-head { flex-direction: column; }
}
</style>
