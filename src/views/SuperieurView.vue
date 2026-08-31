<template>
  <!-- Pas connecté → écran de login dédié -->
  <SuperieurLogin v-if="!authSup.isLoggedIn" @logged-in="onLoggedIn" />

  <!-- Connecté via lien magique → écran "définissez votre mot de passe" -->
  <div v-else-if="authStore.needsPassword" class="sup-onboarding">
    <div class="sup-onboarding-card">
      <h2 class="sup-onboarding-h2">{{ t('sup.shell.onboarding.welcome', { name: authStore.userFirstName || '' }) }}</h2>
      <p class="sup-onboarding-sub">
        {{ t('sup.shell.onboarding.connectedTo') }} <strong>{{ schoolIdentity.nom || t('sup.shell.onboarding.yourSchoolFallback') }}</strong>.
        {{ t('sup.shell.onboarding.setPasswordHint') }}
      </p>
      <form class="sup-onboarding-form" @submit.prevent="submitInitialPassword">
        <label class="sup-onboarding-field">
          <span>{{ t('sup.shell.onboarding.newPassword') }}</span>
          <input
            v-model="onboardingPassword"
            :type="showOnbPwd ? 'text' : 'password'"
            required minlength="6"
            autocomplete="new-password"
            :placeholder="t('sup.shell.onboarding.newPasswordPh')"
          />
        </label>
        <label class="sup-onboarding-field">
          <span>{{ t('sup.shell.onboarding.confirmPassword') }}</span>
          <input
            v-model="onboardingConfirm"
            :type="showOnbPwd ? 'text' : 'password'"
            required minlength="6"
            autocomplete="new-password"
            :placeholder="t('sup.shell.onboarding.confirmPasswordPh')"
          />
        </label>
        <label class="sup-onboarding-check">
          <input type="checkbox" v-model="showOnbPwd" />
          <span>{{ t('sup.shell.onboarding.showPasswords') }}</span>
        </label>
        <p v-if="onboardingError" class="sup-onboarding-err">{{ onboardingError }}</p>
        <button type="submit" class="sup-onboarding-btn" :disabled="onboardingBusy">
          {{ onboardingBusy ? t('sup.shell.onboarding.saving') : t('sup.shell.onboarding.saveAndContinue') }}
        </button>
        <button type="button" class="sup-onboarding-skip" @click="skipInitialPassword">
          {{ t('sup.shell.onboarding.later') }}
        </button>
      </form>
    </div>
  </div>

  <!-- Connecté → layout sidebar + contenu -->
  <div v-else class="sup">
    <!-- Overlay mobile -->
    <div
      v-if="sidebarOpen"
      class="sup-overlay"
      @click="sidebarOpen = false"
    ></div>

    <!-- ── Sidebar gauche ── -->
    <aside
      class="sup-sidebar"
      :class="{ 'is-open': sidebarOpen, 'is-rail': sidebarHidden }"
    >
      <div class="sup-side-top">
        <div class="sup-brand">
          <img v-if="schoolIdentity.logoUrl" :src="schoolIdentity.logoUrl" :alt="schoolIdentity.sigle" class="sup-logo-img" />
          <div v-else class="sup-logo">{{ (schoolIdentity.sigle || 'M')[0] }}</div>
          <div class="sup-brand-info">
            <div class="sup-brand-title">{{ schoolIdentity.nom || 'MAPO' }}</div>
            <div class="sup-brand-sub">{{ t('sup.shell.brandSubtitle') }}</div>
          </div>
        </div>
      </div>

      <div class="sup-year">
        <select v-model="selectedYear" class="sup-year-select" :aria-label="t('sup.shell.academicYear')">
          <option v-for="y in academicYears" :key="y" :value="y">{{ t('sup.shell.yearOption', { year: y }) }}</option>
        </select>
      </div>

      <div v-if="isGroupMode" class="sup-nav sup-nav-groupe" v-show="!sidebarHidden">
        <div class="sup-groupe-hint">{{ t('sup.shell.groupHintLine1') }}<br />{{ t('sup.shell.groupHintLine2') }}</div>
      </div>
      <nav v-else class="sup-nav">
        <template v-for="(group, gi) in tabsGroupes" :key="gi">
          <button
            v-if="group.section"
            class="sup-nav-section-header"
            type="button"
            @click="toggleSection(group.section)"
          >
            <span>{{ sectionLabel(group.section) }}</span>
            <svg class="sup-section-chevron" :class="{ open: isSectionOpen(group.section) }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-show="!group.section || isSectionOpen(group.section)" class="sup-nav-section-items">
            <button
              v-for="t in group.items"
              :key="t.key"
              class="sup-nav-item"
              :class="{ active: activeTab === t.key }"
              type="button"
              :title="sidebarHidden ? navLabel(t) : null"
              @click="choisirTab(t.key)"
            >
              <span class="sup-nav-icon" v-html="t.icon"></span>
              <span class="sup-nav-label">{{ navLabel(t) }}</span>
            </button>
          </div>
        </template>
      </nav>

      <div class="sup-side-bottom">
        <div class="sup-user">
          <div v-if="userPhotoURL" class="sup-user-avatar sup-user-avatar-img">
            <img :src="userPhotoURL" :alt="userDisplayName" />
          </div>
          <div v-else class="sup-user-avatar">{{ initiales(userDisplayName) }}</div>
          <div class="sup-user-info">
            <div class="sup-user-name">{{ userDisplayName || t('sidebar.user') }}</div>
            <div class="sup-user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <button class="sup-logout" type="button" @click="seDeconnecter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          {{ t('sidebar.logout') }}
        </button>
      </div>
    </aside>

    <!-- ── Zone principale ── -->
    <div class="sup-main">
      <header class="sup-topbar">
        <div class="sup-hdr-left">
          <button
            class="sup-collapse-toggle"
            type="button"
            @click="toggleSidebar"
            :title="isMobile ? t('header.menu') : (sidebarHidden ? t('sup.shell.showMenu') : t('sup.shell.collapseMenu'))"
          >
            <Menu v-if="isMobile" :size="22" />
            <PanelLeftClose v-else-if="!sidebarHidden" :size="18" />
            <PanelLeftOpen v-else :size="18" />
          </button>
          <p class="sup-hdr-greeting">{{ greeting }}, {{ userFirstName }}</p>
        </div>

        <div class="sup-topbar-right">
          <!-- Nom de l'établissement -->
          <button v-if="schoolIdentity.nom" class="sup-hdr-school" type="button" @click="choisirTab('parametres')" :title="t('sup.shell.schoolSettingsTitle')">
            <img v-if="schoolIdentity.logoUrl" :src="schoolIdentity.logoUrl" :alt="schoolIdentity.sigle" class="sup-hdr-school-logo" />
            <span class="sup-hdr-school-name">{{ schoolIdentity.nom }}</span>
          </button>

          <!-- Statut de connexion -->
          <div class="sup-conn" :class="connClass" :title="connTitle">
            <span class="sup-conn-dot"></span>
            <span v-if="connText" class="sup-conn-text">{{ connText }}</span>
          </div>

          <!-- Sélecteur de langue -->
          <div class="sup-hdr-lang">
            <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
            <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
          </div>

          <!-- Recherche (Ctrl+K) -->
          <button class="sup-hdr-icon sup-hdr-search" type="button" :title="t('sup.shell.searchTitle')" @click="openSupSearch">
            <Search :size="20" />
            <span class="sup-hdr-search-hint">Ctrl+K</span>
          </button>
          <!-- Cloche notifications (visible pour admin, RI, comptable) -->
          <div v-if="canSeeNotifications" class="sup-notif-wrap" v-click-outside="closeNotifMenu">
            <button
              type="button"
              class="sup-notif-btn"
              :class="{ 'has-unread': notifCount > 0 }"
              :title="notifCount > 0 ? t('sup.shell.notif.tooltipCount', { n: notifCount }) : t('sup.shell.notif.tooltipNone')"
              @click="toggleNotifMenu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <span v-if="notifCount > 0" class="sup-notif-badge">{{ notifCount > 9 ? '9+' : notifCount }}</span>
            </button>
            <div v-if="notifMenuOpen" class="sup-notif-menu">
              <header class="sup-notif-head">
                <span class="sup-notif-title">{{ t('header.notifications') }}</span>
                <span v-if="notifCount > 0" class="sup-notif-count">{{ t('sup.shell.notif.toProcess', { n: notifCount }) }}</span>
              </header>
              <div v-if="notifCount === 0" class="sup-notif-empty">
                {{ t('sup.shell.notif.empty') }}
              </div>
              <ul v-else class="sup-notif-list">
                <li v-for="n in notifications" :key="n.id" class="sup-notif-item" @click="openNotif(n)">
                  <div class="sup-notif-dot" />
                  <div class="sup-notif-text">
                    <div class="sup-notif-msg">{{ n.message }}</div>
                    <div class="sup-notif-meta">
                      <span v-if="n.montant">{{ fmtMontantNotif(n.montant) }}</span>
                      <span v-if="n.date"> · {{ fmtDateNotif(n.date) }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <!-- Avatar utilisateur -->
          <button class="sup-hdr-avatar" type="button" @click="choisirTab('parametres')" :title="userDisplayName || t('sidebar.profile')">
            <img v-if="userPhotoURL" :src="userPhotoURL" :alt="userDisplayName" class="sup-hdr-avatar-img" />
            <span v-else>{{ initiales(userDisplayName) }}</span>
          </button>

          <!-- Réglages -->
          <button v-if="canSeeParametres" class="sup-hdr-icon" type="button" :title="t('header.settings')" @click="choisirTab('parametres')">
            <Settings :size="20" />
          </button>
        </div>
      </header>

      <!-- Recherche supérieur (Ctrl+K) : étudiants + intervenants -->
      <div v-if="supSearchOpen" class="sup-search-overlay" @click.self="supSearchOpen = false">
        <div class="sup-search-box">
          <div class="sup-search-field">
            <Search :size="18" />
            <input
              ref="supSearchInput"
              v-model="supSearchQuery"
              class="sup-search-input"
              type="text"
              :placeholder="t('sup.shell.search.placeholder')"
              @keydown.esc="supSearchOpen = false"
            />
            <kbd class="sup-search-esc">{{ t('sup.shell.search.esc') }}</kbd>
          </div>
          <ul v-if="supResults.length" class="sup-search-results">
            <li v-for="r in supResults" :key="r.type + r.id" class="sup-search-result" @click="ouvrirResultat(r)">
              <span class="sup-search-rt" :class="r.type">{{ r.type === 'etudiant' ? t('sup.shell.search.typeStudent') : t('sup.shell.search.typeInstructor') }}</span>
              <span class="sup-search-rn">{{ r.nom }}</span>
              <span v-if="r.sub" class="sup-search-rs">{{ r.sub }}</span>
            </li>
          </ul>
          <p v-else-if="supSearchQuery" class="sup-search-empty">{{ t('sup.shell.search.noResults') }}</p>
        </div>
      </div>

      <main class="sup-body">
        <div v-if="isFounderInCampus" class="sup-campus-banner">
          <span class="sup-campus-banner-txt">{{ t('sup.shell.campusBanner', { campus: activeCampusNom }) }}</span>
          <button type="button" class="sup-campus-back" @click="retourGroupe">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            {{ t('sup.shell.backToGroup') }}
          </button>
        </div>
        <SupGroupeDashboard v-if="isGroupMode" />
        <component v-else :is="panels[activeTab]" />
      </main>
    </div>

    <!-- Barre d'actions basse (mobile) : nav rapide + bouton central selon le profil -->
    <nav class="sup-bbar" aria-label="Navigation rapide">
      <button
        v-for="it in bbar"
        :key="it.key"
        class="sup-bbar-item"
        :class="{ active: activeTab === it.key }"
        type="button"
        @click="choisirTab(it.key)"
      >
        <span class="sup-bbar-ic" v-html="it.icon"></span>
        <span>{{ it.label }}</span>
      </button>
    </nav>

    <!-- Copilote MIAPO (langage naturel, Ctrl+J) — bouton flottant + barre -->
    <SuperieurMiapoBar />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useSuperieurStore } from '../stores/superieur'
