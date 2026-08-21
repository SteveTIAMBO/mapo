<template>
  <div class="prep-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('prep.title') }}</h1>
        <p>{{ isDirection ? t('prep.subtitleDirection') : t('prep.subtitleProf') }}</p>
      </div>
      <div v-if="isDirection && store.modulesEnAttente" class="prep-pending">
        <ClipboardList :size="16" />
        <span>{{ t('prep.pending', { n: store.modulesEnAttente }) }}</span>
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
        <option v-for="s in STATUTS_MODULE" :key="s" :value="s">{{ libelleStatut(s) }}</option>
      </select>
    </div>

    <!-- Ouvrir une fiche : l'enseignant ne voit que SES matières -->
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
        <button class="btn btn-primary" :disabled="!newMatiere || !newClasse" @click="ouvrir">
          <Plus :size="16" />
          <span>{{ t('prep.open') }}</span>
        </button>
      </div>
      <p v-if="messageOuverture" class="prep-info">{{ messageOuverture }}</p>
      <p v-if="!mesMatieres.length" class="prep-hint">{{ t('prep.noSubjectHint') }}</p>
    </div>

    <div v-if="!fichesAffichees.length" class="card empty-state-card">
      <p>{{ t('prep.empty') }}</p>
    </div>

    <!-- Fiches -->
    <div v-for="f in fichesAffichees" :key="f.id" :id="'fiche-' + f.id" class="card prep-tile" :class="{ 'prep-tile-cible': cible === f.id }">
      <div class="prep-tile-head">
        <div>
          <div class="prep-tile-title">{{ f.matiere }} <span class="prep-tile-classe">{{ f.classe }}</span></div>
          <div class="prep-tile-meta">
            {{ f.periode }}
            <template v-if="f.auteurNom"> · {{ f.auteurNom }}</template>
          </div>
        </div>
        <div class="prep-tile-right">
          <span class="prep-badge" :class="'prep-badge-' + etatFiche(f)">{{ libelleStatut(etatFiche(f)) }}</span>
          <span class="prep-progress">{{ t('prep.progress', { n: store.avancement(f) }) }}</span>
        </div>
      </div>

      <!-- Répartition des modules par état -->
      <div v-if="f.modules.length" class="prep-counts">
        <span v-for="(n, s) in compterParEtat(f)" :key="s" v-show="n > 0" class="prep-count" :class="'prep-badge-' + s">
          {{ n }} {{ libelleStatut(s).toLowerCase() }}
        </span>
      </div>

      <!-- Modules -->
      <ol v-if="f.modules.length" class="prep-modules">
        <li v-for="m in f.modules" :key="m.id" class="prep-module">
          <label class="prep-check">
            <input type="checkbox" :checked="m.fait" :disabled="!peutSuivre(f)" @change="store.marquerFait(f.id, m.id, $event.target.checked)" />
          </label>
          <button class="prep-module-body" @click="ouvrirDetail(f, m)" :title="t('prep.seeDetails')">
            <div class="prep-module-titre" :class="{ 'prep-fait': m.fait }">
              {{ m.titre }}
              <span class="prep-dot" :class="'prep-badge-' + m.statut">{{ libelleStatut(m.statut) }}</span>
            </div>
            <div v-if="m.objectifs" class="prep-module-obj">{{ m.objectifs }}</div>
            <div v-if="m.motif" class="prep-module-motif"><AlertCircle :size="13" /> {{ m.motif }}</div>
          </button>
          <span v-if="m.semaines" class="prep-sem">{{ t('prep.weeks', { w: m.semaines }) }}</span>
          <div v-if="peutEditer(f)" class="prep-module-actions">
            <button class="btn btn-ghost btn-sm" :title="t('prep.edit')" @click="ouvrirEdition(f, m)"><Pencil :size="15" /></button>
            <button class="btn btn-ghost btn-sm" :title="t('prep.moveUp')" @click="store.deplacerModule(f.id, m.id, 'haut')"><ChevronUp :size="15" /></button>
            <button class="btn btn-ghost btn-sm" :title="t('prep.moveDown')" @click="store.deplacerModule(f.id, m.id, 'bas')"><ChevronDown :size="15" /></button>
            <button class="btn btn-ghost btn-sm" :title="t('prep.remove')" @click="store.retirerModule(f.id, m.id)"><Trash2 :size="15" /></button>
          </div>
        </li>
      </ol>
      <p v-else class="prep-hint">{{ t('prep.noModule') }}</p>

      <!-- Actions de fiche -->
      <div class="prep-actions">
        <button v-if="peutEditer(f)" class="btn btn-outline btn-sm" @click="ouvrirEdition(f, null)">
          <Plus :size="15" /><span>{{ t('prep.addModule') }}</span>
        </button>
        <button v-if="peutEditer(f) && aSoumettre(f)" class="btn btn-primary btn-sm" @click="soumettreTout(f)">
          {{ t('prep.submitAll', { n: aSoumettre(f) }) }}
        </button>
        <button v-if="isDirection && enAttente(f)" class="btn btn-primary btn-sm" @click="validerTout(f)">
          {{ t('prep.validateAll', { n: enAttente(f) }) }}
        </button>
      </div>
    </div>

    <!-- Modale : détail d'un module, et actions de la direction -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <h3>{{ detail.module.titre }}</h3>
          <button class="btn btn-ghost btn-sm" @click="detail = null"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="prep-detail-meta">
            <span class="prep-badge" :class="'prep-badge-' + detail.module.statut">{{ libelleStatut(detail.module.statut) }}</span>
            <span>{{ detail.fiche.matiere }} · {{ detail.fiche.classe }} · {{ detail.fiche.periode }}</span>
            <span v-if="detail.module.semaines">{{ t('prep.weeks', { w: detail.module.semaines }) }}</span>
          </div>

          <div v-if="detail.module.motif" class="prep-motif">
            <AlertCircle :size="15" /><span>{{ detail.module.motif }}</span>
          </div>

          <div class="prep-detail-bloc">
            <div class="prep-detail-label">{{ t('prep.objectives') }}</div>
            <p class="prep-detail-texte">{{ detail.module.objectifs || t('prep.notFilled') }}</p>
          </div>
          <div class="prep-detail-bloc">
            <div class="prep-detail-label">{{ t('prep.details') }}</div>
            <p class="prep-detail-texte">{{ detail.module.details || t('prep.notFilled') }}</p>
          </div>
          <p v-if="detail.module.validePar" class="prep-hint">
            {{ t('prep.validatedBy', { who: detail.module.validePar }) }}
          </p>

          <!-- Décision de la direction, module par module -->
          <div v-if="isDirection && detail.module.statut !== 'valide'" class="prep-decision">
            <div class="prep-detail-label">{{ t('prep.decision') }}</div>
            <textarea v-model="motif" class="input" rows="2" :placeholder="t('prep.reasonPh')"></textarea>
            <div class="prep-decision-actions">
              <button class="btn btn-primary btn-sm" @click="valider">{{ t('prep.validate') }}</button>
              <button class="btn btn-outline btn-sm" :disabled="!motif.trim()" @click="decider('a_modifier')">{{ t('prep.askChanges') }}</button>
              <button class="btn btn-outline btn-sm prep-refus" :disabled="!motif.trim()" @click="decider('refuse')">{{ t('prep.refuse') }}</button>
            </div>
            <p class="prep-hint">{{ t('prep.reasonRequired') }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="peutEditer(detail.fiche)" class="btn btn-outline" @click="ouvrirEdition(detail.fiche, detail.module)">{{ t('prep.edit') }}</button>
          <button class="btn btn-primary" @click="detail = null">{{ t('prep.close') }}</button>
        </div>
      </div>
    </div>

    <!-- Modale : rédaction d'un module -->
    <div v-if="edition" class="modal-overlay" @click.self="edition = null">
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <h3>{{ edition.moduleId ? t('prep.editModule') : t('prep.newModule') }}</h3>
          <button class="btn btn-ghost btn-sm" @click="edition = null"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('prep.moduleTitle') }}</label>
            <input v-model="edition.titre" class="input" :placeholder="t('prep.modulePh')" />
          </div>
          <div class="field">
            <label>{{ t('prep.objectives') }}</label>
            <textarea v-model="edition.objectifs" class="input prep-ta" rows="2" :placeholder="t('prep.objectivesPh')"></textarea>
          </div>
          <div class="field">
            <label>{{ t('prep.details') }}</label>
            <textarea v-model="edition.details" class="input prep-ta" rows="5" :placeholder="t('prep.detailsPh')"></textarea>
          </div>
          <div class="field">
            <label>{{ t('prep.weeksLabel') }}</label>
            <input v-model="edition.semaines" class="input prep-input-sem" :placeholder="t('prep.weeksPh')" />
          </div>
          <p v-if="edition.moduleId && edition.statut === 'valide'" class="prep-hint prep-avertit">
            {{ t('prep.editValidatedWarn') }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="edition = null">{{ t('prep.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!edition.titre.trim()" @click="enregistrerModule">{{ t('prep.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreparationStore, STATUTS_MODULE, etatFiche, compterParEtat, attendDirection, attendEnseignant } from '../stores/preparation'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { useClassesStore } from '../stores/classes'
import { usePersonnelStore } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown, X, AlertCircle, ClipboardList } from 'lucide-vue-next'

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
const messageOuverture = ref('')
const cible = ref('')
const detail = ref(null)
const edition = ref(null)
const motif = ref('')

const isDirection = computed(() => !authStore.isTeacher)

/**
 * Libellé d'un état, DIFFÉRENT selon qui regarde.
 * « Soumis » décrit ce que l'enseignant vient de faire ; la direction, elle, a
 * quelque chose à faire, et lit « en attente de validation ».
 */
function libelleStatut(s) {
  return t((isDirection.value ? 'prep.statutDir.' : 'prep.statutProf.') + s)
}

const periodes = computed(() => {
  const p = Object.keys(schoolStore.schoolSettings?.periods || {})
  return p.length ? p : ['T1', 'T2', 'T3']
})

// Cloisonnement : ses classes via l'emploi du temps, ses matières via sa fiche.
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore) || []
})

