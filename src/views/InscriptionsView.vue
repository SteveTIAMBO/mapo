<template>
  <div class="inscriptions-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('insc.title') }}</h1>
        <p>{{ t('insc.subtitle') }}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <RouterLink to="/import" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px;">
          <Upload :size="16" />
          <span>{{ t('insc.bulkImport') }}</span>
        </RouterLink>
        <button class="btn btn-primary" @click="openNewDossier">
          <Plus :size="16" />
          <span>{{ t('insc.newDossier') }}</span>
        </button>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="stat-bar" style="grid-template-columns: repeat(5, 1fr);">
      <div class="stat-bar-item stat-bar-clickable-item" :class="{ 'stat-active': !filterStatus }" @click="filterStatus = ''">
        <span class="stat-bar-dot blue"></span>
        <div>
          <div class="stat-bar-value">{{ inscriptionsStore.dossierStats.total }}</div>
          <div class="stat-bar-label">{{ t('insc.statTotal') }}</div>
        </div>
      </div>
      <div class="stat-bar-item stat-bar-clickable-item" :class="{ 'stat-active': filterStatus === 'soumis' }" @click="filterStatus = 'soumis'">
        <span class="stat-bar-dot" style="background: var(--gold);"></span>
        <div>
          <div class="stat-bar-value">{{ inscriptionsStore.dossierStats.soumis + inscriptionsStore.dossierStats.complet }}</div>
          <div class="stat-bar-label">{{ t('insc.statToProcess') }}</div>
        </div>
      </div>
      <div class="stat-bar-item stat-bar-clickable-item" :class="{ 'stat-active': filterStatus === 'incomplet' }" @click="filterStatus = 'incomplet'">
        <span class="stat-bar-dot" style="background: var(--danger);"></span>
        <div>
          <div class="stat-bar-value">{{ inscriptionsStore.dossierStats.incomplet }}</div>
          <div class="stat-bar-label">{{ t('insc.statIncomplete') }}</div>
        </div>
      </div>
      <div class="stat-bar-item stat-bar-clickable-item" :class="{ 'stat-active': filterStatus === 'valide' }" @click="filterStatus = 'valide'">
        <span class="stat-bar-dot green"></span>
        <div>
          <div class="stat-bar-value">{{ inscriptionsStore.dossierStats.valide }}</div>
          <div class="stat-bar-label">{{ t('insc.statValidated') }}</div>
        </div>
      </div>
      <div class="stat-bar-item stat-bar-clickable-item" :class="{ 'stat-active': filterStatus === 'refuse' }" @click="filterStatus = 'refuse'">
        <span class="stat-bar-dot" style="background: var(--tx3);"></span>
        <div>
          <div class="stat-bar-value">{{ inscriptionsStore.dossierStats.refuse }}</div>
          <div class="stat-bar-label">{{ t('insc.statRefused') }}</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" :placeholder="t('insc.searchPh')" />
        </div>
        <select v-model="filterType" class="select">
          <option value="">{{ t('insc.allTypes') }}</option>
          <option value="inscription">{{ t('insc.typeInscription') }}</option>
          <option value="reinscription">{{ t('insc.typeReinscription') }}</option>
        </select>
        <select v-model="filterStatus" class="select">
          <option value="">{{ t('insc.allStatuses') }}</option>
          <option value="brouillon">{{ t('insc.stBrouillon') }}</option>
          <option value="soumis">{{ t('insc.stSoumis') }}</option>
          <option value="complet">{{ t('insc.stComplet') }}</option>
          <option value="incomplet">{{ t('insc.stIncomplet') }}</option>
          <option value="valide">{{ t('insc.stValide') }}</option>
          <option value="refuse">{{ t('insc.stRefuse') }}</option>
        </select>
      </div>
    </div>

    <!-- Dossiers list -->
    <div class="card">
      <div v-if="filteredDossiers.length === 0" class="empty-state" style="padding: 48px 24px;">
        <FileText :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ searchQuery || filterStatus || filterType ? t('insc.noFileFound') : t('insc.noFile') }}</p>
        <button v-if="!searchQuery && !filterStatus && !filterType" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="openNewDossier">
          {{ t('insc.createFirst') }}
        </button>
      </div>
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('insc.thStudent') }}</th>
              <th>{{ t('insc.thType') }}</th>
              <th>{{ t('insc.thClass') }}</th>
              <th>{{ t('insc.thStatus') }}</th>
              <th>{{ t('insc.thDocs') }}</th>
              <th>{{ t('insc.thDate') }}</th>
              <th class="text-center">{{ t('insc.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filteredDossiers" :key="d.id" class="tr-clickable" @click="openDossierDetail(d)">
              <td>
                <div class="eleve-cell">
                  <div class="eleve-avatar" :class="d.gender === 'F' ? 'avatar-f' : ''">
                    {{ (d.lastName?.[0] || '') + (d.firstName?.[0] || '') }}
                  </div>
                  <div>
                    <strong>{{ d.lastName }} {{ d.firstName }}</strong>
                    <span class="cell-sub" v-if="d.matricule">{{ d.matricule }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="d.type === 'reinscription' ? 'badge-info' : 'badge-default'">
                  {{ typeLabel(d.type) }}
                </span>
              </td>
              <td>{{ d.className || '—' }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(d.status)">{{ statusLabel(d.status) }}</span>
              </td>
              <td>
                <span class="pieces-indicator">
                  <Paperclip :size="13" />
                  {{ (d.attachments || []).length }}/{{ REQUIRED_DOCUMENTS.filter(r => r.required).length }}
                </span>
              </td>
              <td>{{ formatDate(d.submittedAt || d.createdAt) }}</td>
              <td class="text-center" @click.stop>
                <div class="action-btns">
                  <button v-if="d.status === 'brouillon'" class="btn btn-ghost btn-sm" @click="openEditDossier(d)" :title="t('insc.modify')">
                    <Pencil :size="14" />
                  </button>
                  <button v-if="canValidate(d)" class="btn btn-ghost btn-sm" style="color: var(--success);" @click="handleValidate(d)" :title="t('insc.validate')">
                    <CheckCircle :size="14" />
                  </button>
                  <button v-if="d.status !== 'valide'" class="btn btn-ghost btn-sm" style="color: var(--danger);" @click="handleDelete(d)" :title="t('insc.delete')">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========== MODAL: Formulaire inscription ========== -->
    <div v-if="showFormModal" class="modal-overlay" @click.self="showFormModal = false">
      <div class="modal-card card modal-lg">
        <div class="modal-header">
          <h2>{{ editingDossier ? t('insc.editFile') : t('insc.newFileTitle') }}</h2>
          <button class="icon-btn" @click="showFormModal = false"><X :size="20" /></button>
        </div>
        <form @submit.prevent="saveDossier" class="modal-body">
          <!-- Step indicator -->
          <div class="steps-bar">
            <div v-for="(step, i) in formSteps" :key="i" class="step-item" :class="{ active: formStep === i, done: formStep > i }">
              <div class="step-num">{{ formStep > i ? '✓' : i + 1 }}</div>
              <span class="step-label">{{ step }}</span>
            </div>
          </div>

          <!-- Step 1: Type + Info élève -->
          <div v-if="formStep === 0" class="form-step">
            <div class="fieldset-legend">{{ t('insc.fileType') }}</div>
            <div class="type-cards">
              <label v-for="dt in DOSSIER_TYPES" :key="dt.value" class="type-card" :class="{ selected: form.type === dt.value }">
                <input type="radio" v-model="form.type" :value="dt.value" style="display: none;" />
                <UserPlus v-if="dt.value === 'inscription'" :size="20" />
                <RotateCcw v-else :size="20" />
                <span>{{ typeLabel(dt.value) }}</span>
              </label>
            </div>

            <div class="fieldset-legend" style="margin-top: 20px;">{{ t('insc.studentInfo') }}</div>
            <div class="field-row">
              <div class="field"><label>{{ t('insc.lastName') }} *</label><input v-model="form.lastName" type="text" class="input" required /></div>
              <div class="field"><label>{{ t('insc.firstName') }} *</label><input v-model="form.firstName" type="text" class="input" required /></div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ t('insc.gender') }} *</label>
                <select v-model="form.gender" class="input" required>
                  <option value="">{{ t('insc.select') }}</option>
                  <option value="M">{{ t('insc.male') }}</option>
                  <option value="F">{{ t('insc.female') }}</option>
                </select>
              </div>
              <div class="field"><label>{{ t('insc.dob') }} *</label><input v-model="form.dateOfBirth" type="date" class="input" required /></div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ t('insc.requestedClass') }} *</label>
                <select v-model="form.className" class="input" required>
                  <option value="">{{ t('insc.select') }}</option>
                  <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="field" v-if="form.type === 'inscription'">
                <label>{{ t('insc.previousSchool') }}</label>
                <input v-model="form.previousSchool" type="text" class="input" :placeholder="t('insc.previousSchoolPh')" />
              </div>
              <div class="field" v-if="form.type === 'reinscription'">
                <label>{{ t('insc.previousClass') }}</label>
                <select v-model="form.previousClass" class="input">
                  <option value="">{{ t('insc.select') }}</option>
                  <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>
            <div class="field-row">
              <div class="field"><label>{{ t('insc.city') }}</label><input v-model="form.city" type="text" class="input" placeholder="Yaoundé" /></div>
              <div class="field"><label>{{ t('insc.quartier') }}</label><input v-model="form.quartier" type="text" class="input" placeholder="Santa Barbara" /></div>
            </div>
          </div>

          <!-- Step 2: Tuteur -->
          <div v-if="formStep === 1" class="form-step">
            <div class="fieldset-legend">{{ t('insc.tutorParent') }}</div>
            <div class="field-row">
              <div class="field"><label>{{ t('insc.tutorLastName') }} *</label><input v-model="form.parentLastName" type="text" class="input" required /></div>
              <div class="field"><label>{{ t('insc.tutorFirstName') }} *</label><input v-model="form.parentFirstName" type="text" class="input" required /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>{{ t('insc.mainPhone') }} *</label><input v-model="form.parentPhone" type="tel" class="input" placeholder="+237 6XX XXX XXX" required /></div>
              <div class="field"><label>{{ t('insc.secondPhone') }}</label><input v-model="form.parentPhone2" type="tel" class="input" placeholder="+237 6XX XXX XXX" /></div>
            </div>
            <div class="field">
              <label>{{ t('insc.parentEmail') }}</label>
              <input v-model="form.parentEmail" type="email" class="input" placeholder="parent@email.com" />
              <span class="field-hint">{{ t('insc.parentEmailHint') }}</span>
            </div>

            <!-- Format de reception des documents -->
            <div class="field" style="margin-top: 16px;">
              <label>{{ t('insc.docFormat') }}</label>
              <p style="font-size: 12px; color: var(--tx3); margin: 0 0 8px;">
                {{ t('insc.docFormatHint') }}
              </p>
              <div class="doc-format-options">
                <label
                  v-for="fmt in DOCUMENT_FORMATS"
                  :key="fmt.value"
                  class="doc-format-option"
                  :class="{ active: form.documentFormat === fmt.value }"
                >
                  <input
                    type="radio"
                    :value="fmt.value"
                    v-model="form.documentFormat"
                    style="display: none;"
                  />
                  <span class="doc-format-label">{{ fmt.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Step 3: Pièces jointes -->
          <div v-if="formStep === 2" class="form-step">
            <div class="fieldset-legend">{{ t('insc.dossierPieces') }}</div>
            <div class="documents-grid">
              <div v-for="doc in REQUIRED_DOCUMENTS" :key="doc.key" class="doc-slot" :class="{ 'doc-uploaded': hasDocument(doc.key), 'doc-required': doc.required && !hasDocument(doc.key) }">
                <div class="doc-slot-header">
                  <span class="doc-slot-label">{{ doc.label }}</span>
                  <span v-if="doc.required" class="doc-required-tag">{{ t('insc.mandatory') }}</span>
                </div>
                <div v-if="hasDocument(doc.key)" class="doc-slot-file">
                  <Paperclip :size="14" />
                  <span>{{ getDocumentName(doc.key) }}</span>
                  <button class="btn btn-ghost btn-sm" @click="removeDocument(doc.key)" style="color: var(--danger); margin-left: auto;">
                    <X :size="14" />
                  </button>
                </div>
                <label v-else class="doc-upload-zone">
                  <Upload :size="18" />
                  <span>{{ t('insc.clickToAdd') }}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="handleDocUpload($event, doc.key)" style="display: none;" />
                </label>
              </div>
            </div>
          </div>

          <!-- Step 4: Récapitulatif -->
          <div v-if="formStep === 3" class="form-step">
            <div class="fieldset-legend">{{ t('insc.recap') }}</div>
            <div class="recap-grid">
              <div class="recap-section">
                <h4>{{ t('insc.thStudent') }}</h4>
                <div class="recap-line"><span>{{ t('insc.fullName') }}</span><strong>{{ form.lastName }} {{ form.firstName }}</strong></div>
                <div class="recap-line"><span>{{ t('insc.gender') }}</span><span>{{ form.gender === 'F' ? t('insc.female') : t('insc.male') }}</span></div>
                <div class="recap-line"><span>{{ t('insc.dob') }}</span><span>{{ form.dateOfBirth }}</span></div>
                <div class="recap-line"><span>{{ t('insc.thClass') }}</span><strong>{{ form.className }}</strong></div>
                <div class="recap-line" v-if="form.previousSchool"><span>{{ t('insc.previousSchool') }}</span><span>{{ form.previousSchool }}</span></div>
              </div>
              <div class="recap-section">
                <h4>{{ t('insc.tutor') }}</h4>
                <div class="recap-line"><span>{{ t('insc.lastName') }}</span><strong>{{ form.parentLastName }} {{ form.parentFirstName }}</strong></div>
                <div class="recap-line"><span>{{ t('insc.phone') }}</span><span>{{ form.parentPhone }}</span></div>
                <div class="recap-line" v-if="form.parentEmail"><span>{{ t('insc.email') }}</span><span>{{ form.parentEmail }}</span></div>
                <div class="recap-line"><span>{{ t('insc.formatDocs') }}</span><span>{{ formatDocLabel(form.documentFormat) }}</span></div>
              </div>
              <div class="recap-section">
                <h4>{{ t('insc.attachments') }}</h4>
                <div v-for="doc in REQUIRED_DOCUMENTS" :key="doc.key" class="recap-line">
                  <span>{{ doc.label }}</span>
                  <span :class="hasDocument(doc.key) ? 'cs-green' : (doc.required ? 'cs-red' : '')" style="font-weight: 500;">
                    {{ hasDocument(doc.key) ? t('insc.provided') : t('insc.missing') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="missingRequired.length > 0" class="alert-box alert-warning">
              <AlertTriangle :size="14" />
              <span>{{ t('insc.missingWarn', { list: missingRequired.join(', ') }) }}</span>
            </div>
          </div>

          <!-- Navigation buttons -->
          <div class="modal-actions">
            <button v-if="formStep > 0" type="button" class="btn btn-outline" @click="formStep--">
              <ChevronLeft :size="16" /> {{ t('insc.previous') }}
            </button>
            <div style="flex: 1;"></div>
            <button v-if="formStep < 3" type="button" class="btn btn-primary" @click="nextStep" :disabled="!canNextStep">
              {{ t('insc.next') }} <ChevronRight :size="16" />
            </button>
            <button v-if="formStep === 3" type="button" class="btn btn-outline" @click="saveDraft">
              {{ t('insc.saveDraftBtn') }}
            </button>
            <button v-if="formStep === 3" type="submit" class="btn btn-primary">
              <Send :size="16" /> {{ t('insc.submitFile') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========== MODAL: Détail dossier ========== -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-card card modal-lg">
        <div class="modal-header">
          <div>
            <h2>{{ detailDossier?.type === 'reinscription' ? t('insc.detailTitleReins') : t('insc.detailTitleIns') }}</h2>
            <span class="badge" :class="statusBadgeClass(detailDossier?.status)" style="margin-top: 4px;">{{ statusLabel(detailDossier?.status) }}</span>
          </div>
          <button class="icon-btn" @click="showDetailModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body" v-if="detailDossier">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>{{ t('insc.thStudent') }}</h4>
              <div class="detail-line"><span>{{ t('insc.fullName') }}</span><strong>{{ detailDossier.lastName }} {{ detailDossier.firstName }}</strong></div>
              <div class="detail-line"><span>{{ t('insc.gender') }}</span><span>{{ detailDossier.gender === 'F' ? t('insc.female') : t('insc.male') }}</span></div>
              <div class="detail-line"><span>{{ t('insc.dob') }}</span><span>{{ detailDossier.dateOfBirth || '—' }}</span></div>
              <div class="detail-line"><span>{{ t('insc.thClass') }}</span><strong>{{ detailDossier.className }}</strong></div>
              <div class="detail-line" v-if="detailDossier.matricule"><span>{{ t('insc.matricule') }}</span><strong class="cs-green">{{ detailDossier.matricule }}</strong></div>
              <div class="detail-line" v-if="detailDossier.previousSchool"><span>{{ t('insc.previousSchool') }}</span><span>{{ detailDossier.previousSchool }}</span></div>
              <div class="detail-line" v-if="detailDossier.previousClass"><span>{{ t('insc.previousClass') }}</span><span>{{ detailDossier.previousClass }}</span></div>
            </div>
            <div class="detail-section">
              <h4>{{ t('insc.tutor') }}</h4>
              <div class="detail-line"><span>{{ t('insc.lastName') }}</span><strong>{{ detailDossier.parentLastName }} {{ detailDossier.parentFirstName }}</strong></div>
              <div class="detail-line"><span>{{ t('insc.phone') }}</span><span>{{ detailDossier.parentPhone }}</span></div>
              <div class="detail-line" v-if="detailDossier.parentPhone2"><span>{{ t('insc.secondPhoneShort') }}</span><span>{{ detailDossier.parentPhone2 }}</span></div>
              <div class="detail-line" v-if="detailDossier.parentEmail"><span>{{ t('insc.email') }}</span><span>{{ detailDossier.parentEmail }}</span></div>
              <div class="detail-line" v-if="detailDossier.documentFormat"><span>{{ t('insc.formatDocs') }}</span><span>{{ formatDocLabel(detailDossier.documentFormat) }}</span></div>
            </div>
          </div>
          <div class="detail-section" style="margin-top: 20px;">
            <h4>{{ t('insc.dossierPieces') }}</h4>
            <div class="documents-grid detail-docs">
              <div v-for="doc in REQUIRED_DOCUMENTS" :key="doc.key" class="doc-slot" :class="{ 'doc-uploaded': hasDetailDoc(doc.key), 'doc-missing': doc.required && !hasDetailDoc(doc.key) }">
                <div class="doc-slot-header">
                  <span class="doc-slot-label">{{ doc.label }}</span>
                  <span v-if="hasDetailDoc(doc.key)" class="cs-green" style="font-size: 12px; font-weight: 600;">{{ t('insc.provided') }}</span>
                  <span v-else-if="doc.required" class="cs-red" style="font-size: 12px; font-weight: 600;">{{ t('insc.missing') }}</span>
                  <span v-else style="font-size: 12px; color: var(--tx3);">{{ t('insc.optional') }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Validation notes -->
          <div v-if="detailDossier.notes" class="detail-section" style="margin-top: 16px;">
            <h4>{{ t('insc.notesH') }}</h4>
            <p style="font-size: 13px; color: var(--tx2); background: var(--input-bg); padding: 12px 16px; border-radius: 8px;">{{ detailDossier.notes }}</p>
          </div>

          <!-- Action bar -->
          <div v-if="detailDossier.status !== 'valide' && detailDossier.status !== 'refuse'" class="detail-actions">
            <template v-if="detailDossier.status === 'soumis'">
              <button class="btn btn-outline" @click="handleMarkIncomplete(detailDossier)">
                <AlertTriangle :size="14" /> {{ t('insc.markIncompleteBtn') }}
              </button>
              <button class="btn btn-outline" style="color: var(--success); border-color: var(--success);" @click="handleMarkComplete(detailDossier)">
                <CheckCircle :size="14" /> {{ t('insc.markCompleteBtn') }}
              </button>
            </template>
            <template v-if="detailDossier.status === 'complet' || detailDossier.status === 'soumis'">
              <button class="btn btn-primary" @click="handleValidate(detailDossier)">
                <CheckCircle :size="16" /> {{ t('insc.validateEnrol') }}
              </button>
              <button class="btn btn-outline" style="color: var(--danger); border-color: var(--danger);" @click="handleReject(detailDossier)">
                <XCircle :size="14" /> {{ t('insc.refuse') }}
              </button>
            </template>
          </div>
          <div v-if="detailDossier.status === 'valide'" class="validated-banner">
            <CheckCircle :size="18" />
            <div>
              <strong>{{ t('insc.fileValidated') }}</strong>
              <span v-if="detailDossier.validatedAt"> — {{ formatDate(detailDossier.validatedAt) }}</span>
              <span v-if="detailDossier.validatedBy"> {{ t('insc.by') }} {{ detailDossier.validatedBy }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== MODAL: Motif refus / incomplet ========== -->
    <div v-if="showNotesModal" class="modal-overlay" @click.self="showNotesModal = false">
      <div class="modal-card card" style="max-width: 480px;">
        <div class="modal-header">
          <h2>{{ notesModalTitle }}</h2>
          <button class="icon-btn" @click="showNotesModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ notesModalLabel }}</label>
            <textarea v-model="notesModalText" class="input" rows="3" :placeholder="notesModalPlaceholder"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="showNotesModal = false">{{ t('insc.cancel') }}</button>
            <button class="btn btn-primary" @click="confirmNotesAction" :disabled="!notesModalText.trim()">{{ t('insc.confirm') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="slide">
      <div v-if="toast" class="toast-success">
        <CheckCircle :size="18" />
        <span>{{ toast }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus, Search, FileText, Paperclip, Upload, X, Pencil, Trash2,
  CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  Send, UserPlus, RotateCcw
} from 'lucide-vue-next'
import { useInscriptionsStore, REQUIRED_DOCUMENTS, DOSSIER_TYPES, DOCUMENT_FORMATS } from '../stores/inscriptions'
import { useClassesStore } from '../stores/classes'
import { useAuthStore } from '../stores/auth'

const { t, locale } = useI18n({ useScope: 'global' })
const inscriptionsStore = useInscriptionsStore()
const classesStore = useClassesStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const filterStatus = ref('')
const filterType = ref('')
const showFormModal = ref(false)
const showDetailModal = ref(false)
const showNotesModal = ref(false)
const editingDossier = ref(null)
const detailDossier = ref(null)
const formStep = ref(0)
const toast = ref('')

// Notes modal state
const notesModalTitle = ref('')
const notesModalLabel = ref('')
const notesModalPlaceholder = ref('')
const notesModalText = ref('')
const notesModalAction = ref(null)

const formSteps = computed(() => [t('insc.stepStudent'), t('insc.stepTutor'), t('insc.stepDocs'), t('insc.stepRecap')])
function typeLabel(v) {
  return v === 'reinscription' ? t('insc.typeReinscription') : t('insc.typeInscription')
}

const form = reactive({
  type: 'inscription',
  firstName: '', lastName: '', gender: '', dateOfBirth: '',
  className: '', previousSchool: '', previousClass: '',
  city: '', quartier: '',
  parentLastName: '', parentFirstName: '',
  parentPhone: '', parentPhone2: '', parentEmail: '',
  documentFormat: 'papier',
  attachments: [],
})

const allClasses = computed(() => classesStore.classes.map(c => c.name).sort())

const filteredDossiers = computed(() => {
  let list = inscriptionsStore.dossiers
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(d => `${d.lastName} ${d.firstName}`.toLowerCase().includes(q))
  }
  if (filterStatus.value) {
    if (filterStatus.value === 'soumis') {
      list = list.filter(d => d.status === 'soumis' || d.status === 'complet')
    } else {
      list = list.filter(d => d.status === filterStatus.value)
    }
  }
  if (filterType.value) list = list.filter(d => d.type === filterType.value)
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
})

function statusLabel(s) {
  const keys = { brouillon: 'stBrouillon', soumis: 'stSoumis', complet: 'stComplet', incomplet: 'stIncomplet', valide: 'stValide', refuse: 'stRefuse' }
  return keys[s] ? t('insc.' + keys[s]) : s
}
function statusBadgeClass(s) {
  const map = { brouillon: 'badge-default', soumis: 'badge-warning', complet: 'badge-info', incomplet: 'badge-danger', valide: 'badge-success', refuse: 'badge-danger' }
  return map[s] || 'badge-default'
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function canValidate(d) {
  return d.status === 'soumis' || d.status === 'complet'
}
function formatDocLabel(value) {
  const fmt = DOCUMENT_FORMATS.find(f => f.value === value)
  return fmt ? fmt.label : value
}

// Form helpers
function hasDocument(key) {
  return form.attachments.some(a => a.docKey === key)
}
function getDocumentName(key) {
  return form.attachments.find(a => a.docKey === key)?.name || ''
}
function removeDocument(key) {
  form.attachments = form.attachments.filter(a => a.docKey !== key)
}
function handleDocUpload(e, key) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert(t('insc.fileTooBig')); return }
  const reader = new FileReader()
  reader.onload = () => {
    removeDocument(key) // replace existing
    form.attachments.push({ docKey: key, name: file.name, data: reader.result, type: file.type })
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const missingRequired = computed(() => {
  return REQUIRED_DOCUMENTS
    .filter(d => d.required && !hasDocument(d.key))
    .map(d => d.label)
})

const canNextStep = computed(() => {
  if (formStep.value === 0) {
    return form.lastName && form.firstName && form.gender && form.dateOfBirth && form.className
  }
  if (formStep.value === 1) {
    return form.parentLastName && form.parentFirstName && form.parentPhone
  }
  return true
})

function nextStep() {
  if (formStep.value < 3) formStep.value++
}

// Detail helpers
function hasDetailDoc(key) {
  return (detailDossier.value?.attachments || []).some(a => a.docKey === key)
}

function resetForm() {
  form.type = 'inscription'
  form.firstName = ''; form.lastName = ''; form.gender = ''; form.dateOfBirth = ''
  form.className = ''; form.previousSchool = ''; form.previousClass = ''
  form.city = ''; form.quartier = ''
  form.parentLastName = ''; form.parentFirstName = ''
  form.parentPhone = ''; form.parentPhone2 = ''; form.parentEmail = ''
  form.documentFormat = 'papier'
  form.attachments = []
  formStep.value = 0
}

function openNewDossier() {
  editingDossier.value = null
  resetForm()
  showFormModal.value = true
}

function openEditDossier(d) {
  editingDossier.value = d
  Object.assign(form, {
    type: d.type, firstName: d.firstName, lastName: d.lastName, gender: d.gender,
    dateOfBirth: d.dateOfBirth, className: d.className, previousSchool: d.previousSchool || '',
    previousClass: d.previousClass || '', city: d.city || '', quartier: d.quartier || '',
    parentLastName: d.parentLastName || '', parentFirstName: d.parentFirstName || '',
    parentPhone: d.parentPhone || '', parentPhone2: d.parentPhone2 || '',
    parentEmail: d.parentEmail || '', documentFormat: d.documentFormat || 'papier', attachments: [...(d.attachments || [])],
  })
  formStep.value = 0
  showFormModal.value = true
}

function openDossierDetail(d) {
  detailDossier.value = d
  showDetailModal.value = true
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 3000)
}

async function saveDraft() {
  const data = { ...form }
  if (editingDossier.value) {
    await inscriptionsStore.updateDossier(editingDossier.value.id, data)
  } else {
    await inscriptionsStore.createDossier(data)
  }
  showFormModal.value = false
  showToast(t('insc.toastDraftSaved'))
}

async function saveDossier() {
  const data = { ...form }
  let dossierId
  if (editingDossier.value) {
    await inscriptionsStore.updateDossier(editingDossier.value.id, data)
    dossierId = editingDossier.value.id
  } else {
    dossierId = await inscriptionsStore.createDossier(data)
  }
  await inscriptionsStore.submitDossier(dossierId)
  showFormModal.value = false
  showToast(t('insc.toastSubmitted'))
}

async function handleValidate(d) {
  const userName = authStore.userProfile?.displayName || `${authStore.userProfile?.lastName || ''} ${authStore.userProfile?.firstName || ''}`.trim()
  await inscriptionsStore.validateDossier(d.id, userName || t('insc.directorFallback'))
  showDetailModal.value = false
  showToast(t('insc.toastEnrolled', { name: `${d.lastName} ${d.firstName}` }))
}

function handleReject(d) {
  notesModalTitle.value = t('insc.rejectTitle')
  notesModalLabel.value = t('insc.rejectLabel')
  notesModalPlaceholder.value = t('insc.rejectPh')
  notesModalText.value = ''
  notesModalAction.value = async () => {
    await inscriptionsStore.rejectDossier(d.id, notesModalText.value)
    showNotesModal.value = false
    showDetailModal.value = false
    showToast(t('insc.toastRefused'))
  }
  showNotesModal.value = true
}

function handleMarkIncomplete(d) {
  notesModalTitle.value = t('insc.markIncompleteBtn')
  notesModalLabel.value = t('insc.incompleteLabel')
  notesModalPlaceholder.value = t('insc.incompletePh')
  notesModalText.value = ''
  notesModalAction.value = async () => {
    await inscriptionsStore.markIncomplete(d.id, notesModalText.value)
    showNotesModal.value = false
    detailDossier.value = inscriptionsStore.dossiers.find(x => x.id === d.id)
    showToast(t('insc.toastMarkedIncomplete'))
  }
  showNotesModal.value = true
}

async function handleMarkComplete(d) {
  await inscriptionsStore.markComplete(d.id)
  detailDossier.value = inscriptionsStore.dossiers.find(x => x.id === d.id)
  showToast(t('insc.toastMarkedComplete'))
}

async function handleDelete(d) {
  if (!confirm(t('insc.confirmDelete', { name: `${d.lastName} ${d.firstName}` }))) return
  await inscriptionsStore.deleteDossier(d.id)
  showDetailModal.value = false
  showToast(t('insc.toastDeleted'))
}

function confirmNotesAction() {
  if (notesModalAction.value) notesModalAction.value()
}

onMounted(async () => {
  await classesStore.loadClasses?.()
  await inscriptionsStore.loadDossiers()
})
</script>

<style scoped>
.inscriptions-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* ── Toolbar & search ── */
.toolbar {
  padding: 16px 20px;
}

/* Badge default (brouillon) */
.badge-default {
  background: rgba(0,0,0,.05);
  color: var(--tx3);
}

/* Clickable stat items */
.stat-bar-clickable-item {
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}
.stat-bar-clickable-item:hover {
  background: rgba(0,0,0,.03);
}
.stat-bar-clickable-item.stat-active {
  background: rgba(var(--pr-rgb), 0.06);
}
.stat-bar-clickable-item.stat-active .stat-bar-value {
  color: var(--pr);
}

/* Table */
.tr-clickable { cursor: pointer; }
.tr-clickable:hover { background: rgba(0,0,0,.02); }

.eleve-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.eleve-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--pr);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.eleve-avatar.avatar-f { background: var(--gold); }
.cell-sub { display: block; font-size: 11px; color: var(--tx3); }

.pieces-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--tx2);
}

.action-btns {
  display: flex;
  gap: 4px;
  justify-content: center;
}

/* Steps bar */
.steps-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
}
.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--tx3);
  transition: all 0.15s;
}
.step-item.active {
  background: var(--pr-light);
  color: var(--pr);
  font-weight: 600;
}
.step-item.done { color: var(--success); }
.step-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.step-item.active .step-num { background: var(--pr); color: #fff; }
.step-item.done .step-num { background: var(--success); color: #fff; }
.step-label { white-space: nowrap; }

/* Type cards */
.type-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 1.5px solid var(--card-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
}
.type-card:hover { border-color: var(--pr); color: var(--pr); }
.type-card.selected { border-color: var(--pr); background: var(--pr-light); color: var(--pr); }

/* Documents grid */
.documents-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.doc-slot {
  border: 1.5px dashed var(--card-border);
  border-radius: 10px;
  padding: 14px;
  transition: border-color 0.15s;
}
.doc-slot.doc-uploaded {
  border-color: var(--success);
  border-style: solid;
  background: rgba(27,138,90,.03);
}
.doc-slot.doc-required {
  border-color: var(--danger);
}
.doc-slot.doc-missing {
  border-color: rgba(217,48,37,.3);
  background: rgba(217,48,37,.02);
}
.doc-slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.doc-slot-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
}
.doc-required-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.doc-slot-file {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--success);
  font-weight: 500;
}
.doc-upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  cursor: pointer;
  color: var(--tx3);
  font-size: 12px;
  transition: color 0.15s;
}
.doc-upload-zone:hover { color: var(--pr); }

/* Document format options */
.doc-format-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.doc-format-option {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1.5px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}
.doc-format-option:hover {
  border-color: var(--primary, var(--pr));
}
.doc-format-option.active {
  border-color: var(--primary, var(--pr));
  background: rgba(var(--pr-rgb), 0.05);
}
.doc-format-label {
  font-weight: 500;
}

/* Recap */
.recap-grid, .detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.recap-section, .detail-section {
  background: var(--input-bg);
  border-radius: 10px;
  padding: 16px;
}
.recap-section h4, .detail-section h4 {
  font-size: 12px;
  font-weight: 700;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.recap-line, .detail-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--tx2);
}

/* Alert box */
.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 16px;
}
.alert-warning {
  background: rgba(232,149,10,.08);
  color: #b87a00;
  border: 1px solid rgba(232,149,10,.15);
}

/* Detail actions */
.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--divider);
  flex-wrap: wrap;
}

