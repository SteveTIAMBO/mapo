<template>
  <div class="miapo-shell">
    <!-- Fond sombre quand le menu coulissant est ouvert (mobile) -->
    <div v-if="menuOpen" class="volet-backdrop" @click="menuOpen = false"></div>

    <!-- ───────── Volet menu (sidebar sur PC ; hamburger coulissant sur mobile) ───────── -->
    <aside class="volet" :class="{ open: menuOpen }">
      <div class="volet-brand">
        <div class="brand-ic"><Sparkles :size="18" /></div>
        <div class="brand-tx"><strong>MIAPO+</strong><small>{{ L.brandSub }}</small></div>
      </div>

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
      <button type="button" class="volet-logout" @click="logout"><LogOut :size="17" /> <span>Se déconnecter</span></button>
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
          <button v-if="!isApprenant" class="btn btn-outline btn-sm" @click="openAdd"><Plus :size="15" /> <span>Ajouter un enfant</span></button>
        </header>

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
            <div><strong>Points de vigilance</strong><p>{{ insight }}</p></div>
          </div>

          <div class="stat-grid">
            <div class="stat" role="button" tabindex="0" @click="section = 'enfants'" @keyup.enter="section = 'enfants'"><span class="stat-v">{{ moyenne ?? '—' }}</span><span class="stat-l">Moyenne /20</span></div>
            <div class="stat" role="button" tabindex="0" @click="section = 'tuteur'" @keyup.enter="section = 'tuteur'"><span class="stat-v" :class="{ warn: aReviser.length }">{{ aReviser.length }}</span><span class="stat-l">À réviser</span></div>
            <div class="stat" role="button" tabindex="0" @click="section = 'orientation'" @keyup.enter="section = 'orientation'"><span class="stat-v">{{ hasEval ? 'Fait' : '—' }}</span><span class="stat-l">Profil 6C</span></div>
          </div>

          <div v-if="hasEval" class="card radar-dash" role="button" tabindex="0" @click="section = 'orientation'">
            <div class="card-head"><Target :size="18" /><h3>Profil 6C</h3></div>
            <Radar6C :scores="activeEnfant.comp6c || {}" />
          </div>

          <div class="quick">
            <button class="btn btn-primary" @click="section = 'tuteur'"><GraduationCap :size="16" /> <span>Lancer une révision</span></button>
            <button class="btn btn-outline" @click="section = 'orientation'"><Compass :size="16" /> <span>Explorer l'orientation</span></button>
          </div>
        </section>

        <!-- ========== MES ENFANTS ========== -->
        <section v-else-if="section === 'enfants'" class="sec">
          <div class="card">
            <div class="card-head"><Users :size="18" /><h3>{{ isApprenant ? 'Mon profil' : 'Profils' }}</h3></div>
            <div class="enfant-list">
              <button v-for="e in enfants" :key="e.id" class="enfant-row" :class="{ active: e.id === activeId }" @click="activeId = e.id">
                <span class="er-avatar" :class="e.gender === 'F' ? 'av-f' : 'av-m'">{{ (e.firstName[0] || '') + (e.lastName[0] || '') }}</span>
                <span class="er-info"><strong>{{ e.firstName }} {{ e.lastName }}</strong><small>{{ niveauLabel(e) }} · {{ paysLabel(e.pays) }}</small></span>
                <Trash2 v-if="e.id === activeId" :size="16" class="er-del" @click.stop="confirmRemove" />
              </button>
            </div>
            <button v-if="!isApprenant" class="btn btn-outline btn-sm add-child" @click="openAdd"><Plus :size="15" /> <span>Ajouter un enfant</span></button>
          </div>

          <!-- Notes -->
          <div class="card">
            <div class="card-head"><FileText :size="18" /><h3>{{ isApprenant ? 'Tes notes' : 'Notes de ' + activeEnfant.firstName }}</h3></div>
            <div v-if="activeEnfant.notes.length" class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}</span>
                <span class="nr-note" :class="noteClass(n.note)">{{ n.note }}/20</span>
                <button class="btn btn-ghost btn-xs" @click="store.removeNote(activeEnfant.id, n.id)"><X :size="14" /></button>
              </div>
            </div>
            <p v-else class="muted">Aucune note saisie. Ajoutez-en pour que MIAPO analyse les points faibles.</p>
            <div class="add-note">
              <select v-model="newMatiere" class="input"><option value="" disabled>Matière…</option><option v-for="m in MATIERES" :key="m" :value="m">{{ m }}</option></select>
              <input v-model.number="newNote" type="number" min="0" max="20" step="0.5" class="input note-input" placeholder="/20" />
              <button class="btn btn-primary btn-sm" :disabled="!canAddNote" @click="addNote"><Plus :size="15" /></button>
            </div>
          </div>

          <!-- Lecture de copie -->
          <div class="card vision-card">
            <div class="card-head"><Camera :size="18" /><h3>Lire une copie d'examen</h3></div>
            <div v-if="visionState === 'idle'" class="vision-pick">
              <p class="muted">Photographiez une copie : MIAPO la lit, estime la note et repère les points faibles.</p>
              <label class="btn btn-primary vision-btn"><Camera :size="16" /> <span>Choisir / prendre une photo</span><input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickCopie" /></label>
            </div>
            <div v-else-if="visionState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>MIAPO lit la copie…</p><small>Quelques secondes</small></div>
            <div v-else-if="visionState === 'done' && visionResult" class="vision-result">
              <div class="vr-head"><span class="vr-mat">{{ visionResult.matiere || 'Copie analysée' }}</span><span v-if="visionResult.note !== null" class="vr-note" :class="noteClass(visionResult.note)">{{ visionResult.note }}/20</span></div>
              <div v-if="visionResult.points_faibles.length" class="vr-weak"><span class="reco-lab">Points faibles</span><div class="chips"><span v-for="(p, i) in visionResult.points_faibles" :key="i" class="chip chip-w">{{ p }}</span></div></div>
              <p v-if="visionResult.conseil" class="reco-conseil"><Lightbulb :size="15" /> {{ visionResult.conseil }}</p>
              <div class="vr-actions">
                <button v-if="visionResult.matiere && visionResult.note !== null" class="btn btn-outline btn-sm" @click="addVisionNote"><Plus :size="14" /> <span>Ajouter la note</span></button>
                <button v-if="visionResult.matiere && visionResult.points_faibles.length" class="btn btn-outline btn-sm" @click="addToRevisions"><Target :size="14" /> <span>Ajouter aux révisions</span></button>
                <button v-if="visionResult.matiere" class="btn btn-primary btn-sm" @click="goRevise(visionResult.matiere, visionResult.points_faibles)"><Sparkles :size="14" /> <span>Réviser {{ visionResult.matiere }}</span></button>
                <button class="btn btn-ghost btn-sm" @click="resetVision">Autre copie</button>
              </div>
            </div>
            <div v-else-if="visionState === 'error'" class="err"><p>{{ visionError }}</p><button class="btn btn-outline btn-sm" @click="resetVision">Réessayer</button></div>
          </div>
        </section>

        <!-- ========== TUTEUR ========== -->
        <section v-else-if="section === 'tuteur'" class="sec">
          <div v-if="quizMatiere" class="card">
            <TuteurQuiz :matiere="quizMatiere" :niveau="activeEnfant.niveau" :student-id="activeEnfant.id" :themes="quizThemes" @quit="quizMatiere = ''; quizThemes = ''" />
          </div>
          <template v-else>
            <div v-if="aReviser.length" class="card">
              <div class="card-head"><Target :size="18" /><h3>{{ isApprenant ? 'À réviser en priorité' : 'Matières à réviser' }}</h3></div>
              <div class="weak-list">
                <component :is="isApprenant ? 'button' : 'div'" v-for="w in aReviser" :key="w.matiere" class="weak-item" :class="{ 'weak-static': !isApprenant }" @click="isApprenant && goRevise(w.matiere, w.themes)">
                  <span class="wi-name">{{ w.matiere }}<small v-if="w.themes.length" class="wi-themes"> · {{ w.themes.slice(0, 2).join(', ') }}</small></span>
                  <span class="wi-right"><span class="wi-level">Niveau {{ levelFor(w.matiere) }}/5</span><span v-if="w.note !== null" class="wi-note">{{ w.note }}/20</span><ChevronRight v-if="isApprenant" :size="18" /></span>
                </component>
              </div>
              <p v-if="!isApprenant" class="muted small wl-note">Ce que {{ activeEnfant.firstName }} doit travailler — {{ activeEnfant.firstName }} lance ses révisions de son côté.</p>
            </div>

            <!-- Apprenant : lancer une révision -->
            <div v-if="isApprenant" class="card">
              <div class="card-head"><GraduationCap :size="18" /><h3>Cours particulier — réviser une matière</h3></div>
              <p class="muted">MIAPO génère un exercice adapté à ton niveau et t'accompagne pas à pas (méthode, indices, explication).</p>
              <div class="revise-pick">
                <select v-model="reviseMatiere" class="input"><option value="" disabled>Choisir une matière…</option><option v-for="m in MATIERES" :key="m" :value="m">{{ m }}</option></select>
                <button class="btn btn-primary" :disabled="!reviseMatiere" @click="goRevise(reviseMatiere)"><Sparkles :size="15" /> <span>Démarrer</span></button>
              </div>
            </div>
            <!-- Parent : désigner une matière à réviser (sans la lancer) -->
            <div v-else class="card">
              <div class="card-head"><GraduationCap :size="18" /><h3>Demander une révision</h3></div>
              <p class="muted">Désignez une matière : elle apparaîtra dans « À réviser » de {{ activeEnfant.firstName }}, qui la travaillera avec MIAPO. Vous suivez, {{ activeEnfant.firstName }} révise.</p>
              <div class="revise-pick">
                <select v-model="reviseMatiere" class="input"><option value="" disabled>Choisir une matière…</option><option v-for="m in MATIERES" :key="m" :value="m">{{ m }}</option></select>
                <button class="btn btn-primary" :disabled="!reviseMatiere" @click="demanderRevision"><Plus :size="15" /> <span>Demander</span></button>
              </div>
              <p v-if="revisionDemandee" class="muted small saved-ok">« {{ revisionDemandee }} » ajoutée à « À réviser ».</p>
            </div>

            <!-- Prépa examen -->
            <div class="card prepa-card">
              <div class="card-head"><Trophy :size="18" /><h3>Préparer un examen</h3></div>
              <div v-if="prepaState === 'idle'">
                <p class="muted">Un programme ciblé sur les points faibles de {{ activeEnfant.firstName }}.</p>
                <button class="btn btn-outline" @click="getPrepa"><Trophy :size="16" /> <span>Construire le programme</span></button>
              </div>
              <div v-else-if="prepaState === 'loading'" class="loading"><Loader2 :size="32" class="spin" /><p>MIAPO construit le programme…</p></div>
              <div v-else-if="prepaState === 'done' && prepaResult" class="prepa-result">
                <div class="vr-head"><span class="vr-mat">{{ prepaResult.examen || 'Programme' }}</span><span class="ia-badge"><Sparkles :size="12" /> MIAPO</span></div>
                <div class="prepa-plan">
                  <div v-for="(s, i) in prepaResult.plan" :key="i" class="etape">
                    <div class="etape-head"><span class="etape-num">{{ i + 1 }}</span><strong>{{ s.etape }}</strong></div>
                    <p v-if="s.objectif" class="etape-obj">{{ s.objectif }}</p>
                    <ul v-if="s.actions.length" class="etape-actions"><li v-for="(a, j) in s.actions" :key="j">{{ a }}</li></ul>
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" @click="prepaState = 'idle'">Régénérer</button>
              </div>
              <div v-else-if="prepaState === 'error'" class="err"><p>{{ prepaError }}</p><button class="btn btn-outline btn-sm" @click="prepaState = 'idle'">Réessayer</button></div>
            </div>
          </template>
        </section>

        <!-- ========== PROGRESSION ========== -->
        <section v-else-if="section === 'progression'" class="sec">
          <div class="card">
            <div class="card-head"><TrendingUp :size="18" /><h3>Niveau par matière</h3></div>
            <p class="muted">Le niveau monte (1 → 5) quand {{ activeEnfant.firstName }} réussit les révisions. C'est le suivi dans la durée.</p>
            <div v-if="progression.length" class="prog-list">
              <div v-for="p in progression" :key="p.matiere" class="prog-row">
                <span class="prog-mat">{{ p.matiere }}</span>
                <span class="prog-dots"><span v-for="i in 5" :key="i" class="dot" :class="{ on: i <= p.level }"></span></span>
                <span class="prog-lv">Niv. {{ p.level }}</span>
              </div>
            </div>
            <p v-else class="muted">{{ isApprenant ? 'Lance des' : 'Demandez des' }} révisions dans <button class="lnk" @click="section = 'tuteur'">Tuteur</button> pour voir la progression apparaître ici.</p>
          </div>

          <div v-if="activeEnfant.notes.length" class="card">
            <div class="card-head"><FileText :size="18" /><h3>Aperçu des notes</h3></div>
            <div class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}</span><span class="nr-note" :class="noteClass(n.note)">{{ n.note }}/20</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ========== ORIENTATION ========== -->
        <section v-else-if="section === 'orientation'" class="sec">
          <MiapoOrientation :enfant="activeEnfant" />
        </section>

        <!-- ========== ABONNEMENT ========== -->
        <section v-else-if="section === 'abonnement'" class="sec">
          <div class="card abo-card">
            <div class="abo-ic"><Sparkles :size="24" /></div>
            <h2>MIAPO+ — l'accompagnement complet</h2>
            <p>Suivi continu, cours particuliers à la maison, lecture des copies et orientation : MIAPO {{ isApprenant ? "t'accompagne" : 'accompagne ' + activeEnfant.firstName }} comme un professeur particulier.</p>
            <ul class="abo-feats">
              <li><Check :size="15" /> Révisions adaptées et progressives</li>
              <li><Check :size="15" /> Lecture des copies + suivi dans la durée</li>
              <li><Check :size="15" /> Orientation argumentée, adaptée au pays</li>
            </ul>
            <div class="abo-trial">
              <Sparkles :size="16" />
              <span>Période d'essai gratuite en cours — {{ isApprenant ? 'profites-en pour progresser' : 'profitez-en pour accompagner ' + activeEnfant.firstName }}.</span>
            </div>
          </div>
        </section>

        <!-- ========== PROFIL (configuration) ========== -->
        <section v-else-if="section === 'profil'" class="sec">
          <!-- Profil du PARENT (mode parent) — d'abord -->
          <div v-if="!isApprenant" class="card">
            <div class="card-head"><Settings :size="18" /><h3>Mon profil (parent)</h3></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Prénom</label><input v-model="parentProfil.firstName" class="input" /></div>
              <div class="form-group"><label class="form-label">Nom</label><input v-model="parentProfil.lastName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Email</label><input :value="parentProfil.email" class="input" disabled /></div>
              <div class="form-group"><label class="form-label">Téléphone</label><input v-model="parentProfil.phone" class="input" type="tel" placeholder="+237 6XX XXX XXX" /></div>
            </div>
            <div class="compose-actions">
              <button class="btn btn-primary" @click="saveParentProfil"><Check :size="16" /> <span>Enregistrer</span></button>
              <span v-if="parentSaved" class="muted small saved-ok">Enregistré ✓</span>
            </div>
          </div>

          <!-- Profil de l'ENFANT rattaché (ou de l'apprenant lui-même) — en dessous -->
          <div class="card">
            <div class="card-head"><Settings :size="18" /><h3>{{ isApprenant ? 'Mon profil' : 'Profil de ' + activeEnfant.firstName + ' — enfant rattaché' }}</h3></div>
            <div class="profil-photo">
              <span class="er-avatar pp-avatar" :class="profil.gender === 'F' ? 'av-f' : 'av-m'">
                <img v-if="profil.photoURL" :src="profil.photoURL" alt="" />
                <template v-else>{{ (profil.firstName[0] || '') + (profil.lastName[0] || '') }}</template>
              </span>
              <label class="btn btn-outline btn-sm"><Camera :size="15" /> <span>Changer la photo</span><input type="file" accept="image/*" style="display:none" @change="onPickPhoto" /></label>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Prénom</label><input v-model="profil.firstName" class="input" /></div>
              <div class="form-group"><label class="form-label">Nom</label><input v-model="profil.lastName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Niveau</label><select v-model="profil.cycle" class="input"><option value="">—</option><option value="primaire">Primaire</option><option value="secondaire">Secondaire</option><option value="superieur">Supérieur</option></select></div>
              <div class="form-group"><label class="form-label">Classe</label><select v-model="profil.niveau" class="input"><option v-for="n in NIVEAUX" :key="n" :value="n">{{ n }}</option><option :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
            </div>
            <template v-if="profil.niveau === NIVEAU_HORS_CATALOGUE">
              <div class="form-row">
                <div class="form-group"><label class="form-label">Nom de la formation</label><input v-model="profil.formation" class="input" placeholder="Ex : Executive MBA — IRIIG" /></div>
                <div class="form-group"><label class="form-label">URL du programme <span class="muted small">(optionnel)</span></label><input v-model="profil.formationUrl" class="input" type="url" placeholder="https://… page de la formation" /></div>
              </div>
              <div class="form-group"><label class="form-label">Modules / matières <span class="muted small">(séparés par des virgules)</span></label><textarea v-model="profil.formationModules" class="input" rows="2" placeholder="Ex : Stratégie, Finance, Leadership, Marketing…"></textarea></div>
            </template>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Pays</label><select v-model="profil.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select></div>
              <div class="form-group"><label class="form-label">École</label><input v-model="profil.ecole" class="input" placeholder="Nom de l'établissement" /></div>
            </div>
            <div class="compose-actions">
              <button class="btn btn-primary" @click="saveProfil"><Check :size="16" /> <span>Enregistrer</span></button>
              <span v-if="profilSaved" class="muted small saved-ok">Enregistré ✓</span>
            </div>
          </div>
        </section>
      </template>
    </main>

    <!-- Modal ajout enfant -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-card">
        <div class="modal-header"><h3>{{ isApprenant ? 'Créer mon profil' : 'Ajouter mon enfant' }}</h3><button class="btn btn-ghost btn-sm" @click="showAdd = false"><X :size="18" /></button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Prénom</label><input v-model="form.firstName" class="input" placeholder="Prénom" /></div>
            <div class="form-group"><label class="form-label">Nom</label><input v-model="form.lastName" class="input" placeholder="Nom" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Sexe</label><select v-model="form.gender" class="input"><option value="M">Garçon</option><option value="F">Fille</option></select></div>
            <div class="form-group"><label class="form-label">Classe</label><select v-model="form.niveau" class="input"><option v-for="n in NIVEAUX" :key="n" :value="n">{{ n }}</option><option :value="NIVEAU_HORS_CATALOGUE">{{ NIVEAU_HORS_CATALOGUE }}</option></select></div>
          </div>
          <template v-if="form.niveau === NIVEAU_HORS_CATALOGUE">
            <div class="form-group"><label class="form-label">Nom de la formation</label><input v-model="form.formation" class="input" placeholder="Ex : Executive MBA — IRIIG" /></div>
            <div class="form-group"><label class="form-label">URL du programme <span class="muted small">(optionnel)</span></label><input v-model="form.formationUrl" class="input" type="url" placeholder="https://… page de la formation" /></div>
            <div class="form-group"><label class="form-label">Modules / matières <span class="muted small">(séparés par des virgules)</span></label><textarea v-model="form.formationModules" class="input" rows="2" placeholder="Ex : Stratégie, Finance, Leadership…"></textarea></div>
          </template>
          <div class="form-group"><label class="form-label">Pays</label><select v-model="form.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select></div>
          <div class="compose-actions">
            <button class="btn btn-outline" @click="showAdd = false">Annuler</button>
            <button class="btn btn-primary" :disabled="!form.firstName.trim()" @click="doAdd"><Check :size="16" /> <span>Créer le profil</span></button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore, NIVEAUX, NIVEAU_HORS_CATALOGUE, PAYS, MATIERES } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'
