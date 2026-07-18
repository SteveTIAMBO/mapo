<template>
  <div class="miapo-shell">
    <!-- Fond sombre quand le menu coulissant est ouvert (mobile) -->
    <div v-if="menuOpen" class="volet-backdrop" @click="menuOpen = false"></div>

    <!-- ───────── Volet menu (sidebar sur PC ; hamburger coulissant sur mobile) ───────── -->
    <aside class="volet" :class="{ open: menuOpen, collapsed: voletCollapsed }">
      <div class="volet-brand">
        <div class="brand-ic"><Sparkles :size="18" /></div>
        <div class="brand-tx"><strong>MAPO+</strong><small>{{ L.brandSub }}</small></div>
        <button type="button" class="volet-close" @click="menuOpen = false" aria-label="Fermer le menu"><X :size="20" /></button>
      </div>
      <!-- Replier le menu en icônes (desktop) — le menu reste fixe. -->
      <button type="button" class="volet-collapse" @click="toggleCollapse" :title="voletCollapsed ? t('mia.expandMenu') : t('mia.collapseMenu')">
        <PanelLeftClose v-if="!voletCollapsed" :size="18" /><PanelLeftOpen v-else :size="18" />
        <span>{{ t('mia.collapseMenu') }}</span>
      </button>

      <!-- Sélecteur d'enfant (parent multi-enfants uniquement) -->
      <div v-if="enfants.length && !isApprenant" class="volet-child">
        <select v-if="enfants.length > 1" v-model="activeId" class="child-select">
          <option v-for="e in enfants" :key="e.id" :value="e.id">{{ e.firstName }} · {{ niveauLabel(e) }}</option>
        </select>
        <div v-else class="child-single">{{ activeEnfant?.firstName }} <span>{{ niveauLabel(activeEnfant) }}</span></div>
      </div>

      <nav class="volet-nav">
        <button v-for="s in SECTIONS" :key="s.key" class="nav-item" :class="{ active: section === s.key }" @click="section = s.key; menuOpen = false">
          <component :is="s.icon" :size="18" />
          <span>{{ s.label }}</span>
        </button>
      </nav>
      <div class="volet-bottom">
        <button type="button" class="nav-item" :class="{ active: section === 'profil' }" @click="section = 'profil'; menuOpen = false">
          <Settings :size="18" />
          <span>{{ t('mia.secProfile') }}</span>
        </button>
        <button type="button" class="volet-logout" @click="logout"><LogOut :size="17" /> <span>{{ t('mia.logout') }}</span></button>
      </div>
    </aside>

    <!-- ───────── Contenu ───────── -->
    <main class="miapo-main">
      <!-- Aucun enfant : accueil d'amorçage -->
      <div v-if="!enfants.length" class="card intro-card">
        <div class="intro-icon"><Sparkles :size="26" /></div>
        <h2>{{ L.introTitle }}</h2>
        <p>{{ L.introText }}</p>
        <button class="btn btn-primary" @click="openAdd"><Plus :size="16" /> <span>{{ L.introBtn }}</span></button>
      </div>

      <template v-else-if="activeEnfant">
        <header class="main-head">
          <h1>{{ currentSection.label }}</h1>
          <button v-if="!isApprenant" class="btn btn-outline btn-sm" @click="openAdd"><Plus :size="15" /> <span>{{ t('mia.addChild') }}</span></button>
        </header>

        <!-- Bascule « mode Netflix » : confier le téléphone à l'enfant / revenir au parent -->
        <MiapoProfilSwitch :enfant="activeEnfant" />

        <!-- ========== ACCUEIL ========== -->
        <section v-if="section === 'accueil'" class="sec">
          <div class="card child-card">
            <div class="child-avatar" :class="activeEnfant.gender === 'F' ? 'av-f' : 'av-m'">{{ initials }}</div>
            <div class="child-info">
              <h2>{{ activeEnfant.firstName }} {{ activeEnfant.lastName }}</h2>
              <div class="child-meta"><span>{{ niveauLabel(activeEnfant) }}</span><span class="sep">·</span><span>{{ paysLabel(activeEnfant.pays) }}</span></div>
            </div>
          </div>

          <div class="card insight-card">
            <div class="insight-icon"><Sparkles :size="20" /></div>
            <div><strong>{{ t('mia.watchPoints') }}</strong><p>{{ insight }}</p></div>
          </div>

          <div class="stat-grid">
            <div class="stat" role="button" tabindex="0" @click="section = 'enfants'" @keyup.enter="section = 'enfants'"><span class="stat-v">{{ moyenne ?? '—' }}</span><span class="stat-l">{{ t('mia.avgOf20') }}</span></div>
            <div class="stat" role="button" tabindex="0" @click="section = 'tuteur'" @keyup.enter="section = 'tuteur'"><span class="stat-v" :class="{ warn: aReviser.length }">{{ aReviser.length }}</span><span class="stat-l">{{ t('mia.toReview') }}</span></div>
            <div class="stat" role="button" tabindex="0" @click="section = 'profil6c'" @keyup.enter="section = 'profil6c'"><span class="stat-v">{{ hasEval ? t('mia.done') : '—' }}</span><span class="stat-l">{{ t('mia.profile6c') }}</span></div>
          </div>

          <div v-if="hasEval" class="card radar-dash" role="button" tabindex="0" @click="section = 'profil6c'">
            <div class="card-head"><Target :size="18" /><h3>{{ t('mia.profile6c') }}</h3></div>
            <Radar6C :scores="activeEnfant.comp6c || {}" />
          </div>

          <!-- Plan de cours généré par MIAPO (apprenant hors-catalogue) -->
          <div v-if="coursPlan.length" class="card cplan-card">
            <div class="card-head"><CalendarDays :size="18" /><h3>{{ t('mia.myCoursePlan') }}</h3><span class="ia-badge"><Sparkles :size="12" /> MIAPO</span></div>
            <div class="cplan-list">
              <div v-for="(p, i) in coursPlan" :key="i" class="cplan-step">
                <div class="ps-head"><span class="ps-per">{{ p.periode }}</span><button v-if="p.module && isApprenant" class="ps-mod" @click="goRevise(p.module)"><Sparkles :size="12" /> {{ p.module }}</button><span v-else-if="p.module" class="ps-mod-static">{{ p.module }}</span></div>
                <p v-if="p.objectif" class="ps-obj">{{ p.objectif }}</p>
                <ul v-if="p.actions.length" class="ps-actions"><li v-for="(a, j) in p.actions" :key="j">{{ a }}</li></ul>
              </div>
            </div>
          </div>

          <div class="quick">
            <button class="btn btn-primary" @click="section = 'tuteur'"><GraduationCap :size="16" /> <span>{{ t('mia.startRevision') }}</span></button>
            <button class="btn btn-outline" @click="section = 'orientation'"><Compass :size="16" /> <span>{{ t('mia.exploreOrientation') }}</span></button>
          </div>
        </section>

        <!-- ========== MES ENFANTS ========== -->
        <section v-else-if="section === 'enfants'" class="sec">
          <div class="card">
            <div class="card-head"><Users :size="18" /><h3>{{ isApprenant ? t('mia.myProfileTitle') : t('mia.profilesTitle') }}</h3></div>
            <div class="enfant-list">
              <button v-for="e in enfants" :key="e.id" class="enfant-row" :class="{ active: e.id === activeId }" @click="activeId = e.id">
                <span class="er-avatar" :class="e.gender === 'F' ? 'av-f' : 'av-m'">{{ (e.firstName[0] || '') + (e.lastName[0] || '') }}</span>
                <span class="er-info"><strong>{{ e.firstName }} {{ e.lastName }}</strong><small>{{ niveauLabel(e) }} · {{ paysLabel(e.pays) }}</small></span>
                <Trash2 v-if="e.id === activeId" :size="16" class="er-del" @click.stop="confirmRemove" />
              </button>
            </div>
            <button v-if="!isApprenant" class="btn btn-outline btn-sm add-child" @click="openAdd"><Plus :size="15" /> <span>{{ t('mia.addChild') }}</span></button>
          </div>

          <!-- Co-parent : l'autre parent accède à la même scolarité -->
          <MiapoCoParent v-if="!isApprenant" />

          <!-- Notes -->
          <div class="card">
            <div class="card-head"><FileText :size="18" /><h3>{{ isApprenant ? t('mia.yourNotes') : t('mia.notesOf', { name: activeEnfant.firstName }) }}</h3></div>
            <div v-if="activeEnfant.notes.length" class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}</span>
                <span class="nr-note" :class="noteClass(n.note)">{{ n.note }}/20</span>
                <button class="btn btn-ghost btn-xs" @click="store.removeNote(activeEnfant.id, n.id)"><X :size="14" /></button>
              </div>
            </div>
            <p v-else class="muted">{{ t('mia.noNotesHint') }}</p>
            <div class="add-note">
              <select v-model="newMatiere" class="input"><option value="" disabled>{{ isApprenant ? t('mia.moduleOrSubject') : t('mia.subjectPlaceholder') }}</option><option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option></select>
              <input v-model.number="newNote" type="number" min="0" max="20" step="0.5" class="input note-input" placeholder="/20" />
              <button class="btn btn-primary btn-sm" :disabled="!canAddNote" @click="addNote"><Plus :size="15" /></button>
            </div>
          </div>

          <!-- Lecture de copie -->
          <div class="card vision-card">
            <div class="card-head"><Camera :size="18" /><h3>{{ t('mia.readExamCopy') }}</h3></div>
            <div v-if="visionState === 'idle'" class="vision-pick">
              <p class="muted">{{ t('mia.visionPickHint') }}</p>
              <label class="btn btn-primary vision-btn"><Camera :size="16" /> <span>{{ t('mia.chooseTakePhoto') }}</span><input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickCopie" /></label>
            </div>
            <div v-else-if="visionState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>{{ t('mia.visionLoading') }}</p><small>{{ t('mia.fewSeconds') }}</small></div>
            <div v-else-if="visionState === 'done' && visionResult" class="vision-result">
              <div class="vr-head"><span class="vr-mat">{{ visionResult.matiere || t('mia.copyAnalyzed') }}</span><span v-if="visionResult.note !== null" class="vr-note" :class="noteClass(visionResult.note)">{{ visionResult.note }}/20</span></div>
              <div v-if="visionResult.points_faibles.length" class="vr-weak"><span class="reco-lab">{{ t('mia.weakPoints') }}</span><div class="chips"><span v-for="(p, i) in visionResult.points_faibles" :key="i" class="chip chip-w">{{ p }}</span></div></div>
              <p v-if="visionResult.conseil" class="reco-conseil"><Lightbulb :size="15" /> {{ visionResult.conseil }}</p>
              <div class="vr-actions">
                <button v-if="visionResult.matiere && visionResult.note !== null" class="btn btn-outline btn-sm" @click="addVisionNote"><Plus :size="14" /> <span>{{ t('mia.addNoteBtn') }}</span></button>
                <button v-if="visionResult.matiere && visionResult.points_faibles.length" class="btn btn-outline btn-sm" @click="addToRevisions"><Target :size="14" /> <span>{{ t('mia.addToReviews') }}</span></button>
                <button v-if="visionResult.matiere && isApprenant" class="btn btn-primary btn-sm" @click="goRevise(visionResult.matiere, visionResult.points_faibles)"><Sparkles :size="14" /> <span>{{ t('mia.reviseSubject', { subject: visionResult.matiere }) }}</span></button>
                <button class="btn btn-ghost btn-sm" @click="resetVision">{{ t('mia.otherCopy') }}</button>
              </div>
            </div>
            <div v-else-if="visionState === 'error'" class="err"><p>{{ visionError }}</p><button class="btn btn-outline btn-sm" @click="resetVision">{{ t('mia.retry') }}</button></div>
          </div>

          <!-- Lecture d'un bulletin (multi-matières → notes) -->
          <div class="card vision-card">
            <div class="card-head"><Camera :size="18" /><h3>{{ t('mia.readReportCard') }}</h3></div>
            <div v-if="bulletinState === 'idle'" class="vision-pick">
              <p class="muted">{{ t('mia.bulletinPickHint') }}</p>
              <label class="btn btn-primary vision-btn"><Camera :size="16" /> <span>{{ t('mia.chooseTakePhoto') }}</span><input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickBulletin" /></label>
            </div>
            <div v-else-if="bulletinState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>{{ t('mia.bulletinLoading') }}</p><small>{{ t('mia.fewSeconds') }}</small></div>
            <div v-else-if="bulletinState === 'done'" class="vision-result">
              <p v-if="!bulletinRows.length" class="muted">{{ t('mia.bulletinEmpty') }}</p>
              <template v-else>
                <p class="reco-lab">{{ t('mia.bulletinReview', { n: bulletinRows.length }) }}<span v-if="bulletinMoyenne !== null"> · {{ t('mia.bulletinAvg', { m: bulletinMoyenne }) }}</span></p>
                <div class="bull-list">
                  <div v-for="(r, i) in bulletinRows" :key="i" class="bull-row">
                    <input v-model="r.matiere" class="input bull-mat" />
                    <input v-model.number="r.note" type="number" min="0" max="20" step="0.5" class="input note-input" />
                    <button class="btn btn-ghost btn-xs" @click="bulletinRows.splice(i, 1)"><X :size="14" /></button>
                  </div>
                </div>
              </template>
              <div class="vr-actions">
                <button v-if="bulletinRows.length" class="btn btn-primary btn-sm" @click="addAllBulletinNotes"><Plus :size="14" /> <span>{{ t('mia.bulletinAddAll', { n: bulletinRows.length }) }}</span></button>
                <button class="btn btn-ghost btn-sm" @click="resetBulletin">{{ t('mia.otherCopy') }}</button>
              </div>
            </div>
            <div v-else-if="bulletinState === 'error'" class="err"><p>{{ bulletinError }}</p><button class="btn btn-outline btn-sm" @click="resetBulletin">{{ t('mia.retry') }}</button></div>
          </div>
        </section>

        <!-- ========== TUTEUR ========== -->
        <section v-else-if="section === 'tuteur'" class="sec">
          <div v-if="quizMatiere" class="card">
            <TuteurQuiz :matiere="quizMatiere" :niveau="quizNiveau" :student-id="activeEnfant.id" :themes="quizThemes" @quit="quizMatiere = ''; quizThemes = ''" />
          </div>
          <template v-else>
            <div v-if="aReviser.length" class="card">
              <div class="card-head"><Target :size="18" /><h3>{{ isApprenant ? t('mia.reviewPriorityLearner') : t('mia.reviewSubjectsParent') }}</h3><span class="obj-chip">{{ t('mia.targetChip', { n: objectif }) }}</span></div>
              <div class="weak-list">
                <component :is="isApprenant ? 'button' : 'div'" v-for="w in aReviser" :key="w.matiere" class="weak-item" :class="{ 'weak-static': !isApprenant }" @click="isApprenant && goRevise(w.matiere, w.themes)">
                  <span class="wi-name">{{ w.matiere }}<small v-if="w.themes.length" class="wi-themes"> · {{ w.themes.slice(0, 2).join(', ') }}</small></span>
                  <span class="wi-right"><span class="wi-level">{{ t('mia.levelN', { n: levelFor(w.matiere) }) }}</span><span v-if="w.note !== null" class="wi-note">{{ w.note }}/20</span><ChevronRight v-if="isApprenant" :size="18" /></span>
                </component>
              </div>
              <p v-if="!isApprenant" class="muted small wl-note">{{ t('mia.whatToWork', { name: activeEnfant.firstName }) }}</p>
            </div>

            <!-- Apprenant : lancer une révision OU ajouter une matière à réviser -->
            <div v-if="isApprenant" class="card">
              <div class="card-head"><GraduationCap :size="18" /><h3>{{ t('mia.privateLessonTitle') }}</h3></div>
              <p class="muted">{{ t('mia.privateLessonHint') }}</p>
              <div class="revise-pick">
                <select v-model="reviseMatiere" class="input"><option value="" disabled>{{ isApprenant ? t('mia.chooseModule') : t('mia.chooseSubject') }}</option><option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option></select>
                <button class="btn btn-outline" :disabled="!reviseMatiere" @click="demanderRevision"><Plus :size="15" /> <span>{{ t('mia.addToMyReviews') }}</span></button>
                <button class="btn btn-primary" :disabled="!reviseMatiere" @click="goRevise(reviseMatiere)"><Sparkles :size="15" /> <span>{{ t('mia.start') }}</span></button>
              </div>
              <p v-if="revisionDemandee" class="muted small saved-ok">{{ t('mia.addedToReview', { subject: revisionDemandee }) }}</p>
            </div>
            <!-- Parent : désigner une matière à réviser (sans la lancer) -->
            <div v-else class="card">
              <div class="card-head"><GraduationCap :size="18" /><h3>{{ t('mia.requestRevision') }}</h3></div>
              <p class="muted">{{ t('mia.requestRevisionHint', { name: activeEnfant.firstName }) }}</p>
              <div class="revise-pick">
                <select v-model="reviseMatiere" class="input"><option value="" disabled>{{ isApprenant ? t('mia.chooseModule') : t('mia.chooseSubject') }}</option><option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option></select>
                <button class="btn btn-primary" :disabled="!reviseMatiere" @click="demanderRevision"><Plus :size="15" /> <span>{{ t('mia.request') }}</span></button>
              </div>
              <p v-if="revisionDemandee" class="muted small saved-ok">{{ t('mia.addedToReview', { subject: revisionDemandee }) }}</p>
            </div>

            <!-- Prépa examen -->
            <div class="card prepa-card">
              <div class="card-head"><Trophy :size="18" /><h3>{{ t('mia.prepareExam') }}</h3></div>
              <div v-if="prepaState === 'idle'">
                <p class="muted">{{ t('mia.prepaHint', { name: activeEnfant.firstName }) }}</p>
                <button class="btn btn-outline" @click="getPrepa"><Trophy :size="16" /> <span>{{ t('mia.buildProgram') }}</span></button>
              </div>
              <div v-else-if="prepaState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>{{ t('mia.prepaLoading') }}</p></div>
              <div v-else-if="prepaState === 'done' && prepaResult" class="prepa-result">
                <div class="vr-head"><span class="vr-mat">{{ prepaResult.examen || t('mia.program') }}</span><span class="ia-badge"><Sparkles :size="12" /> MIAPO</span></div>
                <div class="prepa-plan">
                  <div v-for="(s, i) in prepaResult.plan" :key="i" class="etape">
                    <div class="etape-head"><span class="etape-num">{{ i + 1 }}</span><strong>{{ s.etape }}</strong></div>
                    <p v-if="s.objectif" class="etape-obj">{{ s.objectif }}</p>
                    <ul v-if="s.actions.length" class="etape-actions"><li v-for="(a, j) in s.actions" :key="j">{{ a }}</li></ul>
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" @click="prepaState = 'idle'">{{ t('mia.regenerate') }}</button>
              </div>
              <div v-else-if="prepaState === 'error'" class="err"><p>{{ prepaError }}</p><button class="btn btn-outline btn-sm" @click="prepaState = 'idle'">{{ t('mia.retry') }}</button></div>
            </div>
          </template>
        </section>

        <!-- ========== ANNALES ========== -->
        <section v-else-if="section === 'annales'" class="sec">
          <MiapoAnnales :enfant="activeEnfant" />
        </section>

        <!-- ========== FICHES + FLASHCARDS ========== -->
        <section v-else-if="section === 'fiches'" class="sec">
          <MiapoFiches :enfant="activeEnfant" />
        </section>

        <!-- ========== PROGRESSION ========== -->
        <section v-else-if="section === 'progression'" class="sec">
          <div class="card">
            <div class="card-head"><TrendingUp :size="18" /><h3>{{ t('mia.levelBySubject') }}</h3></div>
            <p class="muted">{{ t('mia.levelRises', { name: activeEnfant.firstName }) }}</p>
            <div v-if="progression.length" class="prog-list">
              <div v-for="p in progression" :key="p.matiere" class="prog-row">
                <span class="prog-mat">{{ p.matiere }}</span>
                <span class="prog-dots"><span v-for="i in 5" :key="i" class="dot" :class="{ on: i <= p.level }"></span></span>
                <span class="prog-lv">{{ t('mia.levShort', { n: p.level }) }}</span>
              </div>
            </div>
            <p v-else class="muted">{{ isApprenant ? t('mia.progEmptyLearner') : t('mia.progEmptyParent') }} <button class="lnk" @click="section = 'tuteur'">{{ t('mia.tutorWord') }}</button> {{ t('mia.progEmptyTail') }}</p>
          </div>

          <div v-if="activeEnfant.notes.length" class="card">
            <div class="card-head"><FileText :size="18" /><h3>{{ t('mia.notesOverview') }}</h3></div>
            <div class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}</span><span class="nr-note" :class="noteClass(n.note)">{{ n.note }}/20</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ========== ORIENTATION ========== -->
        <!-- ========== PROFIL 6C ========== -->
        <!-- ========== EMPLOI DU TEMPS ========== -->
        <section v-else-if="section === 'edt'" class="sec">
          <div v-if="veilleMatieres.length" class="card veille-card">
            <div class="card-head"><Sparkles :size="18" /><h3>{{ t('mia.edtVeilleTitle') }}</h3></div>
            <p class="muted small">{{ t('mia.edtVeilleSub', { jour: demainLabel }) }}</p>
            <div class="chips">
              <component :is="isApprenant ? 'button' : 'span'" v-for="m in veilleMatieres" :key="m" class="chip chip-w" @click="isApprenant && goRevise(m)">{{ m }}</component>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><CalendarDays :size="18" /><h3>{{ t('mia.edtTitle') }}</h3></div>
            <p class="muted small">{{ t('mia.edtHint') }}</p>

            <div class="edt-add">
              <select v-model="crJour" class="input"><option value="" disabled>{{ t('mia.edtDay') }}</option><option v-for="j in JOURS" :key="j.key" :value="j.key">{{ j.label }}</option></select>
              <input v-model="crHeure" type="time" class="input edt-time" />
              <input v-model="crMatiere" class="input" :placeholder="t('mia.edtSubject')" list="edt-mats" />
              <datalist id="edt-mats"><option v-for="m in matieresList" :key="m" :value="m" /></datalist>
              <button class="btn btn-primary btn-sm" :disabled="!crJour || !crMatiere.trim()" @click="ajouterCreneau"><Plus :size="15" /></button>
            </div>

            <label class="btn btn-outline btn-sm edt-scan"><Camera :size="15" /> <span>{{ edtScanning ? t('mia.edtScanning') : t('mia.edtScan') }}</span><input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickEdt" /></label>
            <p v-if="edtError" class="err-txt small">{{ edtError }}</p>

            <div v-if="edtParJour.length" class="edt-week">
              <div v-for="d in edtParJour" :key="d.key" class="edt-day">
                <div class="edt-day-h">{{ d.label }}</div>
                <div v-for="c in d.creneaux" :key="c.id" class="edt-cr">
                  <span class="edt-cr-h">{{ c.heure || '—' }}</span>
                  <span class="edt-cr-m">{{ c.matiere }}</span>
                  <button class="btn btn-ghost btn-xs" @click="store.removeCreneau(activeEnfant.id, c.id)"><X :size="13" /></button>
                </div>
              </div>
            </div>
            <p v-else class="muted small edt-empty">{{ t('mia.edtEmpty') }}</p>
          </div>
        </section>

        <section v-else-if="section === 'profil6c'" class="sec">
          <Miapo6C :enfant="activeEnfant" />
        </section>

        <section v-else-if="section === 'orientation'" class="sec">
          <MiapoOrientation :enfant="activeEnfant" @eval="section = 'profil6c'" />
        </section>

        <!-- ========== ABONNEMENT ========== -->
        <section v-else-if="section === 'abonnement'" class="sec">
          <div class="card abo-card">
            <div class="abo-ic"><Sparkles :size="24" /></div>
            <h2>{{ t('mia.aboTitle') }}</h2>
            <p>{{ isApprenant ? t('mia.aboTextLearner') : t('mia.aboTextParent', { name: activeEnfant.firstName }) }}</p>
            <ul class="abo-feats">
              <li><Check :size="15" /> {{ t('mia.aboFeat1') }}</li>
              <li><Check :size="15" /> {{ t('mia.aboFeat2') }}</li>
              <li><Check :size="15" /> {{ t('mia.aboFeat3') }}</li>
            </ul>
            <div class="abo-trial">
              <Sparkles :size="16" />
              <span>{{ isApprenant ? t('mia.aboTrialLearner') : t('mia.aboTrialParent', { name: activeEnfant.firstName }) }}</span>
            </div>
          </div>
        </section>

        <!-- ========== PROFIL (configuration) ========== -->
        <section v-else-if="section === 'profil'" class="sec">
          <!-- Profil du PARENT (mode parent) — d'abord -->
          <div v-if="!isApprenant" class="card">
            <div class="card-head"><Settings :size="18" /><h3>{{ t('mia.myParentProfile') }}</h3></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.firstName') }}</label><input v-model="parentProfil.firstName" class="input" /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.lastName') }}</label><input v-model="parentProfil.lastName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.email') }}</label><input :value="parentProfil.email" class="input" disabled /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.phone') }}</label><input v-model="parentProfil.phone" class="input" type="tel" :placeholder="t('mia.phonePlaceholder')" /></div>
            </div>
            <div class="compose-actions">
              <button class="btn btn-primary" @click="saveParentProfil"><Check :size="16" /> <span>{{ t('mia.save') }}</span></button>
              <span v-if="parentSaved" class="muted small saved-ok">{{ t('mia.saved') }}</span>
            </div>
          </div>

          <!-- Profil de l'ENFANT rattaché (ou de l'apprenant lui-même) — en dessous -->
          <div class="card">
            <div class="card-head"><Settings :size="18" /><h3>{{ isApprenant ? t('mia.myProfile') : t('mia.childProfileOf', { name: activeEnfant.firstName }) }}</h3></div>
            <div class="profil-photo">
              <span class="er-avatar pp-avatar" :class="profil.gender === 'F' ? 'av-f' : 'av-m'">
                <img v-if="profil.photoURL" :src="profil.photoURL" alt="" />
                <template v-else>{{ (profil.firstName[0] || '') + (profil.lastName[0] || '') }}</template>
              </span>
              <label class="btn btn-outline btn-sm"><Camera :size="15" /> <span>{{ t('mia.changePhoto') }}</span><input type="file" accept="image/*" style="display:none" @change="onPickPhoto" /></label>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.firstName') }}</label><input v-model="profil.firstName" class="input" /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.lastName') }}</label><input v-model="profil.lastName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.cycleLabel') }}</label><select v-model="profil.cycle" class="input"><option value="">—</option><option value="primaire">{{ t('mia.cyclePrimary') }}</option><option value="secondaire">{{ t('mia.cycleSecondary') }}</option><option value="superieur">{{ t('mia.cycleHigher') }}</option></select></div>
              <div class="form-group"><label class="form-label">{{ t('mia.classLabel') }}</label><select v-model="profil.niveau" class="input"><optgroup :label="t('mia.cyclePrimary')"><option v-for="n in NIVEAUX_PRIMAIRE" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleSecondary')"><option v-for="n in NIVEAUX_SECONDAIRE" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleHigher')"><option v-for="n in NIVEAUX_SUPERIEUR" :key="n" :value="n">{{ n }}</option></optgroup><option :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
            </div>
            <template v-if="profil.niveau === NIVEAU_HORS_CATALOGUE">
              <div class="form-row">
                <div class="form-group"><label class="form-label">{{ t('mia.formationName') }}</label><input v-model="profil.formation" class="input" :placeholder="t('mia.formationPlaceholder')" /></div>
                <div class="form-group"><label class="form-label">{{ t('mia.programUrl') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="profil.formationUrl" class="input" type="url" :placeholder="t('mia.programUrlPlaceholder')" /></div>
              </div>
              <div class="form-group"><label class="form-label">{{ t('mia.modulesSubjects') }} <span class="muted small">{{ t('mia.commaSeparated') }}</span></label><textarea v-model="profil.formationModules" class="input" rows="2" :placeholder="t('mia.modulesPlaceholder')"></textarea></div>
              <!-- Moteur de cours : MIAPO décompose la formation en modules + plan -->
              <div class="course-engine">
                <div class="ce-head"><Sparkles :size="15" /><strong>{{ t('mia.courseEngineTitle') }}</strong></div>
                <p class="ce-hint">{{ t('mia.courseEngineHint') }}</p>
                <textarea v-model="coursProgramme" class="input" rows="3" :placeholder="t('mia.coursePastePlaceholder')"></textarea>
                <div class="ce-actions">
                  <button class="btn btn-primary btn-sm" :disabled="coursLoading || !profil.formation.trim()" @click="genererPlanCours">
                    <Loader2 v-if="coursLoading" :size="15" class="spin" /><Sparkles v-else :size="15" />
                    <span>{{ coursLoading ? t('mia.courseGenerating') : t('mia.courseGenerate') }}</span>
                  </button>
                  <span v-if="coursMsg" class="muted small saved-ok">{{ coursMsg }}</span>
                </div>
              </div>
            </template>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.country') }}</label><select v-model="profil.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ t('mia.targetGrade') }}</label>
                <input v-model.number="profil.objectifNote" type="number" min="0" max="20" step="0.5" class="input" />
                <small class="muted small">{{ t('mia.targetGradeHint') }}</small>
              </div>
              <div class="form-group"><label class="form-label">{{ t('mia.school') }}</label><input v-model="profil.ecole" class="input" :placeholder="t('mia.schoolPlaceholder')" /></div>
              <div v-if="isNiveauSuperieur(profil.niveau)" class="form-group"><label class="form-label">{{ t('mia.filiere') }}</label><input v-model="profil.filiere" class="input" :placeholder="t('mia.filierePlaceholder')" /></div>
            </div>
            <div class="compose-actions">
              <button class="btn btn-primary" @click="saveProfil"><Check :size="16" /> <span>{{ t('mia.save') }}</span></button>
              <span v-if="profilSaved" class="muted small saved-ok">{{ t('mia.saved') }}</span>
            </div>
          </div>
        </section>
      </template>
    </main>

    <!-- ───────── Rail droit : agenda de révision (desktop large) ───────── -->
    <aside class="miapo-aside">
      <div class="aside-card">
        <div class="aside-head"><CalendarDays :size="17" /><h3>{{ t('mia.weekAgenda') }}</h3></div>
        <p class="aside-sub">{{ t('mia.weekAgendaSub') }}</p>
        <div class="agenda-days">
          <div v-for="d in planHebdo" :key="d.key" class="agenda-day" :class="{ today: d.today }">
            <div class="dy-date"><span class="dy-dow">{{ d.label }}</span><span class="dy-num">{{ d.date }}</span></div>
            <div class="dy-body">
              <button v-if="d.matiere && isApprenant" class="dy-exo" @click="goRevise(d.matiere)"><Sparkles :size="12" /> {{ d.matiere }}</button>
              <span v-else-if="d.matiere" class="dy-exo dy-static">{{ d.matiere }}</span>
              <span v-else class="dy-rest">{{ t('mia.restDay') }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="aside-card">
        <div class="aside-head"><Link2 :size="17" /><h3>{{ t('mia.myAgenda') }}</h3></div>
        <p class="aside-sub">{{ t('mia.myAgendaSub') }}</p>
        <input class="input aside-input" v-model="agendaUrl" :placeholder="t('mia.calendarUrlPlaceholder')" />
        <button class="btn btn-outline btn-sm aside-connect" type="button" @click="saveAgenda">{{ agendaSaved ? t('mia.connected') : t('mia.connect') }}</button>
        <p class="aside-note">{{ t('mia.syncSoon') }}</p>
      </div>
    </aside>

    <!-- Modal ajout enfant -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-card">
        <div class="modal-header"><h3>{{ isApprenant ? t('mia.createMyProfile') : t('mia.addMyChild') }}</h3><button class="btn btn-ghost btn-sm" @click="showAdd = false"><X :size="18" /></button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">{{ t('mia.firstName') }}</label><input v-model="form.firstName" class="input" :placeholder="t('mia.firstName')" /></div>
            <div class="form-group"><label class="form-label">{{ t('mia.lastName') }}</label><input v-model="form.lastName" class="input" :placeholder="t('mia.lastName')" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">{{ t('mia.sex') }}</label><select v-model="form.gender" class="input"><option value="M">{{ t('mia.boy') }}</option><option value="F">{{ t('mia.girl') }}</option></select></div>
            <div class="form-group"><label class="form-label">{{ t('mia.classLabel') }}</label><select v-model="form.niveau" class="input"><optgroup :label="t('mia.cyclePrimary')"><option v-for="n in NIVEAUX_PRIMAIRE" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleSecondary')"><option v-for="n in NIVEAUX_SECONDAIRE" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleHigher')"><option v-for="n in NIVEAUX_SUPERIEUR" :key="n" :value="n">{{ n }}</option></optgroup><option :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
          </div>
          <template v-if="form.niveau === NIVEAU_HORS_CATALOGUE">
            <div class="form-group"><label class="form-label">{{ t('mia.formationName') }}</label><input v-model="form.formation" class="input" :placeholder="t('mia.formationPlaceholder')" /></div>
            <div class="form-group"><label class="form-label">{{ t('mia.school') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="form.ecole" class="input" :placeholder="t('mia.schoolPlaceholder')" /></div>
            <div class="form-group"><label class="form-label">{{ t('mia.programUrl') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="form.formationUrl" class="input" type="url" :placeholder="t('mia.programUrlPlaceholder')" /></div>
            <div class="form-group">
              <label class="form-label">{{ t('mia.modulesSubjects') }} <span class="muted small">{{ t('mia.commaSeparated') }}</span></label>
              <textarea v-model="form.formationModules" class="input" rows="2" :placeholder="t('mia.modulesPlaceholderShort')"></textarea>
              <button type="button" class="btn btn-outline btn-sm propose-btn" :disabled="!form.formation.trim() || proposingModules" @click="proposerModules('form')"><component :is="proposingModules ? Loader2 : Sparkles" :size="14" :class="{ spin: proposingModules }" /> <span>{{ proposingModules ? t('mia.proposing') : t('mia.proposeModules') }}</span></button>
              <p v-if="proposeError" class="err-txt small">{{ proposeError }}</p>
            </div>
          </template>
          <template v-if="isNiveauSuperieur(form.niveau)">
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.school') }}</label><input v-model="form.ecole" class="input" :placeholder="t('mia.uniPlaceholder')" /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.filiere') }}</label><input v-model="form.filiere" class="input" :placeholder="t('mia.filierePlaceholder')" /></div>
            </div>
            <div class="form-group"><label class="form-label">{{ t('mia.mySubjects') }} <span class="muted small">{{ t('mia.commaSeparated') }}</span></label><textarea v-model="form.formationModules" class="input" rows="2" :placeholder="t('mia.uniSubjectsPlaceholder')"></textarea></div>
          </template>
          <div class="form-group"><label class="form-label">{{ t('mia.country') }}</label><select v-model="form.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select></div>
          <div class="compose-actions">
            <button class="btn btn-outline" @click="showAdd = false">{{ t('mia.cancel') }}</button>
            <button class="btn btn-primary" :disabled="!form.firstName.trim()" @click="doAdd"><Check :size="16" /> <span>{{ t('mia.createProfile') }}</span></button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore, NIVEAUX, NIVEAUX_PRIMAIRE, NIVEAUX_SECONDAIRE, NIVEAUX_SUPERIEUR, isNiveauSuperieur, NIVEAU_HORS_CATALOGUE, PAYS, MATIERES, matieresPourNiveau } from '../stores/enfantsAutonomes'
import { analyserBulletin, analyserEdt } from '../services/aiVision'
import { useTuteurStore } from '../stores/tuteur'
import { useMiapoAnalyticsStore } from '../stores/miapoAnalytics'
import { isMiapoTenant } from '../utils/tenantContext'
import TuteurQuiz from '../components/TuteurQuiz.vue'
import MiapoOrientation from '../components/MiapoOrientation.vue'
import Miapo6C from '../components/Miapo6C.vue'
import Radar6C from '../components/Radar6C.vue'
import MiapoAnnales from '../components/MiapoAnnales.vue'
import MiapoFiches from '../components/MiapoFiches.vue'
import MiapoCoParent from '../components/MiapoCoParent.vue'
import MiapoProfilSwitch from '../components/MiapoProfilSwitch.vue'
import { Sparkles, Plus, X, Check, Target, FileText, ChevronRight, Trash2, Camera, Loader2, Lightbulb, Compass, GraduationCap, Trophy, Users, TrendingUp, Home, CreditCard, LogOut, Settings, PanelLeftClose, PanelLeftOpen, CalendarDays, Link2, ClipboardList, Layers } from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
async function logout() { await authStore.logout(); router.push(isMiapoTenant() ? '/miapo' : '/login') }

const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()
const analytics = useMiapoAnalyticsStore()
const enfants = computed(() => store.enfants)

// Suivi d'adoption MAPO+ : marque l'install PWA. Défini ici pour pouvoir le
// retirer proprement au démontage (évite les écouteurs en double).
function onAppInstalled() { try { analytics.markInstalled() } catch { /* best-effort */ } }

// Mode apprenant : MAPO+ vu par l'apprenant lui-même (langage 1re/2e personne,
// profil unique = lui) plutôt que par un parent qui suit ses enfants. Même moteur.
const isApprenant = computed(() => store.mode === 'apprenant')
function setMode(m) { store.setMode(m) }

// Seules les classes qui passent un examen national ont des annales (pas 5ème, etc.).
function estClasseExamen(niveau) {
  const n = niveau || ''
  return n === 'CM2' || n === '3ème' || /^(1ère|Tle)/.test(n)
}
const SECTIONS = computed(() => [
  { key: 'accueil', label: t('mia.secHome'), icon: Home },
  { key: 'enfants', label: isApprenant.value ? t('mia.secMyNotes') : t('mia.secMyChildren'), icon: isApprenant.value ? FileText : Users },
  { key: 'tuteur', label: t('mia.secTutor'), icon: GraduationCap },
  ...(estClasseExamen(activeEnfant.value?.niveau) ? [{ key: 'annales', label: t('mia.secAnnales'), icon: ClipboardList }] : []),
  { key: 'fiches', label: t('mia.secFiches'), icon: Layers },
  { key: 'progression', label: t('mia.secProgress'), icon: TrendingUp },
  { key: 'edt', label: t('mia.secTimetable'), icon: CalendarDays },
  { key: 'profil6c', label: t('mia.sec6c'), icon: Target },
  { key: 'orientation', label: t('mia.secOrientation'), icon: Compass },
  { key: 'abonnement', label: t('mia.secSubscription'), icon: CreditCard },
])
const section = ref('accueil')
// Menu hamburger coulissant (mobile) — piloté par le bouton ⊞ de l'en-tête (AppLayout)
const menuOpen = ref(false)
function onToggleMenu() { menuOpen.value = !menuOpen.value }

// Menu repliable en icônes (desktop) — persisté ; le menu reste fixe (ne défile pas).
const voletCollapsed = ref(false)
function toggleCollapse() {
  voletCollapsed.value = !voletCollapsed.value
  try { localStorage.setItem('mapo_miapo_volet_collapsed', voletCollapsed.value ? '1' : '0') } catch { /* silent */ }
}

// ── Agenda perso (Google/Outlook) : on stocke le lien iCal ; la synchro des
// événements arrive ensuite (fetch via proxy pour contourner le CORS). ──
const agendaUrl = ref('')
const agendaSaved = ref(false)
function saveAgenda() {
  try { localStorage.setItem('mapo_miapo_agenda_url', agendaUrl.value.trim()) } catch { /* silent */ }
  agendaSaved.value = true
  setTimeout(() => { agendaSaved.value = false }, 2000)
}
const currentSection = computed(() => SECTIONS.value.find((s) => s.key === section.value) || SECTIONS.value[0])

// Libellés selon le mode (parent vs apprenant)
const L = computed(() => isApprenant.value ? {
  brandSub: t('mia.brandSubLearner'),
  introTitle: t('mia.introTitleLearner'),
  introText: t('mia.introTextLearner'),
  introBtn: t('mia.introBtnLearner'),
} : {
  brandSub: t('mia.brandSubParent'),
  introTitle: t('mia.introTitleParent'),
  introText: t('mia.introTextParent'),
  introBtn: t('mia.introBtnParent'),
})

const activeId = ref('')
const activeEnfant = computed(() => store.getEnfant(activeId.value) || enfants.value[0] || null)
// Si l'enfant actif n'est pas en classe d'examen, on ne reste pas bloqué sur l'onglet Annales.
watch(() => activeEnfant.value?.niveau, () => { if (section.value === 'annales' && !estClasseExamen(activeEnfant.value?.niveau)) section.value = 'accueil' })
const initials = computed(() => activeEnfant.value ? (activeEnfant.value.firstName[0] || '') + (activeEnfant.value.lastName[0] || '') : '')

// ── Profil (configuration : nom, photo, cycle, classe, pays, école) ──
const profil = ref({ firstName: '', lastName: '', gender: 'M', cycle: '', niveau: '3ème', pays: 'CM', ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '', photoURL: '', objectifNote: 10 })
// Objectif de note de l'enfant actif : toute note en dessous part en révision.
const objectif = computed(() => store.objectifDe(activeEnfant.value))
const profilSaved = ref(false)
function syncProfil() {
  const e = activeEnfant.value
  if (!e) return
  profil.value = {
    firstName: e.firstName || '', lastName: e.lastName || '', gender: e.gender || 'M',
    cycle: e.cycle || '', niveau: e.niveau || '3ème', pays: e.pays || 'CM',
    ecole: e.ecole || '', filiere: e.filiere || '', formation: e.formation || '', formationUrl: e.formationUrl || '', formationModules: e.formationModules || '', photoURL: e.photoURL || '',
    objectifNote: store.objectifDe(e),
  }
}
function onPickPhoto(ev) {
  const f = ev.target.files && ev.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { profil.value.photoURL = String(reader.result || '') }
  reader.readAsDataURL(f)
}
function saveProfil() {
  if (!activeEnfant.value) return
  store.updateEnfant(activeEnfant.value.id, { ...profil.value })
  profilSaved.value = true
  setTimeout(() => { profilSaved.value = false }, 2000)
}

// ── Moteur de cours : MIAPO décompose la formation (nom + programme collé) en
// modules + plan séquencé, puis alimente la boucle notes/quiz sur CES modules. ──
const coursProgramme = ref('')
const coursLoading = ref(false)
const coursMsg = ref('')
const coursPlan = computed(() => Array.isArray(activeEnfant.value?.formationPlan) ? activeEnfant.value.formationPlan : [])
async function genererPlanCours() {
  const e = activeEnfant.value
  if (!e || !profil.value.formation.trim() || coursLoading.value) return
  coursLoading.value = true
  coursMsg.value = ''
  // Persiste d'abord le nom/URL de la formation saisis (contexte de génération).
  store.updateEnfant(e.id, { formation: profil.value.formation, formationUrl: profil.value.formationUrl })
  const r = await tuteur.generateCoursePlan({
    formation: profil.value.formation.trim(),
    programme: coursProgramme.value.trim(),
    niveau: profil.value.formation.trim(),
  })
  coursLoading.value = false
  if (r && r.modules && r.modules.length) {
    store.setFormationPlan(e.id, { modules: r.modules, plan: r.plan })
    profil.value.formationModules = r.modules.map((m) => m.titre).join(', ')
    coursMsg.value = t('mia.coursePlanReady', { n: r.modules.length })
  } else {
    coursMsg.value = t('mia.coursePlanFailed')
  }
  setTimeout(() => { coursMsg.value = '' }, 4000)
}
// Profil du PARENT (compte) — affiché d'abord en mode parent ; le profil enfant suit.
const parentProfil = ref({ firstName: '', lastName: '', email: '', phone: '' })
const parentSaved = ref(false)
function syncParentProfil() {
  const p = authStore.userProfile || {}
  parentProfil.value = { firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: p.phone || '' }
}
function saveParentProfil() {
  authStore.updateProfile({
    firstName: parentProfil.value.firstName.trim(),
    lastName: parentProfil.value.lastName.trim(),
    phone: parentProfil.value.phone.trim(),
  })
  parentSaved.value = true
  setTimeout(() => { parentSaved.value = false }, 2000)
}
// Charge les fiches à l'ouverture de la section / au changement d'enfant.
watch([() => section.value, activeId], () => { if (section.value === 'profil') { syncProfil(); syncParentProfil() } })

const quizMatiere = ref('')
const reviseMatiere = ref('')
const quizThemes = ref('')
function goRevise(matiere, themes) {
  // Garde-fou : SEUL l'apprenant lance une révision. Le parent propose des
  // matières, mais n'écrit jamais dans la progression de son enfant (sinon il
  // fausserait la détection de niveau). Vaut aussi pour tout futur appelant.
  if (!isApprenant.value) return
  quizMatiere.value = matiere
  quizThemes.value = Array.isArray(themes) ? themes.join(', ') : (themes || '')
  section.value = 'tuteur'
}
// Mode parent : désigner une matière à réviser (l'enfant la verra dans « À réviser »
// et la travaillera lui-même — le parent ne lance pas le quiz).
const revisionDemandee = ref('')
function demanderRevision() {
  if (!reviseMatiere.value || !activeEnfant.value) return
  store.addRevisionCiblee(activeEnfant.value.id, reviseMatiere.value, [])
  revisionDemandee.value = reviseMatiere.value
  reviseMatiere.value = ''
}

const showAdd = ref(false)
const form = ref({ firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM', ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '' })

const newMatiere = ref('')
const newNote = ref(null)
const canAddNote = computed(() => newMatiere.value && newNote.value !== null && newNote.value !== '' && !Number.isNaN(Number(newNote.value)))

function paysLabel(code) { return PAYS.find((p) => p.code === code)?.label || code }
// Affiche le NOM de la formation pour un apprenant hors-catalogue (sinon la classe).
function niveauLabel(e) {
  if (!e) return ''
  return e.niveau === NIVEAU_HORS_CATALOGUE ? (e.formation || NIVEAU_HORS_CATALOGUE) : e.niveau
}
function noteClass(n) { const o = objectif.value; return n < o ? 'low' : n < o + 2 ? 'mid' : 'ok' }
function levelFor(matiere) { return activeEnfant.value ? tuteur.getLevel(activeEnfant.value.id, 'auto-' + matiere) : 1 }

// Sujets proposés pour la saisie de notes / la révision. Pour un apprenant
// hors-catalogue qui a renseigné ses modules, on pilote toute la boucle
// (notes → faiblesses → quiz → révision) par SES modules ; sinon catalogue scolaire.
const matieresList = computed(() => {
  const e = activeEnfant.value
  // Supérieur et hors-catalogue : les matières = les modules saisis par l'apprenant.
  if (e && (e.niveau === NIVEAU_HORS_CATALOGUE || isNiveauSuperieur(e.niveau)) && e.formationModules) {
    const mods = e.formationModules.split(',').map((m) => m.trim()).filter(Boolean)
    if (mods.length) return mods
  }
  return matieresPourNiveau(e?.niveau)
})
// Contexte passé au quiz IA : pour un apprenant hors-catalogue, le NOM de la
// formation donne de bien meilleures questions que « Formation (hors catalogue) ».
const quizNiveau = computed(() => {
  const e = activeEnfant.value
  return e && e.niveau === NIVEAU_HORS_CATALOGUE ? (e.formation || e.niveau) : (e?.niveau || '')
})

const faiblesses = computed(() => activeEnfant.value ? store.faiblesses(activeEnfant.value.id) : [])
// « À réviser » = matières faibles (notes < 10) + faiblesses repérées par photo de copie.
const aReviser = computed(() => {
  const e = activeEnfant.value
  if (!e) return []
  const map = new Map()
  for (const f of faiblesses.value) map.set(f.matiere, { matiere: f.matiere, note: f.note, themes: [], source: 'note' })
  for (const r of (e.revisions || [])) {
    const ex = map.get(r.matiere)
    if (ex) { ex.themes = [...new Set([...ex.themes, ...(r.themes || [])])]; ex.source = 'note+copie' }
    else map.set(r.matiere, { matiere: r.matiere, note: null, themes: r.themes || [], source: 'copie' })
  }
  return [...map.values()]
})

// ── Agenda de révision de la semaine : le tuteur propose 1 sujet à réviser par
// jour ouvré, à partir des points faibles de l'apprenant (week-end = repos). ──
function _startOfWeek(d) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x }
function _sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
const planHebdo = computed(() => {
  const jours = [t('mia.dowMon'), t('mia.dowTue'), t('mia.dowWed'), t('mia.dowThu'), t('mia.dowFri'), t('mia.dowSat'), t('mia.dowSun')]
  const mats = (aReviser.value.length ? aReviser.value.map((w) => w.matiere) : matieresList.value).filter(Boolean)
  const monday = _startOfWeek(new Date())
  const today = new Date()
  const out = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday); dt.setDate(monday.getDate() + i)
    const weekend = i >= 5
    out.push({ key: i, label: jours[i], date: dt.getDate(), today: _sameDay(dt, today), matiere: (!weekend && mats.length) ? mats[i % mats.length] : null })
  }
  return out
})
const hasEval = computed(() => !!activeEnfant.value?.comp6c && Object.keys(activeEnfant.value.comp6c).length >= 6)
const moyenne = computed(() => {
  const ns = activeEnfant.value?.notes || []
  if (!ns.length) return null
  return Math.round((ns.reduce((a, n) => a + n.note, 0) / ns.length) * 10) / 10
})
const progression = computed(() => {
  void tuteur.revisionsVersion // dépendance réactive : le tableau se met à jour après chaque quiz
  const e = activeEnfant.value
  if (!e) return []
  const mats = new Set(e.notes.map((n) => n.matiere))
  for (const m of matieresList.value) { if (tuteur.getLevel(e.id, 'auto-' + m) > 1) mats.add(m) }
  return [...mats].map((m) => ({ matiere: m, level: levelFor(m) })).sort((a, b) => b.level - a.level)
})

const insight = computed(() => {
  const e = activeEnfant.value
  if (!e) return ''
  const ap = isApprenant.value
  if (!e.notes.length) return ap
    ? t('mia.insightNoNotesLearner', { level: niveauLabel(e) })
    : t('mia.insightNoNotesParent', { name: e.firstName, level: niveauLabel(e) })
  const f = faiblesses.value
  if (!f.length) return ap
    ? t('mia.insightGoodLearner')
    : t('mia.insightGoodParent', { name: e.firstName })
  const noms = f.slice(0, 2).map((x) => x.matiere)
  const m = noms.length === 2 ? t('mia.andJoin', { a: noms[0], b: noms[1] }) : noms[0]
  return ap
    ? t('mia.insightWeakLearner', { subjects: m })
    : t('mia.insightWeakParent', { subjects: m, name: e.firstName })
})

function openAdd() { form.value = { firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM', ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '' }; showAdd.value = true }
function doAdd() {
  if (!form.value.firstName.trim()) return
  activeId.value = store.addEnfant(form.value)
  showAdd.value = false
  section.value = isApprenant.value ? 'accueil' : 'enfants'
}
function addNote() {
  if (!canAddNote.value || !activeEnfant.value) return
  store.addNote(activeEnfant.value.id, newMatiere.value, newNote.value)
  newMatiere.value = ''; newNote.value = null
}
function confirmRemove() {
  if (!activeEnfant.value) return
  if (confirm(t('mia.confirmRemoveProfile', { name: activeEnfant.value.firstName }))) {
    store.removeEnfant(activeEnfant.value.id)
    activeId.value = enfants.value[0]?.id || ''
  }
}

// ── Lecture de copie (vision) ──────────────────────────────────────────
const visionState = ref('idle')
const visionResult = ref(null)
const visionError = ref('')
function resetVision() { visionState.value = 'idle'; visionResult.value = null; visionError.value = '' }

// ── Lecture d'un bulletin (multi-matières → notes) ──
const bulletinState = ref('idle')   // idle | loading | done | error
const bulletinRows = ref([])        // [{ matiere, note }]
const bulletinMoyenne = ref(null)
const bulletinError = ref('')
function resetBulletin() { bulletinState.value = 'idle'; bulletinRows.value = []; bulletinMoyenne.value = null; bulletinError.value = '' }
async function onPickBulletin(e) {
  const file = e.target.files?.[0]; if (e.target) e.target.value = ''
  if (!file || !activeEnfant.value) return
  bulletinState.value = 'loading'; bulletinError.value = ''
  try {
    const dataUrl = await downscaleImage(file)
    const res = await analyserBulletin({ imageDataUrl: dataUrl, niveau: activeEnfant.value.niveau })
    if (res.ok) { bulletinRows.value = res.matieres || []; bulletinMoyenne.value = res.moyenne ?? null; bulletinState.value = 'done' }
    else { bulletinError.value = res.reason || t('mia.bulletinFail'); bulletinState.value = 'error' }
  } catch { bulletinError.value = t('mia.visionBlurry'); bulletinState.value = 'error' }
}
function addAllBulletinNotes() {
  const e = activeEnfant.value
  if (!e) return
  for (const r of bulletinRows.value) {
    const note = Number(r.note)
    if (r.matiere && String(r.matiere).trim() && Number.isFinite(note)) {
      store.addNote(e.id, String(r.matiere).trim(), Math.max(0, Math.min(20, note)))
    }
  }
  resetBulletin()
}

// ── Emploi du temps (saisie / scan / import) + révision la veille ──
const JOURS = computed(() => [
  { key: 'lundi', label: t('mia.dayMon') }, { key: 'mardi', label: t('mia.dayTue') }, { key: 'mercredi', label: t('mia.dayWed') },
  { key: 'jeudi', label: t('mia.dayThu') }, { key: 'vendredi', label: t('mia.dayFri') }, { key: 'samedi', label: t('mia.daySat') }, { key: 'dimanche', label: t('mia.daySun') },
])
const DOW_TO_KEY = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' }
const crJour = ref('')
const crHeure = ref('')
const crMatiere = ref('')
const edtScanning = ref(false)
const edtError = ref('')
function ajouterCreneau() {
  if (!activeEnfant.value || !crJour.value || !crMatiere.value.trim()) return
  store.addCreneau(activeEnfant.value.id, { jour: crJour.value, heure: crHeure.value, matiere: crMatiere.value })
  crMatiere.value = ''; crHeure.value = ''
}
async function onPickEdt(e) {
  const file = e.target.files?.[0]; if (e.target) e.target.value = ''
  if (!file || !activeEnfant.value) return
  edtScanning.value = true; edtError.value = ''
  try {
    const dataUrl = await downscaleImage(file, 1400, 0.82)
    const res = await analyserEdt({ imageDataUrl: dataUrl, niveau: activeEnfant.value.niveau })
    if (res.ok && res.creneaux.length) store.setEdt(activeEnfant.value.id, res.creneaux)
    else edtError.value = res.reason || t('mia.edtFail')
  } catch { edtError.value = t('mia.visionBlurry') } finally { edtScanning.value = false }
}
const edtParJour = computed(() => {
  const e = activeEnfant.value
  const list = (e && Array.isArray(e.edt)) ? e.edt : []
  return JOURS.value
    .map((j) => ({ ...j, creneaux: list.filter((c) => c.jour === j.key).sort((a, b) => String(a.heure).localeCompare(String(b.heure))) }))
    .filter((d) => d.creneaux.length)
})
const demainKey = computed(() => DOW_TO_KEY[(new Date().getDay() + 1) % 7])
const demainLabel = computed(() => (JOURS.value.find((j) => j.key === demainKey.value) || {}).label || '')
const veilleMatieres = computed(() => {
  const e = activeEnfant.value
  const list = (e && Array.isArray(e.edt)) ? e.edt : []
  return [...new Set(list.filter((c) => c.jour === demainKey.value).map((c) => c.matiere).filter(Boolean))]
})

// ── Formation (hors-catalogue) : MIAPO propose les modules à partir du nom ──
const proposingModules = ref(false)
const proposeError = ref('')
async function proposerModules(target) {
  const src = target === 'profil' ? profil.value : form.value
  if (!src.formation || !src.formation.trim() || proposingModules.value) return
  proposingModules.value = true; proposeError.value = ''
  try {
    const res = await tuteur.extraireModules({ formation: src.formation, ecole: src.ecole || '', texte: src.formationModules || '' })
    if (res.ok && res.modules.length) src.formationModules = res.modules.join(', ')
    else proposeError.value = res.reason || t('mia.proposeFail')
  } catch { proposeError.value = t('mia.proposeFail') } finally { proposingModules.value = false }
}

function downscaleImage(file, maxDim = 1100, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (Math.max(width, height) > maxDim) { const r = maxDim / Math.max(width, height); width = Math.round(width * r); height = Math.round(height * r) }
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height); URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')) }
    img.src = url
  })
}
async function onPickCopie(e) {
  const file = e.target.files?.[0]; e.target.value = ''
  if (!file || !activeEnfant.value) return
  visionState.value = 'loading'
  try {
    const dataUrl = await downscaleImage(file)
    const res = await tuteur.analyserCopie({ imageDataUrl: dataUrl, niveau: activeEnfant.value.niveau })
    if (res.ok && res.analyse) { visionResult.value = res.analyse; visionState.value = 'done' }
    else { visionError.value = res.reason || t('mia.visionUnreadable'); visionState.value = 'error' }
  } catch { visionError.value = t('mia.visionBlurry'); visionState.value = 'error' }
}
function addVisionNote() {
  const a = visionResult.value
  if (!a || !activeEnfant.value || !a.matiere || a.note === null) return
  store.addNote(activeEnfant.value.id, a.matiere, a.note)
}
// Pousse les points faibles repérés sur la copie dans « À réviser » (et cible
// ces notions au prochain quiz). On bascule sur le Tuteur pour les voir.
function addToRevisions() {
  const a = visionResult.value
  if (!a || !activeEnfant.value || !a.matiere) return
  store.addRevisionCiblee(activeEnfant.value.id, a.matiere, a.points_faibles || [])
  resetVision()
  section.value = 'tuteur'
}

