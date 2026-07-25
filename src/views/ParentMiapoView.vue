<template>
  <div class="miapo-shell">
    <!-- Onboarding guidé au 1er lancement (nouveau compte B2C) -->
    <MiapoOnboarding v-if="showOnboarding" @done="onOnboardingDone" />

    <!-- Visite guidée (2e onboarding) : explique l'app, sans question de profil -->
    <MiapoTour v-if="showTour" :steps="tourSteps" :labels="tourLabels" @done="onTourDone" />

    <!-- 3e onboarding : formation hors-catalogue → école + lien + modules proposés -->
    <MiapoFormationSetup v-if="showFormationSetup && activeEnfant" :enfant="activeEnfant" @done="onFormationDone" @skip="onFormationSkip" />

    <!-- Fond sombre quand le menu coulissant est ouvert (mobile) -->
    <div v-if="menuOpen" class="volet-backdrop" @click="menuOpen = false"></div>

    <!-- ───────── Volet menu (sidebar sur PC ; hamburger coulissant sur mobile) ───────── -->
    <aside class="volet" :class="{ open: menuOpen, collapsed: voletCollapsed }">
      <div class="volet-brand">
        <div class="brand-ic">M+</div>
        <div class="brand-tx"><strong>MAPO+</strong><small>{{ L.brandSub }}</small></div>
        <button type="button" class="volet-close" @click="menuOpen = false" aria-label="Fermer le menu"><X :size="20" /></button>
      </div>
      <!-- Replier le menu en icônes (desktop) — le menu reste fixe. -->
      <button type="button" class="volet-collapse" @click="toggleCollapse" :title="voletCollapsed ? t('mia.expandMenu') : t('mia.collapseMenu')">
        <PanelLeftClose v-if="!voletCollapsed" :size="18" /><PanelLeftOpen v-else :size="18" />
        <span>{{ t('mia.collapseMenu') }}</span>
      </button>

      <!-- Sélecteur d'enfant (parent multi-enfants uniquement) -->
      <div v-if="enfants.length && !isApprenant" class="volet-child" data-tour="child">
        <select v-if="enfants.length > 1" v-model="activeId" class="child-select">
          <option v-for="e in enfants" :key="e.id" :value="e.id">{{ e.firstName }} · {{ niveauLabel(e) }}</option>
        </select>
        <div v-else class="child-single">{{ activeEnfant?.firstName }} <span>{{ niveauLabel(activeEnfant) }}</span></div>
      </div>

      <nav class="volet-nav" data-tour="menu">
        <template v-for="(grp, gi) in navGroups" :key="gi">
          <!-- Bloc sans intitulé (Accueil) : items directs -->
          <template v-if="!grp.group">
            <button v-for="s in grp.items" :key="s.key" class="nav-item" :class="{ active: section === s.key }" :data-tour="'nav-' + s.key" @click="section = s.key; menuOpen = false">
              <component :is="s.icon" :size="18" /><span>{{ s.label }}</span>
            </button>
          </template>
          <!-- Bloc pliable (accordéon façon HUB / MAPO supérieur) -->
          <template v-else>
            <button type="button" class="nav-group-head" @click="toggleGroup(grp.group)">
              <span>{{ grp.label }}</span>
              <ChevronRight :size="14" class="nav-group-chev" :class="{ open: isGroupOpen(grp.group) }" />
            </button>
            <div v-show="isGroupOpen(grp.group)" class="nav-group-items">
              <button v-for="s in grp.items" :key="s.key" class="nav-item" :class="{ active: section === s.key }" :data-tour="'nav-' + s.key" @click="section = s.key; menuOpen = false">
                <component :is="s.icon" :size="18" /><span>{{ s.label }}</span>
              </button>
            </div>
          </template>
        </template>
        <!-- Carré : app distincte de l'écosystème (s'ouvre à part) — bas du menu défilant. -->
        <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="volet-carre" :title="t('mia.carreOpen')">
          <span class="carre-badge sm"><span>C</span></span>
          <span class="volet-carre-name">Carré</span>
          <ExternalLink :size="14" class="volet-carre-ext" />
        </a>
      </nav>
      <!-- Pied FIXE (façon HUB) : bloc utilisateur (→ réglages) + déconnexion. -->
      <div class="volet-bottom">
        <MiapoInstall />
        <div class="volet-user-row">
          <button type="button" class="volet-user" :class="{ active: section === 'profil' }" data-tour="settings" @click="section = 'profil'; menuOpen = false" :title="t('mia.secSettings')">
            <span class="volet-user-av">{{ headerInitials }}</span>
            <span class="volet-user-tx"><strong>{{ greetName || t('mia.secProfile') }}</strong><small>{{ userRoleLabel }}</small></span>
          </button>
          <button type="button" class="volet-logout" @click="logout" :title="t('mia.logout')"><LogOut :size="17" /></button>
        </div>
      </div>
    </aside>

    <!-- ───────── Contenu ───────── -->
    <main class="miapo-main">
      <!-- En-tête du contenu (façon hub) : salutation + accès rapides. Le volet de
           gauche occupe toute la hauteur ; seul ce bloc de contenu défile. -->
      <header class="miapo-topbar">
        <button type="button" class="mtb-burger" @click="menuOpen = true" :aria-label="t('header.menu')"><Menu :size="22" /></button>
        <span class="mtb-hi">{{ greeting }}<template v-if="greetName">, {{ greetName }}</template></span>
        <span class="mtb-spacer"></span>
        <button type="button" class="mtb-ic" @click="openSearch" :title="t('header.search')"><Search :size="18" /></button>
        <button type="button" class="mtb-ic mtb-avatar" @click="section = 'profil'" :title="t('mia.secSettings')"><span class="mtb-initials">{{ headerInitials }}</span></button>
      </header>
      <div class="miapo-scroll">
      <!-- Aucun enfant : accueil d'amorçage -->
      <div v-if="!enfants.length" class="card intro-card">
        <div class="intro-icon"><Sparkles :size="26" /></div>
        <h2>{{ L.introTitle }}</h2>
        <p>{{ L.introText }}</p>
        <button class="btn btn-primary" @click="openAdd"><Plus :size="16" /> <span>{{ L.introBtn }}</span></button>
        <!-- L'enfant, lui, ne crée pas de profil : il rejoint le sien avec un code -->
        <MiapoRejoindreProfil />
      </div>

      <template v-else-if="activeEnfant">
        <header class="main-head">
          <h1>{{ currentSection.label }}</h1>
          <button v-if="!isApprenant" class="btn btn-outline btn-sm" @click="openAdd"><Plus :size="15" /> <span>{{ t('mia.addChild') }}</span></button>
        </header>

        <!-- Barre d'alerte d'usage (50 / 90 / 100 %) → Abonnement -->
        <MiapoAlerteUsage />

        <!-- Bascule « mode Netflix » : confier le téléphone à l'enfant / revenir au parent -->
        <MiapoProfilSwitch :enfant="activeEnfant" @switch="activeId = $event" />

        <!-- ========== ACCUEIL ========== -->
        <section v-if="section === 'accueil'" class="sec">
          <div class="card child-card">
            <div class="child-avatar" :class="activeEnfant.gender === 'F' ? 'av-f' : 'av-m'">{{ initials }}</div>
            <div class="child-info">
              <h2>{{ activeEnfant.firstName }} {{ activeEnfant.lastName }}</h2>
              <div class="child-meta"><span>{{ niveauLabel(activeEnfant) }}</span><span class="sep">·</span><span>{{ paysLabel(activeEnfant.pays) }}</span></div>
            </div>
          </div>

          <!-- Rappels intelligents : devoirs à rendre + révision du jour -->
          <button v-if="rappels.hasAny" type="button" class="card rappel-card" @click="section = 'planning'">
            <div class="rappel-head"><MiapoOrbe :size="16" :frozen="true" /><h3>{{ t('mia.remindTitle') }}</h3></div>
            <div class="rappel-lines">
              <span v-if="rappels.late" class="rappel-line late">{{ t('mia.remindOverdue', { n: rappels.late }) }}</span>
              <span v-if="rappels.due" class="rappel-line">{{ t('mia.remindDueToday', { n: rappels.due }) }}</span>
              <span v-if="rappels.revision" class="rappel-line rev">{{ t('mia.remindReviseToday', { sujet: rappels.revision }) }}</span>
            </div>
            <span class="rappel-cta">{{ t('mia.remindOpen') }} <ChevronRight :size="14" /></span>
          </button>

          <!-- Programme de révision jusqu'à l'examen (certification) -->
          <div v-if="planCertif" class="card certif-plan-card">
            <div class="card-head"><CalendarDays :size="18" /><h3>{{ t('mia.certifPlanTitle') }}</h3><span class="cp-jn">{{ t('mia.certifJn', { n: planCertif.jours }) }}</span></div>
            <p class="muted small cp-hint">{{ t('mia.certifPlanHint', { n: planCertif.modules.length, s: planCertif.semaines, p: planCertif.parSemaine }) }}</p>
            <div class="cp-mods">
              <component :is="isApprenant ? 'button' : 'div'" v-for="m in planCertif.modules" :key="m.nom" class="cp-mod" :class="{ 'cp-static': !isApprenant, mastered: m.niveau >= 3 }" @click="isApprenant && goRevise(m.nom)">
                <MiapoOrbe :size="13" frozen />
                <span class="cp-name">{{ m.nom }}</span>
                <span class="cp-lvl" :class="{ ok: m.niveau >= 3 }">{{ m.niveau >= 3 ? t('mia.certifMastered') : t('mia.certifLevel', { n: m.niveau }) }}</span>
              </component>
            </div>
          </div>

          <div class="card insight-card">
            <div class="insight-icon"><MiapoOrbe :size="30" /></div>
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
            <div class="card-head"><CalendarDays :size="18" /><h3>{{ t('mia.myCoursePlan') }}</h3><span class="ia-badge"><MiapoOrbe :size="14" /> MIAPO</span></div>
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
          <!-- Co-parent + compte enfant : déplacés dans Paramètres → « Mes enfants ». -->

          <!-- Notes -->
          <div class="card">
            <div class="card-head"><FileText :size="18" /><h3>{{ isApprenant ? t('mia.yourNotes') : t('mia.notesOf', { name: activeEnfant.firstName }) }}</h3></div>
            <div v-if="activeEnfant.notes.length" class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}<span v-if="n.type" class="nr-type">{{ n.type }}</span></span>
                <span class="nr-note" :class="noteClass(n.note)">{{ n.note }}/20</span>
                <button class="btn btn-ghost btn-xs" @click="store.removeNote(activeEnfant.id, n.id)"><X :size="14" /></button>
              </div>
            </div>
            <p v-else class="muted">{{ t('mia.noNotesHint') }}</p>
            <div v-if="needsModules" class="modules-empty">
              <p class="muted small">{{ t('mia.noModulesHint') }}</p>
              <button class="btn btn-primary btn-sm" @click="openFormationSetup"><Sparkles :size="15" /> <span>{{ t('mia.createModules') }}</span></button>
            </div>
            <div v-else class="add-note">
              <select v-model="newMatiere" class="input"><option value="" disabled>{{ isApprenant ? t('mia.moduleOrSubject') : t('mia.subjectPlaceholder') }}</option><option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option></select>
              <select v-if="newMatiere" v-model="newType" class="input"><option value="">{{ t('mia.noteTypeOptional') }}</option><option v-for="ty in typesNote" :key="ty" :value="ty">{{ ty }}</option></select>
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
              <label class="btn btn-primary vision-btn"><Camera :size="16" /> <span>{{ t('mia.chooseBulletinFile') }}</span><input type="file" accept="image/*,application/pdf" style="display:none" @change="onPickBulletin" /></label>
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
            <TuteurQuiz :matiere="quizMatiere" :niveau="quizNiveau" :student-id="activeEnfant.id" :themes="quizThemes" @quit="quizMatiere = ''; quizThemes = ''" @abonnement="quizMatiere = ''; quizThemes = ''; section = 'profil'; sousSection = 'abonnement'" @ouvrir-fiche="(m) => { quizMatiere = ''; quizThemes = ''; section = 'fiches' }" />
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
              <p class="muted">{{ needsModules ? t('mia.noModulesTutorHint') : t('mia.privateLessonHint') }}</p>
              <div v-if="needsModules" class="modules-empty">
                <button class="btn btn-primary btn-sm" @click="openFormationSetup"><Sparkles :size="15" /> <span>{{ t('mia.createModules') }}</span></button>
              </div>
              <div v-else class="revise-pick">
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

            <!-- Question rédigée : au-delà du QCM, et MIAPO y lit aussi la langue -->
            <MiapoQuestionOuverte v-if="isApprenant" :enfant="activeEnfant" @revise="onReviseFrancais" />

            <!-- Prépa examen -->
            <div class="card prepa-card">
              <div class="card-head"><Trophy :size="18" /><h3>{{ t('mia.prepareExam') }}</h3></div>
              <div v-if="prepaState === 'idle'">
                <p class="muted">{{ t('mia.prepaHint', { name: activeEnfant.firstName }) }}</p>
                <button class="btn btn-outline" @click="getPrepa"><Trophy :size="16" /> <span>{{ t('mia.buildProgram') }}</span></button>
              </div>
              <div v-else-if="prepaState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>{{ t('mia.prepaLoading') }}</p></div>
              <div v-else-if="prepaState === 'done' && prepaResult" class="prepa-result">
                <div class="vr-head"><span class="vr-mat">{{ prepaResult.examen || t('mia.program') }}</span><span class="ia-badge"><MiapoOrbe :size="14" /> MIAPO</span></div>
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
            <div class="card-head">
              <TrendingUp :size="18" /><h3>{{ t('mia.levelBySubject') }}</h3>
              <button v-if="progression.length || activeEnfant.notes.length" type="button" class="pdf-btn" @click="exporterBilan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                {{ t('mia.exportBilan') }}
              </button>
            </div>
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

        <!-- ========== PLANNING (devoirs + semaine) ========== -->
        <section v-else-if="section === 'planning'" class="sec">
          <MiapoPlanning
            :enfant-id="activeEnfant?.id || 'me'"
            :matieres="matieresList"
            :a-reviser="aReviser"
            :can-edit="isApprenant"
            @revise="(m) => isApprenant && goRevise(m)"
          />
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

        <!-- ========== UTILISATION (jauge d'usage) ========== -->
        <section v-else-if="section === 'utilisation'" class="sec">
          <MiapoUtilisation />
        </section>

        <!-- ========== FACTURATION (factures) ========== -->
        <section v-else-if="section === 'facturation'" class="sec">
          <MiapoFacturation />
        </section>

        <!-- ========== PARAMÈTRES (sous-menu : profil / abonnement / notifications) ========== -->
        <section v-else-if="section === 'profil'" class="sec">
          <nav class="param-tabs">
            <button v-for="st in sousMenus" :key="st.key" type="button" class="param-tab" :class="{ active: sousSection === st.key }" @click="sousSection = st.key">
              <component :is="st.icon" :size="16" /><span>{{ st.label }}</span>
            </button>
          </nav>

          <!-- Sous-menu : Utilisation (offres + jauge de crédits) -->
          <div v-show="sousSection === 'abonnement'">
            <MiapoAbonnement />
          </div>

          <!-- Sous-menu : Langue -->
          <div v-show="sousSection === 'langue'">
            <div class="card">
              <div class="card-head"><Languages :size="18" /><h3>{{ t('mia.secLanguage') }}</h3></div>
              <p class="muted small">{{ t('mia.langHint') }}</p>
              <div class="lang-choices">
                <button type="button" class="lang-btn" :class="{ active: locale === 'fr' }" @click="setLangue('fr')">Français</button>
                <button type="button" class="lang-btn" :class="{ active: locale === 'en' }" @click="setLangue('en')">English</button>
              </div>
            </div>
          </div>

          <!-- Sous-menu : Notifications -->
          <div v-show="sousSection === 'notification'" class="param-panel">
            <MiapoNotifications />
            <!-- Relance WhatsApp : réservée aux offres 6500+ (incitation upsell). -->
            <template v-if="!isApprenant && activeEnfant">
              <MiapoRelanceWhatsApp v-if="abo.relanceWhatsappDispo" :enfant="activeEnfant" :default-phone="parentProfil.phone" />
              <div v-else class="card wa-upsell">
                <div class="card-head"><MessageCircle :size="18" /><h3>{{ t('mia.waUpsellTitle') }}</h3></div>
                <p class="muted small">{{ t('mia.waUpsellText') }}</p>
                <button class="btn btn-primary btn-sm" @click="sousSection = 'abonnement'">{{ t('mia.waUpsellCta') }}</button>
              </div>
            </template>
          </div>

          <!-- Sous-menu : Mes enfants (gestion : co-parent, compte enfant) — parent uniquement -->
          <div v-if="!isApprenant" v-show="sousSection === 'enfants'" class="param-panel">
            <MiapoCoParent />
            <MiapoEnfantCompte />
          </div>

          <!-- Sous-menu : Accessibilité -->
          <div v-show="sousSection === 'accessibilite'">
            <MiapoAccessibilite />
          </div>

          <!-- Sous-menu : Connecteurs (agenda + compte Carré) -->
          <div v-show="sousSection === 'connecteurs'" class="param-panel">
            <p class="muted small">{{ t('mia.connectorsHint') }}</p>
            <!-- Agenda iCal (Google / Outlook) -->
            <div class="card">
              <div class="card-head"><CalendarDays :size="18" /><h3>{{ t('mia.myAgenda') }}</h3></div>
              <p class="muted small">{{ t('mia.myAgendaSub') }}</p>
              <input class="input connector-input" v-model="agendaUrl" :placeholder="t('mia.calendarUrlPlaceholder')" />
              <button class="btn btn-outline btn-sm" type="button" @click="saveAgenda">{{ agendaSaved ? t('mia.connected') : t('mia.connect') }}</button>
            </div>
            <!-- Compte Carré : MIAPO pourra lire les notes de cours de l'apprenant -->
            <div class="card">
              <div class="card-head"><span class="carre-badge"><span>C</span></span><h3>{{ t('mia.carreTitle') }}</h3></div>
              <p class="muted small">{{ t('mia.carreDesc') }}</p>
              <template v-if="connecteurs.carreConnected">
                <div class="connector-state ok"><Check :size="15" /> {{ connecteurs.carrePreview ? t('mia.carrePreview') : t('mia.carreConnectedMsg') }}</div>
                <button class="btn btn-outline btn-sm" type="button" @click="connecteurs.disconnectCarre()">{{ t('mia.carreDisconnect') }}</button>
              </template>
              <template v-else>
                <button class="btn btn-primary btn-sm" type="button" @click="connecteurs.connectCarre()"><ExternalLink :size="15" /> {{ t('mia.carreConnect') }}</button>
              </template>
            </div>
          </div>

          <!-- Sous-menu : Profil -->
          <div v-show="sousSection === 'profil'" class="param-panel">
          <!-- Profil du PARENT (mode parent) — d'abord -->
          <div v-if="!isApprenant" class="card">
            <div class="card-head"><Settings :size="18" /><h3>{{ t('mia.myParentProfile') }}</h3></div>
            <div class="profil-photo">
              <span class="er-avatar pp-avatar av-m">
                <img v-if="parentProfil.photoURL" :src="parentProfil.photoURL" alt="" />
                <template v-else>{{ (parentProfil.firstName[0] || '') + (parentProfil.lastName[0] || '') }}</template>
              </span>
              <label class="btn btn-outline btn-sm"><Camera :size="15" /> <span>{{ t('mia.changePhoto') }}</span><input type="file" accept="image/*" style="display:none" @change="onPickParentPhoto" /></label>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.firstName') }}</label><input v-model="parentProfil.firstName" class="input" /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.lastName') }}</label><input v-model="parentProfil.lastName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.email') }}</label><input :value="parentProfil.email" class="input" disabled /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.phone') }}</label><input v-model="parentProfil.phone" class="input" type="tel" :placeholder="t('mia.phonePlaceholder')" /></div>
            </div>
            <!-- Type de compte : particulier (reçu simple) / entreprise (facture complète) -->
            <div class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.accountType') }}</label>
                <select v-model="parentProfil.typeCompte" class="input">
                  <option value="particulier">{{ t('mia.accountIndividual') }}</option>
                  <option value="entreprise">{{ t('mia.accountBusiness') }}</option>
                </select>
              </div>
            </div>
            <template v-if="parentProfil.typeCompte === 'entreprise'">
              <div class="form-row">
                <div class="form-group"><label class="form-label">{{ t('mia.companyName') }}</label><input v-model="parentProfil.raisonSociale" class="input" /></div>
                <div class="form-group"><label class="form-label">{{ t('mia.vat') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="parentProfil.tva" class="input" /></div>
              </div>
              <div class="form-group"><label class="form-label">{{ t('mia.billingAddress') }}</label><textarea v-model="parentProfil.adresseFact" class="input" rows="2"></textarea></div>
            </template>
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
              <div class="form-group"><label class="form-label">{{ t('mia.classLabel') }}</label><select v-model="profil.niveau" class="input"><optgroup :label="t('mia.cyclePrimary')"><option v-for="n in niveauxPrimairePays(profil.pays)" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleSecondary')"><option v-for="n in niveauxSecondairePays(profil.pays)" :key="n" :value="n">{{ n }}</option></optgroup><optgroup v-if="profil.pays !== 'FR'" :label="t('mia.cycleHigher')"><option v-for="n in NIVEAUX_SUPERIEUR" :key="n" :value="n">{{ n }}</option></optgroup><option v-if="profil.pays !== 'FR'" :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
            </div>
            <template v-if="profil.niveau === NIVEAU_HORS_CATALOGUE">
              <!-- Certification : catalogue → modules préchargés + organisme + date d'examen -->
              <div class="form-group">
                <label class="form-label">{{ t('mia.certifLabel') }}</label>
                <select v-model="profil.certifId" class="input" @change="onCertif(profil)">
                  <option value="">{{ t('mia.certifChoose') }}</option>
                  <option v-for="c in CERTIFICATIONS" :key="c.id" :value="c.id">{{ c.nom }}</option>
                  <option value="autre">{{ t('mia.certifOther') }}</option>
                </select>
              </div>
              <div v-if="profil.certifId" class="form-row">
                <div class="form-group"><label class="form-label">{{ t('mia.certifOrg') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="profil.organisme" class="input" :placeholder="t('mia.certifOrgPlaceholder')" /></div>
                <div class="form-group"><label class="form-label">{{ t('mia.certifDate') }}</label><input v-model="profil.certifDate" type="date" class="input" /></div>
              </div>
              <p v-if="profil.certifId && profil.certifId !== 'autre'" class="muted small preloaded"><Check :size="13" /> {{ t('mia.certifPreloaded') }}</p>
              <p v-if="joursAvantCertif(profil) !== null" class="certif-countdown"><CalendarDays :size="14" /> {{ t('mia.certifCountdown', { n: joursAvantCertif(profil) }) }}</p>
              <div v-if="profil.certifId && certReferences(profil.certifId).length" class="form-group">
                <label class="form-label">{{ t('mia.certifRefs') }}</label>
                <div class="cert-refs">
                  <a v-for="r in certReferences(profil.certifId)" :key="r.url" :href="r.url" target="_blank" rel="noopener" class="cert-ref"><Link2 :size="13" /> {{ r.label }}</a>
                </div>
              </div>
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
            <!-- Matières (primaire/secondaire) : programme national préchargé, personnalisable -->
            <div v-if="!isNiveauSuperieur(profil.niveau) && profil.niveau !== NIVEAU_HORS_CATALOGUE" class="form-group">
              <label class="form-label">{{ t('mia.subjectsLabel') }}</label>
              <template v-if="!profil.formationModules">
                <p class="muted small">{{ t('mia.subjectsAutoHint') }}</p>
                <button type="button" class="btn btn-outline btn-sm" @click="preloadMatieres(profil)">{{ t('mia.customizeSubjects') }}</button>
              </template>
              <template v-else>
                <textarea v-model="profil.formationModules" class="input" rows="3" :placeholder="t('mia.subjectsPlaceholder')"></textarea>
                <div v-if="specialitesFR(profil).length" class="spec-adds">
                  <span class="muted small">{{ t('mia.addSpecialite') }}</span>
                  <button v-for="sp in specialitesFR(profil)" :key="sp" type="button" class="btn btn-outline btn-xs spec-btn" @click="addSpecialite(profil, sp)">+ {{ sp }}</button>
                </div>
                <button type="button" class="btn btn-ghost btn-xs reset-mat" @click="profil.formationModules = ''">{{ t('mia.resetSubjects') }}</button>
              </template>
            </div>
            <!-- Établissement (catalogue) → formation → programme préchargé (supérieur) -->
            <template v-if="isNiveauSuperieur(profil.niveau)">
              <div class="form-group">
                <label class="form-label">{{ t('mia.catSchoolLabel') }}</label>
                <select v-model="profil.catEcole" class="input" @change="onCatEcole(profil)">
                  <option value="">{{ t('mia.catSchoolChoose') }}</option>
                  <option v-for="e in ECOLES_CATALOGUE" :key="e.id" :value="e.id">{{ e.nom }}</option>
                  <option value="autre">{{ t('mia.catSchoolOther') }}</option>
                </select>
              </div>
              <div v-if="ecoleCatalogueObj(profil)" class="form-group">
                <label class="form-label">{{ t('mia.catFormationLabel') }}</label>
                <select v-model="profil.catFormation" class="input" @change="onCatFormation(profil)">
                  <option value="">{{ t('mia.catFormationChoose') }}</option>
                  <option v-for="f in ecoleCatalogueObj(profil).formations" :key="f.id" :value="f.id">{{ f.nom }}</option>
                </select>
                <p v-if="profil.catFormation" class="muted small preloaded"><Check :size="13" /> {{ t('mia.catPreloaded') }}</p>
              </div>
              <div class="form-group"><label class="form-label">{{ t('mia.mySubjects') }} <span class="muted small">{{ t('mia.commaSeparated') }}</span></label><textarea v-model="profil.formationModules" class="input" rows="3" :placeholder="t('mia.uniSubjectsPlaceholder')"></textarea></div>
            </template>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ t('mia.targetGrade') }}</label>
                <input v-model.number="profil.objectifNote" type="number" min="0" max="20" step="0.5" class="input" />
                <small class="muted small">{{ t('mia.targetGradeHint') }}</small>
              </div>
              <div v-if="!isNiveauSuperieur(profil.niveau)" class="form-group"><label class="form-label">{{ t('mia.school') }}</label><input v-model="profil.ecole" class="input" :placeholder="t('mia.schoolPlaceholder')" /></div>
              <div v-if="isNiveauSuperieur(profil.niveau)" class="form-group"><label class="form-label">{{ t('mia.filiere') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="profil.filiere" class="input" :placeholder="t('mia.filierePlaceholder')" /></div>
            </div>
            <div class="compose-actions">
              <button class="btn btn-primary" @click="saveProfil"><Check :size="16" /> <span>{{ t('mia.save') }}</span></button>
              <span v-if="profilSaved" class="muted small saved-ok">{{ t('mia.saved') }}</span>
            </div>
          </div>
          </div>
        </section>
      </template>
      </div>
    </main>

    <!-- ───────── Rail droit : agenda de révision (desktop large) ───────── -->
    <aside class="miapo-aside" data-tour="agenda">
      <div class="aside-card">
        <div class="aside-head"><CalendarDays :size="17" /><h3>{{ t('mia.weekAgenda') }}</h3></div>
        <p class="aside-sub">{{ t('mia.weekAgendaSub') }}</p>
        <div v-if="serie > 0" class="agenda-serie"><Flame :size="13" /> {{ t('mia.seanceStreak', { n: serie }) }}</div>
        <div class="agenda-days">
          <div v-for="d in planHebdo" :key="d.key" class="agenda-day" :class="{ today: d.today, done: d.status === 'done' }">
            <div class="dy-date"><span class="dy-dow">{{ d.label }}</span><span class="dy-num">{{ d.date }}</span></div>
            <div class="dy-body">
              <button v-if="d.matiere && isApprenant" class="dy-exo" @click="goRevise(d.matiere)"><Sparkles :size="12" /> {{ d.matiere }}</button>
              <span v-else-if="d.matiere" class="dy-exo dy-static">{{ d.matiere }}</span>
              <span v-else class="dy-rest">{{ t('mia.restDay') }}</span>
              <!-- L'apprenant coche sa séance ; le parent voit seulement l'état. -->
              <button v-if="d.matiere && isApprenant" class="dy-check" :class="{ on: d.status === 'done' }"
                      :title="d.status === 'done' ? t('mia.seanceUndo') : t('mia.seanceDone')" @click="toggleSeance(d)">
                <Check :size="12" />
              </button>
              <span v-else-if="d.matiere && d.status === 'done'" class="dy-check on is-static"><Check :size="12" /></span>
            </div>
          </div>
        </div>
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
            <div class="form-group"><label class="form-label">{{ t('mia.country') }}</label><select v-model="form.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select></div>
            <div v-if="!isNiveauSuperieur(form.niveau) && form.niveau !== NIVEAU_HORS_CATALOGUE" class="form-group"><label class="form-label">{{ t('mia.school') }} <span class="muted small">{{ t('mia.optional') }}</span></label><input v-model="form.ecole" class="input" :placeholder="t('mia.schoolPlaceholder')" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">{{ t('mia.sex') }}</label><select v-model="form.gender" class="input"><option value="M">{{ t('mia.boy') }}</option><option value="F">{{ t('mia.girl') }}</option></select></div>
            <div class="form-group"><label class="form-label">{{ t('mia.classLabel') }}</label><select v-model="form.niveau" class="input"><optgroup :label="t('mia.cyclePrimary')"><option v-for="n in niveauxPrimairePays(form.pays)" :key="n" :value="n">{{ n }}</option></optgroup><optgroup :label="t('mia.cycleSecondary')"><option v-for="n in niveauxSecondairePays(form.pays)" :key="n" :value="n">{{ n }}</option></optgroup><optgroup v-if="form.pays !== 'FR'" :label="t('mia.cycleHigher')"><option v-for="n in NIVEAUX_SUPERIEUR" :key="n" :value="n">{{ n }}</option></optgroup><option v-if="form.pays !== 'FR'" :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
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
            <!-- Établissement (catalogue) → formation → préchargement du programme -->
            <div class="form-group">
              <label class="form-label">{{ t('mia.catSchoolLabel') }}</label>
              <select v-model="form.catEcole" class="input" @change="onCatEcole(form)">
                <option value="">{{ t('mia.catSchoolChoose') }}</option>
                <option v-for="e in ECOLES_CATALOGUE" :key="e.id" :value="e.id">{{ e.nom }}</option>
                <option value="autre">{{ t('mia.catSchoolOther') }}</option>
              </select>
            </div>
            <div v-if="ecoleCatalogueObj(form)" class="form-group">
              <label class="form-label">{{ t('mia.catFormationLabel') }}</label>
              <select v-model="form.catFormation" class="input" @change="onCatFormation(form)">
                <option value="">{{ t('mia.catFormationChoose') }}</option>
                <option v-for="f in ecoleCatalogueObj(form).formations" :key="f.id" :value="f.id">{{ f.nom }}</option>
              </select>
              <p v-if="form.catFormation" class="muted small preloaded"><Check :size="13" /> {{ t('mia.catPreloaded') }}</p>
            </div>
            <div v-if="form.catEcole === 'autre'" class="form-row">
              <div class="form-group"><label class="form-label">{{ t('mia.school') }}</label><input v-model="form.ecole" class="input" :placeholder="t('mia.uniPlaceholder')" /></div>
              <div class="form-group"><label class="form-label">{{ t('mia.filiere') }}</label><input v-model="form.filiere" class="input" :placeholder="t('mia.filierePlaceholder')" /></div>
            </div>
            <div class="form-group"><label class="form-label">{{ t('mia.mySubjects') }} <span class="muted small">{{ t('mia.commaSeparated') }}</span></label><textarea v-model="form.formationModules" class="input" rows="3" :placeholder="t('mia.uniSubjectsPlaceholder')"></textarea></div>
          </template>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLang } from '../i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore, NIVEAUX, NIVEAUX_PRIMAIRE, NIVEAUX_SECONDAIRE, NIVEAUX_SUPERIEUR, niveauxPrimairePays, niveauxSecondairePays, isNiveauSuperieur, NIVEAU_HORS_CATALOGUE, PAYS, MATIERES, matieresPourNiveau, typesNotePays, SPECIALITES_LYCEE_GENERAL_FR, paysParDefaut, setPaysParDefaut, jourISO } from '../stores/enfantsAutonomes'
import { analyserBulletin, analyserEdt } from '../services/aiVision'
import { useTuteurStore } from '../stores/tuteur'
import { useMiapoAnalyticsStore } from '../stores/miapoAnalytics'
import { useRelanceStore } from '../stores/relance'
import { useAbonnementStore } from '../stores/abonnement'
import { useConnecteursStore } from '../stores/connecteurs'
import { isMiapoTenant } from '../utils/tenantContext'
import TuteurQuiz from '../components/TuteurQuiz.vue'
import MiapoOrientation from '../components/MiapoOrientation.vue'
import Miapo6C from '../components/Miapo6C.vue'
import Radar6C from '../components/Radar6C.vue'
import MiapoAnnales from '../components/MiapoAnnales.vue'
import MiapoFiches from '../components/MiapoFiches.vue'
import MiapoCoParent from '../components/MiapoCoParent.vue'
import MiapoEnfantCompte from '../components/MiapoEnfantCompte.vue'
import MiapoRejoindreProfil from '../components/MiapoRejoindreProfil.vue'
import MiapoNotifications from '../components/MiapoNotifications.vue'
import MiapoRelanceWhatsApp from '../components/MiapoRelanceWhatsApp.vue'
import MiapoAbonnement from '../components/MiapoAbonnement.vue'
import MiapoUtilisation from '../components/MiapoUtilisation.vue'
import MiapoFacturation from '../components/MiapoFacturation.vue'
import MiapoAlerteUsage from '../components/MiapoAlerteUsage.vue'
import { ECOLES_CATALOGUE, ecoleCatalogue, formationCatalogue } from '../data/formationsCatalogue'
import { CERTIFICATIONS, certification, certReferences } from '../data/certificationsCatalogue'
import MiapoOrbe from '../components/MiapoOrbe.vue'
import MiapoAccessibilite from '../components/MiapoAccessibilite.vue'
import MiapoProfilSwitch from '../components/MiapoProfilSwitch.vue'
import MiapoQuestionOuverte from '../components/MiapoQuestionOuverte.vue'
import MiapoInstall from '../components/MiapoInstall.vue'
import MiapoPlanning from '../components/MiapoPlanning.vue'
import MiapoOnboarding from '../components/MiapoOnboarding.vue'
import MiapoTour from '../components/MiapoTour.vue'
import MiapoFormationSetup from '../components/MiapoFormationSetup.vue'
import { Sparkles, Plus, X, Check, Target, FileText, ChevronRight, Trash2, Camera, Loader2, Lightbulb, Compass, GraduationCap, Trophy, Users, TrendingUp, Home, CreditCard, LogOut, Settings, PanelLeftClose, PanelLeftOpen, CalendarDays, CalendarCheck, Link2, ClipboardList, Layers, Flame, Bell, Gauge, Languages, Accessibility, MessageCircle, Receipt, ExternalLink, Menu, Search } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n({ useScope: 'global' })
function setLangue(l) { setLang(l) }
const authStore = useAuthStore()
async function logout() { await authStore.logout(); router.push(isMiapoTenant() ? '/' : '/login') }

const store = useEnfantsAutonomesStore()
const abo = useAbonnementStore()
const tuteur = useTuteurStore()
const connecteurs = useConnecteursStore()
const analytics = useMiapoAnalyticsStore()
const relance = useRelanceStore()
const enfants = computed(() => store.enfants)

// Suivi d'adoption MAPO+ : marque l'install PWA. Défini ici pour pouvoir le
// retirer proprement au démontage (évite les écouteurs en double).
function onAppInstalled() { try { analytics.markInstalled() } catch { /* best-effort */ } }

// Mode apprenant : MAPO+ vu par l'apprenant lui-même (langage 1re/2e personne,
// profil unique = lui) plutôt que par un parent qui suit ses enfants. Même moteur.
const isApprenant = computed(() => store.mode === 'apprenant')
// Le « payeur » (parent, ou apprenant ADULTE inscrit lui-même = supérieur /
// hors-catalogue) gère l'usage, la facturation et l'abonnement. Un enfant/mineur
// (niveau scolaire) dont le profil est activé par le parent NE gère PAS ça.
const isSelfPayer = computed(() => {
  if (store.isCompteEnfant) return false
  if (!isApprenant.value) return true // parent = payeur
  const n = activeEnfant.value?.niveau || ''
  return isNiveauSuperieur(n) || n === NIVEAU_HORS_CATALOGUE
})
function setMode(m) { store.setMode(m) }

// Seules les classes qui passent un examen national ont des annales (pas 5ème, etc.).
function estClasseExamen(niveau) {
  const n = niveau || ''
  return n === 'CM2' || n === '3ème' || /^(1ère|Tle)/.test(n)
}
const SECTIONS = computed(() => {
  const home = { key: 'accueil', label: t('mia.secHome'), icon: Home } // sans groupe (en tête)
  const progress = { key: 'progression', label: t('mia.secProgress'), icon: TrendingUp, group: 'suivi' }
  const edt = { key: 'edt', label: t('mia.secTimetable'), icon: CalendarDays, group: 'suivi' }
  const planning = { key: 'planning', label: t('mia.secPlanning'), icon: CalendarCheck, group: 'suivi' }
  const orient = { key: 'orientation', label: t('mia.secOrientation'), icon: Compass, group: 'orientation' }
  const usage = { key: 'utilisation', label: t('mia.secUsage'), icon: Gauge, group: 'compte' }
  const billing = { key: 'facturation', label: t('mia.secBilling'), icon: Receipt, group: 'compte' }
  // Bloc « Compte » (Utilisation + Facturation) = réservé au PAYEUR. Un enfant/
  // mineur géré par le parent ne le voit pas (ni l'abonnement, cf. Paramètres).
  const usageItems = isSelfPayer.value ? [usage] : []
  const billingItems = (store.isCompteEnfant || isApprenant.value) ? [] : [billing]
  if (!isApprenant.value) {
    return [
      home,
      { key: 'enfants', label: t('mia.secMyChildren'), icon: Users, group: 'suivi' },
      progress, planning, edt,
      ...usageItems, ...billingItems,
    ]
  }
  // Ordre regroupé (façon HUB) : Apprendre → Suivi → Orientation → Compte.
  return [
    home,
    { key: 'tuteur', label: t('mia.secTutor'), icon: GraduationCap, group: 'apprendre' },
    ...(estClasseExamen(activeEnfant.value?.niveau) ? [{ key: 'annales', label: t('mia.secAnnales'), icon: ClipboardList, group: 'apprendre' }] : []),
    { key: 'fiches', label: t('mia.secFiches'), icon: Layers, group: 'apprendre' },
    { key: 'enfants', label: t('mia.secMyNotes'), icon: FileText, group: 'suivi' },
    progress, planning, edt,
    { key: 'profil6c', label: t('mia.sec6c'), icon: Target, group: 'orientation' },
    orient,
    ...usageItems, ...billingItems,
  ]
})
// Regroupe le menu par bloc (façon HUB) : les items sans groupe (Accueil) restent
// en tête ; les autres sont regroupés sous un intitulé pliable.
const navGroups = computed(() => {
  const labels = { apprendre: t('mia.grpLearn'), suivi: t('mia.grpTrack'), orientation: t('mia.grpGuide'), compte: t('mia.grpAccount') }
  const out = []
  for (const s of SECTIONS.value) {
    const g = s.group || null
    const last = out[out.length - 1]
    if (last && last.group === g) last.items.push(s)
    else out.push({ group: g, label: g ? labels[g] : '', items: [s] })
  }
  return out
})
// Accordéon EXCLUSIF (un seul bloc ouvert à la fois, façon HUB). Ouvrir un bloc
// ferme le précédent. Défaut = 1er bloc groupé (« Apprendre »/Tuteur pour l'apprenant).
// Persisté par navigateur ; en mode rail (replié) tous les items restent visibles.
const defaultGroup = computed(() => navGroups.value.find((g) => g.group)?.group || '')
const openGroup = ref(null) // null = pas encore choisi → on prend le défaut
try { const s = localStorage.getItem('mapo_miapo_group'); if (s !== null) openGroup.value = s } catch { /* silent */ }
function currentOpenGroup() { return openGroup.value === null ? defaultGroup.value : openGroup.value }
function isGroupOpen(g) { return voletCollapsed.value || currentOpenGroup() === g }
function toggleGroup(g) {
  openGroup.value = currentOpenGroup() === g ? '' : g
  try { localStorage.setItem('mapo_miapo_group', openGroup.value) } catch { /* silent */ }
}
const section = ref('accueil')
// Sous-menu de la section « Paramètres » (profil / abonnement / notifications).
const sousSection = ref('profil')
const sousMenus = computed(() => {
  const items = [{ key: 'profil', label: t('mia.secProfile'), icon: Settings }]
  // Abonnement = PAYEUR uniquement (pas un enfant/mineur géré par le parent).
  if (isSelfPayer.value) items.push({ key: 'abonnement', label: t('mia.secSubscription'), icon: CreditCard })
  items.push({ key: 'langue', label: t('mia.secLanguage'), icon: Languages })
  items.push({ key: 'notification', label: t('mia.notifTitle'), icon: Bell })
  // « Mes enfants » (gestion : co-parent, compte enfant) — parent uniquement.
  if (!isApprenant.value) items.push({ key: 'enfants', label: t('mia.secMyChildren'), icon: Users })
  items.push({ key: 'connecteurs', label: t('mia.secConnectors'), icon: Link2 })
  items.push({ key: 'accessibilite', label: t('mia.secAccess'), icon: Accessibility })
  return items
})
// Menu hamburger coulissant (mobile) — piloté par le bouton ⊞ de l'en-tête (AppLayout)
const menuOpen = ref(false)
function onToggleMenu() { menuOpen.value = !menuOpen.value }
// Ouvre Paramètres → Profil (déclenché par l'avatar de l'en-tête).
function onOpenSettings(e) {
  section.value = 'profil'
  sousSection.value = (e && e.detail && e.detail.tab) || 'profil'
  syncProfil(); syncParentProfil()
  menuOpen.value = false
}

// MAPO+ (B2C) : MIAPO agit sur l'app. Le chat (MiapoBar) émet une intention
// (quiz / progression / orientation) ; on l'exécute ici — « MIAPO propose, tu valides ».
function b2cMatchMatiere(query) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const q = norm(query)
  let best = ''
  for (const m of (matieresList.value || [])) {
    const nm = norm(m)
    if (nm.length >= 3 && q.includes(nm) && nm.length > norm(best).length) best = m
  }
  return best
}
function onB2CAction(e) {
  const action = e && e.detail && e.detail.action
  const query = (e && e.detail && e.detail.query) || ''
  menuOpen.value = false
  switch (action) {
    case 'quiz': {
      if (isApprenant.value) {
        const m = b2cMatchMatiere(query)
        if (m) { goRevise(m); return }       // lance directement le quiz sur la matière détectée
        section.value = 'tuteur'
      } else section.value = 'enfants'
      return
    }
    case 'prepa':
      section.value = isApprenant.value ? 'tuteur' : 'enfants'
      if (isApprenant.value && prepaState.value === 'idle') getPrepa()   // construit le programme d'examen
      return
    case 'fiches': section.value = isApprenant.value ? 'fiches' : 'enfants'; return
    case 'annales': section.value = isApprenant.value ? 'annales' : 'enfants'; return
    case 'progression': section.value = 'progression'; return
    case 'orientation': section.value = 'orientation'; return
    case 'edt': section.value = 'edt'; return
    case 'planning':
    case 'devoirs':
    case 'calendrier': section.value = 'planning'; return
    case 'notes': section.value = 'enfants'; return
  }
}
// Navigation depuis la palette de recherche MAPO+ (loupe / Ctrl+K). On ne bascule
// que vers une section réellement présente dans le menu courant (sinon Accueil),
// « profil » (Paramètres) restant toujours accessible même hors menu.
function onGoto(e) {
  const k = e && e.detail && e.detail.section
  if (!k) return
  if (k === 'profil') { section.value = 'profil'; return }
  section.value = SECTIONS.value.some((s) => s.key === k) ? k : 'accueil'
}

// ── Export PDF du bilan de progression (impression navigateur → PDF) ──
function exporterBilan() {
  const e = activeEnfant.value
  if (!e) return
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const dots = (n) => '●'.repeat(Math.max(0, n)) + '○'.repeat(Math.max(0, 5 - n))
  const dateStr = new Date().toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const rowsProg = (progression.value || []).map((p) => `<tr><td>${esc(p.matiere)}</td><td class="dots">${dots(p.level)}</td><td>${t('mia.bilanLevel')} ${p.level}/5</td></tr>`).join('')
  const rowsRev = (aReviser.value || []).map((w) => `<li><strong>${esc(w.matiere)}</strong>${w.themes && w.themes.length ? ' — ' + esc(w.themes.join(', ')) : ''}</li>`).join('')
  const rowsNotes = (e.notes || []).map((n) => `<tr><td>${esc(n.matiere)}</td><td>${esc(n.note)}/20</td></tr>`).join('')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html lang="${locale.value}"><head><meta charset="utf-8"><title>${t('mia.bilanTitle')} — ${esc(e.firstName)}</title>
  <style>body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;max-width:720px;margin:40px auto;padding:0 32px;line-height:1.55}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0A84FF;padding-bottom:14px;margin-bottom:24px}
  .hd h2{margin:0;color:#0A84FF;font-size:22px;letter-spacing:.5px}.hd small{color:#666}
  h1{font-size:20px;margin:18px 0 6px}.who{color:#555;margin:0 0 22px}
  h3{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#0A84FF;margin:26px 0 10px;border-bottom:1px solid #eee;padding-bottom:5px}
  table{width:100%;border-collapse:collapse;font-size:14px}td{padding:8px 6px;border-bottom:1px solid #f0f0f0}
  .dots{letter-spacing:3px;color:#0A84FF}ul{margin:0;padding-left:20px}li{margin:5px 0}
  .foot{margin-top:40px;border-top:1px solid #ddd;padding-top:10px;font-size:11px;color:#999;text-align:center}</style></head>
  <body onload="window.print()">
  <div class="hd"><div><h2>MAPO+</h2><small>${t('mia.bilanGenerated')}</small></div><div style="text-align:right;color:#666;font-size:13px">${esc(dateStr)}</div></div>
  <h1>${t('mia.bilanTitle')}</h1>
  <p class="who">${esc(e.firstName)} ${esc(e.lastName || '')}${e.niveau ? ' · ' + esc(e.niveau) : ''}${e.formation ? ' · ' + esc(e.formation) : ''}</p>
  ${rowsProg ? `<h3>${t('mia.levelBySubject')}</h3><table>${rowsProg}</table>` : ''}
  ${rowsRev ? `<h3>${t('mia.bilanToReview')}</h3><ul>${rowsRev}</ul>` : ''}
  ${rowsNotes ? `<h3>${t('mia.bilanNotes')}</h3><table>${rowsNotes}</table>` : ''}
  <div class="foot">MAPO+ · EDUFREM — ${esc(dateStr)}</div>
  </body></html>`)
  w.document.close()
}

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

// Onboarding guidé au 1er lancement (nouveau compte B2C sans profil). Voir MiapoOnboarding.vue.
const showOnboarding = ref(false)
function onOnboardingDone() {
  showOnboarding.value = false
  activeId.value = enfants.value[0]?.id || ''
  // Enchaîne le parcours de 1er lancement (3e onboarding formation puis visite).
  startFirstRunFlow()
}

// ───────── 3e onboarding : configuration de la formation ─────────
// Apprenant en formation / supérieur dont MAPO ne connaît pas le programme :
// on lui fait renseigner école + lien + modules (proposés par l'IA, qu'il valide)
// AVANT la visite guidée. Rejouable à la demande depuis les écrans vides.
const showFormationSetup = ref(false)
function needsModulesSetup() {
  const e = activeEnfant.value
  if (!isApprenant.value || !e) return false
  const sansReferentiel = isNiveauSuperieur(e.niveau) || e.niveau === NIVEAU_HORS_CATALOGUE
  const sansModules = !e.formationModules || !e.formationModules.split(',').map((s) => s.trim()).filter(Boolean).length
  return sansReferentiel && sansModules
}
function formSetupKey() { return 'mapo_formsetup_skip_' + (activeEnfant.value?.id || 'x') }
function formSetupSkipped() { try { return localStorage.getItem(formSetupKey()) === '1' } catch { return false } }
function openFormationSetup() { showFormationSetup.value = true } // depuis un écran vide (forcé)
function onFormationDone() { showFormationSetup.value = false; maybeStartTour() }
function onFormationSkip() {
  showFormationSetup.value = false
  try { localStorage.setItem(formSetupKey(), '1') } catch { /* stockage indisponible */ }
  maybeStartTour()
}
// Ordonnance le 1er lancement : d'abord la formation (si besoin), puis la visite.
function startFirstRunFlow() {
  if (!authStore.isDemo && needsModulesSetup() && !formSetupSkipped()) {
    nextTick(() => { showFormationSetup.value = true })
    return
  }
  maybeStartTour()
}

// ───────── Visite guidée (2ᵉ onboarding) ─────────
// Explique le fonctionnement de l'app (menus + fonctionnalités principales) SANS
// reposer de question de profil. Une seule fois par utilisateur, après l'éventuel
// onboarding profil. Rejouable en QA via ?tour=1.
const showTour = ref(false)
const tourLabels = computed(() => ({
  skip: t('miaTour.skip'), prev: t('miaTour.prev'), next: t('miaTour.next'), done: t('miaTour.done'),
}))
const tourSteps = computed(() => {
  const s = [{ title: t('miaTour.welcomeTitle'), body: t('miaTour.welcomeBody') }]
  s.push({ target: '[data-tour=menu]', title: t('miaTour.menuTitle'), body: t('miaTour.menuBody') })
  if (isApprenant.value) {
    s.push({ target: '[data-tour=nav-tuteur]', title: t('miaTour.tutorTitle'), body: t('miaTour.tutorBody') })
    s.push({ target: '[data-tour=nav-fiches]', title: t('miaTour.fichesTitle'), body: t('miaTour.fichesBody') })
    s.push({ target: '[data-tour=nav-progression]', title: t('miaTour.progressTitle'), body: t('miaTour.progressBodyLearner') })
    s.push({ target: '[data-tour=nav-planning]', title: t('miaTour.planningTitle'), body: t('miaTour.planningBody') })
  } else {
    s.push({ target: '[data-tour=nav-enfants]', title: t('miaTour.childrenTitle'), body: t('miaTour.childrenBody') })
    s.push({ target: '[data-tour=nav-progression]', title: t('miaTour.progressTitle'), body: t('miaTour.progressBodyParent') })
    s.push({ target: '[data-tour=nav-planning]', title: t('miaTour.planningTitle'), body: t('miaTour.planningBodyParent') })
  }
  s.push({ target: '[data-tour=agenda]', title: t('miaTour.agendaTitle'), body: t('miaTour.agendaBody') })
  s.push({ target: '[data-tour=settings]', title: t('miaTour.settingsTitle'), body: t('miaTour.settingsBody') })
  s.push({ title: t('miaTour.finalTitle'), body: t('miaTour.finalBody') })
  return s
})
function tourKey() { return 'mapo_miapo_tour_v1_' + (authStore.user?.uid || 'anon') }
function tourSeen() { try { return localStorage.getItem(tourKey()) === '1' } catch { return false } }
function maybeStartTour() {
  const force = route.query.tour === '1' // relecture QA
  if (!force) {
    if (authStore.isDemo) return
    if (!enfants.value.length) return
    if (tourSeen()) return
  }
  nextTick(() => {
    // Sur mobile le menu est un tiroir fermé : on l'ouvre pour pouvoir pointer
    // les vrais éléments (sinon la visite retombe sur des cartes centrées).
    const menuEl = document.querySelector('[data-tour=menu]')
    let opened = false
    if (menuEl) {
      const r = menuEl.getBoundingClientRect()
      if (r.right <= 8 || r.left >= window.innerWidth - 8) { menuOpen.value = true; opened = true }
    }
    if (opened) setTimeout(() => { showTour.value = true }, 320)
    else showTour.value = true
  })
}
function onTourDone() {
  showTour.value = false
  menuOpen.value = false
  try { localStorage.setItem(tourKey(), '1') } catch { /* stockage indisponible */ }
}
// Le menu change selon le mode (parent allégé / apprenant complet) et le niveau
// (annales). Si la section courante disparaît du menu, on revient à l'accueil
// plutôt que d'afficher une page vide.
watch([SECTIONS, () => store.mode], () => {
  if (section.value !== 'profil' && !SECTIONS.value.some((s) => s.key === section.value)) section.value = 'accueil'
})
const initials = computed(() => activeEnfant.value ? (activeEnfant.value.firstName[0] || '') + (activeEnfant.value.lastName[0] || '') : '')

// ── En-tête du contenu (façon hub) : salutation + accès rapides ──
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('header.greetingMorning')
  if (h < 18) return t('header.greetingAfternoon')
  return t('header.greetingEvening')
})
// En mode apprenant on salue l'apprenant lui-même ; sinon le titulaire du compte.
const greetName = computed(() => {
  if (isApprenant.value && activeEnfant.value) return activeEnfant.value.firstName || authStore.userFirstName || ''
  return authStore.userFirstName || ''
})
// Sous-titre du bloc utilisateur (pied du menu) : niveau pour l'apprenant, sinon « Parent ».
const userRoleLabel = computed(() => {
  if (!isApprenant.value) return t('mia.roleParent')
  const e = activeEnfant.value
  return (e && niveauLabel(e)) || t('mia.roleLearner')
})
const headerInitials = computed(() => {
  const n = greetName.value || authStore.userFirstName || 'M'
  return (n[0] || 'M').toUpperCase()
})
function openSearch() { try { window.dispatchEvent(new CustomEvent('open-global-search')) } catch { /* silent */ } }

// ── Profil (configuration : nom, photo, cycle, classe, pays, école) ──
const profil = ref({ firstName: '', lastName: '', gender: 'M', cycle: '', niveau: '3ème', pays: 'CM', ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '', photoURL: '', objectifNote: 10, catEcole: '', catFormation: '', certifId: '', organisme: '', certifDate: '' })
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
    catEcole: e.catEcole || '', catFormation: e.catFormation || '',
    certifId: e.certifId || '', organisme: e.organisme || '', certifDate: e.certifDate || '',
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
const parentProfil = ref({ firstName: '', lastName: '', email: '', phone: '', photoURL: '', typeCompte: 'particulier', raisonSociale: '', adresseFact: '', tva: '' })
const parentSaved = ref(false)
function syncParentProfil() {
  const p = authStore.userProfile || {}
  parentProfil.value = { firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: p.phone || '', photoURL: p.photoURL || '', typeCompte: p.typeCompte || 'particulier', raisonSociale: p.raisonSociale || '', adresseFact: p.adresseFact || '', tva: p.tva || '' }
}
function onPickParentPhoto(ev) {
  const f = ev.target.files && ev.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { parentProfil.value.photoURL = String(reader.result || '') }
  reader.readAsDataURL(f)
}
function saveParentProfil() {
  authStore.updateProfile({
    firstName: parentProfil.value.firstName.trim(),
    lastName: parentProfil.value.lastName.trim(),
    phone: parentProfil.value.phone.trim(),
    photoURL: parentProfil.value.photoURL,
    typeCompte: parentProfil.value.typeCompte,
    raisonSociale: parentProfil.value.raisonSociale.trim(),
    adresseFact: parentProfil.value.adresseFact.trim(),
    tva: parentProfil.value.tva.trim(),
  })
  parentSaved.value = true
  setTimeout(() => { parentSaved.value = false }, 2000)
}
// Charge les fiches à l'ouverture de la section / au changement d'enfant.
watch([() => section.value, activeId], () => { if (section.value === 'profil') { syncProfil(); syncParentProfil() } })
// Devise (FCFA/EUR) pilotée par le pays de l'enfant actif — prioritaire sur le
// repli fuseau/langue du navigateur (qui s'appliquait avant l'hydratation).
watch(() => activeEnfant.value?.pays, (p) => abo.refreshDevise(p || ''), { immediate: true })

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
// Lacune de langue repérée sur une réponse rédigée : on l'ajoute aux révisions
// ciblées ET on lance le français — quelle que soit la matière d'origine.
function onReviseFrancais(matiere, themes) {
  const e = activeEnfant.value
  if (e) store.addRevisionCiblee(e.id, matiere, Array.isArray(themes) ? themes : [])
  goRevise(matiere, themes)
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
const form = ref({ firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: paysParDefaut(), ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '', catEcole: '', catFormation: '' })
// ── Catalogue école → formation → préchargement du programme (apprenant supérieur) ──
function ecoleCatalogueObj(o) { return (o.catEcole && o.catEcole !== 'autre') ? ecoleCatalogue(o.catEcole) : null }
function onCatEcole(o) {
  o.catFormation = ''
  const e = ecoleCatalogueObj(o)
  if (e) o.ecole = e.nom
  else if (o.catEcole === 'autre') o.ecole = ''
}
function onCatFormation(o) {
  const f = formationCatalogue(o.catEcole, o.catFormation)
  if (!f) return
  o.formationModules = f.matieres.join(', ') // préchargé, l'apprenant vérifie/ajuste
  const e = ecoleCatalogue(o.catEcole); if (e) o.ecole = e.nom
}
// ── Matières primaire/secondaire : préchargement du programme national + personnalisation ──
function preloadMatieres(o) { o.formationModules = matieresPourNiveau(o.niveau, o.pays).join(', ') }
// Spécialités du lycée général FR proposées en 1re/Terminale (à compléter par l'élève).
function specialitesFR(o) {
  return (o.pays === 'FR' && (o.niveau === '1re' || o.niveau === 'Terminale')) ? SPECIALITES_LYCEE_GENERAL_FR : []
}
function addSpecialite(o, sp) {
  const list = (o.formationModules || '').split(',').map((m) => m.trim()).filter(Boolean)
  if (!list.includes(sp)) { list.push(sp); o.formationModules = list.join(', ') }
}
// ── Certification : catalogue → modules préchargés + compte à rebours jusqu'à l'examen ──
function onCertif(o) {
  const c = certification(o.certifId)
  if (c) { o.formation = c.nom; o.formationModules = c.modules.join(', '); if (!o.organisme) o.organisme = c.organisme || '' }
}
function joursAvantCertif(o) {
  if (!o || !o.certifDate) return null
  const d = new Date(o.certifDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  const diff = Math.ceil((d - new Date(new Date().toDateString())) / 86400000)
  return diff >= 0 ? diff : null
}

const newMatiere = ref('')
const newNote = ref(null)
const newType = ref('')
const typesNote = computed(() => typesNotePays(activeEnfant.value?.pays))
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
  // Matières personnalisées (supérieur, hors-catalogue, ou secondaire édité) : priorité.
  if (e && e.formationModules) {
    const mods = e.formationModules.split(',').map((m) => m.trim()).filter(Boolean)
    if (mods.length) return mods
  }
  // Référentiel national fiable UNIQUEMENT pour le primaire / secondaire. Pour le
  // supérieur ou une formation hors-catalogue, MAPO ne connaît pas le programme de
  // l'école : on renvoie une liste VIDE tant que l'apprenant n'a pas défini ses
  // modules (3e onboarding) — plutôt que d'afficher par erreur des matières du secondaire.
  if (e && !isNiveauSuperieur(e.niveau) && e.niveau !== NIVEAU_HORS_CATALOGUE) {
    return matieresPourNiveau(e?.niveau, e?.pays)
  }
  return []
})
// Apprenant en formation / supérieur dont on ne connaît pas encore les modules :
// il doit d'abord créer son référentiel avant de saisir des notes ou de réviser.
const needsModules = computed(() => isApprenant.value && !!activeEnfant.value && matieresList.value.length === 0)
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

// ── Rappels intelligents (accueil) : devoirs à rendre aujourd'hui / en retard
// (lus depuis le planning) + 1 sujet à réviser. Nudge non intrusif vers le
// planning ; s'affiche seulement s'il y a quelque chose à signaler. ──
const rappels = computed(() => {
  // Dépendance à `section` : re-lit le localStorage du planning à chaque retour
  // sur l'accueil (les écritures localStorage ne sont pas réactives par nature).
  void section.value
  const e = activeEnfant.value
  if (!e) return { due: 0, late: 0, revision: '', hasAny: false }
  let devoirs = []
  try { const r = localStorage.getItem('mapo_b2c_devoirs_' + (e.id || 'me')); if (r) devoirs = JSON.parse(r) } catch { /* silent */ }
  const today = new Date().toISOString().slice(0, 10)
  const due = devoirs.filter((d) => !d.fait && d.echeance === today).length
  const late = devoirs.filter((d) => !d.fait && d.echeance && d.echeance < today).length
  const revision = (aReviser.value[0] && aReviser.value[0].matiere) || ''
  return { due, late, revision, hasAny: due > 0 || late > 0 }
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
  const e = activeEnfant.value
  const out = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday); dt.setDate(monday.getDate() + i)
    const weekend = i >= 5
    const jour = jourISO(dt)
    const s = e ? store.getSeance(e.id, jour) : null
    out.push({
      key: i, label: jours[i], date: dt.getDate(), today: _sameDay(dt, today), jour,
      matiere: (!weekend && mats.length) ? mats[i % mats.length] : null,
      status: s ? s.status : 'todo',
    })
  }
  return out
})
// Programme de révision d'une CERTIFICATION : répartit les modules sur les semaines
// restantes jusqu'à la date d'examen, les MOINS MAÎTRISÉS d'abord (niveau tuteur) —
// touche adaptative : plus l'apprenant progresse (quiz), plus l'ordre évolue.
const planCertif = computed(() => {
  const e = activeEnfant.value
  if (!e) return null
  const jours = joursAvantCertif(e)
  if (jours === null) return null
  const modules = (e.formationModules || '').split(',').map((m) => m.trim()).filter(Boolean)
  if (!modules.length) return null
  const semaines = Math.max(1, Math.ceil(jours / 7))
  const parSemaine = Math.max(1, Math.ceil(modules.length / semaines))
  const withLevel = modules.map((m) => ({ nom: m, niveau: tuteur.getLevel(e.id, 'auto-' + m) || 0 }))
  withLevel.sort((a, b) => a.niveau - b.niveau)
  return { jours, semaines, parSemaine, modules: withLevel }
})
/** Série : jours consécutifs avec une séance faite (le repos ne la casse pas). */
const serie = computed(() => (activeEnfant.value ? store.serieRevision(activeEnfant.value.id) : 0))
/** Seul l'apprenant coche ses séances — le parent les consulte. */
function toggleSeance(d) {
  const e = activeEnfant.value
  if (!e || !d.matiere || !isApprenant.value) return
  store.setSeance(e.id, d.jour, d.matiere, d.status === 'done' ? 'todo' : 'done')
}
// Quiz terminé → la séance du jour se coche toute seule (le compteur de
// révisions s'incrémente à chaque résultat enregistré).
watch(() => tuteur.revisionsVersion, () => {
  const e = activeEnfant.value
  if (!e || !isApprenant.value) return
  const k = jourISO(new Date())
  const d = planHebdo.value.find((x) => x.jour === k)
  if (d && d.matiere && d.status !== 'done') store.setSeance(e.id, k, d.matiere, 'done')
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

function openAdd() { form.value = { firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: paysParDefaut(), ecole: '', filiere: '', formation: '', formationUrl: '', formationModules: '' }; showAdd.value = true }
function doAdd() {
  if (!form.value.firstName.trim()) return
  activeId.value = store.addEnfant(form.value)
  showAdd.value = false
  section.value = isApprenant.value ? 'accueil' : 'enfants'
}
function addNote() {
  if (!canAddNote.value || !activeEnfant.value) return
  store.addNote(activeEnfant.value.id, newMatiere.value, newNote.value, newType.value)
  newMatiere.value = ''; newNote.value = null; newType.value = ''
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
// pdf.js chargé à la demande (CDN) : convertit la 1re page d'un bulletin PDF en
// image, réutilisée telle quelle par le pipeline vision existant (serveur inchangé).
let _pdfjs = null
async function loadPdfjs() {
  if (_pdfjs) return _pdfjs
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174'
  await new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = `${base}/pdf.min.js`; s.onload = resolve; s.onerror = reject; document.head.appendChild(s)
  })
  const lib = window.pdfjsLib
  lib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.js`
  _pdfjs = lib
  return lib
}
async function pdfToImageDataUrl(file, maxDim = 1600) {
  const lib = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  let vp = page.getViewport({ scale: 1 })
  const scale = Math.min(maxDim / vp.width, maxDim / vp.height, 3)
  vp = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = vp.width; canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
  return canvas.toDataURL('image/jpeg', 0.85)
}
async function onPickBulletin(e) {
  const file = e.target.files?.[0]; if (e.target) e.target.value = ''
  if (!file || !activeEnfant.value) return
  bulletinState.value = 'loading'; bulletinError.value = ''
  try {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
    const dataUrl = isPdf ? await pdfToImageDataUrl(file) : await downscaleImage(file)
    const res = await analyserBulletin({ imageDataUrl: dataUrl, niveau: activeEnfant.value.niveau })
    if (res.ok) { bulletinRows.value = res.matieres || []; bulletinMoyenne.value = res.moyenne ?? null; bulletinState.value = 'done' }
    else { bulletinError.value = res.reason || t('mia.bulletinFail'); bulletinState.value = 'error' }
  } catch { bulletinError.value = t('mia.visionBlurry'); bulletinState.value = 'error' }
}
function addAllBulletinNotes() {
  const e = activeEnfant.value
  if (!e) return
  // Un bulletin = des moyennes de période → on tague les notes en conséquence.
  const typeBulletin = e.pays === 'FR' ? 'Moyenne trimestrielle' : 'Note trimestrielle'
  for (const r of bulletinRows.value) {
    const note = Number(r.note)
    if (r.matiere && String(r.matiere).trim() && Number.isFinite(note)) {
      store.addNote(e.id, String(r.matiere).trim(), Math.max(0, Math.min(20, note)), typeBulletin)
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
  // Préconfiguration depuis l'inscription : si l'apprenant a déjà choisi son
  // persona + niveau à la création du compte, on crée directement son profil et
  // on SAUTE l'onboarding (pas de question redondante).
  let _pf = null
  try { _pf = JSON.parse(localStorage.getItem('mapo_signup_prefill') || 'null') } catch { _pf = null }
  const _pfComplete = _pf && _pf.persona === 'apprenant' && _pf.firstName && (_pf.niveau || _pf.formation)
  if (_pfComplete && !authStore.isDemo && enfants.value.length === 0) {
    const isHC = _pf.niveau === NIVEAU_HORS_CATALOGUE || (!_pf.niveau && _pf.formation)
    store.setMode('apprenant')
    setPaysParDefaut(_pf.pays || 'CM')
    activeId.value = store.addEnfant({
      firstName: _pf.firstName,
      niveau: isHC ? NIVEAU_HORS_CATALOGUE : _pf.niveau,
      pays: _pf.pays || 'CM',
      ecole: '',
      formation: isHC ? (_pf.formation || '') : '',
    })
    try { localStorage.removeItem('mapo_signup_prefill') } catch { /* silent */ }
    showOnboarding.value = false
  } else {
    // Onboarding guidé au 1er lancement : nouveau compte B2C sans aucun profil.
    // Forçable en QA via ?onboarding=1 ; la démo (profil amorcé) ne le déclenche pas.
    showOnboarding.value = route.query.onboarding === '1' || (!authStore.isDemo && enfants.value.length === 0)
  }
  // Pas d'onboarding profil à l'écran (apprenant préconfiguré, ou utilisateur qui
  // revient) → parcours de 1er lancement : formation (si besoin) puis visite guidée.
  if (!showOnboarding.value) startFirstRunFlow()
  // Relance WhatsApp : rafraîchit la date de dernière révision des enfants opt-in
  // à chaque ouverture (best-effort, silencieux).
  relance.refresh()
  window.addEventListener('miapo-toggle-menu', onToggleMenu)
  window.addEventListener('open-miapo-settings', onOpenSettings)
  window.addEventListener('miapo-b2c-action', onB2CAction)
  window.addEventListener('miapo-goto', onGoto)
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
  // Connecteur Carré : reflète l'état réel (serveur) ; au retour du flux OAuth,
  // ouvre Paramètres → Connecteurs et nettoie la query.
  connecteurs.refreshStatus()
  if (route.query && route.query.carre) {
    section.value = 'profil'
    sousSection.value = 'connecteurs'
    try { router.replace({ query: {} }) } catch { /* silent */ }
  }
})
onUnmounted(() => {
  window.removeEventListener('miapo-toggle-menu', onToggleMenu)
  window.removeEventListener('open-miapo-settings', onOpenSettings)
  window.removeEventListener('miapo-b2c-action', onB2CAction)
  window.removeEventListener('miapo-goto', onGoto)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<style scoped>
.miapo-shell { display: flex; align-items: stretch; gap: 0; min-height: 100%; }

/* ───────── Volet menu ───────── */
/* Menu figé : il reste en place (sticky pleine hauteur), seul le contenu défile. */
.volet { width: 224px; flex-shrink: 0; align-self: flex-start; border-right: 1px solid var(--bd, #e5e7eb); padding: 18px 14px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; height: 100vh; overflow: hidden; }
.volet-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.volet-close { display: none; margin-left: auto; background: none; border: none; color: var(--tx3, #6b7280); cursor: pointer; padding: 4px; border-radius: 8px; }
.volet-close:hover { background: rgba(0,0,0,.05); }
.brand-ic { width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: -0.02em; }
.brand-tx { display: flex; flex-direction: column; line-height: 1.2; }
.brand-tx strong { font-size: 16px; color: var(--tx, #1f2937); }
.brand-tx small { font-size: 11px; color: var(--tx3, #6b7280); }

.volet-child { padding: 0 4px; }
.volet-mode { display: flex; gap: 4px; padding: 3px; background: var(--input-bg, #eef1f4); border-radius: 10px; }
.volet-mode button { flex: 1; padding: 7px 8px; border: none; background: none; border-radius: 8px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s; }
.volet-mode button.on { background: #fff; color: var(--pr); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.child-select { width: 100%; padding: 9px 11px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 13.5px; background: #fff; color: var(--tx); }
.child-single { font-size: 14px; font-weight: 600; color: var(--tx); padding: 4px 6px; } .child-single span { font-size: 12px; font-weight: 500; color: var(--tx3); background: var(--input-bg, #eef1f4); padding: 2px 8px; border-radius: 20px; margin-left: 4px; }

/* Seul le milieu du menu défile : en-tête (marque + repli + enfant) et pied
   (installer + réglages + déconnexion) restent fixes, façon HUB. */
.volet-nav { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
/* Blocs pliables du menu (accordéon façon HUB / MAPO supérieur). */
.nav-group-head {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: 10px 12px 5px; margin-top: 3px; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--tx3, #9098a6); text-align: left;
}
.nav-group-head:hover { color: var(--tx2, #4b5563); }
.nav-group-chev { transition: transform .18s; flex-shrink: 0; color: var(--tx3, #9098a6); }
.nav-group-chev.open { transform: rotate(90deg); }
.nav-group-items { display: flex; flex-direction: column; gap: 3px; }
.volet.collapsed .nav-group-head { display: none; }
/* Profil + Déconnexion groupés en bas du volet (Profil juste au-dessus). */
.volet-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 3px; }
/* Pied fixe façon HUB : bloc utilisateur (avatar + nom/rôle → réglages) + déconnexion. */
.volet-user-row { display: flex; align-items: center; gap: 6px; }
.volet-user { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 7px 8px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; }
.volet-user:hover { background: var(--input-bg, #f1f3f5); }
.volet-user.active { background: rgba(var(--pr-rgb,21,88,176),.10); }
.volet-user-av { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-size: 13px; font-weight: 800; }
.volet-user-tx { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.volet-user-tx strong { font-size: 13.5px; font-weight: 700; color: var(--tx, #1f2937); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.volet-user-tx small { font-size: 11.5px; color: var(--tx3, #9098a6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.volet-logout { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border: 1px solid var(--bd, #e5e7eb); background: none; border-radius: 10px; cursor: pointer; color: var(--tx3, #6b7280); }
.volet-logout:hover { background: rgba(217,48,37,.07); color: #D93025; border-color: rgba(217,48,37,.3); }
.volet.collapsed .volet-user-tx { display: none; }
.volet.collapsed .volet-user-row { flex-direction: column; gap: 8px; }
/* Carré : app distincte de l'écosystème → séparée visuellement, en bas du volet */
.volet-carre {
  display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 9px 12px;
  border: 1px solid var(--divider, #e5e7eb); border-radius: 10px; cursor: pointer;
  text-decoration: none; color: var(--tx2, #4b5563); font-size: 13.5px; transition: .15s;
}
.volet-carre:hover { background: var(--input-bg, #f1f3f5); border-color: var(--tx3, #9ca3af); }
.volet-carre-name { font-weight: 600; font-family: var(--font-display, inherit); }
.volet-carre-ext { margin-left: auto; color: var(--tx3, #9ca3af); }
.carre-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
  background: #0f172a; color: #fff; font-family: var(--font-display, inherit);
  font-weight: 800; font-size: 13px; line-height: 1;
}
.carre-badge.sm { width: 22px; height: 22px; border-radius: 6px; font-size: 12px; }
.connector-state { display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 10px; font-size: 13px; }
.connector-state.ok { color: #16a34a; }
.connector-state.ok svg { color: #16a34a; }
.connector-input { margin-bottom: 10px; }
.nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; color: var(--tx2, #4b5563); text-align: left; width: 100%; }
.nav-item:hover { background: var(--input-bg, #f1f3f5); }
.nav-item.active { background: rgba(var(--pr-rgb,21,88,176),.10); color: var(--pr, #1558B0); font-weight: 600; }

/* ───────── Main ───────── */
.miapo-main { flex: 1; min-width: 0; max-width: 760px; display: flex; flex-direction: column; overflow: hidden; }
/* En-tête du contenu (façon hub) : salutation fixe, seul le contenu défile. */
.miapo-topbar {
  flex-shrink: 0;
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  padding: 13px 26px;
  /* Même teinte que le menu latéral (qui laisse voir --bg), mais légèrement
     translucide pour laisser deviner le contenu qui défile en dessous. */
  background: rgba(var(--bg-rgb, 238, 240, 246), 0.72);
  backdrop-filter: saturate(150%) blur(16px);
  -webkit-backdrop-filter: saturate(150%) blur(16px);
  border-bottom: 1px solid var(--bd, #e8e9ef);
}
.mtb-burger { display: none; border: none; background: none; color: #40444f; cursor: pointer; padding: 4px; margin: -2px 2px -2px -4px; }
.mtb-hi { font-size: 19px; font-weight: 800; color: #1a1c26; letter-spacing: -0.01em; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mtb-spacer { flex: 1; }
.mtb-ic {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 11px; border: 1px solid var(--bd, #e8e9ef);
  background: #fff; color: #4a4f5a; cursor: pointer; transition: background 0.15s, border-color 0.15s; flex-shrink: 0;
}
.mtb-ic:hover { background: #f4f2fb; border-color: #d9d3ee; }
.mtb-avatar { border: none; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; }
.mtb-initials { font-size: 13px; font-weight: 800; }
.miapo-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 26px 28px; }

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
/* Séance faite : coche + jour estompé, la série se lit d'un coup d'œil. */
.dy-check { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: 6px; border-radius: 50%; border: 1px solid var(--bd, #e5e7eb); background: #fff; color: var(--tx3); cursor: pointer; flex-shrink: 0; }
.dy-check:hover { border-color: #1B8A5A; color: #1B8A5A; }
.dy-check.on { background: #1B8A5A; border-color: #1B8A5A; color: #fff; }
.dy-check.is-static { cursor: default; }
.agenda-day.done .dy-exo { opacity: .55; }
.agenda-serie { display: inline-flex; align-items: center; gap: 5px; margin: 0 0 10px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #B87A00; background: rgba(232,149,10,.12); }
.dy-rest { font-size: 12px; color: var(--tx3); font-style: italic; }
.aside-input { width: 100%; box-sizing: border-box; margin-bottom: 8px; font-size: 13px; }
.aside-connect { width: 100%; }
.aside-note { font-size: 11px; color: var(--tx3); margin: 8px 0 0; }
.main-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.main-head h1 { font-size: 23px; font-weight: 700; margin: 0; }
.sec { display: flex; flex-direction: column; gap: 16px; }

/* Barre d'onglets du menu Paramètres */
.param-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 5px; background: rgba(var(--pr-rgb), .06); border-radius: 14px; }
.param-tab { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border: none; background: none; border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--tx3); cursor: pointer; transition: background .15s ease, color .15s ease; }
.param-tab:hover { color: var(--tx); }
.param-tab.active { background: #fff; color: var(--pr); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.param-tab svg { flex-shrink: 0; }
/* Panneau d'un sous-onglet : espace verticalement les cartes empilées */
.param-panel { display: flex; flex-direction: column; gap: 16px; }
.param-panel > :first-child { margin-top: 0; }
/* Choix de langue */
.lang-choices { display: flex; gap: 10px; margin-top: 6px; }
.lang-btn { padding: 9px 18px; border: 1px solid var(--bd, #e5e7eb); background: #fff; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--tx); cursor: pointer; }
.lang-btn.active { border-color: var(--pr); color: var(--pr); background: rgba(var(--pr-rgb), .08); }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.pdf-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .1); color: var(--pr); border: none; border-radius: 9px; padding: 7px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.pdf-btn:hover { background: rgba(var(--pr-rgb), .18); }
.rappel-card { display: block; width: 100%; text-align: left; cursor: pointer; border: 1px solid rgba(var(--pr-rgb), .28); background: linear-gradient(180deg, rgba(var(--pr-rgb), .06), rgba(var(--pr-rgb), .02)); }
.rappel-head { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.rappel-head h3 { font-size: 14.5px; font-weight: 700; margin: 0; color: var(--tx); }
.rappel-lines { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.rappel-line { font-size: 13.5px; color: var(--tx); }
.rappel-line.late { color: #D93025; font-weight: 600; }
.rappel-line.rev { color: var(--tx2, var(--tx3)); }
.rappel-cta { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--pr); }
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
.insight-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
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
.certif-countdown { display: flex; align-items: center; gap: 7px; margin: 8px 0 4px; font-size: 13px; font-weight: 600; color: var(--pr, #1558B0); background: rgba(var(--pr-rgb,21,88,176),.08); padding: 8px 12px; border-radius: 10px; }
.certif-countdown svg { flex-shrink: 0; }
.certif-plan-card .cp-jn { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--pr, #1558B0); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 3px 10px; border-radius: 20px; }
.certif-plan-card .cp-hint { margin: 6px 0 12px; }
.cp-mods { display: flex; flex-direction: column; gap: 8px; }
.cp-mod { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 12px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; background: #fff; cursor: pointer; font: inherit; }
button.cp-mod:hover { border-color: var(--pr, #1558B0); }
.cp-mod.cp-static { cursor: default; }
.cp-mod.mastered { background: rgba(27,138,90,.05); border-color: rgba(27,138,90,.25); }
.cp-name { flex: 1; font-size: 14px; color: var(--tx, #1f2937); }
.cp-lvl { font-size: 11px; font-weight: 700; color: var(--tx3, #6b7280); background: var(--input-bg, #eef1f4); padding: 2px 9px; border-radius: 20px; white-space: nowrap; }
.cp-lvl.ok { color: #1B8A5A; background: rgba(27,138,90,.12); }
.cert-refs { display: flex; flex-wrap: wrap; gap: 8px; }
.cert-ref { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--pr, #1558B0); text-decoration: none; padding: 5px 10px; border: 1px solid var(--bd, #e5e7eb); border-radius: 8px; }
.cert-ref:hover { border-color: var(--pr, #1558B0); background: rgba(var(--pr-rgb,21,88,176),.05); }
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
.nr-type { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: var(--pr-soft, #eef2ff); color: var(--pr, #4f46e5); font-size: 11px; font-weight: 600; vertical-align: middle; }
.spec-adds { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.spec-btn { font-size: 12px; }
.reset-mat { margin-top: 6px; }
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
.modules-empty { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 4px 0 2px; }
.modules-empty .muted { margin: 0; }

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
  .miapo-shell { display: flex; width: 100%; min-height: 0; }
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
  .miapo-main { max-width: 100%; width: 100%; box-sizing: border-box; }
  .miapo-scroll { padding: 14px 14px 24px; }
  .miapo-topbar { padding: 11px 14px; }
  .mtb-burger { display: inline-flex; }
  .mtb-hi { font-size: 17.5px; }
  .main-head h1 { font-size: 20px; }
  .stat-grid { gap: 8px; }
}
@media (max-width: 420px) {
  .volet-brand .brand-tx small { display: none; }
  .main-head .btn span { display: none; }
  /* Densité confort sur petit écran : moins de marge perdue */
  .miapo-scroll { padding: 12px 10px 20px; }
  .card { padding: 14px 13px; }
  .intro-card { padding: 28px 18px; margin: 18px auto; }
  .abo-card { padding: 24px 16px; }
  .stat { padding: 13px 10px; }
}
</style>
