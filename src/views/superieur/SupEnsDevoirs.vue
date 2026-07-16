<template>
  <div class="dvr">
    <div class="dvr-head">
      <div>
        <h1 class="dvr-h1">{{ t('sup.ensDevoirs.title') }}</h1>
        <p class="dvr-sub">{{ t('sup.ensDevoirs.subtitle') }}</p>
      </div>
    </div>

    <!-- Créer -->
    <section class="dvr-panel">
      <h2 class="dvr-h2">{{ t('sup.ensDevoirs.newEval') }}</h2>
      <div class="dvr-row">
        <div class="dvr-fg">
          <label>{{ t('sup.ensDevoirs.type') }}</label>
          <select v-model="form.type" class="dvr-input">
            <option value="devoir">{{ t('sup.ensDevoirs.typeDevoir') }}</option>
            <option value="examen">{{ t('sup.ensDevoirs.typeExamen') }}</option>
          </select>
        </div>
        <div class="dvr-fg dvr-grow">
          <label>{{ t('sup.ensDevoirs.ue') }}</label>
          <select v-model="form.ueId" class="dvr-input">
            <option value="">{{ t('sup.ensDevoirs.chooseUe') }}</option>
            <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
          </select>
        </div>
        <div class="dvr-fg">
          <label>{{ t('sup.ensDevoirs.date') }}</label>
          <input v-model="form.date" class="dvr-input" type="date" />
        </div>
      </div>
      <div class="dvr-fg">
        <label>{{ t('sup.ensDevoirs.titleField') }}</label>
        <input v-model="form.titre" class="dvr-input" type="text" :placeholder="t('sup.ensDevoirs.titlePlaceholder')" />
      </div>
      <div class="dvr-fg">
        <div class="dvr-consigne-lab">
          <label>{{ t('sup.ensDevoirs.instructions') }}</label>
          <button class="dvr-miapo" type="button" @click="genererMiapo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/></svg>
            {{ t('sup.ensDevoirs.genMiapo') }}
          </button>
        </div>
        <textarea v-model="form.consignes" class="dvr-input" rows="5" :placeholder="t('sup.ensDevoirs.instrPlaceholder')"></textarea>
      </div>
      <div class="dvr-actions">
        <button class="dvr-btn" type="button" :disabled="!canCreate" @click="creer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          {{ t('sup.ensDevoirs.createBtn') }}
        </button>
        <transition name="dvr-fade"><span v-if="justCreated" class="dvr-ok">{{ t('sup.ensDevoirs.saved') }}</span></transition>
      </div>
    </section>

    <!-- Liste -->
    <section class="dvr-panel">
      <div class="dvr-panel-head">
        <h2 class="dvr-h2">{{ t('sup.ensDevoirs.scheduled') }}</h2>
        <span class="dvr-count">{{ items.length }}</span>
      </div>
      <table v-if="items.length" class="dvr-table">
        <thead>
          <tr>
            <th>{{ t('sup.ensDevoirs.thType') }}</th>
            <th>{{ t('sup.ensDevoirs.thTitle') }}</th>
            <th>{{ t('sup.ensDevoirs.thUe') }}</th>
            <th>{{ t('sup.ensDevoirs.thDate') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td><span class="dvr-badge" :class="'t-' + it.type">{{ it.type === 'examen' ? t('sup.ensDevoirs.typeExamen') : t('sup.ensDevoirs.typeDevoir') }}</span></td>
            <td class="dvr-title">{{ it.titre }}</td>
            <td class="dvr-ue">{{ it.ueCode || '—' }}</td>
            <td>{{ fmtDate(it.date) }}</td>
            <td class="dvr-right">
              <button class="dvr-del" type="button" :title="t('sup.ensDevoirs.delete')" @click="supprimer(it.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="dvr-empty">{{ t('sup.ensDevoirs.empty') }}</p>

      <!-- Liste mobile : cartes (tableau masqué sur petit écran) -->
      <ul v-if="items.length" class="dvr-mlist">
        <li v-for="it in items" :key="it.id" class="dvr-mrow">
          <div class="dvr-mrow-main">
            <div class="dvr-mrow-name">{{ it.titre }}</div>
            <div class="dvr-mrow-sub">
              <span class="dvr-badge" :class="'t-' + it.type">{{ it.type === 'examen' ? t('sup.ensDevoirs.typeExamen') : t('sup.ensDevoirs.typeDevoir') }}</span>
              {{ it.ueCode || '—' }} · {{ fmtDate(it.date) }}
            </div>
          </div>
          <button class="dvr-del" type="button" :title="t('sup.ensDevoirs.delete')" @click="supprimer(it.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'

const { t, locale } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// ── Persistance localStorage (démo) : clé sup_devoirs ──
const LS_KEY = 'sup_devoirs'
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch (e) { return [] }
}
const items = ref(load())
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items.value)) } catch (e) { /* silent */ }
}

const form = reactive({ type: 'devoir', ueId: '', date: '', titre: '', consignes: '' })
const justCreated = ref(false)
const canCreate = computed(() => form.titre.trim() && form.ueId)

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch (e) { return iso }
}

