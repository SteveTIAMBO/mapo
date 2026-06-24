<template>
  <div class="notes-page">
    <!-- ONBOARDING -->
    <template v-if="!notesStore.setupDone && !loading">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Notes & Évaluations</h1>
          <p>Configurez le système de notation de votre établissement</p>
        </div>
      </div>
      <div class="card onboarding-card">
        <div class="onboarding-icon">
          <FileText :size="36" />
        </div>
        <h2>Bienvenue dans le module de notes</h2>
        <p class="onboarding-desc">
          Ce module permet de saisir les notes {{ isSingleEval ? 'de chaque trimestre' : 'de chaque sequence' }}, de calculer automatiquement
          les moyennes trimestrielles et annuelles, et de générer les bulletins de vos élèves.
        </p>
        <div class="onboarding-steps">
          <div class="onboarding-step">
            <div class="step-num">1</div>
            <div>
              <strong>Structure</strong>
              <p v-if="isSingleEval">1 évaluation par trimestre, 3 trimestres par année.
              La moyenne des 3 trimestres donne la note annuelle.</p>
              <p v-else>6 séquences (2 par trimestre), 3 trimestres par année.
              La moyenne des 2 séquences donne la note du trimestre.
              La moyenne des 3 trimestres donne la note annuelle.</p>
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-num">2</div>
            <div>
              <strong>Coefficients</strong>
              <p>Chaque matière est pondérée par son volume horaire hebdomadaire.
              Ex: Mathématiques (6h) compte plus qu'EPS (2h) dans la moyenne générale.</p>
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-num">3</div>
            <div>
              <strong>Bulletins</strong>
              <p>Le directeur valide et envoie les bulletins. Les parents les reçoivent dans leur espace.
              Chaque bulletin indique le rang, la moyenne, l'appréciation et la décision de fin d'année.</p>
            </div>
          </div>
        </div>
        <div v-if="classesStore.classes.length === 0" class="onboarding-warning">
          <AlertCircle :size="16" />
          <span>Vous devez d'abord créer vos classes et inscrire vos élèves avant de saisir les notes.</span>
        </div>
        <button class="btn btn-primary" style="margin-top:20px;" @click="notesStore.completeSetup()" :disabled="classesStore.classes.length === 0">
          Commencer la saisie des notes
        </button>
      </div>
    </template>

    <!-- MAIN VIEW -->
    <template v-else-if="!loading">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-text">
          <h1>Notes & Évaluations</h1>
          <p>Saisie des notes et consultation des moyennes</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button v-if="!authStore.isTeacher && selectedClass && classEleves.length > 0" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:6px;" @click="exportNotes">
            <Download :size="16" />
            <span>Exporter</span>
          </button>
          <button v-if="isDirecteur" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:6px;" @click="openNotesSettings()">
            <Settings :size="16" />
            <span>Paramètres du module</span>
          </button>
        </div>
      </div>

      <!-- Notification: pending validation for directeur -->
      <div v-if="isDirecteur && pendingDirCount > 0" class="pending-dir-banner" style="margin-bottom: 16px;">
        <ShieldCheck :size="16" />
        <span><strong>{{ pendingDirCount }}</strong> {{ pendingDirCount > 1 ? 'classes ont des bulletins' : 'classe a des bulletins' }} en attente de votre signature.</span>
      </div>

      <!-- Toolbar -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="toolbar">
          <div class="field" style="margin-bottom:0; min-width:180px;">
            <label>Classe</label>
            <select v-model="selectedClass" class="input">
              <option value="">Sélectionnez une classe</option>
              <option v-for="c in availableClasses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0; min-width:200px;">
            <label>Période</label>
            <select v-model="selectedPeriod" class="input">
              <template v-if="!isSingleEval">
                <option value="S1">Séquence 1</option>
                <option value="S2">Séquence 2</option>
              </template>
              <option value="T1">1er Trimestre</option>
              <template v-if="!isSingleEval">
                <option value="S3">Séquence 3</option>
                <option value="S4">Séquence 4</option>
              </template>
              <option value="T2">2ème Trimestre</option>
              <template v-if="!isSingleEval">
                <option value="S5">Séquence 5</option>
                <option value="S6">Séquence 6</option>
              </template>
              <option value="T3">3ème Trimestre</option>
              <option value="annual">Bilan annuel</option>
            </select>
          </div>
          <div class="toolbar-spacer"></div>
          <div class="tab-bar">
            <!-- Enseignants : Saisie des notes -->
            <button v-if="!isDirecteurOnly" class="tab-btn" :class="{ active: activeTab === 'saisie' }" @click="activeTab = 'saisie'">
              <Pencil :size="14" />
              Saisie
            </button>
            <!-- Bulletin : visible par tous -->
            <button class="tab-btn" :class="{ active: activeTab === 'bulletin' }" @click="activeTab = 'bulletin'">
              <FileText :size="14" />
              Bulletin
            </button>
            <!-- Distribution : directeur uniquement -->
            <button v-if="isDirecteur" class="tab-btn" :class="{ active: activeTab === 'distribution' }" @click="activeTab = 'distribution'">
              <Send :size="14" />
              Distribution
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!selectedClass" class="card empty-state-card">
        <FileText :size="40" style="color: var(--muted); margin-bottom: 12px;" />
        <p style="font-size: 15px; font-weight: 500;">Sélectionnez une classe pour commencer</p>
        <p style="font-size: 13px; color: var(--muted);">Choisissez une classe et un trimestre pour saisir ou consulter les notes.</p>
      </div>

      <!-- ═══════ TAB: SAISIE ═══════ -->
      <template v-if="selectedClass && activeTab === 'saisie' && selectedTrimester !== 'annual'">
        <div class="info-banner" style="margin-bottom:16px;">
          <AlertCircle :size="16" />
          <span>{{ isSingleEval ? 'Saisissez la note sur 20 pour chaque élève.' : 'Saisissez les notes sur 20 pour chaque séquence. La moyenne du trimestre se calcule automatiquement.' }}</span>
        </div>

        <!-- Subject selector -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="toolbar">
            <div class="field" style="margin-bottom:0; min-width:220px;">
              <label>
                Matière
                <span class="info-tip" title="Les matières disponibles dépendent du niveau de la classe sélectionnée.">?</span>
              </label>
              <select v-model="selectedSubject" class="input">
                <option value="">Sélectionnez une matière</option>
                <option v-for="s in classSubjects" :key="s" :value="s">{{ s }} (coeff. {{ getCoeff(s) }})</option>
              </select>
            </div>
            <div class="toolbar-spacer"></div>
            <div v-if="selectedSubject && seqStats" class="mini-stats">
              <template v-if="isSingleEval">
                <span>Moy: <strong>{{ seqStats.s1.avg || '-' }}</strong></span>
                <span>Réussite: <strong>{{ seqStats.s1.successRate || 0 }}%</strong></span>
              </template>
              <template v-else>
                <span>Moy: <strong>{{ seqStats.s1.avg || '-' }}</strong> (S{{ seqNumbers[0] }}) / <strong>{{ seqStats.s2.avg || '-' }}</strong> (S{{ seqNumbers[1] }})</span>
                <span>Réussite: <strong>{{ seqStats.s1.successRate || 0 }}%</strong> / <strong>{{ seqStats.s2.successRate || 0 }}%</strong></span>
              </template>
            </div>
          </div>
        </div>

        <!-- Brouillon de notes récupéré après une coupure (auto-sauvegarde) -->
        <div v-if="restoreNotesPrompt && selectedSubject" class="draft-restore-bar">
          <div class="draft-restore-text">
            <RotateCcw :size="18" />
            <span>Notes non enregistrées récupérées pour <strong>{{ selectedSubject }}</strong> — {{ restoreNotesPrompt.count }} élève(s) saisi(s), {{ draftAge(restoreNotesPrompt.savedAt) }}. Reprenez votre saisie.</span>
          </div>
          <div class="draft-restore-actions">
            <button class="btn btn-sm btn-outline" @click="discardNotesDraft">Ignorer</button>
            <button class="btn btn-sm btn-primary" @click="restoreNotesDraft">
              <RotateCcw :size="14" />
              <span>Reprendre la saisie</span>
            </button>
          </div>
        </div>

        <!-- Notes grid -->
        <div v-if="selectedSubject" class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3>{{ selectedSubject }} - {{ selectedClassName }} - {{ currentTrimester?.label }}</h3>
            <div style="display:flex; gap:8px; align-items:center;">
              <span v-if="isDirty" class="unsaved-badge">Modifications non enregistrées</span>
              <button v-if="isDirty" class="btn btn-primary btn-sm" @click="saveNotes">
                <Save :size="16" />
                <span>Enregistrer</span>
              </button>
              <button
                v-if="canValidateSubject(selectedSubject) && !isSubjectValidated(selectedSubject) && selectedSubject"
                class="btn btn-primary btn-sm"
                @click="validateMySubject"
                style="display: inline-flex; align-items: center; gap: 6px;"
              >
                <CircleCheck :size="16" />
                Valider mes notes
              </button>
              <div v-if="isSubjectValidated(selectedSubject)" class="validation-badge-inline">
                <CircleCheck :size="14" />
                <span>Notes validées</span>
              </div>
            </div>
          </div>
          <div class="notes-table-wrap">
            <table class="notes-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th class="col-name">Nom de l'élève</th>
                  <template v-if="isSingleEval">
                    <th class="col-note">
                      Note /20
                    </th>
                  </template>
                  <template v-else>
                    <th class="col-note">
                      Seq. {{ seqNumbers[0] }} /20
                      <span class="info-tip" title="Note de la première séquence du trimestre">?</span>
                    </th>
                    <th class="col-note">
                      Seq. {{ seqNumbers[1] }} /20
                      <span class="info-tip" title="Note de la deuxième séquence du trimestre">?</span>
                    </th>
                    <th class="col-avg">
                      Moy. Trim.
                      <span class="info-tip" title="Moyenne automatique des deux séquences">?</span>
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(eleve, idx) in classEleves" :key="eleve.id">
                  <td class="col-rank">{{ idx + 1 }}</td>
                  <td class="col-name">{{ eleve.lastName }} {{ eleve.firstName }}</td>
                  <template v-if="isSingleEval">
                    <td class="col-note">
                      <input
                        type="number"
                        class="note-input"
                        :class="{ 'note-fail': parseFloat(editingNotes[eleve.id]?.s1) < 10 }"
                        min="0" max="20" step="0.25"
                        :value="editingNotes[eleve.id]?.s1 ?? ''"
                        @input="onInput(eleve.id, 's1', $event)"
                        placeholder="-"
                      />
                    </td>
                  </template>
                  <template v-else>
                    <td class="col-note">
                      <input
                        type="number"
                        class="note-input"
                        :class="{ 'note-fail': parseFloat(editingNotes[eleve.id]?.s1) < 10 }"
                        min="0" max="20" step="0.25"
                        :value="editingNotes[eleve.id]?.s1 ?? ''"
                        @input="onInput(eleve.id, 's1', $event)"
                        placeholder="-"
                      />
                    </td>
                    <td class="col-note">
                      <input
                        type="number"
                        class="note-input"
                        :class="{ 'note-fail': parseFloat(editingNotes[eleve.id]?.s2) < 10 }"
                        min="0" max="20" step="0.25"
                        :value="editingNotes[eleve.id]?.s2 ?? ''"
                        @input="onInput(eleve.id, 's2', $event)"
                        placeholder="-"
                      />
                    </td>
                    <td class="col-avg" :class="{ 'note-cell-fail': getTrimAvg(eleve.id) !== null && getTrimAvg(eleve.id) < 10, 'note-cell-success': getTrimAvg(eleve.id) >= 10 }">
                      <strong>{{ getTrimAvg(eleve.id) !== null ? getTrimAvg(eleve.id).toFixed(2) : '-' }}</strong>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="card empty-state-card">
          <p style="color:var(--muted); font-size:14px;">Sélectionnez une matière pour saisir les notes.</p>
        </div>
      </template>

      <!-- ═══════ TAB: BULLETIN ═══════ -->
      <template v-if="selectedClass && activeTab === 'bulletin'">
        <!-- Eleve selector + actions -->
        <div class="card" style="margin-bottom:16px;">
          <div class="toolbar">
            <div class="field" style="margin-bottom:0; min-width:280px;">
              <label>Élève</label>
              <select v-model="selectedEleve" class="input">
                <option value="">Sélectionnez un élève</option>
                <option v-for="e in classEleves" :key="e.id" :value="e.id">
                  {{ e.lastName }} {{ e.firstName }}
                  {{ notesStore.isBulletinSigned(selectedClass, selectedPeriod, e.id) ? ' -- Signé' : '' }}
                </option>
              </select>
            </div>
            <div class="toolbar-spacer"></div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <template v-if="isDirecteur && selectedTrimester !== 'annual'">
                <div class="ai-ton">
                  <span class="ai-ton-label">Ton</span>
                  <select v-model="appreciationTon" class="input ai-ton-select">
                    <option value="bienveillant">Bienveillant</option>
                    <option value="neutre">Neutre</option>
                    <option value="exigeant">Exigeant</option>
                  </select>
                </div>
                <button class="btn btn-ai btn-sm" @click="openBatchModal" :disabled="batch.running || !classEleves.length">
                  <Loader2 v-if="batch.running" :size="14" class="ai-spin" />
                  <Sparkles v-else :size="14" />
                  {{ batch.running ? `IA ${batch.done}/${batch.total}…` : 'Appréciations IA — classe' }}
                </button>
              </template>
              <button v-if="selectedEleve && notesStore.isBulletinSigned(selectedClass, selectedPeriod, selectedEleve)" class="btn btn-outline btn-sm" disabled style="color: var(--success);">
                <ShieldCheck :size="14" />
                Bulletin signé
              </button>
              <button v-if="selectedEleve" class="btn btn-outline btn-sm" @click="printBulletin">
                <Printer :size="16" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Progression / résumé de la génération en lot -->
        <div v-if="batch.running || batch.summary" class="card" style="margin-bottom:16px;">
          <div style="padding:14px 16px;">
            <div v-if="batch.running">
              <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; color:var(--text);">
                <span>Génération des appréciations… <strong>{{ batch.current }}</strong></span>
                <span>{{ batch.done }} / {{ batch.total }}</span>
              </div>
              <div class="batch-bar"><div class="batch-bar-fill" :style="{ width: (batch.total ? Math.round(batch.done / batch.total * 100) : 0) + '%' }"></div></div>
            </div>
            <div v-else class="ai-feedback ok" style="margin:0;">{{ batch.summary }}</div>
          </div>
        </div>

        <!-- Modal de confirmation génération en lot -->
        <div v-if="showBatchModal" class="batch-overlay" @click.self="showBatchModal = false">
          <div class="batch-modal">
            <h3 class="batch-modal-title">Générer les appréciations de la classe</h3>
            <p class="batch-modal-text">
              L'IA va rédiger une observation du conseil pour <strong>{{ batchTargets.length }}</strong>
              élève(s) de {{ selectedClassObj?.name }} ({{ currentPeriodLabel }}), ton « {{ appreciationTon }} ».
            </p>
            <label class="batch-check">
              <input type="checkbox" v-model="batchSkipExisting" />
              Ignorer les élèves ayant déjà une observation
            </label>
            <p class="batch-modal-note">
              Chaque texte reste modifiable bulletin par bulletin. Si l'IA est indisponible, une version locale est générée automatiquement.
            </p>
            <div class="batch-modal-actions">
              <button class="btn btn-outline btn-sm" @click="showBatchModal = false">Annuler</button>
              <button class="btn btn-ai btn-sm" :disabled="!batchTargets.length" @click="runBatch">
                <Sparkles :size="14" />
                Générer ({{ batchTargets.length }})
              </button>
            </div>
          </div>
        </div>

        <div v-if="!selectedEleve" class="card empty-state-card">
          <p style="color:var(--muted);">Sélectionnez un élève pour voir son bulletin.</p>
        </div>

        <!-- Bulletin card -->
        <div v-else>
          <div class="bulletin-card card" id="bulletin-print">
            <div class="bulletin-header">
              <div class="bulletin-school">
                <strong>{{ schoolStore.schoolSettings?.schoolName || 'Établissement' }}</strong>
                <span v-if="schoolStore.schoolSettings?.address || schoolStore.schoolSettings?.city">{{ [schoolStore.schoolSettings.address, schoolStore.schoolSettings.city].filter(Boolean).join(', ') }}</span>
                <span v-if="schoolStore.schoolSettings?.phone">Tel: {{ schoolStore.schoolSettings.phone }}</span>
                <span v-if="schoolStore.schoolSettings?.email">{{ schoolStore.schoolSettings.email }}</span>
                <span class="bulletin-year">Année scolaire {{ schoolStore.schoolSettings?.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1) }}</span>
              </div>
              <div class="bulletin-title">
                <h2>BULLETIN DE NOTES</h2>
                <span>{{ currentPeriodLabel }}</span>
              </div>
            </div>

            <div class="bulletin-student-info">
              <div><strong>Nom :</strong> {{ selectedEleveObj?.lastName }} {{ selectedEleveObj?.firstName }}</div>
              <div><strong>Classe :</strong> {{ selectedClassName }}</div>
              <div><strong>Matricule :</strong> {{ selectedEleveObj?.matricule || '-' }}</div>
              <div><strong>Effectif :</strong> {{ classEleves.length }} élèves</div>
            </div>

            <table class="bulletin-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Coeff.</th>
                  <!-- Sequence: single note column -->
                  <template v-if="selectedPeriod.startsWith('S')">
                    <th>Note /20</th>
                  </template>
                  <!-- Trimester -->
                  <template v-else-if="selectedTrimester !== 'annual' && isSingleEval">
                    <th>Note</th>
                  </template>
                  <template v-else-if="selectedTrimester !== 'annual'">
                    <th>Seq. {{ seqNumbers[0] }}</th>
                    <th>Seq. {{ seqNumbers[1] }}</th>
                    <th>Moy. Trim.</th>
                  </template>
                  <!-- Annual -->
                  <th v-if="selectedTrimester === 'annual'">T1</th>
                  <th v-if="selectedTrimester === 'annual'">T2</th>
                  <th v-if="selectedTrimester === 'annual'">T3</th>
                  <th v-if="selectedTrimester === 'annual'">Moy. Ann.</th>
                  <th>Moy. Classe</th>
                  <th>{{ isApc ? 'Palier (APC)' : 'Appréciation' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in bulletinRows" :key="row.subject">
                  <td class="bulletin-subject">{{ row.subject }}</td>
                  <td class="bulletin-coeff">{{ row.coeff }}</td>
                  <!-- Sequence: show single note -->
                  <template v-if="selectedPeriod.startsWith('S')">
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': row.seqNote !== null && row.seqNote < 10, 'note-cell-success': row.seqNote >= 10 }">
                      <strong>{{ row.seqNote !== null ? row.seqNote.toFixed(2) : '-' }}</strong>
                    </td>
                  </template>
                  <template v-else-if="selectedTrimester !== 'annual' && isSingleEval">
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': row.trimAvg !== null && row.trimAvg < 10, 'note-cell-success': row.trimAvg >= 10 }">
                      <strong>{{ row.trimAvg !== null ? row.trimAvg.toFixed(2) : '-' }}</strong>
                    </td>
                  </template>
                  <template v-else-if="selectedTrimester !== 'annual'">
                    <td :class="{ 'note-cell-fail': row.seq1 !== null && row.seq1 < 10 }">{{ row.seq1 !== null ? row.seq1.toFixed(2) : '-' }}</td>
                    <td :class="{ 'note-cell-fail': row.seq2 !== null && row.seq2 < 10 }">{{ row.seq2 !== null ? row.seq2.toFixed(2) : '-' }}</td>
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': row.trimAvg !== null && row.trimAvg < 10, 'note-cell-success': row.trimAvg >= 10 }">
                      <strong>{{ row.trimAvg !== null ? row.trimAvg.toFixed(2) : '-' }}</strong>
                    </td>
                  </template>
                  <template v-else>
                    <td :class="{ 'note-cell-fail': row.t1 !== null && row.t1 < 10 }">{{ row.t1 !== null ? row.t1.toFixed(2) : '-' }}</td>
                    <td :class="{ 'note-cell-fail': row.t2 !== null && row.t2 < 10 }">{{ row.t2 !== null ? row.t2.toFixed(2) : '-' }}</td>
                    <td :class="{ 'note-cell-fail': row.t3 !== null && row.t3 < 10 }">{{ row.t3 !== null ? row.t3.toFixed(2) : '-' }}</td>
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': row.annualAvg !== null && row.annualAvg < 10, 'note-cell-success': row.annualAvg >= 10 }">
                      <strong>{{ row.annualAvg !== null ? row.annualAvg.toFixed(2) : '-' }}</strong>
                    </td>
                  </template>
                  <td>{{ row.classAvg !== null ? row.classAvg.toFixed(2) : '-' }}</td>
                  <td>
                    <span v-if="isApc && row.mainAvg !== null" class="apc-badge" :class="'apc-' + paletteFor(row.mainAvg)">{{ paletteFor(row.mainAvg) }}</span>
                    <span v-else-if="row.mainAvg !== null" class="appreciation-tag-sm" :class="getAppreciationClass(row.mainAvg)">{{ getAppreciationText(row.mainAvg) }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bulletin-total-row">
                  <td colspan="2"><strong>MOYENNE GÉNÉRALE</strong></td>
                  <td v-if="selectedPeriod.startsWith('S')" class="bulletin-avg" :class="{ 'note-cell-fail': bulletinGeneralAvg !== null && bulletinGeneralAvg < 10, 'note-cell-success': bulletinGeneralAvg >= 10 }">
                    <strong>{{ bulletinGeneralAvg !== null ? bulletinGeneralAvg.toFixed(2) : '-' }} / 20</strong>
                  </td>
                  <template v-else-if="selectedTrimester !== 'annual'">
                    <td colspan="2"></td>
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': bulletinGeneralAvg !== null && bulletinGeneralAvg < 10, 'note-cell-success': bulletinGeneralAvg >= 10 }">
                      <strong>{{ bulletinGeneralAvg !== null ? bulletinGeneralAvg.toFixed(2) : '-' }} / 20</strong>
                    </td>
                  </template>
                  <template v-else>
                    <td colspan="3"></td>
                    <td class="bulletin-avg" :class="{ 'note-cell-fail': bulletinGeneralAvg !== null && bulletinGeneralAvg < 10, 'note-cell-success': bulletinGeneralAvg >= 10 }">
                      <strong>{{ bulletinGeneralAvg !== null ? bulletinGeneralAvg.toFixed(2) : '-' }} / 20</strong>
                    </td>
                  </template>
                  <td></td>
                  <td>
                    <span v-if="isApc && bulletinGeneralAvg !== null" class="apc-badge" :class="'apc-' + paletteFor(bulletinGeneralAvg)">{{ paletteFor(bulletinGeneralAvg) }}</span>
                    <span v-else-if="bulletinGeneralAvg !== null" class="appreciation-tag-sm" :class="getAppreciationClass(bulletinGeneralAvg)">{{ getAppreciationText(bulletinGeneralAvg) }}</span>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div class="bulletin-footer">
              <div class="bulletin-summary">
                <div><strong>Rang :</strong> {{ bulletinRank || '-' }} / {{ classEleves.length }}</div>
                <div><strong>Mention :</strong> {{ bulletinMention || 'Aucune' }}</div>
                <div v-if="bulletinCustomMention" class="custom-mention"><strong>Observation du conseil :</strong> {{ bulletinCustomMention }}</div>
                <div v-if="selectedTrimester === 'annual'"><strong>Décision :</strong> {{ bulletinDecision }}</div>
              </div>
              <div class="bulletin-signatures">
                <div class="signature-block">
                  <p>Le Directeur</p>
                  <template v-if="selectedEleve && notesStore.isBulletinSigned(selectedClass, selectedPeriod, selectedEleve)">
                    <img v-if="schoolStore.schoolSettings?.directorSignature" :src="schoolStore.schoolSettings.directorSignature" alt="Signature" class="signature-image" />
                    <div class="signature-validated signature-validated-dir">
                      <ShieldCheck :size="14" />
                      <span>Signé</span>
                    </div>
                    <span class="signature-name">{{ notesStore.getBulletinSignature(selectedClass, selectedPeriod, selectedEleve).signedBy }}</span>
                    <span class="signature-date">{{ formatDate(notesStore.getBulletinSignature(selectedClass, selectedPeriod, selectedEleve).signedAt) }}</span>
                  </template>
                  <div v-else class="signature-line"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Observation du conseil + Signature (directeur) -->
          <div v-if="isDirecteur" class="card" style="margin-top: 16px;">
            <div style="padding: 16px;">
              <div style="margin-bottom: 16px;">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--muted); margin-bottom:6px;">
                  Observation du conseil de classe
                </label>

                <!-- Génération assistée par IA -->
                <div class="ai-appreciation-bar">
                  <button
                    type="button"
                    class="btn btn-ai btn-sm"
                    @click="genererAppreciation"
                    :disabled="appreciationsStore.generating || !bulletinRows.length"
                  >
                    <Loader2 v-if="appreciationsStore.generating" :size="14" class="ai-spin" />
                    <Sparkles v-else :size="14" />
                    {{ appreciationsStore.generating ? 'Génération…' : 'Générer avec l\'IA' }}
                  </button>
                  <div class="ai-ton">
                    <span class="ai-ton-label">Ton</span>
                    <select v-model="appreciationTon" class="input ai-ton-select">
                      <option value="bienveillant">Bienveillant</option>
                      <option value="neutre">Neutre</option>
                      <option value="exigeant">Exigeant</option>
                    </select>
                  </div>
                </div>
                <p v-if="appreciationFeedback" class="ai-feedback" :class="appreciationFeedbackType">{{ appreciationFeedback }}</p>

                <div style="display:flex; gap:8px; align-items:flex-start;">
                  <textarea
                    class="input"
                    style="flex:1; min-height:42px; resize:vertical; font-size:13px;"
                    :value="editingCustomMention"
                    @input="editingCustomMention = $event.target.value"
                    placeholder="Ex: Élève sérieux, doit fournir plus d'efforts en mathématiques..."
                    rows="3"
                  ></textarea>
                  <button class="btn btn-outline btn-sm" style="white-space:nowrap;" @click="saveCustomMention" :disabled="editingCustomMention === bulletinCustomMention">
                    <Save :size="14" />
                    Enregistrer
                  </button>
                </div>
              </div>
              <!-- Sign button -->
              <button
                v-if="!notesStore.isBulletinSigned(selectedClass, selectedPeriod, selectedEleve)"
                class="btn btn-primary signing-btn"
                style="width: 100%;"
                @click="signSingleBulletin"
              >
                <ShieldCheck :size="20" />
                Signer ce bulletin
              </button>
              <div v-else style="text-align: center; padding: 8px; color: var(--success); font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <ShieldCheck :size="18" />
                Bulletin signé par {{ notesStore.getBulletinSignature(selectedClass, selectedPeriod, selectedEleve).signedBy }}
              </div>
            </div>
          </div>

          <!-- Navigation Suivant / Retour -->
          <div class="bulletin-nav" style="margin-top: 16px;">
            <button class="btn btn-outline" :disabled="!prevEleveId" @click="selectedEleve = prevEleveId">
              <ChevronLeft :size="16" />
              Retour
            </button>
            <span class="bulletin-nav-info">{{ currentEleveIndex + 1 }} / {{ classEleves.length }}</span>
            <button class="btn btn-outline" :disabled="!nextEleveId" @click="selectedEleve = nextEleveId">
              Suivant
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </template>

      <!-- ═══════ TAB: DISTRIBUTION (Directeur) ═══════ -->
      <template v-if="activeTab === 'distribution' && isDirecteur">
        <div class="info-banner" style="margin-bottom:16px;">
          <Send :size="16" />
          <span>Distribuez les bulletins signés aux parents. Les bulletins numériques apparaîtront dans l'espace parent. Les bulletins papier seront générés en PDF.</span>
        </div>

        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <!-- Impression papier -->
          <div class="distrib-card card" style="flex: 1; min-width: 280px;">
            <div style="padding: 16px;">
              <div class="distrib-card-header">
                <Printer :size="18" />
                <span>Impression papier</span>
              </div>
              <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px;">
                Génère les bulletins PDF pour impression groupée par classe.
              </p>
              <div class="field" style="margin-bottom: 8px;">
                <label>Classe</label>
                <select v-model="massPrintClass" class="input">
                  <option value="">Classe sélectionnée</option>
                  <option v-for="c in availableClasses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div style="font-size: 12px; color: var(--text); margin-bottom: 12px;">
                <strong>{{ massPrintPaperCount }}</strong> {{ massPrintPaperCount > 1 ? 'élèves concernés' : 'élève concerné' }}
              </div>
              <button
                class="btn btn-primary btn-sm"
                :disabled="massPrinting || massPrintPaperCount === 0"
                @click="massPrintBulletins('papier')"
                style="display: inline-flex; align-items: center; gap: 6px; width: 100%;"
              >
                <Printer v-if="!massPrinting || massPrintingType !== 'papier'" :size="14" />
                <Loader2 v-else :size="14" class="spinning" />
                <span v-if="massPrinting && massPrintingType === 'papier'">{{ massPrintProgress }}</span>
                <span v-else>Imprimer les bulletins</span>
              </button>
            </div>
          </div>

          <!-- Envoi in-app -->
          <div class="distrib-card card" style="flex: 1; min-width: 280px;">
            <div style="padding: 16px;">
              <div class="distrib-card-header">
                <Send :size="18" />
                <span>Envoi dans l'application</span>
              </div>
              <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px;">
                Rend les bulletins visibles dans l'espace parent pour les familles ayant choisi le format numérique.
              </p>
              <div class="field" style="margin-bottom: 8px;">
                <label>Classe</label>
                <select v-model="massPrintClass" class="input">
                  <option value="">Classe sélectionnée</option>
                  <option v-for="c in availableClasses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div style="font-size: 12px; color: var(--text); margin-bottom: 12px;">
                <strong>{{ massPrintDigitalCount }}</strong> {{ massPrintDigitalCount > 1 ? 'élèves concernés' : 'élève concerné' }}
              </div>
              <button
                class="btn btn-outline btn-sm"
                :disabled="massPrinting || massPrintDigitalCount === 0"
                @click="distributeInAppForClass()"
                style="display: inline-flex; align-items: center; gap: 6px; width: 100%;"
              >
                <Send :size="14" />
                <span>Distribuer dans l'application</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="card empty-state-card">
      <Loader2 :size="32" class="spinning" style="color: var(--primary); margin-bottom: 12px;" />
      <p>Chargement des notes...</p>
    </div>

    <!-- Modal: Upload signature -->
    <Teleport to="body">
      <div v-if="showSignatureUpload" class="modal-overlay" @click.self="showSignatureUpload = false">
        <div class="modal-card card" style="max-width: 480px;">
          <div class="modal-header">
            <h3>Signature du directeur</h3>
            <button class="modal-close" @click="showSignatureUpload = false"><X :size="18" /></button>
          </div>
          <div class="modal-body">
            <p style="font-size: 13px; color: var(--muted); margin-bottom: 16px;">
              Importez une image de votre signature manuscrite. Signez de préférence sur une feuille blanche pour un rendu optimal sur les bulletins.
            </p>
            <div class="signature-upload-zone">
              <input type="file" accept="image/*" capture="environment" @change="handleSignatureUpload" id="sig-upload" style="display:none;" />
              <label for="sig-upload" class="signature-upload-label">
                <Upload :size="24" />
                <span>Importer une image ou prendre une photo</span>
              </label>
            </div>
            <div v-if="signaturePreview" class="signature-preview-box">
              <img :src="signaturePreview" alt="Aperçu signature" class="signature-preview-img" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showSignatureUpload = false; signaturePreview = null;">Annuler</button>
            <button class="btn btn-primary" :disabled="!signaturePreview" @click="saveDirectorSignature">
              <Save :size="16" />
              Enregistrer la signature
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Paramètres du module Notes -->
    <Teleport to="body">
      <div v-if="showNotesSettings" class="modal-overlay" @click.self="showNotesSettings = false">
        <div class="modal-card card" style="max-width: 520px;">
          <div class="modal-header">
            <h2>Paramètres Notes & Évaluations</h2>
            <button class="icon-btn" @click="showNotesSettings = false" type="button"><X :size="20" /></button>
          </div>
          <div class="modal-body">
            <div class="settings-section">
              <h3 class="settings-section-title">Type d'évaluation</h3>
              <p class="settings-hint">Choisissez comment les notes sont organisées par trimestre.</p>
              <div class="radio-group">
                <label class="radio-item" :class="{ 'radio-selected': settingsForm.evaluationType === '2_sequences' }">
                  <input type="radio" v-model="settingsForm.evaluationType" value="2_sequences" />
                  <div class="radio-content">
                    <strong>2 séquences par trimestre</strong>
                    <span>La moyenne du trimestre est la moyenne des 2 séquences.</span>
                  </div>
                </label>
                <label class="radio-item" :class="{ 'radio-selected': settingsForm.evaluationType === '1_evaluation' }">
                  <input type="radio" v-model="settingsForm.evaluationType" value="1_evaluation" />
                  <div class="radio-content">
                    <strong>1 évaluation par trimestre</strong>
                    <span>Une seule note par matière par trimestre.</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="settings-section-title">Barème de notation</h3>
              <p class="settings-hint">Note maximale pour les évaluations.</p>
              <select v-model.number="settingsForm.noteMax" class="input" style="max-width: 160px;">
                <option :value="20">Sur 20</option>
                <option :value="10">Sur 10</option>
                <option :value="100">Sur 100</option>
              </select>
            </div>

            <div class="settings-section">
              <h3 class="settings-section-title">Mentions sur le bulletin</h3>
              <p class="settings-hint">Seuils de moyenne pour les mentions automatiques.</p>
              <div class="mention-grid">
                <div class="mention-row">
                  <span class="mention-label" style="color:#D93025">Blâme</span>
                  <span class="mention-range">Moyenne &lt;</span>
                  <input type="number" v-model.number="settingsForm.mentionBlame" class="input mention-input" min="0" max="20" step="0.5" />
                </div>
                <div class="mention-row">
                  <span class="mention-label" style="color:#E8A838">Avertissement</span>
                  <span class="mention-range">&lt;</span>
                  <input type="number" v-model.number="settingsForm.mentionAvertissement" class="input mention-input" min="0" max="20" step="0.5" />
                </div>
                <div class="mention-row">
                  <span class="mention-label" style="color:#666">Aucune mention</span>
                  <span class="mention-range">&lt;</span>
                  <input type="number" v-model.number="settingsForm.mentionEncouragement" class="input mention-input" min="0" max="20" step="0.5" />
                </div>
                <div class="mention-row">
                  <span class="mention-label" style="color:#1B8A5A">Encouragements</span>
                  <span class="mention-range">&lt;</span>
                  <input type="number" v-model.number="settingsForm.mentionTableau" class="input mention-input" min="0" max="20" step="0.5" />
                </div>
                <div class="mention-row">
                  <span class="mention-label" style="color:#1B8A5A; font-weight:700">Tableau d'honneur</span>
                  <span class="mention-range">&lt;</span>
                  <input type="number" v-model.number="settingsForm.mentionFelicitations" class="input mention-input" min="0" max="20" step="0.5" />
                </div>
                <div class="mention-row">
                  <span class="mention-label" style="color:var(--pr); font-weight:700">Félicitations</span>
                  <span class="mention-range">&ge;</span>
                  <span class="mention-value">{{ settingsForm.mentionFelicitations }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showNotesSettings = false">Annuler</button>
            <button class="btn btn-primary" @click="saveNotesSettings">
              <Save :size="16" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useNotesStore, SEQUENCES, TRIMESTERS, SIGN_PERIODS, VALIDATION_STATUS, getAppreciation, getMention, getDecision } from '../stores/notes'
import { useClassesStore } from '../stores/classes'
import { useElevesStore } from '../stores/eleves'
import { usePersonnelStore, SUBJECTS_BY_CYCLE } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { useSchoolStore } from '../stores/school'
import { useAuthStore } from '../stores/auth'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import {
  FileText, AlertCircle, Pencil, BarChart3, Save, Printer, X, Loader2, CheckCircle, ShieldCheck, Lock, Unlock, Settings, CircleCheck, Send, Upload, Image, ChevronLeft, ChevronRight, Download, Sparkles, RotateCcw
} from 'lucide-vue-next'
import { useInscriptionsStore, DOCUMENT_FORMATS } from '../stores/inscriptions'
import { exportToExcel } from '../utils/exportExcel'
import { useAppreciationsStore } from '../stores/appreciations'
import { useEditionStore } from '../stores/edition'
import { noteToPalier } from '../data/primaire'

const notesStore = useNotesStore()
const appreciationsStore = useAppreciationsStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()
const personnelStore = usePersonnelStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()
const inscriptionsStore = useInscriptionsStore()
const subjectsStore = useSubjectsStore()
const edtStore = useEmploiDuTempsStore()
const editionStore = useEditionStore()

// Mode compétences (APC) : édition primaire + l'école a choisi gradingMode 'apc'.
// On garde la saisie /20 ; le bulletin AFFICHE en plus le palier A/ECA/NA.
const isApc = computed(() => editionStore.isPrimaire && schoolStore.schoolSettings?.gradingMode === 'apc')
function paletteFor(avg) { return noteToPalier(avg) }

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})
const availableClasses = computed(() => {
  if (!teacherClassIds.value) return classesStore.classes
  return classesStore.classes.filter(c => teacherClassIds.value.includes(c.id))
})

