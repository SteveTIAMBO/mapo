<template>
  <!-- Pas connecté → écran de login dédié -->
  <SuperieurLogin v-if="!authSup.isLoggedIn" @logged-in="onLoggedIn" />

  <!-- Connecté via lien magique → écran "définissez votre mot de passe" -->
  <div v-else-if="authStore.needsPassword" class="sup-onboarding">
    <div class="sup-onboarding-card">
      <h2 class="sup-onboarding-h2">Bienvenue {{ authStore.userFirstName || '' }}</h2>
      <p class="sup-onboarding-sub">
        Vous êtes connecté à <strong>{{ schoolIdentity.nom || 'votre établissement' }}</strong>.
        Pour les prochaines connexions, définissez un mot de passe.
      </p>
      <form class="sup-onboarding-form" @submit.prevent="submitInitialPassword">
        <label class="sup-onboarding-field">
          <span>Nouveau mot de passe</span>
          <input
            v-model="onboardingPassword"
            :type="showOnbPwd ? 'text' : 'password'"
            required minlength="6"
            autocomplete="new-password"
            placeholder="6 caractères minimum"
          />
        </label>
        <label class="sup-onboarding-field">
          <span>Confirmer le mot de passe</span>
          <input
            v-model="onboardingConfirm"
            :type="showOnbPwd ? 'text' : 'password'"
            required minlength="6"
            autocomplete="new-password"
            placeholder="Retapez le même mot de passe"
          />
        </label>
        <label class="sup-onboarding-check">
          <input type="checkbox" v-model="showOnbPwd" />
          <span>Afficher les mots de passe</span>
        </label>
        <p v-if="onboardingError" class="sup-onboarding-err">{{ onboardingError }}</p>
        <button type="submit" class="sup-onboarding-btn" :disabled="onboardingBusy">
          {{ onboardingBusy ? 'Enregistrement…' : 'Enregistrer et continuer' }}
        </button>
        <button type="button" class="sup-onboarding-skip" @click="skipInitialPassword">
          Plus tard (je me reconnecterai via un nouveau lien email)
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
            <div class="sup-brand-sub">Enseignement Supérieur</div>
          </div>
        </div>
      </div>

      <div class="sup-year">
        <select v-model="selectedYear" class="sup-year-select" aria-label="Année académique">
          <option v-for="y in academicYears" :key="y" :value="y">Année {{ y }}</option>
        </select>
      </div>

      <div v-if="isGroupMode" class="sup-nav sup-nav-groupe" v-show="!sidebarHidden">
        <div class="sup-groupe-hint">Vue consolidée du groupe.<br />Sélectionnez un campus pour accéder à sa gestion.</div>
      </div>
      <nav v-else class="sup-nav">
        <template v-for="(group, gi) in tabsGroupes" :key="gi">
          <button
            v-if="group.section"
            class="sup-nav-section-header"
            type="button"
            @click="toggleSection(group.section)"
          >
            <span>{{ group.section }}</span>
            <svg class="sup-section-chevron" :class="{ open: isSectionOpen(group.section) }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-show="!group.section || isSectionOpen(group.section)" class="sup-nav-section-items">
            <button
              v-for="t in group.items"
              :key="t.key"
              class="sup-nav-item"
              :class="{ active: activeTab === t.key }"
              type="button"
              :title="sidebarHidden ? t.label : null"
              @click="choisirTab(t.key)"
            >
              <span class="sup-nav-icon" v-html="t.icon"></span>
              <span class="sup-nav-label">{{ t.label }}</span>
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
            <div class="sup-user-name">{{ userDisplayName || 'Utilisateur' }}</div>
            <div class="sup-user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <button class="sup-logout" type="button" @click="seDeconnecter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          Se déconnecter
        </button>
        <button v-if="isDemoTenant" class="sup-quit" type="button" @click="quitterEdition">
          Changer d'édition
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
            :title="isMobile ? 'Menu' : (sidebarHidden ? 'Afficher le menu' : 'Replier le menu')"
          >
            <Menu v-if="isMobile" :size="22" />
            <PanelLeftClose v-else-if="!sidebarHidden" :size="18" />
            <PanelLeftOpen v-else :size="18" />
          </button>
          <p class="sup-hdr-greeting">{{ greeting }}, {{ userFirstName }}</p>
        </div>

        <div class="sup-topbar-right">
          <!-- Nom de l'établissement -->
          <button v-if="schoolIdentity.nom" class="sup-hdr-school" type="button" @click="choisirTab('parametres')" title="Paramètres de l'établissement">
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
          <button class="sup-hdr-icon sup-hdr-search" type="button" title="Rechercher" @click="openSupSearch">
            <Search :size="20" />
            <span class="sup-hdr-search-hint">Ctrl+K</span>
          </button>
          <!-- Cloche notifications (visible pour admin, RI, comptable) -->
          <div v-if="canSeeNotifications" class="sup-notif-wrap" v-click-outside="closeNotifMenu">
            <button
              type="button"
              class="sup-notif-btn"
              :class="{ 'has-unread': notifCount > 0 }"
              :title="notifCount > 0 ? `${notifCount} notification(s) à traiter` : 'Aucune notification'"
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
                <span class="sup-notif-title">Notifications</span>
                <span v-if="notifCount > 0" class="sup-notif-count">{{ notifCount }} à traiter</span>
              </header>
              <div v-if="notifCount === 0" class="sup-notif-empty">
                Vous êtes à jour. Aucune notification.
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
          <button class="sup-hdr-avatar" type="button" @click="choisirTab('parametres')" :title="userDisplayName || 'Profil'">
            <img v-if="userPhotoURL" :src="userPhotoURL" :alt="userDisplayName" class="sup-hdr-avatar-img" />
            <span v-else>{{ initiales(userDisplayName) }}</span>
          </button>

          <!-- Réglages -->
          <button v-if="canSeeParametres" class="sup-hdr-icon" type="button" title="Paramètres" @click="choisirTab('parametres')">
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
              placeholder="Rechercher un étudiant, un intervenant…"
              @keydown.esc="supSearchOpen = false"
            />
            <kbd class="sup-search-esc">Échap</kbd>
          </div>
          <ul v-if="supResults.length" class="sup-search-results">
            <li v-for="r in supResults" :key="r.type + r.id" class="sup-search-result" @click="ouvrirResultat(r)">
              <span class="sup-search-rt" :class="r.type">{{ r.type === 'etudiant' ? 'Étudiant' : 'Intervenant' }}</span>
              <span class="sup-search-rn">{{ r.nom }}</span>
              <span v-if="r.sub" class="sup-search-rs">{{ r.sub }}</span>
            </li>
          </ul>
          <p v-else-if="supSearchQuery" class="sup-search-empty">Aucun résultat</p>
        </div>
      </div>

      <main class="sup-body">
        <div v-if="isFounderInCampus" class="sup-campus-banner">
          <span class="sup-campus-banner-txt">
            Vous consultez le campus <strong>{{ activeCampusNom }}</strong> · accès directeur
          </span>
          <button type="button" class="sup-campus-back" @click="retourGroupe">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Retour à la vue groupe
          </button>
        </div>
        <SupGroupeDashboard v-if="isGroupMode" />
        <component v-else :is="panels[activeTab]" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useEditionStore } from '../stores/edition'
