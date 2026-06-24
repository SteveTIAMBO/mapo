<template>
  <div class="dip-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Diplômes vérifiables</h1>
        <p>Émettez des diplômes infalsifiables — chacun reçoit un code de vérification public.</p>
      </div>
      <button class="btn btn-primary" @click="openEmettre">
        <Award :size="16" /><span>Émettre un diplôme</span>
      </button>
    </div>

    <!-- Bandeau explicatif -->
    <div class="info-banner">
      <ShieldCheck :size="18" />
      <span>Chaque diplôme porte un <strong>code public</strong> et une <strong>empreinte SHA-256</strong> : n'importe qui peut en vérifier l'authenticité sur <strong>{{ verifBaseUrl }}</strong>, sans compte.</span>
    </div>

    <!-- Liste des diplômes émis -->
    <div class="card">
      <div v-if="diplomes.length === 0" class="empty-state">
        <Award :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>Aucun diplôme émis pour le moment.</p>
        <button class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="openEmettre">Émettre le premier</button>
      </div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Élève</th>
              <th>Diplôme</th>
              <th class="hide-mobile">Année</th>
              <th>Code de vérification</th>
              <th class="hide-mobile">Émis le</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in diplomes" :key="d.id">
              <td class="td-name">{{ d.eleveName }}</td>
              <td>{{ d.typeLabel }}<span v-if="d.serie"> {{ d.serie }}</span><span v-if="d.mention" class="mention"> · {{ d.mention }}</span></td>
              <td class="hide-mobile td-mono">{{ d.annee }}</td>
              <td>
                <button class="code-chip" :title="'Copier ' + d.code" @click="copyCode(d.code)">
                  <span class="code-txt">{{ d.code }}</span>
                  <Check v-if="copiedCode === d.code" :size="13" /><Copy v-else :size="13" />
                </button>
              </td>
              <td class="hide-mobile td-mono">{{ formatDate(d.emisLe) }}</td>
              <td>
                <span class="badge" :class="d.statut === 'valide' ? 'badge-success' : 'badge-danger'">
                  {{ d.statut === 'valide' ? 'Valide' : 'Révoqué' }}
                </span>
              </td>
              <td class="td-actions">
                <button class="icon-btn" title="Voir le diplôme" @click="openCertificat(d)"><Eye :size="17" /></button>
                <button v-if="d.statut === 'valide'" class="icon-btn icon-danger" title="Révoquer" @click="askRevoke(d)"><Ban :size="16" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modale ÉMETTRE -->
    <div v-if="showEmettre" class="modal-overlay" @click.self="showEmettre = false">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>Émettre un diplôme</h2>
          <button class="icon-btn" @click="showEmettre = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Élève</label>
            <select v-model="form.eleveId" class="input">
              <option value="">Sélectionnez un élève</option>
              <option v-for="e in elevesInscrits" :key="e.id" :value="e.id">{{ e.lastName }} {{ e.firstName }} — {{ e.className }}</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Diplôme</label>
              <select v-model="form.type" class="input">
                <option v-for="t in DIPLOME_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Série (optionnel)</label>
              <input v-model="form.serie" type="text" class="input" placeholder="A, C, D…" maxlength="4" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Mention</label>
              <select v-model="form.mention" class="input">
                <option value="">— Aucune —</option>
                <option v-for="m in MENTIONS" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="field">
              <label>Année scolaire</label>
              <input v-model="form.annee" type="text" class="input" placeholder="2024-2025" />
            </div>
          </div>
          <p v-if="emettreError" class="form-error">{{ emettreError }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showEmettre = false">Annuler</button>
          <button class="btn btn-primary" :disabled="emitting" @click="emettre">
            <Award :size="16" /><span>{{ emitting ? 'Émission…' : 'Émettre' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modale CERTIFICAT -->
    <div v-if="certificat" class="modal-overlay" @click.self="certificat = null">
      <div class="modal-card card cert-modal">
        <div class="modal-header no-print">
          <h2>Diplôme</h2>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" @click="printCert"><Printer :size="15" /><span>Imprimer</span></button>
            <button class="icon-btn" @click="certificat = null"><X :size="20" /></button>
          </div>
        </div>
        <div class="cert" id="cert-print">
          <div class="cert-head">
            <div class="cert-school">{{ certificat.ecoleNom || 'Établissement' }}</div>
            <div class="cert-sub">République · Année scolaire {{ certificat.annee }}</div>
          </div>
          <div class="cert-title">DIPLÔME</div>
          <div class="cert-type">{{ certificat.typeLabel }}<span v-if="certificat.serie"> — Série {{ certificat.serie }}</span></div>
          <p class="cert-intro">Le présent diplôme est décerné à</p>
          <div class="cert-name">{{ certificat.eleveName }}</div>
          <p v-if="certificat.mention" class="cert-mention">avec la mention <strong>{{ certificat.mention }}</strong></p>
          <div class="cert-foot">
            <div class="cert-verif">
              <span class="cert-verif-lab">Code de vérification</span>
              <span class="cert-verif-code">{{ certificat.code }}</span>
              <span class="cert-verif-url">Vérifiez l'authenticité sur {{ verifBaseUrl }}</span>
            </div>
            <div class="cert-seal">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR de vérification" class="cert-qr" />
              <span>Diplôme vérifiable EDUFREM</span>
              <small v-if="certificat.hash">empreinte {{ certificat.hash.slice(0, 16) }}…</small>
            </div>
          </div>
        </div>
        <div class="cert-actions no-print">
          <a class="btn btn-ghost btn-sm" :href="verifUrl(certificat.code)" target="_blank" rel="noopener"><ExternalLink :size="15" /><span>Ouvrir la page de vérification</span></a>
        </div>
      </div>
    </div>

    <!-- Confirmation révocation -->
    <div v-if="toRevoke" class="modal-overlay" @click.self="toRevoke = null">
      <div class="modal-card card modal-sm">
        <div class="modal-header"><h2>Révoquer ce diplôme ?</h2><button class="icon-btn" @click="toRevoke = null"><X :size="20" /></button></div>
        <div class="modal-body">
          <p>Le diplôme <strong>{{ toRevoke.code }}</strong> de {{ toRevoke.eleveName }} sera marqué <strong>révoqué</strong> : la page de vérification publique le signalera comme non valide. Cette action est réversible côté registre.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="toRevoke = null">Annuler</button>
          <button class="btn btn-danger" @click="confirmRevoke">Révoquer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDiplomesStore, DIPLOME_TYPES, MENTIONS } from '../stores/diplomes'
import { useElevesStore } from '../stores/eleves'
import { useSchoolStore } from '../stores/school'
import { useAuthStore } from '../stores/auth'
import { Award, ShieldCheck, Check, Copy, Eye, Ban, X, Printer, ExternalLink } from 'lucide-vue-next'
import QRCode from 'qrcode'

const dipStore = useDiplomesStore()
const elevesStore = useElevesStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()

const diplomes = computed(() => dipStore.diplomesSorted)
const elevesInscrits = computed(() =>
  elevesStore.eleves.filter((e) => (e.status || 'inscrit') === 'inscrit')
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
)

const schoolName = computed(() => schoolStore.schoolSettings?.schoolName || 'Établissement EDUFREM')
const schoolAcronym = computed(() => {
  const words = schoolName.value.split(/\s+/).filter((w) => w.length > 2)
  const acro = words.map((w) => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return acro.slice(0, 5) || 'EDFM'
})

const verifBaseUrl = computed(() => {
  try { return location.host + '/verifier' } catch { return 'mapo.app-edufrem.com/verifier' }
})
function verifUrl(code) {
  try { return `${location.origin}/verifier?code=${encodeURIComponent(code)}` } catch { return '/verifier?code=' + code }
}

// ── Émettre ──
const showEmettre = ref(false)
const emitting = ref(false)
const emettreError = ref('')
const form = ref({ eleveId: '', type: 'bac', serie: '', mention: '', annee: '' })

function currentSchoolYear() {
  const now = new Date()
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-${y + 1}`
}
function openEmettre() {
  form.value = { eleveId: '', type: 'bac', serie: '', mention: '', annee: currentSchoolYear() }
  emettreError.value = ''
  showEmettre.value = true
}
async function emettre() {
  emettreError.value = ''
  const e = elevesStore.eleves.find((x) => x.id === form.value.eleveId)
  if (!e) { emettreError.value = 'Sélectionnez un élève.'; return }
  if (!form.value.annee.trim()) { emettreError.value = "Renseignez l'année scolaire."; return }
  emitting.value = true
  try {
    const d = await dipStore.emettre({
      eleveId: e.id,
      eleveName: `${e.lastName} ${e.firstName}`,
      type: form.value.type,
      serie: form.value.serie,
      mention: form.value.mention,
      annee: form.value.annee,
      ecoleNom: schoolName.value,
      ecoleAcronyme: schoolAcronym.value,
      emisPar: authStore.userProfile?.displayName || 'Direction',
    })
    showEmettre.value = false
    certificat.value = d
    qrDataUrl.value = ''
    genQr(d.code)
  } finally {
    emitting.value = false
  }
}

// ── Certificat ──
const certificat = ref(null)
const qrDataUrl = ref('')
async function genQr(code) {
  try {
    qrDataUrl.value = await QRCode.toDataURL(verifUrl(code), { margin: 1, width: 140, color: { dark: '#11335f', light: '#ffffff' } })
  } catch { qrDataUrl.value = '' }
}
function openCertificat(d) { certificat.value = d; qrDataUrl.value = ''; genQr(d.code) }
function printCert() {
  document.body.classList.add('printing-cert')
  setTimeout(() => { window.print(); document.body.classList.remove('printing-cert') }, 60)
}

// ── Copier code ──
const copiedCode = ref('')
function copyCode(code) {
  try {
    navigator.clipboard?.writeText(code)
    copiedCode.value = code
    setTimeout(() => { if (copiedCode.value === code) copiedCode.value = '' }, 1600)
  } catch { /* clipboard indispo */ }
}

// ── Révoquer ──
const toRevoke = ref(null)
function askRevoke(d) { toRevoke.value = d }
function confirmRevoke() {
  if (toRevoke.value) dipStore.revoquer(toRevoke.value.id)
  toRevoke.value = null
}

function formatDate(iso) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '-' }
}

onMounted(async () => {
  // Charger l'identité de l'école AVANT le seed : sinon le nom d'émetteur
  // retombe sur le libellé générique « Établissement EDUFREM ».
  await Promise.all([elevesStore.loadEleves(), schoolStore.loadSettings()])
  if (authStore.isDemo) {
    await dipStore.seedDemo({ eleves: elevesStore.eleves, ecoleNom: schoolName.value, ecoleAcronyme: schoolAcronym.value })
  }
})
</script>

<style scoped>
.dip-page { max-width: 1100px; margin: 0 auto; }

.info-banner { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; margin-bottom: 20px; border-radius: 12px; background: rgba(var(--pr-rgb,21,88,176),.06); color: var(--tx2); font-size: 13.5px; line-height: 1.5; }
.info-banner svg { color: var(--pr); flex-shrink: 0; margin-top: 1px; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 11px 14px; font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3); border-bottom: 1px solid var(--divider); }
.table td { padding: 11px 14px; font-size: 13px; color: var(--tx); border-bottom: 1px solid var(--divider); }
.td-name { font-weight: 600; }
.td-mono { font-family: 'Poppins', sans-serif; font-size: 12px; color: var(--tx2); }
.mention { color: var(--tx3); }
.td-actions { white-space: nowrap; text-align: right; }

.code-chip { display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 8px; border: 1px dashed var(--border, #cbd5e1); background: var(--input-bg, #f4f6f8); cursor: pointer; font-family: 'Poppins', monospace; font-size: 12.5px; font-weight: 600; letter-spacing: .03em; color: var(--tx); }
.code-chip:hover { border-color: var(--pr); color: var(--pr); }
.code-chip svg { color: var(--tx3); }

.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; border-radius: 8px; color: var(--tx3); cursor: pointer; transition: all .15s ease; }
.icon-btn:hover { background: rgba(0,0,0,.05); color: var(--tx); }
.icon-danger:hover { background: rgba(217,48,37,.1); color: #D93025; }

/* Modales */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; backdrop-filter: blur(3px); }
.modal-card { width: 100%; max-width: 540px; padding: 0; max-height: 92vh; overflow-y: auto; }
.modal-sm { max-width: 440px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--divider); }
.modal-header h2 { font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 700; margin: 0; }
.modal-body { padding: 20px 22px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--divider); }
.field { margin-bottom: 14px; }
.field label { display: block; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-error { color: #D93025; font-size: 13px; margin: 4px 0 0; }

/* Certificat */
.cert-modal { max-width: 620px; }
.cert { background: #fff; border: 2px solid var(--pr, #1558B0); border-radius: 12px; margin: 18px 22px; padding: 28px 30px; text-align: center; position: relative; }
.cert-head { margin-bottom: 14px; }
.cert-school { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 700; color: var(--tx, #1A1D1F); }
.cert-sub { font-size: 12px; color: var(--tx3); margin-top: 2px; }
.cert-title { font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: .35em; color: var(--pr); margin: 14px 0 4px; }
.cert-type { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 700; color: var(--tx); }
.cert-intro { font-size: 13px; color: var(--tx2); margin: 16px 0 6px; }
.cert-name { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 700; color: var(--tx); border-bottom: 2px solid var(--divider); display: inline-block; padding: 0 20px 6px; }
.cert-mention { font-size: 14px; color: var(--tx2); margin: 12px 0 0; }
.cert-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 26px; flex-wrap: wrap; text-align: left; }
.cert-verif { display: flex; flex-direction: column; gap: 2px; }
.cert-verif-lab { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--tx3); }
.cert-verif-code { font-family: 'Poppins', monospace; font-size: 18px; font-weight: 700; letter-spacing: .06em; color: var(--pr); }
.cert-verif-url { font-size: 11px; color: var(--tx3); }
.cert-seal { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--pr); text-align: center; }
.cert-qr { width: 96px; height: 96px; border-radius: 6px; }
.cert-seal span { font-size: 11px; font-weight: 600; }
.cert-seal small { font-family: monospace; font-size: 9.5px; color: var(--tx3); }
.cert-actions { padding: 0 22px 18px; }

.empty-state { padding: 48px 20px; text-align: center; color: var(--tx2); }

@media (max-width: 768px) {
  .hide-mobile { display: none; }
  .field-row { grid-template-columns: 1fr; gap: 0; }
  .cert { margin: 14px; padding: 22px 18px; }
  .cert-name { font-size: 20px; }
}
</style>