const loading = ref(true)
const selectedClass = ref('')
const selectedPeriod = ref('T1') // S1-S6, T1-T3, or 'annual'
const selectedSubject = ref('')
const selectedEleve = ref('')
const activeTab = ref('saisie') // will be overridden for directeur in onMounted

// Derive selectedTrimester from selectedPeriod for backward compatibility
const selectedTrimester = computed(() => {
  const p = selectedPeriod.value
  if (p === 'annual') return 'annual'
  if (p.startsWith('T')) return p
  // Sequence: derive trimester
  const seq = SEQUENCES.find(s => s.value === p)
  return seq?.trimester || 'T1'
})

// Editing state for note inputs
const editingNotes = ref({}) // { [eleveId]: { s1: val, s2: val } }
const savedSnapshot = ref('') // JSON snapshot for dirty check
// Brouillon de saisie des notes (auto-sauvegarde anti-coupure de courant/réseau)
const restoreNotesPrompt = ref(null)
const notesDraftKey = computed(() => {
  if (!selectedClass.value || !selectedSubject.value || !selectedPeriod.value || selectedTrimester.value === 'annual') return null
  const ns = authStore.schoolId || (authStore.isDemo ? 'demo' : 'me')
  return `mapo_notes_draft_${ns}_${selectedClass.value}_${selectedPeriod.value}_${selectedSubject.value}`
})
const showValidateAllConfirm = ref(false) // Confirmation modal for validate-all
const showValidateDirAllConfirm = ref(false)
const editingCustomMention = ref('')