import { isMiapoTenant } from '../utils/tenantContext'
import TuteurQuiz from '../components/TuteurQuiz.vue'
import MiapoOrientation from '../components/MiapoOrientation.vue'
import Radar6C from '../components/Radar6C.vue'
import { Sparkles, Plus, X, Check, Target, FileText, ChevronRight, Trash2, Camera, Loader2, Lightbulb, Compass, GraduationCap, Trophy, Users, TrendingUp, Home, CreditCard, LogOut, Settings } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
async function logout() { await authStore.logout(); router.push(isMiapoTenant() ? '/miapo' : '/login') }

const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()
const enfants = computed(() => store.enfants)

// Mode apprenant : MIAPO+ vu par l'apprenant lui-même (langage 1re/2e personne,
// profil unique = lui) plutôt que par un parent qui suit ses enfants. Même moteur.
const isApprenant = computed(() => store.mode === 'apprenant')
function setMode(m) { store.setMode(m) }

const SECTIONS = computed(() => [
  { key: 'accueil', label: 'Accueil', icon: Home },
  { key: 'enfants', label: isApprenant.value ? 'Mes notes' : 'Mes enfants', icon: isApprenant.value ? FileText : Users },
  { key: 'tuteur', label: 'Tuteur', icon: GraduationCap },
  { key: 'progression', label: 'Progression', icon: TrendingUp },
  { key: 'orientation', label: 'Orientation', icon: Compass },
  { key: 'abonnement', label: 'Abonnement', icon: CreditCard },
  { key: 'profil', label: 'Profil', icon: Settings },
])
const section = ref('accueil')
// Menu hamburger coulissant (mobile) — piloté par le bouton ⊞ de l'en-tête (AppLayout)
const menuOpen = ref(false)
function onToggleMenu() { menuOpen.value = !menuOpen.value }
const currentSection = computed(() => SECTIONS.value.find((s) => s.key === section.value) || SECTIONS.value[0])