// « Générer avec MIAPO » — suggestion LOCALE (aucun appel réseau). Pré-remplit
// des consignes structurées à partir de l'UE et du type choisis, que
// l'enseignant peut ensuite ajuster.
function genererMiapo() {
  const ue = mesUe.find((u) => u.id === form.ueId)
  const intitule = ue ? ue.intitule : t('sup.ensDevoirs.miFallbackUe')
  const estExamen = form.type === 'examen'
  const typeLabel = estExamen ? t('sup.ensDevoirs.typeExamen') : t('sup.ensDevoirs.typeDevoir')
  const duree = estExamen ? t('sup.ensDevoirs.miDurExam') : t('sup.ensDevoirs.miDurDevoir')
  const lignes = [
    `${typeLabel} — ${intitule}`,
    t('sup.ensDevoirs.miLine2', { d: duree }),
    '',
    t('sup.ensDevoirs.miEx1'),
    t('sup.ensDevoirs.miEx2'),
    t('sup.ensDevoirs.miEx3'),
    '',
    t('sup.ensDevoirs.miFooter'),
  ]
  if (!form.titre.trim()) {
    form.titre = `${typeLabel} — ${ue ? ue.code : ''}`.trim()
  }
  form.consignes = lignes.join('\n')
}

function creer() {
  if (!canCreate.value) return
  const ue = mesUe.find((u) => u.id === form.ueId)
  items.value.unshift({
    id: 'dvr-' + Date.now().toString(36),
    type: form.type,
    ueId: form.ueId,
    ueCode: ue ? ue.code : '',
    titre: form.titre.trim(),
    date: form.date || '',
    consignes: form.consignes.trim(),
    auteur: moi.nomComplet || '',
    createdAt: new Date().toISOString(),
  })
  persist()
  form.titre = ''; form.consignes = ''; form.date = ''
  justCreated.value = true
  setTimeout(() => { justCreated.value = false }, 2200)
}
function supprimer(id) {
  items.value = items.value.filter((x) => x.id !== id)
  persist()
}
</script>

<style scoped>
.dvr { display: flex; flex-direction: column; gap: 16px; }
.dvr-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dvr-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.dvr-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.dvr-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.dvr-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--tx, #1A1D1F); margin: 0 0 14px; }
.dvr-panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.dvr-panel-head .dvr-h2 { margin: 0; }
.dvr-count { font-size: 12px; font-weight: 700; color: var(--tx2); background: var(--input-bg, rgba(20,32,64,.05)); padding: 2px 9px; border-radius: 20px; }
.dvr-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.dvr-fg { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 170px; margin-bottom: 12px; }
.dvr-fg.dvr-grow { flex: 2; }
.dvr-row .dvr-fg { margin-bottom: 0; }
.dvr-fg label { font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); }
.dvr-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 14px; color: var(--tx, #23262E); background: var(--input-bg, rgba(20,32,64,.04)); border: 1px solid var(--border, rgba(20,32,64,.12)); border-radius: 9px; padding: 9px 12px; }
.dvr-input:focus { outline: none; border-color: var(--pr); background: #fff; }
textarea.dvr-input { resize: vertical; }
.dvr-consigne-lab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dvr-miapo { display: inline-flex; align-items: center; gap: 6px; background: rgba(124,58,237,.10); color: #7C3AED; border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 6px 11px; cursor: pointer; transition: background .15s ease; }
.dvr-miapo:hover { background: rgba(124,58,237,.18); }
.dvr-actions { display: flex; align-items: center; gap: 12px; }
.dvr-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--pr); color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 700; font-size: 13.5px; padding: 10px 18px; cursor: pointer; }
.dvr-btn:disabled { opacity: .5; cursor: not-allowed; }
.dvr-ok { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.dvr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dvr-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.dvr-table td { padding: 10px 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.dvr-table tbody tr:last-child td { border-bottom: none; }
.dvr-title { font-weight: 600; }
.dvr-ue { color: var(--pr); font-weight: 700; }
.dvr-right { text-align: right; }
.dvr-badge { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.dvr-badge.t-devoir { color: #C2751A; background: rgba(232, 149, 58, .16); }
.dvr-badge.t-examen { color: #B3261E; background: rgba(179, 38, 30, .10); }
.dvr-del { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--input-bg, rgba(20,32,64,.04)); border: none; border-radius: 8px; color: var(--tx3, #9AA2B1); cursor: pointer; transition: all .15s ease; }
.dvr-del:hover { background: rgba(217,48,37,.10); color: #D93025; }
.dvr-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
.dvr-fade-enter-active, .dvr-fade-leave-active { transition: opacity .3s ease; }
.dvr-fade-enter-from, .dvr-fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .dvr-h1 { font-size: 20px; } .dvr-fg { min-width: 0; } }

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.dvr-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.dvr-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); }
.dvr-mrow:last-child { border-bottom: none; }
.dvr-mrow-main { flex: 1; min-width: 0; }
.dvr-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dvr-mrow-sub { font-size: 12px; color: var(--tx2, #6f767e); margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
@media (max-width: 560px) {
  .dvr-table { display: none; }
  .dvr-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
}
</style>
