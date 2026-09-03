<template>
  <div class="edt-page">
    <!-- WIZARD MODE -->
    <template v-if="edtStore.setupStep < 5">
      <!-- Progress bar -->
      <div class="progress-container">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-steps">
          <div
            v-for="step in 4"
            :key="step"
            class="progress-step"
            :class="{ 'step-active': edtStore.setupStep >= step, 'step-current': edtStore.setupStep === step }"
          >
            {{ step }}
          </div>
        </div>
      </div>

      <!-- Page header -->
      <div class="page-header">
        <div class="page-header-text">
          <h1>{{ t('edt.setupTitle') }}</h1>
          <p>{{ stepTitles[edtStore.setupStep - 1] }}</p>
        </div>
      </div>

      <!-- Info banner -->
      <div class="info-banner">
        <AlertCircle :size="18" />
        <span>{{ stepHints[edtStore.setupStep - 1] }}</span>
      </div>

      <!-- Step 1: Grille horaire -->
      <template v-if="edtStore.setupStep === 1">
        <div class="wizard-grid">
          <div class="wizard-col">
            <div class="card">
              <div class="card-header">
                <h3>{{ t('edt.schoolDays') }}</h3>
              </div>
              <div class="card-body">
                <div class="day-checkboxes">
                  <label v-for="day in DAYS" :key="day.value" class="checkbox-label">
                    <input
                      type="checkbox"
                      :checked="timeGridForm.days.includes(day.value)"
                      @change="toggleDay(day.value)"
                    />
                    <span>{{ dayLabel(day.value) }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3>{{ t('edt.hours') }}</h3>
              </div>
              <div class="card-body">
                <div class="field">
                  <label>{{ t('edt.startTime') }}</label>
                  <input v-model="timeGridForm.startTime" type="time" class="input" />
                </div>
                <div class="field">
                  <label>{{ t('edt.endTime') }}</label>
                  <input v-model="timeGridForm.endTime" type="time" class="input" />
                </div>
                <div class="field">
                  <label>{{ t('edt.slotDuration') }}</label>
                  <select v-model.number="timeGridForm.slotDuration" class="input">
                    <option value="45">45 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="55">55 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3>{{ t('edt.breaksTitle') }}</h3>
              </div>
              <div class="card-body">
                <div v-if="timeGridForm.breaks.length > 0" class="breaks-list">
                  <div v-for="(brk, idx) in timeGridForm.breaks" :key="idx" class="break-item-editable">
                    <input v-model="brk.label" class="input input-sm break-edit-label" :placeholder="t('edt.nameShort')" />
                    <input v-model="brk.start" type="time" class="input input-sm break-edit-time" />
                    <span class="break-edit-sep">-</span>
                    <input v-model="brk.end" type="time" class="input input-sm break-edit-time" />
                    <button class="icon-btn icon-btn-sm" @click="removeBreak(idx)" type="button">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </div>
                <button class="btn btn-sm btn-outline" @click="showAddBreakModal = true" type="button">
                  <Plus :size="16" />
                  <span>{{ t('edt.addBreak') }}</span>
                </button>
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <h3>{{ t('edt.hoursByLevel') }}</h3>
              </div>
              <div class="card-body">
                <p style="font-size: 13px; color: var(--tx3); margin: 0 0 12px 0;">
                  {{ t('edt.levelHoursHint') }}
                </p>
                <div class="level-overrides-list">
                  <div v-for="lvl in availableLevelsForOverride" :key="lvl" class="level-override-item">
                    <div class="level-override-name">{{ lvl }}</div>
                    <div class="level-override-config">
                      <label class="checkbox-label checkbox-compact">
                        <input
                          type="checkbox"
                          :checked="hasLevelOverride(lvl, 'samedi')"
                          @change="toggleLevelDay(lvl, 'samedi', $event.target.checked)"
                        />
                        <span>{{ dayLabel('samedi') }}</span>
                      </label>
                      <div v-if="levelOverrideEndTime[lvl]" class="level-override-time">
                        <label style="font-size: 12px; margin-right: 6px;">{{ t('edt.endColon') }}</label>
                        <input
                          type="time"
                          :value="levelOverrideEndTime[lvl]"
                          @change="setLevelEndTime(lvl, $event.target.value)"
                          class="input input-sm"
                          style="width: 100px;"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="wizard-col">
            <div class="card">
              <div class="card-header">
                <h3>{{ t('edt.slotsPreview') }}</h3>
              </div>
              <div class="card-body">
                <div class="preview-slots">
                  <div v-if="previewSlots.length === 0" class="preview-empty">
                    <p>{{ t('edt.noValidSlot') }}</p>
                  </div>
                  <template v-else>
                    <div
                      v-for="(slot, idx) in previewSlots"
                      :key="idx"
                      :class="slot.isBreak ? 'preview-break' : 'preview-slot preview-slot-clickable'"
                      @click="!slot.isBreak && openSlotTimeEditor(slot)"
                    >
                      <template v-if="slot.isBreak">
                        <span class="preview-break-icon">~</span>
                        <span>{{ slot.label }}</span>
                      </template>
                      <template v-else>
                        <span class="preview-slot-num">{{ slot.index + 1 }}</span>
                        <span class="preview-slot-time">{{ slot.start }} - {{ slot.end }}</span>
                        <button class="preview-slot-delete" @click.stop="deletePreviewSlot(slot.index)" type="button" :title="t('edt.deleteSlot')">
                          <X :size="12" />
                        </button>
                      </template>
                    </div>
                  </template>
                  <button class="btn btn-sm btn-outline" style="margin-top: 8px;" @click="addSlotAtEnd" type="button">
                    <Plus :size="14" />
                    <span>{{ t('edt.addSlot') }}</span>
                  </button>
                </div>
                <div v-if="previewSlots.length > 0" class="preview-stats">
                  <div class="stat-item">
                    <span class="stat-label">{{ t('edt.slotsPerDay') }}</span>
                    <span class="stat-value">{{ nonBreakSlots }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ t('edt.totalPerWeek') }}</span>
                    <span class="stat-value">{{ nonBreakSlots * timeGridForm.days.length }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Wizard nav -->
        <div class="wizard-nav">
          <button class="btn btn-outline" disabled type="button">{{ t('edt.previous') }}</button>
          <button class="btn btn-primary" @click="goToStep(2)" type="button">{{ t('edt.next') }}</button>
        </div>
      </template>

      <!-- Step 2: Volume horaire -->
      <template v-if="edtStore.setupStep === 2">
        <div v-if="hasSecondCycleLevels" class="info-hint-banner">
          <AlertCircle :size="18" />
          <div>
            <p style="margin: 0; font-weight: 600;">{{ t('edt.secondCycleSeries') }}</p>
            <p style="margin: 6px 0 0 0; font-size: 12px;">
              {{ t('edt.secondCycleHint') }}
            </p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <h3>{{ t('edt.subjectsByLevel') }}</h3>
              <button class="btn btn-sm btn-outline" @click="prefillSubjectHours" type="button">
                {{ prefillButtonLabel }}
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ t('edt.thSubject') }}</th>
                    <th v-for="levelKey in availableLevelKeys" :key="levelKey">{{ getLevelKeyLabel(levelKey) }}</th>
                    <th>{{ t('edt.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="subject in allSubjects" :key="subject">
                    <td class="td-subject">{{ subject }}</td>
                    <td v-for="levelKey in availableLevelKeys" :key="levelKey" class="td-number">
                      <input
                        :value="edtStore.subjectHours[levelKey]?.[subject] || 0"
                        type="number"
                        min="0"
                        max="20"
                        class="input input-sm input-number"
                        @input="updateSubjectHours(levelKey, subject, $event)"
                      />
                    </td>
                    <td class="td-total">{{ getTotalSubjectHours(subject) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Totals by level -->
            <div class="totals-row">
              <span class="totals-label">{{ t('edt.totalHoursWeek') }}</span>
              <div
                v-for="levelKey in availableLevelKeys"
                :key="levelKey"
                class="totals-cell"
                :class="getTotalLevelClass(levelKey)"
                :title="getTotalLevelTooltip(levelKey)"
              >
                {{ edtStore.hoursPerLevel[levelKey] || 0 }}h / {{ availableSlotsPerWeek }}
              </div>
              <div class="totals-cell"></div>
            </div>

            <!-- Warning with specific overloaded levels -->
            <div v-if="hasOverloadWarning" class="warning-banner">
              <AlertTriangle :size="18" />
              <div>
                <p style="margin: 0 0 8px 0;">{{ t('edt.overloadTitle') }}</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li v-for="item in overloadedLevels" :key="item.level">
                    {{ t('edt.overloadItem', { level: item.level, excess: item.excess, hours: item.hours, available: item.available }) }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Wizard nav -->
        <div class="wizard-nav">
          <button class="btn btn-outline" @click="goToStep(1)" type="button">{{ t('edt.previous') }}</button>
          <button class="btn btn-primary" @click="goToStep(3)" type="button">{{ t('edt.next') }}</button>
        </div>
      </template>

      <!-- Step 3: Affectation enseignants -->
      <template v-if="edtStore.setupStep === 3">
        <div class="card">
          <div class="card-header">
            <h3>{{ t('edt.stepTitle3') }}</h3>
          </div>
          <div class="card-body">
            <div class="assignments-grid">
              <div v-for="subject in subjectsWithHours" :key="subject" class="assignment-section">
                <div class="assignment-subject-header">
                  <span class="subject-color-dot" :style="{ background: edtStore.getSubjectColor(subject) }"></span>
                  <span class="subject-name">{{ subject }}</span>
                  <span class="subject-levels-hint">{{ getLevelsForSubject(subject).join(', ') }}</span>
                </div>

                <!-- Existing assignments for this subject -->
                <div v-for="(assignment, aIdx) in getAssignmentsForSubject(subject)" :key="aIdx" class="assignment-entry">
                  <div class="assignment-teacher-info">
                    <span class="teacher-name-tag">{{ assignment.teacherName }}</span>
                    <button class="icon-btn icon-btn-sm icon-btn-danger" @click="removeAssignment(assignment)" type="button" :title="t('edt.remove')">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                  <div class="classes-list">
                    <label v-for="cls in getClassesForSubject(subject)" :key="cls.id" class="class-checkbox">
                      <input
                        type="checkbox"
                        :checked="assignment.classIds.includes(cls.id)"
                        @change="toggleClassForAssignment(assignment, cls.id, $event)"
                      />
                      <span>{{ cls.name }}</span>
                    </label>
                  </div>
                </div>

                <!-- Add another teacher -->
                <div class="add-teacher-row">
                  <select
                    :value="''"
                    @change="addTeacherToSubject(subject, $event)"
                    class="input input-sm"
                  >
                    <option value="">{{ t('edt.addTeacher') }}</option>
                    <option
                      v-for="teacher in getAvailableTeachersForSubject(subject)"
                      :key="teacher.id"
                      :value="teacher.id"
                    >
                      {{ teacher.firstName }} {{ teacher.lastName }}
                    </option>
                  </select>
                  <span v-if="getSubjectTeachersList(subject).length === 0" class="teacher-warning">
                    {{ t('edt.noTeacherForSubject') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Teacher load summary -->
        <div class="card">
          <div class="card-header">
            <h3>{{ t('edt.teacherLoad') }}</h3>
          </div>
          <div class="card-body">
            <p class="settings-hint">{{ t('edt.unavailHint') }}</p>
            <div v-if="teacherLoadSummary.length === 0" class="empty-state">
              <p>{{ t('edt.noTeacherAssigned') }}</p>
            </div>
            <div v-else class="teacher-load-grid">
              <div v-for="load in teacherLoadSummary" :key="load.teacherId" class="teacher-load-card">
                <div class="teacher-load-name">{{ load.teacherName }}</div>
                <!-- Avec le contrat quand il est déclaré : « 18 / 20 h » dit
                     bien plus que « 18 h » seul. -->
                <div class="teacher-load-hours" :class="load.badgeClass">
                  <template v-if="load.contrat">{{ t('edt.hoursOfContract', { n: load.totalHours, max: load.contrat }) }}</template>
                  <template v-else>{{ t('edt.hoursPerWeek', { n: load.totalHours }) }}</template>
                </div>
                <div v-if="!load.contrat" class="unavail-none">{{ t('edt.noContractHours') }}</div>

                <!-- Indisponibilités : le générateur les respecte depuis
                     toujours, rien ne les lui donnait. -->
                <div class="unavail">
                  <div v-if="!edtStore.indisponibilitesDe(load.teacherId).length" class="unavail-none">
                    {{ t('edt.unavailNone') }}
                  </div>
                  <div
                    v-for="(u, i) in edtStore.indisponibilitesDe(load.teacherId)"
                    :key="i"
                    class="unavail-row"
                  >
                    <span>{{ u.day }} {{ u.from }} – {{ u.to }}</span>
                    <button
                      class="unavail-del"
                      type="button"
                      :title="t('edt.unavailRemove')"
                      @click="edtStore.retirerIndisponibilite(load.teacherId, i)"
                    ><X :size="12" /></button>
                  </div>
                  <!-- ⚠️ Trois choix au lieu de deux heures à taper. La vraie vie
                       se dit « pas le mercredi » ou « seulement le matin » ; pour
                       24 professeurs, saisir 48 horaires découragerait n'importe
                       quel responsable. Les horaires sont DÉDUITS de la grille de
                       l'école (voir `plagesRapides`), jamais 12:00 en dur. -->
                  <div class="unavail-add">
                    <select v-model="brouillonIndispo[load.teacherId].day" class="input input-xs">
                      <option v-for="d in edtStore.timeGrid.days" :key="d" :value="d">{{ d }}</option>
                    </select>
                    <button
                      v-for="p in ['journee', 'matin', 'apresMidi']"
                      :key="p"
                      class="btn btn-sm btn-outline"
                      type="button"
                      @click="ajouterIndispo(load.teacherId, p)"
                    >{{ t('edt.unavail_' + p) }}</button>
                  </div>
                  <div v-if="erreurIndispo[load.teacherId]" class="unavail-err">
                    {{ erreurIndispo[load.teacherId] }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Wizard nav -->
        <div class="wizard-nav">
          <button class="btn btn-outline" @click="goToStep(2)" type="button">{{ t('edt.previous') }}</button>
          <button class="btn btn-primary" @click="goToStep(4)" type="button">{{ t('edt.generate') }}</button>
        </div>
      </template>

      <!-- Step 4: Génération -->
      <template v-if="edtStore.setupStep === 4">
        <div class="card">
          <div class="card-header">
            <h3>{{ t('edt.stepTitle4') }}</h3>
          </div>
          <div class="card-body">
            <button
              v-if="!generationDone"
              class="btn btn-primary btn-lg"
              @click="generateSchedule"
              :disabled="edtStore.loading"
              type="button"
            >
              <Wand2 :size="20" />
              <span>{{ edtStore.loading ? t('edt.generating') : t('edt.generateTimetable') }}</span>
            </button>

            <div v-if="edtStore.generationLog.length > 0" class="generation-log">
              <div v-for="(msg, idx) in edtStore.generationLog" :key="idx" class="log-entry">
                {{ msg }}
              </div>
            </div>

            <div v-if="generationDone" class="generation-stats">
              <div class="stat-block" :class="{ 'success': generationStats.totalPlaced === generationStats.totalRequired }">
                <span class="stat-label">{{ t('edt.slotsPlaced') }}</span>
                <span class="stat-value">{{ generationStats.totalPlaced }} / {{ generationStats.totalRequired }}</span>
              </div>
              <div v-if="generationStats.autoResolved > 0" class="stat-block info">
                <span class="stat-label">{{ t('edt.autoResolved') }}</span>
                <span class="stat-value">{{ generationStats.autoResolved }}</span>
              </div>
              <div v-if="generationStats.conflicts > 0" class="stat-block warning">
                <span class="stat-label">{{ t('edt.conflictsLeft') }}</span>
                <span class="stat-value">{{ generationStats.conflicts }}</span>
              </div>
            </div>

            <div v-if="generationDone" class="generation-actions">
              <button class="btn btn-outline" @click="goToStep(3)" type="button">{{ t('edt.reconfigure') }}</button>
              <button class="btn btn-primary" @click="finishSetup" type="button">{{ t('edt.viewTimetable') }}</button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- CONSULTATION MODE -->
    <template v-else>
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-text">
          <h1>{{ authStore.isTeacher ? t('edt.myTimetable') : t('edt.timetable') }}</h1>
          <p>{{ authStore.isTeacher ? t('edt.teacherSub') : t('edt.adminSub') }}</p>
        </div>
        <div v-if="!authStore.isTeacher" class="page-header-actions">
          <button class="btn btn-outline" @click="edtStore.setSetupStep(1)" type="button">
            <Settings :size="16" />
            <span>{{ t('edt.reconfigure') }}</span>
          </button>
          <button class="btn btn-outline" @click="regenerateSchedule" :disabled="regenerating" type="button">
            <Loader2 v-if="regenerating" :size="16" class="spin-icon" />
            <RotateCcw v-else :size="16" />
            <span>{{ regenerating ? t('edt.regenerating') : t('edt.regenerate') }}</span>
          </button>
        </div>
      </div>

      <!-- Stats bar (masqué pour enseignant) -->
      <div v-if="!authStore.isTeacher" class="stat-bar">
        <div class="stat-bar-item">
          <div class="stat-bar-dot" style="background: var(--success)"></div>
          <div>
            <div class="stat-bar-value">{{ classesStore.classes.length }}</div>
            <div class="stat-bar-label">{{ t('edt.classesLabel') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <div class="stat-bar-dot" style="background: var(--pr)"></div>
          <div>
            <div class="stat-bar-value">{{ edtStore.assignedTeachers.length }}</div>
            <div class="stat-bar-label">{{ t('edt.teachersLabel') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <div class="stat-bar-dot" style="background: #F59E0B"></div>
          <div>
            <div class="stat-bar-value">{{ edtStore.schedule.length }}</div>
            <div class="stat-bar-label">{{ t('edt.slotsPlaced') }}</div>
          </div>
        </div>
      </div>

      <!-- Tabs (masqués pour enseignant — il voit directement son EDT) -->
      <div v-if="!authStore.isTeacher" class="tabs-bar">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'par-classe' }"
          @click="activeTab = 'par-classe'"
          type="button"
        >
          {{ t('edt.tabByClass') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'par-enseignant' }"
          @click="activeTab = 'par-enseignant'"
          type="button"
        >
          {{ t('edt.tabByTeacher') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'evenements' }"
          @click="activeTab = 'evenements'"
          type="button"
        >
          {{ t('edt.tabEvents') }}
        </button>
      </div>

      <!-- Regeneration feedback -->
      <div v-if="regenerationMessage" class="regen-toast regen-success">
        <CheckCircle2 :size="16" />
        <span>{{ regenerationMessage }}</span>
      </div>
      <div v-if="regenerationError" class="regen-toast regen-error">
        <AlertCircle :size="16" />
        <span>{{ regenerationError }}</span>
      </div>

      <!-- Conflict banner (admin/directeur only) -->
      <div v-if="!authStore.isTeacher && edtStore.generationConflicts.length > 0" class="conflict-banner">
        <div class="conflict-banner-header">
          <AlertTriangle :size="18" />
          <span>{{ t('edt.conflictsDetected', { n: edtStore.generationConflicts.length }) }}</span>
          <button class="btn btn-sm btn-outline" @click="showConflictPanel = !showConflictPanel" type="button">
            {{ showConflictPanel ? t('edt.hide') : t('edt.details') }}
          </button>
          <button class="btn btn-sm btn-primary" @click="autoResolveConflicts" type="button">
            {{ t('edt.autoResolve') }}
          </button>
          <button class="btn btn-sm btn-outline" @click="runAnalysis" type="button">
            <Sparkles :size="14" /> {{ t('edt.analyze') }}
          </button>
        </div>
        <div v-if="showConflictPanel" class="conflict-list">
          <div v-for="(c, idx) in edtStore.generationConflicts" :key="idx" class="conflict-item">
            <!-- Trois natures de conflit, trois pastilles : T = un enseignant
                 sur deux cours, P = des heures sans personne, H = des heures
                 qu'aucun créneau ne peut accueillir. Elles n'appellent pas les
                 mêmes décisions. -->
            <span class="conflict-icon" :class="c.type === 'unplaced' ? 'conflict-unplaced' : 'conflict-teacher'">
              {{ c.type === 'teacher_double' ? 'T' : c.type === 'teacher_missing' ? 'P' : 'H' }}
            </span>
            <span class="conflict-message">{{ c.message }}</span>
          </div>
        </div>

        <!-- Analyse MIAPO : quoi changer pour que ça passe -->
        <div v-if="analysisRecs.length" class="miapo-analysis">
          <div class="ma-head"><Sparkles :size="15" /> {{ t('edt.miapoAnalysis') }}</div>
          <div v-for="(r, i) in analysisRecs" :key="i" class="ma-rec">
            <strong>{{ r.title }}</strong>
            <p>{{ r.detail }}</p>
          </div>
        </div>
      </div>

      <!-- Résultat de la résolution automatique -->
      <div v-if="autoResolveMsg" class="auto-resolve-toast" :class="autoResolveOk ? 'ok' : 'warn'">
        <span>{{ autoResolveMsg }}</span>
      </div>

      <!-- Week navigation -->
      <div class="week-nav">
        <button class="btn btn-sm btn-outline" @click="edtStore.navigateWeek(-1)" type="button">
          &larr;
        </button>
        <span class="week-label">{{ edtStore.getWeekLabel(edtStore.currentWeek) }}</span>
        <button class="btn btn-sm btn-outline" @click="edtStore.navigateWeek(1)" type="button">
          &rarr;
        </button>
        <button class="btn btn-sm btn-outline" @click="edtStore.setCurrentWeek(todayMonday)" type="button" style="margin-left: 8px;">
          {{ t('edt.today') }}
        </button>
      </div>

      <!-- Tab: Par classe -->
      <template v-if="activeTab === 'par-classe'">
        <div class="card">
          <div class="card-body">
            <div class="selector-bar">
              <div class="field" style="margin-bottom: 0; min-width: 250px;">
                <label>{{ t('edt.classLabel') }}</label>
                <select v-model="selectedClassForView" class="input">
                  <option value="">{{ t('edt.selectClass') }}</option>
                  <option v-for="cls in classesStore.classes" :key="cls.id" :value="cls.id">
                    {{ cls.name }}
                  </option>
                </select>
              </div>
              <div class="selector-spacer"></div>
              <button class="btn btn-sm btn-outline" @click="printTimetable" type="button">
                <Printer :size="16" />
                <span>{{ t('edt.print') }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedClassForView" class="card timetable-card" :id="'timetable-print'">
          <div class="timetable-print-header">
            <span class="timetable-print-school">{{ schoolStore.schoolSettings?.schoolName }}</span>
            <span class="timetable-print-class">{{ t('edt.timetable') }} — {{ getSelectedClassName() }}</span>
            <span class="timetable-print-week">{{ t('edt.weekOf', { week: edtStore.getWeekLabel(edtStore.currentWeek) }) }}</span>
          </div>
          <div class="timetable-grid" :style="{ gridTemplateColumns: `80px repeat(${classViewDays.length}, 1fr)` }">
            <!-- Header row -->
            <div class="timetable-header"></div>
            <div v-for="day in classViewDays" :key="day" class="timetable-header" :class="{ 'day-cancelled': isDayCancelled(day), 'day-today': isToday(day) && isCurrentWeek }">
              <span class="day-name">{{ getDayLabel(day) }}</span>
              <span class="day-date">{{ getDayDate(day) }}</span>
              <span v-if="isDayCancelled(day)" class="day-cancelled-badge">{{ t('edt.holiday') }}</span>
            </div>

            <!-- Slots with breaks -->
            <template v-for="(row, rIdx) in classDisplaySlots" :key="rIdx">
              <!-- Break row -->
              <template v-if="row.type === 'break'">
                <div class="timetable-break-label">{{ row.start }}</div>
                <div v-for="day in classViewDays" :key="`brk-${day}-${rIdx}`" class="timetable-break-cell" :class="{ 'cell-holiday': isDayCancelled(day) }">
                  <span v-if="day === classViewDays[Math.floor(classViewDays.length / 2)]" class="break-text">{{ row.label }}</span>
                </div>
              </template>

              <!-- Course row -->
              <template v-else>
                <div class="timetable-slot-label" :class="{ 'current-slot': isCurrentSlot(row) }">
                  {{ row.start }}<br/>{{ row.end }}
                  <div v-if="isCurrentSlot(row)" class="current-time-dot"></div>
                </div>
                <template v-for="day in classViewDays" :key="`${day}-${row.index}`">
                  <div
                    class="timetable-cell"
                    :class="[getClassScheduleCell(day, row.index), { 'cell-holiday': isDayCancelled(day), 'cell-current-slot': isCurrentSlot(row) && isToday(day), 'drag-over': dragTarget?.day === day && dragTarget?.slotIndex === row.index, 'dragging-source': dragSource?.day === day && dragSource?.slotIndex === row.index }]"
                    :style="isDayCancelled(day) ? {} : getClassScheduleCellStyle(day, row.index)"
                    :draggable="!isDayCancelled(day) && getClassScheduleCell(day, row.index).includes('filled')"
                    @click="!dragSource && openSlotEditor(day, row.index, 'class')"
                    @dragstart="onDragStart($event, day, row.index)"
                    @dragover.prevent="onDragOver(day, row.index)"
                    @dragleave="onDragLeave"
                    @drop.prevent="onDrop($event, day, row.index)"
                    @dragend="onDragEnd"
                  >
                    <template v-if="isDayCancelled(day)">
                      <div class="cell-holiday-text" v-if="row.index === 0">{{ t('edt.holiday') }}</div>
                    </template>
                    <template v-else-if="getClassScheduleCell(day, row.index).includes('filled')">
                      <div class="cell-subject">{{ getClassScheduleEntry(day, row.index)?.subjectId }}</div>
                      <!-- `teacher-clash` est calculé sur l'emploi du temps
                           courant : un doublon reste visible LÀ OÙ IL EST tant
                           qu'il n'est pas corrigé, et pas seulement dans le
                           bandeau au moment du clic qui l'a créé. -->
                      <div
                        class="cell-teacher"
                        :class="{
                          'teacher-missing': !getClassScheduleEntry(day, row.index)?.teacherId,
                          'teacher-clash': enseignantEnDouble(day, row.index),
                        }"
                        :title="enseignantEnDouble(day, row.index) ? t('edt.teacherClashCell') : null"
                      >{{ getClassScheduleEntry(day, row.index)?.teacherName }}</div>
                    </template>
                    <div v-else class="cell-empty-hint">+</div>
                  </div>
                </template>
              </template>
            </template>
          </div>
        </div>
      </template>

      <!-- Tab: Par enseignant -->
      <template v-if="activeTab === 'par-enseignant'">
        <div class="card">
          <div class="card-body">
            <div class="selector-bar">
              <div v-if="!authStore.isTeacher" class="field" style="margin-bottom: 0; min-width: 250px;">
                <label>{{ t('edt.teacherLabel') }}</label>
                <select v-model="selectedTeacherForView" class="input">
                  <option value="">{{ t('edt.selectTeacher') }}</option>
                  <option v-for="teacherId in edtStore.assignedTeachers" :key="teacherId" :value="teacherId">
                    {{ getTeacherName(teacherId) }}
                  </option>
                </select>
              </div>
              <div class="selector-spacer"></div>
              <button class="btn btn-sm btn-outline" @click="printTimetable" type="button">
                <Printer :size="16" />
                <span>{{ t('edt.print') }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedTeacherForView" class="card">
          <div class="timetable-grid" :style="{ gridTemplateColumns: `80px repeat(${teacherViewDays.length}, 1fr)` }">
            <!-- Header row -->
            <div class="timetable-header"></div>
            <div v-for="day in teacherViewDays" :key="day" class="timetable-header" :class="{ 'day-cancelled': isDayCancelled(day) }">
              <span class="day-name">{{ getDayLabel(day) }}</span>
              <span class="day-date">{{ getDayDate(day) }}</span>
            </div>

            <!-- Slots with breaks -->
            <template v-for="(row, rIdx) in teacherDisplaySlots" :key="rIdx">
              <template v-if="row.type === 'break'">
                <div class="timetable-break-label">{{ row.start }}</div>
                <div v-for="day in teacherViewDays" :key="`brk-${day}-${rIdx}`" class="timetable-break-cell">
                  <span v-if="day === teacherViewDays[Math.floor(teacherViewDays.length / 2)]" class="break-text">{{ row.label }}</span>
                </div>
              </template>

              <template v-else>
                <div class="timetable-slot-label">{{ row.start }}<br/>{{ row.end }}</div>
                <template v-for="day in teacherViewDays" :key="`${day}-${row.index}`">
                  <div
                    class="timetable-cell"
                    :class="getTeacherScheduleCell(day, row.index)"
                    :style="getTeacherScheduleCellStyle(day, row.index)"
                  >
                    <template v-if="getTeacherScheduleCell(day, row.index).includes('filled')">
                      <div v-for="entry in getTeacherScheduleEntries(day, row.index)" :key="`${entry.classId}-${entry.subjectId}`" class="cell-entry">
                        <div class="cell-subject">{{ entry.subjectId }}</div>
                        <div class="cell-class">{{ entry.className }}</div>
                      </div>
                    </template>
                  </div>
                </template>
              </template>
            </template>
          </div>
        </div>
      </template>

      <!-- Tab: Événements & Jours fériés -->
      <template v-if="activeTab === 'evenements'">
        <div class="card">
          <div class="card-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <h3>{{ t('edt.schoolEvents') }}</h3>
              <button class="btn btn-sm btn-primary" @click="showEventModal = true" type="button">
                <Plus :size="16" />
                <span>{{ t('edt.add') }}</span>
              </button>
            </div>
          </div>
          <div class="card-body">
            <div v-if="edtStore.schoolEvents.filter(e => e.type === 'event').length === 0" class="empty-state">
              <p>{{ t('edt.noEvent') }}</p>
            </div>
            <div v-else class="events-list">
              <div v-for="evt in sortedEvents" :key="evt.id" class="event-item">
                <div class="event-date-badge">
                  <span class="event-day">{{ new Date(evt.date + 'T00:00').getDate() }}</span>
                  <span class="event-month">{{ ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][new Date(evt.date + 'T00:00').getMonth()] }}</span>
                </div>
                <div class="event-info">
                  <div class="event-title">{{ evt.title }}</div>
                  <div class="event-meta">
                    <span :class="evt.cancelsCourses ? 'badge badge-danger' : 'badge badge-success'">
                      {{ evt.cancelsCourses ? t('edt.coursesSuspended') : t('edt.coursesHeld') }}
                    </span>
                    <span v-if="evt.description" class="event-desc">{{ evt.description }}</span>
                  </div>
                </div>
                <button class="icon-btn icon-btn-danger" @click="edtStore.removeSchoolEvent(evt.id)" type="button">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <h3>{{ t('edt.holidays') }}</h3>
              <button class="btn btn-sm btn-outline" @click="prefillHolidaysFromCountry" type="button">
                {{ t('edt.prefill') }} ({{ schoolCountryLabel }})
              </button>
            </div>
          </div>
          <div class="card-body">
            <p class="settings-hint">{{ t('edt.holidaysHint') }}</p>
            <div v-if="messageFeries" class="unavail-none" style="margin-bottom:8px;">{{ messageFeries }}</div>
            <div v-if="edtStore.schoolEvents.filter(e => e.type === 'holiday').length === 0" class="empty-state">
              <p>{{ t('edt.noHoliday') }}</p>
            </div>
            <div v-else class="events-list">
              <div v-for="evt in sortedHolidays" :key="evt.id" class="event-item holiday-item">
                <div class="event-date-badge holiday-badge">
                  <span class="event-day">{{ new Date(evt.date + 'T00:00').getDate() }}</span>
                  <span class="event-month">{{ ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][new Date(evt.date + 'T00:00').getMonth()] }}</span>
                </div>
                <div class="event-info">
                  <div class="event-title">{{ evt.title }}</div>
                  <!-- ⚠️ Le férié est une PROPOSITION : c'est le responsable qui
                       tranche s'il y a cours ce jour-là. Auparavant la seule
                       issue était de supprimer la ligne — donc de perdre
                       l'information « ce jour est férié, mais nous travaillons ».
                       Le modèle portait déjà `cancelsCourses` ; rien ne
                       permettait de le régler. -->
                  <label class="holiday-toggle">
                    <input
                      type="checkbox"
                      :checked="evt.cancelsCourses !== false"
                      @change="edtStore.updateSchoolEvent(evt.id, { cancelsCourses: $event.target.checked })"
                    />
                    <span>{{ evt.cancelsCourses !== false ? t('edt.coursesSuspended') : t('edt.coursesHeld') }}</span>
                  </label>
                </div>
                <button class="icon-btn icon-btn-danger" @click="edtStore.removeSchoolEvent(evt.id)" type="button">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Modal: Ajouter une pause -->
    <div v-if="showAddBreakModal" class="modal-overlay" @click.self="showAddBreakModal = false">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('edt.addBreak') }}</h2>
          <button class="icon-btn" @click="showAddBreakModal = false" type="button">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('edt.breakName') }}</label>
            <input v-model="newBreak.label" type="text" class="input" :placeholder="t('edt.breakNamePh')" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('edt.startTime') }}</label>
              <input v-model="newBreak.start" type="time" class="input" />
            </div>
            <div class="field">
              <label>{{ t('edt.endTime') }}</label>
              <input v-model="newBreak.end" type="time" class="input" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="showAddBreakModal = false" type="button">{{ t('edt.cancel') }}</button>
            <button class="btn btn-primary" @click="addBreak" type="button">{{ t('edt.add') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Modifier un créneau -->
    <div v-if="showSlotEditor" class="modal-overlay" @click.self="closeSlotEditor">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('edt.editSlot') }}</h2>
          <button class="icon-btn" @click="closeSlotEditor" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <p class="slot-editor-info">{{ editingSlot.dayLabel }} - {{ editingSlot.slotLabel }}</p>
          <div class="field">
            <label>{{ t('edt.subjectLabel') }}</label>
            <select v-model="editingSlot.subjectId" class="input" @change="onSlotSubjectChange">
              <option value="">{{ t('edt.freeNoCourse') }}</option>
              <option v-for="subject in slotEditorSubjects" :key="subject" :value="subject">{{ subject }}</option>
            </select>
          </div>
          <div v-if="editingSlot.subjectId" class="field">
            <label>{{ t('edt.teacherLabel') }}</label>
            <select v-model="editingSlot.teacherId" class="input">
              <option value="">{{ t('edt.notAssigned') }}</option>
              <option v-for="it in slotEditorTeachers" :key="it.id" :value="it.id">
                {{ it.firstName }} {{ it.lastName }}
              </option>
            </select>
          </div>
          <div v-if="slotConflictWarning" class="slot-conflict-warning">
            <AlertTriangle :size="14" />
            <span>{{ slotConflictWarning }}</span>
          </div>
          <div class="modal-actions">
            <button v-if="editingSlot.hasExisting" class="btn btn-danger" @click="removeSlotEntry" type="button">{{ t('edt.delete') }}</button>
            <div style="flex: 1;"></div>
            <button class="btn btn-outline" @click="closeSlotEditor" type="button">{{ t('edt.cancel') }}</button>
            <button class="btn btn-primary" @click="saveSlotEdit" type="button">{{ t('edt.save') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Ajouter un événement -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="showEventModal = false">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('edt.addEvent') }}</h2>
          <button class="icon-btn" @click="showEventModal = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('edt.titleReq') }}</label>
            <input v-model="newEvent.title" type="text" class="input" :placeholder="t('edt.titlePh')" />
          </div>
          <div class="field">
            <label>{{ t('edt.dateReq') }}</label>
            <input v-model="newEvent.date" type="date" class="input" />
          </div>
          <div class="field">
            <label>{{ t('edt.description') }}</label>
            <input v-model="newEvent.description" type="text" class="input" :placeholder="t('edt.descPh')" />
          </div>
          <div class="field">
            <label class="checkbox-label" style="display: flex; gap: 8px; align-items: center; cursor: pointer;">
              <input type="checkbox" v-model="newEvent.cancelsCourses" />
              <span>{{ t('edt.coursesSuspendedDay') }}</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="showEventModal = false" type="button">{{ t('edt.cancel') }}</button>
            <button class="btn btn-primary" @click="saveEvent" type="button">{{ t('edt.add') }}</button>
          </div>
        </div>
      </div>
    <!-- Modal: Modifier horaire d'un créneau -->
    <div v-if="showSlotTimeModal" class="modal-overlay" @click.self="showSlotTimeModal = false">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('edt.editSlotN', { n: editingSlotTime.index + 1 }) }}</h2>
          <button class="icon-btn" @click="showSlotTimeModal = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field-row">
            <div class="field">
              <label>{{ t('edt.startLabel') }}</label>
              <input v-model="editingSlotTime.start" type="time" class="input" />
            </div>
            <div class="field">
              <label>{{ t('edt.endLabel') }}</label>
              <input v-model="editingSlotTime.end" type="time" class="input" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="showSlotTimeModal = false" type="button">{{ t('edt.cancel') }}</button>
            <button class="btn btn-primary" @click="saveSlotTimeEdit" type="button">{{ t('edt.save') }}</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal: Confirmer le déplacement d'un cours -->
    <div v-if="showMoveConfirm" class="modal-overlay" @click.self="cancelMove">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('edt.moveCourse') }}</h2>
          <button class="icon-btn" @click="cancelMove" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <p v-if="pendingMove" style="margin-bottom: 12px;">
            {{ t('edt.moveText', { subject: pendingMove.subjectId, day: dayLabel(pendingMove.targetDay), start: edtStore.timeSlots[pendingMove.targetSlotIndex]?.start, end: edtStore.timeSlots[pendingMove.targetSlotIndex]?.end }) }}
          </p>
          <div v-if="moveConflicts.length > 0" class="move-conflict-warnings">
            <div class="move-conflict-banner">
              <AlertTriangle :size="16" />
              <span>{{ t('edt.moveConflictWarn', { n: moveConflicts.length }) }}</span>
            </div>
            <ul class="move-conflict-list">
              <li v-for="(c, i) in moveConflicts" :key="i">{{ c.message }}</li>
            </ul>
          </div>
          <p v-else style="color: var(--color-success, #0C7A52);">{{ t('edt.noConflictDetected') }}</p>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="cancelMove" type="button">{{ t('edt.cancel') }}</button>
            <button class="btn btn-primary" @click="confirmMove" type="button">
              {{ moveConflicts.length > 0 ? t('edt.moveAnyway') : t('edt.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEmploiDuTempsStore, DAYS, SUBJECT_COLORS, DEFAULT_SUBJECT_HOURS, getSubjectTextColor, HOLIDAYS_BY_COUNTRY, SERIES, SERIES_SUBJECT_HOURS, getDefaultHoursForLevel, getSubjectHoursKey } from '../stores/emploi-du-temps'
import { useClassesStore, LEVELS } from '../stores/classes'
import { usePersonnelStore, SUBJECTS_BY_CYCLE } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { useSchoolStore } from '../stores/school'
import { useAuthStore } from '../stores/auth'
import { useEditionStore } from '../stores/edition'
import { useDisciplinesPrimaireStore } from '../stores/disciplinesPrimaire'
import {
  AlertCircle, AlertTriangle, Plus, Trash2, Wand2, Settings, RotateCcw, Printer, X, Calendar, Loader2, CheckCircle2, Sparkles
} from 'lucide-vue-next'

const edtStore = useEmploiDuTempsStore()
const classesStore = useClassesStore()
const personnelStore = usePersonnelStore()
const subjectsStore = useSubjectsStore()
const discPrimaireStore = useDisciplinesPrimaireStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()
const editionStore = useEditionStore()

// Teacher's staff record (pour auto-sélectionner l'enseignant)
const teacherStaffRecord = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherStaffRecord(authStore.userProfile)
})

// Wizard State
const timeGridForm = ref({
  days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
  startTime: '07:30',
  endTime: '15:30',
  slotDuration: 55,
  breaks: [],
})

const showAddBreakModal = ref(false)
const newBreak = ref({ label: '', start: '', end: '' })
const generationDone = ref(false)
const generationStats = ref({ totalPlaced: 0, totalRequired: 0, conflicts: 0 })

// Consultation State
const activeTab = ref('par-classe')
const selectedClassForView = ref('')
const selectedTeacherForView = ref('')
const showConflictPanel = ref(false)
const regenerating = ref(false)
const regenerationMessage = ref('')
const regenerationError = ref('')

// Current time line
const currentTimeMinutes = ref(0)
let timeInterval = null

// Drag & Drop
const dragSource = ref(null)  // { day, slotIndex, entry, entryIndex }
const dragTarget = ref(null)  // { day, slotIndex }
const showMoveConfirm = ref(false)
const moveConflicts = ref([])  // [{ type, message }]
const pendingMove = ref(null)  // { sourceEntry, sourceIndex, targetDay, targetSlotIndex, targetEntry, targetIndex }

// Slot editor
const showSlotEditor = ref(false)
const editingSlot = ref({ day: '', slotIndex: 0, dayLabel: '', slotLabel: '', subjectId: '', teacherId: '', classId: '', hasExisting: false, entryIndex: -1 })

// Slot time editor (Step 1 preview)
const showSlotTimeModal = ref(false)
const editingSlotTime = ref({ index: 0, start: '', end: '' })

// Event modal
const showEventModal = ref(false)
const newEvent = ref({ title: '', date: '', description: '', cancelsCourses: false })

// Computed
const { t, locale } = useI18n({ useScope: 'global' })
// Libellé de jour traduit (valeurs stockées : lundi/mardi/... inchangées)
function dayLabel(value) {
  const k = 'edt.days.' + value
  const l = t(k)
  return l === k ? value : l
}

const stepTitles = computed(() => [
  t('edt.stepTitle1'), t('edt.stepTitle2'), t('edt.stepTitle3'), t('edt.stepTitle4'),
])

const stepHints = computed(() => [
  t('edt.stepHint1'), t('edt.stepHint2'), t('edt.stepHint3'), t('edt.stepHint4'),
])

const progressPercent = computed(() => {
  return (edtStore.setupStep / 4) * 100
})

const prefillButtonLabel = computed(() => {
  const country = schoolStore.schoolSettings?.country
  if (['CM', 'SN', 'CI'].includes(country)) {
    return t('edt.prefillCemac')
  }
  return t('edt.prefillRecommended')
})

const previewSlots = computed(() => {
  const allSlots = []
  const slots = edtStore.buildTimeSlots(timeGridForm.value)
  let slotIndex = 0

  for (const slot of slots) {
    const overlappingBreak = timeGridForm.value.breaks.find(b => {
      const bStart = edtStore.timeToMinutes(b.start)
      const bEnd = edtStore.timeToMinutes(b.end)
      const sStart = edtStore.timeToMinutes(slot.start)
      const sEnd = edtStore.timeToMinutes(slot.end)
      return sStart < bEnd && sEnd > bStart
    })

    if (!overlappingBreak) {
      allSlots.push({ ...slot, index: slotIndex++, isBreak: false })
    }
  }

  for (const brk of timeGridForm.value.breaks) {
    allSlots.push({ isBreak: true, ...brk })
  }

  return allSlots.sort((a, b) => {
    const aTime = edtStore.timeToMinutes(a.start)
    const bTime = edtStore.timeToMinutes(b.start)
    return aTime - bTime
  })
})

const nonBreakSlots = computed(() => {
  return previewSlots.value.filter(s => !s.isBreak).length
})

// availableLevelKeys: returns subjectHours keys like '6e', '2nde', '1ere_A', '1ere_C', 'Tle_D'
const availableLevelKeys = computed(() => {
  const keys = new Set()
  for (const cls of classesStore.classes) {
    keys.add(getSubjectHoursKey(cls))
  }
  const order = ['6e','5e','4e','3e','2nde','1ere','Tle']
  return [...keys].sort((a, b) => {
    const baseA = a.split('_')[0]
    const baseB = b.split('_')[0]
    const idxA = order.indexOf(baseA)
    const idxB = order.indexOf(baseB)
    if (idxA !== idxB) return idxA - idxB
    return a.localeCompare(b)
  })
})

// For backward compatibility
const availableLevels = availableLevelKeys

const getLevelKeyLabel = (key) => {
  if (key.includes('_')) {
    const [level, serie] = key.split('_')
    return `${level} ${serie}`
  }
  return key
}

const getBaseLevelFromKey = (key) => key.split('_')[0]

const allSubjects = computed(() => {
  // Primaire : les disciplines DE L'ÉCOLE.
  //
  // ⚠️ C'était `DISCIPLINES_PRIMAIRE`, la liste camerounaise en dur : une école
  // de Dakar qui avait renommé ses matières voyait quand même « TIC » et
  // « Langues et cultures nationales » dans sa grille horaire. Le store part
  // d'une amorce (camerounaise ou neutre selon le pays) et l'école la corrige,
  // donc `noms` est toujours renseigné — le court-circuit n'a plus d'objet.
  //
  // On garde en revanche le branchement sur l'édition : la classification par
  // cycle rangeait les niveaux SIL-CM2 en « lycée » et servait des matières de
  // lycée à un instituteur.
  if (editionStore.isPrimaire) {
    return discPrimaireStore.noms
  }
  const subjects = new Set()
  for (const key of availableLevelKeys.value) {
    const baseLevel = getBaseLevelFromKey(key)
    const cycle = ['6e', '5e', '4e', '3e'].includes(baseLevel) ? 'college' : 'lycee'
    // Try dynamic subjects store
    if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
      subjectsStore.getSubjectsByCycle(cycle).forEach(s => subjects.add(s.name))
    } else {
      const subjectsByLevelAndCycle = SUBJECTS_BY_CYCLE[cycle] || []
      subjectsByLevelAndCycle.forEach(s => subjects.add(s))
    }
  }
  return [...subjects].sort()
})

const hasSecondCycleLevels = computed(() => {
  return availableLevelKeys.value.some(key => {
    const base = getBaseLevelFromKey(key)
    return ['2nde', '1ere', 'Tle'].includes(base)
  })
})

const subjectsWithHours = computed(() => {
  const subjects = new Set()
  for (const [level, levelSubjects] of Object.entries(edtStore.subjectHours)) {
    for (const [subject, hours] of Object.entries(levelSubjects)) {
      if (hours > 0) subjects.add(subject)
    }
  }
  return [...subjects].sort()
})

const availableSlotsPerWeek = computed(() => {
  return nonBreakSlots.value * timeGridForm.value.days.length
})

const overloadedLevels = computed(() => {
  const overloaded = []
  for (const levelKey of availableLevelKeys.value) {
    const total = edtStore.hoursPerLevel[levelKey] || 0
    const available = availableSlotsPerWeek.value
    if (total > available) {
      overloaded.push({
        level: getLevelKeyLabel(levelKey),
        hours: total,
        available,
        excess: total - available
      })
    }
  }
  return overloaded
})

const hasOverloadWarning = computed(() => {
  return overloadedLevels.value.length > 0
})

const teacherLoadSummary = computed(() => {
  const summary = []
  const teacherHours = {}

  for (const assignment of edtStore.teacherAssignments) {
    const key = assignment.teacherId
    if (!teacherHours[key]) {
      teacherHours[key] = { teacherName: assignment.teacherName, totalHours: 0 }
    }

    for (const classId of assignment.classIds) {
      const levelHours = edtStore.subjectHours[getLevelForClass(classId)] || {}
      const hours = levelHours[assignment.subjectId] || 0
      teacherHours[key].totalHours += hours
    }
  }

  for (const [teacherId, load] of Object.entries(teacherHours)) {
    // ⚠️ La charge est comparée aux HEURES DE CONTRAT de l'enseignant, pas à
    // des seuils de 20 h et 25 h écrits en dur : ils n'avaient de fondement
    // dans aucun des pays où MAPO est vendu.
    //
    // Contrat non renseigné = aucune couleur de jugement. Afficher « orange »
    // sur une charge qu'on ne peut comparer à rien serait un avis inventé.
    const membre = personnelStore.staff.find((m) => m.id === teacherId)
    const contrat = Number(membre?.weeklyHours) > 0 ? Number(membre.weeklyHours) : null
    let badgeClass = 'badge-neutral'
    if (contrat) {
      badgeClass = load.totalHours > contrat
        ? 'badge-danger'
        : load.totalHours >= contrat * 0.9 ? 'badge-warning' : 'badge-success'
    }

    summary.push({
      teacherId,
      teacherName: load.teacherName,
      totalHours: load.totalHours,
      contrat,
      badgeClass
    })
  }

  return summary.sort((a, b) => a.teacherName.localeCompare(b.teacherName))
})

// Methods
const toggleDay = (day) => {
  const idx = timeGridForm.value.days.indexOf(day)
  if (idx > -1) {
    if (timeGridForm.value.days.length > 1) {
      timeGridForm.value.days.splice(idx, 1)
    }
  } else {
    timeGridForm.value.days.push(day)
    timeGridForm.value.days.sort((a, b) => {
      const aIdx = DAYS.findIndex(d => d.value === a)
      const bIdx = DAYS.findIndex(d => d.value === b)
      return aIdx - bIdx
    })
  }
}

const removeBreak = (idx) => {
  timeGridForm.value.breaks.splice(idx, 1)
}

const addBreak = () => {
  if (newBreak.value.label && newBreak.value.start && newBreak.value.end) {
    timeGridForm.value.breaks.push({ ...newBreak.value })
    newBreak.value = { label: '', start: '', end: '' }
    showAddBreakModal.value = false
  }
}

// Preview slot management
const openSlotTimeEditor = (slot) => {
  editingSlotTime.value = { index: slot.index, start: slot.start, end: slot.end }
  showSlotTimeModal.value = true
}

const saveSlotTimeEdit = () => {
  // Recalculate slotDuration from edited times
  const startMin = edtStore.timeToMinutes(editingSlotTime.value.start)
  const endMin = edtStore.timeToMinutes(editingSlotTime.value.end)
  if (endMin > startMin) {
    timeGridForm.value.slotDuration = endMin - startMin
  }
  showSlotTimeModal.value = false
}

const deletePreviewSlot = (slotIndex) => {
  // To "delete" a slot, we shorten the end time to cut one slot
  const slots = edtStore.buildTimeSlots(timeGridForm.value)
  if (slots.length <= 1) return // Can't delete the last slot
  // If it's the last slot, reduce endTime
  if (slotIndex === slots.length - 1) {
    timeGridForm.value.endTime = slots[slotIndex].start
  } else {
    // For non-last slots, add a micro-break to skip this slot
    const slot = slots[slotIndex]
    timeGridForm.value.breaks.push({
      label: 'Libre',
      start: slot.start,
      end: slot.end
    })
  }
}

const addSlotAtEnd = () => {
  // Extend end time by one slot duration
  const endMin = edtStore.timeToMinutes(timeGridForm.value.endTime)
  const newEndMin = endMin + timeGridForm.value.slotDuration
  timeGridForm.value.endTime = edtStore.minutesToTime(newEndMin)
}

const goToStep = (step) => {
  if (step === 2) {
    edtStore.updateTimeGrid(timeGridForm.value)
  }
  edtStore.setSetupStep(step)
}

const updateSubjectHours = (level, subject, event) => {
  const hours = parseInt(event.target.value) || 0
  edtStore.updateSubjectHours(level, subject, hours)
}

const getTotalSubjectHours = (subject) => {
  let total = 0
  for (const level of availableLevels.value) {
    total += edtStore.subjectHours[level]?.[subject] || 0
  }
  return total
}

const getTotalLevelClass = (level) => {
  const total = edtStore.hoursPerLevel[level] || 0
  if (total > availableSlotsPerWeek.value) return 'overload'
  return ''
}

const getTotalLevelTooltip = (level) => {
  const total = edtStore.hoursPerLevel[level] || 0
  const available = availableSlotsPerWeek.value
  if (total > available) {
    return `Dépasse de ${total - available}h (${available} créneaux disponibles)`
  }
  return `${total}h sur ${available} créneaux disponibles`
}

const prefillSubjectHours = () => {
  for (const cls of classesStore.classes) {
    const levelKey = getSubjectHoursKey(cls)
    const defaultHours = getDefaultHoursForLevel(cls.level, cls.serie || null)
    edtStore.setSubjectHoursForLevel(levelKey, defaultHours)
  }
}

// Step 3: Multi-teacher support functions
const getAssignmentsForSubject = (subject) => {
  return edtStore.teacherAssignments.filter(a => a.subjectId === subject)
}

const getSubjectTeachersList = (subject) => {
  return personnelStore.staff.filter(s => s.category === 'enseignement' && s.subjects?.includes(subject))
}

const getAvailableTeachersForSubject = (subject) => {
  const assigned = getAssignmentsForSubject(subject).map(a => a.teacherId)
  return getSubjectTeachersList(subject).filter(t => !assigned.includes(t.id))
}

const getLevelsForSubject = (subject) => {
  const levels = []
  for (const levelKey of availableLevelKeys.value) {
    if ((edtStore.subjectHours[levelKey]?.[subject] || 0) > 0) {
      levels.push(getLevelKeyLabel(levelKey))
    }
  }
  return levels
}

/**
 * Écrit l'affectation dans la FICHE de l'enseignant.
 *
 * ⚠️ L'école répondait deux fois à la même question : ici (rangé par matière)
 * et dans la fiche du professeur (rangé par personne). Le générateur ne lisait
 * que cet écran, donc remplir les fiches ne servait à rien pour l'emploi du
 * temps — et les deux sources avaient déjà divergé (mesuré sur la démo : 231
 * affectations ici, 2 dans les fiches).
 *
 * La fiche est désormais la source. Cet écran reste une VUE par matière, plus
 * commode pour bâtir un emploi du temps, mais il écrit dans la fiche.
 */
async function synchroniserFiche(teacherId, subject, classIds) {
  const membre = personnelStore.staff.find((m) => m.id === teacherId)
  if (!membre) return
  const cbs = { ...(membre.classesBySubject || {}) }
  if (classIds && classIds.length) cbs[subject] = [...classIds]
  else delete cbs[subject]
  // La matière enseignée suit l'affectation : sans elle, la fiche dirait que le
  // professeur enseigne dans une classe une matière qu'il ne déclare pas.
  const matieres = new Set(membre.subjects || [])
  if (classIds && classIds.length) matieres.add(subject)
  await personnelStore.updateStaff(teacherId, {
    classesBySubject: cbs,
    subjects: [...matieres],
  })
}

const addTeacherToSubject = (subject, event) => {
  const teacherId = event.target.value
  if (!teacherId) return
  const teacher = personnelStore.staff.find(s => s.id === teacherId)
  if (!teacher) return

  const eligibleClasses = classesStore.classes.filter(cls => {
    const levelKey = getSubjectHoursKey(cls)
    return (edtStore.subjectHours[levelKey]?.[subject] || 0) > 0
  })

  const classIds = eligibleClasses.map(c => c.id)
  edtStore.addTeacherAssignment({
    teacherId: teacher.id,
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
    subjectId: subject,
    classIds,
  })
  synchroniserFiche(teacher.id, subject, classIds)

  event.target.value = ''
}

const removeAssignment = (assignment) => {
  edtStore.removeTeacherAssignment(assignment.teacherId, assignment.subjectId)
  // La fiche suit : sinon l'affectation retirée ici resterait vraie là-bas, et
  // le générateur — qui lit la fiche en premier — continuerait de l'appliquer.
  synchroniserFiche(assignment.teacherId, assignment.subjectId, [])
}

const toggleClassForAssignment = (assignment, classId, event) => {
  const idx = assignment.classIds.indexOf(classId)
  if (event.target.checked) {
    if (idx === -1) assignment.classIds.push(classId)
  } else {
    if (idx > -1) assignment.classIds.splice(idx, 1)
  }
  edtStore.saveToStorage()
  synchroniserFiche(assignment.teacherId, assignment.subjectId, assignment.classIds)
}

// Slot editor functions
const openSlotEditor = (day, slotIndex, viewType) => {
  const slot = edtStore.timeSlots[slotIndex]
  if (!slot) return

  const dayObj = DAYS.find(d => d.value === day)
  editingSlot.value = {
    day,
    slotIndex,
    dayLabel: dayLabel(day) || dayObj?.label || day,
    slotLabel: `${slot.start} - ${slot.end}`,
    subjectId: '',
    teacherId: '',
    classId: viewType === 'class' ? selectedClassForView.value : '',
    hasExisting: false,
    entryIndex: -1
  }

  // Check if there's an existing entry
  if (viewType === 'class' && selectedClassForView.value) {
    const entry = getClassScheduleEntry(day, slotIndex)
    if (entry) {
      editingSlot.value.subjectId = entry.subjectId
      editingSlot.value.teacherId = entry.teacherId || ''
      editingSlot.value.hasExisting = true
      editingSlot.value.entryIndex = edtStore.schedule.findIndex(
        e => e.day === day && e.slotIndex === slotIndex && e.classId === selectedClassForView.value
      )
    }
  }

  showSlotEditor.value = true
}

const closeSlotEditor = () => {
  showSlotEditor.value = false
}

// Slot editor computed helpers
const slotEditorSubjects = computed(() => {
  // Show subjects relevant to the selected class level
  if (!editingSlot.value.classId) return subjectsWithHours.value
  const cls = classesStore.classes.find(c => c.id === editingSlot.value.classId)
  if (!cls) return subjectsWithHours.value
  const levelKey = getSubjectHoursKey(cls)
  const levelHours = edtStore.subjectHours[levelKey] || {}
  return Object.entries(levelHours)
    .filter(([, hours]) => hours > 0)
    .map(([subject]) => subject)
    .sort()
})

const slotEditorTeachers = computed(() => {
  if (!editingSlot.value.subjectId) return []
  // Show teachers who teach this subject, plus all other teachers as fallback
  const primary = personnelStore.staff.filter(
    s => s.category === 'enseignement' && s.subjects?.includes(editingSlot.value.subjectId)
  )
  return primary
})

const onSlotSubjectChange = () => {
  // Auto-select teacher if only one teaches this subject
  const teachers = slotEditorTeachers.value
  if (teachers.length === 1) {
    editingSlot.value.teacherId = teachers[0].id
  } else {
    // Keep current teacher if they teach this subject, otherwise reset
    const current = teachers.find(t => t.id === editingSlot.value.teacherId)
    if (!current) editingSlot.value.teacherId = ''
  }
}

const slotConflictWarning = computed(() => {
  const s = editingSlot.value
  if (!s.teacherId || !s.subjectId) return null
  // Check if teacher is already booked at this slot in another class
  const teacherEntries = edtStore.schedule.filter(
    e => e.teacherId === s.teacherId && e.day === s.day && e.slotIndex === s.slotIndex && e.classId !== s.classId
  )
  if (teacherEntries.length > 0) {
    const teacher = personnelStore.staff.find(t => t.id === s.teacherId)
    const name = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Cet enseignant'
    return `${name} est déjà en cours avec ${teacherEntries[0].className} sur ce créneau.`
  }
  return null
})

// ── Indisponibilités : brouillon de saisie, un par enseignant ──────────────
const brouillonIndispo = reactive({})
const erreurIndispo = reactive({})

/**
 * Prépare un brouillon pour chaque enseignant affiché.
 *
 * ⚠️ Créé ici et pas à la volée dans le gabarit : muter un état réactif pendant
 * le rendu peut relancer le rendu. Le premier jour de la grille sert de valeur
 * de départ — jamais « lundi » en dur, une école peut ne pas travailler ce
 * jour-là.
 */
watch(
  () => [teacherLoadSummary.value.map((l) => l.teacherId).join(','), edtStore.timeGrid.days.join(',')],
  () => {
    const premierJour = edtStore.timeGrid.days?.[0] || ''
    for (const l of teacherLoadSummary.value) {
      if (!brouillonIndispo[l.teacherId]) {
        brouillonIndispo[l.teacherId] = { day: premierJour }
      }
    }
  },
  { immediate: true },
)

/**
 * Ajoute l'indisponibilité, et DIT pourquoi si elle est refusée.
 *
 * `plage` vaut « journee », « matin » ou « apresMidi » : les horaires viennent
 * de la grille de l'école, le responsable ne tape aucune heure.
 */
function ajouterIndispo(teacherId, plage) {
  const b = brouillonIndispo[teacherId]
  const horaires = edtStore.plagesRapides()[plage]
  const res = edtStore.ajouterIndisponibilite(teacherId, { day: b.day, ...horaires })
  if (res.ok) {
    erreurIndispo[teacherId] = ''
    return
  }
  erreurIndispo[teacherId] = res.reason === 'plage'
    ? t('edt.unavailErrRange')
    : res.reason === 'doublon'
      ? t('edt.unavailErrDup')
      : t('edt.unavailErrIncomplete')
}

/**
 * Un enseignant déjà pris ailleurs sur ce créneau — calculé sur l'emploi du
 * temps COURANT.
 *
 * ⚠️ Volontairement pas lu dans un journal de conflits : un conflit corrigé
 * disparaît alors tout seul, et un conflit créé apparaît même si personne n'a
 * cliqué sur un avertissement. On mesure l'état, on ne se souvient pas d'un clic.
 */
function conflitEnseignantSurCreneau({ teacherId, teacherName, day, slotIndex, classId }) {
  if (!teacherId) return null
  const autres = edtStore.schedule.filter(
    (e) => e.teacherId === teacherId && e.day === day && e.slotIndex === slotIndex && e.classId !== classId,
  )
  if (!autres.length) return null
  return {
    // Même TYPE que celui produit par le générateur : `analyzeConflicts` ne
    // comprenait pas l'ancien `teacher_conflict`, donc un doublon créé à la
    // main n'apparaissait dans AUCUNE recommandation.
    type: 'teacher_double',
    teacherId,
    teacherName: teacherName || autres[0].teacherName,
    day,
    slotIndex,
    entries: autres.map((e) => ({ classId: e.classId, className: e.className, subjectId: e.subjectId })),
    message: `${teacherName || autres[0].teacherName} : ${autres.length + 1} cours en même temps (${day}, créneau ${slotIndex + 1})`,
  }
}

/** Enregistre un conflit sans doublonner la liste (clé = qui, quand). */
function enregistrerConflit(c) {
  if (!c) return
  const deja = edtStore.generationConflicts.some(
    (x) => x.type === c.type && x.teacherId === c.teacherId && x.day === c.day && x.slotIndex === c.slotIndex,
  )
  if (!deja) edtStore.generationConflicts.push(c)
}

/** Marque de la grille : cette cellule met-elle un enseignant en double ? */
function enseignantEnDouble(day, slotIndex) {
  const e = getClassScheduleEntry(day, slotIndex)
  if (!e?.teacherId) return false
  return edtStore.schedule.some(
    (o) => o.teacherId === e.teacherId && o.day === day && o.slotIndex === slotIndex && o.classId !== e.classId,
  )
}

const saveSlotEdit = () => {
  const s = editingSlot.value

  // Remove existing entry if any
  if (s.hasExisting && s.entryIndex >= 0) {
    edtStore.schedule.splice(s.entryIndex, 1)
  }

  // Add new entry if subject selected
  if (s.subjectId && s.classId) {
    const cls = classesStore.classes.find(c => c.id === s.classId)
    const teacher = personnelStore.staff.find(t => t.id === s.teacherId)
    const slot = edtStore.timeSlots[s.slotIndex]

    edtStore.schedule.push({
      day: s.day,
      slotIndex: s.slotIndex,
      slotStart: slot?.start || '',
      slotEnd: slot?.end || '',
      classId: s.classId,
      className: cls?.name || '',
      subjectId: s.subjectId,
      teacherId: s.teacherId || null,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non assigné',
    })

    // ⚠️ L'avertissement `slotConflictWarning` était affiché juste au-dessus du
    // bouton, et cette fonction écrivait SANS le consulter : un doublon
    // d'enseignant créé ici ne laissait aucune trace, alors que le
    // glisser-déposer, lui, en gardait une. Le générateur garantit l'absence de
    // doublon, et le clic suivant la défaisait en silence.
    enregistrerConflit(conflitEnseignantSurCreneau({
      teacherId: s.teacherId,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
      day: s.day,
      slotIndex: s.slotIndex,
      classId: s.classId,
    }))
  }

  edtStore.saveToStorage()
  closeSlotEditor()
}

const removeSlotEntry = () => {
  const s = editingSlot.value
  if (s.hasExisting && s.entryIndex >= 0) {
    edtStore.schedule.splice(s.entryIndex, 1)
    edtStore.saveToStorage()
  }
  closeSlotEditor()
}

// Events functions
const sortedEvents = computed(() => {
  return edtStore.schoolEvents
    .filter(e => e.type === 'event')
    .sort((a, b) => a.date.localeCompare(b.date))
})

const sortedHolidays = computed(() => {
  return edtStore.schoolEvents
    .filter(e => e.type === 'holiday')
    .sort((a, b) => a.date.localeCompare(b.date))
})

const schoolCountryLabel = computed(() => {
  const country = schoolStore.schoolSettings?.country
  const labels = { CM: 'Cameroun', SN: 'Sénégal', CI: "Côte d'Ivoire", CG: 'Congo-Brazzaville' }
  return labels[country] || 'pays'
})

const saveEvent = () => {
  if (!newEvent.value.title || !newEvent.value.date) return
  edtStore.addSchoolEvent({
    title: newEvent.value.title,
    date: newEvent.value.date,
    type: 'event',
    cancelsCourses: newEvent.value.cancelsCourses,
    description: newEvent.value.description
  })
  newEvent.value = { title: '', date: '', description: '', cancelsCourses: false }
  showEventModal.value = false
}

/** Année scolaire en cours, au sens du calendrier (septembre → août). */
function anneeScolaireCourante() {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

const prefillHolidaysFromCountry = () => {
  // ⚠️ Plus de repli « CM ». Il proposait la fête nationale camerounaise à une
  // école sénégalaise : « je ne sais pas » n'est pas « Cameroun ».
  const country = schoolStore.schoolSettings?.country
  if (!country) {
    messageFeries.value = t('edt.holidaysNoCountry')
    return
  }
  edtStore.prefillHolidays(country, anneeScolaireCourante())
}

const messageFeries = ref('')

/**
 * Proposition automatique des fériés du pays, à l'ouverture.
 *
 * Décision de Steve : « on propose ceux du pays par défaut et c'est au
 * responsable de valider s'il y a cours ou pas ce jour-là ». Le store ne
 * propose qu'UNE fois par année scolaire : sans cette garde, les fériés
 * supprimés par l'école réapparaîtraient à chaque ouverture.
 */
function proposerFeriesSiBesoin() {
  const country = schoolStore.schoolSettings?.country
  if (!country) return
  const res = edtStore.proposerJoursFeries(country, anneeScolaireCourante())
  if (res.ok && res.ajoutes > 0) {
    messageFeries.value = t('edt.holidaysProposed', { n: res.ajoutes })
  }
}

const getTeachersForSubject = (subject) => {
  const allTeachers = personnelStore.staff.filter(s => s.category === 'enseignement')
  const withSubject = allTeachers.filter(t => t.subjects?.includes(subject))
  const others = allTeachers.filter(t => !t.subjects?.includes(subject))

  return {
    withSubject,
    others,
    all: allTeachers,
    hasAny: allTeachers.length > 0
  }
}

const getTeacherForSubject = (subject) => {
  return edtStore.teacherAssignments.find(a => a.subjectId === subject)
}

const selectTeacherForSubject = (subject, event) => {
  const teacherId = event.target.value
  if (!teacherId || teacherId === 'NO_TEACHERS') return

  const teacher = personnelStore.staff.find(s => s.id === teacherId)
  if (!teacher) return

  const eligibleClasses = classesStore.classes.filter(cls => {
    const levelKey = getSubjectHoursKey(cls)
    const levelHours = edtStore.subjectHours[levelKey] || {}
    return levelHours[subject] && levelHours[subject] > 0
  })

  edtStore.addTeacherAssignment({
    teacherId: teacher.id,
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
    subjectId: subject,
    classIds: eligibleClasses.map(c => c.id)
  })
}

const getClassesForSubject = (subject) => {
  const levelKeys = new Set()
  for (const [levelKey, subjects] of Object.entries(edtStore.subjectHours)) {
    if (subjects[subject] && subjects[subject] > 0) {
      levelKeys.add(levelKey)
    }
  }
  return classesStore.classes.filter(cls => levelKeys.has(getSubjectHoursKey(cls)))
}

const toggleClassForTeacher = (subject, classId, event) => {
  const assignment = getTeacherForSubject(subject)
  if (!assignment) return

  const idx = assignment.classIds.indexOf(classId)
  if (event.target.checked) {
    if (idx === -1) assignment.classIds.push(classId)
  } else {
    if (idx > -1) assignment.classIds.splice(idx, 1)
  }
  edtStore.saveToStorage()
}

const getLevelForClass = (classId) => {
  const cls = classesStore.classes.find(c => c.id === classId)
  if (!cls) return ''
  return getSubjectHoursKey(cls)
}

const generateSchedule = async () => {
  edtStore.loading = true
  generationDone.value = false
  try {
    const result = edtStore.generateSchedule()
    generationStats.value = {
      totalPlaced: result.totalPlaced,
      totalRequired: result.totalRequired,
      conflicts: result.conflicts?.length || 0,
      autoResolved: result.autoResolved || 0
    }
    generationDone.value = true
  } finally {
    edtStore.loading = false
  }
}

const finishSetup = () => {
  edtStore.setSetupStep(5)
}

const regenerateSchedule = async () => {
  regenerating.value = true
  regenerationMessage.value = ''
  regenerationError.value = ''

  try {
    // Reload fresh data
    await classesStore.loadClasses()
    await personnelStore.loadStaff()

    // Generate new schedule (replaces schedule.value internally)
    const result = edtStore.generateSchedule()

    const placed = result.totalPlaced || 0
    const required = result.totalRequired || 0
    const conflicts = result.conflicts?.length || 0
    const missing = result.missingTeachers || 0
    regenerationMessage.value = t('edt.regenPlaced', { placed, required })
      + (missing > 0 ? t('edt.regenMissing', { n: missing }) : '')
      + (conflicts > 0 ? t('edt.regenConflicts', { n: conflicts }) : '')

    setTimeout(() => { regenerationMessage.value = '' }, 5000)
  } catch (err) {
    console.error('Erreur régénération:', err)
    regenerationError.value = `Erreur: ${err.message || 'Erreur inconnue'}`
    setTimeout(() => { regenerationError.value = '' }, 6000)
  } finally {
    regenerating.value = false
  }
}

const autoResolveMsg = ref('')
const autoResolveOk = ref(false)
const analysisRecs = ref([])
const autoResolveConflicts = async () => {
  regenerating.value = true
  autoResolveMsg.value = ''
  analysisRecs.value = []
  await new Promise((r) => setTimeout(r, 30)) // laisse l'UI afficher l'état occupé
  const res = edtStore.resolveConflicts()
  regenerating.value = false
  autoResolveOk.value = res.after === 0
  autoResolveMsg.value = res.after === 0
    ? t('edt.conflictsAllResolved', { n: res.resolved })
    : t('edt.conflictsPartlyResolved', { resolved: res.resolved, left: res.after })
  // S'il reste des conflits, MIAPO les analyse et dit quoi changer.
  if (res.after > 0) {
    analysisRecs.value = edtStore.analyzeConflicts()
    showConflictPanel.value = true
  }
  setTimeout(() => { autoResolveMsg.value = '' }, 12000)
}
const runAnalysis = () => {
  analysisRecs.value = edtStore.analyzeConflicts()
  showConflictPanel.value = true
}

// --- Week navigation ---
const todayMonday = computed(() => {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
})

// --- Level overrides ---
const availableLevelsForOverride = computed(() => {
  const levels = new Set()
  for (const cls of classesStore.classes) {
    levels.add(cls.level)
  }
  return [...levels]
})

const levelOverrideEndTime = computed(() => {
  const result = {}
  for (const lvl of availableLevelsForOverride.value) {
    const override = edtStore.levelOverrides[lvl]
    result[lvl] = override?.endTime || null
  }
  return result
})

const hasLevelOverride = (level, day) => {
  const override = edtStore.levelOverrides[level]
  if (!override?.days) return false
  return override.days.includes(day)
}

const toggleLevelDay = (level, day, checked) => {
  const current = edtStore.levelOverrides[level] || {}
  let days = current.days ? [...current.days] : [...edtStore.timeGrid.days]
  if (checked && !days.includes(day)) {
    days.push(day)
  } else if (!checked) {
    days = days.filter(d => d !== day)
  }
  edtStore.setLevelOverride(level, { ...current, days })
}

const setLevelEndTime = (level, time) => {
  const current = edtStore.levelOverrides[level] || {}
  edtStore.setLevelOverride(level, { ...current, endTime: time })
}

// --- Display slots with breaks interleaved ---
const classDisplaySlots = computed(() => {
  if (!selectedClassForView.value) return edtStore.buildDisplaySlots(edtStore.timeGrid)
  const cls = classesStore.classes.find(c => c.id === selectedClassForView.value)
  if (!cls) return edtStore.buildDisplaySlots(edtStore.timeGrid)
  const grid = edtStore.getEffectiveGrid(cls.level)
  return edtStore.buildDisplaySlots(grid)
})

const teacherDisplaySlots = computed(() => {
  // Teacher view uses the base grid (teachers may teach across levels)
  return edtStore.buildDisplaySlots(edtStore.timeGrid)
})

// Days shown depend on selected class level
const classViewDays = computed(() => {
  if (!selectedClassForView.value) return edtStore.timeGrid.days
  const cls = classesStore.classes.find(c => c.id === selectedClassForView.value)
  if (!cls) return edtStore.timeGrid.days
  const grid = edtStore.getEffectiveGrid(cls.level)
  return grid.days || edtStore.timeGrid.days
})

// Teacher view: show all days any level has (union)
const teacherViewDays = computed(() => {
  const allDays = new Set(edtStore.timeGrid.days)
  for (const override of Object.values(edtStore.levelOverrides)) {
    if (override.days) {
      for (const d of override.days) allDays.add(d)
    }
  }
  const order = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return order.filter(d => allDays.has(d))
})

// Check if a day of the current week is cancelled by an event
const isDayCancelled = (day) => {
  const weekDates = edtStore.getWeekDates()
  const dateStr = weekDates[day]
  return dateStr ? edtStore.isDateCancelled(dateStr) : false
}

const getDayDate = (day) => {
  const weekDates = edtStore.getWeekDates()
  const dateStr = weekDates[day]
  if (!dateStr) return ''
  // Parse date manually to avoid timezone issues
  const parts = dateStr.split('-')
  return parseInt(parts[2], 10).toString()
}

const getSelectedClassName = () => {
  const cls = classesStore.classes.find(c => c.id === selectedClassForView.value)
  return cls?.name || ''
}

const getDayLabel = (day) => {
  const k = 'edt.daysShort.' + day
  const l = t(k)
  if (l !== k) return l
  const d = DAYS.find(x => x.value === day)
  return d?.short || day
}

// Pre-computed cell map: { 'day_slotIndex': { entry, css, style } }
const classCellMap = computed(() => {
  const entries = edtStore.scheduleByClass[selectedClassForView.value] || {}
  const map = {}
  for (const [key, entry] of Object.entries(entries)) {
    const color = edtStore.getSubjectColor(entry.subjectId)
    map[key] = {
      entry,
      css: 'timetable-cell filled',
      style: { background: color, color: getSubjectTextColor(entry.subjectId) },
    }
  }
  return map
})

const getClassScheduleCell = (day, slotIndex) => {
  return classCellMap.value[`${day}_${slotIndex}`]?.css || 'timetable-cell empty'
}

const getClassScheduleCellStyle = (day, slotIndex) => {
  return classCellMap.value[`${day}_${slotIndex}`]?.style || {}
}

const getClassScheduleEntry = (day, slotIndex) => {
  return classCellMap.value[`${day}_${slotIndex}`]?.entry || null
}

const getTeacherScheduleCell = (day, slotIndex) => {
  const entries = edtStore.scheduleByTeacher[selectedTeacherForView.value] || {}
  const key = `${day}_${slotIndex}`
  return entries[key] && entries[key].length > 0 ? 'timetable-cell filled' : 'timetable-cell empty'
}

const getTeacherScheduleCellStyle = (day, slotIndex) => {
  const entries = getTeacherScheduleEntries(day, slotIndex)
  if (entries.length === 0) return {}
  const color = edtStore.getSubjectColor(entries[0].subjectId)
  return { background: color, color: getSubjectTextColor(entries[0].subjectId) }
}

const getTeacherScheduleEntries = (day, slotIndex) => {
  const entries = edtStore.scheduleByTeacher[selectedTeacherForView.value] || {}
  const key = `${day}_${slotIndex}`
  return entries[key] || []
}

const getTeacherName = (teacherId) => {
  const teacher = personnelStore.staff.find(s => s.id === teacherId)
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'
}

const printTimetable = () => {
  document.body.classList.add('printing-timetable')
  window.print()
  document.body.classList.remove('printing-timetable')
}

// --- Current time helpers ---
function updateCurrentTime() {
  const now = new Date()
  currentTimeMinutes.value = now.getHours() * 60 + now.getMinutes()
}

const todayDayName = computed(() => {
  const dayMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return dayMap[new Date().getDay()]
})

const isCurrentWeek = computed(() => {
  return edtStore.currentWeek === todayMonday.value
})

const isToday = (day) => {
  return isCurrentWeek.value && day === todayDayName.value
}

const isCurrentSlot = (row) => {
  if (!isCurrentWeek.value || row.type === 'break') return false
  const startMin = edtStore.timeToMinutes(row.start)
  const endMin = edtStore.timeToMinutes(row.end)
  return currentTimeMinutes.value >= startMin && currentTimeMinutes.value < endMin
}

// ---- Drag & Drop handlers ----
const onDragStart = (event, day, slotIndex) => {
  const entry = getClassScheduleEntry(day, slotIndex)
  if (!entry) { event.preventDefault(); return }

  // Store a plain copy of the entry, not a reactive reference
  dragSource.value = {
    day,
    slotIndex,
    classId: selectedClassForView.value,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
    teacherName: entry.teacherName,
    className: entry.className,
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', `${day}_${slotIndex}`)
}

const onDragOver = (day, slotIndex) => {
  if (!dragSource.value) return
  if (dragSource.value.day === day && dragSource.value.slotIndex === slotIndex) return
  dragTarget.value = { day, slotIndex }
}

const onDragLeave = () => {
  dragTarget.value = null
}

const onDragEnd = () => {
  dragSource.value = null
  dragTarget.value = null
}

const onDrop = (event, day, slotIndex) => {
  if (!dragSource.value) return
  const src = dragSource.value

  // Reset drag state immediately
  dragSource.value = null
  dragTarget.value = null

  if (src.day === day && src.slotIndex === slotIndex) return

  const classId = src.classId
  const conflicts = []

  // Check if target slot already has a course for this class
  const targetEntry = getClassScheduleEntry(day, slotIndex)
  if (targetEntry) {
    conflicts.push({ type: 'slot_occupied', message: `Le créneau est occupé par ${targetEntry.subjectId} (${targetEntry.teacherName})` })
  }

  // Check if teacher has another class at target slot
  if (src.teacherId) {
    const teacherBusy = edtStore.schedule.find(
      e => e.teacherId === src.teacherId && e.day === day && e.slotIndex === slotIndex && e.classId !== classId
    )
    if (teacherBusy) {
      conflicts.push({ type: 'teacher_conflict', message: `${src.teacherName} enseigne déjà ${teacherBusy.subjectId} en ${teacherBusy.className} sur ce créneau` })
    }
  }

  // Check if target day is a holiday
  if (isDayCancelled(day)) {
    conflicts.push({ type: 'holiday', message: 'Ce jour est férié' })
  }

  pendingMove.value = {
    sourceDay: src.day,
    sourceSlotIndex: src.slotIndex,
    sourceClassId: classId,
    targetDay: day,
    targetSlotIndex: slotIndex,
    subjectId: src.subjectId,
    teacherName: src.teacherName,
  }
  moveConflicts.value = conflicts
  showMoveConfirm.value = true
}

const confirmMove = () => {
  const mv = pendingMove.value
  if (!mv) return

  const slot = edtStore.timeSlots[mv.targetSlotIndex]
  if (!slot) { cancelMove(); return }

  // Find source entry by its original position
  const sourceIdx = edtStore.schedule.findIndex(
    e => e.day === mv.sourceDay && e.slotIndex === mv.sourceSlotIndex && e.classId === mv.sourceClassId
  )
  if (sourceIdx < 0) { cancelMove(); return }

  // If target slot is occupied by same class, remove that entry first
  const targetIdx = edtStore.schedule.findIndex(
    e => e.day === mv.targetDay && e.slotIndex === mv.targetSlotIndex && e.classId === mv.sourceClassId
  )
  if (targetIdx >= 0 && targetIdx !== sourceIdx) {
    edtStore.schedule.splice(targetIdx, 1)
  }

  // Re-find source after potential splice
  const newSourceIdx = edtStore.schedule.findIndex(
    e => e.day === mv.sourceDay && e.slotIndex === mv.sourceSlotIndex && e.classId === mv.sourceClassId
  )
  if (newSourceIdx >= 0) {
    edtStore.schedule[newSourceIdx].day = mv.targetDay
    edtStore.schedule[newSourceIdx].slotIndex = mv.targetSlotIndex
    edtStore.schedule[newSourceIdx].slotStart = slot.start
    edtStore.schedule[newSourceIdx].slotEnd = slot.end
  }

  // Conflit d'enseignant : recalculé APRÈS le déplacement, sur l'emploi du temps
  // réel, et enregistré sous la même forme que celle du générateur.
  //
  // ⚠️ L'ancien code recopiait le message calculé AVANT le déplacement, sous le
  // type `teacher_conflict` que `analyzeConflicts` ne connaît pas : un doublon
  // forcé n'apparaissait donc dans aucune recommandation, et la déduplication
  // par message rendait la liste dépendante du libellé.
  const deplace = edtStore.schedule[newSourceIdx]
  if (deplace) {
    enregistrerConflit(conflitEnseignantSurCreneau({
      teacherId: deplace.teacherId,
      teacherName: deplace.teacherName,
      day: deplace.day,
      slotIndex: deplace.slotIndex,
      classId: deplace.classId,
    }))
  }

  edtStore.saveToStorage()
  showMoveConfirm.value = false
  pendingMove.value = null
  moveConflicts.value = []
}

const cancelMove = () => {
  showMoveConfirm.value = false
  pendingMove.value = null
  moveConflicts.value = []
}

// Lifecycle — IMPORTANT: charger classes et personnel AVANT l'EDT
onMounted(async () => {
  await classesStore.loadClasses()
  await personnelStore.loadStaff()
  await subjectsStore.loadSubjects()
  // Sans ce chargement, la grille du primaire afficherait l'amorce du pays le
  // temps que la liste de l'école arrive : les matières renommées auraient
  // clignoté vers leurs anciens noms.
  await discPrimaireStore.load()
  await edtStore.loadData()

  // ⚠️ APRÈS `loadData`, jamais avant. Proposer les fériés déclenche un
  // `saveToStorage()` : placé plus haut, il écrivait l'état INITIAL du store
  // — emploi du temps vide, `setupStep` à zéro — par-dessus les données de
  // l'école, que `loadData` restaurait ensuite fidèlement… vides. Mesuré sur la
  // démo : 636 cours devenus 0. Sur une vraie école, c'était son emploi du
  // temps effacé à la simple ouverture de l'écran.
  proposerFeriesSiBesoin()

  timeGridForm.value = { ...edtStore.timeGrid }

  if (edtStore.setupStep === 0) {
    edtStore.setSetupStep(1)
  }

  if (edtStore.setupStep >= 5 && classesStore.classes.length > 0 && !selectedClassForView.value) {
    selectedClassForView.value = classesStore.classes[0].id
  }

  // Enseignant : forcer l'onglet "par-enseignant" et pré-sélectionner son profil
  if (authStore.isTeacher && teacherStaffRecord.value) {
    activeTab.value = 'par-enseignant'
    selectedTeacherForView.value = teacherStaffRecord.value.id
  }

  // Update time every minute
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

watch(() => edtStore.setupStep, (newStep) => {
  if (newStep < 5 && newStep > 0) {
    timeGridForm.value = { ...edtStore.timeGrid }
  }
})
</script>

<style scoped>
.edt-page {
  max-width: 1200px;
  margin: 0 auto;
}

.progress-container {
  margin-bottom: 32px;
}
.progress-bar-track {
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}
.progress-bar-fill {
  height: 100%;
  background: var(--pr);
  transition: width 0.3s ease;
}
.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.progress-step {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx3);
  background: #fff;
  transition: all 0.2s ease;
}
.progress-step.step-active {
  border-color: var(--pr);
  color: var(--pr);
  background: rgba(var(--pr-rgb), 0.08);
}
.progress-step.step-current {
  background: var(--pr);
  color: #fff;
  border-color: var(--pr);
}

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(var(--pr-rgb), 0.06);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--tx2);
}
.info-banner svg {
  color: var(--pr);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-hint-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(var(--pr-rgb), 0.05);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  border-radius: 10px;
  margin-bottom: 20px;
}
.info-hint-banner p {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
  line-height: 1.5;
}
.info-hint-banner svg {
  color: var(--pr);
  flex-shrink: 0;
  margin-top: 1px;
}

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(249, 115, 22, 0.06);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 8px;
  margin-top: 16px;
  font-size: 13px;
  color: #92400e;
}
.warning-banner svg {
  color: #f97316;
  flex-shrink: 0;
  margin-top: 1px;
}
.warning-banner p {
  font-weight: 600;
}
.warning-banner li {
  margin-bottom: 4px;
}

.wizard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
.wizard-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--brd);
  overflow: hidden;
}
.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--brd);
}
.card-header h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}
.card-body {
  padding: 20px 24px;
}

