<template>
  <div class="sd">
    <div class="sd-intro">
      <h1 class="sd-h1">Diplômes</h1>
      <p class="sd-sub">
        Émission de diplômes <strong>vérifiables</strong> (code public + empreinte cryptographique).
        Chaque diplôme est vérifiable en ligne sur la page publique.
      </p>
    </div>

    <div class="sd-kpis">
      <div class="sd-kpi">
        <div class="sd-kpi-lab">Diplômes émis</div>
        <div class="sd-kpi-val">{{ supDiplomes.length }}</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-lab">Valides</div>
        <div class="sd-kpi-val is-ok">{{ nbValides }}</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-lab">Révoqués</div>
        <div class="sd-kpi-val" :class="{ 'is-bad': nbRevoques > 0 }">{{ nbRevoques }}</div>
      </div>
      <div class="sd-kpi sd-kpi-verify">
        <div class="sd-kpi-lab">Vérification publique</div>
        <a class="sd-verify-link" :href="verifyUrl" target="_blank" rel="noopener">Ouvrir la page ↗</a>
      </div>
    </div>

    <!-- Émettre -->
    <section class="sd-card">
      <div class="sd-card-head">
        <h2 class="sd-h2">Émettre des diplômes</h2>
        <select v-model="selectedPromoId" class="sd-select">
          <option v-for="p in terminalPromos" :key="p.id" :value="p.id">
            {{ p.niveau }} — {{ p.programmeNom }} ({{ p.anneeNom }})
          </option>
        </select>
      </div>

      <template v-if="selectedPromo">
        <p class="sd-note">
          Diplôme délivré : <strong>{{ typeLabel(typeForPromo(selectedPromo)) }}</strong> ·
          {{ admisRows.length }} admis sur {{ promoStudents.length }} ·
          {{ dejaEmisCount }} déjà émis
          <button
            v-if="canEmit && aEmettreIds.length"
            class="sd-bulk-btn"
            type="button"
            @click="emettreTous"
            :disabled="busy"
          >Émettre pour tous les admis ({{ aEmettreIds.length }})</button>
        </p>

        <table v-if="admisRows.length" class="sd-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Étudiant</th>
              <th class="num">Moyenne</th>
              <th>Mention</th>
              <th>Diplôme</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in admisRows" :key="r.student.id">
              <td class="sd-mat">{{ r.student.matricule }}</td>
              <td>{{ r.student.nomComplet }}</td>
              <td class="num">{{ r.moyenne != null ? r.moyenne.toFixed(2) : '—' }}</td>
              <td>{{ r.mention || '—' }}</td>
              <td>
                <span v-if="r.diplome" class="sd-code">{{ r.diplome.code }}</span>
                <button
                  v-else-if="canEmit"
                  class="sd-emit-btn"
                  type="button"
                  :disabled="busy"
                  @click="emettreUn(r.student)"
                >Émettre</button>
                <span v-else class="sd-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="sd-empty">Aucun étudiant admis dans cette promotion.</p>
      </template>
      <p v-else class="sd-empty">Aucune promotion diplômante (fin de cycle) disponible.</p>
    </section>

    <!-- Registre -->
    <section class="sd-card">
      <h2 class="sd-h2">Diplômes émis</h2>
      <table v-if="supDiplomes.length" class="sd-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Étudiant</th>
            <th>Diplôme</th>
            <th>Mention</th>
            <th>Année</th>
            <th>Émis le</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in supDiplomes" :key="d.id">
            <td><span class="sd-code">{{ d.code }}</span></td>
            <td>{{ d.eleveName }}</td>
            <td>{{ d.typeLabel }}</td>
            <td>{{ d.mention || '—' }}</td>
            <td>{{ d.annee }}</td>
            <td>{{ formatDate(d.emisLe) }}</td>
            <td>
              <span class="sd-statut" :class="d.statut === 'revoque' ? 'is-bad' : 'is-ok'">
                {{ d.statut === 'revoque' ? 'Révoqué' : 'Valide' }}
              </span>
            </td>
            <td class="sd-actions">
              <a class="sd-link" :href="verifyUrl" target="_blank" rel="noopener" title="Vérifier">Vérifier</a>
              <button
                v-if="canEmit && d.statut !== 'revoque'"
                class="sd-revoke"
                type="button"
                @click="askRevoke(d)"
              >Révoquer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="sd-empty">Aucun diplôme émis pour l'instant.</p>
    </section>

    <!-- Confirmation de révocation (fond opaque) -->
    <div v-if="revokeTarget" class="sd-modal-overlay" @click.self="revokeTarget = null">
      <div class="sd-modal">
        <h3 class="sd-modal-title">Révoquer le diplôme</h3>
        <p class="sd-modal-text">
          Révoquer le diplôme <strong>{{ revokeTarget.code }}</strong> de
          <strong>{{ revokeTarget.eleveName }}</strong> ? Le diplôme apparaîtra comme
          « révoqué » à la vérification.
        </p>
        <div class="sd-modal-actions">
          <button type="button" class="sd-modal-btn sd-modal-cancel" @click="revokeTarget = null">Annuler</button>
          <button type="button" class="sd-modal-btn sd-modal-confirm" @click="confirmRevoke">Révoquer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useDiplomesStore, SUP_DIPLOME_TYPES } from '../../stores/diplomes'

