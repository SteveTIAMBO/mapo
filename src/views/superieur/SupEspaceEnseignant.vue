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
      <!-- Saisie des notes -->
      <section class="sen-card sen-card-wide">
        <div class="sen-card-head">
          <h2 class="sen-h2">Saisie des notes</h2>
          <select v-model="ueSelId" class="sen-select">
            <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
          </select>
        </div>
        <p class="sen-note" v-if="ueSel">{{ ueSel.intitule }} · {{ rosterPromo }} · {{ roster.length }} étudiants</p>
        <table v-if="roster.length" class="sen-table">
          <thead><tr><th>Matricule</th><th>Étudiant</th><th class="num">Note /20</th></tr></thead>
          <tbody>
            <tr v-for="r in roster" :key="r.id">
              <td class="sen-mat">{{ r.matricule }}</td>
              <td>{{ r.nomComplet }}</td>
              <td class="num"><input class="sen-note-input" type="number" min="0" max="20" step="0.25" v-model="notes[r.id]" placeholder="—" /></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="sen-empty">Sélectionnez une UE pour saisir les notes.</p>
        <div class="sen-actions">
          <button class="sen-btn" type="button" @click="enregistrer">{{ saved ? 'Notes enregistrées' : 'Enregistrer les notes' }}</button>
          <span v-if="saved" class="sen-saved">Brouillon enregistré · à soumettre à la scolarité</span>
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

        <!-- Assistant IA -->
        <section class="sen-card sen-ia">
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
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const prenom = moi.prenom || (moi.nomComplet || '').split(' ').slice(-1)[0] || 'Professeur'
const initials = ((moi.prenom || '') + ' ' + (moi.nom || '')).trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'PR'

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

const ueSelId = ref(mesUe[0] ? mesUe[0].id : '')
const ueSel = computed(() => mesUe.find((u) => u.id === ueSelId.value))
const roster = computed(() => {
  if (!ueSel.value) return []
  return store.etudiants.filter((e) => e.promotionId === ueSel.value.promotionId).slice(0, 25)
})
const rosterPromo = computed(() => {
  const p = store.promotions.find((pr) => pr.id === (ueSel.value && ueSel.value.promotionId))
  return p ? `${p.programmeNom} · ${p.anneeNom}` : ''
})

const nbEtudiants = computed(() => {
  const promoIds = new Set(mesUe.value.map((u) => u.promotionId))
  return store.etudiants.filter((e) => promoIds.has(e.promotionId)).length
}).value
const aSaisir = mesUe.value.length

const notes = ref({})
const saved = ref(false)
function enregistrer() { saved.value = true; setTimeout(() => { saved.value = false }, 4000) }

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
.sen-saved { font-size: 12.5px; color: #0E7C5A; }
.sen-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 16px 0; text-align: center; }
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