// Mass print state
const massPrinting = ref(false)
const massPrintProgress = ref('')
const massPrintFormat = ref('papier') // 'papier', 'tous', 'numerique'
const massPrintClass = ref('') // filtre par classe pour impression groupee
const massPrintTrimester = ref('T1') // trimestre pour impression groupee
const massPrintingType = ref('') // 'papier' ou 'numerique' en cours

// Signing carousel state
const signingMode = ref(false)
const signingClassId = ref('')
const signingPeriod = ref('S1')
const signingCurrentIndex = ref(0)
const selectedSignPeriod = ref('S1') // period selector for validation tab

// Signature upload modal
const showSignatureUpload = ref(false)
const signaturePreview = ref(null)

// Settings modal state
const showNotesSettings = ref(false)
const settingsForm = reactive({
  evaluationType: '2_sequences',
  noteMax: 20,
  mentionBlame: 7,
  mentionAvertissement: 9,
  mentionEncouragement: 12,
  mentionTableau: 14,
  mentionFelicitations: 16,
})

function openNotesSettings() {
  const s = schoolStore.schoolSettings || {}
  settingsForm.evaluationType = s.evaluationType || '2_sequences'
  settingsForm.noteMax = s.noteMax || 20
  settingsForm.mentionBlame = s.mentionBlame ?? 7
  settingsForm.mentionAvertissement = s.mentionAvertissement ?? 9
  settingsForm.mentionEncouragement = s.mentionEncouragement ?? 12
  settingsForm.mentionTableau = s.mentionTableau ?? 14
  settingsForm.mentionFelicitations = s.mentionFelicitations ?? 16
  showNotesSettings.value = true
}

