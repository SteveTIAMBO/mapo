<template>
  <div class="mue">
    <div class="mue-head">
      <div>
        <h1 class="mue-h1">Mes UE &amp; mes groupes</h1>
        <p class="mue-sub">Les unités d'enseignement dont vous avez la charge ce semestre.</p>
      </div>
      <div class="mue-badges">
        <span class="mue-badge">{{ mesUe.length }} UE</span>
        <span class="mue-badge">{{ volumeTotal }} h</span>
      </div>
    </div>

    <section class="mue-panel">
      <table v-if="rows.length" class="mue-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Intitulé</th>
            <th>Promotion</th>
            <th class="num">Sem.</th>
            <th class="num">Crédits</th>
            <th class="num">Volume</th>
            <th class="num">Inscrits</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mue-code">{{ r.code }}</td>
            <td>{{ r.intitule }}</td>
            <td class="mue-promo">{{ r.promotion }}</td>
            <td class="num">{{ r.semestre }}</td>
            <td class="num">{{ r.ects }}</td>
            <td class="num">{{ r.volumeHoraire }} h</td>
            <td class="num">{{ r.inscrits }}</td>
            <td class="num">
              <button type="button" class="mue-btn" @click="saisirNotes(r.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                Saisir les notes
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="mue-empty">Aucune UE ne vous est assignée pour le moment.</p>

      <!-- Liste mobile : cartes UE (tableau masqué sur petit écran) -->
      <ul v-if="rows.length" class="mue-mlist">
        <li v-for="r in rows" :key="r.id" class="mue-mrow" @click="saisirNotes(r.id)">
          <div class="mue-mrow-main">
            <div class="mue-mrow-name"><span class="mue-code">{{ r.code }}</span> {{ r.intitule }}</div>
            <div class="mue-mrow-sub">{{ r.promotion }} · S{{ r.semestre }} · {{ r.ects }} crédits · {{ r.inscrits }} inscrits</div>
          </div>
          <span class="mue-mrow-cta">Notes ›</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()
const goTab = inject('supGoTab', () => {})

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value
const volumeTotal = computed(() => mesUe.reduce((s, u) => s + (u.volumeHoraire || 0), 0)).value

const rows = computed(() =>
  mesUe.map((u) => {
    const promo = store.promotions.find((p) => p.id === u.promotionId)
    return {
      id: u.id,
      code: u.code,
      intitule: u.intitule,
      promotion: promo ? `${promo.programmeNom} · ${promo.anneeNom}` : (u.programmeNom || ''),
      semestre: u.semestre,
      ects: u.ects,
      volumeHoraire: u.volumeHoraire,
      inscrits: store.notesPourUE(u.id).length,
    }
  })
)

// Ouvre la saisie des notes en pré-sélectionnant l'UE cliquée.
function saisirNotes(ueId) {
  try { localStorage.setItem('sup_ens_ue_focus', ueId) } catch (e) { /* silent */ }
  goTab('ens_notes')
}
</script>

<style scoped>
.mue { display: flex; flex-direction: column; gap: 16px; }
.mue-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.mue-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.mue-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.mue-badges { display: flex; gap: 8px; }
.mue-badge { background: rgba(var(--pr-rgb), 0.10); color: var(--pr); font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 100px; }
.mue-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 8px 10px; overflow-x: auto; }
.mue-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.mue-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 12px 12px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.mue-table th.num, .mue-table td.num { text-align: right; }
.mue-table td { padding: 11px 12px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--tx, #23262E); }
.mue-table tbody tr:last-child td { border-bottom: none; }
.mue-code { font-weight: 700; color: var(--pr); }
.mue-promo { color: var(--tx2, #5b6472); }
.mue-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 7px 11px; cursor: pointer; transition: background .15s ease; white-space: nowrap; }
.mue-btn:hover { background: rgba(var(--pr-rgb), .18); }
.mue-empty { color: var(--muted, #6b7280); font-size: 14px; padding: 26px 0; text-align: center; }
@media (max-width: 900px) { .mue-h1 { font-size: 20px; } }

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.mue-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.mue-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.mue-mrow:last-child { border-bottom: none; }
.mue-mrow:active { background: rgba(var(--pr-rgb), .07); }
.mue-mrow-main { flex: 1; min-width: 0; }
.mue-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mue-mrow-sub { font-size: 12px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mue-mrow-cta { flex-shrink: 0; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--pr); }
@media (max-width: 560px) {
  .mue-table { display: none; }
  .mue-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
}
</style>
