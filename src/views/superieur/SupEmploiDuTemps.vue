<template>
  <div class="st">
    <div class="st-intro">
      <div>
        <h1 class="st-h1">Emploi du temps</h1>
        <p class="st-sub">Planning hebdomadaire par formation, niveau et semestre</p>
      </div>
      <div class="st-intro-actions">
        <button class="st-btn-ghost" type="button" :disabled="sessionCount === 0 || proposalMode" @click="exportEdt">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
          Excel
        </button>
        <button class="st-btn-ghost" type="button" :disabled="sessionCount === 0 || proposalMode" @click="exportEdtPdf">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          PDF
        </button>
        <button class="st-btn-ghost" type="button" :disabled="proposalMode" @click="openConfig">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Paramètres
        </button>
        <button
          class="st-btn-miapo"
          type="button"
          :disabled="proposalMode"
          title="MIAPO propose un emploi du temps pour cette promotion et ce semestre"
          @click="recommanderEdt"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>
          Recommander (MIAPO)
        </button>
        <button
          class="st-btn-primary"
          :class="{ 'is-on': editMode }"
          type="button"
          :disabled="proposalMode"
          @click="toggleEdit"
        >
          <svg v-if="!editMode" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ editMode ? "Terminer l'édition" : "Modifier l'emploi du temps" }}
        </button>
      </div>
    </div>

    <!-- Sélecteurs : Formation → Niveau/Promotion -->
    <div class="st-bar">
      <div class="st-filter">
        <span class="st-filter-label">Formation</span>
        <select :value="selectedCycle" :disabled="proposalMode" @change="onCycleChange($event.target.value)">
          <option v-for="c in cycles" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="st-filter">
        <span class="st-filter-label">Niveau / Promotion</span>
        <select :value="store.selectedPromotionId" :disabled="proposalMode" @change="onPromoChange($event.target.value)">
          <option v-for="p in promotionsForCycle" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
      </div>
      <div class="st-context">
        <span class="st-context-sem">Semestre {{ activeSemestre }}</span>
        <span class="st-context-count">{{ sessionCount }} séance{{ sessionCount > 1 ? 's' : '' }} / semaine</span>
      </div>
      <div class="st-legend">
        <span v-for="t in legend" :key="t.key" class="st-legend-item">
          <span class="st-legend-dot" :class="`t-${t.key}`"></span>{{ t.label }}
        </span>
      </div>
    </div>

    <!-- Onglets semestre -->
    <div class="st-tabs">
      <button
        v-for="sem in semestres"
        :key="sem"
        type="button"
        class="st-tab"
        :class="{ 'is-active': sem === activeSemestre }"
        :disabled="proposalMode"
        @click="activeSemestre = sem"
      >
        Semestre {{ sem }}
      </button>
    </div>

    <!-- Bandeau mode édition -->
    <div v-if="editMode" class="st-editing-banner">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      Mode édition — cliquez une case pour ajouter, modifier ou supprimer une séance ; glissez-déposez une séance pour la déplacer.
    </div>

    <!-- Indice discret (déplacement impossible) -->
    <transition name="st-fade">
      <div v-if="moveHint" class="st-move-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        {{ moveHint }}
      </div>
    </transition>

    <!-- Message court (succès / info) -->
    <transition name="st-fade">
      <div v-if="toast" class="st-toast" :class="`is-${toast.type}`">
        <svg v-if="toast.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        {{ toast.msg }}
      </div>
    </transition>

    <!-- Proposition MIAPO : « MIAPO propose, la scolarité valide » -->
    <div v-if="proposalMode && proposal" class="st-proposal-banner">
      <div class="st-proposal-main">
        <span class="st-proposal-ico">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>
        </span>
        <div>
          <div class="st-proposal-title">MIAPO propose cet emploi du temps</div>
          <div class="st-proposal-sub">
            {{ proposal.n }} séance{{ proposal.n > 1 ? 's' : '' }} placée{{ proposal.n > 1 ? 's' : '' }}<template v-if="proposal.k > 0">, {{ proposal.k }} UE non placée{{ proposal.k > 1 ? 's' : '' }}</template>.
            <span class="st-proposal-tag">MIAPO propose, la scolarité valide.</span>
          </div>
        </div>
      </div>
      <div class="st-proposal-actions">
        <button type="button" class="st-btn-ghost" @click="cancelProposal">Annuler</button>
        <button type="button" class="st-btn-miapo" @click="validateProposal">Valider</button>
      </div>
    </div>

    <!-- Grille -->
    <div class="st-grid-wrap" :class="{ 'is-editing': editMode }">
      <table class="st-grid">
        <thead>
          <tr>
            <th class="st-corner"></th>
            <th v-for="jour in jours" :key="jour">{{ jour }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cr in creneaux" :key="cr.debut + '-' + cr.fin">
            <td class="st-creneau">
              <span class="st-creneau-h">{{ cr.debut }}</span>
              <span class="st-creneau-sep">—</span>
              <span class="st-creneau-h">{{ cr.fin }}</span>
            </td>
            <td
              v-for="jour in jours"
              :key="jour"
              class="st-cell"
              :class="{
                'is-clickable': editMode,
                'is-drag-source': dragSource && dragSource.jour === jour && dragSource.debut === cr.debut,
                'is-drop-target': dragTarget && dragTarget.jour === jour && dragTarget.debut === cr.debut,
              }"
              :draggable="editMode && !!getSession(jour, cr.debut)"
              @click="editMode && !dragSource && onCellClick(jour, cr)"
              @dragstart="onDragStart($event, jour, cr)"
              @dragover.prevent="onDragOver(jour, cr)"
              @dragleave="onDragLeave"
              @drop.prevent="onDrop(jour, cr)"
              @dragend="onDragEnd"
            >
              <div
                v-if="getSession(jour, cr.debut)"
                class="st-session"
                :class="[`t-${getSession(jour, cr.debut).type}`, { 'is-proposal': proposalMode }]"
              >
                <span v-if="proposalMode" class="st-proposal-badge">MIAPO</span>
                <div class="st-session-code">{{ getSession(jour, cr.debut).ueCode }}</div>
                <div class="st-session-nom">{{ getSession(jour, cr.debut).ueIntitule }}</div>
                <div class="st-session-meta">
                  <span>{{ getSession(jour, cr.debut).intervenantNom }}</span>
                  <span class="st-session-salle">{{ getSession(jour, cr.debut).salle }}</span>
                </div>
                <span v-if="editMode" class="st-session-edit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                </span>
              </div>
              <div v-else class="st-empty-cell" :class="{ 'is-add': editMode }">
                <span v-if="editMode" class="st-add-plus">+</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="sessionCount === 0" class="st-empty-hint">
      Aucune séance pour ce semestre.
      <template v-if="editMode">Cliquez une case pour ajouter un cours.</template>
      <template v-else>Activez « Modifier l'emploi du temps » pour le construire.</template>
    </p>

    <div v-if="isDemoTenant" class="st-demo-note">Données de démonstration — planning fictif.</div>

    <!-- Modale : éditeur de séance -->
    <transition name="st-fade">
      <div v-if="editorOpen" class="st-modal-overlay" @click.self="editorOpen = false">
        <div class="st-modal">
          <div class="st-modal-head">
            <div>
              <h2 class="st-modal-title">{{ editorEditing ? 'Modifier la séance' : 'Nouvelle séance' }}</h2>
              <p class="st-modal-sub">{{ editorCell.jour }} · {{ editorCell.debut }}–{{ editorCell.fin }}</p>
            </div>
            <button class="st-modal-close" type="button" @click="editorOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="st-form" @submit.prevent="submitEditor">
            <div v-if="uesPromo.length" class="st-field">
              <label class="st-form-label">Pré-remplir depuis une UE du semestre</label>
              <select v-model="ueChoisieId" class="st-input" @change="onPickUe">
                <option value="">— Choisir une UE (optionnel) —</option>
                <option v-for="u in uesPromo" :key="u.id" :value="u.id">
                  {{ u.code }} · {{ u.intitule }}
                </option>
              </select>
            </div>
            <div class="st-form-row">
              <div class="st-field">
                <label class="st-form-label">Code UE</label>
                <input v-model="editorForm.ueCode" type="text" class="st-input" placeholder="FND-012" />
              </div>
              <div class="st-field st-field-grow">
                <label class="st-form-label">Intitulé UE</label>
                <input v-model="editorForm.ueIntitule" type="text" class="st-input" placeholder="Marketing fondamental" />
              </div>
            </div>
            <div class="st-field">
              <label class="st-form-label">Intervenant</label>
              <input v-model="editorForm.intervenantNom" type="text" class="st-input" list="st-intervenants" placeholder="Nom de l'intervenant" />
              <datalist id="st-intervenants">
                <option v-for="n in intervenantOptions" :key="n" :value="n"></option>
              </datalist>
            </div>
            <div class="st-form-row">
              <div class="st-field">
                <label class="st-form-label">Salle</label>
                <input v-model="editorForm.salle" type="text" class="st-input" list="st-salles" placeholder="Salle 101" />
                <datalist id="st-salles">
                  <option v-for="n in salleOptions" :key="n" :value="n"></option>
                </datalist>
              </div>
              <div class="st-field">
                <label class="st-form-label">Type d'UE</label>
                <select v-model="editorForm.type" class="st-input">
                  <option v-for="t in Object.values(UE_TYPES)" :key="t.key" :value="t.key">{{ t.label }}</option>
                </select>
              </div>
            </div>
            <p v-if="editorError" class="st-form-error">{{ editorError }}</p>
            <div class="st-modal-actions">
              <button v-if="editorEditing" type="button" class="st-btn-danger" @click="confirmDeleteOpen = true">
                Supprimer
              </button>
              <span class="st-spacer"></span>
              <button type="button" class="st-btn-ghost" @click="editorOpen = false">Annuler</button>
              <button type="submit" class="st-btn-primary">
                {{ editorEditing ? 'Enregistrer' : 'Ajouter la séance' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Confirmation de suppression -->
    <transition name="st-fade">
      <div v-if="confirmDeleteOpen" class="st-modal-overlay st-modal-overlay-top" @click.self="confirmDeleteOpen = false">
        <div class="st-modal st-modal-sm">
          <div class="st-modal-head">
            <h2 class="st-modal-title">Supprimer la séance ?</h2>
          </div>
          <div class="st-confirm-body">
            <p>Cette séance sera retirée de l'emploi du temps de cette promotion pour le semestre {{ activeSemestre }}.</p>
          </div>
          <div class="st-modal-actions">
            <span class="st-spacer"></span>
            <button type="button" class="st-btn-ghost" @click="confirmDeleteOpen = false">Annuler</button>
            <button type="button" class="st-btn-danger" @click="confirmDelete">Supprimer</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale : paramètres de la grille -->
    <transition name="st-fade">
      <div v-if="configOpen" class="st-modal-overlay" @click.self="configOpen = false">
        <div class="st-modal">
          <div class="st-modal-head">
            <div>
              <h2 class="st-modal-title">Paramètres de la grille</h2>
              <p class="st-modal-sub">Créneaux horaires et jours ouvrés</p>
            </div>
            <button class="st-modal-close" type="button" @click="configOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="st-form">
            <label class="st-form-label">Créneaux horaires</label>
            <div class="st-cfg-creneaux">
              <div v-for="(c, i) in cfgForm.creneaux" :key="i" class="st-cfg-row">
                <input v-model="c.debut" type="time" class="st-input st-input-time" />
                <span class="st-cfg-dash">—</span>
                <input v-model="c.fin" type="time" class="st-input st-input-time" />
                <div class="st-cfg-move">
                  <button type="button" class="st-icon-btn" title="Monter" :disabled="i === 0" @click="moveCreneau(i, -1)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button type="button" class="st-icon-btn" title="Descendre" :disabled="i === cfgForm.creneaux.length - 1" @click="moveCreneau(i, 1)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
                <button type="button" class="st-icon-btn is-danger" title="Retirer" @click="removeCreneau(i)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
            <button type="button" class="st-cfg-add" @click="addCreneau">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Ajouter un créneau
            </button>

            <label class="st-form-label st-cfg-jours-label">Jours ouvrés</label>
            <div class="st-cfg-jours">
              <label v-for="j in JOURS_SEMAINE" :key="j" class="st-cfg-jour" :class="{ 'is-on': cfgForm.jours.includes(j) }">
                <input type="checkbox" :checked="cfgForm.jours.includes(j)" @change="toggleJour(j)" />
                {{ j }}
              </label>
            </div>

            <p v-if="cfgError" class="st-form-error">{{ cfgError }}</p>
            <div class="st-modal-actions">
              <button type="button" class="st-btn-ghost" @click="resetConfigDefaults">Valeurs par défaut</button>
              <span class="st-spacer"></span>
              <button type="button" class="st-btn-ghost" @click="configOpen = false">Annuler</button>
              <button type="button" class="st-btn-primary" @click="saveConfig">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useSuperieurStore, UE_TYPES, SALLES_POOL_EDT } from '../../stores/superieur'
import { useSuperieurEdtStore } from '../../stores/superieurEdt'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'

const store = useSuperieurStore()
const edtStore = useSuperieurEdtStore()
const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

// ── Grille : créneaux + jours (configurables) ──
const jours = computed(() => edtStore.config.jours)
const creneaux = computed(() => edtStore.config.creneaux)
const JOURS_SEMAINE = edtStore.JOURS_SEMAINE

const legend = [
  UE_TYPES.fondamentale,
  UE_TYPES.methodologique,
  UE_TYPES.professionnelle,
  UE_TYPES.electif,
]

// ── Filtre à deux étages : Formation (cycle) → Niveau/Promotion ──
const CYCLE_ORDER = ['BTS', 'Licence', 'Master', 'Doctorat']
const cycles = computed(() => {
  const set = [...new Set(store.promotions.map((p) => p.niveau))]
  return set.sort((a, b) => {
    const ia = CYCLE_ORDER.indexOf(a)
    const ib = CYCLE_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })
})
const selectedCycle = ref(store.selectedPromotion.niveau)
const promotionsForCycle = computed(() =>
  store.promotions.filter((p) => p.niveau === selectedCycle.value)
)
function onCycleChange(cycle) {
  selectedCycle.value = cycle
  const list = store.promotions.filter((p) => p.niveau === cycle)
  if (list.length && !list.some((p) => p.id === store.selectedPromotionId)) {
    store.setPromotion(list[0].id)
  }
}
function onPromoChange(id) {
  store.setPromotion(id)
}

// ── Onglets semestre ──
const semestres = computed(() => {
  const s = store.selectedPromotion.semestres
  return Array.isArray(s) && s.length ? s : ['S1', 'S2']
})
const activeSemestre = ref(store.selectedPromotion.semestreCourant)

// Garder le filtre et le semestre synchronisés quand la promotion change.
watch(
  () => store.selectedPromotionId,
  () => {
    const promo = store.selectedPromotion
    if (promo.niveau !== selectedCycle.value) selectedCycle.value = promo.niveau
    activeSemestre.value = promo.semestreCourant
    editorOpen.value = false
    confirmDeleteOpen.value = false
    dragSource.value = null
    dragTarget.value = null
    proposalMode.value = false
    proposal.value = null
  }
)

// ── Séances effectives = démo (semestre courant) fusionnées avec les éditions ──
// Les séances de démonstration ne portent pas de champ `semestre` : elles
// correspondent toutes au `semestreCourant` de la promotion. On ne les affiche
// donc que sur cet onglet ; les autres semestres se construisent en mode édition.
function hasDemoAt(jour, debut) {
  if (activeSemestre.value !== store.selectedPromotion.semestreCourant) return false
  return store.emploiDuTemps.some((s) => s.jour === jour && s.debut === debut)
}
const grid = computed(() => {
  const promo = store.selectedPromotion
  const sem = activeSemestre.value
  const map = {}
  if (sem === promo.semestreCourant) {
    for (const s of store.emploiDuTemps) {
      map[`${s.jour}__${s.debut}`] = { ...s, _source: 'demo' }
    }
  }
  for (const e of edtStore.getEdits(promo.id, sem)) {
    const cellKey = `${e.jour}__${e.debut}`
    if (e.deleted) delete map[cellKey]
    else map[cellKey] = { ...e, _source: 'edit' }
  }
  return map
})

// ── Proposition MIAPO (aperçu avant validation) ──
// Pendant l'aperçu, la grille affiche la proposition (et non la fusion démo+éditions).
const proposalMode = ref(false)
const proposal = ref(null) // { promotionId, semestre, sessions, n, k }
const proposalGrid = computed(() => {
  const map = {}
  if (proposal.value) {
    for (const s of proposal.value.sessions) map[`${s.jour}__${s.debut}`] = s
  }
  return map
})

function getSession(jour, debut) {
  const src = proposalMode.value ? proposalGrid.value : grid.value
  return src[`${jour}__${debut}`] || null
}
const sessionCount = computed(() =>
  Object.keys(proposalMode.value ? proposalGrid.value : grid.value).length
)

// ── Export XLSX de l'emploi du temps affiché (promotion + semestre actifs) ──
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // retire les accents
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}
function finForDebut(debut) {
  return creneaux.value.find((c) => c.debut === debut)?.fin || ''
}
function buildEdtExport() {
  const rows = Object.values(grid.value)
  const dayIndex = (j) => {
    const i = jours.value.indexOf(j)
    return i === -1 ? JOURS_SEMAINE.indexOf(j) : i
  }
  const sorted = [...rows].sort((a, b) => {
    const d = dayIndex(a.jour) - dayIndex(b.jour)
    if (d !== 0) return d
    return String(a.debut).localeCompare(String(b.debut))
  })
  const columns = [
    { key: 'jour', label: 'Jour', width: 12 },
    { key: 'creneau', label: 'Créneau', width: 16 },
    { key: 'ueCode', label: 'Code UE', width: 12 },
    { key: 'ueIntitule', label: 'Intitulé', width: 34 },
    { key: 'intervenant', label: 'Intervenant', width: 24 },
    { key: 'salle', label: 'Salle', width: 12 },
    { key: 'type', label: 'Type', width: 16 },
  ]
  const data = sorted.map((s) => ({
    jour: s.jour || '',
    creneau: `${s.debut || ''}–${s.fin || finForDebut(s.debut)}`,
    ueCode: s.ueCode || '',
    ueIntitule: s.ueIntitule || '',
    intervenant: s.intervenantNom || '',
    salle: s.salle || '',
    type: UE_TYPES[s.type]?.label || s.type || '',
  }))
  const promo = store.selectedPromotion
  const filename = `emploi_du_temps_${slugify(promo.programmeNom)}_${slugify(promo.anneeNom)}_${slugify(activeSemestre.value)}`
  const title = `Emploi du temps — ${promo.programmeNom} ${promo.anneeNom} · ${activeSemestre.value}`
  return { data, columns, filename, title }
}
function exportEdt() {
  const { data, columns, filename } = buildEdtExport()
  if (!data.length) return
  exportToExcel(data, columns, filename, 'Emploi du temps')
}
function exportEdtPdf() {
  const { data, columns, filename, title } = buildEdtExport()
  if (!data.length) return
  exportToPdf(data, columns, filename, { title })
}

