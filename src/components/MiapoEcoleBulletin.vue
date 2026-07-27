<template>
  <div class="card lie-pane">
    <!-- Sélecteur de moment (séquence / trimestre) -->
    <div v-if="periodes.length" class="bl-periodes">
      <button v-for="p in periodes" :key="p.id" type="button" class="bl-per" :class="{ on: periodeId === p.id }" @click="choisir(p.id)">
        {{ p.label }}
      </button>
    </div>

    <div v-if="busy && !loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
    <p v-else-if="err" class="lie-err"><Info :size="14" /> {{ err }}</p>
    <p v-else-if="!bulletin" class="lie-empty">{{ en ? 'No report card available for this period yet.' : 'Aucun bulletin disponible pour ce moment.' }}</p>

    <template v-else>
      <!-- En-tête façon bulletin école -->
      <div class="bl-head">
        <div class="bl-school">
          <strong>{{ bulletin.ecole }}</strong>
          <small v-if="bulletin.quartier || bulletin.ville">{{ [bulletin.quartier, bulletin.ville].filter(Boolean).join(', ') }}</small>
          <small v-if="bulletin.anneeScolaire">{{ en ? 'School year' : 'Année scolaire' }} {{ bulletin.anneeScolaire }}</small>
        </div>
        <div class="bl-title">
          <span class="bl-title-main">{{ en ? 'REPORT CARD' : 'BULLETIN DE NOTES' }}</span>
          <span class="bl-title-per">{{ bulletin.periode }}</span>
        </div>
      </div>
      <div class="bl-student">
        <span><strong>{{ en ? 'Name' : 'Nom' }} :</strong> {{ eleveNom }}</span>
        <span><strong>{{ en ? 'Class' : 'Classe' }} :</strong> {{ bulletin.className }}</span>
        <span v-if="lien && lien.matricule"><strong>{{ en ? 'ID' : 'Matricule' }} :</strong> {{ lien.matricule }}</span>
        <span v-if="bulletin.effectif"><strong>{{ en ? 'Class size' : 'Effectif' }} :</strong> {{ bulletin.effectif }}</span>
      </div>

      <!-- Synthèse -->
      <div class="bl-summary">
        <div class="bl-avg" :style="noteStyle(bulletin.moyenneGenerale)">
          {{ fmt(bulletin.moyenneGenerale) }}<small>/20</small>
          <span class="bl-avg-lab">{{ en ? 'Overall average' : 'Moyenne générale' }}</span>
        </div>
        <div class="bl-badges">
          <span v-if="bulletin.rang" class="bl-badge">{{ en ? 'Rank' : 'Rang' }} : <strong>{{ bulletin.rang }}<span v-if="bulletin.effectif">/{{ bulletin.effectif }}</span></strong></span>
          <span v-if="bulletin.mention" class="bl-chip">{{ bulletin.mention }}</span>
          <span v-if="bulletin.decision" class="bl-chip alt">{{ bulletin.decision }}</span>
        </div>
      </div>

      <!-- Tableau des matières -->
      <table class="bl-table">
        <thead>
          <tr>
            <th>{{ en ? 'Subject' : 'Matière' }}</th>
            <th class="c">{{ en ? 'Coef' : 'Coef' }}</th>
            <th v-for="s in seqCols" :key="s.value" class="c hide-sm">{{ s.shortLabel }}</th>
            <th class="c">{{ en ? 'Avg' : 'Moy.' }}</th>
            <th class="c hide-sm">{{ en ? 'Class' : 'Classe' }}</th>
            <th class="hide-sm">{{ en ? 'Remark' : 'Appréciation' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in (bulletin.matieres || [])" :key="i">
            <td>{{ m.nom }}</td>
            <td class="c">{{ m.coef }}</td>
            <td v-for="s in seqCols" :key="s.value" class="c hide-sm"><span :style="noteStyle(m.seqNotes && m.seqNotes[s.value])">{{ fmt(m.seqNotes && m.seqNotes[s.value]) }}</span></td>
            <td class="c"><span class="bl-strong" :style="noteStyle(m.moyenne)">{{ fmt(m.moyenne) }}</span></td>
            <td class="c hide-sm">{{ fmt(m.moyenneClasse) }}</td>
            <td class="hide-sm bl-app">{{ m.appreciation || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Appréciation générale + signature -->
      <div v-if="bulletin.appreciationGenerale" class="bl-general">
        <span class="bl-general-lab">{{ en ? 'Class council' : 'Conseil de classe' }}</span>
        <p>{{ bulletin.appreciationGenerale }}</p>
      </div>
      <div class="bl-sign">
        <div class="bl-sign-dir">
          <span class="bl-sign-lab">{{ en ? 'The Head Teacher' : 'Le Directeur' }}</span>
          <span class="bl-sign-name">{{ bulletin.directeur }}</span>
          <span v-if="bulletin.dateValidation" class="bl-sign-date">{{ formatDate(bulletin.dateValidation) }}</span>
        </div>
      </div>

      <!-- Export PDF (diplôme vérifiable) -->
      <div class="bl-actions">
        <button class="btn btn-primary" :disabled="exporting" @click="exporterPDF">
          <Loader2 v-if="exporting" :size="15" class="spin" /><FileDown v-else :size="15" />
          <span>{{ en ? 'Export PDF (verifiable)' : 'Exporter en PDF (vérifiable)' }}</span>
        </button>
      </div>
      <p class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Official report card pushed by your school. The PDF embeds a “verifiable diploma” QR code.' : 'Bulletin officiel poussé par votre école. Le PDF embarque un QR code « diplôme vérifiable ».' }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Info, ShieldCheck, FileDown } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { useLienEcoleStore } from '../stores/lienEcole'
import { generateBulletinPDF } from '../utils/pdfBulletin'

const props = defineProps({
  enfant: { type: Object, default: null },
  lien: { type: Object, default: () => ({}) },
})
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const lienStore = useLienEcoleStore()

const sid = computed(() => props.lien?.schoolId)
const eid = computed(() => props.lien?.eleveId)
const eleveNom = computed(() => {
  const e = props.enfant
  return e ? `${e.lastName || ''} ${e.firstName || ''}`.trim() : ''
})

const periodes = ref([])
const periodeId = ref('')
const bulletin = ref(null)
const busy = ref(false)
const err = ref('')
const loaded = ref(false)
const exporting = ref(false)

const seqCols = computed(() => (bulletin.value?.sequences?.length > 1 ? bulletin.value.sequences : []))

function fmt(n) { return n == null || isNaN(n) ? '—' : (Math.round(n * 100) / 100).toString().replace('.', ',') }
function noteStyle(n) {
  const c = n == null || isNaN(n) ? '#6b7280' : n >= 14 ? '#1B8A5A' : n >= 10 ? '#B87A00' : '#D93025'
  return { color: c }
}
function formatDate(s) { const d = new Date(s); if (isNaN(d.getTime())) return s; try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return s } }

async function loadBulletin() {
  busy.value = true; err.value = ''
  const r = await lienStore.fetchNotes(sid.value, eid.value, periodeId.value)
  busy.value = false; loaded.value = true
  if (r && r.ok) bulletin.value = r.bulletin || null
  else { bulletin.value = null; err.value = en.value ? 'Could not load the report card.' : 'Impossible de charger le bulletin.' }
}
function choisir(id) { if (id === periodeId.value) return; periodeId.value = id; loadBulletin() }

function verifBaseUrl() { try { return location.host + '/verifier' } catch { return 'mapo.app-edufrem.com/verifier' } }
function verifUrl(code) { try { return `${location.origin}/verifier?code=${encodeURIComponent(code)}` } catch { return '/verifier?code=' + code } }

async function exporterPDF() {
  const b = bulletin.value
  if (!b || exporting.value) return
  exporting.value = true
  try {
    let qr = null
    if (b.verifCode) { try { qr = await QRCode.toDataURL(verifUrl(b.verifCode), { margin: 1, width: 160, color: { dark: '#11335f', light: '#ffffff' } }) } catch { qr = null } }
    const doc = generateBulletinPDF({
      school: { schoolName: b.ecole, quartier: b.quartier, city: b.ville, phone: b.tel, email: b.email, academicYear: b.anneeScolaire },
      child: { lastName: props.enfant?.lastName || '', firstName: props.enfant?.firstName || '', matricule: props.lien?.matricule || '', className: b.className },
      periodLabel: b.periode,
      grades: (b.matieres || []).map((m) => ({ subject: m.nom, coef: m.coef, seqNotes: m.seqNotes || {}, avg: m.moyenne, classAvg: m.moyenneClasse, appreciation: m.appreciation })),
      sequences: b.sequences || [{ value: 'S1', shortLabel: b.periode }],
      generalAvg: b.moyenneGenerale, generalAppreciation: b.appreciationGenerale,
      rank: b.rang ? `${b.rang} / ${b.effectif || '?'}` : null, mention: b.mention, effectif: b.effectif,
      directeurName: b.directeur, profPrincipalName: b.profPrincipal, directeurDate: b.dateValidation ? formatDate(b.dateValidation) : '',
      verifQrDataUrl: qr, verifCode: b.verifCode || '', verifUrlText: verifBaseUrl(),
    })
    const nom = `${props.enfant?.lastName || 'bulletin'}_${(b.periode || '').replace(/\s+/g, '-')}`.toLowerCase()
    doc.save(`bulletin_${nom}.pdf`)
  } finally { exporting.value = false }
}

onMounted(async () => {
  busy.value = true
  const rp = await lienStore.fetchPeriodes(sid.value, eid.value)
  if (rp && rp.ok && rp.periodes?.length) { periodes.value = rp.periodes; periodeId.value = rp.periodes[0].id }
  await loadBulletin()
})
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.lie-pane { min-height: 80px; }
.lie-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px; color: var(--pr); }
.lie-loading p { margin: 0; font-size: 13.5px; color: var(--tx2, #4b5563); }
.lie-empty { margin: 8px 0; font-size: 13.5px; color: var(--tx3, #6b7280); }
.lie-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 13px; color: #B87A00; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 16px; border-radius: 12px; border: none; font-family: inherit; font-weight: 600; font-size: 14.5px; cursor: pointer; }
.btn-primary { background: var(--pr); color: #fff; } .btn-primary:hover { filter: brightness(1.05); } .btn-primary:disabled { opacity: .5; cursor: default; }

.bl-periodes { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.bl-per { border: 1.5px solid var(--bd, #e5e7eb); background: #fff; color: var(--tx3, #6b7280); border-radius: 999px; padding: 7px 14px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.bl-per:hover { border-color: var(--pr); color: var(--pr); }
.bl-per.on { border-color: var(--pr); background: var(--pr); color: #fff; }

.bl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid var(--tx, #1f2937); }
.bl-school { display: flex; flex-direction: column; gap: 1px; }
.bl-school strong { font-size: 15px; color: var(--tx, #1f2937); }
.bl-school small { font-size: 11.5px; color: var(--tx3, #6b7280); }
.bl-title { display: flex; flex-direction: column; align-items: flex-end; }
.bl-title-main { font-size: 14px; font-weight: 800; letter-spacing: .02em; color: var(--tx, #1f2937); }
.bl-title-per { font-size: 12.5px; color: var(--tx2, #4b5563); }
.bl-student { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 10px 0 14px; font-size: 13px; color: var(--tx2, #4b5563); }
.bl-student strong { color: var(--tx, #1f2937); font-weight: 600; }

.bl-summary { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.bl-avg { display: flex; flex-direction: column; font-size: 30px; font-weight: 800; line-height: 1; }
.bl-avg small { font-size: 13px; font-weight: 600; opacity: .7; }
.bl-avg-lab { font-size: 11px; font-weight: 600; color: var(--tx3, #6b7280); margin-top: 3px; }
.bl-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bl-badge { font-size: 13px; color: var(--tx2, #4b5563); }
.bl-chip { font-size: 12px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 4px 11px; border-radius: 999px; }
.bl-chip.alt { color: #1B8A5A; background: rgba(27,138,90,.10); }

.bl-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 8px; }
.bl-table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--tx3, #6b7280); padding: 7px 8px; border-bottom: 1px solid var(--bd, #e5e7eb); }
.bl-table td { padding: 9px 8px; border-bottom: 1px solid var(--input-bg, #f1f3f5); color: var(--tx, #1f2937); }
.bl-table th.c, .bl-table td.c { text-align: center; }
.bl-strong { font-weight: 800; }
.bl-app { color: var(--tx2, #4b5563); font-size: 12.5px; font-style: italic; }

.bl-general { margin: 12px 0; padding: 10px 12px; background: var(--input-bg, #f7f8fa); border-radius: 10px; }
.bl-general-lab { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3, #6b7280); font-weight: 700; }
.bl-general p { margin: 4px 0 0; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; }
.bl-sign { display: flex; justify-content: flex-end; margin: 10px 0 4px; }
.bl-sign-dir { display: flex; flex-direction: column; align-items: flex-end; }
.bl-sign-lab { font-size: 12px; font-weight: 700; color: var(--tx, #1f2937); }
.bl-sign-name { font-size: 13px; color: var(--pr); font-style: italic; margin-top: 2px; }
.bl-sign-date { font-size: 11px; color: var(--tx3, #9ca3af); margin-top: 1px; }

.bl-actions { display: flex; margin-top: 12px; }
.lie-priv { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: 11.5px; color: var(--tx3, #6b7280); }
.lie-priv svg { color: #1B8A5A; flex-shrink: 0; }
@media (max-width: 560px) { .hide-sm { display: none; } }
</style>