// Libellés selon le mode (parent vs apprenant)
const L = computed(() => isApprenant.value ? {
  brandSub: 'Ton coach de révision',
  introTitle: 'Pilote ton apprentissage avec MIAPO',
  introText: "Saisis tes notes (ou photographie tes copies) : MIAPO repère tes points faibles, te propose des révisions adaptées et t'accompagne dans ton orientation.",
  introBtn: 'Créer mon profil',
} : {
  brandSub: 'Suivi & cours à la maison',
  introTitle: 'Confiez le suivi de votre enfant à MIAPO',
  introText: "Ajoutez votre enfant, saisissez ses notes (ou photographiez ses copies) : MIAPO repère ses points faibles, lui propose des révisions adaptées et l'accompagne dans son orientation.",
  introBtn: 'Ajouter mon enfant',
})

const activeId = ref('')
const activeEnfant = computed(() => store.getEnfant(activeId.value) || enfants.value[0] || null)
const initials = computed(() => activeEnfant.value ? (activeEnfant.value.firstName[0] || '') + (activeEnfant.value.lastName[0] || '') : '')

// ── Profil (configuration : nom, photo, cycle, classe, pays, école) ──
const profil = ref({ firstName: '', lastName: '', gender: 'M', cycle: '', niveau: '3ème', pays: 'CM', ecole: '', formation: '', formationUrl: '', formationModules: '', photoURL: '' })
const profilSaved = ref(false)
function syncProfil() {
  const e = activeEnfant.value
  if (!e) return
  profil.value = {
    firstName: e.firstName || '', lastName: e.lastName || '', gender: e.gender || 'M',
    cycle: e.cycle || '', niveau: e.niveau || '3ème', pays: e.pays || 'CM',
    ecole: e.ecole || '', formation: e.formation || '', formationUrl: e.formationUrl || '', formationModules: e.formationModules || '', photoURL: e.photoURL || '',
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
const form = ref({ firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM', formation: '', formationUrl: '', formationModules: '' })

const newMatiere = ref('')
const newNote = ref(null)
const canAddNote = computed(() => newMatiere.value && newNote.value !== null && newNote.value !== '' && !Number.isNaN(Number(newNote.value)))

function paysLabel(code) { return PAYS.find((p) => p.code === code)?.label || code }
// Affiche le NOM de la formation pour un apprenant hors-catalogue (sinon la classe).
function niveauLabel(e) {
  if (!e) return ''
  return e.niveau === NIVEAU_HORS_CATALOGUE ? (e.formation || NIVEAU_HORS_CATALOGUE) : e.niveau
}
function noteClass(n) { return n < 10 ? 'low' : n < 12 ? 'mid' : 'ok' }
function levelFor(matiere) { return activeEnfant.value ? tuteur.getLevel(activeEnfant.value.id, 'auto-' + matiere) : 1 }

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
  for (const m of MATIERES) { if (tuteur.getLevel(e.id, 'auto-' + m) > 1) mats.add(m) }
  return [...mats].map((m) => ({ matiere: m, level: levelFor(m) })).sort((a, b) => b.level - a.level)
})

const insight = computed(() => {
  const e = activeEnfant.value
  if (!e) return ''
  const ap = isApprenant.value
  if (!e.notes.length) return ap
    ? `Saisis tes notes (ou photographie tes copies) : MIAPO repèrera tes points faibles et te proposera des révisions adaptées à la ${e.niveau}.`
    : `Saisissez les notes de ${e.firstName} (ou photographiez ses copies) : MIAPO repèrera ses points faibles et lui proposera des révisions adaptées à la ${e.niveau}.`
  const f = faiblesses.value
  if (!f.length) return ap
    ? `Bon niveau d'ensemble ! Continue les révisions régulières pour consolider.`
    : `Bon niveau d'ensemble pour ${e.firstName} ! Continuez les révisions régulières pour consolider.`
  const noms = f.slice(0, 2).map((x) => x.matiere)
  const m = noms.length === 2 ? `${noms[0]} et ${noms[1]}` : noms[0]
  return ap
    ? `MIAPO a repéré des difficultés en ${m}. Lance une révision ciblée — tu progresseras plus vite sur tes points faibles.`
    : `MIAPO a repéré des difficultés en ${m}. Désignez ces matières à réviser — ${e.firstName} progressera plus vite sur ses points faibles.`
})

function openAdd() { form.value = { firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM', formation: '', formationUrl: '', formationModules: '' }; showAdd.value = true }
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
  if (confirm(`Retirer le profil de ${activeEnfant.value.firstName} ?`)) {
    store.removeEnfant(activeEnfant.value.id)
    activeId.value = enfants.value[0]?.id || ''
  }
}

// ── Lecture de copie (vision) ──────────────────────────────────────────
const visionState = ref('idle')
const visionResult = ref(null)
const visionError = ref('')
function resetVision() { visionState.value = 'idle'; visionResult.value = null; visionError.value = '' }
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
    else { visionError.value = res.reason || 'Lecture impossible.'; visionState.value = 'error' }
  } catch { visionError.value = 'Image illisible. Réessayez avec une photo plus nette.'; visionState.value = 'error' }
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
  const faibles = e.notes.filter((n) => n.note < 10).map((n) => n.matiere)
  const res = await tuteur.prepaExamen({ niveau: e.niveau, pays: e.pays, faibles })
  if (res.ok && res.prepa) { prepaResult.value = res.prepa; prepaState.value = 'done' }
  else { prepaError.value = res.reason || 'Préparation indisponible.'; prepaState.value = 'error' }
}

onMounted(async () => {
  await store.hydrate()
  activeId.value = enfants.value[0]?.id || ''
  window.addEventListener('miapo-toggle-menu', onToggleMenu)
})
onUnmounted(() => window.removeEventListener('miapo-toggle-menu', onToggleMenu))
</script>

<style scoped>
.miapo-shell { display: flex; align-items: flex-start; gap: 0; min-height: 100%; }

/* ───────── Volet menu ───────── */
/* Menu figé : il reste en place (sticky pleine hauteur), seul le contenu défile. */
.volet { width: 224px; flex-shrink: 0; align-self: flex-start; border-right: 1px solid var(--bd, #e5e7eb); padding: 18px 14px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.volet-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
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
.volet-logout { margin-top: auto; display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; color: var(--tx3, #6b7280); width: 100%; text-align: left; }
.volet-logout:hover { background: rgba(217,48,37,.07); color: #D93025; }
.nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; color: var(--tx2, #4b5563); text-align: left; width: 100%; }
.nav-item:hover { background: var(--input-bg, #f1f3f5); }
.nav-item.active { background: rgba(var(--pr-rgb,21,88,176),.10); color: var(--pr, #1558B0); font-weight: 600; }

/* ───────── Main ───────── */
.miapo-main { flex: 1; min-width: 0; padding: 22px 26px; max-width: 760px; }
.main-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.main-head h1 { font-size: 23px; font-weight: 700; margin: 0; }
.sec { display: flex; flex-direction: column; gap: 16px; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
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

.vision-card { border-left: 3px solid var(--pr); } .vision-btn { cursor: pointer; }
.loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; text-align: center; } .loading p { margin: 0; font-size: 14px; } .loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); } @keyframes spin { to { transform: rotate(360deg); } }
.vision-result { display: flex; flex-direction: column; gap: 12px; }
.vr-head { display: flex; align-items: center; justify-content: space-between; } .vr-mat { font-weight: 700; font-size: 16px; color: var(--tx); }
.vr-note { font-weight: 700; font-size: 13px; padding: 3px 10px; border-radius: 20px; }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }
.reco-lab { font-size: 11px; font-weight: 600; color: var(--tx2); text-transform: uppercase; letter-spacing: .3px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; } .chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; }
.chip-w { color: #B3261E; background: rgba(217,48,37,.07); }
.reco-conseil { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); padding: 10px 12px; border-radius: 10px; line-height: 1.5; }
.vr-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.err p { color: #D93025; font-size: 14px; margin: 0 0 10px; }

.prepa-card { border-left: 3px solid #E8953A; }
.prepa-result { display: flex; flex-direction: column; gap: 12px; }
.prepa-plan { display: flex; flex-direction: column; gap: 10px; }
.etape { border: 1px solid var(--bd); border-radius: 12px; padding: 13px 15px; }
.etape-head { display: flex; align-items: center; gap: 10px; } .etape-num { width: 26px; height: 26px; border-radius: 50%; background: #E8953A; color: #fff; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; } .etape-head strong { font-size: 15px; color: var(--tx); }
.etape-obj { margin: 8px 0; font-size: 13px; color: var(--tx2); line-height: 1.5; } .etape-actions { margin: 0; padding-left: 18px; } .etape-actions li { font-size: 13px; color: var(--tx2); line-height: 1.6; }

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
