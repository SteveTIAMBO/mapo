<template>
  <div class="orient">
    <!-- Parcours « Autres » : orientation scolaire désactivée -->
    <div v-if="horsCatalogue" class="card orient-off">
      <div class="step-head"><Compass :size="18" /><h3>{{ t('mia.oriOffTitle') }}</h3></div>
      <p class="muted">{{ t('mia.oriOffBody') }}</p>
    </div>

    <template v-else>
    <!-- En-tête + rappel de la méthode (3 temps) -->
    <div class="orient-intro">
      <p class="muted">{{ tOri('oriIntro', { name: enfant.firstName }) }}</p>
    </div>

    <!-- ÉTAPE 1 — Profil 6C -->
    <div class="card step-card">
      <div class="step-head">
        <span class="step-num">1</span>
        <h3>{{ tOri('oriProfileOf', { name: enfant.firstName }) }} <span class="six-c">{{ t('mia.ori6cBadge') }}</span></h3>
        <span v-if="hasEval && !editing" class="done-pill"><Check :size="13" /> {{ t('mia.oriEvaluated') }}</span>
      </div>

      <template v-if="!hasEval">
        <p class="muted small">{{ t('mia.oriS1Hint') }}</p>
        <button class="btn btn-primary btn-sm" @click="emit('eval')"><Target :size="15" /> <span>{{ t('mia.oriS1Cta') }}</span></button>
      </template>

      <template v-else>
        <Radar6C :scores="enfant.comp6c || {}" />
        <div class="interets-box">
          <p class="int-lab">{{ tOri('oriInteretsLabel', { name: enfant.firstName }) }}</p>
          <div class="int-chips">
            <button v-for="it in INTERETS_ORIENTATION" :key="it.key" type="button" class="int-chip" :class="{ on: interets.includes(it.key) }" @click="toggleInteret(it.key)">
              {{ locale === 'en' ? (it.label_en || it.label) : it.label }}
            </button>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm refaire" @click="emit('eval')"><Sliders :size="14" /> <span>{{ t('mia.oriS1Redo') }}</span></button>
      </template>
    </div>

    <!-- ÉTAPE 2 — Destination -->
    <div class="card step-card" :class="{ disabled: !hasEval }">
      <div class="step-head">
        <span class="step-num">2</span>
        <h3>{{ t('mia.oriS2Title') }}</h3>
      </div>
      <p class="muted small">{{ t('mia.oriS2Hint') }}</p>
      <div v-if="!paysCouvert" class="pays-note">
        <Info :size="16" />
        <p>{{ tOri('oriPaysNote', { name: enfant.firstName, pays: paysEnfantLabel || t('mia.oriUnspecified') }) }}</p>
      </div>
      <div class="pays-pick">
        <button v-for="p in PAYS_ORIENTATION" :key="p.code" class="pays-btn" :class="{ active: pays === p.code }" :disabled="!hasEval" @click="selectPays(p.code)">
          <Globe v-if="p.code === 'france'" :size="16" /><MapPin v-else :size="16" />
          <span>{{ locale === 'en' ? (p.label_en || p.label) : p.label }}</span>
        </button>
      </div>
    </div>

    <!-- ÉTAPE 3 — Suggestions argumentées -->
    <div class="card step-card" :class="{ disabled: !hasEval }">
      <div class="step-head">
        <span class="step-num">3</span>
        <h3>{{ t('mia.oriS3Title') }}</h3>
        <span class="ia-badge"><MiapoOrbe :size="14" frozen /> MIAPO</span>
      </div>

      <div v-if="state === 'idle'">
        <p class="muted small">{{ tOri('oriS3Idle', { name: enfant.firstName, niveau: enfant.niveau, pays: paysLabel }) }}</p>
        <button class="btn btn-primary" :disabled="!hasEval" @click="getSuggestions"><Compass :size="16" /> <span>{{ t('mia.oriGet', { pays: paysLabel }) }}</span></button>
      </div>

      <div v-else-if="state === 'loading'" class="loading">
        <Loader2 :size="32" class="spin" /><p>{{ t('mia.oriAnalyzing') }}</p><small>{{ t('mia.oriFewSec') }}</small>
      </div>

      <div v-else-if="state === 'done' && result" class="reco">
        <p class="reco-disclaimer"><Info :size="15" /> {{ t('mia.oriDisclaimer') }}</p>
        <p v-if="result.profil" class="reco-profil">{{ result.profil }}</p>
        <div v-for="(r, i) in result.recommandations" :key="i" class="reco-card">
          <div class="reco-head">
            <GraduationCap :size="17" />
            <strong>{{ r.domaine }}</strong>
            <span class="adq" :class="r.adequation === 'forte' ? 'adq-h' : 'adq-m'">{{ r.adequation === 'forte' ? t('mia.oriAdqStrong') : t('mia.oriAdqMed') }}</span>
          </div>
          <p class="reco-why">{{ r.pourquoi }}</p>
          <div v-if="pays === 'france' && insertionFrParNom(r.domaine)" class="reco-insertion">
            <TrendingUp :size="13" />
            <span>{{ t('mia.oriInsertion', { taux: insertionFrParNom(r.domaine).taux, salaire: insertionFrParNom(r.domaine).salaire }) }}<template v-if="insertionFrParNom(r.domaine).tension === 'forte'"> · <strong>{{ t('mia.oriTension') }}</strong></template></span>
          </div>
          <div v-if="r.metiers_cles.length" class="reco-block">
            <span class="reco-lab">{{ t('mia.oriJobs') }}</span>
            <div class="chips"><span v-for="(m, j) in r.metiers_cles" :key="j" class="chip chip-m">{{ m }}</span></div>
          </div>
          <div v-if="r.etablissements_cles.length" class="reco-block">
            <span class="reco-lab">{{ t('mia.oriWhere') }}</span>
            <div class="chips"><span v-for="(e, j) in r.etablissements_cles" :key="j" class="chip chip-e">{{ e }}</span></div>
          </div>
        </div>
        <p v-if="result.conseil" class="reco-conseil"><Lightbulb :size="15" /> {{ result.conseil }}</p>
        <p v-if="result.prudence" class="reco-prudence">{{ result.prudence }}</p>

        <!-- Pont mobilité → Mobi (pour ceux qui visent la France depuis l'étranger) -->
        <div v-if="pays === 'france' && enfant.pays !== 'FR'" class="mobi-bridge">
          <div class="mobi-ic"><Plane :size="20" /></div>
          <div class="mobi-txt">
            <strong>{{ t('mia.oriMobiTitle') }}</strong>
            <p>{{ tOri('oriMobiText', { name: enfant.firstName }) }}</p>
          </div>
          <a class="btn btn-primary btn-sm mobi-cta" href="https://mobi.app-edufrem.com" target="_blank" rel="noopener"><span>{{ t('mia.oriMobiCta') }}</span><ArrowRight :size="15" /></a>
        </div>

        <div class="reco-foot">
          <span class="src-note">{{ t('mia.oriSrcNote') }}</span>
          <button class="btn btn-ghost btn-sm" @click="state = 'idle'">{{ t('mia.regenerate') }}</button>
        </div>
      </div>

      <div v-else-if="state === 'error'" class="err">
        <p>{{ error }}</p><button class="btn btn-outline btn-sm" @click="state = 'idle'">{{ t('mia.retry') }}</button>
      </div>
    </div>

    <!-- DÉCOUVRIR LES MÉTIERS & PARCOURS ÉDUCATIF (débloqué : profil complet) -->
    <div class="card step-card metiers-card">
      <div class="step-head"><Route :size="18" /><h3>{{ t('mia.oriDiscTitle') }}</h3></div>

      <div v-if="!profilComplet" class="disc-gate">
        <Info :size="16" />
        <p>{{ t('mia.oriDiscGate') }}</p>
        <button v-if="!hasEval" class="btn btn-primary btn-sm" @click="emit('eval')"><Target :size="15" /> <span>{{ t('mia.oriDiscGateCta') }}</span></button>
      </div>

      <template v-else>
        <p class="muted small">{{ t('mia.oriDiscPick') }}</p>
        <div class="metiers-chips">
          <button v-for="m in metiersListe" :key="m.id" type="button" class="metier-chip" :class="{ on: metierSel === m.id }" @click="choisirMetier(m.id)">
            <Zap v-if="m.avenir" :size="12" class="mc-zap" /> {{ m.label }}
          </button>
        </div>

        <div v-if="metierSel && parcoursSel" class="parcours">
          <div class="parcours-head">
            <strong>{{ en2 ? parcoursSel.en : parcoursSel.fr }}</strong>
            <span v-if="parcoursSel.avenir" class="avenir-badge"><Zap :size="12" /> {{ t('mia.oriDiscFuture') }}</span>
          </div>
          <div class="parcours-meta">
            <span v-if="parcoursSel.serie" class="pm-item"><GraduationCap :size="13" /> {{ t('mia.oriDiscSerie') }} : <strong>{{ parcoursSel.serie }}</strong></span>
            <span v-if="parcoursSel.duree" class="pm-item"><Clock :size="13" /> {{ t('mia.oriDiscDuration') }} : {{ parcoursSel.duree }}</span>
          </div>
          <ol class="parcours-steps">
            <li v-for="(s, i) in parcoursSel.etapes" :key="i">{{ s }}</li>
          </ol>
          <p v-if="parcoursSel.note" class="parcours-note"><Info :size="13" /> {{ parcoursSel.note }}</p>
          <div v-if="parcoursSel.ecoles && parcoursSel.ecoles.length" class="parcours-block">
            <span class="reco-lab">{{ t('mia.oriDiscWhere') }}</span>
            <div class="chips"><span v-for="(ec, j) in parcoursSel.ecoles" :key="j" class="chip chip-e">{{ ec }}</span></div>
          </div>
          <div v-if="parcoursSel.alternatives && parcoursSel.alternatives.length" class="parcours-block">
            <span class="reco-lab">{{ t('mia.oriDiscAlt') }}</span>
            <div class="chips"><button v-for="alt in parcoursSel.alternatives" :key="alt" type="button" class="chip chip-alt" @click="choisirMetier(alt)">{{ labelMetier(alt) }}</button></div>
          </div>
          <div class="parcours-foot">
            <span class="maj"><CalendarClock :size="12" /> {{ t('mia.oriDiscUpdated') }} : {{ majParcours }}</span>
          </div>
        </div>
        <div v-else-if="metierSel && !parcoursSel" class="disc-uncovered">
          <Info :size="15" /> <p>{{ t('mia.oriDiscUncovered') }}</p>
        </div>

        <p class="disc-disclaimer">{{ t('mia.oriDiscDisclaimer') }}</p>
      </template>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMPETENCES_6C, PAYS_ORIENTATION, ORIENTATION, INTERETS_ORIENTATION, domaineMatchInterets, interetsLabels, INSERTION_FR, insertionFrParNom } from '../data/orientation'