// ── Mode édition ──
const editMode = ref(false)
function toggleEdit() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    editorOpen.value = false
    dragSource.value = null
    dragTarget.value = null
  }
}

// ── Glisser-déposer des séances (mode édition uniquement) ──
const dragSource = ref(null)  // { jour, debut, fin }
const dragTarget = ref(null)  // { jour, debut }
const moveHint = ref('')
let moveHintTimer = null
function flashMoveHint(msg) {
  moveHint.value = msg
  if (moveHintTimer) clearTimeout(moveHintTimer)
  moveHintTimer = setTimeout(() => { moveHint.value = '' }, 2600)
}
function onDragStart(event, jour, cr) {
  // Seule une case remplie, en mode édition, est déplaçable.
  if (!editMode.value || !getSession(jour, cr.debut)) {
    event.preventDefault()
    return
  }
  dragSource.value = { jour, debut: cr.debut, fin: cr.fin }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    try { event.dataTransfer.setData('text/plain', `${jour}__${cr.debut}`) } catch (e) { /* silent */ }
  }
}
function onDragOver(jour, cr) {
  if (!dragSource.value) return
  if (dragSource.value.jour === jour && dragSource.value.debut === cr.debut) {
    dragTarget.value = null
    return
  }
  dragTarget.value = { jour, debut: cr.debut }
}
function onDragLeave() {
  dragTarget.value = null
}
function onDragEnd() {
  dragSource.value = null
  dragTarget.value = null
}
function onDrop(jour, cr) {
  const src = dragSource.value
  dragSource.value = null
  dragTarget.value = null
  if (!src) return
  if (src.jour === jour && src.debut === cr.debut) return
  // Cible occupée → on bloque avec un indice discret (comportement le plus simple et correct).
  if (getSession(jour, cr.debut)) {
    flashMoveHint('Case déjà occupée — déposez la séance sur une case libre.')
    return
  }
  const session = getSession(src.jour, src.debut)
  if (!session) return
  edtStore.moveSession(
    store.selectedPromotion.id,
    activeSemestre.value,
    { jour: src.jour, debut: src.debut, fin: src.fin },
    { jour, debut: cr.debut, fin: cr.fin },
    {
      ueCode: session.ueCode,
      ueIntitule: session.ueIntitule,
      intervenantNom: session.intervenantNom,
      salle: session.salle,
      type: session.type,
      fin: session.fin,
    },
    hasDemoAt(src.jour, src.debut)
  )
}