.validated-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-top: 20px;
  background: rgba(27,138,90,.06);
  border-radius: 10px;
  color: var(--success);
  font-size: 14px;
}

/* Modal sizing for inscriptions */
.modal-lg {
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-lg .modal-body {
  overflow-y: auto;
  flex: 1;
}

/* Toast */
.toast-success {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: var(--card);
  border: 1px solid rgba(27,138,90,.2);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.12);
  color: var(--success);
  font-size: 14px;
  font-weight: 500;
  z-index: 100;
}

/* Form */
.form-step { min-height: 200px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
.field-hint { display: block; font-size: 12px; color: var(--tx3); margin-top: 4px; }
.fieldset-legend { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; color: var(--tx); margin-bottom: 12px; }

/* Responsive */
@media (max-width: 768px) {
  /* Page layout */
  .inscriptions-page {
    padding: 0 4px;
  }

  /* Page header */
  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  /* Stat bar: 2 columns on mobile */
  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px;
  }

  /* Toolbar: stack filter bar vertically */
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
  }

  .search-box {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .toolbar > select {
    width: 100%;
  }

  /* Table: hide less important columns */
  .data-table thead th:nth-child(3),
  .data-table thead th:nth-child(5),
  .data-table thead th:nth-child(6) {
    display: none;
  }

  .data-table tbody td:nth-child(3),
  .data-table tbody td:nth-child(5),
  .data-table tbody td:nth-child(6) {
    display: none;
  }

  /* Action buttons: make them more touch-friendly */
  .action-btns {
    gap: 6px;
  }

  .btn {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-sm {
    min-height: 40px;
    padding: 8px 12px;
  }

  /* Modal: full width and stack better */
  .modal-card {
    max-width: 95vw !important;
    max-height: 95vh;
    margin: 12px;
  }

  .modal-lg {
    max-width: 95vw;
  }

  /* Form: stack all to 1 column */
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .form-step {
    min-height: auto;
  }

  /* Documents grid: 1 column */
  .documents-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .doc-slot {
    padding: 12px;
  }

  /* Recap and detail grids: 1 column */
  .recap-grid, .detail-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .recap-section, .detail-section {
    padding: 12px 14px;
    background: var(--input-bg);
  }

  .recap-section h4, .detail-section h4 {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .recap-line, .detail-line {
    font-size: 12px;
    padding: 3px 0;
  }

  /* Steps bar: responsive layout */
  .steps-bar {
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .step-item {
    flex: 1 1 calc(50% - 3px);
    min-width: 0;
    padding: 6px 8px;
    font-size: 12px;
  }

  .step-label {
    display: none;
  }

  .step-num {
    width: 22px;
    height: 22px;
    font-size: 10px;
    flex-shrink: 0;
  }

  /* Type cards: 1 column */
  .type-cards {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .type-card {
    padding: 16px 12px;
    font-size: 12px;
  }

  /* Modal actions: wrap better on mobile */
  .modal-actions {
    gap: 8px;
    flex-wrap: wrap;
  }

  .modal-actions .btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* Detail actions: stack vertically on mobile */
  .detail-actions {
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    margin-top: 12px;
  }

  .detail-actions .btn {
    width: 100%;
    justify-content: center;
  }

  /* Validated banner */
  .validated-banner {
    padding: 12px 16px;
    margin-top: 12px;
    font-size: 13px;
  }

  /* Alert box */
  .alert-box {
    gap: 6px;
    padding: 10px 12px;
    font-size: 12px;
    margin-top: 12px;
  }

  /* Toast: adjust position for mobile */
  .toast-success {
    bottom: 16px;
    right: 12px;
    left: 12px;
    margin: 0 auto;
    padding: 12px 16px;
    font-size: 13px;
  }

  /* Fieldset legend */
  .fieldset-legend {
    font-size: 13px;
    margin-bottom: 10px;
  }

  /* Field styling */
  .field {
    margin-bottom: 12px;
  }

  .field label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  /* Empty state */
  .empty-state {
    padding: 32px 16px !important;
  }

  /* Table wrapper adjustments */
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    font-size: 12px;
  }

  .data-table th {
    padding: 8px 6px;
    font-size: 11px;
  }

  .data-table td {
    padding: 8px 6px;
  }

  .eleve-cell {
    gap: 8px;
  }

  .eleve-avatar {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }

  .cell-sub {
    font-size: 10px;
  }

  .pieces-indicator {
    font-size: 11px;
    gap: 2px;
  }
}
</style>