async function saveNotesSettings() {
  await schoolStore.saveSettings({
    evaluationType: settingsForm.evaluationType,
    noteMax: settingsForm.noteMax,
    mentionBlame: settingsForm.mentionBlame,
    mentionAvertissement: settingsForm.mentionAvertissement,
    mentionEncouragement: settingsForm.mentionEncouragement,
    mentionTableau: settingsForm.mentionTableau,
    mentionFelicitations: settingsForm.mentionFelicitations,
  })
  showNotesSettings.value = false
}

function exportNotes() {
  if (!selectedClass.value || !selectedPeriod.value) return

  // Build headers: Nom, Prénom, then one per subject
  const columns = [
    { key: 'firstName', label: 'Prénom', width: 18 },
    { key: 'lastName', label: 'Nom', width: 18 },
  ]

  // Add subject columns
  allClassSubjects.value.forEach(subj => {
    columns.push({
      key: `note_${subj.id}`,
      label: subj.name || subj.label,
      width: 12,
    })
  })

  // Build export data
  const exportData = classEleves.value.map(student => {
    const row = {
      firstName: student.firstName || '-',
      lastName: student.lastName || '-',
    }

    allClassSubjects.value.forEach(subj => {
      const note = notesStore.getNote(selectedClass.value, subj.id, selectedPeriod.value, student.id)
      row[`note_${subj.id}`] = note !== null && note !== undefined ? note : '-'
    })

    return row
  })

  const periodLabel = selectedPeriod.value
  const fileName = `notes_${selectedClassName.value}_${periodLabel}`
  exportToExcel(exportData, columns, fileName, 'Notes')
}

// ── Computed ──
const selectedClassObj = computed(() => classesStore.classes.find(c => c.id === selectedClass.value))
const selectedClassName = computed(() => selectedClassObj.value?.name || '')
const currentTrimester = computed(() => TRIMESTERS.find(t => t.value === selectedTrimester.value))

const isSingleEval = computed(() => schoolStore.schoolSettings?.evaluationType === '1_evaluation')

const seqNumbers = computed(() => {
  const tri = currentTrimester.value
  if (!tri) return [1, 2]
  return tri.sequences.map(s => parseInt(s.replace('S', '')))
})

// All subjects for the class level (dynamic from subjects store, fallback to hardcoded)
const allClassSubjects = computed(() => {
  if (!selectedClassObj.value) return []
  if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
    return subjectsStore.getSubjectsForClass(selectedClassObj.value)
  }
  // Fallback
  const level = selectedClassObj.value.level || ''
  const isLycee = ['2nde', '1ere', 'Tle'].includes(level)
  return isLycee ? [...SUBJECTS_BY_CYCLE.lycee] : [...SUBJECTS_BY_CYCLE.college]
})

// Subjects filtered by teacher role (enseignant sees only their subjects)
const teacherSubjects = computed(() => {
  if (isDirecteur.value || isProfPrincipal.value) return [] // no filter, see all
  const role = userRole.value
  if (role !== 'enseignant') return []
  // Find teacher in personnel store by matching user profile (name or email)
  const record = personnelStore.getTeacherStaffRecord(authStore.userProfile)
  return record?.subjects || []
})

// If enseignant, filter to only their subjects. Otherwise show all.
const classSubjects = computed(() => {
  const all = allClassSubjects.value
  if (teacherSubjects.value.length > 0) {
    return all.filter(s => teacherSubjects.value.includes(s))
  }
  return all
})

// Alias for backward compatibility and clarity
const visibleSubjects = computed(() => classSubjects.value)

// Can the current user edit this specific subject?
// Le directeur ne saisit JAMAIS de notes - seul l'enseignant de la matiere peut
function canEditSubject(subject) {
  if (isDirecteurOnly.value) return false
  if (teacherSubjects.value.length > 0) {
    return teacherSubjects.value.includes(subject)
  }
  return false
}

// Can the current user validate this subject?
function canValidateSubject(subject) {
  return canEditSubject(subject)
}

// Subject validation progress computed
const subjectValidationProgress = computed(() => {
  if (!selectedClass.value || !selectedTrimester.value || selectedTrimester.value === 'annual') {
    return { validated: 0, total: 0 }
  }
  return notesStore.getSubjectValidationProgress(selectedClass.value, selectedTrimester.value)
})

function isSubjectValidated(subject) {
  if (!selectedClass.value || !selectedTrimester.value || selectedTrimester.value === 'annual') return false
  return notesStore.getSubjectValidation(selectedClass.value, subject, selectedTrimester.value).validated
}

// Is the current user a simple teacher (not PP, not directeur)?
const isEnseignant = computed(() => userRole.value === 'enseignant' && !isProfPrincipal.value)

const classEleves = computed(() => {
  if (!selectedClassObj.value) return []
  const clsName = selectedClassObj.value.name
  return elevesStore.eleves
    .filter(e => e.className === clsName && e.status === 'inscrit')
    .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
})

const selectedEleveObj = computed(() => classEleves.value.find(e => e.id === selectedEleve.value))

// Label for selected period (used in bulletin title)
const currentPeriodLabel = computed(() => {
  const p = selectedPeriod.value
  const match = SIGN_PERIODS.find(sp => sp.value === p)
  return match?.label || p
})

// Navigation between students in bulletin tab
const currentEleveIndex = computed(() => {
  if (!selectedEleve.value) return -1
  return classEleves.value.findIndex(e => e.id === selectedEleve.value)
})

const prevEleveId = computed(() => {
  const idx = currentEleveIndex.value
  if (idx <= 0) return null
  return classEleves.value[idx - 1]?.id || null
})

const nextEleveId = computed(() => {
  const idx = currentEleveIndex.value
  if (idx < 0 || idx >= classEleves.value.length - 1) return null
  return classEleves.value[idx + 1]?.id || null
})

const isDirty = computed(() => JSON.stringify(editingNotes.value) !== savedSnapshot.value)

// ── Validation state ──
const userRole = computed(() => authStore.userProfile?.role || 'admin')
const userName = computed(() => authStore.userProfile?.displayName || 'Utilisateur')
const isDirecteur = computed(() => ['admin', 'directeur'].includes(userRole.value))
// Directeur pur (pas enseignant) - ne saisit pas de notes, ne voit pas l'onglet Saisie
const isDirecteurOnly = computed(() => {
  if (!isDirecteur.value) return false
  // Si le directeur est aussi enseignant d'une matiere, il n'est pas "directeur only"
  return teacherSubjects.value.length === 0
})
const isProfPrincipal = computed(() => {
  if (!selectedClassObj.value) return false
  // In demo mode, admin/directeur can act as PP too
  if (isDirecteur.value) return true
  // Check if user is the homeroom teacher of the selected class
  const cls = selectedClassObj.value
  return cls.homeroomTeacherId === authStore.userProfile?.uid
})

const currentValidation = computed(() => {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return { status: VALIDATION_STATUS.DRAFT, eleveValidations: {} }
  return notesStore.getValidation(selectedClass.value, selectedTrimester.value)
})

const validationStatus = computed(() => currentValidation.value.status)
const isLocked = computed(() => validationStatus.value === VALIDATION_STATUS.DIR_VALIDATED)

const ppValidatedCount = computed(() => {
  const evs = currentValidation.value.eleveValidations || {}
  return Object.values(evs).filter(v => v.pp).length
})

const dirValidatedCount = computed(() => {
  const evs = currentValidation.value.eleveValidations || {}
  return Object.values(evs).filter(v => v.dir).length
})

const pendingDirCount = computed(() => {
  let total = 0
  for (const cls of classesStore.classes) {
    const progress = notesStore.getSignatureProgress(cls.id, selectedPeriod.value)
    total += progress.total - progress.signed
  }
  return total
})

// Signing carousel computed
const signingClass = computed(() => classesStore.classes.find(c => c.id === signingClassId.value))
const signingClassName = computed(() => signingClass.value?.name || '')
const unsignedBulletins = computed(() => {
  if (!signingClassId.value || !signingPeriod.value) return []
  return notesStore.getUnsignedBulletins(signingClassId.value, signingPeriod.value)
})
const currentSigningEleve = computed(() => unsignedBulletins.value[signingCurrentIndex.value] || null)
const signingPeriodLabel = computed(() => SIGN_PERIODS.find(p => p.value === signingPeriod.value)?.label || signingPeriod.value)

// Has director signature configured?
const hasDirectorSignature = computed(() => !!schoolStore.schoolSettings?.directorSignature)

// Available sign periods (filter sequences if single eval mode)
const availableSignPeriods = computed(() => {
  if (isSingleEval.value) {
    return SIGN_PERIODS.filter(p => p.type !== 'sequence')
  }
  return SIGN_PERIODS
})

// Class signing status for moyennes tab
const classSignédCount = computed(() => {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return 0
  return notesStore.getSignatureProgress(selectedClass.value, selectedTrimester.value).signed
})

const allClassSignéd = computed(() => {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return false
  const p = notesStore.getSignatureProgress(selectedClass.value, selectedTrimester.value)
  return p.signed === p.total && p.total > 0
})

function isElevePPValidated(eleveId) {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return false
  return notesStore.getEleveValidation(selectedClass.value, selectedTrimester.value, eleveId).pp
}