const store = useSuperieurStore()
const authSup = useSuperieurAuthStore()
const diplomes = useDiplomesStore()

const canEmit = computed(() => authSup.isAdmin)
const busy = ref(false)
const SUP_KEYS = SUP_DIPLOME_TYPES.map((t) => t.key)
const verifyUrl = `${location.origin}/verifier`

function typeLabel(key) { return SUP_DIPLOME_TYPES.find((t) => t.key === key)?.label || key }
function typeForPromo(promo) {
  const n = (promo?.niveau || '').toLowerCase()
  if (n.includes('bts')) return 'bts'
  if (n.includes('dut')) return 'dut'
  if (n.includes('master')) return 'master'
  if (n.includes('doctorat')) return 'doctorat'
  return 'licence'
}

// Promotions « diplômantes » = dernière année de chaque cycle (rang max par programme)
const terminalPromos = computed(() => {
  const maxRang = {}
  for (const p of store.promotions) {
    maxRang[p.programmeId] = Math.max(maxRang[p.programmeId] || 0, p.rang || 0)
  }
  // On ne garde que les promotions terminales ayant des étudiants dans le périmètre courant
  return store.promotions.filter(
    (p) => p.rang === maxRang[p.programmeId] && store.etudiants.some((e) => e.promotionId === p.id)
  )
})

const selectedPromoId = ref('')
const selectedPromo = computed(
  () => terminalPromos.value.find((p) => p.id === selectedPromoId.value) || terminalPromos.value[0] || null
)
// Sélection par défaut = 1re promo terminale
if (!selectedPromoId.value && terminalPromos.value[0]) selectedPromoId.value = terminalPromos.value[0].id

const promoStudents = computed(() =>
  selectedPromo.value ? store.etudiants.filter((e) => e.promotionId === selectedPromo.value.id) : []
)

function diplomaFor(studentId) {
  return diplomes.diplomes.find((d) => d.eleveId === studentId && SUP_KEYS.includes(d.type)) || null
}

const admisRows = computed(() =>
  promoStudents.value
    .map((s) => {
      const r = store.releveEtudiant(s.id)
      return { student: s, moyenne: r ? r.moyenne : null, mention: r ? r.mention : '', admis: r ? r.admis : false, diplome: diplomaFor(s.id) }
    })
    .filter((r) => r.admis)
)
const dejaEmisCount = computed(() => admisRows.value.filter((r) => r.diplome).length)
const aEmettreIds = computed(() => admisRows.value.filter((r) => !r.diplome).map((r) => r.student.id))

const supDiplomes = computed(() => diplomes.diplomesSorted.filter((d) => SUP_KEYS.includes(d.type)))
const nbValides = computed(() => supDiplomes.value.filter((d) => d.statut !== 'revoque').length)
const nbRevoques = computed(() => supDiplomes.value.filter((d) => d.statut === 'revoque').length)

async function emettreUn(student) {
  if (!canEmit.value || busy.value || !selectedPromo.value) return
  busy.value = true
  try {
    const r = store.releveEtudiant(student.id)
    await diplomes.emettre({
      eleveId: student.id,
      eleveName: student.nomComplet,
      type: typeForPromo(selectedPromo.value),
      mention: r?.mention || '',
      annee: ECOLE.anneeAcademique,
      ecoleNom: ECOLE.nom,
      ecoleAcronyme: ECOLE.sigle,
      emisPar: authSup.profile?.displayName || 'Direction',
    })
  } finally {
    busy.value = false
  }
}

async function emettreTous() {
  if (!canEmit.value || busy.value) return
  const ids = [...aEmettreIds.value]
  busy.value = true
  try {
    for (const id of ids) {
      const s = promoStudents.value.find((x) => x.id === id)
      if (!s) continue
      const r = store.releveEtudiant(id)
      await diplomes.emettre({
        eleveId: id,
        eleveName: s.nomComplet,
        type: typeForPromo(selectedPromo.value),
        mention: r?.mention || '',
        annee: ECOLE.anneeAcademique,
        ecoleNom: ECOLE.nom,
        ecoleAcronyme: ECOLE.sigle,
        emisPar: authSup.profile?.displayName || 'Direction',
      })
    }
  } finally {
    busy.value = false
  }
}