import { listeMetiers, parcoursMetier, MAJ_PARCOURS, PARCOURS_PAYS } from '../data/parcours'
import { ageDe } from '../utils/ageProfil'
import { useEnfantsAutonomesStore, PAYS, NIVEAU_HORS_CATALOGUE } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'
import { Sparkles, Check, Compass, GraduationCap, Loader2, Lightbulb, Globe, MapPin, Plane, ArrowRight, Sliders, Info, Target, TrendingUp, Zap, Route, Clock, CalendarClock } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'
import Radar6C from './Radar6C.vue'

const props = defineProps({ enfant: { type: Object, required: true } })
const emit = defineEmits(['eval'])
const { t, locale } = useI18n({ useScope: 'global' })

const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()

// Voix MIAPO : l'élève/apprenant est tutoyé directement (variantes *Self) ;
// en mode parent, MIAPO parle de l'enfant (on cite son prénom).
const isLearner = computed(() => store.mode === 'apprenant' || store.isCompteEnfant)
const tOri = (base, params) => t(isLearner.value ? `mia.${base}Self` : `mia.${base}`, params)

// Scores 6C locaux (init depuis le profil enregistré, sinon 3 par défaut).
const scores = ref({})
const editing = ref(false)
function initScores() {
  const saved = props.enfant.comp6c || {}
  const s = {}
  for (const c of COMPETENCES_6C) s[c.key] = saved[c.key] || 3
  scores.value = s
}
initScores()