import { useSuperieurAuthStore, SUP_ROLES } from '../stores/superieurAuth'
import { useAuthStore } from '../stores/auth'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { useSuperieurPermissionsStore } from '../stores/superieurPermissions'
import { useMobiliteStore } from '../stores/mobilite'
import { useI18n } from 'vue-i18n'
import { setLang } from '../i18n'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import { PanelLeftClose, PanelLeftOpen, Menu, Search, Settings } from 'lucide-vue-next'
import SuperieurLogin from './superieur/SuperieurLogin.vue'
import SuperieurMiapoBar from './superieur/SuperieurMiapoBar.vue'
import SupDashboard from './superieur/SupDashboard.vue'
import SupGroupeDashboard from './superieur/SupGroupeDashboard.vue'
import SupEtudiants from './superieur/SupEtudiants.vue'
import SupFormation from './superieur/SupFormation.vue'
import SupInscriptions from './superieur/SupInscriptions.vue'
import SupInscriptionsPedagogiques from './superieur/SupInscriptionsPedagogiques.vue'
import SupEmploiDuTemps from './superieur/SupEmploiDuTemps.vue'
import SupIntervenants from './superieur/SupIntervenants.vue'
import SupNotes from './superieur/SupNotes.vue'
import SupStages from './superieur/SupStages.vue'
import SupAssiduite from './superieur/SupAssiduite.vue'
import SupSalles from './superieur/SupSalles.vue'
// Finance : un seul module « Comptabilité » qui regroupe les 7 vues en onglets
import SupComptabilite from './superieur/SupComptabilite.vue'
import SupDiplomes from './superieur/SupDiplomes.vue'
// Espace enseignant : menu complet (comme le prof du Secondaire)
import SupEnsMesUe from './superieur/SupEnsMesUe.vue'
import SupEnsNotes from './superieur/SupEnsNotes.vue'
import SupEnsCours from './superieur/SupEnsCours.vue'
import SupEnsDevoirs from './superieur/SupEnsDevoirs.vue'
import SupEnsEdt from './superieur/SupEnsEdt.vue'
import SupEnsMessagerie from './superieur/SupEnsMessagerie.vue'
import SupEnsPaie from './superieur/SupEnsPaie.vue'
import SupGestionAcces from './superieur/SupGestionAcces.vue'
import SupMobiliteEntrante from './superieur/SupMobiliteEntrante.vue'
import SupParametres from './superieur/SupParametres.vue'
import SupRoles from './superieur/SupRoles.vue'
import SupEspaceEtudiant from './superieur/SupEspaceEtudiant.vue'
import SupEspaceEnseignant from './superieur/SupEspaceEnseignant.vue'
import SupEspaceParent from './superieur/SupEspaceParent.vue'
import SupImport from './superieur/SupImport.vue'
import SupTransitionAnnee from './superieur/SupTransitionAnnee.vue'
import SupRapports from './superieur/SupRapports.vue'
import SupDecrochage from './superieur/SupDecrochage.vue'
import SupMessagerie from './superieur/SupMessagerie.vue'
// Services additionnels (mémoires, attestations, congés, bibliothèque universitaire)
import SupMemoires from './superieur/SupMemoires.vue'
import SupAttestations from './superieur/SupAttestations.vue'
import SupConges from './superieur/SupConges.vue'
import SupBiblioUni from './superieur/SupBiblioUni.vue'