const revokeTarget = ref(null)
function askRevoke(d) { revokeTarget.value = d }
function confirmRevoke() {
  if (revokeTarget.value) diplomes.revoquer(revokeTarget.value.id)
  revokeTarget.value = null
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.sd { display: flex; flex-direction: column; gap: 18px; }
.sd-intro { margin-bottom: 0; }
.sd-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx); margin: 0; }
.sd-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.sd-sub strong { color: var(--tx); font-weight: 700; }

.sd-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sd-kpi { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px; }
.sd-kpi-lab { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.03em; }
.sd-kpi-val { font-family: 'Poppins', sans-serif; font-size: 27px; font-weight: 800; color: var(--tx); margin-top: 6px; line-height: 1; }
.sd-kpi-val.is-ok { color: var(--success); }
.sd-kpi-val.is-bad { color: var(--danger); }
.sd-kpi-verify { display: flex; flex-direction: column; justify-content: space-between; }
.sd-verify-link { margin-top: 10px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; color: var(--pr); text-decoration: none; }
.sd-verify-link:hover { text-decoration: underline; }

.sd-card { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 18px 20px; overflow-x: auto; }
.sd-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.sd-h2 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: var(--tx); margin: 0 0 12px; }
.sd-card-head .sd-h2 { margin: 0; }
.sd-select { height: 38px; padding: 0 12px; font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx); background: var(--input-bg); border: 1.5px solid var(--input-border); border-radius: 9px; outline: none; min-width: 300px; }
.sd-select:focus { border-color: var(--pr); }
.sd-note { font-size: 13.5px; color: var(--tx2); margin: 4px 0 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sd-note strong { color: var(--tx); font-weight: 700; }

.sd-table { width: 100%; border-collapse: collapse; }
.sd-table thead th { font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--tx3); text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--divider); white-space: nowrap; }
.sd-table th.num { text-align: right; }
.sd-table td { font-size: 13.5px; color: var(--tx); padding: 10px 10px; border-bottom: 1px solid var(--divider); vertical-align: middle; }
.sd-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.sd-table tbody tr:last-child td { border-bottom: none; }
.sd-mat { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: var(--tx2); }
.sd-code { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--pr); background: var(--pr-light); padding: 3px 9px; border-radius: 7px; letter-spacing: 0.02em; }
.sd-muted { color: var(--tx3); }
.sd-statut { display: inline-block; padding: 3px 10px; border-radius: 100px; font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 700; }
.sd-statut.is-ok { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sd-statut.is-bad { background: rgba(217, 48, 37, 0.08); color: var(--danger); }
.sd-actions { display: flex; align-items: center; gap: 12px; white-space: nowrap; }
.sd-link { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: var(--pr); text-decoration: none; }
.sd-link:hover { text-decoration: underline; }
.sd-revoke { background: none; border: none; padding: 0; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: var(--danger); cursor: pointer; text-decoration: underline; }

.sd-emit-btn { padding: 6px 14px; background: var(--pr); border: none; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: #fff; cursor: pointer; transition: opacity 0.15s ease; }
.sd-emit-btn:hover:not(:disabled) { opacity: 0.9; }
.sd-emit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-bulk-btn { margin-left: auto; padding: 8px 15px; background: var(--pr); border: none; border-radius: 9px; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: #fff; cursor: pointer; transition: opacity 0.15s ease; }
.sd-bulk-btn:hover:not(:disabled) { opacity: 0.9; }
.sd-bulk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-empty { padding: 22px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* Modale (fond OPAQUE #fff) */
.sd-modal-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(16, 24, 40, 0.45); }
.sd-modal { width: 100%; max-width: 440px; padding: 22px 24px; background: #fff !important; border-radius: 14px; box-shadow: 0 18px 48px rgba(16, 24, 40, 0.28); }
.sd-modal-title { margin: 0 0 10px; font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 800; color: var(--tx); }
.sd-modal-text { margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: var(--tx2); }
.sd-modal-text strong { color: var(--tx); font-weight: 700; }
.sd-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.sd-modal-btn { padding: 9px 16px; border-radius: 9px; font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; }
.sd-modal-cancel { background: #fff; border-color: var(--divider); color: var(--tx2); }
.sd-modal-cancel:hover { background: rgba(0, 0, 0, 0.04); }
.sd-modal-confirm { background: var(--danger); color: #fff; }
.sd-modal-confirm:hover { opacity: 0.9; }

@media (max-width: 1000px) { .sd-kpis { grid-template-columns: repeat(2, 1fr); } .sd-select { min-width: 0; } }
</style>