// Centres d'intérêt / passions (« ce qui te passionne à l'instant T ») — alimente le matching.
const interets = ref([...(props.enfant.interets || [])])
function toggleInteret(k) {
  const i = interets.value.indexOf(k)
  if (i >= 0) interets.value.splice(i, 1); else interets.value.push(k)
  store.setInterets(props.enfant.id, interets.value)
  if (state.value === 'done') { state.value = 'idle'; result.value = null } // le profil a changé
}

const hasEval = computed(() => !!props.enfant.comp6c && Object.keys(props.enfant.comp6c).length >= 6)
// Parcours « Autres » (hors-catalogue) : l'orientation par filières scolaires ne
// s'applique pas → on la désactive et on renvoie (à terme) vers l'insertion pro.
const horsCatalogue = computed(() => props.enfant.niveau === NIVEAU_HORS_CATALOGUE)
// Découverte des métiers débloquée seulement si le PROFIL est complet :
// compétences évaluées ET au moins un centre d'intérêt (ou des passions saisies).
const profilComplet = computed(() => hasEval.value && (interets.value.length > 0 || !!(props.enfant.passions || '').trim()))

// ── Découverte métiers & PARCOURS ÉDUCATIF (sourcé, par pays) ─────────────
const en2 = computed(() => locale.value.startsWith('en'))
const metiersListe = computed(() => listeMetiers(en2.value))
const metierSel = ref('')
const paysApprenantCouvert = computed(() => !!PARCOURS_PAYS[props.enfant.pays])
const parcoursSel = computed(() => (metierSel.value ? parcoursMetier(metierSel.value, props.enfant.pays) : null))
const majParcours = MAJ_PARCOURS
function labelMetier(id) {
  const m = (metiersListe.value || []).find((x) => x.id === id)
  return m ? m.label : id
}
function choisirMetier(id) { metierSel.value = metierSel.value === id ? '' : id }
const sorted6c = computed(() => {
  const sv = props.enfant.comp6c || {}
  return COMPETENCES_6C.map((c) => ({ key: c.key, label: c.label, val: sv[c.key] || 0 })).sort((a, b) => b.val - a.val)
})

