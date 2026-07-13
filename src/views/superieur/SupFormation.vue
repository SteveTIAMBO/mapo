<template>
  <div class="sf">
    <div class="sf-intro">
      <div>
        <h1 class="sf-h1">{{ t('sup.formation.title') }}</h1>
        <p class="sf-sub">{{ t('sup.formation.subtitle') }}</p>
      </div>
      <button class="sf-btn-primary" type="button" @click="openProgCreate">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('sup.formation.addFormation') }}
      </button>
    </div>

    <!-- Sélecteur de programme -->
    <div class="sf-tabs">
      <button
        v-for="prog in store.offreParProgramme"
        :key="prog.id"
        class="sf-tab"
        :class="{ active: prog.id === activeProgrammeId }"
        type="button"
        @click="activeProgrammeId = prog.id"
      >
        <span class="sf-tab-niveau" :class="`n-${prog.niveau.toLowerCase()}`">{{ prog.niveau }}</span>
        {{ prog.nom }}
      </button>
    </div>

    <div v-if="activeProgramme" class="sf-programme">
      <!-- Bandeau programme -->
      <div class="sf-prog-banner">
        <div>
          <div class="sf-prog-nom">{{ activeProgramme.nom }}</div>
          <div class="sf-prog-meta">
            {{ t('sup.formation.bannerMeta', { ans: activeProgramme.dureeAns, annees: activeProgramme.annees.length, ects: activeProgramme.ectsTotal }) }}
          </div>
        </div>
        <div class="sf-prog-right">
          <div class="sf-prog-legend">
            <span v-for="key in legend" :key="key" class="sf-legend-item">
              <span class="sf-legend-dot" :class="`t-${key}`"></span>{{ typeLabel(key) }}
            </span>
          </div>
          <button v-if="store.isCustomProgramme(activeProgramme.id)" type="button" class="sf-del-prog" @click="askDeleteProgramme">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            {{ t('sup.formation.deleteFormation') }}
          </button>
        </div>
      </div>

      <!-- Responsable de la formation -->
      <div class="sf-resp-card">
        <div class="sf-resp-left">
          <div class="sf-resp-label">{{ t('sup.formation.respTitle') }}</div>
          <div v-if="activeProgramme.responsable" class="sf-resp-body">
            <div class="sf-resp-avatar">{{ initiales(activeProgramme.responsable) }}</div>
            <div>
              <div class="sf-resp-nom">{{ activeProgramme.responsable.nomComplet }}</div>
              <div class="sf-resp-meta">
                <span class="sf-resp-pill" :class="`st-${activeProgramme.responsable.statut}`">
                  {{ statutLabel(activeProgramme.responsable.statut) }}
                </span>
                <span class="sf-resp-spec">{{ activeProgramme.responsable.specialite }}</span>
              </div>
            </div>
          </div>
          <div v-else class="sf-resp-empty">{{ t('sup.formation.respEmpty') }}</div>
        </div>
        <button class="sf-resp-btn" type="button" @click="openRespModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6M19 8v6"/></svg>
          {{ activeProgramme.responsable ? t('sup.formation.respChange') : t('sup.formation.respAssign') }}
        </button>
      </div>

      <!-- Années -->
      <div v-for="annee in activeProgramme.annees" :key="annee.id" class="sf-annee">
        <div class="sf-annee-title">{{ annee.nom }}</div>

        <!-- Onglets semestres -->
        <div class="sf-sem-tabs">
          <button
            v-for="sem in annee.semestres"
            :key="sem.semestre"
            type="button"
            class="sf-sem-tab"
            :class="{ active: semActif(annee) === sem.semestre }"
            @click="setSem(annee, sem.semestre)"
          >
            {{ sem.semestre }}
            <span class="sf-sem-tab-meta">{{ t('sup.formation.semTabMeta', { n: sem.ue.length, ects: sem.totalEcts }) }}</span>
          </button>
        </div>

        <!-- Semestre actif (pleine largeur) -->
        <div
          v-for="sem in annee.semestres"
          v-show="semActif(annee) === sem.semestre"
          :key="sem.semestre"
          class="sf-semestre"
        >
          <div class="sf-sem-head">
            <span class="sf-sem-totals">
              {{ t('sup.formation.semUeCount', { n: sem.ue.length }) }}
              <span class="sf-sem-dot">•</span>
              <strong>{{ t('sup.formation.semCreditsCount', { n: sem.totalEcts }) }}</strong>
              <span class="sf-sem-dot">•</span>
              {{ t('sup.formation.semHoursCount', { n: sem.totalHeures }) }}
            </span>
            <button class="sf-add-btn" type="button" @click="openCreate(annee, sem)" :title="t('sup.formation.addUeTitle')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {{ t('sup.formation.newUe') }}
            </button>
          </div>
          <table class="sf-ue-table">
            <thead>
              <tr>
                <th>{{ t('sup.formation.thCode') }}</th>
                <th>{{ t('sup.formation.thUnit') }}</th>
                <th>{{ t('sup.formation.thType') }}</th>
                <th>{{ t('sup.formation.thInstructor') }}</th>
                <th class="num">{{ t('sup.formation.thHours') }}</th>
                <th class="num">{{ t('sup.formation.thCredits') }}</th>
                <th class="sf-actions-head"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in sem.ue" :key="u.id" :class="{ 'is-electif': u.electif }">
                <td class="sf-code">{{ u.code }}</td>
                <td>
                  <span class="sf-ue-nom">{{ u.intitule }}</span>
                  <span v-if="u.electif" class="sf-electif-tag">{{ t('sup.formation.types.electif') }}</span>
                </td>
                <td>
                  <span class="sf-type" :class="`t-${u.type}`">{{ typeLabel(u.type) }}</span>
                </td>
                <td class="sf-int">{{ u.intervenantNom }}</td>
                <td class="num">{{ u.volumeHoraire }}</td>
                <td class="num sf-ects">{{ u.ects }}</td>
                <td class="sf-actions">
                  <button type="button" class="sf-icon-btn" :title="t('sup.formation.edit')" @click="openEdit(u, annee, sem)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  </button>
                  <button type="button" class="sf-icon-btn is-danger" :title="t('sup.formation.delete')" @click="askDelete(u)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </td>
              </tr>
              <tr v-if="!sem.ue.length">
                <td colspan="7" class="sf-sem-empty">{{ t('sup.formation.semEmpty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="isDemoTenant" class="sf-demo-note">{{ t('sup.formation.demoNote') }}</div>

    <!-- Modale Choisir / Changer le responsable -->
    <transition name="sf-fade">
      <div v-if="respModalOpen" class="sf-modal-overlay" @click.self="closeRespModal">
        <div class="sf-modal sf-resp-modal">
          <div class="sf-modal-head">
            <h2 class="sf-modal-title">{{ t('sup.formation.respTitle') }}</h2>
            <button class="sf-modal-close" type="button" @click="closeRespModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="sf-form">
            <p class="sf-resp-modal-sub">
              {{ activeProgramme?.nom }}
            </p>
            <input
              v-model="respSearch"
              type="text"
              class="sf-input"
              :placeholder="t('sup.formation.respSearchPlaceholder')"
            />
            <ul class="sf-resp-list">
              <li
                v-for="i in intervenantsFiltresPourResp"
                :key="i.id"
                class="sf-resp-item"
                :class="{ active: i.id === activeProgramme?.responsable?.id }"
                @click="choisirResp(i)"
              >
                <div class="sf-resp-avatar sf-resp-avatar-sm">{{ initiales(i) }}</div>
                <div class="sf-resp-item-info">
                  <div class="sf-resp-item-nom">{{ i.nomComplet }}</div>
                  <div class="sf-resp-item-meta">
                    {{ statutLabel(i.statut) }} · {{ i.specialite }}
                  </div>
                </div>
                <svg v-if="i.id === activeProgramme?.responsable?.id" class="sf-resp-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </li>
              <li v-if="intervenantsFiltresPourResp.length === 0" class="sf-resp-empty-item">
                {{ t('sup.formation.respNoMatch') }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale création / édition d'UE -->
    <transition name="sf-fade">
      <div v-if="modalOpen" class="sf-modal-overlay" @click.self="closeModal">
        <div class="sf-modal">
          <div class="sf-modal-head">
            <h2 class="sf-modal-title">{{ editing ? t('sup.formation.editUe') : t('sup.formation.newUe') }}</h2>
            <button class="sf-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="sf-form" @submit.prevent="submit">
            <div class="sf-form-context">
              <strong>{{ form.programmeNom }}</strong> · {{ form.anneeNom }} · {{ t('sup.formation.semesterWord') }} {{ form.semestre }}
            </div>
            <div class="sf-field">
              <label class="sf-form-label">{{ t('sup.formation.fieldTitle') }}</label>
              <input v-model="form.intitule" type="text" class="sf-input" required />
            </div>
            <div class="sf-form-row">
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldCode') }}</label>
                <input v-model="form.code" type="text" class="sf-input" :placeholder="t('sup.formation.codePlaceholder')" />
              </div>
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldType') }}</label>
                <select v-model="form.type" class="sf-input">
                  <option value="fondamentale">{{ t('sup.formation.types.fondamentale') }}</option>
                  <option value="methodologique">{{ t('sup.formation.types.methodologique') }}</option>
                  <option value="professionnelle">{{ t('sup.formation.types.professionnelle') }}</option>
                  <option value="electif">{{ t('sup.formation.types.electif') }}</option>
                </select>
              </div>
            </div>
            <div class="sf-form-row">
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldCredits') }}</label>
                <input v-model.number="form.ects" type="number" min="1" max="12" class="sf-input" required />
              </div>
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldHours') }}</label>
                <input v-model.number="form.volumeHoraire" type="number" min="1" max="120" class="sf-input" required />
              </div>
            </div>
            <div class="sf-field">
              <label class="sf-form-label">{{ t('sup.formation.fieldInstructor') }}</label>
              <select v-model="form.intervenantId" class="sf-input">
                <option value="">{{ t('sup.formation.assignLater') }}</option>
                <option v-for="i in intervenantsTries" :key="i.id" :value="i.id">
                  {{ i.nomComplet }} ({{ statutLabel(i.statut) }}{{ i.specialite ? ', ' + i.specialite : '' }})
                </option>
              </select>
            </div>
            <p v-if="formError" class="sf-form-error">{{ formError }}</p>
            <div class="sf-modal-actions">
              <button type="button" class="sf-btn-ghost" @click="closeModal">{{ t('sup.formation.cancel') }}</button>
              <button type="submit" class="sf-btn-primary">
                {{ editing ? t('sup.formation.save') : t('sup.formation.createUe') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Modale nouvelle formation -->
    <transition name="sf-fade">
      <div v-if="progModalOpen" class="sf-modal-overlay" @click.self="closeProgModal">
        <div class="sf-modal">
          <div class="sf-modal-head">
            <h2 class="sf-modal-title">{{ t('sup.formation.newFormation') }}</h2>
            <button class="sf-modal-close" type="button" @click="closeProgModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="sf-form" @submit.prevent="submitProg">
            <div class="sf-field">
              <label class="sf-form-label">{{ t('sup.formation.fieldFormationName') }}</label>
              <input v-model="progForm.nom" type="text" class="sf-input" :placeholder="t('sup.formation.formationNamePlaceholder')" required />
            </div>
            <div class="sf-form-row" style="grid-template-columns: 1fr 130px;">
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldLevel') }}</label>
                <select v-model="progForm.niveau" class="sf-input" @change="onNiveauChange">
                  <option value="BTS">BTS</option>
                  <option value="Licence">Licence</option>
                  <option value="Master">Master</option>
                  <option value="Doctorat">Doctorat</option>
                </select>
              </div>
              <div class="sf-field">
                <label class="sf-form-label">{{ t('sup.formation.fieldDuration') }}</label>
                <input v-model.number="progForm.dureeAns" type="number" min="1" max="5" class="sf-input" required />
              </div>
            </div>
            <div class="sf-field">
              <label class="sf-form-label">{{ t('sup.formation.fieldFaculty') }}</label>
              <input v-model="progForm.faculte" type="text" class="sf-input" :placeholder="t('sup.formation.facultyPlaceholder')" />
            </div>
            <p class="sf-form-hint">{{ t('sup.formation.formationHint') }}</p>
            <p v-if="progError" class="sf-form-error">{{ progError }}</p>
            <div class="sf-modal-actions">
              <button type="button" class="sf-btn-ghost" @click="closeProgModal">{{ t('sup.formation.cancel') }}</button>
              <button type="submit" class="sf-btn-primary">{{ t('sup.formation.createFormation') }}</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Modale de confirmation (suppression) -->
    <transition name="sf-fade">
      <div v-if="confirmState.open" class="sf-modal-overlay" @click.self="closeConfirm">
        <div class="sf-modal sf-confirm-modal">
          <div class="sf-modal-head">
            <h2 class="sf-modal-title">{{ confirmState.title }}</h2>
            <button class="sf-modal-close" type="button" @click="closeConfirm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="sf-form">
            <p class="sf-confirm-message">{{ confirmState.message }}</p>
            <div class="sf-modal-actions">
              <button type="button" class="sf-btn-ghost" @click="closeConfirm">{{ t('sup.formation.cancel') }}</button>
              <button type="button" class="sf-btn-danger" @click="doConfirm">{{ confirmState.confirmLabel }}</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { UE_TYPES } from '../../stores/superieur'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useSuperieurStore()
const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

// ── Modale de confirmation (suppression) ──
const confirmState = reactive({ open: false, title: '', message: '', confirmLabel: '', onConfirm: null })
function openConfirm({ title, message, confirmLabel, onConfirm }) {
  confirmState.title = title
  confirmState.message = message
  confirmState.confirmLabel = confirmLabel
  confirmState.onConfirm = onConfirm
  confirmState.open = true
}
function closeConfirm() {
  confirmState.open = false
  confirmState.onConfirm = null
}
function doConfirm() {
  const fn = confirmState.onConfirm
  if (typeof fn === 'function') fn()
  closeConfirm()
}

const activeProgrammeId = ref(store.programmes[0].id)
const activeProgramme = computed(() =>
  store.offreParProgramme.find((p) => p.id === activeProgrammeId.value)
)

// ── Onglets semestres (par année) ──
const activeSem = reactive({})
function semActif(annee) {
  return activeSem[annee.id] || annee.semestres[0]?.semestre
}
function setSem(annee, s) { activeSem[annee.id] = s }

// ── Nouvelle formation ──
const progModalOpen = ref(false)
const progError = ref('')
const progForm = reactive({ nom: '', niveau: 'Licence', dureeAns: 3, faculte: '' })
function dureeParNiveau(n) { return n === 'BTS' || n === 'Master' ? 2 : 3 }
function onNiveauChange() { progForm.dureeAns = dureeParNiveau(progForm.niveau) }
function openProgCreate() {
  Object.assign(progForm, { nom: '', niveau: 'Licence', dureeAns: 3, faculte: '' })
  progError.value = ''
  progModalOpen.value = true
}
function closeProgModal() { progModalOpen.value = false }
function submitProg() {
  if (!progForm.nom.trim()) { progError.value = t('sup.formation.errFormationName'); return }
  const id = store.addProgramme({ ...progForm })
  progModalOpen.value = false
  if (id) activeProgrammeId.value = id
}
function askDeleteProgramme() {
  const p = activeProgramme.value
  if (!p) return
  openConfirm({
    title: t('sup.formation.deleteFormation'),
    message: t('sup.formation.deleteFormationMessage', { name: p.nom }),
    confirmLabel: t('sup.formation.delete'),
    onConfirm: () => {
      store.deleteProgramme(p.id)
      activeProgrammeId.value = store.programmes[0]?.id || store.offreParProgramme[0]?.id
    },
  })
}

const intervenantsTries = computed(() =>
  [...store.intervenants].sort((a, b) => a.nomComplet.localeCompare(b.nomComplet))
)

// ── Responsable de formation ──
const respModalOpen = ref(false)
const respSearch = ref('')
function openRespModal() { respSearch.value = ''; respModalOpen.value = true }
function closeRespModal() { respModalOpen.value = false }
const intervenantsFiltresPourResp = computed(() => {
  const q = respSearch.value.trim().toLowerCase()
  if (!q) return intervenantsTries.value
  return intervenantsTries.value.filter(
    (i) => `${i.nomComplet} ${i.specialite}`.toLowerCase().includes(q)
  )
})
function choisirResp(i) {
  store.assignResponsable(activeProgrammeId.value, i.id)
  closeRespModal()
}
function initiales(p) {
  if (!p) return '?'
  return ((p.prenom?.[0] || '') + (p.nom?.[0] || '')).toUpperCase()
}

// ── CRUD UE ──
const modalOpen = ref(false)
const editing = ref(null)
const formError = ref('')
const form = reactive({
  code: '', intitule: '', type: 'fondamentale',
  ects: 3, volumeHoraire: 24,
  anneeId: '', anneeNom: '', programmeNom: '', semestre: '',
  intervenantId: '',
})
function openCreate(annee, sem) {
  Object.assign(form, {
    code: '', intitule: '', type: 'fondamentale',
    ects: 3, volumeHoraire: 24,
    anneeId: annee.id, anneeNom: annee.nom,
    programmeNom: activeProgramme.value?.nom || '',
    semestre: sem.semestre,
    intervenantId: '',
  })
  editing.value = null; formError.value = ''; modalOpen.value = true
}
function openEdit(u, annee, sem) {
  Object.assign(form, {
    code: u.code, intitule: u.intitule, type: u.type,
    ects: u.ects, volumeHoraire: u.volumeHoraire,
    anneeId: annee.id, anneeNom: annee.nom,
    programmeNom: activeProgramme.value?.nom || '',
    semestre: sem.semestre,
    intervenantId: u.intervenantId || '',
  })
  editing.value = u; formError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false; editing.value = null }
function submit() {
  if (!form.intitule.trim()) { formError.value = t('sup.formation.errTitle'); return }
  if (!form.ects || form.ects < 1) { formError.value = t('sup.formation.errCredits'); return }
  const payload = { ...form }
  if (editing.value) store.updateUe(editing.value.id, payload)
  else store.addUe(payload)
  closeModal()
}
function askDelete(u) {
  openConfirm({
    title: t('sup.formation.deleteUeTitle'),
    message: t('sup.formation.deleteUeMessage', { name: u.intitule }),
    confirmLabel: t('sup.formation.delete'),
    onConfirm: () => store.deleteUe(u.id),
  })
}

const legend = [
  UE_TYPES.fondamentale.key,
  UE_TYPES.methodologique.key,
  UE_TYPES.professionnelle.key,
  UE_TYPES.electif.key,
]

const typeLabel = (type) => t('sup.formation.types.' + type)
const statutLabel = (statut) =>
  statut === 'vacataire' ? t('sup.formation.vacataire') : t('sup.formation.permanent')
</script>

<style scoped>
.sf-intro {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.sf-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.sf-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}

/* Tabs programme */
.sf-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.sf-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: var(--card);
  border: 1.5px solid var(--card-border);
  border-radius: 11px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.sf-tab:hover {
  border-color: var(--pr);
  color: var(--pr);
}
.sf-tab.active {
  background: var(--pr);
  border-color: var(--pr);
  color: #fff;
}
.sf-tab-niveau {
  padding: 1px 7px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.18);
}
.sf-tab:not(.active) .sf-tab-niveau.n-licence {
  background: var(--pr-light);
  color: var(--pr);
}
.sf-tab:not(.active) .sf-tab-niveau.n-master {
  background: var(--gold-light);
  color: var(--gold);
}
.sf-tab:not(.active) .sf-tab-niveau.n-doctorat {
  background: rgba(124, 58, 237, 0.12);
  color: #6D28D9;
}

/* Bandeau programme */
.sf-prog-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.sf-prog-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: var(--tx);
}
.sf-prog-meta {
  font-size: 13px;
  color: var(--tx2);
  margin-top: 3px;
}
.sf-prog-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.sf-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--tx2);
}
.sf-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* Types — couleurs */
.t-fondamentale {
  background: var(--pr-light);
  color: var(--pr);
}
.sf-legend-dot.t-fondamentale {
  background: var(--pr);
}
.t-methodologique {
  background: rgba(27, 138, 90, 0.12);
  color: var(--success);
}
.sf-legend-dot.t-methodologique {
  background: var(--success);
}
.t-professionnelle {
  background: rgba(184, 137, 42, 0.12);
  color: var(--gold);
}
.sf-legend-dot.t-professionnelle {
  background: var(--gold);
}
.t-electif {
  background: rgba(99, 102, 241, 0.12);
  color: #6366F1;
}
.sf-legend-dot.t-electif {
  background: #6366F1;
}

/* Années */
.sf-annee {
  margin-bottom: 22px;
}
.sf-annee-title {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--tx);
  margin-bottom: 10px;
  padding-left: 2px;
}
/* Onglets semestres */
.sf-sem-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.sf-sem-tab {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: 12px; padding: 9px 16px; cursor: pointer;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--tx2);
  transition: all 0.12s ease;
}
.sf-sem-tab:hover { border-color: var(--pr); }
.sf-sem-tab.active { background: var(--pr); border-color: var(--pr); color: #fff; }
.sf-sem-tab-meta { font-family: inherit; font-weight: 600; font-size: 11.5px; opacity: 0.85; }
.sf-sem-empty { text-align: center; color: var(--tx2, #6b7280); font-size: 13px; padding: 22px 12px; }
.sf-semestres {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.sf-semestre {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  overflow-x: auto; /* tableau d'UE (grille 2 col. = étroit) : défile au lieu d'être rogné */
}
.sf-sem-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  background: var(--input-bg);
  border-bottom: 1px solid var(--divider);
}
.sf-sem-name {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: var(--tx);
}
.sf-sem-totals {
  font-size: 12.5px;
  color: var(--tx2);
}
.sf-sem-totals strong {
  color: var(--pr);
  font-weight: 700;
}
.sf-sem-dot {
  color: var(--tx3);
  margin: 0 5px;
}

/* Table UE */
.sf-ue-table {
  width: 100%;
  border-collapse: collapse;
}
.sf-ue-table th {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tx3);
  text-align: left;
  padding: 7px 12px;
  border-bottom: 1px solid var(--divider);
}
.sf-ue-table th.num {
  text-align: right;
}
.sf-ue-table td {
  font-size: 12.5px;
  color: var(--tx);
  padding: 8px 12px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.sf-ue-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.sf-ue-table tbody tr:last-child td {
  border-bottom: none;
}
.sf-ue-table tr.is-electif {
  background: rgba(99, 102, 241, 0.035);
}
.sf-code {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--tx3);
  white-space: nowrap;
}
.sf-ue-nom {
  font-weight: 600;
  color: var(--tx);
}
.sf-electif-tag {
  display: inline-block;
  margin-left: 7px;
  padding: 1px 7px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366F1;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
}
.sf-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}
.sf-int {
  color: var(--tx2);
  white-space: nowrap;
}
.sf-ects {
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
  color: var(--pr);
}

.sf-demo-note {
  margin-top: 4px;
  text-align: center;
  font-size: 12px;
  color: var(--tx3);
}

/* CRUD UE */
.sf-add-btn {
  display: inline-flex; align-items: center; gap: 5px;
  margin-left: 12px;
  padding: 5px 11px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 7px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.sf-add-btn:hover { background: var(--pr-dark); }
.sf-actions-head { width: 70px; }
.sf-actions { white-space: nowrap; text-align: right; }
.sf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  background: var(--input-bg); border: none; border-radius: 6px;
  color: var(--tx2); cursor: pointer;
  margin-left: 3px;
  transition: all 0.15s ease;
}
.sf-icon-btn:hover { background: var(--pr-light); color: var(--pr); }
.sf-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.sf-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  white-space: nowrap;
  height: 40px; padding: 0 16px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.sf-btn-primary:hover { background: var(--pr-dark); }
.sf-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
  transition: all 0.15s ease;
}
.sf-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }

/* Modale */
.sf-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.sf-modal {
  width: 100%; max-width: 540px;
  max-height: 92vh; overflow-y: auto;
  background: #fff; border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.sf-form-hint { font-size: 12.5px; color: var(--tx2, #6b7280); line-height: 1.5; margin: 4px 0 0; }
.sf-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--divider);
}
.sf-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.sf-modal-close {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--input-bg); border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.sf-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.sf-form { padding: 18px 24px 22px; }
.sf-form-context {
  padding: 9px 12px; margin-bottom: 14px;
  background: var(--pr-light); color: var(--pr);
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600;
}
.sf-field + .sf-field, .sf-field + .sf-form-row, .sf-form-row + .sf-field, .sf-form-row + .sf-form-row {
  margin-top: 12px;
}
.sf-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
.sf-prog-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.sf-del-prog {
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  background: none; border: 1px solid rgba(217, 48, 37, 0.35); color: var(--danger, #D93025);
  border-radius: 9px; font-family: inherit; font-weight: 600; font-size: 12.5px;
  padding: 7px 13px; cursor: pointer; transition: background 0.15s ease;
}
.sf-del-prog:hover { background: rgba(217, 48, 37, 0.08); }
.sf-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3); margin-bottom: 5px;
}
.sf-input {
  display: block; width: 100%; height: 40px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sf-input:focus { border-color: var(--pr); }
.sf-form-error {
  margin: 12px 0 0; padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}
.sf-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;
}
.sf-fade-enter-active, .sf-fade-leave-active { transition: opacity 0.2s ease; }
.sf-fade-enter-from, .sf-fade-leave-to { opacity: 0; }