import { useSuperieurStore } from '../stores/superieur'
import { useSuperieurAuthStore, SUP_ROLES } from '../stores/superieurAuth'
import { useAuthStore } from '../stores/auth'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { useMobiliteStore } from '../stores/mobilite'
import { useI18n } from 'vue-i18n'
import { setLang } from '../i18n'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import { PanelLeftClose, PanelLeftOpen, Menu, Search, Settings } from 'lucide-vue-next'
import SuperieurLogin from './superieur/SuperieurLogin.vue'
import SupDashboard from './superieur/SupDashboard.vue'
import SupGroupeDashboard from './superieur/SupGroupeDashboard.vue'
import SupEtudiants from './superieur/SupEtudiants.vue'
import SupFormation from './superieur/SupFormation.vue'
import SupInscriptionsPedagogiques from './superieur/SupInscriptionsPedagogiques.vue'
import SupEmploiDuTemps from './superieur/SupEmploiDuTemps.vue'
import SupIntervenants from './superieur/SupIntervenants.vue'
import SupNotes from './superieur/SupNotes.vue'
import SupStages from './superieur/SupStages.vue'
import SupSalles from './superieur/SupSalles.vue'
import SupFinanceDashboard from './superieur/SupFinanceDashboard.vue'
import SupGrillesTarifaires from './superieur/SupGrillesTarifaires.vue'
import SupComptesEtudiants from './superieur/SupComptesEtudiants.vue'
import SupPaiements from './superieur/SupPaiements.vue'
import SupBourses from './superieur/SupBourses.vue'
import SupFinancements from './superieur/SupFinancements.vue'
import SupEcheanciers from './superieur/SupEcheanciers.vue'
import SupGestionAcces from './superieur/SupGestionAcces.vue'
import SupMobiliteEntrante from './superieur/SupMobiliteEntrante.vue'
import SupParametres from './superieur/SupParametres.vue'
import SupEspaceEtudiant from './superieur/SupEspaceEtudiant.vue'
import SupEspaceEnseignant from './superieur/SupEspaceEnseignant.vue'
import SupEspaceParent from './superieur/SupEspaceParent.vue'