// ── Éditeur de séance ──
const editorOpen = ref(false)
const editorEditing = ref(false)
const editorError = ref('')
const editorCell = ref({ jour: '', debut: '', fin: '' })
const ueChoisieId = ref('')
const editorForm = reactive({
  ueCode: '', ueIntitule: '', intervenantNom: '', salle: '', type: 'fondamentale',
})
function resetEditorForm() {
  Object.assign(editorForm, { ueCode: '', ueIntitule: '', intervenantNom: '', salle: '', type: 'fondamentale' })
}
function onCellClick(jour, cr) {
  const existing = getSession(jour, cr.debut)
  editorCell.value = { jour, debut: cr.debut, fin: cr.fin }
  editorError.value = ''
  ueChoisieId.value = ''
  if (existing) {
    Object.assign(editorForm, {
      ueCode: existing.ueCode || '',
      ueIntitule: existing.ueIntitule || '',
      intervenantNom: existing.intervenantNom || '',
      salle: existing.salle || '',
      type: existing.type || 'fondamentale',
    })
    editorEditing.value = true
  } else {
    resetEditorForm()
    editorEditing.value = false
  }
  editorOpen.value = true
}
function submitEditor() {
  if (!editorForm.ueCode.trim() && !editorForm.ueIntitule.trim()) {
    editorError.value = "Renseignez au moins le code ou l'intitulé de l'UE."
    return
  }
  edtStore.setSession(store.selectedPromotion.id, activeSemestre.value, {
    jour: editorCell.value.jour,
    debut: editorCell.value.debut,
    fin: editorCell.value.fin,
    ueCode: editorForm.ueCode,
    ueIntitule: editorForm.ueIntitule,
    intervenantNom: editorForm.intervenantNom,
    salle: editorForm.salle,
    type: editorForm.type,
  })
  editorOpen.value = false
}

