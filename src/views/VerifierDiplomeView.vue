<template>
  <div class="vf-wrap">
    <div class="vf-card">
      <!-- En-tête -->
      <div class="vf-brand">
        <div class="vf-logo">M</div>
        <div>
          <div class="vf-title">Vérifier un diplôme</div>
          <div class="vf-sub">Authentification des diplômes EDUFREM</div>
        </div>
      </div>

      <p class="vf-intro">Saisissez le <strong>code de vérification</strong> figurant sur le diplôme pour confirmer son authenticité et son intégrité.</p>

      <!-- Saisie -->
      <form class="vf-form" @submit.prevent="verifier">
        <input
          v-model="code"
          type="text"
          class="vf-input"
          placeholder="Ex : EDFM-25-7K3QX9"
          autocomplete="off"
          spellcheck="false"
          @input="result = null"
        />
        <button class="vf-btn" type="submit" :disabled="loading || !code.trim()">
          <Loader2 v-if="loading" :size="18" class="spin" />
          <ShieldCheck v-else :size="18" />
          <span>{{ loading ? 'Vérification…' : 'Vérifier' }}</span>
        </button>
      </form>

      <!-- Résultats -->
      <div v-if="result === 'introuvable'" class="vf-res vf-res-bad">
        <XCircle :size="34" />
        <h3>Diplôme introuvable</h3>
        <p>Aucun diplôme ne correspond au code <strong>{{ lastCode }}</strong>. Vérifiez la saisie (le code figure en bas du diplôme).</p>
      </div>

      <div v-else-if="result === 'revoque'" class="vf-res vf-res-bad">
        <Ban :size="34" />
        <h3>Diplôme révoqué</h3>
        <p>Ce diplôme existe dans le registre EDUFREM mais a été <strong>révoqué</strong> par l'établissement émetteur. Il n'est pas valide.</p>
      </div>

      <div v-else-if="result === 'altere'" class="vf-res vf-res-warn">
        <AlertTriangle :size="34" />
        <h3>Intégrité non confirmée</h3>
        <p>Le contenu présenté ne correspond pas à l'empreinte enregistrée. Ne considérez pas ce document comme authentique.</p>
      </div>

      <div v-else-if="result === 'valide' && diplome" class="vf-res vf-res-ok">
        <div class="vf-ok-head"><CheckCircle :size="30" /><h3>{{ signed ? 'Diplôme authentique et signé' : 'Diplôme authentique' }}</h3></div>
        <div class="vf-detail">
          <div class="vf-row"><span class="vf-lab">Titulaire</span><span class="vf-val strong">{{ diplome.eleveName }}</span></div>
          <div class="vf-row"><span class="vf-lab">Diplôme</span><span class="vf-val">{{ diplome.typeLabel }}<span v-if="diplome.serie"> — Série {{ diplome.serie }}</span></span></div>
          <div v-if="diplome.mention" class="vf-row"><span class="vf-lab">Mention</span><span class="vf-val">{{ diplome.mention }}</span></div>
          <div class="vf-row"><span class="vf-lab">Année</span><span class="vf-val">{{ diplome.annee }}</span></div>
          <div class="vf-row"><span class="vf-lab">Établissement</span><span class="vf-val">{{ diplome.ecoleNom }}</span></div>
          <div class="vf-row"><span class="vf-lab">Émis le</span><span class="vf-val">{{ formatDate(diplome.emisLe) }}</span></div>
          <div class="vf-row"><span class="vf-lab">Code</span><span class="vf-val mono">{{ diplome.code }}</span></div>
        </div>
        <p class="vf-note">
          <ShieldCheck :size="14" />
          <template v-if="signed">Diplôme <strong>signé cryptographiquement</strong> par l'établissement — présent au registre EDUFREM et intègre (empreinte SHA-256 + signature RSA vérifiées).</template>
          <template v-else>Présent dans le registre EDUFREM et intègre (empreinte SHA-256 vérifiée).<span class="vf-note-soft"> Ce diplôme ne porte pas encore de signature cryptographique.</span></template>
        </p>
      </div>
    </div>

    <div class="vf-footer">Propulsé par <strong>EDUFREM</strong> · Diplômes vérifiables</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDiplomesStore } from '../stores/diplomes'
