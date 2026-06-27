<template>
  <div class="orient">
    <!-- En-tête + rappel de la méthode (3 temps) -->
    <div class="orient-intro">
      <p class="muted">
        L'orientation de MIAPO se fait en 3 temps : <strong>1.</strong> on évalue le profil de
        {{ enfant.firstName }} (6 compétences), <strong>2.</strong> on le croise avec les filières et
        débouchés réels du pays, <strong>3.</strong> on propose des pistes argumentées — jamais au hasard.
      </p>
    </div>

    <!-- ÉTAPE 1 — Auto-évaluation 6C -->
    <div class="card step-card">
      <div class="step-head">
        <span class="step-num">1</span>
        <h3>Le profil de {{ enfant.firstName }} <span class="six-c">les 6C</span></h3>
        <span v-if="hasEval && !editing" class="done-pill"><Check :size="13" /> évalué</span>
      </div>

      <template v-if="!hasEval || editing">
        <p class="muted small">Pour chaque phrase, glissez de 1 (pas du tout) à 5 (tout à fait). Soyez honnête : c'est ce qui rend les pistes justes.</p>
        <div class="c-list">
          <div v-for="c in COMPETENCES_6C" :key="c.key" class="c-row">
            <div class="c-top">
              <span class="c-label">{{ c.label }}</span>
              <span class="c-val">{{ scores[c.key] }}/5</span>
            </div>
            <p class="c-q">{{ c.question }}</p>
            <input type="range" min="1" max="5" step="1" v-model.number="scores[c.key]" class="c-range" />
          </div>
        </div>
        <div class="step-actions">
          <button v-if="hasEval" class="btn btn-ghost btn-sm" @click="editing = false">Annuler</button>
          <button class="btn btn-primary btn-sm" @click="saveEval"><Check :size="15" /> <span>Enregistrer le profil</span></button>
        </div>
      </template>

      <template v-else>
        <Radar6C :scores="enfant.comp6c || {}" />
        <button class="btn btn-ghost btn-sm refaire" @click="startEdit"><Sliders :size="14" /> <span>Refaire l'auto-évaluation</span></button>
      </template>
    </div>

    <!-- ÉTAPE 2 — Destination -->
    <div class="card step-card" :class="{ disabled: !hasEval }">
      <div class="step-head">
        <span class="step-num">2</span>
        <h3>Où viser ?</h3>
      </div>
      <p class="muted small">Les pistes seront calées sur les filières, écoles et débouchés <strong>réels</strong> de la destination choisie.</p>
      <div v-if="!paysCouvert" class="pays-note">
        <Info :size="16" />
        <p>Le référentiel d'orientation propre au pays de {{ enfant.firstName }} (<strong>{{ paysEnfantLabel || 'non précisé' }}</strong>) n'est pas encore disponible. En attendant, MIAPO s'appuie sur des repères <strong>régionaux (Cameroun)</strong> et <strong>internationaux (France)</strong> pour situer filières et débouchés.</p>
      </div>
      <div class="pays-pick">
        <button v-for="p in PAYS_ORIENTATION" :key="p.code" class="pays-btn" :class="{ active: pays === p.code }" :disabled="!hasEval" @click="selectPays(p.code)">
          <Globe v-if="p.code === 'france'" :size="16" /><MapPin v-else :size="16" />
          <span>{{ p.label }}</span>
        </button>
      </div>
    </div>

    <!-- ÉTAPE 3 — Suggestions argumentées -->
    <div class="card step-card" :class="{ disabled: !hasEval }">
      <div class="step-head">
        <span class="step-num">3</span>
        <h3>Pistes argumentées</h3>
        <span class="ia-badge"><Sparkles :size="12" /> MIAPO</span>
      </div>

      <div v-if="state === 'idle'">
        <p class="muted small">MIAPO croise le profil 6C de {{ enfant.firstName }}, son niveau ({{ enfant.niveau }}) et les données réelles de {{ paysLabel }}.</p>
        <button class="btn btn-primary" :disabled="!hasEval" @click="getSuggestions"><Compass :size="16" /> <span>Obtenir les pistes pour {{ paysLabel }}</span></button>
      </div>

      <div v-else-if="state === 'loading'" class="loading">
        <Loader2 :size="32" class="spin" /><p>MIAPO analyse le profil et les filières…</p><small>Quelques secondes</small>
      </div>

      <div v-else-if="state === 'done' && result" class="reco">
        <p v-if="result.profil" class="reco-profil">{{ result.profil }}</p>
        <div v-for="(r, i) in result.recommandations" :key="i" class="reco-card">
          <div class="reco-head">
            <GraduationCap :size="17" />
            <strong>{{ r.domaine }}</strong>
            <span class="adq" :class="r.adequation === 'forte' ? 'adq-h' : 'adq-m'">{{ r.adequation === 'forte' ? 'Forte adéquation' : 'Adéquation moyenne' }}</span>
          </div>
          <p class="reco-why">{{ r.pourquoi }}</p>
          <div v-if="r.metiers_cles.length" class="reco-block">
            <span class="reco-lab">Métiers</span>
            <div class="chips"><span v-for="(m, j) in r.metiers_cles" :key="j" class="chip chip-m">{{ m }}</span></div>
          </div>
          <div v-if="r.etablissements_cles.length" class="reco-block">
            <span class="reco-lab">Où étudier</span>
            <div class="chips"><span v-for="(e, j) in r.etablissements_cles" :key="j" class="chip chip-e">{{ e }}</span></div>
          </div>
        </div>
        <p v-if="result.conseil" class="reco-conseil"><Lightbulb :size="15" /> {{ result.conseil }}</p>
        <p v-if="result.prudence" class="reco-prudence">{{ result.prudence }}</p>

        <!-- Pont mobilité → Mobi (volet international) -->
        <div v-if="pays === 'france'" class="mobi-bridge">
          <div class="mobi-ic"><Plane :size="20" /></div>
          <div class="mobi-txt">
            <strong>Envie d'étudier en France ?</strong>
            <p>La mobilité étudiante (admission, visa « Études en France », logement, budget) se prépare. Mobi, l'app mobilité d'EDUFREM, accompagne {{ enfant.firstName }} pas à pas.</p>
          </div>
          <a class="btn btn-primary btn-sm mobi-cta" href="https://mobi.app-edufrem.com" target="_blank" rel="noopener"><span>Découvrir Mobi</span><ArrowRight :size="15" /></a>
        </div>

        <div class="reco-foot">
          <span class="src-note">Pistes fondées sur des données publiques (à affiner avec un conseiller).</span>
          <button class="btn btn-ghost btn-sm" @click="state = 'idle'">Régénérer</button>
        </div>
      </div>

      <div v-else-if="state === 'error'" class="err">
        <p>{{ error }}</p><button class="btn btn-outline btn-sm" @click="state = 'idle'">Réessayer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { COMPETENCES_6C, PAYS_ORIENTATION, ORIENTATION } from '../data/orientation'