const classesVisibles = computed(() => {
  const ids = teacherClassIds.value
  if (!ids) return classesStore.classes
  return classesStore.classes.filter((c) => ids.includes(c.id))
})

const mesMatieres = computed(() => {
  const record = personnelStore.getTeacherStaffRecord(authStore.userProfile)
  const siennes = Object.values(record?.subjects || {})
  if (siennes.length) return siennes
  return (subjectsStore.subjects || []).map((s) => s.name || s.label).filter(Boolean)
})

/** Comparaison tolérante aux accents et à la casse, comme ailleurs dans MAPO. */
function memeMatiere(a, b) {
  return (a || '').toString().trim().localeCompare((b || '').toString().trim(), 'fr', { sensitivity: 'base' }) === 0
}

/**
 * Une fiche concerne-t-elle l'utilisateur ?
 * ⚠️ Un enseignant ne voit QUE ses matières. Sans ce filtre, le professeur de
 * mathématiques lisait le cahier de préparation de sa collègue de français.
 */
function ficheVisible(f) {
  if (isDirection.value) return true
  return mesMatieres.value.some((m) => memeMatiere(m, f.matiere))
}

const fichesAffichees = computed(() => {
  const noms = classesVisibles.value.map((c) => c.name)
  return store.fiches
    .filter((f) => f.periode === periode.value)
    .filter(ficheVisible)
    .filter((f) => (teacherClassIds.value ? noms.includes(f.classe) : true))
    .filter((f) => (classe.value ? f.classe === classe.value : true))
    .filter((f) => (statutFiltre.value ? f.modules.some((m) => m.statut === statutFiltre.value) : true))
    .slice()
    .sort((a, b) => a.classe.localeCompare(b.classe) || a.matiere.localeCompare(b.matiere))
})

