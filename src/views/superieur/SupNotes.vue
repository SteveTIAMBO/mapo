<template>
  <div class="sn">
    <div class="sn-intro">
      <h1 class="sn-h1">Notes &amp; relevés</h1>
      <p class="sn-sub">
        Sélectionnez une promotion pour consulter et signer les relevés de notes des étudiants.
      </p>
    </div>

    <!-- ══════════ Vue 1 : Promotions (cartes cliquables) ══════════ -->
    <template v-if="view === 'promos'">
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
          <div class="sn-kpi-label">Relevés signés</div>
          <div class="sn-kpi-value">{{ globalStats.nbSignes }}<span class="sn-kpi-unit">/{{ globalStats.nbReleves }}</span></div>
          <div class="sn-kpi-foot" :class="globalStats.nbSignes >= globalStats.nbReleves && globalStats.nbReleves ? 'is-ok' : ''">
            {{ globalStats.nbReleves ? Math.round((globalStats.nbSignes / globalStats.nbReleves) * 100) : 0 }}% du total
          </div>
        </div>
      </div>

      <div class="sn-promos-grid">
        <button
          v-for="j in promoCards"
          :key="j.promotion.id"
          class="sn-promo-tile"
          type="button"
          @click="openPromo(j.promotion.id)"
        >
          <div class="sn-tile-top">
            <span class="sn-niveau" :class="`n-${j.promotion.niveau.toLowerCase()}`">{{ j.promotion.niveau }}</span>
            <span class="sn-tile-sign" :class="j.nbEtudiants && j.nbSignes === j.nbEtudiants ? 'is-done' : ''">
              {{ j.nbSignes }}/{{ j.nbEtudiants }} signés
            </span>
          </div>
          <div class="sn-tile-name">{{ j.promotion.programmeNom }}</div>
          <div class="sn-tile-annee">{{ j.promotion.anneeNom }} · Semestre 2 en cours</div>
          <div class="sn-tile-stats">
            <div class="sn-tile-stat">
              <span class="sn-tile-num">{{ j.nbEtudiants }}</span>
              <span class="sn-tile-lbl">étudiants</span>
            </div>
            <div class="sn-tile-stat">
              <span class="sn-tile-num">{{ j.moyennePromo.toFixed(2) }}</span>
              <span class="sn-tile-lbl">moyenne</span>
            </div>
            <div class="sn-tile-stat">
              <span class="sn-tile-num">{{ j.tauxReussite }}%</span>
              <span class="sn-tile-lbl">réussite</span>
            </div>
          </div>
          <div class="sn-tile-cta">Ouvrir la promotion →</div>
        </button>
      </div>
    </template>

    <!-- ══════════ Vue 2 : Promotion ouverte (liste des étudiants) ══════════ -->
    <section v-else-if="view === 'promo' && currentPromo" class="sn-card">
      <button class="sn-back" type="button" @click="backToPromos">← Toutes les promotions</button>

      <div class="sn-promo-header">
        <div>
          <div class="sn-promo-h-title">
            <span class="sn-niveau" :class="`n-${currentPromo.promotion.niveau.toLowerCase()}`">{{ currentPromo.promotion.niveau }}</span>
            {{ currentPromo.promotion.programmeNom }}
          </div>
          <div class="sn-promo-h-sub">
            {{ currentPromo.promotion.anneeNom }} · Semestre {{ promoSem }} · {{ promoStudents.length }} étudiants
          </div>
        </div>
        <div class="sn-promo-h-actions">
          <span class="sn-sign-progress">{{ promoSignedCount }}/{{ promoStudents.length }} relevés signés</span>
          <button
            v-if="canSignReleve"
            class="sn-bulk-btn"
            type="button"
            :disabled="!promoSignableIds.length"
            :title="!promoSignableIds.length ? 'Tous les relevés signables sont déjà signés' : `Signer ${promoSignableIds.length} relevé(s)`"
            @click="openBulkSignModal"
          >Signer toute la promo</button>
        </div>
      </div>

      <div class="sn-sem-toggle">
        <button type="button" class="sn-sem-btn" :class="{ active: semestreView === 1 }" @click="semestreView = 1">Semestre 1</button>
        <button type="button" class="sn-sem-btn" :class="{ active: semestreView === 2 }" @click="semestreView = 2">Semestre 2 <span class="sn-sem-tag">en cours</span></button>
      </div>

      <div v-if="semestreView === 1" class="sn-sem-placeholder">
        <div class="sn-sem-ph-title">Semestre 1</div>
        <p>Les relevés du <strong>Semestre 1</strong> seront disponibles prochainement. Les relevés en ligne concernent le <strong>Semestre 2</strong> (en cours).</p>
      </div>
      <table v-else class="sn-table">
        <thead>
          <tr>
            <th>Matricule</th>
            <th>Étudiant</th>
            <th class="num">Moyenne</th>
            <th>Mention</th>
            <th>Décision</th>
            <th>Relevé</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in promoRows" :key="r.student.id" class="sn-row-click" @click="openReleve(r.index)">
            <td class="sn-mat">{{ r.student.matricule }}</td>
            <td>{{ r.student.nomComplet }}</td>
            <td class="num">
              <strong :class="r.moyenne == null ? '' : r.moyenne < 10 ? 'is-bad' : r.moyenne >= 12 ? 'is-ok' : ''">
                {{ r.moyenne != null ? r.moyenne.toFixed(2) : '—' }}
              </strong>
            </td>
            <td class="sn-cell-mention">{{ r.mention || '—' }}</td>
            <td>
              <span class="sn-decision-pill" :class="r.admis ? 'is-admis' : 'is-ajourne'">
                {{ r.admis ? 'Admis' : 'Ajourné' }}
              </span>
            </td>
            <td>
              <span class="sn-sign-tag" :class="r.signed ? 'is-signed' : 'is-unsigned'">
                {{ r.signed ? 'Signé' : 'Non signé' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ══════════ Vue 3 : Relevé d'un étudiant ══════════ -->
    <section v-else-if="view === 'releve' && currentPromo" class="sn-card">
      <div class="sn-releve-bar">
        <button class="sn-back" type="button" @click="backToPromo">← {{ currentPromo.promotion.programmeNom }}</button>
        <div class="sn-releve-bar-right">
          <div class="sn-pager">
            <button class="sn-pager-btn" type="button" :disabled="currentIndex <= 0" @click="prevReleve">‹ Précédent</button>
            <span class="sn-pager-pos">{{ currentIndex + 1 }} / {{ promoStudents.length }}</span>
            <button class="sn-pager-btn" type="button" :disabled="currentIndex >= promoStudents.length - 1" @click="nextReleve">Suivant ›</button>
          </div>
          <ExportMenu
            :excel="exportReleve"
            :pdf="exportRelevePdf"
            :disabled="!releve || !(releve.lignes && releve.lignes.length)"
          />
        </div>
      </div>

      <div class="sn-sem-toggle">
        <button type="button" class="sn-sem-btn" :class="{ active: semestreView === 1 }" @click="semestreView = 1">Semestre 1</button>
        <button type="button" class="sn-sem-btn" :class="{ active: semestreView === 2 }" @click="semestreView = 2">Semestre 2 <span class="sn-sem-tag">en cours</span></button>
      </div>

      <div v-if="semestreView === 1" class="sn-sem-placeholder">
        <div class="sn-sem-ph-title">Semestre 1</div>
        <p>Le relevé du <strong>Semestre 1</strong> sera disponible prochainement. Le relevé affiché concerne le <strong>Semestre 2</strong> (en cours).</p>
      </div>

      <div v-else-if="releve">
        <div class="sn-releve-head">
          <div>
            <div class="sn-releve-title">{{ releve.etudiant.nomComplet }}</div>
            <div class="sn-releve-sub">
              {{ releve.etudiant.programmeNom }} · {{ releve.etudiant.anneeNom }} · Semestre 2
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

          <div v-else class="st-sign-line" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <!-- Modale de confirmation de signature (fond opaque) -->
    <div v-if="showSignModal" class="st-modal-overlay" @click.self="showSignModal = false">
      <div class="st-modal">
        <h3 class="st-modal-title">{{ signMode === 'bulk' ? 'Signer toute la promotion' : 'Signer le relevé' }}</h3>
        <p v-if="signMode === 'bulk'" class="st-modal-text">
          Vous vous apprêtez à signer <strong>{{ promoSignableIds.length }}</strong>
          relevé{{ promoSignableIds.length > 1 ? 's' : '' }} non signé{{ promoSignableIds.length > 1 ? 's' : '' }}
          de <strong>{{ currentPromo ? currentPromo.promotion.programmeNom : '' }}</strong>
          (Semestre {{ promoSem }}). Votre signature sera apposée sur chacun.
        </p>
        <p v-else class="st-modal-text">
          Vous vous apprêtez à signer le relevé de
          <strong>{{ releve ? releve.etudiant.nomComplet : '' }}</strong>
          (Semestre {{ releve ? releve.semestre : '' }}).
          Votre signature figurera sur le relevé.
        </p>
        <div class="st-modal-actions">
          <button type="button" class="st-modal-btn st-modal-cancel" @click="showSignModal = false">Annuler</button>
          <button type="button" class="st-modal-btn st-modal-confirm" @click="confirmSign">
            {{ signMode === 'bulk' ? 'Signer la promotion' : 'Valider et signer' }}
          </button>
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
// Le directeur / l'admin ne saisit pas les notes : il RELIT et SIGNE le relevé.
const canSignReleve = computed(() => authSup.isAdmin)
const dirName = () => authSup.profile?.displayName || 'Le Directeur'

// ── Navigation : Promotions → étudiants → relevé ──
const view = ref('promos') // 'promos' | 'promo' | 'releve'
const currentPromoId = ref('')
const currentIndex = ref(0)
// Semestre affiché : 2 = semestre en cours (données réelles), 1 = à venir (placeholder).
// Toutes les promos sont au 2e semestre de leur année → affichage uniforme « Semestre 1/2 ».
const semestreView = ref(2)

// Cartes de promotion — scopées au campus actif via store.etudiants (etudiantsVisibles),
// PAS via juryParPromotion (qui agrège tous les campus) → cartes et détail cohérents.
// On ne montre que les promotions ayant des étudiants dans le périmètre courant.
const promoCards = computed(() =>
  store.promotions
    .map((p) => {
      const students = store.etudiants.filter((e) => e.promotionId === p.id)
      if (!students.length) return null
      const releves = students.map((s) => store.releveEtudiant(s.id)).filter(Boolean)
      const admis = releves.filter((r) => r.admis).length
      const moyenne = releves.length
        ? releves.reduce((s2, r) => s2 + r.moyenne, 0) / releves.length
        : 0
      const sem = p.semestreCourant
      const signed = students.reduce((n, s) => n + (store.isReleveSigned(s.id, sem) ? 1 : 0), 0)
      return {
        promotion: p,
        nbEtudiants: students.length,
        moyennePromo: Math.round(moyenne * 100) / 100,
        tauxReussite: students.length ? Math.round((admis / students.length) * 100) : 0,
        nbSignes: signed,
      }
    })
    .filter(Boolean)
)

const currentPromo = computed(() =>
  promoCards.value.find((j) => j.promotion.id === currentPromoId.value) || null
)
const promoSem = computed(() => currentPromo.value?.promotion.semestreCourant || '')

// Étudiants de la promo, ordre stable (par matricule) pour la pagination
const promoStudents = computed(() =>
  store.etudiants
    .filter((e) => e.promotionId === currentPromoId.value)
    .slice()
    .sort((a, b) => String(a.matricule).localeCompare(String(b.matricule)))
)

const promoRows = computed(() =>
  promoStudents.value.map((s, i) => {
    const r = store.releveEtudiant(s.id)
    return {
      index: i,
      student: s,
      moyenne: r ? r.moyenne : null,
      mention: r ? r.mention : '',
      admis: r ? r.admis : false,
      signed: store.isReleveSigned(s.id, promoSem.value),
    }
  })
)
const promoSignedCount = computed(() => promoRows.value.filter((r) => r.signed).length)
// Relevés signables = non signés ET complets (aucune UE en attente)
const promoSignableIds = computed(() =>
  promoStudents.value
    .filter((s) => {
      if (store.isReleveSigned(s.id, promoSem.value)) return false
      const r = store.releveEtudiant(s.id)
      return r && r.lignes.every((l) => l.note != null)
    })
    .map((s) => s.id)
)

function openPromo(id) { currentPromoId.value = id; currentIndex.value = 0; view.value = 'promo' }
function openReleve(i) { currentIndex.value = i; view.value = 'releve' }
function backToPromos() { view.value = 'promos' }
function backToPromo() { view.value = 'promo' }
function prevReleve() { if (currentIndex.value > 0) currentIndex.value-- }
function nextReleve() { if (currentIndex.value < promoStudents.value.length - 1) currentIndex.value++ }

// ── Relevé courant ──
const selectedEtudiantId = computed(() => promoStudents.value[currentIndex.value]?.id || '')
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
// UE encore « en attente » : bloque la signature tant que > 0.
const pendingUE = computed(() =>
  releve.value ? releve.value.lignes.filter((l) => l.note == null).length : 0
)

const showSignModal = ref(false)
const signMode = ref('single') // 'single' | 'bulk'
function openSignModal() {
  if (!canSignReleve.value || pendingUE.value > 0) return
  signMode.value = 'single'
  showSignModal.value = true
}
function openBulkSignModal() {
  if (!canSignReleve.value || !promoSignableIds.value.length) return
  signMode.value = 'bulk'
  showSignModal.value = true
}
function confirmSign() {
  if (signMode.value === 'bulk') {
    store.signReleves(promoSignableIds.value, promoSem.value, dirName())
  } else if (releve.value) {
    store.signReleve(selectedEtudiantId.value, releve.value.semestre, dirName())
  }
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

// ── KPIs globaux (scopés au campus actif, cohérents avec les cartes) ──
const globalStats = computed(() => {
  const students = store.etudiants
  const releves = students.map((s) => store.releveEtudiant(s.id)).filter(Boolean)
  const nbReleves = releves.length
  const admis = releves.filter((r) => r.admis).length
  const moyenne = nbReleves ? releves.reduce((s, r) => s + r.moyenne, 0) / nbReleves : 0
  let nbSignes = 0
  for (const s of students) {
    const r = store.releveEtudiant(s.id)
    if (r && store.isReleveSigned(s.id, r.semestre)) nbSignes++
  }
  return {
    nbReleves,
    admis,
    ajournes: nbReleves - admis,
    tauxReussite: nbReleves ? Math.round((admis / nbReleves) * 100) : 0,
    moyenne: Math.round(moyenne * 100) / 100,
    nbSignes,
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

/* Grille des cartes de promotion */
.sn-promos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.sn-promo-tile {
  display: flex; flex-direction: column; gap: 10px;
  text-align: left; cursor: pointer;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  padding: 18px;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.sn-promo-tile:hover {
  border-color: var(--pr);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.12);
}
.sn-tile-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sn-tile-sign {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700; color: var(--tx3);
  padding: 3px 9px; border-radius: 100px; background: var(--input-bg);
}
.sn-tile-sign.is-done { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sn-tile-name {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px; font-weight: 700; color: var(--tx); line-height: 1.3;
}
.sn-tile-annee { font-size: 12.5px; color: var(--tx2); margin-top: -4px; }
.sn-tile-stats {
  display: flex; gap: 8px; margin-top: 2px;
  border-top: 1px solid var(--divider); padding-top: 12px;
}
.sn-tile-stat { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sn-tile-num {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); font-variant-numeric: tabular-nums;
}
.sn-tile-lbl {
  font-size: 10.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.sn-tile-cta {
  margin-top: 2px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: var(--pr);
}

.sn-card {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  padding: 18px 20px;
  overflow-x: auto;
}

/* Fil d'Ariane / retour */
.sn-back {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; padding: 0 0 14px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--pr); cursor: pointer;
}
.sn-back:hover { text-decoration: underline; }

/* En-tête de promotion */
.sn-promo-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding: 14px 16px; margin-bottom: 14px;
  background: var(--input-bg); border-radius: 12px;
}
.sn-promo-h-title {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 800; color: var(--tx);
}
.sn-promo-h-sub { font-size: 13px; color: var(--tx2); margin-top: 4px; }
.sn-promo-h-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sn-sign-progress {
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; color: var(--tx2);
}
.sn-bulk-btn {
  padding: 9px 16px;
  background: var(--pr); border: none; border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; color: #fff;
  cursor: pointer; transition: opacity 0.15s ease;
}
.sn-bulk-btn:hover:not(:disabled) { opacity: 0.9; }
.sn-bulk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sélecteur de semestre (Semestre 1 / Semestre 2) */
.sn-sem-toggle {
  display: inline-flex; gap: 4px; margin-bottom: 14px;
  padding: 4px; background: var(--input-bg); border-radius: 11px;
}
.sn-sem-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border: none; border-radius: 8px;
  background: transparent;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--tx2);
  cursor: pointer; transition: background 0.15s ease, color 0.15s ease;
}
.sn-sem-btn:hover { color: var(--pr); }
.sn-sem-btn.active { background: #fff; color: var(--pr); box-shadow: 0 1px 3px rgba(16,24,40,0.1); }
.sn-sem-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
  padding: 1px 6px; border-radius: 100px; background: rgba(27,138,90,0.12); color: var(--success);
}
.sn-sem-placeholder {
  padding: 28px 20px; text-align: center;
  background: var(--input-bg); border-radius: 12px;
  color: var(--tx2); font-size: 13.5px; line-height: 1.55;
}
.sn-sem-placeholder p { margin: 6px 0 0; }
.sn-sem-placeholder strong { color: var(--tx); font-weight: 700; }
.sn-sem-ph-title {
  font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 800; color: var(--tx3);
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

.sn-row-click { cursor: pointer; transition: background 0.12s ease; }
.sn-row-click:hover { background: var(--input-bg); }
.sn-cell-mention { color: var(--tx2); font-size: 13px; }

.sn-niveau {
  display: inline-block; padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  background: var(--input-bg); color: var(--tx2);
}
.sn-niveau.n-licence { background: var(--pr-light); color: var(--pr); }
.sn-niveau.n-master { background: var(--gold-light); color: var(--gold); }
.sn-niveau.n-doctorat { background: rgba(124, 58, 237, 0.12); color: #6D28D9; }

.sn-mat {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600; color: var(--tx2);
}
.sn-decision-pill {
  padding: 4px 12px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; font-weight: 800;
}
.sn-decision-pill.is-admis { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sn-decision-pill.is-ajourne { background: rgba(217, 48, 37, 0.08); color: var(--danger); }
.sn-sign-tag {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 700;
}
.sn-sign-tag.is-signed { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sn-sign-tag.is-unsigned { background: var(--input-bg); color: var(--tx3); }

/* Barre relevé : retour + pagination + export */
.sn-releve-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 6px;
}
.sn-releve-bar .sn-back { padding-bottom: 0; }
.sn-releve-bar-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.sn-pager { display: inline-flex; align-items: center; gap: 6px; }
.sn-pager-btn {
  padding: 7px 12px;
  background: var(--card); border: 1px solid var(--divider); border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--tx);
  cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease;
}
.sn-pager-btn:hover:not(:disabled) { border-color: var(--pr); color: var(--pr); }
.sn-pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sn-pager-pos {
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--tx2);
  min-width: 54px; text-align: center; font-variant-numeric: tabular-nums;
}

/* Relevé */
.sn-releve-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding: 16px;
  background: var(--input-bg); border-radius: 12px;
  margin: 12px 0 14px;
}
.sn-releve-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 800; color: var(--tx);
}
.sn-releve-sub { font-size: 13px; color: var(--tx2); margin-top: 3px; }
.sn-releve-result { display: flex; flex-direction: column; gap: 4px; text-align: right; }
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
.sn-val-pill {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sn-val-pill.is-ok { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sn-val-pill.is-bad { background: rgba(217, 48, 37, 0.07); color: var(--danger); }
.sn-val-pill.is-wait { background: var(--input-bg); color: var(--tx3); }
.sn-note-wait { color: var(--tx3); font-weight: 600; }

.sn-tag {
  display: inline-block; padding: 2px 8px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700; white-space: nowrap;
}
.sn-tag.t-fondamentale { background: var(--pr-light); color: var(--pr); }
.sn-tag.t-methodologique { background: rgba(27, 138, 90, 0.12); color: var(--success); }
.sn-tag.t-professionnelle { background: rgba(184, 137, 42, 0.12); color: var(--gold); }
.sn-tag.t-electif { background: rgba(99, 102, 241, 0.12); color: #6366F1; }

@media (max-width: 1000px) {
  .sn-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .sn-releve-head { flex-direction: column; align-items: flex-start; }
  .sn-releve-result { text-align: left; }
  .sn-result-line, .sn-result-decision { justify-content: flex-start; }
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
  width: 100%; max-width: 460px;
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