import { useEnfantsAutonomesStore, PAYS } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'
import { Sparkles, Check, Compass, GraduationCap, Loader2, Lightbulb, Globe, MapPin, Plane, ArrowRight, Sliders, Info } from 'lucide-vue-next'
import Radar6C from './Radar6C.vue'

const props = defineProps({ enfant: { type: Object, required: true } })

const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()

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

const hasEval = computed(() => !!props.enfant.comp6c && Object.keys(props.enfant.comp6c).length >= 6)
const sorted6c = computed(() => {
  const sv = props.enfant.comp6c || {}
  return COMPETENCES_6C.map((c) => ({ key: c.key, label: c.label, val: sv[c.key] || 0 })).sort((a, b) => b.val - a.val)
})

// Quand on change d'enfant, on réinitialise tout.
watch(() => props.enfant.id, () => { initScores(); editing.value = false; state.value = 'idle'; result.value = null; pays.value = defaultPays() })

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
const REFERENTIEL_PAR_PAYS = { CM: 'cameroun' }
const paysEnfantLabel = computed(() => PAYS.find((p) => p.code === props.enfant.pays)?.label || '')
const paysCouvert = computed(() => !!REFERENTIEL_PAR_PAYS[props.enfant.pays])
function defaultPays() { return REFERENTIEL_PAR_PAYS[props.enfant.pays] || 'cameroun' }
const pays = ref(defaultPays())
const paysLabel = computed(() => PAYS_ORIENTATION.find((p) => p.code === pays.value)?.label || 'Cameroun')
function selectPays(code) { pays.value = code; state.value = 'idle'; result.value = null }

// ── Matching front : on classe les domaines RÉELS par adéquation au profil 6C ─
// (somme des scores des compétences taggées sur le domaine). Aucune invention :
// l'IA n'argumentera ensuite que sur ces candidats. Économe en tokens (1 appel).
function topCandidats() {
  const sv = props.enfant.comp6c || {}
  const domaines = (ORIENTATION[pays.value]?.domaines) || []
  const scored = domaines.map((d) => {
    const score = (d.competences || []).reduce((acc, k) => acc + (sv[k] || 0), 0)
    const metiers = pays.value === 'france'
      ? (d.metiers || []).map((m) => (typeof m === 'string' ? m : m.metier)).filter(Boolean)
      : (d.metiers || [])
    const etablissements = pays.value === 'france'
      ? (d.ecoles || []).map((e) => e.nom + (e.ville ? ` (${e.ville})` : ''))
      : (d.etablissements || [])
    return { domaine: d.domaine, competences: d.competences || [], metiers, etablissements, _score: score }
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
    candidats: topCandidats(),
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
.reco-profil { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tx, #1f2937); }
.reco-card { border: 1px solid var(--bd); border-radius: 12px; padding: 14px 16px; }
.reco-head { display: flex; align-items: center; gap: 8px; color: #7c3aed; flex-wrap: wrap; }
.reco-head strong { font-size: 15px; color: var(--tx, #1f2937); flex: 1; }
.adq { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
.adq-h { color: #1B8A5A; background: rgba(27,138,90,.10); }
.adq-m { color: #B87A00; background: rgba(232,149,10,.12); }
.reco-why { margin: 8px 0 10px; font-size: 13.5px; color: var(--tx2, #4b5563); line-height: 1.55; }
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