const store = useSuperieurStore()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()
const schoolIdentity = useSchoolIdentityStore()
const supPerms = useSuperieurPermissionsStore()
const mobilite = useMobiliteStore()

// Nom complet affiché dans la sidebar : on essaie displayName, sinon
// firstName + lastName, sinon email, sinon "Utilisateur".
const userDisplayName = computed(() => {
  const p = authStore.userProfile
  if (!p) return ''
  if (p.displayName && p.displayName.trim()) return p.displayName
  const fn = (p.firstName || '').trim()
  const ln = (p.lastName || '').trim()
  if (fn || ln) return `${fn} ${ln}`.trim()
  if (p.email) return p.email
  return ''
})
const userPhotoURL = computed(() => authStore.userProfile?.photoURL || null)

// ── Onboarding magic link : définir un mot de passe initial ───────
const onboardingPassword = ref('')
const onboardingConfirm = ref('')
const showOnbPwd = ref(false)
const onboardingBusy = ref(false)
const onboardingError = ref('')

async function submitInitialPassword() {
  onboardingError.value = ''
  if (onboardingPassword.value.length < 6) {
    onboardingError.value = t('sup.shell.onboarding.errTooShort')
    return
  }
  if (onboardingPassword.value !== onboardingConfirm.value) {
    onboardingError.value = t('sup.shell.onboarding.errMismatch')
    return
  }
  onboardingBusy.value = true
  try {
    const r = await authStore.setInitialPassword(onboardingPassword.value)
    if (!r.success) {
      onboardingError.value = r.error || t('sup.shell.onboarding.errSaveFailed')
      return
    }
    onboardingPassword.value = ''
    onboardingConfirm.value = ''
  } finally {
    onboardingBusy.value = false
  }
}
function skipInitialPassword() {
  authStore.dismissNeedsPassword()
}

// ── Notifications (cloche header) ────────────────────────────────
const notifications = computed(() => mobilite.notifications)
const notifCount = computed(() => mobilite.notificationsCount)
const canSeeNotifications = computed(() =>
  ['admin', 'relation_internationale', 'comptable'].includes(authSup.role)
)
const notifMenuOpen = ref(false)
function toggleNotifMenu() { notifMenuOpen.value = !notifMenuOpen.value }
function closeNotifMenu() { notifMenuOpen.value = false }

function openNotif(n) {
  notifMenuOpen.value = false
  if (n.type === 'acompte_a_confirmer') {
    mobilite.selectDossier(n.dossierId)
    activeTab.value = 'mobilite_entrante'
  }
}

function fmtDateNotif(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function fmtMontantNotif(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// Click outside (directive locale)
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) binding.value(event)
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  },
}

// Onglet + campus actifs persistés : au rechargement, on revient là où on était.
const ACTIVE_TAB_KEY = 'mapo_sup_active_tab'
const ACTIVE_CAMPUS_KEY = 'mapo_sup_active_campus'
function loadActiveTab() {
  try { return localStorage.getItem(ACTIVE_TAB_KEY) || 'dashboard' } catch { return 'dashboard' }
}
const activeTab = ref(loadActiveTab())
const sidebarOpen = ref(false)
// État replié desktop (persisté localement, séparé du drawer mobile).
const SIDEBAR_HIDDEN_KEY = 'mapo_sup_sidebar_hidden'
const sidebarHidden = ref(loadSidebarHidden())

// ── Accordéons de la barre latérale (comme les éditions Secondaire / Primaire) ──
const collapsedSections = ref({})
function toggleSection(name) { collapsedSections.value = { ...collapsedSections.value, [name]: !collapsedSections.value[name] } }
function isSectionOpen(name) { return sidebarHidden.value ? true : !collapsedSections.value[name] }

/**
 * Sélecteur d'année académique.
 *
 * ⚠️ 28/08/2026 — même défaut que la barre latérale du secondaire, corrigé en
 * même temps : la liste ne contenait que les 4 dernières années CIVILES,
 * calculées depuis la date du jour. L'année réellement déclarée par
 * l'établissement n'y figurait pas forcément, et un `select` dont la valeur n'a
 * pas d'option s'affiche VIDE.
 *
 * L'année de l'établissement passe donc en tête et devient la sélection par
 * défaut ; les années calculées ne sont qu'un complément de navigation.
 */
const academicYears = computed(() => {
  const now = new Date()
  const start = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
  const calculees = [0, 1, 2, 3].map((i) => `${start - i}-${start - i + 1}`)
  const declaree = String(schoolIdentity.anneeAcademique || '').trim()
  return declaree ? [declaree, ...calculees.filter((y) => y !== declaree)] : calculees
})
const selectedYear = ref(academicYears.value[0])
// L'identité de l'école arrive après le premier rendu : on recale la sélection
// dès qu'elle est connue, sinon le champ reste sur une année calculée.
watch(academicYears, (liste) => {
  if (liste.length && !liste.includes(selectedYear.value)) selectedYear.value = liste[0]
})

function loadSidebarHidden() {
  try { return localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1' }
  catch (e) { return false }
}
function saveSidebarHidden(v) {
  try { localStorage.setItem(SIDEBAR_HIDDEN_KEY, v ? '1' : '0') }
  catch (e) { /* silent */ }
}

// Toggle qui s'adapte au viewport : drawer mobile vs replier desktop.
function toggleSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth <= 900) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    sidebarHidden.value = !sidebarHidden.value
    saveSidebarHidden(sidebarHidden.value)
  }
}

const panels = {
  dashboard: SupDashboard,
  etudiants: SupEtudiants,
  formation: SupFormation,
  // Onglet « Inscriptions » du menu = inscriptions ADMINISTRATIVES (fait générateur).
  inscriptions: SupInscriptions,
  // Inscriptions PÉDAGOGIQUES (choix des UE) : conservées et montables (clé
  // `inscriptions_peda`) mais retirées du menu latéral pour l'instant.
  inscriptions_peda: SupInscriptionsPedagogiques,
  edt: SupEmploiDuTemps,
  intervenants: SupIntervenants,
  notes: SupNotes,
  diplomes: SupDiplomes,
  stages: SupStages,
  assiduite: SupAssiduite,
  salles: SupSalles,
  finance: SupComptabilite,
  gestion_acces: SupGestionAcces,
  mobilite_entrante: SupMobiliteEntrante,
  parametres: SupParametres,
  roles: SupRoles,
  espace_etudiant: SupEspaceEtudiant,
  espace_enseignant: SupEspaceEnseignant,
  ens_ue: SupEnsMesUe,
  ens_notes: SupEnsNotes,
  ens_cours: SupEnsCours,
  ens_devoirs: SupEnsDevoirs,
  ens_edt: SupEnsEdt,
  ens_messagerie: SupEnsMessagerie,
  ens_paie: SupEnsPaie,
  espace_parent: SupEspaceParent,
  import: SupImport,
  transition_annee: SupTransitionAnnee,
  rapports: SupRapports,
  decrochage: SupDecrochage,
  messagerie: SupMessagerie,
  memoires: SupMemoires,
  attestations: SupAttestations,
  conges: SupConges,
  biblio_uni: SupBiblioUni,
}