function isEleveDirValidated(eleveId) {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return false
  return notesStore.getEleveValidation(selectedClass.value, selectedTrimester.value, eleveId).dir
}

function handleValidateElevePP(eleveId) {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return
  notesStore.validateElevePP(selectedClass.value, selectedTrimester.value, eleveId, userName.value)
}

function handleValidateAllPP() {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return
  const eleveIds = classEleves.value.map(e => e.id)
  notesStore.validateAllPP(selectedClass.value, selectedTrimester.value, eleveIds, userName.value)
  showValidateAllConfirm.value = false
}

function handleValidateEleveDir(eleveId) {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return
  notesStore.validateEleveDir(selectedClass.value, selectedTrimester.value, eleveId, userName.value)
}

function handleValidateAllDir() {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return
  const eleveIds = classEleves.value.map(e => e.id)
  notesStore.validateAllDir(selectedClass.value, selectedTrimester.value, eleveIds, userName.value)
  showValidateDirAllConfirm.value = false
}

function handleRevokeValidation() {
  if (!selectedClass.value || selectedTrimester.value === 'annual') return
  notesStore.revokeValidation(selectedClass.value, selectedTrimester.value)
}

// Teacher validates their own subject
function validateMySubject() {
  if (!selectedClass.value || !selectedSubject.value || !selectedTrimester.value || selectedTrimester.value === 'annual') return
  const teacherName = userName.value
  const teacherId = authStore.userProfile?.uid || null
  notesStore.validateSubject(
    selectedClass.value,
    selectedSubject.value,
    selectedTrimester.value,
    teacherName,
    teacherId
  )
}

// Teacher revokes their own subject validation
function revokeMySubject() {
  if (!selectedClass.value || !selectedSubject.value || !selectedTrimester.value || selectedTrimester.value === 'annual') return
  notesStore.revokeSubjectValidation(
    selectedClass.value,
    selectedSubject.value,
    selectedTrimester.value
  )
}

// ── Signing carousel functions ──
function enterSigningMode(classId, period) {
  // Check if signature exists
  if (!hasDirectorSignature.value) {
    showSignatureUpload.value = true
    return
  }
  signingClassId.value = classId
  signingPeriod.value = period
  signingCurrentIndex.value = 0
  signingMode.value = true
}

function exitSigningMode() {
  signingMode.value = false
  signingClassId.value = ''
  signingCurrentIndex.value = 0
}

function signCurrentBulletin() {
  if (!currentSigningEleve.value) return
  notesStore.signBulletin(signingClassId.value, signingPeriod.value, currentSigningEleve.value.id, userName.value)
  // The unsignedBulletins computed will auto-update, shifting the list
  // If no more unsigned, exit
  if (unsignedBulletins.value.length <= 1) {
    exitSigningMode()
  }
  // Index stays at 0 since the signed one is removed from the list
}

function skipSigningBulletin() {
  if (signingCurrentIndex.value < unsignedBulletins.value.length - 1) {
    signingCurrentIndex.value++
  }
}

function prevSigningBulletin() {
  if (signingCurrentIndex.value > 0) {
    signingCurrentIndex.value--
  }
}

// Signature upload
function handleSignatureUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    signaturePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

async function saveDirectorSignature() {
  if (!signaturePreview.value) return
  await schoolStore.saveSettings({ directorSignature: signaturePreview.value })
  showSignatureUpload.value = false
  signaturePreview.value = null
}

// ── Validation overview ──
function getClassValidationStatus(classId, trimester) {
  const val = notesStore.getValidation(classId, trimester)
  return val.status || VALIDATION_STATUS.DRAFT
}

function quickValidateDir(classId, trimester, cls) {
  const classElvs = elevesStore.eleves
    .filter(e => e.className === cls.name && e.status === 'inscrit')
    .map(e => e.id)
  notesStore.validateAllDir(classId, trimester, classElvs, userName.value)
}

function getCoeff(subject) {
  if (!selectedClassObj.value) return 1
  return notesStore.getSubjectCoeff(selectedClassObj.value, subject)
}

// Stats for current sequence pair
const seqStats = computed(() => {
  if (!selectedClass.value || !selectedSubject.value || !currentTrimester.value) return null
  const seqs = currentTrimester.value.sequences
  const ids = classEleves.value.map(e => e.id)
  return {
    s1: notesStore.getSequenceStats(selectedClass.value, selectedSubject.value, seqs[0], ids),
    s2: notesStore.getSequenceStats(selectedClass.value, selectedSubject.value, seqs[1], ids),
  }
})

function getTrimAvg(eleveId) {
  if (!selectedClass.value || !selectedSubject.value || !selectedTrimester.value) return null
  return notesStore.getSubjectTrimesterAvg(selectedClass.value, selectedSubject.value, selectedTrimester.value, eleveId)
}

function getSigningAvg() {
  if (!currentSigningEleve.value || !signingClassId.value) return null
  const cls = signingClass.value
  const period = signingPeriod.value
  if (!cls) return null
  // For sequences: use the sequence note averages (general avg for that sequence across subjects)
  if (period.startsWith('S')) {
    // For a sequence, compute weighted average of all subjects for that sequence
    const subjects = notesStore.getClassSubjects(cls)
    let totalWeighted = 0, totalCoeff = 0
    for (const subject of subjects) {
      const coeff = notesStore.getSubjectCoeff(cls, subject)
      if (!coeff) continue
      const note = notesStore.getNote(cls.id, subject, period, currentSigningEleve.value.id)
      if (note === null) continue
      totalWeighted += note * coeff
      totalCoeff += coeff
    }
    return totalCoeff > 0 ? Math.round((totalWeighted / totalCoeff) * 100) / 100 : null
  }
  if (period.startsWith('T')) {
    return notesStore.getGeneralTrimesterAvg(cls.id, period, currentSigningEleve.value.id, cls)
  }
  if (period === 'annual') {
    return notesStore.getGeneralAnnualAvg(cls.id, currentSigningEleve.value.id, cls)
  }
  return null
}

// ── Moyennes tab ──
const rankingRows = computed(() => {
  if (!selectedClass.value || classEleves.value.length === 0) return []
  const cls = selectedClassObj.value
  const eleveIds = classEleves.value.map(e => e.id)

  const ranking = selectedTrimester.value === 'annual'
    ? notesStore.getClassAnnualRanking(selectedClass.value, eleveIds, cls)
    : notesStore.getClassRanking(selectedClass.value, selectedTrimester.value, eleveIds, cls)

  return ranking.map(r => {
    const eleve = classEleves.value.find(e => e.id === r.eleveId)
    const subjectAvgs = {}
    for (const s of allClassSubjects.value) {
      subjectAvgs[s] = selectedTrimester.value === 'annual'
        ? notesStore.getSubjectAnnualAvg(selectedClass.value, s, r.eleveId)
        : notesStore.getSubjectTrimesterAvg(selectedClass.value, s, selectedTrimester.value, r.eleveId)
    }
    return {
      ...r,
      eleveName: eleve ? `${eleve.lastName} ${eleve.firstName}` : '?',
      subjectAvgs,
    }
  })
})

// ── Bulletin tab ──
const bulletinRows = computed(() => {
  if (!selectedEleve.value || !selectedClass.value) return []
  const cls = selectedClassObj.value
  const classIds = classEleves.value.map(e => e.id)

  return allClassSubjects.value.map(subject => {
    const coeff = getCoeff(subject)
    const tri = currentTrimester.value
    const period = selectedPeriod.value
    let mainAvg = null

    const row = { subject, coeff }

    if (period.startsWith('S')) {
      // Sequence: single note
      row.seqNote = notesStore.getNote(selectedClass.value, subject, period, selectedEleve.value)
      mainAvg = row.seqNote
    } else if (selectedTrimester.value === 'annual') {
      row.t1 = notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, 'T1', selectedEleve.value)
      row.t2 = notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, 'T2', selectedEleve.value)
      row.t3 = notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, 'T3', selectedEleve.value)
      row.annualAvg = notesStore.getSubjectAnnualAvg(selectedClass.value, subject, selectedEleve.value)
      mainAvg = row.annualAvg
    } else if (tri) {
      row.seq1 = notesStore.getNote(selectedClass.value, subject, tri.sequences[0], selectedEleve.value)
      row.seq2 = notesStore.getNote(selectedClass.value, subject, tri.sequences[1], selectedEleve.value)
      row.trimAvg = notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, selectedTrimester.value, selectedEleve.value)
      mainAvg = row.trimAvg
    }

    // Class average for this subject
    const allAvgs = classIds.map(id => {
      if (period.startsWith('S')) {
        return notesStore.getNote(selectedClass.value, subject, period, id)
      }
      return selectedTrimester.value === 'annual'
        ? notesStore.getSubjectAnnualAvg(selectedClass.value, subject, id)
        : notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, selectedTrimester.value, id)
    }).filter(v => v !== null)
    row.classAvg = allAvgs.length > 0 ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 100) / 100 : null
    row.mainAvg = mainAvg

    return row
  })
})

const bulletinGeneralAvg = computed(() => {
  if (!selectedEleve.value || !selectedClass.value) return null
  const period = selectedPeriod.value
  // Sequence: compute weighted avg of all subjects for this sequence
  if (period.startsWith('S')) {
    const cls = selectedClassObj.value
    if (!cls) return null
    let totalWeighted = 0, totalCoeff = 0
    for (const subject of allClassSubjects.value) {
      const coeff = getCoeff(subject)
      if (!coeff) continue
      const note = notesStore.getNote(selectedClass.value, subject, period, selectedEleve.value)
      if (note === null) continue
      totalWeighted += note * coeff
      totalCoeff += coeff
    }
    return totalCoeff > 0 ? Math.round((totalWeighted / totalCoeff) * 100) / 100 : null
  }
  return selectedTrimester.value === 'annual'
    ? notesStore.getGeneralAnnualAvg(selectedClass.value, selectedEleve.value, selectedClassObj.value)
    : notesStore.getGeneralTrimesterAvg(selectedClass.value, selectedTrimester.value, selectedEleve.value, selectedClassObj.value)
})

const bulletinRank = computed(() => {
  if (!selectedEleve.value || rankingRows.value.length === 0) return null
  // Recompute ranking for bulletin context
  const row = rankingRows.value.find(r => r.eleveId === selectedEleve.value)
  return row?.rank || null
})

const bulletinMention = computed(() => {
  if (bulletinGeneralAvg.value === null) return ''
  return getMention(bulletinGeneralAvg.value)
})

const bulletinDecision = computed(() => {
  if (bulletinGeneralAvg.value === null) return '-'
  return getDecision(bulletinGeneralAvg.value)
})

const bulletinCustomMention = computed(() => {
  if (!selectedEleve.value || !selectedClass.value || selectedTrimester.value === 'annual') return ''
  return notesStore.getCustomMention(selectedClass.value, selectedTrimester.value, selectedEleve.value)
})

function saveCustomMention() {
  if (!selectedEleve.value || !selectedClass.value || selectedTrimester.value === 'annual') return
  notesStore.setCustomMention(selectedClass.value, selectedTrimester.value, selectedEleve.value, editingCustomMention.value)
}

// ── Génération d'appréciation assistée par IA ──
const appreciationTon = ref('bienveillant')
const appreciationFeedback = ref('')
const appreciationFeedbackType = ref('')

// Calcule la moyenne générale d'un élève quelconque pour la période courante.
function computeGeneralAvgFor(eleveId) {
  const period = selectedPeriod.value
  if (period.startsWith('S')) {
    let tw = 0, tc = 0
    for (const subject of allClassSubjects.value) {
      const coeff = getCoeff(subject)
      if (!coeff) continue
      const note = notesStore.getNote(selectedClass.value, subject, period, eleveId)
      if (note === null) continue
      tw += note * coeff; tc += coeff
    }
    return tc > 0 ? Math.round((tw / tc) * 100) / 100 : null
  }
  return selectedTrimester.value === 'annual'
    ? notesStore.getGeneralAnnualAvg(selectedClass.value, eleveId, selectedClassObj.value)
    : notesStore.getGeneralTrimesterAvg(selectedClass.value, selectedTrimester.value, eleveId, selectedClassObj.value)
}

function computeSubjectMainAvgFor(eleveId, subject) {
  const period = selectedPeriod.value
  if (period.startsWith('S')) return notesStore.getNote(selectedClass.value, subject, period, eleveId)
  if (selectedTrimester.value === 'annual') return notesStore.getSubjectAnnualAvg(selectedClass.value, subject, eleveId)
  return notesStore.getSubjectTrimesterAvg(selectedClass.value, subject, selectedTrimester.value, eleveId)
}

