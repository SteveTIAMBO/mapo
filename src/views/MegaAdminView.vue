<template>
  <div class="ma">
    <!-- Header -->
    <header class="ma-header">
      <div class="ma-brand">
        <div class="ma-logo">E</div>
        <div>
          <div class="ma-brand-title">EDUFREM · Administration MAPO</div>
          <div class="ma-brand-sub">{{ authStore.userProfile?.email || '' }}</div>
        </div>
      </div>
      <button class="ma-quit" type="button" @click="seDeconnecter">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        Se déconnecter
      </button>
    </header>

    <div class="ma-body">
      <!-- Onglets -->
      <div class="ma-tabs" role="tablist">
        <button
          class="ma-tab" :class="{ active: tab === 'ecoles' }"
          role="tab" type="button" @click="tab = 'ecoles'"
        >Établissements</button>
        <button
          class="ma-tab" :class="{ active: tab === 'paiements' }"
          role="tab" type="button" @click="tab = 'paiements'"
        >Paiements scolarité</button>
        <button
          class="ma-tab" :class="{ active: tab === 'miapo' }"
          role="tab" type="button" @click="tab = 'miapo'"
        >MIAPO+</button>
      </div>

      <!-- Vue Paiements scolarité -->
      <MegaPaiementsScolarite v-if="tab === 'paiements'" />

      <!-- Vue MIAPO+ (analytics d'adoption B2C) -->
      <MegaMiapoAnalytics v-else-if="tab === 'miapo'" />

      <!-- Vue Établissements (existante) -->
      <template v-else>
      <!-- Bandeau intro + action -->
      <div class="ma-intro">
        <div>
          <h1 class="ma-h1">Établissements MAPO</h1>
          <p class="ma-sub">
            Créez de nouvelles écoles, invitez leur directeur et suivez les infos clés.
          </p>
        </div>
        <button class="ma-btn-primary" type="button" @click="ouvrirCreation">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Créer une école
        </button>
      </div>

      <!-- KPIs synthétiques -->
      <div class="ma-kpis">
        <div class="ma-kpi">
          <div class="ma-kpi-label">Écoles</div>
          <div class="ma-kpi-value">{{ store.schools.length }}</div>
        </div>
        <div class="ma-kpi">
          <div class="ma-kpi-label">Élèves cumulés</div>
          <div class="ma-kpi-value">{{ fmt(totalEleves) }}</div>
        </div>
        <div class="ma-kpi">
          <div class="ma-kpi-label">Personnel cumulé</div>
          <div class="ma-kpi-value">{{ fmt(totalPersonnel) }}</div>
        </div>
        <div class="ma-kpi">
          <div class="ma-kpi-label">Invitations en attente</div>
          <div class="ma-kpi-value">{{ totalInvitations }}</div>
        </div>
      </div>

      <!-- Liste des écoles -->
      <section class="ma-card">
        <div v-if="store.loading" class="ma-empty">Chargement…</div>
        <div v-else-if="store.schools.length === 0" class="ma-empty">
          Aucune école pour l'instant. Cliquez sur « Créer une école » pour commencer.
        </div>
        <table v-else class="ma-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Sous-domaine</th>
              <th class="num">Élèves</th>
              <th class="num">Personnel</th>
              <th class="num">Invitations</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in store.schoolsSorted" :key="s.id">
              <td>
                <div class="ma-row-name">{{ s.nom || s.schoolName || s.id }}</div>
                <div class="ma-row-sub">
                  <span v-if="s.sigle || s.acronym">{{ s.sigle || s.acronym }}</span>
                  <span v-if="(s.sigle || s.acronym) && (s.ville || s.city)"> · </span>
                  <span v-if="s.ville || s.city">{{ s.ville || s.city }}</span>
                  <span v-if="s.edition"> · {{ editionLabel(s.edition) }}</span>
                </div>
              </td>
              <td>
                <a class="ma-link" :href="`https://${s.id}.app-edufrem.com`" target="_blank" rel="noopener">
                  {{ s.id }}.app-edufrem.com
                </a>
                <div class="ma-modules-tags">
                  <span v-if="s.complexeName" class="ma-tag ma-tag-complexe">Complexe : {{ s.complexeName }}</span>
                  <span v-if="s.pack && s.pack !== 'custom'" class="ma-tag ma-tag-pack">{{ packLabel(s) }}</span>
                  <span v-if="essaiActif(s)" class="ma-tag ma-tag-essai">Essai → {{ formatDate(s.trialUntil) }}</span>
                  <template v-if="(!s.pack || s.pack === 'custom') && s.modulesActifs && s.modulesActifs.length">
                    <span v-for="m in s.modulesActifs" :key="m" class="ma-tag">{{ moduleShortLabel(m) }}</span>
                  </template>
                </div>
              </td>
              <td class="num">{{ fmt(s.nbEleves) }}</td>
              <td class="num">{{ fmt(s.nbPersonnel) }}</td>
              <td class="num">
                <span v-if="s.nbInvitations > 0" class="ma-pill is-warn">{{ s.nbInvitations }}</span>
                <span v-else class="ma-pill">0</span>
              </td>
              <td class="num">
                <button class="ma-btn-ghost" type="button" @click="ouvrirModules(s)">
                  Modules
                </button>
                <button class="ma-btn-ghost" type="button" @click="promptComplexe(s)" title="Rattacher cette école à un complexe scolaire">
                  Complexe
                </button>
                <a class="ma-btn-ghost" :href="`https://${s.id}.app-edufrem.com`" target="_blank" rel="noopener">
                  Ouvrir
                </a>
                <button class="ma-btn-ghost" type="button" @click="ouvrirPrompt(s)" title="Prompt de configuration cPanel + Firebase">
                  Config
                </button>
                <button class="ma-btn-ghost ma-btn-danger" type="button" @click="ouvrirSuppression(s)">
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="store.error" class="ma-error">{{ store.error }}</p>
      </section>
      </template>

      <footer class="ma-footer">EDUFREM SAS · MAPO · 2026</footer>
    </div>

    <!-- Modale de création d'école -->
    <transition name="ma-fade">
      <div v-if="creationOuverte" class="ma-modal-overlay" @click.self="fermerCreation">
        <div class="ma-modal">
          <div class="ma-modal-head">
            <h2 class="ma-modal-title">Créer une école</h2>
            <button class="ma-modal-close" type="button" @click="fermerCreation">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <form class="ma-form" @submit.prevent="soumettreCreation">
            <div class="ma-field">
              <label class="ma-label">Nom de l'établissement</label>
              <input v-model="form.nom" type="text" class="ma-input" placeholder="Ex. ENTPE - École Nationale des Travaux Publics de l'État" required @input="suggererSlug" />
            </div>

            <div class="ma-row">
              <div class="ma-field">
                <label class="ma-label">Sigle (optionnel)</label>
                <input v-model="form.sigle" type="text" class="ma-input" placeholder="Ex. ENTPE" />
              </div>
              <div class="ma-field">
                <label class="ma-label">Ville (optionnel)</label>
                <input v-model="form.ville" type="text" class="ma-input" placeholder="Ex. Lyon" />
              </div>
            </div>

            <div class="ma-field">
              <label class="ma-label">Édition</label>
              <div class="ma-radio-group">
                <label v-for="ed in editions" :key="ed.key" class="ma-radio">
                  <input type="radio" :value="ed.key" v-model="form.edition" @change="initModulesParDefaut" />
                  <span class="ma-radio-content">
                    <span class="ma-radio-title">{{ ed.label }}</span>
                    <span class="ma-radio-desc">{{ ed.description }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="ma-row">
              <div class="ma-field">
                <label class="ma-label">Type (optionnel)</label>
                <input v-model="form.type" type="text" class="ma-input" :placeholder="form.edition === 'superieur' ? 'Ex. École d\'ingénieurs' : 'Ex. Collège privé'" />
              </div>
              <div class="ma-field">
                <label class="ma-label">Année académique</label>
                <input v-model="form.anneeAcademique" type="text" class="ma-input" placeholder="2025-2026" />
              </div>
            </div>

            <div class="ma-field">
              <label class="ma-label">Pack</label>
              <p class="ma-hint">Le socle (élèves, classes, matières, personnel, paramètres, accès) est toujours inclus.</p>
              <div class="ma-radio-group">
                <label v-for="p in packsDisponibles" :key="p.key" class="ma-radio">
                  <input type="radio" :value="p.key" v-model="form.pack" />
                  <span class="ma-radio-content">
                    <span class="ma-radio-title">{{ p.label }}</span>
                    <span class="ma-radio-desc">{{ p.description }}</span>
                  </span>
                </label>
                <label class="ma-radio">
                  <input type="radio" value="custom" v-model="form.pack" />
                  <span class="ma-radio-content">
                    <span class="ma-radio-title">Personnalisé</span>
                    <span class="ma-radio-desc">Choisir les modules un par un.</span>
                  </span>
                </label>
              </div>
            </div>

            <div v-if="form.pack === 'custom'" class="ma-field">
              <label class="ma-label">Modules à activer</label>
              <div class="ma-modules-grid">
                <label v-for="m in modulesDisponibles" :key="m.key" class="ma-module-card" :class="{ 'is-active': form.modulesActifs.includes(m.key) }">
                  <input type="checkbox" :value="m.key" v-model="form.modulesActifs" />
                  <span class="ma-module-content">
                    <span class="ma-module-title">{{ m.label }}</span>
                    <span class="ma-module-desc">{{ m.description }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="ma-field">
              <label class="ma-checkline">
                <input type="checkbox" v-model="form.essai" />
                <span>
                  <strong>Essai version complète ({{ TRIAL_MONTHS }} mois)</strong> —
                  l'école a accès à tous les modules jusqu'au
                  {{ apercuFinEssai }}, puis revient automatiquement à son pack.
                </span>
              </label>
            </div>

            <div class="ma-field">
              <label class="ma-label">Sous-domaine</label>
              <div class="ma-subdomain">
                <input v-model="form.slug" type="text" class="ma-input" placeholder="ex. entpe" required />
                <span class="ma-subdomain-suffix">.app-edufrem.com</span>
              </div>
              <p class="ma-hint">
                Cet identifiant deviendra l'adresse de l'école. Lettres minuscules,
                chiffres et tirets.
              </p>
            </div>

            <div class="ma-field">
              <label class="ma-label">Email(s) de l'administrateur</label>
              <div v-for="(email, i) in form.adminEmails" :key="i" class="ma-email-row">
                <input v-model="form.adminEmails[i]" type="email" class="ma-input" placeholder="admin@ecole.com" :required="i === 0" />
                <button v-if="form.adminEmails.length > 1" type="button" class="ma-email-remove" @click="retirerAdmin(i)" title="Retirer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <button type="button" class="ma-add-admin" @click="ajouterAdmin">+ Ajouter un administrateur</button>
              <p class="ma-hint">
                Une invitation est créée pour chaque email. À leur première connexion,
                ils deviennent {{ form.edition === 'superieur' ? 'administrateurs' : 'directeurs' }} de l'établissement.
              </p>
            </div>

            <p v-if="creationError" class="ma-error">{{ creationError }}</p>

            <div v-if="creating" class="ma-progress">
              <div class="ma-progress-track">
                <div class="ma-progress-fill" :style="{ width: creationProgress + '%' }"></div>
              </div>
              <div class="ma-progress-meta">
                <span>{{ creationStepLabel }}</span>
                <span>{{ Math.round(creationProgress) }}%</span>
              </div>
            </div>

            <div class="ma-modal-actions">
              <button type="button" class="ma-btn-ghost" @click="fermerCreation" :disabled="creating">Annuler</button>
              <button type="submit" class="ma-btn-primary" :disabled="creating">
                {{ creating ? 'Création…' : "Créer l'école" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Modale de gestion des modules d'une école existante -->
    <transition name="ma-fade">
      <div v-if="modulesEdit" class="ma-modal-overlay" @click.self="fermerModules">
        <div class="ma-modal">
          <div class="ma-modal-head">
            <h2 class="ma-modal-title">Modules — {{ modulesEdit.school.nom || modulesEdit.school.schoolName || modulesEdit.school.id }}</h2>
            <button class="ma-modal-close" type="button" @click="fermerModules">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="ma-form">
            <div class="ma-field">
              <label class="ma-label">Pack</label>
              <p class="ma-hint">
                Le socle (élèves, classes, personnel, paramètres, accès…) est toujours
                actif. La modification est immédiate pour tous les utilisateurs de l'école.
              </p>
              <div class="ma-radio-group">
                <label v-for="p in modulesEditPacks" :key="p.key" class="ma-radio">
                  <input type="radio" :value="p.key" v-model="modulesEdit.pack" @change="appliquerPackEdit" />
                  <span class="ma-radio-content">
                    <span class="ma-radio-title">{{ p.label }}</span>
                    <span class="ma-radio-desc">{{ p.description }}</span>
                  </span>
                </label>
                <label class="ma-radio">
                  <input type="radio" value="custom" v-model="modulesEdit.pack" />
                  <span class="ma-radio-content">
                    <span class="ma-radio-title">Personnalisé</span>
                    <span class="ma-radio-desc">Choisir les modules un par un.</span>
                  </span>
                </label>
              </div>
            </div>

            <div v-if="modulesEdit.pack === 'custom'" class="ma-field">
              <div class="ma-modules-grid">
                <label v-for="m in modulesEditDisponibles" :key="m.key" class="ma-module-card" :class="{ 'is-active': modulesEdit.selection.includes(m.key) }">
                  <input type="checkbox" :value="m.key" v-model="modulesEdit.selection" />
                  <span class="ma-module-content">
                    <span class="ma-module-title">{{ m.label }}</span>
                    <span class="ma-module-desc">{{ m.description }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="ma-field">
              <label class="ma-label">Essai version complète</label>
              <p v-if="modulesEdit.trialActive" class="ma-hint">
                Essai en cours jusqu'au <strong>{{ formatDate(modulesEdit.trialUntil) }}</strong> —
                tous les modules sont accessibles d'ici là.
              </p>
              <p v-else class="ma-hint">Pas d'essai en cours — le pack s'applique.</p>
              <div class="ma-trial-actions">
                <button type="button" class="ma-btn-ghost" @click="prolongerEssai">
                  {{ modulesEdit.trialActive ? 'Prolonger de ' + TRIAL_MONTHS + ' mois' : 'Démarrer un essai de ' + TRIAL_MONTHS + ' mois' }}
                </button>
                <button v-if="modulesEdit.trialActive" type="button" class="ma-btn-ghost" @click="arreterEssai">
                  Arrêter l'essai maintenant
                </button>
              </div>
            </div>

            <p v-if="modulesError" class="ma-error">{{ modulesError }}</p>

            <div class="ma-modal-actions">
              <button type="button" class="ma-btn-ghost" @click="fermerModules">Annuler</button>
              <button type="button" class="ma-btn-primary" :disabled="modulesSaving" @click="enregistrerModules">
                {{ modulesSaving ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale de suppression d'école -->
    <transition name="ma-fade">
      <div v-if="suppressionEcole" class="ma-modal-overlay" @click.self="fermerSuppression">
        <div class="ma-modal">
          <div class="ma-modal-head">
            <h2 class="ma-modal-title">Supprimer l'école</h2>
            <button class="ma-modal-close" type="button" @click="fermerSuppression">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="ma-form">
            <p class="ma-success-text">
              Cette action supprime définitivement
              <strong>{{ suppressionEcole.school.nom || suppressionEcole.school.id }}</strong> :
              sa fiche et ses comptes dans la base, son sous-domaine
              <strong>{{ suppressionEcole.school.id }}.app-edufrem.com</strong> et son
              autorisation Firebase. Cette opération est irréversible.
            </p>
            <div class="ma-field">
              <label class="ma-label">Pour confirmer, tape le sous-domaine : <code>{{ suppressionEcole.school.id }}</code></label>
              <input v-model="suppressionEcole.confirm" type="text" class="ma-input" :placeholder="suppressionEcole.school.id" />
            </div>
            <p v-if="suppressionError" class="ma-error">{{ suppressionError }}</p>
            <div class="ma-modal-actions">
              <button type="button" class="ma-btn-ghost" @click="fermerSuppression">Annuler</button>
              <button type="button" class="ma-btn-primary ma-btn-danger-solid"
                :disabled="suppression || suppressionEcole.confirm !== suppressionEcole.school.id"
                @click="confirmerSuppression">
                {{ suppression ? 'Suppression…' : "Supprimer définitivement" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Confirmation post-création -->
    <transition name="ma-fade">
      <div v-if="creationOk" class="ma-modal-overlay" @click.self="creationOk = null">
        <div class="ma-modal ma-modal-success">
          <div class="ma-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 class="ma-modal-title">École créée</h2>

          <!-- Tout est automatique : sous-domaine + domaine Firebase OK -->
          <template v-if="creationOk.subdomainCreated && creationOk.authDomainAdded">
            <p class="ma-success-text">
              Tout est prêt — aucune manipulation technique à faire.
            </p>
            <ul class="ma-checklist ma-checklist-ok">
              <li>Espace de l'école en ligne : <strong>{{ creationOk.subdomain }}</strong></li>
              <li>Connexion Google activée pour ce domaine</li>
              <li>
                <template v-if="creationOk.emailsSent">Email d'invitation envoyé à</template><template v-else>Invitation enregistrée pour</template>
                <strong>{{ (creationOk.adminEmails || [creationOk.adminEmail]).join(', ') }}</strong>
                ({{ creationOk.role === 'admin' ? 'administrateur' : 'directeur' }})
              </li>
            </ul>
            <p class="ma-success-text">
              <template v-if="creationOk.emailsSent">
                {{ creationOk.emailsSent > 1 ? 'Les personnes invitées ont reçu un email' : "La personne invitée a reçu un email" }}
                avec un lien pour définir son mot de passe, puis se connecter sur
                <strong>{{ creationOk.subdomain }}</strong>. La connexion par compte Google reste aussi possible.
              </template>
              <template v-else>
                Transmets l'adresse <strong>{{ creationOk.subdomain }}</strong> : la personne se connecte
                avec son compte Google (email de l'invitation) ou par email + mot de passe.
              </template>
            </p>
          </template>

          <!-- Cas dégradés : un geste manuel restant -->
          <template v-else>
            <p class="ma-success-text">
              <template v-if="creationOk.emailsSent">Un email d'invitation a été envoyé à <strong>{{ creationOk.adminEmail }}</strong></template><template v-else>L'invitation de <strong>{{ creationOk.adminEmail }}</strong> a été enregistrée</template>
              ({{ creationOk.role === 'admin' ? 'administrateur' : 'directeur' }}).
              Quelques gestes restent à finaliser côté infrastructure :
            </p>
            <ol class="ma-checklist">
              <li v-if="!creationOk.subdomainCreated">
                Créer le sous-domaine <strong>{{ creationOk.subdomain }}</strong> dans cPanel,
                pointé sur <code>/public_html/mapo</code>
                <template v-if="creationOk.subdomainError"> (auto échec : {{ creationOk.subdomainError }})</template>.
              </li>
              <li v-if="!creationOk.authDomainAdded">
                Ajouter <code>{{ creationOk.subdomain }}</code> aux <em>Authorized domains</em>
                dans Firebase Auth
                <template v-if="creationOk.authDomainError"> (auto échec : {{ creationOk.authDomainError }})</template>.
              </li>
            </ol>
          </template>
          <div class="ma-modal-actions">
            <button type="button" class="ma-btn-ghost" @click="ouvrirPrompt(creationOk)">Prompt de configuration</button>
            <button type="button" class="ma-btn-primary" @click="creationOk = null">Compris</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modale : prompt de configuration manuelle (cPanel + Firebase) -->
    <transition name="ma-fade">
      <div v-if="promptDialog" class="ma-modal-overlay" @click.self="promptDialog = null">
        <div class="ma-modal ma-modal-prompt">
          <div class="ma-modal-head">
            <h2 class="ma-modal-title">Configuration — {{ promptDialog.nom }}</h2>
            <button class="ma-modal-close" type="button" @click="promptDialog = null">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="ma-form">
            <p class="ma-hint">
              Copie ce prompt et confie-le à une IA pilotant le navigateur (cPanel + Firebase) :
              elle créera le sous-domaine <strong>{{ promptDialog.slug }}.app-edufrem.com</strong> et l'autorisation Firebase.
              Le dossier <code>/public_html/mapo</code> (partagé par toutes les écoles) n'est jamais touché.
            </p>
            <div class="ma-prompt-tabs">
              <button type="button" class="ma-prompt-tab" :class="{ active: promptTab === 'install' }" @click="promptTab = 'install'; promptCopied = false">Installer</button>
              <button type="button" class="ma-prompt-tab" :class="{ active: promptTab === 'remove' }" @click="promptTab = 'remove'; promptCopied = false">Désinstaller</button>
            </div>
            <textarea class="ma-prompt-box" readonly rows="14" :value="promptCourant" @focus="$event.target.select()"></textarea>
            <div class="ma-modal-actions">
              <button type="button" class="ma-btn-ghost" @click="promptDialog = null">Fermer</button>
              <button type="button" class="ma-btn-primary" @click="copierPrompt">{{ promptCopied ? 'Copié ✓' : 'Copier le prompt' }}</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMegaAdminStore, slugify, EDITIONS, MODULES_INFO, PACKS, packModules, computeTrialUntil, TRIAL_MONTHS } from '../stores/megaAdmin'
import MegaPaiementsScolarite from './admin/MegaPaiementsScolarite.vue'
import MegaMiapoAnalytics from './admin/MegaMiapoAnalytics.vue'

const router = useRouter()
const authStore = useAuthStore()
const store = useMegaAdminStore()

const tab = ref('ecoles')

const creationOuverte = ref(false)
const creating = ref(false)
const creationError = ref('')
const creationOk = ref(null)
const creationProgress = ref(0)
const creationStepLabel = ref('')
let creationTimer = null

// ── Prompt de configuration manuelle (cPanel + Firebase) ──
// Repli fiable quand l'automatisation de provisioning est capricieuse :
// on génère un prompt complet à copier et à confier à une IA pilotant le
// navigateur (cPanel + console Firebase).
const promptDialog = ref(null)
const promptTab = ref('install')
const promptCopied = ref(false)

function buildPrompts(slug, nom, adminEmail) {
  const sub = `${slug}.app-edufrem.com`
  const ligneAdmin = adminEmail
    ? `\n2. L'administrateur (${adminEmail}) ouvre l'email d'invitation reçu pour définir son mot de passe, puis se connecte.`
    : ''
  const install = `Tu es un assistant avec accès au navigateur. Configure une nouvelle école sur l'infrastructure EDUFREM / MAPO (hébergement LWS cPanel + Firebase).
RÈGLE ABSOLUE : ne crée, ne modifie ni ne supprime JAMAIS le dossier /public_html/mapo — il contient l'application partagée par TOUTES les écoles. On réutilise ce dossier, on n'en crée pas un nouveau.

ÉCOLE : ${nom}
SOUS-DOMAINE À CRÉER : ${sub}

ÉTAPE 1 — cPanel : créer le sous-domaine
1. Ouvre https://web58.lws-hosting.com:2083 et connecte-toi (compte cPanel : c2627836c).
2. Va dans « Domaines » puis « Créer un nouveau domaine ».
3. Domaine : ${sub}
4. Racine du document : /public_html/mapo
   IMPORTANT : ce dossier existe déjà. Si une case « Créer un nouveau dossier pour ce domaine » est proposée, DÉCOCHE-la pour réutiliser le dossier MAPO partagé.
5. Clique « Soumettre ». Le sous-domaine sert alors l'application MAPO.

ÉTAPE 2 — Firebase : autoriser le domaine
1. Ouvre https://console.firebase.google.com/project/mapo-edufrem/authentication/settings
2. Section « Domaines autorisés » → bouton « Ajouter un domaine ».
3. Ajoute exactement : ${sub}
4. Enregistre. (Indispensable pour la connexion Google et les liens d'invitation par email.)

ÉTAPE 3 — Vérification
1. Ouvre https://${sub}/ : l'écran de connexion MAPO doit s'afficher.${ligneAdmin}

Terminé : l'école « ${nom} » est en ligne sur ${sub}.`

  const remove = `Tu es un assistant avec accès au navigateur. Désinstalle une école de l'infrastructure EDUFREM / MAPO.
RÈGLE ABSOLUE : ne supprime JAMAIS le dossier /public_html/mapo (partagé par toutes les écoles). On retire uniquement le sous-domaine et l'autorisation Firebase.

ÉCOLE : ${nom}
SOUS-DOMAINE À RETIRER : ${sub}

ÉTAPE 1 — cPanel : retirer le sous-domaine
1. Ouvre https://web58.lws-hosting.com:2083 (compte cPanel : c2627836c).
2. Va dans « Domaines ».
3. Repère ${sub} → « Gérer » → supprime ce domaine.
   NE supprime PAS le dossier /public_html/mapo ni ses fichiers.

ÉTAPE 2 — Firebase : retirer le domaine autorisé
1. Ouvre https://console.firebase.google.com/project/mapo-edufrem/authentication/settings
2. Section « Domaines autorisés » → retire ${sub} (icône corbeille).

ÉTAPE 3 — Données
Les données de l'école dans la base ont déjà été supprimées par le bouton « Supprimer » de l'admin MAPO. Rien d'autre à faire.

Terminé : ${sub} est désinstallé.`

  return { install, remove }
}

function ouvrirPrompt(data) {
  if (!data) return
  const slug = data.slug || data.id
  const nom = data.nom || data.schoolName || slug
  const adminEmail = data.adminEmail || (Array.isArray(data.adminEmails) && data.adminEmails[0]) || ''
  promptTab.value = 'install'
  promptCopied.value = false
  promptDialog.value = { slug, nom, adminEmail, ...buildPrompts(slug, nom, adminEmail) }
}

const promptCourant = computed(() => {
  if (!promptDialog.value) return ''
  return promptTab.value === 'remove' ? promptDialog.value.remove : promptDialog.value.install
})

async function copierPrompt() {
  const txt = promptCourant.value
  try {
    await navigator.clipboard.writeText(txt)
  } catch {
    // Repli si l'API Clipboard est bloquée : sélection via textarea temporaire
    const ta = document.createElement('textarea')
    ta.value = txt; document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy') } catch { /* ignore */ }
    document.body.removeChild(ta)
  }
  promptCopied.value = true
  setTimeout(() => { promptCopied.value = false }, 2200)
}

// Année académique par défaut : septembre → août de l'année suivante
function anneeParDefaut() {
  const t = new Date()
  const y = t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1
  return `${y}-${y + 1}`
}

const form = reactive({
  nom: '',
  sigle: '',
  ville: '',
  type: '',
  edition: 'superieur',
  anneeAcademique: anneeParDefaut(),
  pack: 'premium',
  essai: true,
  modulesActifs: [...EDITIONS.superieur.modulesParDefaut],
  slug: '',
  adminEmails: [''],
})

function ajouterAdmin() {
  form.adminEmails.push('')
}
function retirerAdmin(i) {
  form.adminEmails.splice(i, 1)
  if (!form.adminEmails.length) form.adminEmails.push('')
}
const slugManuallyEdited = ref(false)

// Listes pour le formulaire
const editions = computed(() => Object.values(EDITIONS))
const modulesDisponibles = computed(() => {
  const ed = EDITIONS[form.edition]
  if (!ed) return []
  return ed.modulesDisponibles.map((k) => ({ key: k, ...MODULES_INFO[k] }))
})
const packsDisponibles = computed(() => PACKS[form.edition] || PACKS.secondaire)

// Aperçu de la date de fin d'essai affiché dans le formulaire
const apercuFinEssai = computed(() => formatDate(computeTrialUntil()))

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function initModulesParDefaut() {
  const ed = EDITIONS[form.edition]
  form.modulesActifs = ed ? [...ed.modulesParDefaut] : []
  // Repartir sur le pack le plus complet de l'édition choisie
  const packs = PACKS[form.edition] || PACKS.secondaire
  form.pack = packs[packs.length - 1].key
}

// Helpers d'affichage liste
function editionLabel(key) {
  return EDITIONS[key]?.label || key
}
function moduleShortLabel(key) {
  return MODULES_INFO[key]?.label || key
}
function packLabel(school) {
  const packs = PACKS[school.edition] || PACKS.secondaire
  return packs.find((p) => p.key === school.pack)?.label || school.pack
}
function essaiActif(school) {
  if (!school.trialUntil) return false
  try { return new Date(school.trialUntil).getTime() > Date.now() } catch { return false }
}

const totalEleves = computed(() => store.schools.reduce((s, x) => s + (x.nbEleves || 0), 0))
const totalPersonnel = computed(() => store.schools.reduce((s, x) => s + (x.nbPersonnel || 0), 0))
const totalInvitations = computed(() => store.schools.reduce((s, x) => s + (x.nbInvitations || 0), 0))

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')

function suggererSlug() {
  if (!slugManuallyEdited.value) form.slug = slugify(form.nom)
}

function ouvrirCreation() {
  Object.assign(form, {
    nom: '', sigle: '', ville: '', type: '',
    edition: 'secondaire',
    anneeAcademique: anneeParDefaut(),
    pack: 'premium',
    essai: true,
    modulesActifs: [...EDITIONS.secondaire.modulesParDefaut],
    slug: '', adminEmails: [''],
  })
  slugManuallyEdited.value = false
  creationError.value = ''
  creationOuverte.value = true
}
function fermerCreation() {
  if (creating.value) return
  creationOuverte.value = false
}

async function soumettreCreation() {
  creating.value = true
  creationError.value = ''

  // Barre de progression simulée : la création est un seul appel asynchrone,
  // on fait monter la barre vers 90 % puis on la termine à 100 % à la réponse.
  creationProgress.value = 6
  creationStepLabel.value = "Création de l'école…"
  clearInterval(creationTimer)
  creationTimer = setInterval(() => {
    const p = creationProgress.value
    if (p < 92) {
      const inc = p < 35 ? 5 : (p < 65 ? 2.5 : 1)
      creationProgress.value = Math.min(92, p + inc)
      if (creationProgress.value >= 30 && creationProgress.value < 62) creationStepLabel.value = 'Configuration du sous-domaine…'
      else if (creationProgress.value >= 62) creationStepLabel.value = 'Activation de la connexion et finalisation…'
    }
  }, 240)

  let r
  try {
    r = await store.createSchool({
      slug: form.slug.trim().toLowerCase(),
      nom: form.nom.trim(),
      sigle: form.sigle.trim(),
      ville: form.ville.trim(),
      type: form.type.trim(),
      edition: form.edition,
      pack: form.pack,
      essai: form.essai,
      modulesActifs: form.modulesActifs,
      anneeAcademique: form.anneeAcademique.trim(),
      adminEmails: form.adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean),
    })
  } finally {
    clearInterval(creationTimer)
  }

  creationProgress.value = 100
  creationStepLabel.value = r && r.success ? 'Terminé' : 'Échec'
  await new Promise((res) => setTimeout(res, 450)) // laisser voir le 100 %

  creating.value = false
  creationProgress.value = 0
  if (r && r.success) {
    creationOuverte.value = false
    creationOk.value = {
      slug: r.slug,
      subdomain: r.subdomain,
      role: r.role,
      adminEmail: r.adminEmail,
      adminEmails: r.adminEmails,
      subdomainCreated: r.subdomainCreated,
      subdomainError: r.subdomainError,
      authDomainAdded: r.authDomainAdded,
      authDomainError: r.authDomainError,
      emailsSent: r.emailsSent,
      emailsTotal: r.emailsTotal,
      emailError: r.emailError,
    }
  } else {
    creationError.value = (r && r.error) || "La création de l'école a échoué."
  }
}

// ── Gestion du plan (pack, modules, essai) d'une école existante ──
const modulesEdit = ref(null)
const modulesSaving = ref(false)
const modulesError = ref('')

const modulesEditDisponibles = computed(() => {
  if (!modulesEdit.value) return []
  const ed = EDITIONS[modulesEdit.value.school.edition] || EDITIONS.secondaire
  return ed.modulesDisponibles.map((k) => ({ key: k, ...MODULES_INFO[k] }))
})

const modulesEditPacks = computed(() => {
  if (!modulesEdit.value) return []
  return PACKS[modulesEdit.value.school.edition] || PACKS.secondaire
})

// Rattache une école à un complexe scolaire (directeur multi-écoles).
// Prompt léger (outil interne) : identifiant partagé + nom du complexe.
async function promptComplexe(school) {
  const cid = window.prompt(
    'Identifiant du complexe (partagé par toutes les écoles du groupe ET le compte du directeur de complexe).\nLaisser vide pour détacher cette école.',
    school.complexeId || ''
  )
  if (cid === null) return
  let name = school.complexeName || ''
  if (cid.trim()) {
    name = window.prompt('Nom du complexe (affiché) :', name || school.nom || school.schoolName || '') || name
  }
  const res = await store.assignComplexe(school.id, cid, name)
  if (!res.success) window.alert(res.error || 'Échec de l\'enregistrement.')
}

function ouvrirModules(school) {
  const ed = EDITIONS[school.edition] || EDITIONS.secondaire
  const current = Array.isArray(school.modulesActifs) && school.modulesActifs.length
    ? school.modulesActifs.filter((k) => ed.modulesDisponibles.includes(k))
    : [...ed.modulesParDefaut]
  const trialUntil = school.trialUntil || null
  const trialActive = trialUntil ? new Date(trialUntil).getTime() > Date.now() : false
  modulesEdit.value = {
    school,
    pack: school.pack || 'custom',
    selection: [...current],
    trialUntil,
    trialActive,
  }
  modulesError.value = ''
}

// Quand on choisit un pack, la sélection de modules suit le pack.
function appliquerPackEdit() {
  const me = modulesEdit.value
  if (!me || me.pack === 'custom') return
  me.selection = packModules(me.school.edition, me.pack)
}

function prolongerEssai() {
  const me = modulesEdit.value
  if (!me) return
  me.trialUntil = computeTrialUntil()
  me.trialActive = true
}

function arreterEssai() {
  const me = modulesEdit.value
  if (!me) return
  me.trialUntil = null
  me.trialActive = false
}

function fermerModules() {
  if (modulesSaving.value) return
  modulesEdit.value = null
}

async function enregistrerModules() {
  const me = modulesEdit.value
  if (!me) return
  modulesSaving.value = true
  modulesError.value = ''
  const modulesActifs = me.pack !== 'custom'
    ? packModules(me.school.edition, me.pack)
    : [...me.selection]
  const r = await store.updateSchoolPlan(me.school.id, {
    pack: me.pack,
    modulesActifs,
    trialUntil: me.trialUntil,
  })
  modulesSaving.value = false
  if (r.success) {
    modulesEdit.value = null
  } else {
    modulesError.value = r.error
  }
}

// ── Suppression d'une école ──
const suppressionEcole = ref(null)
const suppression = ref(false)
const suppressionError = ref('')

function ouvrirSuppression(school) {
  suppressionEcole.value = { school, confirm: '' }
  suppressionError.value = ''
}
function fermerSuppression() {
  if (suppression.value) return
  suppressionEcole.value = null
}
async function confirmerSuppression() {
  const se = suppressionEcole.value
  if (!se || se.confirm !== se.school.id) return
  suppression.value = true
  suppressionError.value = ''
  const r = await store.deleteSchool(se.school.id)
  suppression.value = false
  if (r.success) {
    suppressionEcole.value = null
  } else {
    suppressionError.value = r.error || 'Échec de la suppression.'
  }
}

async function seDeconnecter() {
  await authStore.logout()
  router.push('/admin-login')
}

onMounted(() => {
  store.loadSchools()
})

// Détecte la modification manuelle du slug (pour ne plus l'écraser)
watch(() => form.slug, (v) => {
  if (v !== slugify(form.nom)) slugManuallyEdited.value = true
})
</script>

<style scoped>
.ma {
  min-height: 100vh;
  background: var(--bg);
  font-family: 'Outfit', system-ui, sans-serif;
}

/* Header */
.ma-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 28px;
  background: #0C2D5A;
  position: sticky;
  top: 0;
  z-index: 20;
}
.ma-brand { display: flex; align-items: center; gap: 12px; }
.ma-logo {
  width: 40px; height: 40px;
  background: var(--gold, #B8892A);
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 20px; font-weight: 800; color: #fff;
}
.ma-brand-title {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px; font-weight: 700; color: #fff; line-height: 1.2;
}
.ma-brand-sub { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 2px; }
.ma-quit {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9px; padding: 7px 13px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer; transition: background 0.15s ease;
}
.ma-quit:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }

/* Body */
.ma-body { max-width: 1180px; margin: 0 auto; padding: 24px 28px 40px; }

.ma-tabs { display: flex; gap: 4px; border-bottom: 1px solid #ECECE8; margin-bottom: 22px; }
.ma-tab { background: none; border: none; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #6F767E; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: 0.15s; font-family: inherit; }
.ma-tab:hover { color: #1A1D1F; }
.ma-tab.active { color: #1A1D1F; border-bottom-color: #1A1D1F; }

.ma-intro {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
}
.ma-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 26px; font-weight: 800; color: var(--tx); margin: 0;
}
.ma-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

.ma-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: var(--pr);
  color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.ma-btn-primary:hover:not(:disabled) { background: var(--pr-dark); }
.ma-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.ma-btn-ghost {
  display: inline-flex; align-items: center;
  padding: 6px 14px;
  background: transparent;
  color: var(--tx2);
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600;
  text-decoration: none; cursor: pointer;
  transition: all 0.15s ease;
}
.ma-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }

/* KPIs */
.ma-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 18px;
}
.ma-kpi {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 16px;
}
.ma-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.ma-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 28px; font-weight: 800; color: var(--tx);
  margin-top: 6px; line-height: 1;
}

/* Tableau */
.ma-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}
.ma-table { width: 100%; border-collapse: collapse; }
.ma-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.03em;
  color: var(--tx2);
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.ma-table th.num { text-align: right; }
.ma-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 12px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.ma-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.ma-table tbody tr:last-child td { border-bottom: none; }
.ma-row-name { font-weight: 600; color: var(--tx); }
.ma-row-sub { font-size: 12px; color: var(--tx3); margin-top: 1px; }
.ma-link {
  color: var(--pr);
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 500;
  text-decoration: none;
}
.ma-link:hover { text-decoration: underline; }
.ma-pill {
  display: inline-block;
  min-width: 28px; padding: 2px 9px;
  background: var(--input-bg);
  color: var(--tx2);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 700; text-align: center;
}
.ma-pill.is-warn {
  background: rgba(232, 149, 10, 0.12);
  color: var(--warn);
}
.ma-empty {
  padding: 28px; text-align: center;
  color: var(--tx3); font-size: 13.5px;
}

.ma-error {
  margin: 14px 16px;
  padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}

.ma-footer {
  margin-top: 22px; text-align: center;
  font-size: 12px; color: var(--tx3);
}

/* Modal */
.ma-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.ma-modal {
  width: 100%; max-width: 520px;
  max-height: 90vh; overflow-y: auto;
  background: var(--card);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.ma-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--divider);
}
.ma-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.ma-modal-close {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--input-bg);
  border: none; color: var(--tx2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.ma-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.ma-form { padding: 20px 24px 24px; }
.ma-field { margin-bottom: 16px; }
.ma-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ma-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.03em;
  color: var(--tx3); margin-bottom: 5px;
}
.ma-input {
  display: block; width: 100%;
  height: 40px; padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px; color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none; box-sizing: border-box;
  transition: border-color 0.15s ease;
}
.ma-input:focus { border-color: var(--pr); }
.ma-hint { font-size: 12.5px; color: var(--tx3); margin: 5px 0 0; line-height: 1.45; }
.ma-subdomain { display: flex; align-items: stretch; }
.ma-subdomain .ma-input {
  border-top-right-radius: 0; border-bottom-right-radius: 0;
  border-right: none;
}
.ma-subdomain-suffix {
  display: inline-flex; align-items: center;
  padding: 0 12px; height: 40px;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-left: none;
  border-top-right-radius: 9px; border-bottom-right-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600; color: var(--tx2);
  white-space: nowrap;
}
/* Barre de progression création */
.ma-progress { margin-top: 18px; }
.ma-progress-track {
  height: 8px;
  border-radius: 100px;
  background: rgba(var(--pr-rgb), 0.12);
  overflow: hidden;
}
.ma-progress-fill {
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, rgba(var(--pr-rgb), 0.75), var(--pr));
  transition: width 0.25s ease;
}
.ma-progress-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
}
.ma-progress-meta span:last-child { color: var(--pr); }

.ma-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 20px;
}
.ma-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal succès */
.ma-modal-prompt { max-width: 640px; width: 100%; }
.ma-prompt-tabs {
  display: inline-flex; gap: 4px; padding: 4px;
  background: rgba(0, 0, 0, 0.05); border-radius: 11px; margin: 4px 0 12px;
}
.ma-prompt-tab {
  border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--tx2); padding: 7px 18px; border-radius: 8px;
  transition: background .15s, color .15s;
}
.ma-prompt-tab.active { background: #fff; color: var(--pr); box-shadow: 0 1px 5px rgba(0, 0, 0, 0.09); }
.ma-prompt-box {
  width: 100%; box-sizing: border-box;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.5; color: var(--tx);
  background: #fff; border: 1.5px solid var(--divider); border-radius: 12px;
  padding: 14px; resize: vertical; white-space: pre-wrap;
}
.ma-prompt-box:focus { outline: none; border-color: var(--pr); }

.ma-modal-success { padding: 28px 26px; text-align: center; }
.ma-success-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 60px; height: 60px; border-radius: 17px;
  background: rgba(27, 138, 90, 0.12);
  color: var(--success);
  margin-bottom: 14px;
}
.ma-success-text {
  font-size: 14px; color: var(--tx2);
  line-height: 1.55; margin: 0 0 12px;
}
.ma-checklist {
  text-align: left; margin: 0 0 12px;
  padding-left: 22px;
  font-size: 13.5px; color: var(--tx);
  line-height: 1.7;
}
.ma-checklist strong { color: var(--pr); }
.ma-checklist code {
  font-family: monospace;
  background: var(--input-bg);
  padding: 1px 5px; border-radius: 4px;
  font-size: 12.5px;
}

.ma-fade-enter-active, .ma-fade-leave-active { transition: opacity 0.2s ease; }
.ma-fade-enter-from, .ma-fade-leave-to { opacity: 0; }

/* Tags des modules dans le tableau */
.ma-modules-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.ma-tag {
  padding: 2px 8px;
  background: rgba(var(--pr-rgb), 0.08);
  color: var(--pr);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 600;
}
.ma-tag-pack {
  background: rgba(27, 138, 90, 0.12);
  color: #1B8A5A;
}
.ma-tag-essai {
  background: rgba(232, 168, 56, 0.15);
  color: #B8892A;
}
.ma-tag-complexe {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}

/* Ligne checkbox (essai version complète) */
.ma-checkline {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(12, 45, 90, 0.12);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.5;
}
.ma-checkline input { margin-top: 3px; }

/* Actions essai dans la modale Modules */
.ma-trial-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }

/* Multi-admins */
.ma-email-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.ma-email-row .ma-input { flex: 1; }
.ma-email-remove {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; flex: none;
  border: 1px solid rgba(217, 48, 37, 0.3); border-radius: 8px;
  background: transparent; color: #D93025; cursor: pointer;
}
.ma-email-remove:hover { background: rgba(217, 48, 37, 0.08); }
.ma-add-admin {
  background: none; border: none; color: var(--pr); cursor: pointer;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600;
  padding: 2px 0; margin-top: 2px;
}

/* Bouton danger (suppression) */
.ma-btn-danger { color: #D93025 !important; }
.ma-btn-danger:hover { background: rgba(217, 48, 37, 0.08) !important; }
.ma-btn-danger-solid {
  background: #D93025 !important; border-color: #D93025 !important; color: #fff !important;
}
.ma-btn-danger-solid:disabled { opacity: 0.5; }

/* Checklist "tout est prêt" */
.ma-checklist-ok { list-style: none; padding-left: 0; }
.ma-checklist-ok li {
  position: relative;
  padding-left: 26px;
  margin-bottom: 8px;
}
.ma-checklist-ok li::before {
  content: '';
  position: absolute;
  left: 0; top: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #1B8A5A;
  -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6L9 17l-5-5'/></svg>") center / 12px no-repeat;
  mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6L9 17l-5-5'/></svg>") center / 12px no-repeat;
}

/* Radio buttons "édition" */
.ma-radio-group { display: flex; flex-direction: column; gap: 8px; }
.ma-radio {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}
.ma-radio:hover { background: #FAFAF7; }
.ma-radio input[type="radio"] { margin-top: 3px; cursor: pointer; }
.ma-radio:has(input[type="radio"]:checked) {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb), 0.04);
}
.ma-radio-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ma-radio-title { font-weight: 600; font-size: 14px; color: #1A1D1F; }
.ma-radio-desc { font-size: 12px; color: #6F767E; }

/* Grille de modules à cocher */
.ma-modules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}
.ma-module-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}
.ma-module-card:hover { background: #FAFAF7; }
.ma-module-card.is-active {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb), 0.04);
}
.ma-module-card input[type="checkbox"] { margin-top: 3px; cursor: pointer; }
.ma-module-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ma-module-title { font-weight: 600; font-size: 13.5px; color: #1A1D1F; }
.ma-module-desc { font-size: 11.5px; color: #6F767E; line-height: 1.4; }

@media (max-width: 900px) {
  .ma-kpis { grid-template-columns: repeat(2, 1fr); }
  .ma-modules-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .ma-header { padding: 12px 14px; flex-wrap: wrap; gap: 8px; }
  .ma-body { padding: 14px; }
  .ma-h1 { font-size: 22px; }
  .ma-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .ma-intro button { width: 100%; }
  .ma-table { font-size: 12.5px; }
  .ma-table th, .ma-table td { padding: 10px 10px; }
  .ma-card { overflow-x: auto; }
  .ma-modal-overlay { padding: 0; align-items: flex-end; }
  .ma-modal {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
    overflow-y: auto;
  }
  .ma-modal-actions { flex-direction: column-reverse; gap: 8px; }
  .ma-modal-actions button { width: 100%; }
}
@media (max-width: 600px) {
  .ma-row { grid-template-columns: 1fr; }
}
</style>