/** L'enseignant édite SON plan ; la direction ne réécrit pas à sa place. */
function peutEditer(f) {
  if (isDirection.value) return false
  return !f.auteurId || f.auteurId === authStore.userProfile?.uid
}
function peutSuivre(f) { return peutEditer(f) || isDirection.value }

function aSoumettre(f) { return f.modules.filter(attendEnseignant).length }
function enAttente(f) { return f.modules.filter(attendDirection).length }

/**
 * Ouvrir une fiche DIT ce qui s'est passé.
 * Le bouton créait la fiche ou retrouvait l'existante sans le moindre retour :
 * quand elle existait déjà, l'écran ne bougeait pas et il paraissait cassé.
 */
function ouvrir() {
  const { fiche, creee } = store.ouvrirFiche({ matiere: newMatiere.value, classe: newClasse.value, periode: periode.value })
  if (!fiche) return
  messageOuverture.value = creee
    ? t('prep.opened', { matiere: fiche.matiere, classe: fiche.classe })
    : t('prep.alreadyExists', { matiere: fiche.matiere, classe: fiche.classe })
  cible.value = fiche.id
  newMatiere.value = ''
  newClasse.value = ''
  // On amène l'utilisateur sur la fiche : c'est ce qui manquait le plus.
  setTimeout(() => {
    document.getElementById('fiche-' + fiche.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 60)
  setTimeout(() => { cible.value = '' }, 2500)
}

function ouvrirDetail(f, m) {
  detail.value = { fiche: f, module: m }
  motif.value = m.motif || ''
}

function ouvrirEdition(f, m) {
  detail.value = null
  edition.value = {
    ficheId: f.id,
    moduleId: m?.id || null,
    statut: m?.statut || 'brouillon',
    titre: m?.titre || '',
    objectifs: m?.objectifs || '',
    details: m?.details || '',
    semaines: m?.semaines || '',
  }
}

function enregistrerModule() {
  const e = edition.value
  if (!e.titre.trim()) return
  if (e.moduleId) store.modifierModule(e.ficheId, e.moduleId, e)
  else store.ajouterModule(e.ficheId, e)
  edition.value = null
}

function valider() {
  store.validerModule(detail.value.fiche.id, detail.value.module.id)
  detail.value = null
}

function decider(decision) {
  if (store.deciderModule(detail.value.fiche.id, detail.value.module.id, decision, motif.value)) {
    detail.value = null
    motif.value = ''
  }
}

function soumettreTout(f) { store.soumettreTout(f.id) }
function validerTout(f) { store.validerTout(f.id) }

onMounted(async () => {
  periode.value = periodes.value[0]
  await Promise.allSettled([
    store.load(),
    classesStore.loadClasses?.(),
    // Sans le personnel et l'emploi du temps, les classes de l'enseignant sont
    // introuvables et l'écran se referme sur rien.
    personnelStore.loadStaff?.(),
    subjectsStore.loadSubjects?.(),
    edtStore.loadData?.(),
  ])
})
</script>

<style scoped>
.prep-page { padding-bottom: 32px; }
.prep-pending { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: rgba(var(--pr-rgb), .12); color: var(--pr); font-size: 13px; font-weight: 600; }
.prep-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.prep-filters .input { max-width: 220px; }
.prep-new { margin-bottom: 16px; }
.prep-new-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.prep-new-row .input { max-width: 240px; }
.prep-hint { margin: 8px 0 0; font-size: 13px; color: var(--tx3); }
.prep-avertit { color: #8A6100; }
.prep-info { margin: 10px 0 0; font-size: 13px; color: var(--pr); font-weight: 600; }

.prep-tile { margin-bottom: 14px; padding: 16px 18px; transition: box-shadow .3s; }
.prep-tile-cible { box-shadow: 0 0 0 2px var(--pr); }
.prep-tile-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.prep-tile-title { font-size: 15px; font-weight: 650; color: var(--tx1); }
.prep-tile-classe { font-weight: 500; color: var(--tx3); }
.prep-tile-meta { margin-top: 3px; font-size: 12.5px; color: var(--tx3); }
.prep-tile-right { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.prep-progress { font-size: 12.5px; color: var(--tx3); font-variant-numeric: tabular-nums; }

.prep-counts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.prep-count { padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }

.prep-badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.prep-dot { margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; vertical-align: middle; }
.prep-badge-brouillon, .prep-badge-vide { background: #EFF1F4; color: #5B6572; }
.prep-badge-soumis { background: #FFF3D6; color: #8A6100; }
.prep-badge-valide { background: #E3F5EA; color: #1B8A5A; }
.prep-badge-a_modifier { background: #FDECD8; color: #A35B15; }
.prep-badge-refuse { background: #FDE7E5; color: #C0392B; }

.prep-motif { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #FDF3F2; color: #A33227; font-size: 13px; }

.prep-modules { list-style: none; margin: 12px 0 0; padding: 0; }
.prep-module { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-top: 1px solid var(--card-border); }
.prep-check { padding-top: 3px; }
.prep-module-body { flex: 1; min-width: 0; background: none; border: 0; padding: 0; text-align: left; cursor: pointer; font: inherit; }
.prep-module-titre { font-size: 14px; color: var(--tx1); }
.prep-fait { color: var(--tx3); text-decoration: line-through; }
.prep-module-obj { margin-top: 2px; font-size: 12.5px; color: var(--tx3); }
.prep-module-motif { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 12.5px; color: #A35B15; }
.prep-sem { font-size: 12px; color: var(--tx3); white-space: nowrap; padding-top: 2px; }
.prep-module-actions { display: flex; gap: 2px; }

.prep-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.prep-ta { min-height: 60px; resize: vertical; font-family: inherit; line-height: 1.5; }
.prep-input-sem { max-width: 140px; }

.prep-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 12.5px; color: var(--tx3); margin-bottom: 14px; }
.prep-detail-bloc { margin-top: 14px; }
.prep-detail-label { font-size: 11.5px; font-weight: 650; letter-spacing: .03em; text-transform: uppercase; color: var(--tx3); margin-bottom: 5px; }
.prep-detail-texte { margin: 0; font-size: 14px; color: var(--tx1); white-space: pre-wrap; line-height: 1.55; }
.prep-decision { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--card-border); }
.prep-decision-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.prep-refus { color: #C0392B; }

@media (max-width: 768px) {
  .prep-filters .input, .prep-new-row .input { max-width: none; width: 100%; }
  .prep-tile-head { flex-direction: column; }
}
</style>
