<template>
  <div class="sen">
    <div class="sen-hero">
      <div class="sen-avatar">{{ initials }}</div>
      <div class="sen-hero-info">
        <div class="sen-hello">Bonjour {{ prenom }}</div>
        <div class="sen-sub">{{ moi.specialite }} · {{ moi.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}</div>
      </div>
    </div>

    <div class="sen-kpis">
      <div class="sen-kpi"><div class="sen-kpi-lab">Mes UE</div><div class="sen-kpi-val">{{ mesUe.length }}</div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">Volume horaire</div><div class="sen-kpi-val">{{ moi.volumeHoraire }}<span> h</span></div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">Mes étudiants</div><div class="sen-kpi-val">{{ nbEtudiants }}</div></div>
      <div class="sen-kpi"><div class="sen-kpi-lab">Notes à saisir</div><div class="sen-kpi-val" :class="{ 'is-warn': aSaisir > 0 }">{{ aSaisir }}</div></div>
    </div>

    <div class="sen-grid">
      <!-- Saisie des notes (réelle : chaque note est persistée via le store) -->
      <section class="sen-card sen-card-wide">
        <div class="sen-card-head">
          <h2 class="sen-h2">Saisie des notes</h2>
          <select v-model="ueSelId" class="sen-select">
            <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
          </select>
        </div>
        <p class="sen-note" v-if="ueSel">
          {{ ueSel.intitule }} · {{ rosterPromo }} · {{ notesUE.length }} étudiants
          <span class="sen-legend">Note UE = CC 40 % + Examen 60 %</span>
        </p>
        <table v-if="notesUE.length" class="sen-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Étudiant</th>
              <th class="num">CC /20</th>
              <th class="num">Examen /20</th>
              <th class="num">Note UE</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in notesUE" :key="n.etudiant.id">
              <td class="sen-mat">{{ n.etudiant.matricule }}</td>
              <td>{{ n.etudiant.nomComplet }}</td>
              <td class="num">
                <input class="sen-note-input" type="number" min="0" max="20" step="0.25"
                  :value="n.cc ?? ''" placeholder="—"
                  @change="saveNote(n.etudiant.id, 'cc', $event.target.value)" />
              </td>
              <td class="num">
                <input class="sen-note-input" type="number" min="0" max="20" step="0.25"
                  :value="n.examen ?? ''" placeholder="—"
                  @change="saveNote(n.etudiant.id, 'examen', $event.target.value)" />
              </td>
              <td class="num">
                <strong :class="n.note == null ? 'sen-wait' : n.note < 10 ? 'sen-bad' : 'sen-ok'">
                  {{ n.note != null ? n.note.toFixed(2) : '—' }}
                </strong>
              </td>
              <td>
                <span class="sen-val" :class="n.note == null ? 'is-wait' : n.note >= 10 ? 'is-ok' : 'is-bad'">
                  {{ n.note == null ? 'En attente' : n.note >= 10 ? 'Validée' : 'Non validée' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="sen-empty">Sélectionnez une UE pour saisir les notes.</p>
        <div class="sen-actions">
          <span class="sen-saved-auto">Les notes sont enregistrées automatiquement. Le directeur valide et signe le relevé.</span>
          <transition name="sen-fade"><span v-if="saved" class="sen-saved">✓ Enregistré</span></transition>
        </div>
      </section>

      <div class="sen-side">
        <!-- Mes enseignements -->
        <section class="sen-card">
          <h2 class="sen-h2">Mes enseignements</h2>
          <div v-for="u in mesUe" :key="u.id" class="sen-ue">
            <div>
              <div class="sen-ue-code">{{ u.code }}</div>
              <div class="sen-ue-int">{{ u.intitule }}</div>
            </div>
            <div class="sen-ue-h">{{ u.volumeHoraire }} h</div>
          </div>
          <p v-if="!mesUe.length" class="sen-empty">Aucune UE assignée.</p>
        </section>

        <!-- Mes fiches de paie -->
        <section class="sen-card">
          <h2 class="sen-h2">Mes fiches de paie</h2>
          <div class="sen-paie-head">
            <span>Net à payer / mois</span>
            <strong>{{ fmtFcfa(paie.net) }} FCFA</strong>
          </div>
          <div v-for="m in moisDispo" :key="m.year + '-' + m.monthIndex" class="sen-paie-row">
            <span class="sen-paie-mois">{{ m.label }}</span>
            <button type="button" class="sen-paie-btn" @click="telechargerPaie(m)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Télécharger
            </button>
          </div>
        </section>

        <!-- Assistant IA (masqué si MIAPO désactivé pour la préparation de cours) -->
        <section v-if="miapoGlobal.isEnabled('preparationCours')" class="sen-card sen-ia">
          <div class="sen-ia-badge">MIAPO</div>
          <h2 class="sen-h2 sen-ia-h2">Assistant pédagogique</h2>
          <p class="sen-ia-txt">Prépare tes cours, devoirs et examens avec l'IA : sujet + corrigé générés en quelques secondes, adaptés à ton UE et au niveau.</p>
          <button class="sen-ia-cta" type="button" @click="iaClick">Préparer un support de cours</button>
          <p v-if="iaMsg" class="sen-ia-msg">{{ iaMsg }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useSuperieurMiapoStore } from '../../stores/superieurMiapo'
import { generateFichePaie, fichePaieDetail, moisLabel } from '../../utils/pdfFichePaie'

const store = useSuperieurStore()
const miapoGlobal = useSuperieurMiapoStore()
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const prenom = moi.prenom || (moi.nomComplet || '').split(' ').slice(-1)[0] || 'Professeur'
const initials = ((moi.prenom || '') + ' ' + (moi.nom || '')).trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'PR'

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// ── Fiches de paie de l'intervenant connecté (moi) ──
const paie = computed(() => fichePaieDetail(moi))
const nowPaie = new Date()
const moisDispo = computed(() => {
  const arr = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(nowPaie.getFullYear(), nowPaie.getMonth() - i, 1)
    arr.push({ year: d.getFullYear(), monthIndex: d.getMonth(), label: `${moisLabel(d.getMonth())} ${d.getFullYear()}` })
  }
  return arr
})
function telechargerPaie(m) { generateFichePaie(moi, m.year, m.monthIndex, ECOLE) }
function fmtFcfa(n) { return (n ?? 0).toLocaleString('fr-FR') }

const ueSelId = ref(mesUe[0] ? mesUe[0].id : '')
const ueSel = computed(() => mesUe.find((u) => u.id === ueSelId.value))
// Étudiants inscrits à l'UE + leurs notes CC/Examen (forme objet du store)
const notesUE = computed(() => (ueSelId.value ? store.notesPourUE(ueSelId.value) : []))
const rosterPromo = computed(() => {
  const p = store.promotions.find((pr) => pr.id === (ueSel.value && ueSel.value.promotionId))
  return p ? `${p.programmeNom} · ${p.anneeNom}` : ''
})

const nbEtudiants = (() => {
  const promoIds = new Set(mesUe.map((u) => u.promotionId))
  return store.etudiants.filter((e) => promoIds.has(e.promotionId)).length
})()
// « Notes à saisir » = nombre de notes d'UE encore en attente sur toutes mes UE
const aSaisir = computed(() => {
  let n = 0
  for (const u of mesUe) {
    for (const row of store.notesPourUE(u.id)) if (row.note == null) n++
  }
  return n
})

// Saisie RÉELLE : chaque note (CC / Examen) est persistée via le store (setSupNote).
// La note d'UE (CC 40 % + Examen 60 %) et la validation se recalculent en direct.
const saved = ref(false)
let savedTimer = null
function saveNote(etudiantId, field, value) {
  store.setSupNote(etudiantId, ueSelId.value, field, value)
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 2000)
}

const iaMsg = ref('')
function iaClick() { iaMsg.value = "L'assistant MIAPO génère cours, devoirs et examens avec corrigé. Fonction pleinement disponible dans l'espace enseignant connecté." }
</script>

<style scoped>
.sen { display: flex; flex-direction: column; gap: 18px; }
.sen-hero { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, rgba(var(--pr-rgb), 0.10), rgba(var(--pr-rgb), 0.02)); border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 18px; padding: 20px 24px; }
.sen-avatar { width: 58px; height: 58px; border-radius: 15px; background: var(--pr); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; }
.sen-hello { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: var(--text, #1A1D1F); }
.sen-sub { font-size: 14px; color: var(--muted, #5b6472); margin-top: 2px; }
.sen-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sen-kpi { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 16px 18px; }
.sen-kpi-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); }
.sen-kpi-val { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--text, #1A1D1F); margin-top: 4px; }
.sen-kpi-val span { font-size: 14px; color: var(--muted, #9AA2B1); font-weight: 600; }
.sen-kpi-val.is-warn { color: #B45309; }
.sen-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
.sen-side { display: flex; flex-direction: column; gap: 16px; }
.sen-card { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.sen-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.sen-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--text, #1A1D1F); margin: 0 0 14px; }
.sen-card-head .sen-h2 { margin: 0; }
.sen-select { font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--text, #23262E); background: var(--input-bg, rgba(20,32,64,.05)); border: 1px solid var(--border, rgba(20,32,64,.10)); border-radius: 9px; padding: 6px 10px; max-width: 260px; }
.sen-note { font-size: 12.5px; color: var(--muted, #6b7280); margin: 0 0 12px; }
.sen-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sen-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sen-table th.num, .sen-table td.num { text-align: right; }
.sen-table td { padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.sen-mat { font-weight: 700; color: var(--pr); }
.sen-note-input { width: 70px; text-align: right; font-family: inherit; font-size: 13px; border: 1px solid var(--border, rgba(20,32,64,.14)); border-radius: 8px; padding: 5px 8px; }
.sen-note-input:focus { outline: none; border-color: var(--pr); }
.sen-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.sen-btn { background: var(--pr); color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 700; font-size: 13.5px; padding: 9px 18px; cursor: pointer; }
.sen-saved { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.sen-saved-auto { font-size: 12.5px; color: var(--muted, #6b7280); }
.sen-legend { margin-left: 8px; font-size: 11.5px; font-weight: 600; color: var(--muted, #9AA2B1); }
.sen-ok { color: #0E7C5A; }
.sen-bad { color: #D93025; }
.sen-wait { color: var(--muted, #9AA2B1); font-weight: 600; }
.sen-val { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.sen-val.is-ok { background: rgba(14,124,90,.1); color: #0E7C5A; }
.sen-val.is-bad { background: rgba(217,48,37,.08); color: #D93025; }
.sen-val.is-wait { background: var(--input-bg, rgba(20,32,64,.05)); color: #9AA2B1; }
.sen-fade-enter-active, .sen-fade-leave-active { transition: opacity .3s ease; }
.sen-fade-enter-from, .sen-fade-leave-to { opacity: 0; }
.sen-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 16px 0; text-align: center; }
.sen-paie-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 8px 0 12px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); margin-bottom: 6px; }
.sen-paie-head span { font-size: 12.5px; color: var(--muted, #6b7280); }
.sen-paie-head strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 15px; color: var(--text, #1A1D1F); }
.sen-paie-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.sen-paie-mois { font-size: 13px; font-weight: 600; color: var(--text, #23262E); }
.sen-paie-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 6px 10px; cursor: pointer; transition: background .15s ease; }
.sen-paie-btn:hover { background: rgba(var(--pr-rgb), .18); }
.sen-ue { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.sen-ue-code { font-weight: 700; color: var(--pr); font-size: 13px; }
.sen-ue-int { font-size: 12.5px; color: var(--muted, #5b6472); }
.sen-ue-h { font-size: 13px; font-weight: 600; color: var(--text, #23262E); }
.sen-ia { background: linear-gradient(150deg, #4F46E5, #7C3AED); color: #fff; border: none; }
.sen-ia-badge { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-weight: 800; font-size: 12px; }
.sen-ia-h2 { color: #fff; margin-top: 12px; }
.sen-ia-txt { font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.92); }
.sen-ia-cta { margin-top: 14px; background: #fff; color: #5B21B6; font-weight: 700; font-size: 13.5px; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; }
.sen-ia-msg { margin-top: 10px; font-size: 12.5px; color: rgba(255,255,255,.95); }
@media (max-width: 900px) { .sen-kpis { grid-template-columns: repeat(2, 1fr); } .sen-grid { grid-template-columns: 1fr; } }
</style>
