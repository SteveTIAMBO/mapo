<template>
  <div class="sn">
    <div class="sn-intro">
      <h1 class="sn-h1">Notes &amp; relevés</h1>
      <p class="sn-sub">
        Saisie par UE, relevé individuel et délibérations de jury par promotion.
      </p>
    </div>

    <!-- KPIs globaux jurys -->
    <div class="sn-kpis">
      <div class="sn-kpi">
        <div class="sn-kpi-label">Étudiants notés</div>
        <div class="sn-kpi-value">{{ globalStats.nbReleves }}</div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-label">Taux de réussite</div>
        <div class="sn-kpi-value">{{ globalStats.tauxReussite }}<span class="sn-kpi-unit">%</span></div>
        <div class="sn-kpi-foot" :class="globalStats.tauxReussite >= 75 ? 'is-ok' : 'is-warn'">
          {{ globalStats.admis }} admis · {{ globalStats.ajournes }} ajournés
        </div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-label">Moyenne générale</div>
        <div class="sn-kpi-value">{{ globalStats.moyenne }}<span class="sn-kpi-unit">/20</span></div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-label">crédits validés</div>
        <div class="sn-kpi-value">{{ fmt(globalStats.ectsValides) }}</div>
        <div class="sn-kpi-foot">sur {{ fmt(globalStats.ectsTotal) }} attribués</div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="sn-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="sn-tab"
        :class="{ active: activeTab === t.key }"
        type="button"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- Onglet 1 : Vue jury par promotion -->
    <section v-if="activeTab === 'jury'" class="sn-card">
      <table class="sn-table">
        <thead>
          <tr>
            <th>Promotion</th>
            <th class="num">Étudiants</th>
            <th class="num">Moyenne</th>
            <th class="num">Admis</th>
            <th class="num">Ajournés</th>
            <th class="num">Taux de réussite</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in store.juryParPromotion" :key="j.promotion.id">
            <td>
              <div class="sn-promo">
                <span class="sn-niveau" :class="`n-${j.promotion.niveau.toLowerCase()}`">{{ j.promotion.niveau }}</span>
                <span class="sn-promo-nom">{{ j.promotion.programmeNom }} — {{ j.promotion.anneeNom }}</span>
              </div>
            </td>
            <td class="num">{{ j.nbEtudiants }}</td>
            <td class="num">
              <strong :class="j.moyennePromo < 10 ? 'is-bad' : j.moyennePromo >= 12 ? 'is-ok' : ''">
                {{ j.moyennePromo.toFixed(2) }}
              </strong>
            </td>
            <td class="num is-ok">{{ j.nbAdmis }}</td>
            <td class="num" :class="j.nbAjournes > 0 ? 'is-bad' : ''">{{ j.nbAjournes }}</td>
            <td class="num">
              <div class="sn-rate">
                <div class="sn-rate-track">
                  <div class="sn-rate-fill" :class="j.tauxReussite >= 75 ? 'is-ok' : j.tauxReussite >= 60 ? 'is-mid' : 'is-bad'" :style="{ width: j.tauxReussite + '%' }"></div>
                </div>
                <span class="sn-rate-label">{{ j.tauxReussite }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Onglet 2 : Relevé étudiant -->
    <section v-if="activeTab === 'releve'" class="sn-card">
      <div class="sn-toolbar">
        <label class="sn-label-inline">Étudiant</label>
        <select v-model="selectedEtudiantId" class="sn-select sn-select-large">
          <option value="">— Choisir un étudiant —</option>
          <option v-for="e in store.etudiants" :key="e.id" :value="e.id">
            {{ e.matricule }} · {{ e.nomComplet }} — {{ e.anneeNom }}
          </option>
        </select>
        <ExportMenu
          class="sn-export"
          :excel="exportReleve"
          :pdf="exportRelevePdf"
          :disabled="!releve || !(releve.lignes && releve.lignes.length)"
        />
      </div>

      <div v-if="!releve" class="sn-empty">Sélectionnez un étudiant pour afficher son relevé du semestre.</div>
      <div v-else>
        <div class="sn-releve-head">
          <div>
            <div class="sn-releve-title">{{ releve.etudiant.nomComplet }}</div>
            <div class="sn-releve-sub">
              {{ releve.etudiant.programmeNom }} · {{ releve.etudiant.anneeNom }} · Semestre {{ releve.semestre }}
            </div>
          </div>
          <div class="sn-releve-result">
            <div class="sn-result-line">
              <span class="sn-result-label">Moyenne semestre</span>
              <span class="sn-result-val">{{ releve.moyenne.toFixed(2) }}<small>/20</small></span>
            </div>
            <div class="sn-result-line">
              <span class="sn-result-label">crédits validés</span>
              <span class="sn-result-val">{{ releve.ectsValides }}<small>/{{ releve.totalEcts }}</small></span>
            </div>
            <div class="sn-result-decision">
              <span class="sn-decision-pill" :class="releve.admis ? 'is-admis' : 'is-ajourne'">
                {{ releve.admis ? 'Admis' : 'Ajourné' }}
              </span>
              <span v-if="releve.mention" class="sn-mention">Mention {{ releve.mention }}</span>
            </div>
          </div>
        </div>

        <table class="sn-table sn-releve-table">
          <thead>
            <tr>
              <th>UE</th>
              <th>Type</th>
              <th class="num">crédits</th>
              <th class="num">Note</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in releve.lignes" :key="l.ueId">
              <td>
                <div class="sn-ue-code">{{ l.ueCode }}</div>
                <div class="sn-ue-nom">{{ l.ueIntitule }}</div>
              </td>
              <td><span class="sn-tag" :class="`t-${l.type}`">{{ typeLabel(l.type) }}</span></td>
              <td class="num">{{ l.ects }}</td>
              <td class="num">
                <strong :class="l.note == null ? 'sn-note-wait' : l.note < 10 ? 'is-bad' : l.note >= 14 ? 'is-ok' : ''">
                  {{ l.note != null ? l.note.toFixed(2) : '—' }}
                </strong>
              </td>
              <td>
                <span class="sn-val-pill" :class="l.note == null ? 'is-wait' : l.validee ? 'is-ok' : 'is-bad'">
                  {{ l.note == null ? 'En attente' : l.validee ? 'Validée' : 'Non validée' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Signature du directeur sur le relevé -->
        <div class="st-sign">
          <div class="st-sign-head">Le Directeur</div>

          <!-- Signé -->
          <div v-if="releveSigned" class="st-sign-done">
            <img :src="releveSignatureImg" alt="Signature du directeur" class="st-sign-img" />
            <div class="st-sign-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V7z"/><path d="M9 12l2 2 4-4"/></svg>
              <span>Validé et signé</span>
            </div>
            <div class="st-sign-name">{{ releveSignature.signedBy }}</div>
            <div class="st-sign-date">Signé le {{ formatSignDate(releveSignature.signedAt) }}</div>
            <button v-if="canSignReleve" type="button" class="st-sign-undo" @click="cancelSignReleve">
              Annuler la signature
            </button>
          </div>

          <!-- À signer (directeur / admin) -->
          <div v-else-if="canSignReleve" class="st-sign-todo">
            <button
              type="button"
              class="st-sign-btn"
              :disabled="pendingUE > 0"
              :title="pendingUE > 0 ? `Relevé incomplet — ${pendingUE} UE en attente de note` : ''"
              @click="openSignModal"
            >Valider et signer le relevé</button>
            <span v-if="pendingUE > 0" class="st-sign-hint">
              Relevé incomplet — {{ pendingUE }} UE en attente de note
            </span>
          </div>

          <!-- Non signé, lecture seule -->
          <div v-else class="st-sign-line" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <!-- Onglet 3 : Saisie par UE -->
    <section v-if="activeTab === 'saisie'" class="sn-card">
      <div class="sn-toolbar">
        <label class="sn-label-inline">UE</label>
        <select v-model="selectedUEId" class="sn-select sn-select-large">
          <option value="">— Choisir une UE —</option>
          <option v-for="u in store.ueAvecNotes" :key="u.id" :value="u.id">
            {{ u.code }} — {{ u.intitule }} (sem. {{ u.semestre }})
          </option>
        </select>
        <span v-if="ueSelectionnee" class="sn-ue-info">
          {{ ueSelectionnee.intervenantNom }} · {{ ueSelectionnee.volumeHoraire }} h · {{ ueSelectionnee.ects }} crédits
        </span>
      </div>

      <div v-if="!selectedUEId" class="sn-empty">
        Sélectionnez une UE pour saisir / consulter les notes de ses étudiants.
      </div>
      <div v-else>
        <p v-if="!canEditNotes" class="sn-readonly-hint">
          Lecture seule — la saisie des notes est faite par l'enseignant de l'UE.
        </p>
        <div class="sn-saisie-summary">
          <span><strong>{{ notesUE.length }}</strong> étudiant{{ notesUE.length > 1 ? 's' : '' }} inscrit{{ notesUE.length > 1 ? 's' : '' }}</span>
          <span class="sn-dot">•</span>
          <span>Moyenne <strong>{{ moyenneUE.toFixed(2) }}/20</strong></span>
          <span class="sn-dot">•</span>
          <span><strong>{{ nbValideesUE }}</strong> UE validée{{ nbValideesUE > 1 ? 's' : '' }} ({{ pctValideUE }}%)</span>
          <template v-if="nbEnAttenteUE > 0">
            <span class="sn-dot">•</span>
            <span><strong>{{ nbEnAttenteUE }}</strong> en attente</span>
          </template>
          <span class="sn-legend">Note UE = CC 40 % + Examen 60 %</span>
        </div>
        <table class="sn-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Étudiant</th>
              <th class="num">CC /20</th>
              <th class="num">Examen /20</th>
              <th class="num">Note UE /20</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in notesUE" :key="n.etudiant.id">
              <td class="sn-mat">{{ n.etudiant.matricule }}</td>
              <td>{{ n.etudiant.nomComplet }}</td>
              <td class="num">
                <input
                  type="number" min="0" max="20" step="0.25"
                  class="sn-note-input"
                  :value="n.cc ?? ''"
                  placeholder="—"
                  :disabled="!canEditNotes"
                  @change="canEditNotes && store.setSupNote(n.etudiant.id, selectedUEId, 'cc', $event.target.value)"
                />
              </td>
              <td class="num">
                <input
                  type="number" min="0" max="20" step="0.25"
                  class="sn-note-input"
                  :value="n.examen ?? ''"
                  placeholder="—"
                  :disabled="!canEditNotes"
                  @change="canEditNotes && store.setSupNote(n.etudiant.id, selectedUEId, 'examen', $event.target.value)"
                />
              </td>
              <td class="num">
                <strong :class="n.note == null ? 'sn-note-wait' : n.note < 10 ? 'is-bad' : n.note >= 14 ? 'is-ok' : ''">
                  {{ n.note != null ? n.note.toFixed(2) : '—' }}
                </strong>
              </td>
              <td>
                <span class="sn-val-pill" :class="n.note == null ? 'is-wait' : n.note >= 10 ? 'is-ok' : 'is-bad'">
                  {{ n.note == null ? 'En attente' : n.note >= 10 ? 'Validée' : 'Non validée' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modale de confirmation de signature (fond opaque) -->
    <div v-if="showSignModal" class="st-modal-overlay" @click.self="showSignModal = false">
      <div class="st-modal">
        <h3 class="st-modal-title">Signer le relevé</h3>
        <p class="st-modal-text">
          Vous vous apprêtez à signer le relevé de
          <strong>{{ releve ? releve.etudiant.nomComplet : '' }}</strong>
          (Semestre {{ releve ? releve.semestre : '' }}).
          Votre signature figurera sur le relevé.
        </p>
        <div class="st-modal-actions">
          <button type="button" class="st-modal-btn st-modal-cancel" @click="showSignModal = false">Annuler</button>
          <button type="button" class="st-modal-btn st-modal-confirm" @click="confirmSignReleve">Valider et signer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { UE_TYPES } from '../../stores/superieur'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import ExportMenu from '../../components/ExportMenu.vue'
import { exportToExcel } from '../../utils/exportExcel'
import { exportRelevePdf as exportRelevePdfUtil } from '../../utils/exportPdf'
import { makeSignatureDataUrl } from '../../utils/signatureImage'

const store = useSuperieurStore()
const authSup = useSuperieurAuthStore()
// Le directeur / l'admin ne SAISIT PAS les notes (grille en lecture seule) :
// seule l'enseignante de l'UE saisit. Le directeur / l'admin RELIT et SIGNE le relevé.
const canEditNotes = computed(() => authSup.role === 'enseignant')
const canSignReleve = computed(() => authSup.isAdmin)
const tabs = [
  { key: 'jury', label: 'Délibérations' },
  { key: 'releve', label: 'Relevé étudiant' },
  { key: 'saisie', label: 'Saisie par UE' },
]
const activeTab = ref('jury')

const selectedEtudiantId = ref('')
const releve = computed(() =>
  selectedEtudiantId.value ? store.releveEtudiant(selectedEtudiantId.value) : null
)

// ── Signature du relevé par le directeur ──
const releveSigned = computed(() =>
  !!(releve.value && store.isReleveSigned(selectedEtudiantId.value, releve.value.semestre))
)
const releveSignature = computed(() =>
  releve.value
    ? store.getReleveSignature(selectedEtudiantId.value, releve.value.semestre)
    : { signed: false }
)
const releveSignatureImg = computed(() =>
  releveSigned.value ? makeSignatureDataUrl(releveSignature.value.signedBy) : ''
)
// UE encore « en attente » de note : bloque la signature tant que > 0.
const pendingUE = computed(() =>
  releve.value ? releve.value.lignes.filter((l) => l.note == null).length : 0
)
const showSignModal = ref(false)
function openSignModal() {
  if (!canSignReleve.value || pendingUE.value > 0) return
  showSignModal.value = true
}
function confirmSignReleve() {
  if (!releve.value) return
  const dirName = authSup.profile?.displayName || 'Le Directeur'
  store.signReleve(selectedEtudiantId.value, releve.value.semestre, dirName)
  showSignModal.value = false
}
function cancelSignReleve() {
  if (!releve.value) return
  store.unsignReleve(selectedEtudiantId.value, releve.value.semestre)
}
function formatSignDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const selectedUEId = ref('')
const ueSelectionnee = computed(() => selectedUEId.value ? store.getUe(selectedUEId.value) : null)
const notesUE = computed(() => selectedUEId.value ? store.notesPourUE(selectedUEId.value) : [])
// Moyenne UE calculée uniquement sur les notes saisies (les « en attente » = null exclues)
const notesUENotees = computed(() => notesUE.value.filter((n) => n.note != null))
const moyenneUE = computed(() =>
  notesUENotees.value.length ? notesUENotees.value.reduce((s, n) => s + n.note, 0) / notesUENotees.value.length : 0
)
const nbValideesUE = computed(() => notesUE.value.filter((n) => n.note != null && n.note >= 10).length)
const nbEnAttenteUE = computed(() => notesUE.value.filter((n) => n.note == null).length)
const pctValideUE = computed(() =>
  notesUE.value.length ? Math.round((nbValideesUE.value / notesUE.value.length) * 100) : 0
)

// Stats globales pour les KPIs (synthèse des jurys)
const globalStats = computed(() => {
  const jurys = store.juryParPromotion
  const nbReleves = jurys.reduce((s, j) => s + j.nbEtudiants, 0)
  const admis = jurys.reduce((s, j) => s + j.nbAdmis, 0)
  const ajournes = jurys.reduce((s, j) => s + j.nbAjournes, 0)
  const moyenne = jurys.length
    ? (jurys.reduce((s, j) => s + j.moyennePromo * j.nbEtudiants, 0) / Math.max(nbReleves, 1))
    : 0
  // crédits validés/total : on s'appuie sur les relevés
  let ectsValides = 0
  let ectsTotal = 0
  for (const e of store.etudiants) {
    const r = store.releveEtudiant(e.id)
    if (!r) continue
    ectsValides += r.ectsValides
    ectsTotal += r.totalEcts
  }
  return {
    nbReleves,
    admis,
    ajournes,
    tauxReussite: nbReleves ? Math.round((admis / nbReleves) * 100) : 0,
    moyenne: Math.round(moyenne * 100) / 100,
    ectsValides,
    ectsTotal,
  }
})

// ── Export du relevé individuel (Excel / PDF) ──
const releveColumns = [
  { key: 'ue', label: 'UE', width: 48 },
  { key: 'credits', label: 'Crédits', width: 10 },
  { key: 'note', label: 'Note /20', width: 12 },
  { key: 'validation', label: 'Validation', width: 16 },
]
function releveRows() {
  const r = releve.value
  if (!r) return []
  return r.lignes.map((l) => ({
    ue: `${l.ueCode} — ${l.ueIntitule}`.trim(),
    credits: l.ects,
    note: l.note != null ? l.note.toFixed(2) : '—',
    validation: l.note == null ? 'En attente' : l.validee ? 'Validée' : 'Non validée',
  }))
}
function releveFilename() {
  const r = releve.value
  return `releve_${r.etudiant.matricule}_${r.semestre}`.replace(/[^\w-]+/g, '')
}
function releveTitle() {
  const r = releve.value
  const e = r.etudiant
  const meta = [`Semestre ${r.semestre}`, `Moyenne ${r.moyenne.toFixed(2)}/20`]
  if (r.mention) meta.push(`Mention ${r.mention}`)
  meta.push(r.admis ? 'Admis' : 'Ajourné')
  return `Relevé — ${e.nomComplet} (${e.matricule}) · ${meta.join(' · ')}`
}
function exportReleve() {
  if (!releve.value) return
  exportToExcel(releveRows(), releveColumns, releveFilename(), 'Relevé')
}
function exportRelevePdf() {
  const r = releve.value
  if (!r) return
  exportRelevePdfUtil({
    etudiant: r.etudiant.nomComplet,
    promotion: `${r.etudiant.programmeNom} — ${r.etudiant.anneeNom}`,
    semestre: r.semestre,
    moyenne: r.moyenne,
    mention: r.mention,
    decision: r.admis ? 'Admis' : 'Ajourné',
    lignes: r.lignes.map((l) => ({
      ueCode: l.ueCode,
      ueIntitule: l.ueIntitule,
      ects: l.ects,
      note: l.note,
      validation: l.note == null ? 'En attente' : l.validee ? 'Validée' : 'Non validée',
    })),
    signature: store.getReleveSignature(selectedEtudiantId.value, r.semestre),
    filename: releveFilename(),
    title: 'Relevé de notes semestriel',
  })
}

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
const typeLabel = (t) => UE_TYPES[t]?.label || t
</script>

<style scoped>
.sn-intro { margin-bottom: 18px; }
.sn-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px; font-weight: 800; color: var(--tx); margin: 0;
}
.sn-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

.sn-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.sn-kpi {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px;
}
.sn-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.sn-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px; font-weight: 800; color: var(--tx);
  margin: 6px 0 4px; line-height: 1;
}
.sn-kpi-unit { font-size: 16px; font-weight: 700; color: var(--tx2); }
.sn-kpi-foot { font-size: 12px; color: var(--tx2); }
.sn-kpi-foot.is-ok { color: var(--success); }
.sn-kpi-foot.is-warn { color: var(--warn); }

.sn-tabs { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.sn-tab {
  padding: 9px 16px;
  background: var(--card); border: 1.5px solid var(--card-border);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600; color: var(--tx2);
  cursor: pointer; transition: all 0.15s ease;
}
.sn-tab:hover { border-color: var(--pr); color: var(--pr); }
.sn-tab.active { background: var(--pr); border-color: var(--pr); color: #fff; }

.sn-card {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  padding: 18px 20px;
  overflow-x: auto; /* relevés/jurys larges : défile au lieu de déborder */
}

/* Tables */
.sn-table { width: 100%; border-collapse: collapse; }
.sn-table thead th {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; color: var(--tx3);
  text-align: left; padding: 9px 10px;
  border-bottom: 1px solid var(--divider); white-space: nowrap;
}
.sn-table th.num { text-align: right; }
.sn-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 10px 10px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.sn-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.sn-table tbody tr:last-child td { border-bottom: none; }
.is-ok { color: var(--success); }
.is-bad { color: var(--danger); }

.sn-promo { display: flex; align-items: center; gap: 8px; }
.sn-niveau {
  display: inline-block; padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
}
.sn-niveau.n-licence { background: var(--pr-light); color: var(--pr); }
.sn-niveau.n-master { background: var(--gold-light); color: var(--gold); }
.sn-niveau.n-doctorat { background: rgba(124, 58, 237, 0.12); color: #6D28D9; }
.sn-promo-nom { font-weight: 600; color: var(--tx); }

.sn-rate { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; }
.sn-rate-track {
  width: 90px; height: 7px;
  background: var(--input-bg); border-radius: 100px; overflow: hidden;
}
.sn-rate-fill { height: 100%; border-radius: 100px; }
.sn-rate-fill.is-ok { background: var(--success); }
.sn-rate-fill.is-mid { background: var(--warn); }
.sn-rate-fill.is-bad { background: var(--danger); }
.sn-rate-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: var(--tx); min-width: 38px; text-align: right;
}

/* Toolbar */
.sn-toolbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px; flex-wrap: wrap;
}
.sn-label-inline {
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sn-select, .sn-select-large {
  height: 38px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none;
}
.sn-select-large { min-width: 360px; }
.sn-select:focus { border-color: var(--pr); }
.sn-ue-info {
  font-size: 13px; color: var(--tx2);
  margin-left: auto;
}

/* Relevé */
.sn-releve-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding: 16px;
  background: var(--input-bg); border-radius: 12px;
  margin-bottom: 14px;
}
.sn-releve-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 800; color: var(--tx);
}
.sn-releve-sub { font-size: 13px; color: var(--tx2); margin-top: 3px; }
.sn-releve-result {
  display: flex; flex-direction: column; gap: 4px; text-align: right;
}
.sn-result-line { display: flex; align-items: baseline; justify-content: flex-end; gap: 8px; }
.sn-result-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sn-result-val {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 800; color: var(--tx);
}
.sn-result-val small { font-size: 12px; font-weight: 600; color: var(--tx2); }
.sn-result-decision { display: flex; align-items: center; gap: 8px; margin-top: 6px; justify-content: flex-end; }
.sn-decision-pill {
  padding: 4px 12px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 800;
}
.sn-decision-pill.is-admis { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sn-decision-pill.is-ajourne { background: rgba(217, 48, 37, 0.08); color: var(--danger); }
.sn-mention {
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 700; color: var(--gold);
}
.sn-releve-table thead th { background: var(--input-bg); }

.sn-ue-code {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
}
.sn-ue-nom { font-weight: 600; color: var(--tx); }
.sn-mat {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600; color: var(--tx2);
}
.sn-val-pill {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sn-val-pill.is-ok { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sn-val-pill.is-bad { background: rgba(217, 48, 37, 0.07); color: var(--danger); }
.sn-val-pill.is-wait { background: var(--input-bg); color: var(--tx3); }

/* Saisie par UE : champs CC / Examen (fond opaque, pas de classe « -card ») */
.sn-note-input {
  width: 74px; padding: 6px 8px;
  font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
  color: var(--tx); text-align: right;
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 8px; outline: none;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s ease;
}
.sn-note-input:focus { border-color: var(--pr); }
.sn-note-wait { color: var(--tx3); font-weight: 600; }
.sn-legend {
  margin-left: auto;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 600; color: var(--tx3);
}
.sn-export { margin-left: auto; }

.sn-tag {
  display: inline-block; padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700; white-space: nowrap;
}
.sn-tag.t-fondamentale { background: var(--pr-light); color: var(--pr); }
.sn-tag.t-methodologique { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sn-tag.t-professionnelle { background: rgba(184, 137, 42, 0.12); color: var(--gold); }
.sn-tag.t-electif { background: rgba(99, 102, 241, 0.12); color: #6366F1; }

.sn-saisie-summary {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 11px 14px;
  background: var(--input-bg); border-radius: 10px;
  font-size: 13.5px; color: var(--tx2);
  margin-bottom: 14px;
}
.sn-saisie-summary strong { color: var(--tx); font-weight: 700; }
.sn-dot { color: var(--tx3); }

.sn-empty { padding: 26px; text-align: center; color: var(--tx3); font-size: 13.5px; }

@media (max-width: 1000px) {
  .sn-kpis { grid-template-columns: repeat(2, 1fr); }
  .sn-select-large { min-width: 0; flex: 1; }
}
@media (max-width: 600px) {
  .sn-releve-head { flex-direction: column; align-items: flex-start; }
  .sn-releve-result { text-align: left; }
  .sn-result-line, .sn-result-decision { justify-content: flex-start; }
}

/* Lecture seule (directeur) : bandeau au-dessus de la grille de saisie */
.sn-readonly-hint {
  margin: 0 0 12px;
  padding: 9px 12px;
  background: var(--input-bg); border-radius: 9px;
  font-size: 13px; color: var(--tx2);
}

/* Signature du directeur sur le relevé (fond opaque, aucune classe « -card ») */
.st-sign {
  margin-top: 18px;
  padding: 16px 18px;
  background: var(--input-bg); border-radius: 12px;
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  text-align: right;
}
.st-sign-head {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.st-sign-done { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.st-sign-img { width: 170px; height: auto; margin-bottom: 2px; }
.st-sign-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  background: rgba(27, 138, 90, 0.12); color: var(--success);
  font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 700;
}
.st-sign-name {
  font-family: 'Poppins', sans-serif;
  font-size: 14px; font-weight: 700; color: var(--tx);
}
.st-sign-date { font-size: 12px; color: var(--tx2); }
.st-sign-undo {
  margin-top: 4px;
  background: none; border: none; padding: 2px 0;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600;
  color: var(--danger); cursor: pointer; text-decoration: underline;
}
.st-sign-todo { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.st-sign-btn {
  padding: 10px 18px;
  background: var(--pr); border: none; border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700; color: #fff;
  cursor: pointer; transition: opacity 0.15s ease;
}
.st-sign-btn:hover:not(:disabled) { opacity: 0.9; }
.st-sign-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.st-sign-hint { font-size: 12.5px; color: var(--warn); }
.st-sign-line {
  width: 200px; height: 0; margin-top: 26px;
  border-bottom: 1.5px solid var(--tx3);
}

/* Modale de confirmation (fond OPAQUE #fff, aucune classe « -card ») */
.st-modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(16, 24, 40, 0.45);
}
.st-modal {
  width: 100%; max-width: 440px;
  padding: 22px 24px;
  background: #fff !important;
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(16, 24, 40, 0.28);
}
.st-modal-title {
  margin: 0 0 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx);
}
.st-modal-text { margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: var(--tx2); }
.st-modal-text strong { color: var(--tx); font-weight: 700; }
.st-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.st-modal-btn {
  padding: 9px 16px; border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700;
  cursor: pointer; border: 1.5px solid transparent;
}
.st-modal-cancel { background: #fff; border-color: var(--divider); color: var(--tx2); }
.st-modal-cancel:hover { background: rgba(0, 0, 0, 0.04); }
.st-modal-confirm { background: var(--pr); color: #fff; }
.st-modal-confirm:hover { opacity: 0.9; }
</style>