/* Bouton d'action danger (confirmation de suppression) */
.sf-btn-danger {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  white-space: nowrap;
  height: 40px; padding: 0 16px;
  background: var(--danger, #D93025); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.sf-btn-danger:hover { background: #B3271D; }
.sf-confirm-modal { max-width: 440px; }
.sf-confirm-message {
  font-size: 14px; color: var(--tx); line-height: 1.55; margin: 0;
}

/* Carte Responsable de formation */
.sf-resp-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 18px;
}
.sf-resp-left { flex: 1; min-width: 240px; }
.sf-resp-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--gold);
  margin-bottom: 8px;
}
.sf-resp-body { display: flex; align-items: center; gap: 12px; }
.sf-resp-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--gold-light); color: var(--gold);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 15px; font-weight: 800;
  flex-shrink: 0;
}
.sf-resp-avatar-sm { width: 36px; height: 36px; font-size: 13px; }
.sf-resp-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 15px; font-weight: 700; color: var(--tx);
}
.sf-resp-meta {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px;
}
.sf-resp-pill {
  padding: 2px 9px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
}
.sf-resp-pill.st-permanent { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sf-resp-pill.st-vacataire { background: var(--gold-light); color: var(--gold); }
.sf-resp-spec { font-size: 13px; color: var(--tx2); }
.sf-resp-empty {
  font-size: 14px; color: var(--tx3); font-style: italic;
}
.sf-resp-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px;
  background: var(--card); color: var(--pr);
  border: 1.5px solid var(--pr); border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s ease;
}
.sf-resp-btn:hover { background: var(--pr); color: #fff; }

/* Modale liste responsables */
.sf-resp-modal { max-width: 520px; }
.sf-resp-modal-sub {
  margin: 0 0 14px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px; font-weight: 600; color: var(--tx);
}
.sf-resp-list {
  list-style: none; margin: 14px 0 0; padding: 0;
  max-height: 360px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
}
.sf-resp-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.sf-resp-item:hover { background: var(--pr-light); }
.sf-resp-item.active { background: var(--pr-light); }
.sf-resp-item-info { flex: 1; min-width: 0; }
.sf-resp-item-nom {
  font-weight: 600; color: var(--tx); font-size: 14px;
}
.sf-resp-item-meta {
  font-size: 12.5px; color: var(--tx3); margin-top: 2px;
}
.sf-resp-check { color: var(--pr); flex-shrink: 0; }
.sf-resp-empty-item {
  padding: 16px; text-align: center;
  color: var(--tx3); font-size: 13.5px;
}

@media (max-width: 900px) {
  .sf-semestres {
    grid-template-columns: 1fr;
  }
}
</style>
