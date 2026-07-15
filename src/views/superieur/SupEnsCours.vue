<template>
  <div class="crs">
    <div class="crs-head">
      <div>
        <h1 class="crs-h1">Cours &amp; ressources</h1>
        <p class="crs-sub">Publiez un support de cours ou une ressource pour vos étudiants.</p>
      </div>
    </div>

    <!-- Publier -->
    <section class="crs-panel">
      <h2 class="crs-h2">Publier un contenu</h2>
      <div class="crs-row">
        <div class="crs-fg">
          <label>Type</label>
          <select v-model="form.type" class="crs-input">
            <option value="cours">Cours</option>
            <option value="td">TD / Exercices</option>
            <option value="ressource">Ressource (lien)</option>
          </select>
        </div>
        <div class="crs-fg crs-grow">
          <label>Unité d'enseignement</label>
          <select v-model="form.ueId" class="crs-input">
            <option value="">— Toutes mes UE —</option>
            <option v-for="u in mesUe" :key="u.id" :value="u.id">{{ u.code }} · {{ u.intitule }}</option>
          </select>
        </div>
      </div>
      <div class="crs-fg">
        <label>Titre</label>
        <input v-model="form.titre" class="crs-input" type="text" placeholder="Ex. Chapitre 3 — Analyse financière" />
      </div>
      <div v-if="form.type === 'ressource'" class="crs-fg">
        <label>Lien</label>
        <input v-model="form.url" class="crs-input" type="url" placeholder="https://…" />
      </div>
      <div class="crs-fg">
        <label>Description <span class="crs-opt">(optionnel)</span></label>
        <textarea v-model="form.description" class="crs-input" rows="4" placeholder="Résumé, consignes, notions clés…"></textarea>
      </div>
      <div class="crs-actions">
        <button class="crs-btn" type="button" :disabled="!canPublish" @click="publier">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M12 3v13"/><path d="M8 7l4-4 4 4"/></svg>
          Publier
        </button>
        <transition name="crs-fade"><span v-if="justPublished" class="crs-ok">✓ Publié</span></transition>
      </div>
    </section>

    <!-- Liste -->
    <section class="crs-panel">
      <div class="crs-panel-head">
        <h2 class="crs-h2">Contenus publiés</h2>
        <span class="crs-count">{{ items.length }}</span>
      </div>
      <div v-if="items.length" class="crs-items">
        <div v-for="it in items" :key="it.id" class="crs-item" :class="'t-' + it.type">
          <div class="crs-item-main">
            <div class="crs-item-top">
              <span class="crs-type">{{ typeLabel(it.type) }}</span>
              <span v-if="it.ueCode" class="crs-ue">{{ it.ueCode }}</span>
            </div>
            <strong class="crs-item-title">{{ it.titre || 'Sans titre' }}</strong>
            <p v-if="it.description" class="crs-item-desc">{{ it.description }}</p>
            <a v-if="it.url" :href="it.url" target="_blank" rel="noopener" class="crs-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Ouvrir le lien
            </a>
            <div class="crs-item-meta">{{ moi.nomComplet }} · {{ fmtDate(it.createdAt) }}</div>
          </div>
          <button class="crs-del" type="button" title="Supprimer" @click="supprimer(it.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      <p v-else class="crs-empty">Aucun contenu publié pour l'instant.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()

// Intervenant courant — MÊME résolution que dans tout l'espace enseignant.
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const mesUe = computed(() => store.ue.filter((u) => u.intervenantId === moi.id)).value

// ── Persistance localStorage (démo) : clé sup_cours ──
const LS_KEY = 'sup_cours'
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch (e) { return [] }
}
const items = ref(load())
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items.value)) } catch (e) { /* silent */ }
}

const form = reactive({ type: 'cours', ueId: '', titre: '', url: '', description: '' })
const justPublished = ref(false)
const canPublish = computed(() =>
  form.titre.trim() && (form.type !== 'ressource' || form.url.trim())
)

function typeLabel(ty) {
  return ty === 'cours' ? 'Cours' : ty === 'td' ? 'TD / Exercices' : 'Ressource'
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch (e) { return '' }
}