.day-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--tx);
}
.checkbox-label input {
  cursor: pointer;
}

.field {
  margin-bottom: 16px;
}
.field:last-child {
  margin-bottom: 0;
}
.field label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 6px;
}
.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--brd);
  border-radius: 8px;
  font-size: 14px;
  color: var(--tx);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}
.input:focus {
  border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.1);
}
.input-number {
  text-align: center;
}
.input-sm {
  padding: 8px 10px;
  font-size: 13px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.field-row:last-child {
  margin-bottom: 0;
}
.field-row .field {
  margin-bottom: 0;
}

.breaks-list {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--brd);
}
.break-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
}
.break-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.break-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
}
.break-time {
  font-size: 12px;
  color: var(--tx3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}
.btn-primary {
  background: var(--pr);
  color: #fff;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-outline {
  background: transparent;
  border: 1px solid var(--brd);
  color: var(--tx);
}
.btn-outline:hover {
  background: rgba(0, 0, 0, 0.02);
  border-color: var(--tx3);
}
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
.btn-lg {
  padding: 14px 24px;
  font-size: 15px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--tx3);
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--tx);
}
.icon-btn-sm {
  width: 28px;
  height: 28px;
}

.preview-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}
.preview-slot {
  padding: 8px 12px;
  background: rgba(var(--pr-rgb), 0.08);
  border: 1px solid rgba(var(--pr-rgb), 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: var(--pr);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.preview-slot-clickable {
  cursor: pointer;
  transition: background 0.15s;
}
.preview-slot-clickable:hover {
  background: rgba(var(--pr-rgb), 0.14);
}
.preview-slot-num {
  width: 22px;
  height: 22px;
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
.preview-slot-time {
  flex: 1;
}
.preview-slot-delete {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.preview-slot:hover .preview-slot-delete {
  opacity: 0.6;
}
.preview-slot-delete:hover {
  opacity: 1 !important;
  background: rgba(239, 68, 68, 0.1);
}
.preview-break {
  padding: 8px 12px;
  background: repeating-linear-gradient(45deg, #fef9c3, #fef9c3 5px, #fef3c7 5px, #fef3c7 10px);
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.preview-break-icon {
  font-size: 14px;
  font-weight: 700;
}
/* Editable break items */
.break-item-editable {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.break-edit-label {
  flex: 1;
  min-width: 100px;
}
.break-edit-time {
  width: 95px;
}
.break-edit-sep {
  color: var(--tx3);
  font-weight: 500;
}
.preview-empty {
  text-align: center;
  padding: 20px;
  color: var(--tx3);
  font-size: 13px;
}
.preview-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--brd);
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.stat-value {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--pr);
}

.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.table th {
  padding: 12px 8px;
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
  border-bottom: 1px solid var(--brd);
  background: #f8fafc;
}
.table td {
  padding: 10px 8px;
  font-size: 13px;
  color: var(--tx);
  border-bottom: 1px solid var(--divider);
}
.td-subject {
  font-weight: 600;
  min-width: 140px;
}
.td-number {
  text-align: center;
}
.td-total {
  font-weight: 600;
  text-align: center;
  background: #f8fafc;
}

.totals-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  padding-top: 16px;
  padding-bottom: 16px;
  border-top: 1px solid var(--brd);
  align-items: center;
}
.totals-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
}
.totals-cell {
  padding: 8px;
  text-align: center;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  background: #f8fafc;
  border-radius: 6px;
  color: var(--pr);
  cursor: help;
}
.totals-cell.overload {
  background: rgba(217, 48, 37, 0.08);
  color: #d93025;
  border: 1px solid rgba(217, 48, 37, 0.2);
}

.assignments-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.assignment-row {
  display: grid;
  grid-template-columns: 140px 200px 1fr;
  gap: 16px;
  align-items: start;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}
.assignment-subject {
  display: flex;
  align-items: center;
}
.subject-name {
  font-weight: 600;
  color: var(--tx);
}
.assignment-teacher {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.assignment-teacher .input {
  width: 100%;
}
.teacher-warning {
  font-size: 11px;
  color: #f97316;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
.assignment-classes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.classes-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.class-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--tx2);
}
.class-checkbox input {
  cursor: pointer;
}
.classes-hint {
  font-size: 12px;
  color: var(--tx3);
  font-style: italic;
}

.teacher-load-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.teacher-load-card {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--brd);
}
.teacher-load-name {
  font-weight: 600;
  color: var(--tx);
  margin-bottom: 6px;
  font-size: 13px;
}
.teacher-load-hours {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  background: rgba(var(--pr-rgb), 0.1);
  color: var(--pr);
}
.badge-success {
  background: rgba(27, 138, 90, 0.1);
  color: #1b8a5a;
}
.badge-warning {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}
.badge-danger {
  background: rgba(217, 48, 37, 0.1);
  color: #d93025;
}

.generation-log {
  margin: 24px 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--brd);
  max-height: 200px;
  overflow-y: auto;
}
.log-entry {
  font-size: 12px;
  color: var(--tx2);
  line-height: 1.6;
  font-family: 'Poppins', monospace;
}

.generation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 24px 0;
}
.stat-block {
  padding: 16px;
  background: rgba(27, 138, 90, 0.06);
  border: 1px solid rgba(27, 138, 90, 0.2);
  border-radius: 8px;
}
.stat-block.warning {
  background: rgba(249, 115, 22, 0.06);
  border-color: rgba(249, 115, 22, 0.2);
}
.stat-block .stat-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
  margin-bottom: 6px;
}
.stat-block .stat-value {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #1b8a5a;
}
.stat-block.warning .stat-value {
  color: #f97316;
}
.stat-block.success {
  background: rgba(27, 138, 90, 0.08);
  border-color: rgba(27, 138, 90, 0.3);
}
.stat-block.success .stat-value {
  color: #1b8a5a;
}
.stat-block.info {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.2);
}
.stat-block.info .stat-value {
  color: #3b82f6;
}