/**
 * Définition de tous les onglets + rôles autorisés.
 * Pour l'instant seul "admin" est branché, donc tout est visible.
 * On gardera ce mapping pour brancher facilement RI / comptable / etc. plus tard.
 */
const ALL_TABS = [
  {
    key: 'espace_etudiant',
    label: 'Mon espace',
    roles: ['etudiant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  },
  {
    key: 'espace_enseignant',
    label: 'Mon espace',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  },
  {
    key: 'ens_ue',
    label: 'Mes UE',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  },
  {
    key: 'ens_notes',
    label: 'Saisie des notes',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  },
  {
    key: 'ens_cours',
    label: 'Cours & ressources',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  },
  {
    key: 'ens_devoirs',
    label: 'Devoirs & examens',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
  {
    key: 'ens_edt',
    label: 'Emploi du temps',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  },
  {
    key: 'ens_messagerie',
    label: 'Messagerie',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  },
  {
    key: 'ens_paie',
    label: 'Mes fiches de paie',
    roles: ['enseignant'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  },
  {
    key: 'espace_parent',
    label: 'Mon espace',
    roles: ['parent'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  },
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    roles: ['admin', 'relation_internationale', 'comptable', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  },
  {
    key: 'etudiants',
    label: 'Étudiants',
    section: 'Scolarité',
    roles: ['admin', 'relation_internationale'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    key: 'formation',
    label: 'Offre de formation',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  },
  {
    // Onglet « Inscriptions » = inscriptions administratives (SupInscriptions).
    // Le libellé affiché vient de i18n (sup.shell.nav.inscriptions) ; ce `label`
    // n'est qu'un repli si la clé i18n venait à manquer.
    key: 'inscriptions',
    label: 'Inscriptions',
    roles: ['admin', 'relation_internationale', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
  {
    key: 'edt',
    label: 'Emploi du temps',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  },
  {
    key: 'intervenants',
    label: 'Intervenants',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
  },
  {
    key: 'notes',
    label: 'Notes & relevés',
    section: 'Évaluation',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  },
  {
    key: 'diplomes',
    label: 'Diplômes',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/><line x1="22" y1="10" x2="22" y2="15"/></svg>',
  },
  {
    key: 'memoires',
    label: 'Mémoires & soutenances',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h6M9 11h4"/></svg>',
  },
  {
    key: 'attestations',
    label: 'Attestations & relevés',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="12" cy="15" r="2"/><path d="M12 17v3"/></svg>',
  },
  {
    key: 'stages',
    label: 'Stages',
    section: 'Vie scolaire',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12v4M9 14h6"/></svg>',
  },
  {
    key: 'assiduite',
    label: 'Assiduité',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
  {
    key: 'salles',
    label: 'Salles',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 21V8a1 1 0 0 1 1-1h6V3h4v4h6a1 1 0 0 1 1 1v13"/><path d="M9 21v-6h6v6"/></svg>',
  },
  {
    key: 'biblio_uni',
    label: 'Bibliothèque universitaire',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  },
  // ── Finance ─────────────────────────────────────────────────────
  // Un seul module « Comptabilité » (comme le Secondaire /facturation) :
  // pilotage, grilles, échéanciers, comptes, paiements, bourses, financements
  // sont désormais des ONGLETS internes (SupComptabilite.vue).
  {
    key: 'finance',
    label: 'Comptabilité',
    section: 'Finance',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="13" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="13" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="13" y1="18" x2="16" y2="18"/></svg>',
  },
  // ── Mobilité ────────────────────────────────────────────────────
  {
    key: 'mobilite_entrante',
    label: 'Mobilité entrante',
    section: 'Mobilité',
    roles: ['admin', 'relation_internationale', 'comptable', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  },
  // ── Gestion ─────────────────────────────────────────────────────
  {
    key: 'import',
    label: 'Import groupé',
    section: 'Gestion',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  },
  {
    key: 'transition_annee',
    label: "Passage d'année",
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/><line x1="22" y1="10" x2="22" y2="15"/></svg>',
  },
  {
    key: 'conges',
    label: 'Congés du personnel',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
  },
  // ── Communication ───────────────────────────────────────────────
  {
    key: 'messagerie',
    label: 'Messagerie',
    section: 'Communication',
    roles: ['admin', 'comptable', 'responsable_formation', 'relation_internationale'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  },
  // ── Pilotage & IA ───────────────────────────────────────────────
  {
    key: 'rapports',
    label: 'Rapports',
    section: 'Pilotage & IA',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  },
  {
    key: 'decrochage',
    label: 'Décrochage',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  },
  // ── Configuration (admin uniquement) ───────────────────────────
  {
    key: 'roles',
    label: 'Rôles & Accès',
    section: 'Configuration',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  },
]

/**
 * Mapping onglet → module logique.
 * Permet de masquer les onglets dont le module n'est pas activé pour cette
 * école (champ schools/{id}.modulesActifs côté Firestore).
 *
 * Modules logiques : dashboard, etudiants, formation, finance,
 * mobilite_entrante, parametres.
 */
function getTabModule(tabKey) {
  if (tabKey === 'finance' || tabKey.startsWith('finance_')) return 'finance'
  if (['formation', 'inscriptions', 'edt', 'intervenants', 'notes', 'diplomes', 'stages', 'assiduite', 'salles', 'import', 'transition_annee', 'rapports', 'decrochage',
    'memoires', 'attestations', 'conges', 'biblio_uni',
    'ens_ue', 'ens_notes', 'ens_cours', 'ens_devoirs', 'ens_edt', 'ens_messagerie', 'ens_paie'].includes(tabKey)) {
    return 'formation'
  }
  return tabKey
}
// Modules toujours actifs (l'école ne peut pas les désactiver dans l'UI).
// Gestion des accès est core pour tout admin école : sinon il ne peut pas
// inviter son personnel.
const CORE_MODULES = new Set(['dashboard', 'parametres', 'roles'])

// Visibilité des onglets : si le rôle courant figure dans la matrice « Rôles &
// Accès » (rôles du personnel, y compris rôles personnalisés créés par le
// directeur), la visibilité suit la matrice éditable. Les autres rôles
// (etudiant/enseignant/parent/groupe) et les onglets hors matrice (espaces
// perso) gardent la liste statique `t.roles`.
const tabsVisibles = computed(() => {
  const r = authSup.role
  if (!r) return []
  const isMatrixRole = !!supPerms.roles[r]
  return ALL_TABS.filter((t) => {
    const mod = getTabModule(t.key)
    // 1. Activation du module par l'école (inchangé).
    if (!CORE_MODULES.has(mod) && !schoolIdentity.isModuleActif(mod)) return false
    // 2. Autorisation par rôle.
    if (isMatrixRole) {
      const mm = supPerms.moduleForTab(t.key)
      if (!mm) return t.roles.includes(r) // onglets hors matrice (espaces perso)
      return supPerms.hasAccess(mm)
    }
    return t.roles.includes(r)
  })
})

// Regroupe les onglets en sections pour l'affichage dans la sidebar.
// Un onglet avec une propriété `section` ouvre un nouveau groupe ; les
// suivants (sans section) lui sont rattachés jusqu'au prochain `section`.
const tabsGroupes = computed(() => {
  const groupes = []
  let current = { section: null, items: [] }
  for (const t of tabsVisibles.value) {
    if (t.section) {
      if (current.items.length) groupes.push(current)
      current = { section: t.section, items: [t] }
    } else {
      current.items.push(t)
    }
  }
  if (current.items.length) groupes.push(current)
  return groupes
})

const activeTabLabel = computed(() => {
  return ALL_TABS.find((t) => t.key === activeTab.value)?.label || ''
})

const roleLabel = computed(() => {
  const r = authSup.role
  return r && SUP_ROLES[r] ? SUP_ROLES[r].label : ''
})

function initiales(nomComplet) {
  if (!nomComplet) return '?'
  return nomComplet
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() || '')
    .join('')
}

function choisirTab(key) {
  activeTab.value = key
  sidebarOpen.value = false
}
// Permet aux sous-vues (ex. le dashboard) de naviguer vers un onglet.
provide('supGoTab', choisirTab)

// ── Barre d'actions basse (mobile) : navigation rapide + bouton central selon le profil ──
const BBAR_ICONS = {
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/></svg>',
  users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  wallet: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M21 12h-6a2 2 0 0 0 0 4h6z"/></svg>',
  book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  chat: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  chart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  calendar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  edit: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
}
const bbar = computed(() => {
  const r = authSup.role
  const b = (k) => t('sup.shell.bbar.' + k)
  if (r === 'comptable') return [
    { key: 'dashboard', label: b('home'), icon: BBAR_ICONS.home },
    { key: 'etudiants', label: b('students'), icon: BBAR_ICONS.users },
    { key: 'finance', label: b('finance'), icon: BBAR_ICONS.wallet },
    { key: 'messagerie', label: b('messages'), icon: BBAR_ICONS.chat },
    { key: 'rapports', label: b('reports'), icon: BBAR_ICONS.chart },
  ]
  if (r === 'enseignant') return [
    { key: 'espace_enseignant', label: b('home'), icon: BBAR_ICONS.home },
    { key: 'ens_ue', label: b('myUe'), icon: BBAR_ICONS.book },
    { key: 'ens_edt', label: b('edt'), icon: BBAR_ICONS.calendar },
    { key: 'ens_notes', label: b('notes'), icon: BBAR_ICONS.edit },
    { key: 'ens_messagerie', label: b('messages'), icon: BBAR_ICONS.chat },
  ]
  // Directeur (admin) et par défaut : 5 accès de même niveau
  return [
    { key: 'dashboard', label: b('home'), icon: BBAR_ICONS.home },
    { key: 'etudiants', label: b('students'), icon: BBAR_ICONS.users },
    { key: 'finance', label: b('finance'), icon: BBAR_ICONS.wallet },
    { key: 'messagerie', label: b('messages'), icon: BBAR_ICONS.chat },
    { key: 'rapports', label: b('reports'), icon: BBAR_ICONS.chart },
  ]
})

// ── Mode groupe (fondateur) vs mode campus (directeur / campus ouvert) ──
// Fondateur sans campus ouvert → dashboard groupe agrégé uniquement.
// Directeur, ou fondateur ayant « ouvert » un campus → shell complet scindé.
const isGroupMode = computed(() => authSup.isGroupe && !store.activeCampus)
const isFounderInCampus = computed(() => authSup.isGroupe && !!store.activeCampus)
const activeCampusNom = computed(() => {
  const c = store.campusList.find((x) => x.id === store.activeCampus)
  return c ? c.ville : ''
})
function ouvrirCampus(id) { store.enterCampus(id); activeTab.value = 'dashboard' }
function retourGroupe() { store.exitCampus() }
provide('supEnterCampus', ouvrirCampus)

function onLoggedIn() {
  // Connexion FRAÎCHE (clic sur un profil) : on repart proprement du dashboard,
  // en vue groupe pour un fondateur. (Le rechargement, lui, restaure l'onglet.)
  store.exitCampus()
  try { localStorage.removeItem(ACTIVE_CAMPUS_KEY) } catch { /* ignore */ }
  activeTab.value = 'dashboard'
  // Si le rôle ne voit pas l'onglet courant, on retombe sur le premier visible
  if (!tabsVisibles.value.some((t) => t.key === activeTab.value)) {
    activeTab.value = tabsVisibles.value[0]?.key || 'dashboard'
  }
}

function seDeconnecter() {
  authSup.logout()
}

// ─────────────────────────────────────────────────────────────────
// En-tête uniformisé — aligné sur l'en-tête du Secondaire (AppHeader)
// ─────────────────────────────────────────────────────────────────
const { t, locale } = useI18n({ useScope: 'global' })

// Libellés i18n de la navigation (modules spécifiques au Supérieur → sup.shell.nav.*).
// On conserve tab.label comme repli si une clé venait à manquer.
const NAV_KEYS = {
  espace_etudiant: 'monEspace',
  espace_enseignant: 'monEspace',
  espace_parent: 'monEspace',
  ens_ue: 'mesUe',
  ens_notes: 'saisieNotes',
  ens_cours: 'coursRessources',
  ens_devoirs: 'devoirsExamens',
  ens_edt: 'edt',
  ens_messagerie: 'messagerie',
  ens_paie: 'fichesPaie',
  dashboard: 'dashboard',
  etudiants: 'etudiants',
  formation: 'formation',
  inscriptions: 'inscriptions',
  edt: 'edt',
  intervenants: 'intervenants',
  notes: 'notes',
  diplomes: 'diplomes',
  stages: 'stages',
  assiduite: 'assiduite',
  salles: 'salles',
  finance: 'comptabilite',
  finance_dash: 'financeDash',
  finance_tarifs: 'financeTarifs',
  finance_echeanciers: 'financeEcheanciers',
  finance_comptes: 'financeComptes',
  finance_paiements: 'financePaiements',
  finance_bourses: 'financeBourses',
  finance_financements: 'financeFinancements',
  gestion_acces: 'gestionAcces',
  mobilite_entrante: 'mobiliteEntrante',
  import: 'importGroupe',
  transition_annee: 'passageAnnee',
  messagerie: 'messagerie',
  rapports: 'rapports',
  decrochage: 'decrochage',
  roles: 'rolesAcces',
  parametres: 'parametres',
}
function navLabel(tab) {
  const k = NAV_KEYS[tab.key]
  return k ? t(`sup.shell.nav.${k}`) : tab.label
}
const SECTION_KEYS = { 'Scolarité': 'scolarite', 'Évaluation': 'evaluation', 'Vie scolaire': 'vieScolaire', Finance: 'finance', 'Mobilité': 'mobilite', Gestion: 'gestion', Communication: 'communication', 'Pilotage & IA': 'pilotage', Configuration: 'configuration' }
function sectionLabel(section) {
  const k = SECTION_KEYS[section]
  return k ? t(`sup.shell.sections.${k}`) : section
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('header.greetingMorning')
  if (h < 18) return t('header.greetingAfternoon')
  return t('header.greetingEvening')
})
const userFirstName = computed(() => {
  const p = authStore.userProfile
  const fn = (p && p.firstName ? p.firstName : '').trim()
  if (fn) return fn
  const dn = (userDisplayName.value || '').trim()
  if (dn) return dn.split(' ')[0]
  return roleLabel.value || ''
})

// Viewport (drawer mobile ≤ 900px, comme toggleSidebar)
const isMobile = ref(false)
function checkMobileHdr() { isMobile.value = typeof window !== 'undefined' && window.innerWidth <= 900 }

// Statut de connexion (même esprit que l'en-tête Secondaire)
const { isOnline, pendingSyncCount, syncStatus } = useConnectionStatus()
const isSyncing = computed(() => syncStatus.value === 'syncing')
const connClass = computed(() => (isSyncing.value ? 'syncing' : isOnline.value ? 'online' : 'offline'))
const connText = computed(() => {
  if (isSyncing.value) return t('sup.shell.conn.syncShort')
  if (!isOnline.value) return t('header.offline')
  if (pendingSyncCount.value > 0) return t('header.pending')
  return ''
})
const connTitle = computed(() => {
  if (!isOnline.value) return t('sup.shell.conn.offlineTitle')
  if (pendingSyncCount.value > 0) return t('sup.shell.conn.pendingTitle', { n: pendingSyncCount.value })
  return t('sup.shell.conn.onlineTitle')
})

const canSeeParametres = computed(() => tabsVisibles.value.some((tb) => tb.key === 'parametres'))

// Recherche supérieur (Ctrl+K) — sur les étudiants et les intervenants
const supSearchOpen = ref(false)
const supSearchQuery = ref('')
const supSearchInput = ref(null)
function openSupSearch() {
  supSearchOpen.value = true
  supSearchQuery.value = ''
  nextTick(() => { try { supSearchInput.value && supSearchInput.value.focus() } catch (e) { /* silent */ } })
}
const supResults = computed(() => {
  const q = supSearchQuery.value.trim().toLowerCase()
  if (!q) return []
  const out = []
  for (const e of store.etudiants || []) {
    if (`${e.nomComplet || ''} ${e.matricule || ''} ${e.programmeNom || ''}`.toLowerCase().includes(q)) {
      out.push({ type: 'etudiant', id: e.id, nom: e.nomComplet, sub: e.matricule })
      if (out.length >= 8) break
    }
  }
  for (const i of store.intervenants || []) {
    if (out.length >= 12) break
    if (`${i.nomComplet || ''} ${i.specialite || ''}`.toLowerCase().includes(q)) {
      out.push({ type: 'intervenant', id: i.id, nom: i.nomComplet, sub: i.specialite })
    }
  }
  return out
})
function ouvrirResultat(r) {
  supSearchOpen.value = false
  choisirTab(r.type === 'etudiant' ? 'etudiants' : 'intervenants')
}
function onHdrKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    openSupSearch()
  }
}
onMounted(() => {
  checkMobileHdr()
  window.addEventListener('resize', checkMobileHdr)
  window.addEventListener('keydown', onHdrKeydown)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobileHdr)
  window.removeEventListener('keydown', onHdrKeydown)
})

// Si le rôle change, recadre sur un onglet visible
watch(
  () => authSup.role,
  () => {
    if (!tabsVisibles.value.some((t) => t.key === activeTab.value)) {
      activeTab.value = tabsVisibles.value[0]?.key || 'dashboard'
    }
  }
)

// ── Persistance onglet + campus actifs (revenir au même endroit au reload) ──
watch(activeTab, (v) => { try { localStorage.setItem(ACTIVE_TAB_KEY, v) } catch { /* ignore */ } })
watch(
  () => store.activeCampus,
  (v) => { try { v ? localStorage.setItem(ACTIVE_CAMPUS_KEY, v) : localStorage.removeItem(ACTIVE_CAMPUS_KEY) } catch { /* ignore */ } }
)
onMounted(() => {
  // Au rechargement : un fondateur rouvre le campus qu'il consultait ;
  // puis on valide que l'onglet restauré est bien visible pour ce rôle.
  if (authSup.isGroupe) {
    let saved = null
    try { saved = localStorage.getItem(ACTIVE_CAMPUS_KEY) } catch { /* ignore */ }
    if (saved && store.campusList.some((c) => c.id === saved)) store.enterCampus(saved)
  }
  if (!tabsVisibles.value.some((t) => t.key === activeTab.value)) {
    activeTab.value = tabsVisibles.value[0]?.key || 'dashboard'
  }
})

// Sync Firestore initial dès qu'on est authentifié (mode école seulement,
// no-op en mode démo). Évite de bloquer le rendu : on déclenche en
// background, l'UI peut afficher store.isLoading si besoin.
onMounted(() => {
  if (authSup.isLoggedIn) store.initSchoolSync()
})
watch(
  () => authSup.isLoggedIn,
  (v) => { if (v) store.initSchoolSync() }
)
</script>

<style scoped>
.sup {
  display: flex;
  height: 100vh;
  background: transparent;
  font-family: 'Outfit', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Sidebar ── */
.sup-sidebar {
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar, rgba(255,255,255,.55));
  color: var(--tx);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-right: 1px solid var(--hair, rgba(255,255,255,.5));
  z-index: 20;
  flex-shrink: 0;
  transition: width 0.2s ease, transform 0.25s ease;
  overflow: hidden;
}
/* ── Repli en rail 68px (icônes visibles), identique au Secondaire ── */
@media (min-width: 901px) {
  /* flex-basis explicite : sans ça, flex-shrink:0 + basis auto garde la largeur 240px */
  .sup-sidebar.is-rail { width: 68px; flex: 0 0 68px; min-width: 0; }
  .sup-sidebar.is-rail .sup-brand-info,
  .sup-sidebar.is-rail .sup-year,
  .sup-sidebar.is-rail .sup-nav-label,
  .sup-sidebar.is-rail .sup-nav-section-header,
  .sup-sidebar.is-rail .sup-user-info,
  .sup-sidebar.is-rail .sup-quit { display: none; }
  .sup-sidebar.is-rail .sup-side-top { justify-content: center; padding: 18px 0 14px; }
  .sup-sidebar.is-rail .sup-side-top .sup-brand { flex: 0 0 auto; }
  .sup-sidebar.is-rail .sup-brand { justify-content: center; }
  .sup-sidebar.is-rail .sup-nav { padding: 14px 8px; }
  .sup-sidebar.is-rail .sup-nav-item { justify-content: center; padding: 10px 0; gap: 0; }
  .sup-sidebar.is-rail .sup-side-bottom { align-items: center; padding: 12px 8px 16px; }
  .sup-sidebar.is-rail .sup-user { justify-content: center; }
  .sup-sidebar.is-rail .sup-logout { justify-content: center; font-size: 0; padding-left: 0; padding-right: 0; }
}
.sup-side-top {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--divider);
  display: flex;
  align-items: center;
  gap: 8px;
}
.sup-side-top .sup-brand { flex: 1; min-width: 0; }
.sup-side-collapse {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: var(--tx2);
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.sup-side-collapse:hover { background: var(--sidebar-hover); color: var(--tx); }
.sup-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}
.sup-logo {
  width: 38px;
  height: 38px;
  background: var(--pr);
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.sup-logo-img {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  object-fit: contain;
  background: #fff;
  flex-shrink: 0;
}
.sup-brand-info { min-width: 0; }
.sup-brand-title {
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--tx);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sup-brand-sub {
  font-size: 11px;
  color: var(--tx3);
  margin-top: 2px;
}

/* Nav verticale */
.sup-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 10px;
  overflow-y: auto;
}
.sup-nav-section {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 14px 14px 6px;
  margin-top: 4px;
  border-top: 1px solid var(--divider);
}
.sup-nav-section:first-child { border-top: none; margin-top: 0; padding-top: 6px; }
.sup-nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 9px;
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--sidebar-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.sup-nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--tx);
}
.sup-nav-item.active {
  background: var(--pr);
  color: #fff;
  box-shadow: 0 4px 12px rgba(var(--pr-rgb), 0.35);
}
.sup-nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
}
.sup-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Bas de sidebar : profil + actions */
.sup-side-bottom {
  padding: 12px 12px 16px;
  border-top: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sup-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
}
.sup-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--pr-light);
  color: var(--pr);
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.sup-user-avatar-img {
  padding: 0;
  background: transparent;
}
.sup-user-avatar-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  flex-shrink: 0;
}
.sup-user-info { min-width: 0; }
.sup-user-name {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tx);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sup-user-role {
  font-size: 10.5px;
  color: var(--tx3);
  margin-top: 2px;
}
.sup-logout,
.sup-quit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--divider);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: background 0.15s ease;
}
.sup-logout:hover,
.sup-quit:hover {
  background: var(--sidebar-hover);
  color: var(--tx);
}
.sup-quit {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
  font-size: 11.5px;
}
.sup-quit:hover { color: #fff; }

/* ── Main (droite) ── */
.sup-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.sup-topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 24px;
  background: var(--glass, rgba(255,255,255,.62));
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-bottom: 1px solid var(--divider);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
.sup-burger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 8px;
  color: #1A1D1F;
  cursor: pointer;
}
.sup-burger:hover { background: var(--sidebar-hover); }