const router = useRouter()
const editionStore = useEditionStore()
const store = useSuperieurStore()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()
const schoolIdentity = useSchoolIdentityStore()
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
    onboardingError.value = 'Le mot de passe doit faire au moins 6 caractères.'
    return
  }
  if (onboardingPassword.value !== onboardingConfirm.value) {
    onboardingError.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  onboardingBusy.value = true
  try {
    const r = await authStore.setInitialPassword(onboardingPassword.value)
    if (!r.success) {
      onboardingError.value = r.error || "Le mot de passe n'a pas pu être enregistré."
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

// Badge "Démonstration" visible uniquement sur la vitrine mapo.app-edufrem.com
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

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

const activeTab = ref('dashboard')
const sidebarOpen = ref(false)
// État replié desktop (persisté localement, séparé du drawer mobile).
const SIDEBAR_HIDDEN_KEY = 'mapo_sup_sidebar_hidden'
const sidebarHidden = ref(loadSidebarHidden())

// ── Accordéons de la barre latérale (comme les éditions Secondaire / Primaire) ──
const collapsedSections = ref({})
function toggleSection(name) { collapsedSections.value = { ...collapsedSections.value, [name]: !collapsedSections.value[name] } }
function isSectionOpen(name) { return sidebarHidden.value ? true : !collapsedSections.value[name] }

// ── Sélecteur d'année académique (lecture seule en démo, comme les autres) ──
const academicYears = computed(() => {
  const now = new Date()
  const start = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
  return [0, 1, 2, 3].map((i) => `${start - i}-${start - i + 1}`)
})
const selectedYear = ref(academicYears.value[0])

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
  inscriptions: SupInscriptionsPedagogiques,
  edt: SupEmploiDuTemps,
  intervenants: SupIntervenants,
  notes: SupNotes,
  stages: SupStages,
  salles: SupSalles,
  finance_dash: SupFinanceDashboard,
  finance_tarifs: SupGrillesTarifaires,
  finance_comptes: SupComptesEtudiants,
  finance_paiements: SupPaiements,
  finance_bourses: SupBourses,
  finance_financements: SupFinancements,
  finance_echeanciers: SupEcheanciers,
  gestion_acces: SupGestionAcces,
  mobilite_entrante: SupMobiliteEntrante,
  parametres: SupParametres,
  espace_etudiant: SupEspaceEtudiant,
  espace_enseignant: SupEspaceEnseignant,
  espace_parent: SupEspaceParent,
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
    key: 'inscriptions',
    label: 'Inscriptions péda.',
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
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  },
  {
    key: 'stages',
    label: 'Stages',
    roles: ['admin', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12v4M9 14h6"/></svg>',
  },
  {
    key: 'salles',
    label: 'Salles',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 21V8a1 1 0 0 1 1-1h6V3h4v4h6a1 1 0 0 1 1 1v13"/><path d="M9 21v-6h6v6"/></svg>',
  },
  // ── Finance ─────────────────────────────────────────────────────
  {
    key: 'finance_dash',
    label: 'Pilotage finance',
    section: 'Finance',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  },
  {
    key: 'finance_tarifs',
    label: 'Grilles tarifaires',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  },
  {
    key: 'finance_echeanciers',
    label: 'Échéanciers',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1.2"/><circle cx="12" cy="15" r="1.2"/><circle cx="16" cy="15" r="1.2"/></svg>',
  },
  {
    key: 'finance_comptes',
    label: 'Comptes étudiants',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  },
  {
    key: 'finance_paiements',
    label: 'Paiements & relances',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  },
  {
    key: 'finance_bourses',
    label: 'Bourses',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
  },
  {
    key: 'finance_financements',
    label: 'Financements tiers',
    roles: ['admin', 'comptable'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  },
  // ── Mobilité ────────────────────────────────────────────────────
  {
    key: 'mobilite_entrante',
    label: 'Mobilité entrante',
    section: 'Mobilité',
    roles: ['admin', 'relation_internationale', 'comptable', 'responsable_formation'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  },
  // ── Configuration (admin uniquement) ───────────────────────────
  {
    key: 'gestion_acces',
    label: 'Gestion des accès',
    section: 'Configuration',
    roles: ['admin'],
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3-3"/><path d="M19 8l-3 3 3 3"/></svg>',
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
  if (tabKey.startsWith('finance_')) return 'finance'
  if (['formation', 'inscriptions', 'edt', 'intervenants', 'notes', 'stages', 'salles'].includes(tabKey)) {
    return 'formation'
  }
  return tabKey
}
// Modules toujours actifs (l'école ne peut pas les désactiver dans l'UI).
// Gestion des accès est core pour tout admin école : sinon il ne peut pas
// inviter son personnel.
const CORE_MODULES = new Set(['dashboard', 'parametres', 'gestion_acces'])

const tabsVisibles = computed(() => {
  const r = authSup.role
  if (!r) return []
  return ALL_TABS.filter((t) => {
    if (!t.roles.includes(r)) return false
    const mod = getTabModule(t.key)
    if (CORE_MODULES.has(mod)) return true
    return schoolIdentity.isModuleActif(mod)
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
  // Si le rôle ne voit pas l'onglet courant, on retombe sur le premier visible
  if (!tabsVisibles.value.some((t) => t.key === activeTab.value)) {
    activeTab.value = tabsVisibles.value[0]?.key || 'dashboard'
  }
}

function seDeconnecter() {
  authSup.logout()
}

function quitterEdition() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}

// ─────────────────────────────────────────────────────────────────
// En-tête uniformisé — aligné sur l'en-tête du Secondaire (AppHeader)
// ─────────────────────────────────────────────────────────────────
const { locale } = useI18n({ useScope: 'global' })

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
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
  if (isSyncing.value) return 'Sync…'
  if (!isOnline.value) return 'Hors ligne'
  if (pendingSyncCount.value > 0) return 'En attente'
  return ''
})
const connTitle = computed(() => {
  if (!isOnline.value) return 'Hors ligne — vos modifications seront synchronisées à la reconnexion'
  if (pendingSyncCount.value > 0) return `${pendingSyncCount.value} modification(s) en attente`
  return 'En ligne — synchronisé'
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
    padding: 16px 14px 32px;
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
}

@media (max-width: 400px) {
  .sup-topbar { padding: 8px 10px; gap: 6px; }
  .sup-body { padding: 12px 10px 28px; }
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