.generation-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  margin-top: 24px;
}

.wizard-nav {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  margin-top: 32px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--brd);
}
.page-header-text {
  flex: 1;
}
.page-header-text h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--tx);
  margin: 0 0 4px;
}
.page-header-text p {
  font-size: 13px;
  color: var(--tx3);
  margin: 0;
}
.page-header-actions {
  display: flex;
  gap: 12px;
}

.stat-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid var(--brd);
  border-radius: 10px;
}
.stat-bar-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.stat-bar-value {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--tx);
}
.stat-bar-label {
  font-size: 11px;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tabs-bar {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--brd);
}
.tab-button {
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: var(--tx3);
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.15s ease;
  margin-bottom: -2px;
}
.tab-button.active {
  color: var(--pr);
  border-bottom-color: var(--pr);
}
.tab-button:hover {
  color: var(--tx);
}

.selector-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.selector-spacer {
  flex: 1;
}

.timetable-grid {
  display: grid;
  gap: 2px;
  padding: 20px 24px;
}
.timetable-header {
  background: var(--pr);
  color: #fff;
  padding: 8px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.timetable-slot-label {
  background: #f8fafc;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--tx3);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 600;
}
.timetable-cell {
  min-height: 52px;
  padding: 4px;
  border-radius: 6px;
  font-size: 11px;
  cursor: default;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 2px;
  transition: all 0.15s ease;
}
.timetable-cell.filled {
  color: #fff;
  font-weight: 500;
}
.timetable-cell.empty {
  background: #f1f5f9;
}
.cell-subject {
  font-weight: 600;
  font-size: 12px;
}
.cell-teacher {
  font-size: 10px;
  opacity: 0.9;
}
.cell-class {
  font-size: 10px;
  opacity: 0.9;
}
.cell-entry {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
}

/* Break rows in timetable */
.timetable-break-label {
  font-size: 10px;
  color: var(--tx3);
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef3c7;
  border-bottom: 1px solid #e2e8f0;
}
.timetable-break-cell {
  background: repeating-linear-gradient(
    -45deg,
    #fef9c3,
    #fef9c3 4px,
    #fef3c7 4px,
    #fef3c7 8px
  );
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
  min-height: 28px;
}
.break-text {
  font-size: 11px;
  color: #92400e;
  font-weight: 500;
  white-space: nowrap;
}

/* Day cancelled */
.day-cancelled {
  position: relative;
  background: #f1f5f9 !important;
}
.day-cancelled .day-name,
.day-cancelled .day-date {
  color: #94a3b8;
}
.day-cancelled-badge {
  display: inline-block;
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  background: #ef4444;
  padding: 1px 8px;
  border-radius: 10px;
  margin-top: 2px;
}

/* Conflict banner */
/* Regeneration toast */
.regen-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  animation: slideIn 0.3s ease;
}
.regen-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}
.regen-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Spin animation for loader */
.spin-icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Current time indicator */
.current-slot {
  position: relative;
  color: #dc2626 !important;
  font-weight: 700;
}
.current-time-dot {
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
}
.cell-current-slot {
  box-shadow: inset 0 2px 0 #dc2626;
}