// Moyenne de classe par matière (calculée une seule fois pour le lot).
function computeClassAvgs() {
  const map = {}
  for (const subject of allClassSubjects.value) {
    const vals = classEleves.value.map((e) => computeSubjectMainAvgFor(e.id, subject)).filter((v) => v !== null)
    map[subject] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null
  }
  return map
}

// Construit l'objet de données d'appréciation pour N'IMPORTE quel élève
// (réutilisé par la génération unitaire ET la génération en lot).
function buildAppreciationData(eleveId, classAvgs = null) {
  const eleve = classEleves.value.find((e) => e.id === eleveId)
  if (!eleve) return null
  const moy = computeGeneralAvgFor(eleveId)
  const rankRow = rankingRows.value.find((r) => r.eleveId === eleveId)
  const matieres = allClassSubjects.value.map((subject) => {
    const mainAvg = computeSubjectMainAvgFor(eleveId, subject)
    let classAvg
    if (classAvgs) classAvg = classAvgs[subject]
    else {
      const vals = classEleves.value.map((e) => computeSubjectMainAvgFor(e.id, subject)).filter((v) => v !== null)
      classAvg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null
    }
    return {
      nom: subject,
      moyenne: typeof mainAvg === 'number' ? mainAvg : null,
      moyenneClasse: typeof classAvg === 'number' ? classAvg : null,
    }
  })
  return {
    prenom: eleve.firstName || eleve.lastName || 'L\'élève',
    classe: selectedClassObj.value?.name || '',
    periode: currentPeriodLabel.value || '',
    moyenneGenerale: typeof moy === 'number' ? moy : null,
    rang: rankRow?.rank || null,
    effectif: classEleves.value.length || null,
    mention: typeof moy === 'number' ? getMention(moy) : '',
    matieres,
    ton: appreciationTon.value,
  }
}

async function genererAppreciation() {
  if (!selectedEleveObj.value) return
  appreciationFeedback.value = ''
  const data = buildAppreciationData(selectedEleve.value)
  if (!data) return
  const result = await appreciationsStore.generate(data)
  if (result.ok) {
    editingCustomMention.value = result.text
    if (result.mode === 'ia') {
      appreciationFeedback.value = 'Appréciation générée. Relisez et ajustez avant d\'enregistrer.'
      appreciationFeedbackType.value = 'ok'
    } else {
      appreciationFeedback.value = 'Proposition générée localement (' + result.reason + '). Relisez et ajustez.'
      appreciationFeedbackType.value = 'warn'
    }
  } else {
    appreciationFeedback.value = 'Échec de la génération.'
    appreciationFeedbackType.value = 'err'
  }
}

// ── Génération EN LOT (toute la classe) ──
const batch = reactive({ running: false, total: 0, done: 0, ia: 0, sim: 0, current: '', summary: '' })
const batchSkipExisting = ref(true)
const showBatchModal = ref(false)

const batchTargets = computed(() => {
  if (!selectedClass.value) return []
  return classEleves.value.filter((e) => {
    if (!batchSkipExisting.value) return true
    return !notesStore.getCustomMention(selectedClass.value, selectedTrimester.value, e.id)
  })
})

function openBatchModal() {
  batch.summary = ''
  showBatchModal.value = true
}

async function runBatch() {
  showBatchModal.value = false
  const targets = batchTargets.value.slice()
  if (!targets.length) return
  batch.running = true
  batch.total = targets.length
  batch.done = 0; batch.ia = 0; batch.sim = 0; batch.summary = ''
  const classAvgs = computeClassAvgs()
  let idx = 0
  const worker = async () => {
    while (idx < targets.length) {
      const e = targets[idx++]
      batch.current = `${e.lastName} ${e.firstName}`
      const data = buildAppreciationData(e.id, classAvgs)
      if (data) {
        try {
          const r = await appreciationsStore.generate(data)
          if (r.ok && r.text) {
            notesStore.setCustomMention(selectedClass.value, selectedTrimester.value, e.id, r.text)
            if (r.mode === 'ia') batch.ia++; else batch.sim++
          }
        } catch (err) { /* on continue malgré une erreur isolée */ }
      }
      batch.done++
    }
  }
  const pool = Math.min(4, targets.length)
  await Promise.all(Array.from({ length: pool }, worker))
  batch.running = false
  batch.current = ''
  batch.summary = `${batch.ia + batch.sim} appréciation(s) générée(s)` + (batch.sim ? ` (dont ${batch.sim} en local)` : '') + '. Relisez chaque bulletin avant signature.'
  if (selectedEleve.value) editingCustomMention.value = bulletinCustomMention.value
}

// ── Watchers ──
watch([selectedClass, selectedPeriod, selectedSubject], () => {
  loadEditingNotes()
})

watch(selectedClass, (newVal) => {
  selectedSubject.value = ''
  selectedEleve.value = ''
  // Synchro avec le filtre impression
  if (newVal) massPrintClass.value = newVal
})

watch(selectedPeriod, (newVal) => {
  if (newVal && !newVal.startsWith('S') && newVal !== 'annual') massPrintTrimester.value = newVal
})

watch(selectedEleve, () => {
  editingCustomMention.value = bulletinCustomMention.value
})

function loadEditingNotes() {
  if (!selectedClass.value || !selectedSubject.value || !currentTrimester.value || selectedTrimester.value === 'annual') {
    editingNotes.value = {}
    savedSnapshot.value = '{}'
    return
  }
  const tri = currentTrimester.value
  const notes = {}
  for (const eleve of classEleves.value) {
    if (isSingleEval.value) {
      notes[eleve.id] = {
        s1: notesStore.getNote(selectedClass.value, selectedSubject.value, tri.sequences[0], eleve.id) ?? '',
      }
    } else {
      notes[eleve.id] = {
        s1: notesStore.getNote(selectedClass.value, selectedSubject.value, tri.sequences[0], eleve.id) ?? '',
        s2: notesStore.getNote(selectedClass.value, selectedSubject.value, tri.sequences[1], eleve.id) ?? '',
      }
    }
  }
  editingNotes.value = notes
  savedSnapshot.value = JSON.stringify(notes)
  checkNotesDraft() // propose un brouillon non enregistré (coupure) pour cette matière/période
}

function onInput(eleveId, seq, event) {
  const val = event.target.value
  if (!editingNotes.value[eleveId]) {
    editingNotes.value[eleveId] = isSingleEval.value ? { s1: '' } : { s1: '', s2: '' }
  }
  editingNotes.value[eleveId][seq] = val === '' ? '' : val
}

async function saveNotes() {
  if (!selectedClass.value || !selectedSubject.value || !currentTrimester.value) return
  const tri = currentTrimester.value

  for (const [eleveId, vals] of Object.entries(editingNotes.value)) {
    notesStore.setNote(selectedClass.value, selectedSubject.value, tri.sequences[0], eleveId, vals.s1)
    if (!isSingleEval.value) {
      notesStore.setNote(selectedClass.value, selectedSubject.value, tri.sequences[1], eleveId, vals.s2)
    }
  }

  await notesStore.saveAllNotes()
  savedSnapshot.value = JSON.stringify(editingNotes.value)
  clearNotesDraft() // notes enregistrées → plus besoin du brouillon
}

// ── Auto-sauvegarde des notes en cours de saisie (résilience aux coupures) ──
function countFilledNotes(notes) {
  return Object.values(notes || {}).filter(v => v && ((v.s1 !== '' && v.s1 != null) || (v.s2 !== '' && v.s2 != null))).length
}
function saveNotesDraft() {
  const key = notesDraftKey.value
  if (!key || !isDirty.value) return
  try {
    localStorage.setItem(key, JSON.stringify({
      notes: editingNotes.value,
      savedAt: Date.now(),
      subject: selectedSubject.value,
    }))
  } catch { /* quota / silencieux */ }
}
function clearNotesDraft() {
  try { if (notesDraftKey.value) localStorage.removeItem(notesDraftKey.value) } catch { /* silencieux */ }
}
function checkNotesDraft() {
  restoreNotesPrompt.value = null
  const key = notesDraftKey.value
  if (!key) return
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const d = JSON.parse(raw)
    // Vide, périmé (> 2 j) ou identique aux notes déjà enregistrées : on purge sans proposer
    if (!d || !d.notes || (d.savedAt && Date.now() - d.savedAt > 2 * 24 * 3600 * 1000) ||
        JSON.stringify(d.notes) === savedSnapshot.value) {
      localStorage.removeItem(key)
      return
    }
    const count = countFilledNotes(d.notes)
    if (!count) { localStorage.removeItem(key); return }
    restoreNotesPrompt.value = { count, savedAt: d.savedAt, data: d }
  } catch { /* silencieux */ }
}
function restoreNotesDraft() {
  const d = restoreNotesPrompt.value?.data
  if (!d || !d.notes) return
  editingNotes.value = JSON.parse(JSON.stringify(d.notes))
  restoreNotesPrompt.value = null
}
function discardNotesDraft() {
  clearNotesDraft()
  restoreNotesPrompt.value = null
}
function draftAge(ts) {
  if (!ts) return ''
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `il y a ${h} h`
  return new Date(ts).toLocaleDateString('fr-FR')
}
// Sauvegarde en continu tant que la saisie n'est pas enregistrée
watch(editingNotes, () => { if (isDirty.value) saveNotesDraft() }, { deep: true })

// ── Helpers ──
function getAppreciationText(avg) { return getAppreciation(avg) }
function getDecisionText(avg) { return getDecision(avg) }

function getAppreciationClass(avg) {
  if (avg >= 16) return 'appr-excellent'
  if (avg >= 14) return 'appr-tres-bien'
  if (avg >= 12) return 'appr-bien'
  if (avg >= 10) return 'appr-assez-bien'
  if (avg >= 8) return 'appr-passable'
  return 'appr-insuffisant'
}

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function signSingleBulletin() {
  if (!selectedEleve.value || !selectedClass.value) return
  if (!hasDirectorSignature.value) {
    showSignatureUpload.value = true
    return
  }
  notesStore.signBulletin(selectedClass.value, selectedPeriod.value, selectedEleve.value, userName.value)
}

function printBulletin() {
  document.body.classList.add('printing-bulletin')
  window.print()
  document.body.classList.remove('printing-bulletin')
}

// Computed: classe et eleves pour impression groupee
const massPrintClassObj = computed(() => {
  const cid = massPrintClass.value || selectedClass.value
  return classesStore.classes.find(c => c.id === cid)
})

const massPrintClassEleves = computed(() => {
  if (!massPrintClassObj.value) return []
  return elevesStore.eleves
    .filter(e => e.className === massPrintClassObj.value.name && e.status === 'inscrit')
    .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
})

function getElevesByFormat(format) {
  return massPrintClassEleves.value.filter(eleve => {
    const dossier = inscriptionsStore.getDossierForEleve(eleve.id, elevesStore)
    const docFormat = dossier?.documentFormat || 'papier'
    if (format === 'papier') return docFormat === 'papier' || docFormat === 'les_deux'
    if (format === 'numerique') return docFormat === 'numerique' || docFormat === 'les_deux'
    return true
  })
}

const massPrintPaperCount = computed(() => getElevesByFormat('papier').length)
const massPrintDigitalCount = computed(() => getElevesByFormat('numerique').length)

async function distributeInApp(classId, period) {
  const cls = classesStore.classes.find(c => c.id === classId)
  if (!cls) return
  const eleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
  for (const eleve of eleves) {
    if (notesStore.isBulletinSigned(classId, period, eleve.id) && !notesStore.isBulletinDistributed(classId, period, eleve.id)) {
      const dossier = inscriptionsStore.getDossierForEleve(eleve.id, elevesStore)
      const docFormat = dossier?.documentFormat || 'papier'
      if (docFormat === 'numerique' || docFormat === 'les_deux') {
        notesStore.distributeBulletin(classId, period, eleve.id, 'numerique')
      }
    }
  }
}

function distributeInAppForClass() {
  if (massPrintClass.value) {
    distributeInApp(massPrintClass.value, selectedPeriod.value)
  } else {
    for (const cls of classesStore.classes) {
      distributeInApp(cls.id, selectedPeriod.value)
    }
  }
}

async function massSendDigitalBulletins() {
  // Pour l'instant, genere les PDF et les telecharge (en attendant l'integration email)
  alert('Fonctionnalite en cours de developpement.\n\nLes bulletins numeriques seront envoyes par email aux parents.\nPour l\'instant, les bulletins PDF sont telecharges pour envoi manuel.')
  await massPrintBulletins('numerique')
}