// Suppression (avec confirmation en pop-in)
const confirmDeleteOpen = ref(false)
function confirmDelete() {
  const cell = editorCell.value
  edtStore.deleteSession(
    store.selectedPromotion.id,
    activeSemestre.value,
    cell.jour,
    cell.debut,
    hasDemoAt(cell.jour, cell.debut)
  )
  confirmDeleteOpen.value = false
  editorOpen.value = false
}

// UE du semestre pour pré-remplir l'éditeur + listes de suggestions
const uesPromo = computed(() =>
  store.ue.filter(
    (u) => u.promotionId === store.selectedPromotion.id && u.semestre === activeSemestre.value
  )
)
function onPickUe() {
  const u = store.ue.find((x) => x.id === ueChoisieId.value)
  if (!u) return
  editorForm.ueCode = u.code || ''
  editorForm.ueIntitule = u.intitule || ''
  editorForm.type = u.type || 'fondamentale'
  editorForm.intervenantNom = u.intervenantNom || ''
}
const intervenantOptions = computed(() =>
  [...new Set(store.intervenants.map((i) => i.nomComplet).filter(Boolean))]
)
const salleOptions = computed(() =>
  [...new Set(store.salles.map((s) => s.nom).filter(Boolean))]
)

// ── Paramètres de la grille ──
const configOpen = ref(false)
const cfgError = ref('')
const cfgForm = reactive({ creneaux: [], jours: [] })
function openConfig() {
  cfgForm.creneaux = edtStore.config.creneaux.map((c) => ({ debut: c.debut, fin: c.fin }))
  cfgForm.jours = [...edtStore.config.jours]
  cfgError.value = ''
  configOpen.value = true
}
function addCreneau() {
  cfgForm.creneaux.push({ debut: '', fin: '' })
}
function removeCreneau(i) {
  cfgForm.creneaux.splice(i, 1)
}
function moveCreneau(i, dir) {
  const j = i + dir
  if (j < 0 || j >= cfgForm.creneaux.length) return
  const arr = cfgForm.creneaux
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
function toggleJour(j) {
  const i = cfgForm.jours.indexOf(j)
  if (i === -1) cfgForm.jours.push(j)
  else cfgForm.jours.splice(i, 1)
}
function saveConfig() {
  const valid = cfgForm.creneaux.filter((c) => c.debut && c.fin)
  if (!valid.length) {
    cfgError.value = 'Ajoutez au moins un créneau (heure de début et de fin).'
    return
  }
  if (!cfgForm.jours.length) {
    cfgError.value = 'Sélectionnez au moins un jour.'
    return
  }
  edtStore.saveConfig({ creneaux: cfgForm.creneaux, jours: cfgForm.jours })
  configOpen.value = false
}
function resetConfigDefaults() {
  cfgForm.creneaux = edtStore.DEFAULT_CRENEAUX.map((c) => ({ ...c }))
  cfgForm.jours = [...edtStore.DEFAULT_JOURS]
  cfgError.value = ''
}

// ── Message court (succès / info) ──
const toast = ref(null) // { msg, type: 'success' | 'info' }
let toastTimer = null
function showToast(msg, type = 'success') {
  toast.value = { msg, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

// ── Recommandation MIAPO : proposition d'emploi du temps ──
// Générateur HEURISTIQUE et DÉTERMINISTE (aucun appel réseau ni IA). À partir des
// UE de la promotion + du semestre actif, on place des séances sur les créneaux
// configurés en évitant de sur-réserver un intervenant et en variant les salles.
// Même clic → même résultat (tris et parcours stables, sans aléatoire).
function buildProposal() {
  const promo = store.selectedPromotion
  const sem = activeSemestre.value

  // 1. UE de la promotion pour ce semestre.
  const ues = store.ue.filter((u) => u.promotionId === promo.id && u.semestre === sem)
  // Ordre déterministe : volume horaire décroissant, puis code (départage stable).
  const sorted = [...ues].sort(
    (a, b) => (b.volumeHoraire || 0) - (a.volumeHoraire || 0) ||
      String(a.code || '').localeCompare(String(b.code || ''))
  )

  // 2. Créneaux disponibles = jours × créneaux configurés (ordre de la config).
  const slots = []
  for (const jour of jours.value) {
    for (const cr of creneaux.value) {
      slots.push({ jour, debut: cr.debut, fin: cr.fin })
    }
  }
  const totalSlots = slots.length

  // 3. Nombre de séances/semaine par UE selon le volume horaire (1 à 3),
  //    plafonné pour que le total ne dépasse jamais les créneaux disponibles.
  const demandes = sorted.map((u) => ({
    ue: u,
    veut: Math.max(1, Math.min(3, Math.round((u.volumeHoraire || 0) / 24))),
    place: 0,
    bloque: false,
  }))
  let totalVeut = demandes.reduce((s, d) => s + d.veut, 0)
  while (totalVeut > totalSlots) {
    // On réduit d'abord les UE les plus gourmandes (veut > 1), puis les autres.
    let idx = demandes.findIndex((d) => d.veut > 1)
    if (idx === -1) idx = demandes.findIndex((d) => d.veut > 0)
    if (idx === -1) break
    demandes[idx].veut -= 1
    totalVeut -= 1
  }

  // 4. Placement glouton, passe par passe (round-robin) pour équilibrer la semaine.
  const occupied = new Set()   // 'jour__debut' déjà pris dans la proposition
  const profBusy = new Set()   // 'intervenantId__jour__debut' (anti double-réservation prof)
  const salleBusy = new Set()  // 'salle__jour__debut'
  const sessions = []
  let roomCursor = 0
  const maxVeut = demandes.reduce((m, d) => Math.max(m, d.veut), 0)

  for (let pass = 0; pass < maxVeut; pass++) {
    for (const d of demandes) {
      if (d.bloque || d.place >= d.veut) continue
      const u = d.ue
      let placed = false
      for (const slot of slots) {
        const cellKey = `${slot.jour}__${slot.debut}`
        if (occupied.has(cellKey)) continue
        // Éviter que l'intervenant soit déjà placé sur ce même créneau.
        const profKey = u.intervenantId ? `${u.intervenantId}__${cellKey}` : null
        if (profKey && profBusy.has(profKey)) continue
        // Salle : curseur rotatif (variété) puis 1re salle libre sur ce créneau.
        let salle = ''
        for (let r = 0; r < SALLES_POOL_EDT.length; r++) {
          const cand = SALLES_POOL_EDT[(roomCursor + r) % SALLES_POOL_EDT.length]
          if (!salleBusy.has(`${cand}__${cellKey}`)) { salle = cand; break }
        }
        occupied.add(cellKey)
        if (profKey) profBusy.add(profKey)
        if (salle) salleBusy.add(`${salle}__${cellKey}`)
        roomCursor = (roomCursor + 1) % SALLES_POOL_EDT.length
        sessions.push({
          jour: slot.jour,
          debut: slot.debut,
          fin: slot.fin,
          ueCode: u.code || '',
          ueIntitule: u.intitule || '',
          intervenantNom: u.intervenantNom || '',
          salle,
          type: u.type || 'fondamentale',
        })
        d.place += 1
        placed = true
        break
      }
      // Aucune case compatible restante : inutile de réessayer aux passes suivantes.
      if (!placed) d.bloque = true
    }
  }

  // UE non entièrement placées (au moins une séance visée n'a pas trouvé de case).
  const k = demandes.filter((d) => d.place < d.veut).length
  return { sessions, k, ueCount: ues.length }
}

function recommanderEdt() {
  // Sortir des modes d'édition avant d'entrer dans l'aperçu.
  editMode.value = false
  editorOpen.value = false
  confirmDeleteOpen.value = false
  dragSource.value = null
  dragTarget.value = null

  const built = buildProposal()
  if (built.ueCount === 0) {
    showToast("Aucune UE définie pour ce semestre : MIAPO n'a pas de cours à planifier.", 'info')
    return
  }
  if (!built.sessions.length) {
    showToast("MIAPO n'a pas pu placer de séance — vérifiez les créneaux dans les paramètres.", 'info')
    return
  }
  proposal.value = {
    promotionId: store.selectedPromotion.id,
    semestre: activeSemestre.value,
    sessions: built.sessions,
    n: built.sessions.length,
    k: built.k,
  }
  proposalMode.value = true
}

function validateProposal() {
  const p = proposal.value
  if (!p) return
  // Séances de démonstration présentes sous ce semestre (seul le semestre courant en porte).
  const demoCells = activeSemestre.value === store.selectedPromotion.semestreCourant
    ? store.emploiDuTemps.map((s) => ({ jour: s.jour, debut: s.debut }))
    : []
  edtStore.applyProposal(p.promotionId, p.semestre, p.sessions, demoCells)
  proposalMode.value = false
  proposal.value = null
  showToast("Emploi du temps enregistré. Vous pouvez l'ajuster à tout moment.", 'success')
}

function cancelProposal() {
  proposalMode.value = false
  proposal.value = null
}
</script>

<style scoped>
/* Accent MIAPO (violet) — cohérent avec la couleur MIAPO de l'app (#7C3AED). */
.st { --miapo: #7C3AED; --miapo-rgb: 124, 58, 237; }

.st-intro {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.st-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.st-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}
.st-intro-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* Barre de filtres */
.st-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 12px;
}
.st-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.st-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.st-filter select {
  height: 38px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  min-width: 220px;
}
.st-filter select:focus {
  border-color: var(--pr);
}
.st-context {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.st-context-sem {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--tx);
}
.st-context-count {
  font-size: 12.5px;
  color: var(--tx2);
}
.st-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-left: auto;
}
.st-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--tx2);
}
.st-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.st-legend-dot.t-fondamentale { background: var(--pr); }
.st-legend-dot.t-methodologique { background: var(--success); }
.st-legend-dot.t-professionnelle { background: var(--gold); }
.st-legend-dot.t-electif { background: #6366F1; }

/* Onglets semestre */
.st-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.st-tab {
  height: 36px;
  padding: 0 18px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-tab:hover { color: var(--pr); border-color: var(--pr); }
.st-tab.is-active {
  background: var(--pr);
  border-color: var(--pr);
  color: #fff;
}
.st-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.st-tab:disabled:hover { color: var(--tx2); border-color: var(--card-border); }
.st-filter select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Bandeau mode édition */
.st-editing-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: var(--pr-light);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--pr);
}