/* Today column highlight */
.day-today {
  background: rgba(59, 130, 246, 0.08) !important;
  font-weight: 700;
}

/* Holiday cells */
.cell-holiday {
  background: #f1f5f9 !important;
  cursor: default !important;
}
.cell-holiday-text {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Missing teacher highlight */
.teacher-missing {
  color: #dc2626;
  font-style: italic;
  font-weight: 600;
}

/* Charge sans contrat déclaré : on affiche, on ne juge pas. */
.badge-neutral { background: var(--bg2, #f3f4f6); color: var(--tx2, #6b7280); }

/* Férié : bascule « cours suspendus / cours maintenus ». */
.holiday-toggle { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; color: var(--tx2); cursor: pointer; }

/* Indisponibilités : compact, sous la charge de l'enseignant. */
.unavail { margin-top: 8px; border-top: 1px solid var(--bd, #e5e7eb); padding-top: 6px; }
.unavail-none { font-size: 11px; color: var(--tx3, #9ca3af); font-style: italic; }
.unavail-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11.5px; padding: 2px 0; }
.unavail-del { background: none; border: 0; cursor: pointer; color: #b91c1c; display: inline-flex; padding: 2px; }
.unavail-add { display: flex; gap: 4px; align-items: center; margin-top: 6px; flex-wrap: wrap; }
.input-xs { font-size: 11.5px; padding: 3px 5px; height: auto; max-width: 96px; }
.unavail-err { font-size: 11px; color: #b91c1c; margin-top: 4px; }

/* Doublon d'enseignant : la cellule le dit là où il est, tant qu'il dure. */
.teacher-clash {
  color: #b91c1c;
  font-weight: 700;
  text-decoration: underline wavy #b91c1c;
  text-underline-offset: 2px;
}

/* Drag & Drop */
.timetable-cell.filled[draggable="true"] {
  cursor: grab;
}
.timetable-cell.filled[draggable="true"]:active {
  cursor: grabbing;
}
.timetable-cell.dragging-source {
  opacity: 0.4;
  outline: 2px dashed #94a3b8;
}
.timetable-cell.drag-over {
  outline: 2px solid var(--pr);
  outline-offset: -2px;
  background: rgba(var(--pr-rgb), 0.1) !important;
}

/* Move confirmation modal */
.move-conflict-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
}
.move-conflict-list {
  list-style: disc;
  padding-left: 24px;
  margin: 0 0 12px;
  font-size: 13px;
  color: #7f1d1d;
}
.move-conflict-list li {
  margin-bottom: 4px;
}

.conflict-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
}
.auto-resolve-toast {
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}
.auto-resolve-toast.ok { background: rgba(27,138,90,.08); border: 1px solid rgba(27,138,90,.2); color: #1B8A5A; }
.auto-resolve-toast.warn { background: rgba(184,137,42,.08); border: 1px solid rgba(184,137,42,.2); color: #8A6410; }
.miapo-analysis { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: rgba(var(--pr-rgb), .05); border: 1px solid rgba(var(--pr-rgb), .18); }
.ma-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--pr); margin-bottom: 8px; }
.ma-rec { padding: 8px 0; border-top: 1px solid rgba(var(--pr-rgb), .12); }
.ma-rec:first-of-type { border-top: none; }
.ma-rec strong { display: block; font-size: 13.5px; color: var(--tx); margin-bottom: 2px; }
.ma-rec p { margin: 0; font-size: 13px; color: var(--tx2); line-height: 1.5; }
.conflict-banner-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #b91c1c;
  font-weight: 600;
  font-size: 14px;
}
.conflict-banner-header .btn {
  margin-left: auto;
}
.conflict-banner-header .btn + .btn {
  margin-left: 8px;
}
.conflict-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.conflict-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 6px 10px;
  background: #fff;
  border-radius: 8px;
}
.conflict-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.conflict-teacher { background: #ef4444; }
.conflict-unplaced { background: #f59e0b; }
.conflict-message { color: #374151; }

/* Week navigation */
.week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 0;
}
.week-label {
  font-weight: 600;
  font-size: 14px;
  min-width: 200px;
  text-align: center;
  color: var(--tx1);
}

/* Level overrides */
.level-overrides-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.level-override-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.level-override-name {
  font-weight: 600;
  font-size: 14px;
  min-width: 60px;
}
.level-override-config {
  display: flex;
  align-items: center;
  gap: 16px;
}
.checkbox-compact {
  font-size: 13px;
  gap: 6px;
}
.level-override-time {
  display: flex;
  align-items: center;
}
.input-sm {
  padding: 4px 8px;
  font-size: 12px;
  height: 30px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--tx3);
}
.empty-state p {
  margin: 0;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.modal-card {
  width: 100%;
  max-width: 400px;
  padding: 0;
  animation: modalIn 0.2s ease;
}
.modal-sm {
  max-width: 400px;
}
@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--brd);
}
.modal-header h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--tx);
  margin: 0;
}
.modal-body {
  padding: 24px;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .wizard-grid {
    grid-template-columns: 1fr;
  }
  .assignment-row {
    grid-template-columns: 1fr;
  }
  .stat-bar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .page-header-actions {
    width: 100%;
  }
  .btn {
    width: 100%;
    justify-content: center;
  }
}

@media print {
  .page-header-actions,
  .wizard-nav,
  .tabs-bar,
  .selector-bar {
    display: none;
  }
  .timetable-grid {
    font-size: 9px;
  }
}

/* Step 3 multi-teacher */
.assignment-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--divider);
}
.assignment-section:last-child { border-bottom: none; }
.assignment-subject-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.subject-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.subject-levels-hint {
  font-size: 12px;
  color: var(--tx3);
  margin-left: auto;
}
.assignment-entry {
  background: rgba(0,0,0,.02);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.assignment-teacher-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.teacher-name-tag {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
}
.add-teacher-row {
  margin-top: 8px;
}
.add-teacher-row select {
  max-width: 300px;
}
.teacher-warning {
  display: block;
  font-size: 12px;
  color: var(--danger);
  margin-top: 6px;
}

/* Slot editor */
.slot-editor-info {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 16px;
}
.slot-conflict-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  color: #b91c1c;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(0,0,0,.03);
  border-radius: 8px;
}