import { ShieldCheck, CheckCircle, XCircle, Ban, AlertTriangle, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const dipStore = useDiplomesStore()

const code = ref('')
const loading = ref(false)
const result = ref(null) // null | 'valide' | 'revoque' | 'altere' | 'introuvable'
const diplome = ref(null)
const signed = ref(false)
const lastCode = ref('')

async function verifier() {
  const c = code.value.trim()
  if (!c) return
  loading.value = true
  result.value = null
  diplome.value = null
  signed.value = false
  lastCode.value = c
  try {
    const d = await dipStore.lookup(c)
    if (!d) { result.value = 'introuvable'; return }
    diplome.value = d
    if (d.statut === 'revoque') { result.value = 'revoque'; return }
    const integre = await dipStore.verifierIntegrite(d)
    if (!integre) { result.value = 'altere'; return }
    const sig = await dipStore.verifierSignature(d) // true | false | null
    if (sig === false) { result.value = 'altere'; return } // signature présente mais invalide
    signed.value = sig === true
    result.value = 'valide'
  } catch {
    result.value = 'introuvable'
  } finally {
    loading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return '-' }
}

onMounted(() => {
  const q = route.query.code
  if (q) { code.value = String(q); verifier() }
})
</script>

<style scoped>
.vf-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px 16px; background: linear-gradient(160deg, #f3f6fb 0%, #eef0f7 100%); }
.vf-card { width: 100%; max-width: 460px; background: #fff; border: 1px solid #e6e9ef; border-radius: 20px; box-shadow: 0 18px 50px rgba(20,40,90,.10); padding: 26px 26px 28px; }

.vf-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.vf-logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #1558B0, #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; }
.vf-title { font-family: 'Poppins', sans-serif; font-size: 19px; font-weight: 700; color: #1A1D1F; }
.vf-sub { font-size: 12.5px; color: #8a90a0; }

.vf-intro { font-size: 13.5px; line-height: 1.55; color: #4b5563; margin: 0 0 16px; }

.vf-form { display: flex; gap: 10px; flex-wrap: wrap; }
.vf-input { flex: 1; min-width: 180px; padding: 12px 14px; border: 1px solid #d6dae3; border-radius: 12px; font-family: 'Poppins', monospace; font-size: 16px; letter-spacing: .04em; text-transform: uppercase; color: #1A1D1F; outline: none; }
.vf-input:focus { border-color: #1558B0; box-shadow: 0 0 0 3px rgba(21,88,176,.12); }
.vf-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border: none; border-radius: 12px; background: #1558B0; color: #fff; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: background .15s ease; }
.vf-btn:hover:not(:disabled) { background: #11468c; }
.vf-btn:disabled { opacity: .55; cursor: not-allowed; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Résultats */
.vf-res { margin-top: 20px; padding: 20px; border-radius: 14px; text-align: center; }
.vf-res h3 { font-family: 'Poppins', sans-serif; font-size: 17px; margin: 8px 0 6px; }
.vf-res p { font-size: 13.5px; line-height: 1.5; margin: 0; }
.vf-res-bad { background: rgba(217,48,37,.06); color: #b3261e; }
.vf-res-bad p { color: #7a2620; }
.vf-res-warn { background: rgba(214,158,46,.10); color: #9a6700; }
.vf-res-warn p { color: #7a5600; }
.vf-res-ok { background: rgba(27,138,90,.07); border: 1px solid rgba(27,138,90,.18); text-align: left; }
.vf-ok-head { display: flex; align-items: center; gap: 10px; color: #1B8A5A; justify-content: center; margin-bottom: 14px; }
.vf-ok-head h3 { color: #157a4f; margin: 0; }

.vf-detail { display: flex; flex-direction: column; gap: 8px; background: #fff; border-radius: 12px; padding: 14px 16px; }
.vf-row { display: flex; justify-content: space-between; gap: 14px; font-size: 13.5px; }
.vf-lab { color: #8a90a0; flex-shrink: 0; }
.vf-val { color: #1A1D1F; text-align: right; }
.vf-val.strong { font-weight: 700; font-family: 'Poppins', sans-serif; }
.vf-val.mono { font-family: 'Poppins', monospace; letter-spacing: .04em; }
.vf-note { display: flex; align-items: flex-start; gap: 7px; margin: 14px 0 0; font-size: 12.5px; line-height: 1.5; color: #157a4f; }
.vf-note svg { flex-shrink: 0; margin-top: 1px; }
.vf-note-soft { color: #8a90a0; }

.vf-footer { font-size: 12px; color: #9aa0b0; }
</style>