.sup-topbar-titre {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: 'Poppins', sans-serif;
}
.sup-topbar-edition {
  font-size: 12px;
  color: #6F767E;
  font-weight: 600;
}
.sup-topbar-sep {
  color: #C7C9CC;
}
.sup-topbar-page {
  font-size: 16px;
  font-weight: 700;
  color: #1A1D1F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sup-topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ── En-tête uniformisé (aligné sur AppHeader du Secondaire) ── */
.sup-hdr-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
.sup-collapse-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border: none; background: transparent;
  border-radius: 8px; color: var(--tx3, #9aa2b1); cursor: pointer;
  transition: all 0.15s ease; flex-shrink: 0;
}
.sup-collapse-toggle:hover { background: rgba(0,0,0,.04); color: var(--tx, #1a1d1f); }
.sup-hdr-greeting {
  font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600;
  color: var(--tx, #1a1d1f); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sup-hdr-school {
  display: flex; align-items: center; gap: 8px; background: transparent; border: none;
  cursor: pointer; padding: 6px 10px; border-radius: 10px; transition: background 0.15s ease; margin-right: 4px;
}
.sup-hdr-school:hover { background: rgba(0,0,0,.04); }
.sup-hdr-school-logo { width: 28px; height: 28px; border-radius: 6px; object-fit: contain; flex-shrink: 0; }
.sup-hdr-school-name {
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--tx, #1a1d1f);
  max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sup-conn { display: flex; align-items: center; gap: 6px; padding: 0 8px; height: 36px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: help; }
.sup-conn-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.sup-conn.offline { background: rgba(239,68,68,.1); color: #dc2626; }
.sup-conn.offline .sup-conn-dot { background: #ef4444; }
.sup-conn.syncing { background: rgba(59,130,246,.1); color: #2563eb; }
.sup-conn.syncing .sup-conn-dot { background: #3b82f6; }
.sup-conn-text { white-space: nowrap; }
.sup-hdr-lang { display: inline-flex; gap: 1px; padding: 2px; background: rgba(0,0,0,.05); border-radius: 100px; margin-right: 2px; }
.sup-hdr-lang button { border: none; background: transparent; color: var(--tx3, #9aa2b1); font-family: inherit; font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 100px; cursor: pointer; transition: background .15s ease, color .15s ease; }
.sup-hdr-lang button.on { background: var(--pr); color: #fff; }
.sup-hdr-icon { position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border: none; background: transparent; border-radius: 10px; color: var(--tx2, #6f767e); cursor: pointer; transition: all 0.15s ease; }
.sup-hdr-icon:hover { background: rgba(0,0,0,.04); color: var(--tx, #1a1d1f); }
.sup-hdr-search-hint { position: absolute; top: 50%; right: -2px; transform: translateY(-50%); font-size: 9px; color: var(--tx3, #9aa2b1); pointer-events: none; opacity: 0; transition: opacity 0.15s ease; }
.sup-hdr-search:hover .sup-hdr-search-hint { opacity: 1; }
.sup-hdr-avatar { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: var(--pr); color: #fff; border: none; font-weight: 600; font-size: 12px; font-family: 'Poppins', sans-serif; cursor: pointer; transition: box-shadow 0.15s ease; flex-shrink: 0; overflow: hidden; }
.sup-hdr-avatar:hover { box-shadow: 0 0 0 3px rgba(var(--pr-rgb),.15); }
.sup-hdr-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

/* Recherche supérieur (modale Ctrl+K) */
.sup-search-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(15,23,42,.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.sup-search-box { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; box-shadow: 0 24px 60px rgba(20,32,64,.22); overflow: hidden; }
.sup-search-field { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(20,32,64,.08); color: #6f767e; }
.sup-search-input { flex: 1; border: none; outline: none; font-family: 'Poppins', sans-serif; font-size: 15px; color: #1a1d1f; background: transparent; }
.sup-search-esc { font-size: 10px; color: #9aa2b1; border: 1px solid rgba(20,32,64,.14); border-radius: 6px; padding: 2px 6px; }
.sup-search-results { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow-y: auto; }
.sup-search-result { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.sup-search-result:hover { background: rgba(var(--pr-rgb),.06); }
.sup-search-rt { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 100px; flex-shrink: 0; }
.sup-search-rt.etudiant { background: rgba(var(--pr-rgb),.12); color: var(--pr); }
.sup-search-rt.intervenant { background: rgba(184,137,42,.14); color: #B8892A; }
.sup-search-rn { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; color: #1a1d1f; }
.sup-search-rs { font-size: 12.5px; color: #6f767e; margin-left: auto; }
.sup-search-empty { padding: 22px; text-align: center; color: #9aa2b1; font-size: 13.5px; }
.sup-demo-badge {
  padding: 4px 10px;
  background: rgba(184, 137, 42, 0.12);
  border: 1px solid rgba(184, 137, 42, 0.28);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  color: #B8892A;
}

/* Cloche notifications */
.sup-notif-wrap { position: relative; }
.sup-notif-btn {
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  color: #6F767E;
  cursor: pointer;
  transition: all 0.15s;
}
.sup-notif-btn:hover {
  background: #F7F6F2;
  color: #1A1D1F;
}
.sup-notif-btn.has-unread { color: var(--pr); border-color: rgba(var(--pr-rgb), 0.3); }
.sup-notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #B23B3B;
  color: #fff;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}
.sup-notif-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: 480px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.10);
  z-index: 100;
}
.sup-notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #F2F1ED;
}
.sup-notif-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #1A1D1F;
}
.sup-notif-count {
  font-size: 11px;
  color: var(--pr);
  font-weight: 600;
}
.sup-notif-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: #6F767E;
}
.sup-notif-list { list-style: none; margin: 0; padding: 0; }
.sup-notif-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #F7F6F2;
  cursor: pointer;
  transition: background 0.12s;
}
.sup-notif-item:hover { background: #F7F6F2; }
.sup-notif-item:last-child { border-bottom: none; }
.sup-notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 100px;
  background: var(--pr);
  margin-top: 6px;
  flex-shrink: 0;
}
.sup-notif-text { flex: 1; min-width: 0; }
.sup-notif-msg {
  font-size: 13px;
  color: #1A1D1F;
  line-height: 1.45;
  margin-bottom: 3px;
}
.sup-notif-meta {
  font-size: 11.5px;
  color: #6F767E;
  font-weight: 500;
}

/* Body */
.sup-nav-groupe { padding: 8px 12px; }
.sup-groupe-hint { font-size: 12.5px; line-height: 1.5; color: var(--tx2, #5b6472); background: rgba(var(--pr-rgb), 0.06); border: 1px solid rgba(var(--pr-rgb), 0.14); border-radius: 12px; padding: 12px 14px; }
.sup-campus-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: rgba(var(--pr-rgb), 0.08); border: 1px solid rgba(var(--pr-rgb), 0.2); border-radius: 12px; padding: 11px 16px; margin-bottom: 16px; }
.sup-campus-banner-txt { font-size: 13.5px; color: var(--tx, #1A1D1F); }
.sup-campus-back { display: inline-flex; align-items: center; gap: 6px; background: var(--pr); color: #fff; border: none; border-radius: 9px; font-family: inherit; font-weight: 700; font-size: 12.5px; padding: 8px 14px; cursor: pointer; }
.sup-campus-back:hover { filter: brightness(1.06); }
.sup-body {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 28px 40px;
}

/* Overlay mobile */
.sup-overlay {
  display: none;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .sup-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    max-width: 85vw;
    transform: translateX(-100%);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
    transition: transform 0.22s ease;
  }
  .sup-sidebar.is-rail { width: 280px; max-width: 85vw; }
  .sup-sidebar.is-open {
    transform: translateX(0);
  }
  .sup-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 15;
    animation: sup-fade-in 0.18s ease;
  }
  .sup-side-collapse { display: none; }
  .sup-topbar {
    padding: 10px 14px;
  }
  .sup-burger {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }
  .sup-body {
    padding: 16px 16px 32px;
  }
  .sup-notif-menu {
    width: calc(100vw - 28px);
    right: -14px;
  }
}

@keyframes sup-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 560px) {
  .sup-topbar-edition,
  .sup-topbar-sep {
    display: none;
  }
  .sup-topbar-page {
    font-size: 14px;
    max-width: 50vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sup-demo-badge { display: none; }
  /* Topbar : dégager la place, éviter le chevauchement hamburger / nom d'école */
  .sup-hdr-greeting { display: none; }
  .sup-conn-text { display: none; }
  .sup-hdr-search-hint { display: none; }
  .sup-hdr-school-name { max-width: 130px; }
}

@media (max-width: 400px) {
  .sup-topbar { padding: 8px 10px; gap: 6px; }
  .sup-body { padding: 12px 16px 28px; }
  /* Très étroit (type Galaxy Z Fold, ~344px) : ne garder que l'essentiel */
  .sup-topbar-right { gap: 2px; }
  .sup-hdr-lang { display: none; }
  .sup-hdr-search { display: none; }
  .sup-conn { padding: 0 2px; }
  .sup-hdr-school { padding: 4px 6px; margin-right: 0; }
  .sup-hdr-school-name { max-width: 92px; }
}

/* ── Barre de navigation basse (mobile only) : 5 accès de même niveau ── */
.sup-bbar { display: none; }
@media (max-width: 560px) {
  .sup-bbar {
    display: flex; align-items: center; justify-content: space-around;
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 12;
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    background: var(--glass, rgba(255,255,255,.94));
    -webkit-backdrop-filter: blur(24px) saturate(180%); backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid var(--divider, rgba(20,32,64,.10));
  }
  .sup-bbar-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 5px 0; min-width: 0;
    color: var(--tx3, #9aa2b1); font-family: 'Poppins', sans-serif; font-size: 10px; font-weight: 600;
  }
  .sup-bbar-item.active { color: var(--pr); }
  .sup-bbar-ic { display: inline-flex; }
  .sup-bbar svg { width: 23px; height: 23px; display: block; }
  /* Le contenu ne passe pas sous la barre */
  .sup-body { padding-bottom: 72px !important; }
}

/* Onboarding magic link : définir un mot de passe initial */
.sup-onboarding {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #0d1b3a 0%, var(--pr) 100%);
}
.sup-onboarding-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 16px;
  padding: 32px 30px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.sup-onboarding-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1A1D1F;
  margin: 0 0 6px;
}
.sup-onboarding-sub {
  font-size: 14px;
  color: #6F767E;
  margin: 0 0 22px;
  line-height: 1.55;
}
.sup-onboarding-form { display: flex; flex-direction: column; gap: 14px; }
.sup-onboarding-field { display: flex; flex-direction: column; gap: 5px; }
.sup-onboarding-field span {
  font-size: 12px;
  font-weight: 600;
  color: #6F767E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sup-onboarding-field input {
  padding: 10px 12px;
  border: 1px solid #D9D7D1;
  border-radius: 9px;
  font-size: 14px;
  color: #1A1D1F;
  background: #fff;
  font-family: inherit;
}
.sup-onboarding-field input:focus {
  outline: none;
  border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.15);
}
.sup-onboarding-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #6F767E;
  cursor: pointer;
}
.sup-onboarding-err {
  margin: 0;
  padding: 10px 14px;
  background: rgba(178, 59, 59, 0.06);
  border: 1px solid rgba(178, 59, 59, 0.28);
  border-radius: 8px;
  color: #8A2A2A;
  font-size: 13px;
}
.sup-onboarding-btn {
  margin-top: 6px;
  padding: 12px 16px;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.sup-onboarding-btn:hover:not(:disabled) { background: #114a96; }
.sup-onboarding-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sup-onboarding-skip {
  background: transparent;
  border: none;
  padding: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  color: #6F767E;
  cursor: pointer;
  margin-top: 4px;
}
.sup-onboarding-skip:hover { color: var(--pr); }

/* Sélecteur d'année + accordéons (alignés sur les éditions Secondaire/Primaire) */
.sup-year { padding: 0 14px 10px; }
.sup-year-select {
  width: 100%; font-family: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--text, #23262E); background: var(--input-bg, rgba(20,32,64,0.05));
  border: 1px solid var(--border, rgba(20,32,64,0.10)); border-radius: 9px;
  padding: 7px 10px; cursor: pointer;
}
.sup-nav-section-header {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--muted, #9AA2B1); padding: 12px 16px 6px;
}
.sup-nav-section-header:hover { color: var(--pr); }
.sup-section-chevron { transition: transform 0.18s ease; transform: rotate(0deg); opacity: 0.7; }
.sup-section-chevron.open { transform: rotate(0deg); }
.sup-section-chevron:not(.open) { transform: rotate(-90deg); }
.sup-nav-section-items { display: flex; flex-direction: column; }
</style>