/* Timetable cells - clickable */
.timetable-cell {
  cursor: pointer;
  transition: all 0.15s ease;
}
.timetable-cell:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 2px var(--pr);
}
.cell-empty-hint {
  font-size: 18px;
  color: var(--tx3);
  opacity: 0;
  transition: opacity 0.15s;
}
.timetable-cell:hover .cell-empty-hint {
  opacity: 1;
}

/* Events tab */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.event-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: rgba(0,0,0,.02);
  border-radius: 10px;
  transition: background 0.1s;
}
.event-item:hover {
  background: rgba(0,0,0,.04);
}
.event-date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--pr);
  color: white;
  border-radius: 10px;
  flex-shrink: 0;
}
.holiday-badge {
  background: var(--danger);
}
.event-day {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.event-month {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.event-info {
  flex: 1;
  min-width: 0;
}
.event-title {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
}
.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.event-desc {
  font-size: 12px;
  color: var(--tx3);
}

/* Day header with date */
.timetable-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.day-name {
  font-weight: 700;
  font-size: 13px;
}
.day-date {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.7;
}

/* Print header (hidden normally, shown only in print) */
.timetable-print-header {
  display: none;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 4px;
}
.timetable-print-school {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}
.timetable-print-class {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}
.timetable-print-week {
  font-size: 12px;
  color: #64748b;
}

/* ═══ MOBILE RESPONSIVENESS ═══ */
@media (max-width: 768px) {
  /* Hide edit/wizard UI on mobile, show read-only daily view */
  .wizard-nav { display: none; }
  .page-header-actions { flex-direction: column; align-items: stretch; }
  .page-header-actions .btn { width: 100%; }

  /* Toolbar stacks vertically */
  .selector-bar { flex-direction: column; align-items: stretch; gap: 12px; }
  .selector-bar .field { margin-bottom: 0; }
  .selector-bar .field select { width: 100%; font-size: 16px; min-height: 44px; }

  /* Timetable scrolls horizontally on mobile */
  .timetable-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
  .timetable-grid { font-size: 11px; min-width: 600px; }
  .timetable-grid th { padding: 8px 6px; font-size: 10px; }
  .timetable-grid td { padding: 6px 4px; }

  /* Tab bar scrolls horizontally */
  .tabs-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
  .tab-item { flex-shrink: 0; white-space: nowrap; }

  /* Read-only daily view for mobile */
  .daily-view-mobile { display: flex; flex-direction: column; gap: 12px; }
  .daily-slot { padding: 12px; background: rgba(0,0,0,.02); border-radius: 8px; font-size: 13px; }
  .daily-slot strong { display: block; margin-bottom: 4px; }
  .daily-slot-teacher { font-size: 12px; color: var(--tx2); }

  /* Touch targets 44px minimum */
  .timetable-cell { min-height: 44px; display: flex; align-items: center; justify-content: center; }

  /* Week navigation compacted */
  .week-nav { padding: 12px 16px; }
  .week-nav button { padding: 6px 12px; font-size: 13px; }

  /* Conflict banner stays visible */
  .conflict-banner { margin: 12px 16px; font-size: 12px; padding: 10px 12px; }

  /* Assignment sections on mobile */
  .assignment-entry { padding: 12px; margin-bottom: 8px; }
  .add-teacher-row select { max-width: 100%; width: 100%; }

  /* Event date badge smaller on mobile */
  .event-date-badge { width: 40px; height: 40px; font-size: 14px; }
  .event-day { font-size: 16px; }
}
</style>

<style>
/* Print styles — unscoped to override layout components */
/* Actual class names: .sidebar (AppSidebar), .header (AppHeader), .layout-main, .layout-content */
body.printing-timetable .sidebar,
body.printing-timetable .header,
body.printing-timetable .page-header,
body.printing-timetable .stat-bar,
body.printing-timetable .tabs-bar,
body.printing-timetable .week-nav,
body.printing-timetable .conflict-banner,
body.printing-timetable .selector-bar,
body.printing-timetable .regen-toast,
body.printing-timetable .page-header-actions {
  display: none !important;
}
body.printing-timetable .layout-main {
  margin-left: 0 !important;
  padding: 0 !important;
}
body.printing-timetable .layout-content {
  padding: 0 !important;
}
body.printing-timetable .timetable-print-header {
  display: flex !important;
}
body.printing-timetable .timetable-card {
  box-shadow: none !important;
  border: none !important;
}

@media print {
  .sidebar,
  .header,
  .page-header,
  .stat-bar,
  .tabs-bar,
  .week-nav,
  .conflict-banner,
  .selector-bar,
  .regen-toast,
  .page-header-actions {
    display: none !important;
  }
  .layout-main {
    margin-left: 0 !important;
    padding: 0 !important;
  }
  .layout-content {
    padding: 0 !important;
  }
  .timetable-print-header {
    display: flex !important;
  }
  .timetable-card {
    box-shadow: none !important;
    border: none !important;
  }
  .timetable-cell {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .current-time-dot,
  .cell-current-slot {
    box-shadow: none !important;
  }
  .current-slot {
    color: inherit !important;
    font-weight: inherit !important;
  }
}
</style>