/* Grille */
.st-grid-wrap {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 4px;
  overflow-x: auto;
}
.st-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 6px;
  min-width: 760px;
}
.st-grid thead th {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx2);
  padding: 8px;
  text-align: center;
}
.st-corner { width: 92px; }
.st-creneau {
  width: 92px;
  text-align: center;
  vertical-align: middle;
  background: var(--input-bg);
  border-radius: 9px;
  padding: 8px 4px;
}
.st-creneau-h {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx);
}
.st-creneau-sep {
  display: block;
  font-size: 10px;
  color: var(--tx3);
  line-height: 1;
}
.st-cell {
  vertical-align: top;
  width: 18%;
}
.st-empty-cell {
  height: 92px;
  background: var(--input-bg);
  border-radius: 9px;
  opacity: 0.5;
}
.st-session {
  position: relative;
  min-height: 92px;
  box-sizing: border-box;
  padding: 9px 11px;
  border-radius: 9px;
}
.st-session.t-fondamentale { background: var(--pr-light); }
.st-session.t-methodologique { background: rgba(27, 138, 90, 0.09); }
.st-session.t-professionnelle { background: rgba(184, 137, 42, 0.1); }
.st-session.t-electif { background: rgba(99, 102, 241, 0.09); }
.st-session-code {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--tx3);
}
.st-session-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx);
  margin: 2px 0 6px;
  line-height: 1.3;
}
.st-session-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;
  color: var(--tx2);
}
.st-session-salle {
  color: var(--tx3);
  font-weight: 500;
}