function publier() {
  if (!canPublish.value) return
  const ue = mesUe.find((u) => u.id === form.ueId)
  items.value.unshift({
    id: 'crs-' + Date.now().toString(36),
    type: form.type,
    ueId: form.ueId || '',
    ueCode: ue ? ue.code : '',
    titre: form.titre.trim(),
    url: form.type === 'ressource' ? form.url.trim() : '',
    description: form.description.trim(),
    auteur: moi.nomComplet || '',
    createdAt: new Date().toISOString(),
  })
  persist()
  form.titre = ''; form.url = ''; form.description = ''
  justPublished.value = true
  setTimeout(() => { justPublished.value = false }, 2200)
}
function supprimer(id) {
  items.value = items.value.filter((x) => x.id !== id)
  persist()
}
</script>

<style scoped>
.crs { display: flex; flex-direction: column; gap: 16px; }
.crs-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.crs-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.crs-sub { font-size: 14px; color: var(--tx2, #5b6472); margin: 4px 0 0; }
.crs-panel { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.crs-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--tx, #1A1D1F); margin: 0 0 14px; }
.crs-panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.crs-panel-head .crs-h2 { margin: 0; }
.crs-count { font-size: 12px; font-weight: 700; color: var(--tx2); background: var(--input-bg, rgba(20,32,64,.05)); padding: 2px 9px; border-radius: 20px; }
.crs-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.crs-fg { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 180px; margin-bottom: 12px; }
.crs-fg.crs-grow { flex: 2; }
.crs-row .crs-fg { margin-bottom: 0; }
.crs-fg label { font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); }
.crs-opt { color: var(--tx3, #9AA2B1); font-weight: 500; }
.crs-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 14px; color: var(--tx, #23262E); background: var(--input-bg, rgba(20,32,64,.04)); border: 1px solid var(--border, rgba(20,32,64,.12)); border-radius: 9px; padding: 9px 12px; }
.crs-input:focus { outline: none; border-color: var(--pr); background: #fff; }
textarea.crs-input { resize: vertical; }
.crs-actions { display: flex; align-items: center; gap: 12px; }
.crs-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--pr); color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 700; font-size: 13.5px; padding: 10px 18px; cursor: pointer; }
.crs-btn:disabled { opacity: .5; cursor: not-allowed; }
.crs-ok { font-size: 12.5px; font-weight: 700; color: #0E7C5A; }
.crs-items { display: flex; flex-direction: column; gap: 10px; }
.crs-item { display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--border, rgba(20,32,64,.10)); border-radius: 12px; padding: 12px 14px; }
.crs-item-main { flex: 1; min-width: 0; }
.crs-item-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.crs-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--pr); background: rgba(var(--pr-rgb), .10); padding: 2px 8px; border-radius: 20px; }
.crs-item.t-td .crs-type { color: #C2751A; background: rgba(232, 149, 58, .16); }
.crs-item.t-ressource .crs-type { color: #0E7C5A; background: rgba(14, 124, 90, .12); }
.crs-ue { font-size: 11.5px; color: var(--tx2); font-weight: 600; }
.crs-item-title { display: block; font-size: 15px; color: var(--tx, #1f2937); }
.crs-item-desc { margin: 4px 0 6px; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; white-space: pre-line; }
.crs-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--pr); text-decoration: none; font-weight: 600; }
.crs-item-meta { font-size: 11.5px; color: var(--tx3, #9AA2B1); margin-top: 6px; }
.crs-del { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: var(--input-bg, rgba(20,32,64,.04)); border: none; border-radius: 8px; color: var(--tx3, #9AA2B1); cursor: pointer; transition: all .15s ease; }
.crs-del:hover { background: rgba(217,48,37,.10); color: #D93025; }
.crs-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
.crs-fade-enter-active, .crs-fade-leave-active { transition: opacity .3s ease; }
.crs-fade-enter-from, .crs-fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .crs-h1 { font-size: 20px; } .crs-fg { min-width: 0; } }
</style>