// Quand on change d'enfant, on réinitialise tout.
watch(() => props.enfant.id, () => { initScores(); interets.value = [...(props.enfant.interets || [])]; editing.value = false; state.value = 'idle'; result.value = null; pays.value = defaultPays() })

function startEdit() { initScores(); editing.value = true }
function saveEval() {
  store.setComp6c(props.enfant.id, scores.value)
  editing.value = false
}

// ── Destination ───────────────────────────────────────────────────────
// Code pays de l'enfant (CM/SN/CI/GA/autre) → clé du référentiel d'orientation.
// Aujourd'hui seul le Cameroun a un référentiel LOCAL complet ; la France est la
// destination « internationale ». Les autres pays n'ont pas encore de référentiel
// dédié : on l'affiche honnêtement (jamais de Cameroun déguisé en pays de l'enfant).
const REFERENTIEL_PAR_PAYS = { CM: 'cameroun', FR: 'france' }
const paysEnfantLabel = computed(() => PAYS.find((p) => p.code === props.enfant.pays)?.label || '')
const paysCouvert = computed(() => !!REFERENTIEL_PAR_PAYS[props.enfant.pays])
function defaultPays() { return REFERENTIEL_PAR_PAYS[props.enfant.pays] || 'cameroun' }
const pays = ref(defaultPays())
const paysLabel = computed(() => {
  const p = PAYS_ORIENTATION.find((x) => x.code === pays.value)
  if (!p) return 'Cameroun'
  return locale.value === 'en' ? (p.label_en || p.label) : p.label
})
function selectPays(code) { pays.value = code; state.value = 'idle'; result.value = null }