/* Affordances mode édition */
.st-grid-wrap.is-editing .st-cell.is-clickable { cursor: pointer; }
.st-grid-wrap.is-editing .st-cell.is-clickable:hover .st-empty-cell {
  opacity: 1;
  background: var(--pr-light);
  outline: 1.5px dashed var(--pr);
}
.st-grid-wrap.is-editing .st-cell.is-clickable:hover .st-session {
  outline: 1.5px solid var(--pr);
}
.st-empty-cell.is-add {
  display: flex;
  align-items: center;
  justify-content: center;
}
.st-add-plus {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--tx3);
  line-height: 1;
}
.st-session-edit {
  position: absolute;
  top: 7px;
  right: 7px;
  color: var(--tx3);
  opacity: 0.7;
}

/* Glisser-déposer (mode édition uniquement) */
.st-grid-wrap.is-editing .st-cell[draggable="true"] { cursor: grab; }
.st-grid-wrap.is-editing .st-cell[draggable="true"]:active { cursor: grabbing; }
.st-cell.is-drag-source .st-session {
  opacity: 0.4;
  outline: 2px dashed var(--tx3);
  outline-offset: -2px;
}
.st-cell.is-drop-target .st-empty-cell,
.st-cell.is-drop-target .st-session {
  opacity: 1;
  outline: 2px solid var(--pr);
  outline-offset: -2px;
  background: rgba(var(--pr-rgb), 0.12) !important;
}