async function massPrintBulletins(format = 'papier') {
  const cls = massPrintClassObj.value
  const trimester = massPrintTrimester.value || selectedTrimester.value
  if (!cls || !trimester) return
  massPrinting.value = true
  massPrintingType.value = format

  try {
    const { generateBulletinPDF } = await import('../utils/pdfBulletin')
    const allClassEleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')

    // Filter by document format
    const targetEleves = getElevesByFormat(format)

    if (targetEleves.length === 0) {
      massPrinting.value = false
      massPrintingType.value = ''
      return
    }

    const triLabel = TRIMESTERS.find(t => t.value === trimester)?.label || trimester
    const seqValues = TRIMESTERS.find(t => t.value === trimester)?.sequences || []
    const subjects = notesStore.getClassSubjects(cls)
    const allEleveIds = allClassEleves.map(e => e.id)
    const ranking = notesStore.getClassRanking(cls.id, trimester, allEleveIds, cls)
    const school = schoolStore.schoolSettings || {}
    const validation = notesStore.getValidation(cls.id, trimester)

    const seqObjects = seqValues.map(s => {
      const seqDef = SEQUENCES.find(sq => sq.value === s)
      return { value: s, shortLabel: seqDef ? seqDef.label.replace('Séquence ', 'Seq. ') : s }
    })

    for (let i = 0; i < targetEleves.length; i++) {
      const eleve = targetEleves[i]
      massPrintProgress.value = `${i + 1}/${targetEleves.length}`

      const grades = subjects.map(subject => {
        const coeff = notesStore.getSubjectCoeff(cls, subject)
        if (!coeff) return null
        const seqNotes = {}
        for (const seq of seqValues) {
          seqNotes[seq] = notesStore.getNote(cls.id, subject, seq, eleve.id)
        }
        const avg = notesStore.getSubjectTrimesterAvg(cls.id, subject, trimester, eleve.id)
        const classAvgs = allClassEleves.map(e => notesStore.getSubjectTrimesterAvg(cls.id, subject, trimester, e.id)).filter(n => n !== null)
        const classAvg = classAvgs.length > 0 ? Math.round((classAvgs.reduce((a, b) => a + b, 0) / classAvgs.length) * 100) / 100 : null
        return { subject, coef: coeff, seqNotes, avg, classAvg, appreciation: avg !== null ? getAppreciation(avg) : '' }
      }).filter(Boolean)

      const generalAvg = notesStore.getGeneralTrimesterAvg(cls.id, trimester, eleve.id, cls)
      const rankEntry = ranking.find(r => r.eleveId === eleve.id)
      const rankStr = rankEntry?.rank ? `${rankEntry.rank} / ${classEleves.length}` : null

      const doc = generateBulletinPDF({
        school: {
          schoolName: school.schoolName || '',
          quartier: school.address || '',
          city: school.city || '',
          phone: school.phone || '',
          email: school.email || '',
          academicYear: school.academicYear || '',
          logoUrl: school.logo || null,
        },
        child: {
          lastName: eleve.lastName,
          firstName: eleve.firstName,
          matricule: eleve.matricule || '',
          className: cls.name,
        },
        periodLabel: triLabel,
        grades,
        sequences: seqObjects,
        generalAvg,
        generalAppreciation: generalAvg !== null ? getAppreciation(generalAvg) : '',
        rank: rankStr,
        mention: generalAvg !== null ? getMention(generalAvg) : '',
        effectif: allClassEleves.length,
        directeurName: validation.dirValidatedBy || school.directorName || '',
        profPrincipalName: '',
        directeurDate: validation.dirValidatedAt ? new Date(validation.dirValidatedAt).toLocaleDateString('fr-FR') : '',
        profPrincipalDate: '',
        directeurSignature: school.directorSignature || null,
      })

      doc.save(`Bulletin_${eleve.lastName}_${eleve.firstName}_${trimester}.pdf`)

      // Small delay between downloads to avoid overwhelming the browser
      if (i < targetEleves.length - 1) {
        await new Promise(r => setTimeout(r, 300))
      }
    }

    massPrinting.value = false
    massPrintProgress.value = ''
    massPrintingType.value = ''
  } catch (err) {
    console.error('Erreur impression en masse:', err)
    massPrinting.value = false
    massPrintingType.value = ''
  }
}

// ── Lifecycle ──
onMounted(async () => {
  loading.value = true
  await classesStore.loadClasses()
  await personnelStore.loadStaff()
  await elevesStore.loadEleves()
  await subjectsStore.loadSubjects()
  await notesStore.loadNotes()
  await inscriptionsStore.loadDossiers()
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
  loading.value = false
  // Directeur pur -> onglet Bulletin par defaut (il ne saisit pas de notes)
  if (isDirecteurOnly.value) {
    activeTab.value = 'bulletin'
  }
})
</script>

<style scoped>
.notes-page { max-width: 1200px; margin: 0 auto; }

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 700; margin: 0; }
.page-header p { font-size: 14px; color: var(--muted); margin: 4px 0 0; }

/* Onboarding */
.onboarding-card { padding: 40px; text-align: center; max-width: 640px; margin: 0 auto; }
.onboarding-icon { color: var(--primary, var(--pr)); margin-bottom: 16px; }
.onboarding-card h2 { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
.onboarding-desc { color: var(--muted); font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
.onboarding-steps { text-align: left; display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
.onboarding-step { display: flex; gap: 14px; align-items: flex-start; }
.step-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--primary, var(--pr)); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.onboarding-step strong { font-size: 14px; display: block; margin-bottom: 2px; }
.onboarding-step p { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.5; }
.onboarding-warning {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: #fef3c7; border-radius: 8px;
  color: #92400e; font-size: 13px; margin-top: 16px;
}

/* Toolbar */
.toolbar { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding: 16px; }
.toolbar-spacer { flex: 1; }

.tab-bar { display: flex; gap: 4px; background: #f1f5f9; border-radius: 8px; padding: 3px; }
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 13px; font-weight: 500;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; color: var(--muted); transition: all 0.15s;
}
.tab-btn.active { background: #fff; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.1); }

.info-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 10px; color: #1e40af; font-size: 13px;
}

.info-tip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #e2e8f0; color: #64748b; font-size: 10px;
  font-weight: 700; cursor: help; margin-left: 4px;
}

.mini-stats { font-size: 12px; color: var(--muted); display: flex; gap: 16px; }
.mini-stats strong { color: var(--text); }

.empty-state-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 24px; text-align: center;
}