// ── Matching front : on classe les domaines RÉELS par adéquation au profil 6C ─
// (somme des scores des compétences taggées sur le domaine). Aucune invention :
// l'IA n'argumentera ensuite que sur ces candidats. Économe en tokens (1 appel).
function topCandidats() {
  const sv = props.enfant.comp6c || {}
  const domaines = (ORIENTATION[pays.value]?.domaines) || []
  const scored = domaines.map((d) => {
    // Score = adéquation 6C (somme des compétences taggées) + bonus « passion » si
    // le domaine correspond à un centre d'intérêt choisi par l'élève.
    const score = (d.competences || []).reduce((acc, k) => acc + (sv[k] || 0), 0)
      + (domaineMatchInterets(d.domaine, interets.value) ? 6 : 0)
    const metiers = pays.value === 'france'
      ? (d.metiers || []).map((m) => (typeof m === 'string' ? m : m.metier)).filter(Boolean)
      : (d.metiers || [])
    const etablissements = pays.value === 'france'
      ? (d.ecoles || []).map((e) => e.nom + (e.ville ? ` (${e.ville})` : ''))
      : (d.etablissements || [])
    const insertion = pays.value === 'france' ? (INSERTION_FR[d.id] || null) : null
    return { domaine: d.domaine, competences: d.competences || [], metiers, etablissements, insertion, _score: score }
  })
  scored.sort((a, b) => b._score - a._score)
  return scored.slice(0, 5).map(({ _score, ...c }) => c)
}

// ── Appel IA (argumentation fondée) ─────────────────────────────────────
const state = ref('idle') // idle | loading | done | error
const result = ref(null)
const error = ref('')

async function getSuggestions() {
  if (!hasEval.value) return
  state.value = 'loading'
  const e = props.enfant
  const forts = (e.notes || []).filter((n) => n.note >= 12).map((n) => n.matiere)
  const faibles = (e.notes || []).filter((n) => n.note < 10).map((n) => n.matiere)
  const res = await tuteur.orientation6c({
    niveau: e.niveau,
    pays: paysLabel.value,
    competences: e.comp6c || {},
    forts, faibles,
    interets: interetsLabels(interets.value, locale.value === 'en'),
    candidats: topCandidats(),
    passions: e.passions || '',
    metiers: e.metiersVises || '',
    age: ageDe(e),
    langue: locale.value === 'en' ? 'en' : 'fr',
  })
  if (res.ok && res.result && res.result.recommandations.length) {
    result.value = res.result
    state.value = 'done'
  } else {
    error.value = res.reason || 'Orientation indisponible pour le moment.'
    state.value = 'error'
  }
}
</script>