/* Indice discret : déplacement bloqué (case occupée) */
.st-move-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 9px 14px;
  background: rgba(217, 48, 37, 0.08);
  border: 1px solid rgba(217, 48, 37, 0.2);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--danger);
}

.st-empty-hint {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--tx2);
}
.st-demo-note {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--tx3);
}

/* Boutons */
.st-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.st-btn-primary:hover { background: var(--pr-dark); }
.st-btn-primary.is-on { background: var(--success); }
.st-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  background: transparent;
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.st-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.st-btn-ghost:disabled:hover { border-color: var(--input-border); color: var(--tx2); }
.st-btn-danger {
  height: 40px;
  padding: 0 16px;
  background: rgba(217, 48, 37, 0.08);
  border: 1.5px solid rgba(217, 48, 37, 0.2);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--danger);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-btn-danger:hover { background: var(--danger); color: #fff; border-color: var(--danger); }

/* Bouton MIAPO (recommandation d'emploi du temps) */
.st-btn-miapo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  background: var(--miapo);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}
.st-btn-miapo:hover { background: #6D28D9; }
.st-btn-miapo:disabled { opacity: 0.5; cursor: not-allowed; }
.st-btn-miapo:disabled:hover { background: var(--miapo); }

/* Bandeau de proposition MIAPO (aperçu avant validation) */
.st-proposal-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: rgba(var(--miapo-rgb), 0.07);
  border: 1px solid rgba(var(--miapo-rgb), 0.22);
  border-radius: 12px;
}
.st-proposal-main {
  display: flex;
  align-items: center;
  gap: 11px;
}
.st-proposal-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 9px;
  background: rgba(var(--miapo-rgb), 0.14);
  color: var(--miapo);
}
.st-proposal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--tx);
}
.st-proposal-sub {
  font-size: 12.5px;
  color: var(--tx2);
  margin-top: 1px;
}
.st-proposal-tag {
  color: var(--miapo);
  font-weight: 600;
}
.st-proposal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Séance proposée (aperçu) : accent violet discret + badge MIAPO */
.st-session.is-proposal {
  outline: 1.5px dashed rgba(var(--miapo-rgb), 0.55);
  outline-offset: -1.5px;
}
.st-proposal-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 1px 6px;
  border-radius: 100px;
  background: var(--miapo);
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* Message court (succès / info) */
.st-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 9px 14px;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
}
.st-toast.is-success {
  background: rgba(27, 138, 90, 0.1);
  border: 1px solid rgba(27, 138, 90, 0.22);
  color: var(--success);
}
.st-toast.is-info {
  background: rgba(var(--miapo-rgb), 0.08);
  border: 1px solid rgba(var(--miapo-rgb), 0.22);
  color: var(--miapo);
}