/* Cards */
.card-header { padding: 14px 16px; border-bottom: 1px solid var(--border, #e2e8f0); }
.card-header h3 { font-size: 15px; font-weight: 600; margin: 0; }

.mass-print-section {
  border: 1.5px dashed var(--card-border, #e2e8f0);
}

.mass-print-section .card-header {
  background: rgba(var(--pr-rgb), 0.04);
}

.mass-print-section .section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary, var(--pr));
}

.mass-print-section .card-body {
  padding: 16px;
}

.distrib-card {
  flex: 1;
  min-width: 220px;
  max-width: 320px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  padding: 16px;
  background: var(--card-bg, #fff);
}

.distrib-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }

.unsaved-badge { font-size: 12px; color: #E8A838; font-weight: 500; }

/* Brouillon de notes récupéré (auto-sauvegarde anti-coupure) */
.draft-restore-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: rgba(232, 168, 56, 0.10);
  border: 1px solid rgba(232, 168, 56, 0.30);
}
.draft-restore-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text, #1A1D1F);
  line-height: 1.45;
}
.draft-restore-text svg { color: #E8A838; flex-shrink: 0; }
.draft-restore-actions { display: flex; gap: 8px; flex-shrink: 0; }
@media (max-width: 768px) {
  .draft-restore-bar { flex-direction: column; align-items: stretch; }
  .draft-restore-actions { width: 100%; }
  .draft-restore-actions .btn { flex: 1; }
}

/* Notes table */
.notes-table-wrap { overflow-x: auto; }
.notes-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.notes-table th {
  text-align: left; padding: 10px 12px; font-size: 11px;
  font-weight: 600; text-transform: uppercase; color: var(--muted);
  border-bottom: 2px solid var(--border, #e2e8f0); white-space: nowrap;
}
.notes-table td { padding: 8px 12px; border-bottom: 1px solid var(--border, #e2e8f0); }
.notes-table tbody tr:hover { background: #f8fafc; }

.col-rank { width: 40px; text-align: center; }
.col-name { min-width: 180px; font-weight: 500; }
.col-note { width: 90px; }
.col-avg { width: 90px; text-align: center; }
.col-subject-avg { width: 70px; text-align: center; font-size: 12px; }
.col-general-avg { width: 90px; text-align: center; }
.col-appreciation { width: 110px; }
.col-decision { width: 140px; }

.subject-header-vertical {
  writing-mode: vertical-rl; text-orientation: mixed;
  transform: rotate(180deg); max-height: 90px;
  overflow: hidden; text-overflow: ellipsis;
}

.note-input {
  width: 65px; padding: 5px 6px;
  border: 1px solid var(--border, #e2e8f0); border-radius: 6px;
  font-size: 14px; font-weight: 600; text-align: center;
  outline: none; transition: border-color 0.15s;
}
.note-input:focus { border-color: var(--primary, var(--pr)); box-shadow: 0 0 0 2px rgba(var(--pr-rgb), 0.15); }
.note-input.note-fail { color: var(--danger, #D93025); }

.note-cell-fail { color: var(--danger, #D93025); }
.note-cell-success { color: var(--success, #1B8A5A); }
.row-fail { background: #fef2f2; }

.appreciation-tag, .appreciation-tag-sm {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
}
.appreciation-tag-sm { font-size: 10px; padding: 1px 6px; }
/* Palier APC (primaire, mode compétences) */
.apc-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.apc-A { background: rgba(27,138,90,.12); color: #1B8A5A; }
.apc-ECA { background: rgba(232,149,10,.14); color: #B87A00; }
.apc-NA { background: rgba(217,48,37,.10); color: #D93025; }
.appr-excellent { background: #dcfce7; color: #166534; }
.appr-tres-bien { background: #d1fae5; color: #065f46; }
.appr-bien { background: #dbeafe; color: #1e40af; }
.appr-assez-bien { background: #e0f2fe; color: #075985; }
.appr-passable { background: #fef3c7; color: #92400e; }
.appr-insuffisant { background: #fee2e2; color: #991b1b; }

.decision-tag { font-size: 11px; font-weight: 600; }
.decision-pass { color: #166534; }
.decision-fail { color: #991b1b; }

.rank-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: #f1f5f9; font-weight: 700; font-size: 12px;
}
.rank-top { background: #fef3c7; color: #92400e; }

/* ═══ Validation ═══ */
.validation-banner {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; padding: 12px 18px; border-radius: 10px; flex-wrap: wrap;
}
.validation-banner-left { display: flex; align-items: center; gap: 10px; }
.validation-banner-left strong { display: block; font-size: 14px; }
.validation-meta { display: block; font-size: 12px; color: inherit; opacity: 0.7; }
.validation-banner-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.validation-draft { background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; }
.validation-pp_validated { background: #fef3c7; border: 1px solid #fbbf24; color: #92400e; }
.validation-dir_validated { background: #dcfce7; border: 1px solid #86efac; color: #166534; }

.validation-counts { display: flex; gap: 8px; }
.validation-count {
  font-size: 11px; font-weight: 600; padding: 3px 10px;
  border-radius: 12px; background: #f1f5f9; color: var(--muted);
}
.validation-count.count-done { background: #dcfce7; color: #166534; }

.col-validation { width: 100px; text-align: center; }
.validation-cell { display: flex; gap: 4px; justify-content: center; align-items: center; }

.valid-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 20px; border-radius: 4px; font-size: 9px; font-weight: 700;
}
.valid-pp { background: #dcfce7; color: #166534; }
.valid-dir { background: #dbeafe; color: #1e40af; }

.btn-validate {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 20px; border-radius: 4px; font-size: 9px; font-weight: 700;
  border: 1px dashed; cursor: pointer; transition: all 0.15s;
}
.btn-validate-pp { border-color: #86efac; color: #166534; background: transparent; }
.btn-validate-pp:hover { background: #dcfce7; }
.btn-validate-dir { border-color: #93c5fd; color: #1e40af; background: transparent; }
.btn-validate-dir:hover { background: #dbeafe; }

.row-validated { background: #f0fdf4 !important; }

.tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: var(--danger, #D93025); color: #fff;
  font-size: 10px; font-weight: 700; padding: 0 5px;
  margin-left: 4px;
}

/* Validation overview table */
.validation-overview-table td { vertical-align: middle; }
.validation-overview-cell { text-align: center; padding: 8px !important; }
.validation-overview-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;
}
.vo-draft { background: #f1f5f9; color: #64748b; }
.vo-pp_validated { background: #fef3c7; color: #92400e; }
.vo-dir_validated { background: #dcfce7; color: #166534; }

.btn-xs {
  padding: 3px 10px !important; font-size: 11px !important;
  border-radius: 6px !important;
}

.pending-dir-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; background: #eff6ff; border: 1px solid #93c5fd;
  border-radius: 10px; color: #1e40af; font-size: 13px;
}

.validation-badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(52, 168, 83, 0.1);
  color: var(--success, #34A853);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.subject-validation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subject-validation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--input-bg);
  border-radius: 8px;
  font-size: 13px;
}

.subject-validation-row.validated {
  border-left: 3px solid var(--success, #34A853);
}

.subject-validation-row.pending {
  border-left: 3px solid var(--tx3);
  opacity: 0.7;
}

.validation-progress-bar {
  height: 6px;
  background: var(--input-bg);
  border-radius: 3px;
  overflow: hidden;
  margin: 12px 0;
}

.validation-progress-fill {
  height: 100%;
  background: var(--success, #34A853);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.btn-success { background: #16a34a; color: #fff; border: none; }
.btn-success:hover { background: #15803d; }

/* ═══ Bulletin ═══ */
.bulletin-card { padding: 32px; }
.bulletin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--text); }
.bulletin-school { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.bulletin-school strong { font-size: 16px; }
.bulletin-title { text-align: right; }
.bulletin-title h2 { font-size: 18px; margin: 0; letter-spacing: 1px; }
.bulletin-title span { font-size: 13px; color: var(--muted); }

.bulletin-student-info {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px 24px; margin-bottom: 20px;
  padding: 12px 16px; background: #f8fafc; border-radius: 8px;
  font-size: 13px;
}

.bulletin-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
.bulletin-table th {
  padding: 8px 10px; text-align: center; font-size: 11px;
  font-weight: 600; background: #f1f5f9;
  border: 1px solid var(--border, #e2e8f0);
}
.bulletin-table th:first-child { text-align: left; }
.bulletin-table td {
  padding: 6px 10px; text-align: center;
  border: 1px solid var(--border, #e2e8f0);
}
.bulletin-subject { text-align: left !important; font-weight: 500; }
.bulletin-coeff { font-weight: 600; color: var(--muted); }
.bulletin-avg { font-weight: 700; }
.bulletin-total-row { background: #f8fafc; }
.bulletin-total-row td { padding: 10px; }

.bulletin-footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px; }
.bulletin-summary { font-size: 14px; display: flex; flex-direction: column; gap: 6px; }
.bulletin-signatures { display: flex; gap: 32px; }
.signature-block { text-align: center; min-width: 180px; }
.signature-block p { font-size: 13px; font-weight: 600; margin: 0 0 12px; }
.signature-line { border-bottom: 1px solid var(--text); width: 180px; margin-top: 40px; }
.signature-validated {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  font-size: 11px; font-weight: 600; color: #166534;
  padding: 4px 10px; background: #dcfce7; border-radius: 6px; margin-bottom: 4px;
}
.signature-validated-dir { color: #1e40af; background: #dbeafe; }
.custom-mention {
  margin-top: 6px; padding: 8px 12px;
  background: #f8fafc; border-radius: 6px;
  font-size: 13px; font-style: italic; color: #475569;
}

/* ── Génération d'appréciation IA ── */
.ai-appreciation-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;
}
.btn-ai {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, var(--pr), color-mix(in srgb, var(--pr) 70%, #7c3aed));
  color: #fff; border: none; font-weight: 600;
}
.btn-ai:hover:not(:disabled) { filter: brightness(1.05); }
.btn-ai:disabled { opacity: .55; cursor: not-allowed; }
.ai-spin { animation: ai-spin 0.8s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }
.ai-ton { display: inline-flex; align-items: center; gap: 6px; }
.ai-ton-label { font-size: 12px; font-weight: 600; color: var(--muted); }
.ai-ton-select { width: auto !important; padding: 6px 10px !important; font-size: 13px !important; }
.ai-feedback { font-size: 12.5px; border-radius: 8px; padding: 8px 11px; margin: 0 0 10px; }
.ai-feedback.ok { background: rgba(27,138,90,.12); color: var(--success, #1b8a5a); }
.ai-feedback.warn { background: rgba(214,158,46,.14); color: #9a6b00; }
.ai-feedback.err { background: rgba(192,57,43,.12); color: var(--danger, #c0392b); }

/* ── Génération en lot ── */
.batch-bar { height: 8px; background: rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; }
.batch-bar-fill { height: 100%; background: linear-gradient(90deg, var(--pr), color-mix(in srgb, var(--pr) 70%, #7c3aed)); border-radius: 4px; transition: width .3s ease; }
.batch-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.batch-modal { background: #fff; border-radius: 16px; padding: 22px; width: 460px; max-width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.28); }
.batch-modal-title { font-size: 18px; font-weight: 700; color: var(--text, #1a1a1a); margin: 0 0 10px; }
.batch-modal-text { font-size: 14px; color: var(--muted, #555); line-height: 1.55; margin: 0 0 14px; }
.batch-modal-text strong { color: var(--text, #1a1a1a); }
.batch-check { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted, #555); margin-bottom: 12px; cursor: pointer; }
.batch-check input { width: 16px; height: 16px; cursor: pointer; }
.batch-modal-note { font-size: 12px; color: var(--muted, #888); line-height: 1.5; margin: 0 0 18px; opacity: .85; }
.batch-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

.signature-name { display: block; font-size: 12px; font-weight: 600; }
.signature-date { display: block; font-size: 10px; color: var(--muted); }
.signature-image { max-width: 160px; max-height: 60px; object-fit: contain; margin-bottom: 4px; }

/* Bulletin navigation */
.bulletin-nav {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 12px 16px; background: var(--card-bg, #fff);
  border-radius: 10px; border: 1px solid var(--border, #e2e8f0);
}
.bulletin-nav-info { font-size: 13px; font-weight: 600; color: var(--muted); min-width: 60px; text-align: center; }

/* Signing button pulse */
.signing-btn { font-size: 15px; padding: 12px 24px; font-weight: 600; }

/* Modal close button (view-specific) */
.modal-close { background: none; border: none; cursor: pointer; color: var(--tx2); }

/* Spinner */
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Print — handled in global style block below */

@media (max-width: 768px) {
  /* Toolbar stacks vertically */
  .toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
  .toolbar .field { margin-bottom: 0; min-width: 100%; }
  .toolbar .field select { width: 100%; }
  .toolbar-spacer { display: none; }

  /* Tab bar centered */
  .tab-bar { justify-content: center; overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* Bulletin on mobile */
  .bulletin-header { flex-direction: column; gap: 12px; }
  .bulletin-title { text-align: left; }
  .bulletin-student-info { grid-template-columns: 1fr; font-size: 12px; padding: 10px 12px; }
  .bulletin-table { font-size: 11px; margin-bottom: 12px; }
  .bulletin-table th { padding: 6px 8px; font-size: 10px; }
  .bulletin-table td { padding: 5px 8px; }
  .bulletin-card { padding: 16px; }
  .bulletin-footer { flex-direction: column; gap: 16px; align-items: flex-start; }
  .bulletin-signatures { flex-direction: column; gap: 16px; width: 100%; }
  .signature-block { min-width: 100%; width: 100%; }
  .signature-line { width: 100%; }

  /* Hide bulk actions, simplify form inputs */
  .bulk-actions { display: none; }
  .validation-banner { flex-direction: column; gap: 12px; }
  .validation-banner-actions { width: 100%; }
  .validation-banner-actions .btn { width: 100%; }

  /* Grade entry table scrolls horizontally */
  .notes-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .notes-table { font-size: 12px; }

  /* Hide non-essential columns on mobile - show: student, subject, grades only */
  .col-coeff { display: none; }
  .col-pp-avg { display: none; }
  .col-validation { display: none; }
  .col-rank { display: none; }

  /* Mobile banner for grade entry */
  .notes-page::before {
    content: "Pour la saisie des notes, utilisez un écran plus large";
    display: block;
    padding: 12px 16px;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    color: #92400e;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  /* Touch-friendly form inputs */
  .input, .field input, .field select { font-size: 16px; padding: 12px; height: auto; min-height: 44px; }

  /* Pending validation banner stays visible */
  .pending-dir-banner { margin-bottom: 12px; font-size: 12px; padding: 10px 12px; }

  /* Validation overview on mobile */
  .validation-overview-table { font-size: 11px; }
  .validation-overview-cell { padding: 6px !important; }
}

/* Settings modal */
.settings-section { margin-bottom: 20px; }
.settings-section-title { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
.settings-hint { font-size: 13px; color: var(--muted); margin: 0 0 10px; }
.radio-group { display: flex; flex-direction: column; gap: 8px; }
.radio-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 8px; border: 1px solid var(--bd, #e5e7eb);
  cursor: pointer; transition: all .15s;
}
.radio-item:hover { border-color: var(--pr); }
.radio-selected { border-color: var(--pr); background: rgba(var(--pr-rgb),.04); }
.radio-item input[type="radio"] { margin-top: 3px; }
.radio-content { display: flex; flex-direction: column; gap: 2px; }
.radio-content strong { font-size: 14px; }
.radio-content span { font-size: 12px; color: var(--muted); }
.mention-grid { display: flex; flex-direction: column; gap: 6px; }
.mention-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.mention-label { width: 130px; font-weight: 600; }
.mention-range { width: 70px; color: var(--muted); text-align: right; }
.mention-input { width: 70px !important; text-align: center; padding: 4px 8px !important; font-size: 13px !important; }
.mention-value { font-weight: 600; width: 70px; text-align: center; }

/* Period selector */
.period-selector {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.period-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text);
}
.period-btn:hover { background: #f1f5f9; }
.period-btn.active { background: var(--primary, var(--pr)); color: #fff; border-color: var(--primary, var(--pr)); }
.period-btn.active.period-trimester { background: #1B8A5A; border-color: #1B8A5A; }
.period-btn.active.period-annual { background: #7c3aed; border-color: #7c3aed; }

/* Classes grid */
.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.class-sign-card {
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--border, #e2e8f0);
}
.class-sign-card:hover { border-color: var(--primary, var(--pr)); box-shadow: 0 2px 8px rgba(var(--pr-rgb), 0.1); }
.class-sign-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.class-sign-header h4 { font-size: 15px; font-weight: 600; margin: 0; }
.class-level-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: var(--muted); }
.class-sign-stats { display: flex; justify-content: space-between; align-items: center; }
.sign-count { font-size: 13px; font-weight: 600; }
.sign-done-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #166534; font-weight: 500; }
.sign-remaining-tag { font-size: 11px; color: var(--muted); }

/* Signing carousel */
.signing-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.signing-header h3 { font-size: 16px; font-weight: 600; margin: 0; flex: 1; }
.signing-counter { font-size: 13px; color: var(--muted); font-weight: 500; }
.signing-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 10px;
  margin: 16px 24px;
}
.signing-avg-display { text-align: center; }
.signing-avg-label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.signing-avg-value { font-size: 28px; font-weight: 700; }
.signing-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px;
}
.signing-btn {
  padding: 12px 32px !important;
  font-size: 15px !important;
  font-weight: 600;
}

/* Signature upload */
.signature-upload-zone {
  margin-bottom: 16px;
}
.signature-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed var(--border, #e2e8f0);
  border-radius: 10px;
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
  transition: all 0.15s;
}
.signature-upload-label:hover { border-color: var(--primary, var(--pr)); color: var(--primary, var(--pr)); }
.signature-preview-box {
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}
.signature-preview-img {
  max-width: 200px;
  max-height: 100px;
  object-fit: contain;
}
.signature-image {
  max-width: 120px;
  max-height: 60px;
  object-fit: contain;
  margin-bottom: 4px;
}

.btn-lg {
  padding: 10px 24px;
  font-size: 15px;
}

/* Distribution cards */
.distrib-card {
  flex: 1;
  min-width: 260px;
  padding: 16px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  background: #fff;
}
.distrib-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
}
</style>

<!-- Print styles must be global (not scoped) to target body and sidebar -->
<style>
@media print {
  body.printing-bulletin * {
    visibility: hidden !important;
  }
  body.printing-bulletin #bulletin-print,
  body.printing-bulletin #bulletin-print * {
    visibility: visible !important;
  }
  body.printing-bulletin #bulletin-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
    box-shadow: none !important;
    border: none !important;
  }
  body.printing-bulletin .signature-validated svg,
  body.printing-bulletin .signature-validated-dir svg {
    visibility: visible !important;
  }
}
</style>