// ── Prépa examen ───────────────────────────────────────────────────────
const prepaState = ref('idle')
const prepaResult = ref(null)
const prepaError = ref('')
async function getPrepa() {
  const e = activeEnfant.value
  if (!e) return
  prepaState.value = 'loading'
  const faibles = e.notes.filter((n) => n.note < store.objectifDe(e)).map((n) => n.matiere)
  const res = await tuteur.prepaExamen({ niveau: e.niveau, pays: e.pays, faibles })
  if (res.ok && res.prepa) { prepaResult.value = res.prepa; prepaState.value = 'done' }
  else { prepaError.value = res.reason || t('mia.prepaUnavailable'); prepaState.value = 'error' }
}

onMounted(async () => {
  await store.hydrate()
  // Session enfant en cours (téléphone confié) : on rouvre sur CET enfant,
  // même après un rechargement — sinon l'enfant retomberait sur le 1er profil.
  const sess = store.childSessionId
  activeId.value = (sess && enfants.value.some((e) => e.id === sess) ? sess : enfants.value[0]?.id) || ''
  window.addEventListener('miapo-toggle-menu', onToggleMenu)
  try { voletCollapsed.value = localStorage.getItem('mapo_miapo_volet_collapsed') === '1' } catch { /* silent */ }
  try { agendaUrl.value = localStorage.getItem('mapo_miapo_agenda_url') || '' } catch { /* silent */ }
  // ── Suivi d'adoption MAPO+ (B2C) ── best-effort : sans compte (démo) = ignoré.
  try {
    const persona = store.mode === 'apprenant' ? 'apprenant' : 'parent'
    const country = enfants.value[0]?.pays || ''
    await analytics.registerUser({ persona, country })
    analytics.recordSession()
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone
    if (standalone) analytics.markInstalled()
    window.addEventListener('appinstalled', onAppInstalled)
  } catch { /* best-effort */ }
})
onUnmounted(() => {
  window.removeEventListener('miapo-toggle-menu', onToggleMenu)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<style scoped>
.miapo-shell { display: flex; align-items: stretch; gap: 0; min-height: 100%; }

/* ───────── Volet menu ───────── */
/* Menu figé : il reste en place (sticky pleine hauteur), seul le contenu défile. */
.volet { width: 224px; flex-shrink: 0; align-self: flex-start; border-right: 1px solid var(--bd, #e5e7eb); padding: 18px 14px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.volet-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.volet-close { display: none; margin-left: auto; background: none; border: none; color: var(--tx3, #6b7280); cursor: pointer; padding: 4px; border-radius: 8px; }
.volet-close:hover { background: rgba(0,0,0,.05); }
.brand-ic { width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg, var(--pr, #1558B0), #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brand-tx { display: flex; flex-direction: column; line-height: 1.2; }
.brand-tx strong { font-size: 16px; color: var(--tx, #1f2937); }
.brand-tx small { font-size: 11px; color: var(--tx3, #6b7280); }

.volet-child { padding: 0 4px; }
.volet-mode { display: flex; gap: 4px; padding: 3px; background: var(--input-bg, #eef1f4); border-radius: 10px; }
.volet-mode button { flex: 1; padding: 7px 8px; border: none; background: none; border-radius: 8px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s; }
.volet-mode button.on { background: #fff; color: var(--pr); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.child-select { width: 100%; padding: 9px 11px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 13.5px; background: #fff; color: var(--tx); }
.child-single { font-size: 14px; font-weight: 600; color: var(--tx); padding: 4px 6px; } .child-single span { font-size: 12px; font-weight: 500; color: var(--tx3); background: var(--input-bg, #eef1f4); padding: 2px 8px; border-radius: 20px; margin-left: 4px; }

.volet-nav { display: flex; flex-direction: column; gap: 3px; }
/* Profil + Déconnexion groupés en bas du volet (Profil juste au-dessus). */
.volet-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 3px; }
.volet-logout { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; color: var(--tx3, #6b7280); width: 100%; text-align: left; }
.volet-logout:hover { background: rgba(217,48,37,.07); color: #D93025; }
.nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; color: var(--tx2, #4b5563); text-align: left; width: 100%; }
.nav-item:hover { background: var(--input-bg, #f1f3f5); }
.nav-item.active { background: rgba(var(--pr-rgb,21,88,176),.10); color: var(--pr, #1558B0); font-weight: 600; }

/* ───────── Main ───────── */
.miapo-main { flex: 1; min-width: 0; padding: 22px 26px; max-width: 760px; overflow-y: auto; }

/* ── Bureau (≥769px) : menu latéral FIXE et entièrement visible ; seule la zone
   principale défile. La hauteur est bornée par AppLayout (.no-sidebar). ── */
@media (min-width: 769px) {
  .miapo-shell { flex: 1; min-height: 0; }
  .volet { position: static; top: auto; height: auto; align-self: stretch; }
  .miapo-main { min-height: 0; }
}

/* Bouton replier + menu réduit aux icônes (desktop). Le menu reste FIXE. */
.volet-collapse { display: none; align-items: center; gap: 11px; padding: 8px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 13px; font-family: inherit; color: var(--tx3, #6b7280); width: 100%; text-align: left; }
.volet-collapse:hover { background: var(--input-bg, #f1f3f5); }
@media (min-width: 769px) {
  .volet-collapse { display: flex; }
  .volet.collapsed { width: 66px; padding-left: 8px; padding-right: 8px; }
  .volet.collapsed .brand-tx,
  .volet.collapsed .volet-collapse span,
  .volet.collapsed .nav-item span,
  .volet.collapsed .volet-logout span,
  .volet.collapsed .volet-mode,
  .volet.collapsed .volet-child { display: none; }
  .volet.collapsed .nav-item,
  .volet.collapsed .volet-logout,
  .volet.collapsed .volet-collapse,
  .volet.collapsed .volet-brand { justify-content: center; }
}

/* Rail droit : agenda de révision (remplit l'espace vide à droite sur grand écran). */
.miapo-aside { display: none; }
@media (min-width: 1180px) {
  .miapo-aside { display: flex; flex-direction: column; gap: 14px; width: 322px; flex-shrink: 0; padding: 22px 22px 22px 6px; overflow-y: auto; }
  .miapo-main { max-width: none; }
}
.aside-card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 15px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.aside-head { display: flex; align-items: center; gap: 8px; color: var(--pr); margin-bottom: 3px; }
.aside-head h3 { font-size: 14.5px; font-weight: 600; margin: 0; color: var(--tx); }
.aside-sub { font-size: 12px; color: var(--tx3); margin: 0 0 11px; line-height: 1.4; }
.agenda-days { display: flex; flex-direction: column; gap: 5px; }
.agenda-day { display: flex; gap: 11px; align-items: center; padding: 6px 7px; border-radius: 10px; }
.agenda-day.today { background: rgba(var(--pr-rgb,21,88,176),.08); }
.dy-date { display: flex; flex-direction: column; align-items: center; width: 32px; flex-shrink: 0; }
.dy-dow { font-size: 10px; color: var(--tx3); text-transform: uppercase; letter-spacing: .03em; }
.dy-num { font-size: 15px; font-weight: 700; color: var(--tx); line-height: 1.1; }
.agenda-day.today .dy-num { color: var(--pr); }
.dy-body { flex: 1; min-width: 0; }
.dy-exo { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; background: rgba(var(--pr-rgb,21,88,176),.09); color: var(--pr); border: none; border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-align: left; }
.dy-exo:hover { background: rgba(var(--pr-rgb,21,88,176),.16); }
/* Vue parent : la matière du jour s'affiche, mais ne se lance pas. */
.dy-static { cursor: default; background: rgba(0,0,0,.05); color: var(--tx2); }
.dy-static:hover { background: rgba(0,0,0,.05); }
.dy-rest { font-size: 12px; color: var(--tx3); font-style: italic; }
.aside-input { width: 100%; box-sizing: border-box; margin-bottom: 8px; font-size: 13px; }
.aside-connect { width: 100%; }
.aside-note { font-size: 11px; color: var(--tx3); margin: 8px 0 0; }
.main-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.main-head h1 { font-size: 23px; font-weight: 700; margin: 0; }
.sec { display: flex; flex-direction: column; gap: 16px; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.obj-chip { margin-left: auto; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; color: var(--pr); background: rgba(var(--pr-rgb), .10); }
.muted { color: var(--tx3, #6b7280); font-size: 14px; margin: 0 0 14px; } .small { font-size: 13px; }
.lnk { background: none; border: none; color: var(--pr); cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }

.intro-card { text-align: center; padding: 40px 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 30px auto; max-width: 520px; }
.intro-icon { width: 56px; height: 56px; border-radius: 16px; background: rgba(var(--pr-rgb,21,88,176),.10); color: var(--pr); display: flex; align-items: center; justify-content: center; }
.intro-card h2 { font-size: 20px; margin: 0; } .intro-card p { color: var(--tx2); font-size: 14px; line-height: 1.6; margin: 0 0 10px; }

.child-card { display: flex; align-items: center; gap: 16px; }
.child-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr, #1558B0), #3b82f6); } .av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.child-info h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; } .child-meta { font-size: 13px; color: var(--tx2); display: flex; gap: 8px; } .sep { color: var(--bd); }

.insight-card { display: flex; gap: 14px; align-items: flex-start; background: rgba(var(--pr-rgb,21,88,176),.05); border-color: rgba(var(--pr-rgb,21,88,176),.15); }
.insight-icon { width: 40px; height: 40px; border-radius: 11px; background: rgba(var(--pr-rgb,21,88,176),.12); color: var(--pr); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight-card strong { color: var(--pr); } .insight-card p { margin: 4px 0 0; font-size: 14px; color: var(--tx); line-height: 1.5; }

.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat { background: #fff; border: 1px solid var(--bd); border-radius: 14px; padding: 16px; text-align: center; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
.stat:hover { border-color: var(--pr); box-shadow: 0 4px 14px rgba(0,0,0,.06); transform: translateY(-1px); }
.radar-dash { cursor: pointer; }
.wi-themes { color: var(--tx3, #9ca3af); font-weight: 400; font-size: 12px; }
.weak-static { cursor: default; }
.wl-note { margin-top: 10px; }
.profil-photo { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.pp-avatar { width: 64px; height: 64px; font-size: 22px; overflow: hidden; flex-shrink: 0; }
.pp-avatar img { width: 100%; height: 100%; object-fit: cover; }
.saved-ok { color: #1B8A5A; font-weight: 600; }
.stat-v { display: block; font-size: 22px; font-weight: 700; color: var(--tx); } .stat-v.warn { color: #D93025; }
.stat-l { font-size: 12px; color: var(--tx3); }
.quick { display: flex; gap: 10px; flex-wrap: wrap; }

.enfant-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.enfant-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; text-align: left; }
.enfant-row.active { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.05); }
.er-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
.er-info { flex: 1; display: flex; flex-direction: column; } .er-info strong { font-size: 14px; color: var(--tx); } .er-info small { font-size: 12px; color: var(--tx3); }
.er-del { color: var(--tx3); } .er-del:hover { color: #D93025; }
.add-child { width: 100%; justify-content: center; }

.notes-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.note-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--divider, #f0f0f0); }
.note-row:last-child { border-bottom: none; }
.nr-mat { flex: 1; font-size: 14px; color: var(--tx); }
.nr-note { font-weight: 700; font-size: 13px; padding: 3px 9px; border-radius: 20px; }
.nr-note.low, .vr-note.low { color: #D93025; background: rgba(217,48,37,.08); }
.nr-note.mid, .vr-note.mid { color: #B87A00; background: rgba(232,149,10,.10); }
.nr-note.ok, .vr-note.ok { color: #1B8A5A; background: rgba(27,138,90,.10); }
.add-note { display: flex; gap: 10px; align-items: center; }
.add-note .input { flex: 1; } .note-input { max-width: 84px; flex: 0 0 auto; }
.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 14px; background: #fff; color: var(--tx); }

.weak-list { display: flex; flex-direction: column; gap: 10px; }
.weak-item { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; }
.weak-item:hover { border-color: var(--pr); box-shadow: 0 2px 10px rgba(var(--pr-rgb,21,88,176),.08); }
.wi-name { font-weight: 600; font-size: 15px; color: var(--tx); }
.wi-right { display: flex; align-items: center; gap: 10px; color: var(--tx3); }
.wi-level { font-weight: 700; font-size: 12px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 3px 9px; border-radius: 20px; }
.wi-note { font-weight: 700; font-size: 13px; color: #D93025; background: rgba(217,48,37,.08); padding: 3px 9px; border-radius: 20px; }
.revise-pick { display: flex; gap: 10px; } .revise-pick .input { flex: 1; }

.prog-list { display: flex; flex-direction: column; gap: 12px; }
.prog-row { display: flex; align-items: center; gap: 12px; }
.prog-mat { flex: 1; font-size: 14px; color: var(--tx); }
.prog-dots { display: flex; gap: 5px; } .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--input-bg, #e6e9ee); } .dot.on { background: linear-gradient(135deg, var(--pr, #1558B0), #7c3aed); }
.prog-lv { font-size: 12px; font-weight: 700; color: var(--pr); width: 52px; text-align: right; }

.vision-card { background: rgba(var(--pr-rgb,21,88,176),.04); } .vision-btn { cursor: pointer; }
.loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; text-align: center; } .loading p { margin: 0; font-size: 14px; } .loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); } @keyframes spin { to { transform: rotate(360deg); } }
.vision-result { display: flex; flex-direction: column; gap: 12px; }
.bull-list { display: flex; flex-direction: column; gap: 8px; }
.bull-row { display: flex; align-items: center; gap: 8px; }
.bull-row .bull-mat { flex: 1; }

/* Emploi du temps */
.veille-card { background: rgba(var(--pr-rgb, 124,58,237), .06); border-color: rgba(var(--pr-rgb, 124,58,237), .18); }
.edt-add { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.edt-add .input { flex: 1; min-width: 120px; }
.edt-add .edt-time { flex: 0 0 auto; max-width: 120px; }
.edt-scan { margin-bottom: 4px; }
.edt-week { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.edt-day-h { font-family: var(--font-display, 'Poppins'), sans-serif; font-weight: 700; font-size: 13.5px; color: var(--pr); margin-bottom: 4px; }
.edt-cr { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--divider, #eee); }
.edt-cr:last-child { border-bottom: none; }
.edt-cr-h { font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); min-width: 46px; }
.edt-cr-m { flex: 1; font-size: 14px; color: var(--tx); }
.edt-empty { margin-top: 8px; }
.vr-head { display: flex; align-items: center; justify-content: space-between; } .vr-mat { font-weight: 700; font-size: 16px; color: var(--tx); }
.vr-note { font-weight: 700; font-size: 13px; padding: 3px 10px; border-radius: 20px; }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }
.reco-lab { font-size: 11px; font-weight: 600; color: var(--tx2); text-transform: uppercase; letter-spacing: .3px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; } .chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; }
.chip-w { color: #B3261E; background: rgba(217,48,37,.07); }
.reco-conseil { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); padding: 10px 12px; border-radius: 10px; line-height: 1.5; }
.vr-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.err p { color: #D93025; font-size: 14px; margin: 0 0 10px; }

.prepa-card { background: rgba(232,149,58,.05); }
.prepa-result { display: flex; flex-direction: column; gap: 12px; }
.prepa-plan { display: flex; flex-direction: column; gap: 10px; }
.etape { border: 1px solid var(--bd); border-radius: 12px; padding: 13px 15px; }
.etape-head { display: flex; align-items: center; gap: 10px; } .etape-num { width: 26px; height: 26px; border-radius: 50%; background: #E8953A; color: #fff; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; } .etape-head strong { font-size: 15px; color: var(--tx); }
.etape-obj { margin: 8px 0; font-size: 13px; color: var(--tx2); line-height: 1.5; } .etape-actions { margin: 0; padding-left: 18px; } .etape-actions li { font-size: 13px; color: var(--tx2); line-height: 1.6; }

/* Moteur de cours (apprenant hors-catalogue) : générateur + plan */
.course-engine { margin-top: 12px; padding: 14px; border: 1px dashed rgba(var(--pr-rgb,21,88,176),.35); border-radius: 12px; background: rgba(var(--pr-rgb,21,88,176),.04); display: flex; flex-direction: column; gap: 10px; }
.ce-head { display: flex; align-items: center; gap: 7px; color: var(--pr); } .ce-head strong { font-size: 14px; }
.ce-hint { margin: 0; font-size: 12.5px; color: var(--tx2); line-height: 1.5; }
.ce-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cplan-card { background: rgba(var(--pr-rgb,21,88,176),.04); }
.cplan-list { display: flex; flex-direction: column; gap: 10px; }
.cplan-step { border: 1px solid var(--bd); border-radius: 12px; padding: 12px 14px; }
.ps-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ps-per { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--tx2); }
.ps-mod { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.08); border: none; border-radius: 20px; padding: 4px 11px; cursor: pointer; transition: background .15s; }
.ps-mod:hover { background: rgba(var(--pr-rgb,21,88,176),.16); }
.ps-mod-static { font-size: 13px; font-weight: 600; color: var(--tx); }
.ps-obj { margin: 8px 0 6px; font-size: 13px; color: var(--tx2); line-height: 1.5; }
.ps-actions { margin: 0; padding-left: 18px; } .ps-actions li { font-size: 12.5px; color: var(--tx2); line-height: 1.6; }

.abo-card { text-align: center; padding: 30px 26px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.abo-ic { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, var(--pr, #1558B0), #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; }
.abo-card h2 { font-size: 19px; margin: 0; } .abo-card p { color: var(--tx2); font-size: 14px; line-height: 1.6; margin: 0; max-width: 460px; }
.abo-feats { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 8px; text-align: left; }
.abo-feats li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--tx); } .abo-feats li svg { color: #1B8A5A; flex-shrink: 0; }
.abo-trial { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 16px; background: rgba(27, 138, 90, .09); border: 1px solid rgba(27, 138, 90, .25); border-radius: 100px; color: #1B8A5A; font-size: 13.5px; font-weight: 600; }
.abo-ic-ok { background: linear-gradient(135deg, #1B8A5A, #34A853) !important; }
.abo-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 4px 0 14px; }
.plan-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 18px 14px; border: 2px solid var(--bd, #e5e7eb); border-radius: 14px; background: var(--card, #fff); cursor: pointer; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.plan-card.selected { border-color: #7c3aed; box-shadow: 0 4px 16px rgba(124, 58, 237, .14); }
.plan-badge { position: absolute; top: -10px; background: #7c3aed; color: #fff; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 100px; white-space: nowrap; }
.plan-name { font-size: 13px; font-weight: 600; color: var(--tx2, #4b5563); text-transform: uppercase; letter-spacing: .03em; }
.plan-price { font-size: 20px; font-weight: 800; color: var(--tx, #1f2937); font-family: 'Poppins', sans-serif; }
.plan-sub { font-size: 12px; color: var(--tx3, #6b7280); text-align: center; }
.abo-cta { width: 100%; justify-content: center; }
.abo-legal { text-align: center; margin-top: 10px; }
.pay-amount { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 14px; background: var(--input-bg, #eef1f4); border-radius: 12px; margin-bottom: 14px; }
.pay-amount span { font-size: 13px; color: var(--tx2, #4b5563); }
.pay-amount strong { font-size: 22px; font-family: 'Poppins', sans-serif; color: var(--tx, #1f2937); }
.pay-tabs { display: flex; gap: 6px; padding: 4px; background: var(--input-bg, #eef1f4); border-radius: 10px; margin-bottom: 14px; }
.pay-tab { flex: 1; padding: 9px; border: none; background: none; border-radius: 8px; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s; }
.pay-tab.active { background: var(--card, #fff); color: #7c3aed; box-shadow: 0 1px 4px rgba(0, 0, 0, .08); }
.op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.op-btn { display: flex; align-items: center; gap: 8px; padding: 11px 12px; border: 1.5px solid var(--bd, #e5e7eb); border-radius: 10px; background: var(--card, #fff); cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx, #1f2937); transition: border-color .15s; }
.op-btn.selected { border-color: #7c3aed; background: rgba(124, 58, 237, .05); }
.op-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.sim-note { font-size: 12px; color: var(--tx3, #9ca3af); margin: 8px 0 0; text-align: center; }
.guichet-processing { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; text-align: center; }
.guichet-processing p { margin: 0; font-weight: 600; color: var(--tx, #1f2937); }
.guichet-processing small { color: var(--tx3, #6b7280); }
.pay-done { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 0 4px; text-align: center; }
.pay-check { width: 56px; height: 56px; border-radius: 50%; background: #1B8A5A; color: #fff; display: flex; align-items: center; justify-content: center; }
.pay-done h3 { margin: 4px 0 0; } .pay-done p { color: var(--tx2, #4b5563); font-size: 14px; margin: 0; max-width: 320px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
.modal-card { background: #fff; border-radius: 18px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--bd); } .modal-header h3 { margin: 0; font-size: 17px; }
.modal-body { padding: 20px; }
.form-row { display: flex; gap: 12px; } .form-row .form-group { flex: 1; } .form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tx2); margin-bottom: 6px; }
.form-group .input, .form-group select.input { width: 100%; box-sizing: border-box; }
.compose-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 6px; }
.btn-xs { padding: 5px 9px; font-size: 12px; }

/* ───────── Responsive : volet → barre d'onglets en haut ───────── */
/* Menu hamburger coulissant (mobile) — fond sombre + tiroir */
.volet-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); z-index: 55; }

@media (max-width: 768px) {
  .miapo-shell { display: block; }
  .volet {
    position: fixed; left: 0; top: 0; bottom: 0; height: 100vh; height: 100dvh;
    width: 268px; max-width: 84vw;
    transform: translateX(-100%); transition: transform .26s ease;
    z-index: 60; background: var(--card, #fff);
    border-right: 1px solid var(--bd, #e5e7eb);
    box-shadow: 0 18px 44px rgba(0, 0, 0, .22); align-self: auto;
  }
  .volet.open { transform: translateX(0); }
  .volet-close { display: flex; align-items: center; justify-content: center; }
  .volet-nav { flex-direction: column; overflow-x: visible; }
  .volet-logout { margin-top: auto; }
  .miapo-main { padding: 16px 14px; max-width: 100%; width: 100%; box-sizing: border-box; }
  .main-head h1 { font-size: 20px; }
  .stat-grid { gap: 8px; }
}
@media (max-width: 420px) {
  .volet-brand .brand-tx small { display: none; }
  .main-head .btn span { display: none; }
  /* Densité confort sur petit écran : moins de marge perdue */
  .miapo-main { padding: 14px 10px; }
  .card { padding: 14px 13px; }
  .intro-card { padding: 28px 18px; margin: 18px auto; }
  .abo-card { padding: 24px 16px; }
  .stat { padding: 13px 10px; }
}
</style>