/* Modale : voile flouté derrière + PANNEAU 100 % OPAQUE (aucune transparence ;
   Steve n'aime pas les popups translucides). Cette modale utilise une convention
   propre (.st-modal / .st-modal-overlay) que les règles globales de main.css ne
   couvrent PAS → on impose l'opacité ici, à la source. */
.st-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(20, 24, 40, 0.42);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.st-modal-overlay-top { z-index: 1010; }
.st-modal {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  overflow-y: auto;
  background: #fff !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.st-modal-sm { max-width: 420px; }
.st-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--divider);
}
.st-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.st-modal-sub {
  font-size: 13px;
  color: var(--tx2);
  margin: 3px 0 0;
}
.st-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--input-bg);
  border: none;
  color: var(--tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.st-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.st-form { padding: 18px 24px 22px; }
.st-confirm-body { padding: 18px 24px 4px; }
.st-confirm-body p { margin: 0; font-size: 14px; color: var(--tx); line-height: 1.5; }
.st-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.st-field + .st-field,
.st-field + .st-form-row,
.st-form-row + .st-field,
.st-form-row + .st-cfg-add,
.st-field + .st-cfg-creneaux {
  margin-top: 12px;
}
.st-field-grow { grid-column: auto; }
.st-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
  margin-bottom: 5px;
}
.st-input {
  display: block;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  box-sizing: border-box;
}
.st-input:focus { border-color: var(--pr); background: #fff; }
.st-form-error {
  margin: 12px 0 0;
  padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: var(--danger);
}
.st-modal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}
.st-spacer { flex: 1; }

/* Paramètres : créneaux + jours */
.st-cfg-creneaux { display: flex; flex-direction: column; gap: 8px; }
.st-cfg-row { display: flex; align-items: center; gap: 8px; }
.st-input-time { width: auto; flex: 1; min-width: 0; }
.st-cfg-dash { color: var(--tx3); font-weight: 700; }
.st-cfg-move { display: flex; gap: 3px; }
.st-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: var(--input-bg);
  border: none;
  border-radius: 8px;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-icon-btn:hover:not(:disabled) { background: var(--pr-light); color: var(--pr); }
.st-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.st-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.st-cfg-add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  height: 34px;
  padding: 0 14px;
  background: transparent;
  border: 1.5px dashed var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-cfg-add:hover { border-color: var(--pr); color: var(--pr); }
.st-cfg-jours-label { margin-top: 20px; }
.st-cfg-jours { display: flex; flex-wrap: wrap; gap: 8px; }
.st-cfg-jour {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-size: 13px;
  color: var(--tx);
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-cfg-jour.is-on { border-color: var(--pr); background: var(--pr-light); color: var(--pr); font-weight: 600; }
.st-cfg-jour input { width: 15px; height: 15px; cursor: pointer; }

.st-fade-enter-active, .st-fade-leave-active { transition: opacity 0.2s ease; }
.st-fade-enter-from, .st-fade-leave-to { opacity: 0; }

@media (max-width: 680px) {
  .st-legend { margin-left: 0; width: 100%; }
  .st-form-row { grid-template-columns: 1fr; }
}
</style>
