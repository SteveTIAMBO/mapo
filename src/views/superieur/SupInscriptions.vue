<template>
  <div class="si">
    <!-- En-tête -->
    <div class="si-intro">
      <div>
        <h1 class="si-h1">{{ t('sup.inscriptions.title') }}</h1>
        <p class="si-sub">{{ t('sup.inscriptions.subtitle') }}</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="si-kpis">
      <div class="si-kpi">
        <div class="si-kpi-label">{{ t('sup.inscriptions.kpiTotal') }}</div>
        <div class="si-kpi-value">{{ store.stats.total }}</div>
        <div class="si-kpi-foot">{{ t('sup.inscriptions.kpiTotalFoot') }}</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">{{ t('sup.inscriptions.kpiToValidate') }}</div>
        <div class="si-kpi-value">{{ store.stats.complet }}</div>
        <div class="si-kpi-foot is-gold">{{ t('sup.inscriptions.kpiToValidateFoot') }}</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">{{ t('sup.inscriptions.kpiValidated') }}</div>
        <div class="si-kpi-value">{{ store.stats.valide }}</div>
        <div class="si-kpi-foot is-ok">{{ t('sup.inscriptions.kpiValidatedFoot') }}</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">{{ t('sup.inscriptions.kpiIncompleteRefused') }}</div>
        <div class="si-kpi-value">{{ store.stats.incomplet + store.stats.refuse }}</div>
        <div class="si-kpi-foot" :class="(store.stats.incomplet + store.stats.refuse) > 0 ? 'is-warn' : 'is-ok'">
          {{ t('sup.inscriptions.kpiIncompleteRefusedFoot', { n: store.stats.incomplet, m: store.stats.refuse }) }}
        </div>
      </div>
    </div>

    <!-- Analyse MIAPO -->
    <div class="si-miapo">
      <div class="si-miapo-head">
        <span class="si-miapo-badge">MIAPO</span>
        <div class="si-miapo-head-txt">
          <div class="si-miapo-title">{{ t('sup.inscriptions.miapoTitle') }}</div>
          <div class="si-miapo-sub">{{ miapoSummary }}</div>
        </div>
        <button v-if="store.dossiersConformes.length" type="button" class="si-miapo-cta" @click="askPrevalider">
          {{ t('sup.inscriptions.' + (store.dossiersConformes.length > 1 ? 'miapoCtaMany' : 'miapoCtaOne'), { n: store.dossiersConformes.length }) }}
        </button>
      </div>

      <div v-if="store.dossiersIncomplets.length" class="si-miapo-list">
        <div class="si-miapo-list-label">{{ t('sup.inscriptions.miapoListLabel') }}</div>
        <div v-for="d in store.dossiersIncomplets" :key="d.id" class="si-miapo-item">
          <div class="si-miapo-item-main">
            <span class="si-miapo-item-name">{{ d.candidat.nomComplet }}</span>
            <span class="si-miapo-item-miss">{{ t('sup.inscriptions.miapoItemMissing', { liste: store.requiredMissing(d).map((doc) => t('sup.inscriptions.docs.' + doc.key)).join(', ') }) }}</span>
          </div>
          <button type="button" class="si-miapo-msg" @click="openMessageParent(d)">{{ t('sup.inscriptions.draftParentMessage') }}</button>
        </div>
      </div>
      <div v-else class="si-miapo-clear">{{ t('sup.inscriptions.miapoClear') }}</div>

      <div class="si-miapo-note">{{ t('sup.inscriptions.miapoNote') }}</div>
    </div>

    <!-- Filtres -->
    <div class="si-filters">
      <div class="si-filter">
        <span class="si-filter-label">{{ t('sup.inscriptions.filterPromotion') }}</span>
        <select :value="store.dossierFilters.promotionId" @change="store.setDossierFilter('promotionId', $event.target.value)">
          <option value="">{{ t('sup.inscriptions.allPromotions') }}</option>
          <option v-for="p in promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
      </div>
      <div class="si-filter">
        <span class="si-filter-label">{{ t('sup.inscriptions.filterStatus') }}</span>
        <select :value="store.dossierFilters.statut" @change="store.setDossierFilter('statut', $event.target.value)">
          <option value="">{{ t('sup.inscriptions.allStatuses') }}</option>
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ statutLabel(s.value) }}</option>
        </select>
      </div>
      <div class="si-filter si-filter-search">
        <span class="si-filter-label">{{ t('sup.inscriptions.filterSearch') }}</span>
        <input
          type="text"
          :value="store.dossierFilters.search"
          @input="store.setDossierFilter('search', $event.target.value)"
          :placeholder="t('sup.inscriptions.searchPlaceholder')"
        />
      </div>
      <button v-if="hasFilters" class="si-reset" type="button" @click="store.resetDossierFilters()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        {{ t('sup.inscriptions.reset') }}
      </button>
      <span class="si-count">{{ t('sup.inscriptions.' + (store.dossiersList.length > 1 ? 'countMany' : 'countOne'), { n: store.dossiersList.length }) }}</span>
    </div>

    <!-- Table -->
    <div class="si-table-wrap">
      <table class="si-table">
        <thead>
          <tr>
            <th>{{ t('sup.inscriptions.thCandidate') }}</th>
            <th>{{ t('sup.inscriptions.thPromotion') }}</th>
            <th>{{ t('sup.inscriptions.thDocuments') }}</th>
            <th>{{ t('sup.inscriptions.thStatus') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in store.dossiersList" :key="d.id" class="si-row is-clickable" @click="openDetail(d)">
            <td>
              <div class="si-name">{{ d.candidat.nomComplet }}</div>
              <div class="si-name-sub">
                <span class="si-type" :class="`ty-${d.type}`">{{ typeLabel(d.type) }}</span>
              </div>
            </td>
            <td>
              <span class="si-niveau" :class="`n-${(d.niveau || '').toLowerCase()}`">{{ d.niveau }}</span>
              <span class="si-prog">{{ d.programmeNom }}</span>
              <span class="si-annee">{{ d.anneeNom }}</span>
            </td>
            <td>
              <span class="si-docs" :class="{ 'is-miss': requiredMissingCount(d) > 0 }">
                {{ fournisCount(d) }}/{{ d.documents.length }}
              </span>
              <span v-if="requiredMissingCount(d) > 0" class="si-docs-miss">{{ t('sup.inscriptions.docsMissing', { n: requiredMissingCount(d) }) }}</span>
            </td>
            <td>
              <span class="si-pill" :class="`is-${d.statut}`">{{ statutLabel(d.statut) }}</span>
            </td>
          </tr>
          <tr v-if="store.dossiersList.length === 0">
            <td colspan="4" class="si-empty">{{ t('sup.inscriptions.emptyState') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modale détail dossier -->
    <transition name="si-fade">
      <div v-if="detail" class="si-modal-overlay" @click.self="closeDetail">
        <div class="si-modal">
          <div class="si-modal-head">
            <div>
              <h2 class="si-modal-title">{{ detail.candidat.nomComplet }}</h2>
              <div class="si-modal-meta">
                <span class="si-type" :class="`ty-${detail.type}`">{{ typeLabel(detail.type) }}</span>
                <span class="si-pill" :class="`is-${detail.statut}`">{{ statutLabel(detail.statut) }}</span>
              </div>
            </div>
            <button class="si-modal-close" type="button" @click="closeDetail" :aria-label="t('sup.inscriptions.close')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="si-modal-body">
            <!-- Identité + inscription visée -->
            <div class="si-section-label">{{ t('sup.inscriptions.sectionApplicant') }}</div>
            <div class="si-rows">
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldFullName') }}</span><strong>{{ detail.candidat.nomComplet }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldSex') }}</span><strong>{{ detail.candidat.sexe === 'F' ? t('sup.inscriptions.feminin') : t('sup.inscriptions.masculin') }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldPhone') }}</span><strong>{{ detail.candidat.telephone }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldProgram') }}</span><strong>{{ detail.programmeNom }} — {{ detail.anneeNom }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldCampus') }}</span><strong>{{ campusVille(detail.campus) }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldType') }}</span><strong>{{ typeLabel(detail.type) }}</strong></div>
              <div class="si-row"><span>{{ t('sup.inscriptions.fieldSubmitted') }}</span><strong>{{ fmtDate(detail.dateSoumission) }}</strong></div>
              <div v-if="detail.statut === 'valide' && detail.anneeInscription" class="si-row">
                <span>{{ t('sup.inscriptions.fieldEnrolledYear') }}</span><strong>{{ detail.anneeInscription }}</strong>
              </div>
              <div v-if="detail.statut === 'refuse' && detail.motifRefus" class="si-row is-refus">
                <span>{{ t('sup.inscriptions.fieldRefusalReason') }}</span><strong>{{ detail.motifRefus }}</strong>
              </div>
            </div>

            <!-- Checklist des pièces -->
            <div class="si-section-label">{{ t('sup.inscriptions.sectionDocuments') }}</div>
            <ul class="si-docs-list">
              <li v-for="doc in detail.documents" :key="doc.key" class="si-doc" :class="{ 'is-ok': doc.fourni, 'is-missing': !doc.fourni }">
                <span class="si-doc-icon">
                  <svg v-if="doc.fourni" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
                <span class="si-doc-label">
                  {{ t('sup.inscriptions.docs.' + doc.key) }}
                  <span v-if="doc.required" class="si-doc-req">{{ t('sup.inscriptions.docRequired') }}</span>
                  <span v-else class="si-doc-opt">{{ t('sup.inscriptions.docOptional') }}</span>
                </span>
                <span class="si-doc-state">{{ doc.fourni ? t('sup.inscriptions.docProvided') : t('sup.inscriptions.docMissing') }}</span>
              </li>
            </ul>

            <p v-if="missingRequired.length" class="si-hint">
              {{ t('sup.inscriptions.validateHint', { liste: missingRequired.map((d) => t('sup.inscriptions.docs.' + d.key)).join(', ') }) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="si-modal-actions">
            <button type="button" class="si-btn-ghost" @click="closeDetail">{{ t('sup.inscriptions.close') }}</button>
            <button type="button" class="si-btn-neutral" @click="onDemander(detail)">{{ t('sup.inscriptions.requestDocuments') }}</button>
            <button type="button" class="si-btn-danger" @click="askRefuser(detail)">{{ t('sup.inscriptions.refuse') }}</button>
            <button
              type="button"
              class="si-btn-primary"
              :disabled="missingRequired.length > 0"
              :title="missingRequired.length > 0 ? t('sup.inscriptions.disabledTitle') : null"
              @click="onValider(detail)"
            >
              {{ t('sup.inscriptions.validateEnrolment') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale de confirmation (refus) -->
    <transition name="si-fade">
      <div v-if="confirmState.open" class="si-modal-overlay si-confirm-overlay" @click.self="closeConfirm">
        <div class="si-modal si-confirm-modal">
          <div class="si-modal-head">
            <h2 class="si-modal-title">{{ confirmState.title }}</h2>
            <button class="si-modal-close" type="button" @click="closeConfirm" :aria-label="t('sup.inscriptions.close')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="si-modal-body">
            <p class="si-confirm-message">{{ confirmState.message }}</p>
            <div v-if="confirmState.withMotif" class="si-field">
              <label class="si-form-label">{{ t('sup.inscriptions.refusalReasonLabel') }}</label>
              <textarea v-model="confirmMotif" class="si-textarea" rows="3" :placeholder="t('sup.inscriptions.refusalReasonPlaceholder')"></textarea>
            </div>
          </div>
          <div class="si-modal-actions">
            <button type="button" class="si-btn-ghost" @click="closeConfirm">{{ t('sup.inscriptions.cancel') }}</button>
            <button type="button" class="si-btn-danger" @click="doConfirm">{{ confirmState.confirmLabel }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale brouillon de message parent (MIAPO) -->
    <transition name="si-fade">
      <div v-if="msgModal.open" class="si-modal-overlay si-confirm-overlay" @click.self="closeMessage">
        <div class="si-modal si-confirm-modal">
          <div class="si-modal-head">
            <h2 class="si-modal-title">{{ t('sup.inscriptions.messageTitle', { name: msgModal.candidat }) }}</h2>
            <button class="si-modal-close" type="button" @click="closeMessage" :aria-label="t('sup.inscriptions.close')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="si-modal-body">
            <p class="si-msg-help">{{ t('sup.inscriptions.messageHelp') }}</p>
            <textarea v-model="msgModal.texte" class="si-textarea" rows="6"></textarea>
          </div>
          <div class="si-modal-actions">
            <button type="button" class="si-btn-ghost" @click="closeMessage">{{ t('sup.inscriptions.close') }}</button>
            <button type="button" class="si-btn-primary" @click="copyMessage">{{ copied ? t('sup.inscriptions.copied') : t('sup.inscriptions.copyMessage') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import { CAMPUS } from '../../stores/superieur'
import {
  useSuperieurInscriptionsStore,
  DOSSIER_STATUS_OPTIONS,
} from '../../stores/superieurInscriptions'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'

const { t } = useI18n({ useScope: 'global' })

const superieur = useSuperieurStore()
const store = useSuperieurInscriptionsStore()
const schoolIdentity = useSchoolIdentityStore()

const promotions = computed(() => superieur.promotions)
const statusOptions = DOSSIER_STATUS_OPTIONS

const hasFilters = computed(() => {
  const f = store.dossierFilters
  return !!(f.promotionId || f.statut || f.search)
})

// ── Libellés (mappés via i18n, sans muter le store) ──
const statutLabel = (v) => t('sup.inscriptions.status.' + v)
const typeLabel = (v) => t('sup.inscriptions.type.' + v)
const campusVille = (id) => (CAMPUS.find((c) => c.id === id) || {}).ville || '—'
function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch (e) { return iso }
}

// ── Comptages documents ──
const fournisCount = (d) => (d.documents || []).filter((x) => x.fourni).length
const requiredMissingCount = (d) => (d.documents || []).filter((x) => x.required && !x.fourni).length

// ── Détail ──
const detail = ref(null)
const missingRequired = computed(() => (detail.value ? store.requiredMissing(detail.value) : []))
function openDetail(d) { detail.value = d }
function closeDetail() { detail.value = null }

function onValider(d) {
  store.validerDossier(d.id)
  closeDetail()
}
function onDemander(d) {
  store.demanderDocuments(d.id)
  closeDetail()
}

// ── Modale de confirmation (refus) — pas de window.confirm ──
const confirmState = reactive({ open: false, title: '', message: '', confirmLabel: '', withMotif: false, onConfirm: null })
const confirmMotif = ref('')
function openConfirm({ title, message, confirmLabel, withMotif, onConfirm }) {
  confirmState.title = title
  confirmState.message = message
  confirmState.confirmLabel = confirmLabel
  confirmState.withMotif = !!withMotif
  confirmState.onConfirm = onConfirm
  confirmMotif.value = ''
  confirmState.open = true
}
function closeConfirm() {
  confirmState.open = false
  confirmState.onConfirm = null
}
function doConfirm() {
  const fn = confirmState.onConfirm
  closeConfirm()
  if (typeof fn === 'function') fn()
}
function askRefuser(d) {
  openConfirm({
    title: t('sup.inscriptions.refuseTitle'),
    message: t('sup.inscriptions.refuseMessage', { name: d.candidat.nomComplet }),
    confirmLabel: t('sup.inscriptions.refuseConfirm'),
    withMotif: true,
    onConfirm: () => {
      store.refuserDossier(d.id, confirmMotif.value)
      closeDetail()
    },
  })
}

// ── Analyse MIAPO ──
const ecoleNom = computed(() =>
  schoolIdentity.schoolName || schoolIdentity.name || schoolIdentity.nom || t('sup.inscriptions.defaultSchool')
)
const miapoSummary = computed(() => {
  const n = store.stats.total
  const x = store.dossiersConformes.length
  const y = store.dossiersIncomplets.length
  const z = store.stats.refuse
  // Pluriel FR sans « | » : deux clés (One/Many) choisies dans le code par comptage.
  const w = (base, k) => t(`sup.inscriptions.${base}${k > 1 ? 'Many' : 'One'}`)
  return t('sup.inscriptions.miapoSummary', {
    n, x, y, z,
    dossier: w('sumDossier', n),
    conforme: w('sumConforme', x),
    incomplet: w('sumIncomplet', y),
    refuse: w('sumRefuse', z),
  })
})
function askPrevalider() {
  const list = store.dossiersConformes
  if (!list.length) return
  const ids = list.map((d) => d.id)
  const noms = list.map((d) => d.candidat.nomComplet).join(', ')
  openConfirm({
    title: t('sup.inscriptions.prevalidateTitle'),
    message: t('sup.inscriptions.prevalidateMessage', { n: list.length, noms }),
    confirmLabel: t(`sup.inscriptions.${list.length > 1 ? 'validateBatchMany' : 'validateBatchOne'}`, { n: list.length }),
    withMotif: false,
    onConfirm: () => { store.validerDossiers(ids) },
  })
}

// ── Brouillon de message parent (MIAPO) ──
const msgModal = reactive({ open: false, candidat: '', texte: '' })
const copied = ref(false)
function draftMessage(d) {
  const manquantes = store.requiredMissing(d)
  const liste = manquantes.map((doc) => t('sup.inscriptions.docs.' + doc.key)).join(', ')
  const pieceMot = t(`sup.inscriptions.${manquantes.length > 1 ? 'pieceMany' : 'pieceOne'}`)
  return t('sup.inscriptions.msgTemplate', {
    name: d.candidat.nomComplet,
    filiere: `${d.programmeNom} (${d.anneeNom})`,
    liste,
    pieceMot,
    ecole: ecoleNom.value,
  })
}
function openMessageParent(d) {
  msgModal.candidat = d.candidat.nomComplet
  msgModal.texte = draftMessage(d)
  copied.value = false
  msgModal.open = true
}
function closeMessage() { msgModal.open = false }
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(msgModal.texte)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch (e) { copied.value = false }
}
</script>

<style scoped>
.si-intro { margin-bottom: 18px; }
.si-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.si-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 6px 0 0;
  max-width: 760px;
  line-height: 1.55;
}

/* Bandeau MIAPO */
.si-miapo {
  background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 55%, #8B5CF6 100%);
  border-radius: var(--card-radius, 16px);
  padding: 18px 20px;
  margin-bottom: 18px;
  color: #fff;
  box-shadow: 0 12px 32px rgba(109, 40, 217, 0.25);
}
.si-miapo-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.si-miapo-badge {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 100px; padding: 4px 12px;
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 12px; letter-spacing: 0.05em;
  flex-shrink: 0;
}
.si-miapo-head-txt { flex: 1; min-width: 200px; }
.si-miapo-title { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 16px; }
.si-miapo-sub { font-size: 13px; opacity: 0.92; margin-top: 2px; }
.si-miapo-cta {
  margin-left: auto; background: #fff; color: #6D28D9;
  border: none; border-radius: 10px; padding: 9px 16px;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: opacity 0.15s ease;
}
.si-miapo-cta:hover { opacity: 0.9; }
.si-miapo-list { margin-top: 14px; background: rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 10px 14px; }
.si-miapo-list-label { font-size: 12px; font-weight: 700; opacity: 0.95; margin-bottom: 4px; }
.si-miapo-item {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.14);
}
.si-miapo-item:first-of-type { border-top: none; }
.si-miapo-item-main { flex: 1; min-width: 0; }
.si-miapo-item-name { font-weight: 700; font-size: 13.5px; }
.si-miapo-item-miss { display: block; font-size: 12.5px; opacity: 0.9; }
.si-miapo-msg {
  background: rgba(255, 255, 255, 0.2); color: #fff; border: none;
  border-radius: 8px; padding: 6px 12px;
  font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 12px;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s ease;
}
.si-miapo-msg:hover { background: rgba(255, 255, 255, 0.32); }
.si-miapo-clear { margin-top: 12px; font-size: 13px; opacity: 0.9; }
.si-miapo-note { margin-top: 12px; font-size: 12px; opacity: 0.82; font-style: italic; }
.si-msg-help { font-size: 13px; color: var(--tx2); margin: 0 0 10px; line-height: 1.5; }

/* KPIs */
.si-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.si-kpi {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 16px 18px;
}
.si-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.si-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: var(--tx);
  line-height: 1.1;
  margin: 6px 0 2px;
  font-variant-numeric: tabular-nums;
}
.si-kpi-foot { font-size: 12px; color: var(--tx2); }
.si-kpi-foot.is-ok { color: var(--success); }
.si-kpi-foot.is-warn { color: var(--warn); }
.si-kpi-foot.is-gold { color: var(--gold); }

/* Filtres */
.si-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.si-filter { display: flex; flex-direction: column; gap: 4px; }
.si-filter-search { flex: 1; min-width: 200px; }
.si-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.si-filter select,
.si-filter input {
  height: 38px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  transition: border-color 0.15s ease;
}
.si-filter input { width: 100%; box-sizing: border-box; }
.si-filter select:focus,
.si-filter input:focus { border-color: var(--pr); }
.si-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  background: transparent;
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.si-reset:hover { border-color: var(--pr); color: var(--pr); }
.si-count {
  margin-left: auto;
  align-self: center;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--pr);
}

/* Table */
.si-table-wrap {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  overflow-x: auto;
}
.si-table { width: 100%; border-collapse: collapse; }
.si-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tx2);
  text-align: left;
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.si-table td {
  font-size: 13.5px;
  color: var(--tx);
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.si-table tbody tr:last-child td { border-bottom: none; }
.si-row.is-clickable { cursor: pointer; }
.si-row.is-clickable:hover { background: var(--pr-light); }
.si-name { font-weight: 600; color: var(--tx); }
.si-name-sub { margin-top: 3px; }
.si-prog { color: var(--tx); }
.si-annee { color: var(--tx3); font-size: 12.5px; margin-left: 6px; }

/* Badge type inscription/réinscription */
.si-type {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
}
.si-type.ty-inscription { background: var(--pr-light); color: var(--pr); }
.si-type.ty-reinscription { background: rgba(99, 102, 241, 0.12); color: #6366F1; }

/* Badge niveau */
.si-niveau {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  margin-right: 6px;
}
.si-niveau.n-bts { background: rgba(14, 124, 90, 0.12); color: #0E7C5A; }
.si-niveau.n-licence { background: var(--pr-light); color: var(--pr); }
.si-niveau.n-master { background: var(--gold-light); color: var(--gold); }
.si-niveau.n-doctorat { background: rgba(124, 58, 237, 0.12); color: #6D28D9; }

/* Documents count */
.si-docs {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--success);
  font-variant-numeric: tabular-nums;
}
.si-docs.is-miss { color: var(--warn); }
.si-docs-miss { display: block; font-size: 11px; color: var(--warn); margin-top: 1px; }

/* Pilule de statut */
.si-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}
.si-pill.is-brouillon { background: rgba(20, 32, 64, 0.08); color: var(--tx2); }
.si-pill.is-soumis { background: rgba(37, 99, 235, 0.12); color: #2563EB; }
.si-pill.is-complet { background: var(--gold-light); color: var(--gold); }
.si-pill.is-incomplet { background: rgba(232, 149, 10, 0.14); color: var(--warn); }
.si-pill.is-valide { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.si-pill.is-refuse { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

.si-empty { padding: 28px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* Modale */
.si-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.si-confirm-overlay { z-index: 80; }
.si-modal {
  width: 100%; max-width: 600px;
  max-height: 92vh; overflow-y: auto;
  background: #fff; border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.si-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--divider);
}
.si-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.si-modal-meta { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.si-modal-close {
  width: 32px; height: 32px;
  border-radius: 8px; background: var(--input-bg);
  border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.si-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.si-modal-body { padding: 18px 24px 8px; }
.si-section-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3);
  margin: 4px 0 8px;
}
.si-section-label + .si-rows { margin-bottom: 6px; }
.si-rows { display: flex; flex-direction: column; margin-bottom: 14px; }
.si-row {
  display: flex; justify-content: space-between; gap: 16px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--divider);
  font-size: 13.5px;
}
.si-row span { color: var(--tx2); }
.si-row strong { color: var(--tx); text-align: right; font-weight: 600; }
.si-row.is-refus strong { color: var(--danger); }

/* Checklist */
.si-docs-list { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.si-doc {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--divider);
  border-radius: 10px;
}
.si-doc.is-ok { background: rgba(27, 138, 90, 0.05); }
.si-doc.is-missing { background: rgba(232, 149, 10, 0.06); }
.si-doc-icon {
  width: 24px; height: 24px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.si-doc.is-ok .si-doc-icon { background: rgba(27, 138, 90, 0.15); color: var(--success); }
.si-doc.is-missing .si-doc-icon { background: rgba(232, 149, 10, 0.18); color: var(--warn); }
.si-doc-label { flex: 1; min-width: 0; font-size: 13.5px; color: var(--tx); }
.si-doc-req, .si-doc-opt {
  display: inline-block; margin-left: 6px;
  padding: 1px 7px; border-radius: 100px;
  font-family: 'Poppins', sans-serif; font-size: 9.5px; font-weight: 700;
}
.si-doc-req { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.si-doc-opt { background: var(--input-bg); color: var(--tx3); }
.si-doc-state { font-size: 12px; font-weight: 700; }
.si-doc.is-ok .si-doc-state { color: var(--success); }
.si-doc.is-missing .si-doc-state { color: var(--warn); }

.si-hint {
  margin: 4px 0 0; padding: 9px 12px;
  background: rgba(232, 149, 10, 0.08);
  border: 1px solid rgba(232, 149, 10, 0.2);
  border-radius: 8px;
  font-size: 12.5px; color: var(--warn); line-height: 1.5;
}

/* Actions */
.si-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
  padding: 16px 24px 22px;
}
.si-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--success, #1B8A5A); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease, opacity 0.15s ease;
}
.si-btn-primary:hover:not(:disabled) { background: #157048; }
.si-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.si-btn-neutral {
  height: 40px; padding: 0 16px;
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--tx); cursor: pointer; transition: all 0.15s ease;
}
.si-btn-neutral:hover { border-color: var(--pr); color: var(--pr); }
.si-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer; transition: all 0.15s ease;
}
.si-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.si-btn-danger {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--danger, #D93025); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.si-btn-danger:hover { background: #B3271D; }

/* Confirmation */
.si-confirm-modal { max-width: 460px; }
.si-confirm-message { font-size: 14px; color: var(--tx); line-height: 1.55; margin: 0 0 14px; }
.si-field { display: flex; flex-direction: column; gap: 5px; }
.si-form-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3);
}
.si-textarea {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; resize: vertical;
}
.si-textarea:focus { border-color: var(--pr); }

.si-fade-enter-active, .si-fade-leave-active { transition: opacity 0.2s ease; }
.si-fade-enter-from, .si-fade-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .si-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 820px) {
  .si-table { min-width: 640px; }
}
@media (max-width: 700px) {
  .si-h1 { font-size: 22px; }
  .si-filters { flex-direction: column; align-items: stretch; }
  .si-modal-overlay { padding: 0; align-items: flex-end; }
  .si-modal { max-width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
  .si-modal-actions { flex-direction: column-reverse; gap: 8px; }
  .si-modal-actions button { width: 100%; }
}
</style>
