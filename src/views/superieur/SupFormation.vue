<template>
  <div class="sf">
    <div class="sf-intro">
      <h1 class="sf-h1">Offre de formation</h1>
      <p class="sf-sub">Unités d'enseignement, crédits et cours électifs par programme</p>
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
            {{ activeProgramme.dureeAns }} ans · {{ activeProgramme.annees.length }} années ·
            {{ activeProgramme.ectsTotal }} crédits au total
          </div>
        </div>
        <div class="sf-prog-legend">
          <span v-for="t in legend" :key="t.key" class="sf-legend-item">
            <span class="sf-legend-dot" :class="`t-${t.key}`"></span>{{ t.label }}
          </span>
        </div>
      </div>

      <!-- Responsable de la formation -->
      <div class="sf-resp-card">
        <div class="sf-resp-left">
          <div class="sf-resp-label">Responsable de la formation</div>
          <div v-if="activeProgramme.responsable" class="sf-resp-body">
            <div class="sf-resp-avatar">{{ initiales(activeProgramme.responsable) }}</div>
            <div>
              <div class="sf-resp-nom">{{ activeProgramme.responsable.nomComplet }}</div>
              <div class="sf-resp-meta">
                <span class="sf-resp-pill" :class="`st-${activeProgramme.responsable.statut}`">
                  {{ activeProgramme.responsable.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}
                </span>
                <span class="sf-resp-spec">{{ activeProgramme.responsable.specialite }}</span>
              </div>
            </div>
          </div>
          <div v-else class="sf-resp-empty">Aucun responsable désigné.</div>
        </div>
        <button class="sf-resp-btn" type="button" @click="openRespModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6M19 8v6"/></svg>
          {{ activeProgramme.responsable ? 'Changer le responsable' : 'Désigner un responsable' }}
        </button>
      </div>

      <!-- Années -->
      <div v-for="annee in activeProgramme.annees" :key="annee.id" class="sf-annee">
        <div class="sf-annee-title">{{ annee.nom }}</div>
        <div class="sf-semestres">
          <div v-for="sem in annee.semestres" :key="sem.semestre" class="sf-semestre">
            <div class="sf-sem-head">
              <span class="sf-sem-name">{{ sem.semestre }}</span>
              <span class="sf-sem-totals">
                {{ sem.ue.length }} UE
                <span class="sf-sem-dot">•</span>
                <strong>{{ sem.totalEcts }} crédits</strong>
                <span class="sf-sem-dot">•</span>
                {{ sem.totalHeures }} h
              </span>
              <button class="sf-add-btn" type="button" @click="openCreate(annee, sem)" title="Ajouter une UE">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Nouvelle UE
              </button>
            </div>
            <table class="sf-ue-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Unité d'enseignement</th>
                  <th>Type</th>
                  <th>Intervenant</th>
                  <th class="num">Heures</th>
                  <th class="num">crédits</th>
                  <th class="sf-actions-head"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in sem.ue" :key="u.id" :class="{ 'is-electif': u.electif }">
                  <td class="sf-code">{{ u.code }}</td>
                  <td>
                    <span class="sf-ue-nom">{{ u.intitule }}</span>
                    <span v-if="u.electif" class="sf-electif-tag">Électif</span>
                  </td>
                  <td>
                    <span class="sf-type" :class="`t-${u.type}`">{{ typeLabel(u.type) }}</span>
                  </td>
                  <td class="sf-int">{{ u.intervenantNom }}</td>
                  <td class="num">{{ u.volumeHoraire }}</td>
                  <td class="num sf-ects">{{ u.ects }}</td>
                  <td class="sf-actions">
                    <button type="button" class="sf-icon-btn" title="Modifier" @click="openEdit(u, annee, sem)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                    </button>
                    <button type="button" class="sf-icon-btn is-danger" title="Supprimer" @click="askDelete(u)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isDemoTenant" class="sf-demo-note">Données de démonstration — maquette pédagogique fictive.</div>

    <!-- Modale Choisir / Changer le responsable -->
    <transition name="sf-fade">
      <div v-if="respModalOpen" class="sf-modal-overlay" @click.self="closeRespModal">
        <div class="sf-modal sf-resp-modal">
          <div class="sf-modal-head">
            <h2 class="sf-modal-title">Responsable de la formation</h2>
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
              placeholder="Rechercher un intervenant…"
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
                    {{ i.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }} · {{ i.specialite }}
                  </div>
                </div>
                <svg v-if="i.id === activeProgramme?.responsable?.id" class="sf-resp-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </li>
              <li v-if="intervenantsFiltresPourResp.length === 0" class="sf-resp-empty-item">
                Aucun intervenant ne correspond à la recherche.
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
            <h2 class="sf-modal-title">{{ editing ? "Modifier l'UE" : 'Nouvelle UE' }}</h2>
            <button class="sf-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="sf-form" @submit.prevent="submit">
            <div class="sf-form-context">
              <strong>{{ form.programmeNom }}</strong> · {{ form.anneeNom }} · Semestre {{ form.semestre }}
            </div>
            <div class="sf-field">
              <label class="sf-form-label">Intitulé</label>
              <input v-model="form.intitule" type="text" class="sf-input" required />
            </div>
            <div class="sf-form-row">
              <div class="sf-field">
                <label class="sf-form-label">Code (auto si vide)</label>
                <input v-model="form.code" type="text" class="sf-input" placeholder="ex. FND-070" />
              </div>
              <div class="sf-field">
                <label class="sf-form-label">Type</label>
                <select v-model="form.type" class="sf-input">
                  <option value="fondamentale">Fondamentale</option>
                  <option value="methodologique">Méthodologique</option>
                  <option value="professionnelle">Professionnelle</option>
                  <option value="electif">Électif</option>
                </select>
              </div>
            </div>
            <div class="sf-form-row">
              <div class="sf-field">
                <label class="sf-form-label">Crédits</label>
                <input v-model.number="form.ects" type="number" min="1" max="12" class="sf-input" required />
              </div>
              <div class="sf-field">
                <label class="sf-form-label">Volume horaire</label>
                <input v-model.number="form.volumeHoraire" type="number" min="1" max="120" class="sf-input" required />
              </div>
            </div>
            <div class="sf-field">
              <label class="sf-form-label">Intervenant</label>
              <select v-model="form.intervenantId" class="sf-input">
                <option value="">— À attribuer plus tard —</option>
                <option v-for="i in intervenantsTries" :key="i.id" :value="i.id">
                  {{ i.nomComplet }} ({{ i.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}{{ i.specialite ? ', ' + i.specialite : '' }})
                </option>
              </select>
            </div>
            <p v-if="formError" class="sf-form-error">{{ formError }}</p>
            <div class="sf-modal-actions">
              <button type="button" class="sf-btn-ghost" @click="closeModal">Annuler</button>
              <button type="submit" class="sf-btn-primary">
                {{ editing ? 'Enregistrer' : "Créer l'UE" }}
              </button>
            </div>
          </form>
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

const store = useSuperieurStore()
const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

const activeProgrammeId = ref(store.programmes[0].id)
const activeProgramme = computed(() =>
  store.offreParProgramme.find((p) => p.id === activeProgrammeId.value)
)

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
  if (!form.intitule.trim()) { formError.value = "L'intitulé est obligatoire."; return }
  if (!form.ects || form.ects < 1) { formError.value = 'Les crédits sont obligatoires.'; return }
  const payload = { ...form }
  if (editing.value) store.updateUe(editing.value.id, payload)
  else store.addUe(payload)
  closeModal()
}
function askDelete(u) {
  if (window.confirm(`Supprimer l'UE "${u.intitule}" ? Cette action retire l'UE des inscriptions et des notes.`)) {
    store.deleteUe(u.id)
  }
}

const legend = [
  UE_TYPES.fondamentale,
  UE_TYPES.methodologique,
  UE_TYPES.professionnelle,
  UE_TYPES.electif,
]

const typeLabel = (t) => UE_TYPES[t]?.label || t
</script>

<style scoped>
.sf-intro {
  margin-bottom: 16px;
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
  overflow: hidden;
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
  background: var(--card); border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
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
.sf-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