<style scoped>
.orient { display: flex; flex-direction: column; gap: 16px; }
.orient-intro .muted { font-size: 13.5px; line-height: 1.6; }
.muted { color: var(--tx3, #6b7280); margin: 0; }
.small { font-size: 13px; margin: 0 0 12px; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.step-card.disabled { opacity: .55; }
.step-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--pr, #1558B0); color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-head h3 { font-size: 16px; font-weight: 600; margin: 0; flex: 1; }
.six-c { font-size: 11px; font-weight: 700; color: #7c3aed; background: rgba(139,92,246,.12); padding: 2px 8px; border-radius: 20px; margin-left: 6px; }
.done-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #1B8A5A; background: rgba(27,138,90,.10); padding: 3px 9px; border-radius: 20px; }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }

/* 6C sliders */
.c-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
.c-row { }
.c-top { display: flex; align-items: center; justify-content: space-between; }
.c-label { font-weight: 600; font-size: 14.5px; color: var(--tx, #1f2937); }
.c-val { font-weight: 700; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 2px 9px; border-radius: 20px; }
.c-q { margin: 3px 0 8px; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.4; }
.c-range { width: 100%; accent-color: var(--pr, #1558B0); height: 6px; cursor: pointer; }
.step-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* Récap profil */
.profil-recap { display: flex; flex-direction: column; gap: 9px; margin: 10px 0 6px; }
.pr-row { display: flex; align-items: center; gap: 10px; }
.pr-label { width: 110px; font-size: 13px; color: var(--tx, #1f2937); flex-shrink: 0; }
.pr-bar { flex: 1; height: 8px; border-radius: 6px; background: var(--input-bg, #eef1f4); overflow: hidden; }
.pr-fill { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--pr, #1558B0), #7c3aed); }
.pr-val { width: 18px; text-align: right; font-weight: 700; font-size: 13px; color: var(--tx2); }
.refaire { margin-top: 6px; }

/* Centres d'intérêt (passions) */
.interets-box { margin: 14px 0 4px; }
.int-lab { font-size: 13.5px; color: var(--tx2, #4b5563); margin: 0 0 9px; line-height: 1.45; }
.int-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.int-chip { font-size: 13px; padding: 7px 13px; border-radius: 20px; border: 1px solid var(--bd, #e5e7eb); background: #fff; color: var(--tx2, #4b5563); cursor: pointer; transition: all .12s; }
.int-chip:hover { border-color: var(--pr, #1558B0); }
.int-chip.on { border-color: var(--pr, #1558B0); background: rgba(var(--pr-rgb,21,88,176),.08); color: var(--pr, #1558B0); font-weight: 600; }

/* Destination */
.pays-pick { display: flex; gap: 10px; flex-wrap: wrap; }
.pays-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--tx2); }
.pays-btn.active { border-color: var(--pr); color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); }
.pays-btn:disabled { cursor: not-allowed; }
.pays-note { display: flex; gap: 9px; align-items: flex-start; padding: 10px 12px; margin-bottom: 12px; border-radius: 10px; background: rgba(232,149,10,.08); border: 1px solid rgba(232,149,10,.22); }
.pays-note svg { color: #B87A00; flex-shrink: 0; margin-top: 1px; }
.pays-note p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--tx2, #4b5563); }

/* Loading / erreur */
.loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; text-align: center; }
.loading p { margin: 0; font-size: 14px; } .loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }
.err p { color: #D93025; font-size: 14px; margin: 0 0 10px; }

/* Recommandations */
.reco { display: flex; flex-direction: column; gap: 12px; }
.reco-disclaimer {
  display: flex; align-items: flex-start; gap: 8px; margin: 0 0 4px;
  padding: 9px 12px; border-radius: 10px;
  background: rgba(var(--pr-rgb, 124,58,237), .07); border: 1px solid rgba(var(--pr-rgb, 124,58,237), .16);
  font-size: 12.5px; line-height: 1.45; color: var(--tx2, #4b5563);
}
.reco-disclaimer svg { color: var(--pr); flex-shrink: 0; margin-top: 1px; }
.reco-profil { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tx, #1f2937); }
.reco-card { border: 1px solid var(--bd); border-radius: 12px; padding: 14px 16px; }
.reco-head { display: flex; align-items: center; gap: 8px; color: #7c3aed; flex-wrap: wrap; }
.reco-head strong { font-size: 15px; color: var(--tx, #1f2937); flex: 1; }
.adq { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
.adq-h { color: #1B8A5A; background: rgba(27,138,90,.10); }
.adq-m { color: #B87A00; background: rgba(232,149,10,.12); }
.reco-why { margin: 8px 0 10px; font-size: 13.5px; color: var(--tx2, #4b5563); line-height: 1.55; }
.reco-insertion { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 12.5px; color: #1B8A5A; background: rgba(27,138,90,.08); padding: 6px 10px; border-radius: 8px; line-height: 1.4; }
.reco-insertion svg { flex-shrink: 0; }
.reco-insertion strong { color: #B87A00; font-weight: 700; }
.reco-block { margin-top: 8px; }
.reco-lab { font-size: 11px; font-weight: 600; color: var(--tx2); text-transform: uppercase; letter-spacing: .3px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; }
.chip-m { color: #6d28d9; background: rgba(139,92,246,.10); }
.chip-e { color: var(--tx2); background: var(--input-bg, #eef1f4); }
.reco-conseil { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); padding: 10px 12px; border-radius: 10px; line-height: 1.5; }
.reco-prudence { margin: 0; font-size: 12.5px; color: var(--tx3); font-style: italic; line-height: 1.5; }

/* Pont Mobi */
.mobi-bridge { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, rgba(21,88,176,.07), rgba(139,92,246,.09)); border: 1px solid rgba(var(--pr-rgb,21,88,176),.18); flex-wrap: wrap; }
.mobi-ic { width: 42px; height: 42px; border-radius: 12px; background: var(--pr, #1558B0); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mobi-txt { flex: 1; min-width: 200px; } .mobi-txt strong { font-size: 15px; color: var(--tx, #1f2937); } .mobi-txt p { margin: 4px 0 0; font-size: 13px; color: var(--tx2); line-height: 1.5; }
.mobi-cta { flex-shrink: 0; text-decoration: none; }

.reco-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.src-note { font-size: 12px; color: var(--tx3); }

/* Orientation désactivée (parcours « Autres ») */
.orient-off .step-head { color: var(--pr); }
.orient-off .muted { font-size: 13.5px; line-height: 1.6; }

/* Découverte métiers & parcours éducatif */
.metiers-card { }
.disc-gate { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(232,149,10,.08); border: 1px solid rgba(232,149,10,.22); }
.disc-gate svg { color: #B87A00; flex-shrink: 0; }
.disc-gate p { margin: 0; flex: 1; min-width: 180px; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; }
.metiers-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.metier-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; padding: 7px 13px; border-radius: 20px; border: 1px solid var(--bd, #e5e7eb); background: #fff; color: var(--tx2, #4b5563); cursor: pointer; transition: all .12s; }
.metier-chip:hover { border-color: var(--pr); }
.metier-chip.on { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.08); color: var(--pr); font-weight: 600; }
.mc-zap { color: #E8950A; }
.parcours { margin-top: 14px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 14px 16px; background: var(--input-bg, #f8f9fb); }
.parcours-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.parcours-head strong { font-size: 15.5px; color: var(--tx, #1f2937); }
.avenir-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #B87A00; background: rgba(232,149,10,.12); padding: 3px 9px; border-radius: 20px; }
.parcours-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 10px 0; }
.pm-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--tx2, #4b5563); }
.pm-item svg { color: var(--pr); }
.parcours-steps { margin: 8px 0 10px; padding-left: 20px; display: flex; flex-direction: column; gap: 7px; }
.parcours-steps li { font-size: 13.5px; color: var(--tx, #1f2937); line-height: 1.4; }
.parcours-steps li::marker { color: var(--pr); font-weight: 700; }
.parcours-note { display: flex; align-items: flex-start; gap: 6px; margin: 0 0 10px; font-size: 12.5px; color: var(--tx2, #4b5563); line-height: 1.5; }
.parcours-note svg { color: var(--pr); flex-shrink: 0; margin-top: 2px; }
.parcours-block { margin-top: 8px; }
.chip-alt { cursor: pointer; border: none; font-family: inherit; color: #6d28d9; background: rgba(139,92,246,.10); }
.chip-alt:hover { background: rgba(139,92,246,.2); }
.parcours-foot { margin-top: 10px; }
.maj { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--tx3, #9098a6); }
.disc-uncovered { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(var(--pr-rgb,21,88,176),.06); }
.disc-uncovered svg { color: var(--pr); flex-shrink: 0; margin-top: 1px; }
.disc-uncovered p { margin: 0; font-size: 12.5px; color: var(--tx2, #4b5563); line-height: 1.5; }
.disc-disclaimer { margin: 12px 0 0; font-size: 11.5px; color: var(--tx3, #9098a6); font-style: italic; line-height: 1.5; }

@media (max-width: 640px) {
  .card { padding: 15px 16px; }
  .pr-label { width: 92px; }
  .mobi-cta { width: 100%; justify-content: center; }
}
@media (max-width: 420px) {
  /* Profil 6C : libellé plus court pour laisser respirer la barre */
  .pr-label { width: 78px; font-size: 12px; }
  /* Choix du pays : boutons pleine largeur, empilés et tapables */
  .pays-pick { flex-direction: column; }
  .pays-btn { width: 100%; justify-content: center; padding: 12px 16px; }
}
</style>
