<template>
  <div class="snote">
    <div class="snote-head">
      <div>
        <h1 class="snote-h1">Saisie des notes</h1>
        <p class="snote-sub">Contrôle continu et examen par unité d'enseignement.</p>
      </div>
    </div>

    <section class="snote-panel">
      <div class="snote-bar">
        <label class="snote-lab">Unité d'enseignement</label>
        <select v-model="ueSelId" class="snote-select">
          <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
        </select>
      </div>

      <p class="snote-note" v-if="ueSel">
        {{ ueSel.intitule }} · {{ rosterPromo }} · {{ notesUE.length }} étudiants
        <span class="snote-legend">Note UE = CC 40 % + Examen 60 %</span>
      </p>

      <table v-if="notesUE.length" class="snote-table">
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
            <td class="snote-mat">{{ n.etudiant.matricule }}</td>
            <td>{{ n.etudiant.nomComplet }}</td>
            <td class="num">
              <input class="snote-input" type="number" min="0" max="20" step="0.25"
                :value="n.cc ?? ''" placeholder="—"
                @change="saveNote(n.etudiant.id, 'cc', $event.target.value)" />
            </td>
            <td class="num">
              <input class="snote-input" type="number" min="0" max="20" step="0.25"
                :value="n.examen ?? ''" placeholder="—"
                @change="saveNote(n.etudiant.id, 'examen', $event.target.value)" />
            </td>
            <td class="num">
              <strong :class="n.note == null ? 'snote-wait' : n.note < 10 ? 'snote-bad' : 'snote-ok'">
                {{ n.note != null ? n.note.toFixed(2) : '—' }}
              </strong>
            </td>
            <td>
              <span class="snote-val" :class="n.note == null ? 'is-wait' : n.note >= 10 ? 'is-ok' : 'is-bad'">
                {{ n.note == null ? 'En attente' : n.note >= 10 ? 'Validée' : 'Non validée' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="snote-empty">Sélectionnez une UE pour saisir les notes.</p>

      <!-- Liste mobile : cartes de saisie (tableau masqué sur petit écran) -->
      <ul v-if="notesUE.length" class="snote-mlist">
        <li v-for="n in notesUE" :key="n.etudiant.id" class="snote-mrow">
          <div class="snote-mrow-head">
            <div class="snote-mrow-name">{{ n.etudiant.nomComplet }} <span class="snote-mrow-mat">{{ n.etudiant.matricule }}</span></div>
            <span class="snote-val" :class="n.note == null ? 'is-wait' : n.note >= 10 ? 'is-ok' : 'is-bad'">
              {{ n.note == null ? 'En attente' : n.note >= 10 ? 'Validée' : 'Non validée' }}
            </span>
          </div>
          <div class="snote-mrow-fields">
            <label class="snote-mfield">CC /20
              <input class="snote-input" type="number" min="0" max="20" step="0.25" :value="n.cc ?? ''" placeholder="—" @change="saveNote(n.etudiant.id, 'cc', $event.target.value)" />
            </label>
            <label class="snote-mfield">Examen /20
              <input class="snote-input" type="number" min="0" max="20" step="0.25" :value="n.examen ?? ''" placeholder="—" @change="saveNote(n.etudiant.id, 'examen', $event.target.value)" />
            </label>
            <div class="snote-mfield">Note UE
              <strong :class="n.note == null ? 'snote-wait' : n.note < 10 ? 'snote-bad' : 'snote-ok'">{{ n.note != null ? n.note.toFixed(2) : '—' }}</strong>
            </div>
          </div>
        </li>
      </ul>

      <div class="snote-actions">
        <span class="snote-auto">Les notes sont enregistrées automatiquement. Le directeur valide et signe le relevé.</span>
        <transition name="snote-fade"><span v-if="saved" class="snote-saved">✓ Enregistré</span></transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// Pré-sélection : UE ouverte depuis « Mes UE » (sinon la première UE).
function initialUe() {
  let focus = null
  try { focus = localStorage.getItem('sup_ens_ue_focus') } catch (e) { /* silent */ }
  if (focus && mesUe.some((u) => u.id === focus)) return focus
  return mesUe[0] ? mesUe[0].id : ''
}
const ueSelId = ref(initialUe())
const ueSel = computed(() => mesUe.find((u) => u.id === ueSelId.value))
const notesUE = computed(() => (ueSelId.value ? store.notesPourUE(ueSelId.value) : []))
const rosterPromo = computed(() => {
  const p = store.promotions.find((pr) => pr.id === (ueSel.value && ueSel.value.promotionId))
  return p ? `${p.programmeNom} · ${p.anneeNom}` : ''
})

// Saisie RÉELLE : chaque note (CC / Examen) est persistée via le store (setSupNote).
const saved = ref(false)
let savedTimer = null
function saveNote(etudiantId, field, value) {
  store.setSupNote(etudiantId, ueSelId.value, field, value)
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 2000)
}
</script>

<style scoped>
.snote { display: flex; flex-direction: column; gap: 16px; }
.snote-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.snote-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.snote-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.snote-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.snote-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.snote-lab { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3, #9AA2B1); }
.snote-select { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text, #23262E); background: var(--input-bg, rgba(20,32,64,.05)); border: 1px solid var(--border, rgba(20,32,64,.10)); border-radius: 9px; padding: 8px 12px; min-width: 280px; }
.snote-note { font-size: 12.5px; color: var(--muted, #6b7280); margin: 0 0 12px; }
.snote-legend { margin-left: 8px; font-size: 11.5px; font-weight: 600; color: var(--muted, #9AA2B1); }
.snote-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.snote-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.snote-table th.num, .snote-table td.num { text-align: right; }
.snote-table td { padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.snote-mat { font-weight: 700; color: var(--pr); }
.snote-input { width: 74px; text-align: right; font-family: inherit; font-size: 13px; border: 1px solid var(--border, rgba(20,32,64,.14)); border-radius: 8px; padding: 5px 8px; }
.snote-input:focus { outline: none; border-color: var(--pr); }
.snote-ok { color: #0E7C5A; }
.snote-bad { color: #D93025; }
.snote-wait { color: var(--muted, #9AA2B1); font-weight: 600; }
.snote-val { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.snote-val.is-ok { background: rgba(14,124,90,.1); color: #0E7C5A; }
.snote-val.is-bad { background: rgba(217,48,37,.08); color: #D93025; }
.snote-val.is-wait { background: var(--input-bg, rgba(20,32,64,.05)); color: #9AA2B1; }
.snote-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.snote-auto { font-size: 12.5px; color: var(--muted, #6b7280); }
.snote-saved { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.snote-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 16px 0; text-align: center; }
.snote-fade-enter-active, .snote-fade-leave-active { transition: opacity .3s ease; }
.snote-fade-enter-from, .snote-fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .snote-h1 { font-size: 20px; } .snote-select { min-width: 0; width: 100%; } }

/* ── Liste mobile : cartes de saisie (remplace le tableau sur petit écran) ── */
.snote-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.snote-mrow { padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); }
.snote-mrow:last-child { border-bottom: none; }
.snote-mrow-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.snote-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: var(--tx); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snote-mrow-mat { font-weight: 500; font-size: 12px; color: var(--tx3, #9aa2b1); }
.snote-mrow-fields { display: flex; align-items: flex-end; gap: 10px; margin-top: 8px; }
.snote-mfield { flex: 1; display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; font-weight: 600; color: var(--tx3, #9aa2b1); text-transform: uppercase; letter-spacing: .03em; }
.snote-mfield .snote-input { width: 100%; }
@media (max-width: 560px) {
  .snote-table { display: none; }
  .snote-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
}
</style>
