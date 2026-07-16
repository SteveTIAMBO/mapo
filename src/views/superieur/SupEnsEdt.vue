<template>
  <div class="edt">
    <div class="edt-head">
      <div>
        <h1 class="edt-h1">Emploi du temps</h1>
        <p class="edt-sub">Vos séances de la semaine, toutes promotions confondues.</p>
      </div>
      <span class="edt-badge">{{ sessions.length }} séance{{ sessions.length > 1 ? 's' : '' }}</span>
    </div>

    <section class="edt-panel">
      <div v-if="creneaux.length" class="edt-grid-wrap">
        <table class="edt-grid">
          <thead>
            <tr>
              <th class="edt-corner"></th>
              <th v-for="j in jours" :key="j">{{ j }}<span class="edt-th-date">{{ dateForDayName(j) }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cr in creneaux" :key="cr.debut + '-' + cr.fin">
              <td class="edt-creneau">
                <span class="edt-h">{{ cr.debut }}</span>
                <span class="edt-dash">—</span>
                <span class="edt-h">{{ cr.fin }}</span>
              </td>
              <td v-for="j in jours" :key="j" class="edt-cell">
                <div v-if="cellAt(j, cr.debut)" class="edt-session" :class="'t-' + cellAt(j, cr.debut).type">
                  <div class="edt-code">{{ cellAt(j, cr.debut).ueCode }}</div>
                  <div class="edt-nom">{{ cellAt(j, cr.debut).ueIntitule }}</div>
                  <div class="edt-meta">
                    <span>{{ cellAt(j, cr.debut).promotionNom }}</span>
                    <span class="edt-salle">{{ cellAt(j, cr.debut).salle }}</span>
                  </div>
                </div>
                <div v-else class="edt-empty-cell"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="edt-empty">Aucune séance planifiée pour vous ce semestre.</p>

      <!-- Vue mobile : un jour à la fois (tableau masqué sur petit écran) -->
      <div v-if="creneaux.length" class="edt-mday">
        <div class="edt-mday-nav">
          <button type="button" class="edt-mday-arrow" @click="mobileDayPrev" :disabled="mobileDay === 0" aria-label="Jour précédent">‹</button>
          <div class="edt-mday-title">{{ jours[mobileDay] }} <span class="edt-mday-date">{{ dateForDayName(jours[mobileDay]) }}</span></div>
          <button type="button" class="edt-mday-arrow" @click="mobileDayNext" :disabled="mobileDay >= jours.length - 1" aria-label="Jour suivant">›</button>
        </div>
        <ul class="edt-mday-list">
          <li v-for="cr in creneaux" :key="cr.debut + '-' + cr.fin" class="edt-mday-slot">
            <div class="edt-mday-time">{{ cr.debut }}<br />{{ cr.fin }}</div>
            <div v-if="cellAt(jours[mobileDay], cr.debut)" class="edt-mday-session">
              <div class="edt-mday-code">{{ cellAt(jours[mobileDay], cr.debut).ueCode }} · {{ cellAt(jours[mobileDay], cr.debut).ueIntitule }}</div>
              <div class="edt-mday-meta">{{ cellAt(jours[mobileDay], cr.debut).promotionNom }} · {{ cellAt(jours[mobileDay], cr.debut).salle }}</div>
            </div>
            <div v-else class="edt-mday-empty">—</div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

// Mes séances (lecture seule), repérées par nom via le store.
const sessions = computed(() => store.edtPourIntervenant(moi.nomComplet)).value

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const jours = JOURS

// Vue mobile : un jour à la fois, ouvre sur aujourd'hui
function jourAujourdhuiIndex() {
  const noms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const i = jours.indexOf(noms[new Date().getDay()])
  return i >= 0 ? i : 0
}
const mobileDay = ref(jourAujourdhuiIndex())
function mobileDayPrev() { if (mobileDay.value > 0) mobileDay.value-- }
function mobileDayNext() { if (mobileDay.value < jours.length - 1) mobileDay.value++ }
// Date du jour (nom → date de ce jour dans la semaine courante), ex. « 16 juil. »
function dateForDayName(name) {
  const noms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const target = noms.indexOf(name)
  if (target < 0) return ''
  const now = new Date()
  const d = new Date(now); d.setDate(now.getDate() + (target - now.getDay()))
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// Créneaux = horaires distincts de mes séances, triés par heure de début.
const creneaux = computed(() => {
  const map = new Map()
  for (const s of sessions) {
    const key = `${s.debut}-${s.fin}`
    if (!map.has(key)) map.set(key, { debut: s.debut, fin: s.fin })
  }
  return [...map.values()].sort((a, b) => String(a.debut).localeCompare(String(b.debut)))
}).value

const grid = computed(() => {
  const map = {}
  for (const s of sessions) map[`${s.jour}__${s.debut}`] = s
  return map
}).value

function cellAt(jour, debut) { return grid[`${jour}__${debut}`] || null }
</script>

<style scoped>
.edt { display: flex; flex-direction: column; gap: 16px; }
.edt-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.edt-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.edt-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.edt-badge { background: rgba(var(--pr-rgb), 0.10); color: var(--pr); font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 100px; }
.edt-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 10px; }
.edt-grid-wrap { overflow-x: auto; }
.edt-grid { width: 100%; border-collapse: separate; border-spacing: 6px; min-width: 760px; }
.edt-grid thead th { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--tx2); padding: 8px; text-align: center; }
.edt-corner { width: 92px; }
.edt-creneau { width: 92px; text-align: center; vertical-align: middle; background: var(--input-bg, rgba(20,32,64,.05)); border-radius: 9px; padding: 8px 4px; }
.edt-h { display: block; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--tx, #1A1D1F); }
.edt-dash { display: block; font-size: 10px; color: var(--tx3, #9AA2B1); line-height: 1; }
.edt-cell { vertical-align: top; width: 18%; }
.edt-empty-cell { height: 92px; background: var(--input-bg, rgba(20,32,64,.04)); border-radius: 9px; opacity: .5; }
.edt-session { min-height: 92px; box-sizing: border-box; padding: 9px 11px; border-radius: 9px; background: var(--pr-light, rgba(21,88,176,.08)); }
.edt-session.t-methodologique { background: rgba(14, 124, 90, .09); }
.edt-session.t-professionnelle { background: rgba(184, 137, 42, .10); }
.edt-session.t-electif { background: rgba(99, 102, 241, .09); }
.edt-code { font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 700; color: var(--tx3, #6b7280); }
.edt-nom { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: var(--tx, #1A1D1F); margin: 2px 0 6px; line-height: 1.3; }
.edt-meta { display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; color: var(--tx2, #5b6472); }
.edt-salle { color: var(--tx3, #9AA2B1); font-weight: 500; }
.edt-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 26px 0; text-align: center; }
@media (max-width: 900px) { .edt-h1 { font-size: 20px; } }

/* ── Vue mobile : EDT enseignant un jour à la fois ── */
.edt-mday { display: none; }
.edt-th-date { display: block; font-weight: 400; font-size: 11px; color: var(--tx3, #9aa2b1); margin-top: 2px; }
.edt-mday-date { font-weight: 600; font-size: 13px; color: var(--tx2, #6f767e); }
@media (max-width: 560px) {
  .edt-grid-wrap { display: none; }
  .edt-mday { display: block; }
  .edt-mday-nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .edt-mday-arrow { width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--hair, rgba(20,32,64,.12)); background: var(--card); color: var(--pr); font-size: 22px; line-height: 1; cursor: pointer; flex-shrink: 0; }
  .edt-mday-arrow:disabled { opacity: .35; cursor: default; }
  .edt-mday-title { flex: 1; text-align: center; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--tx); }
  .edt-mday-list { list-style: none; margin: 0; padding: 0; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .edt-mday-slot { display: flex; align-items: stretch; gap: 12px; padding: 10px 12px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); }
  .edt-mday-slot:last-child { border-bottom: none; }
  .edt-mday-time { flex-shrink: 0; width: 46px; align-self: center; text-align: center; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600; color: var(--tx2, #6f767e); line-height: 1.35; }
  .edt-mday-session { flex: 1; min-width: 0; }
  .edt-mday-code { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--tx); }
  .edt-mday-meta { font-size: 12px; color: var(--tx2, #6f767e); margin-top: 2px; }
  .edt-mday-empty { flex: 1; align-self: center; color: var(--tx3, #9aa2b1); font-size: 13px; }
}
</style>
