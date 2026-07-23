<template>
  <div class="svc">
    <div class="svc-intro">
      <div>
        <h1 class="svc-h1">Attestations &amp; relevés</h1>
        <p class="svc-sub">Génération d'attestations de scolarité, de réussite et de relevés de notes (PDF imprimable).</p>
      </div>
      <button class="svc-btn" type="button" @click="showAdd = !showAdd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Nouveau document
      </button>
    </div>

    <div class="svc-kpis">
      <div class="svc-kpi"><div class="svc-kpi-label">Documents émis</div><div class="svc-kpi-value">{{ store.attestations.length }}</div></div>
      <div class="svc-kpi"><div class="svc-kpi-label">Ce mois-ci</div><div class="svc-kpi-value">{{ store.attMois }}</div></div>
    </div>

    <div v-if="showAdd" class="svc-card">
      <div class="svc-form">
        <div class="fld"><label>Type de document</label>
          <select v-model="na.type" class="in">
            <option>Attestation de scolarité</option>
            <option>Attestation de réussite</option>
            <option>Relevé de notes</option>
            <option>Certificat de fin de formation</option>
          </select>
        </div>
        <div class="fld"><label>Étudiant</label><input v-model="na.etudiant" class="in" placeholder="Nom" /></div>
        <div class="fld"><label>Formation</label><input v-model="na.formation" class="in" placeholder="Ex. Licence 3 Gestion" /></div>
      </div>
      <div class="svc-actions">
        <button class="svc-btn-ghost" @click="showAdd = false">Annuler</button>
        <button class="svc-btn" :disabled="!na.etudiant.trim()" @click="save">Émettre le document</button>
      </div>
    </div>

    <div class="svc-card">
      <table class="svc-table" v-if="store.attestations.length">
        <thead><tr><th>Référence</th><th>Type</th><th>Étudiant</th><th>Formation</th><th>Date</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in store.attestations" :key="a.id">
            <td><code class="svc-ref">{{ a.ref }}</code></td>
            <td>{{ a.type }}</td>
            <td>{{ a.etudiant }}</td>
            <td class="svc-muted">{{ a.formation || '—' }}</td>
            <td>{{ fmtDate(a.date) }}</td>
            <td class="svc-r">
              <button class="svc-mini" @click="imprimer(a)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                PDF
              </button>
              <button class="svc-icon" title="Supprimer" @click="store.removeAttestation(a.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="svc-empty">Aucun document émis.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSuperieurServicesStore } from '../../stores/superieurServices'

const store = useSuperieurServicesStore()
const showAdd = ref(false)
const na = ref({ type: 'Attestation de scolarité', etudiant: '', formation: '' })

function fmtDate(d) { if (!d) return '—'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }
function save() {
  if (!na.value.etudiant.trim()) return
  store.addAttestation({ ...na.value })
  na.value = { type: 'Attestation de scolarité', etudiant: '', formation: '' }
  showAdd.value = false
}
function esc(s) { return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) }
function imprimer(a) {
  const w = window.open('', '_blank')
  if (!w) return
  const d = fmtDate(a.date)
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(a.ref)}</title>
  <style>body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:720px;margin:48px auto;padding:0 32px;line-height:1.7}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0A2540;padding-bottom:14px;margin-bottom:34px}
  .hd h2{margin:0;color:#0A2540;font-size:20px}.hd small{color:#555}
  h1{font-size:22px;text-align:center;letter-spacing:.5px;margin:26px 0 30px}
  .ref{text-align:right;color:#555;font-size:13px}.sig{margin-top:64px;text-align:right}
  .foot{margin-top:56px;border-top:1px solid #ccc;padding-top:10px;font-size:11px;color:#888;text-align:center}</style></head>
  <body onload="window.print()">
  <div class="hd"><div><h2>EDUFREM</h2><small>Enseignement supérieur — MAPO</small></div><div class="ref">Réf. ${esc(a.ref)}<br>Le ${esc(d)}</div></div>
  <h1>${esc(a.type)}</h1>
  <p>Le Directeur soussigné atteste que&nbsp;:</p>
  <p style="text-align:center;font-size:18px;margin:22px 0"><strong>${esc(a.etudiant)}</strong></p>
  <p>est régulièrement inscrit(e) au sein de l'établissement pour la formation <strong>${esc(a.formation || '—')}</strong> au titre de l'année académique 2025&ndash;2026.</p>
  <p>La présente ${esc(a.type.toLowerCase())} est délivrée pour servir et valoir ce que de droit.</p>
  <div class="sig">Fait pour valoir ce que de droit,<br><br>Le Directeur<br><br><br>__________________________</div>
  <div class="foot">Document généré par MAPO — EDUFREM. Vérifiable auprès du service de la scolarité.</div>
  </body></html>`)
  w.document.close()
}
</script>

<style scoped>
.svc { max-width: 1100px; }
.svc-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.svc-h1 { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--tx); margin: 0 0 4px; }
.svc-sub { color: var(--tx3); font-size: 14px; margin: 0; }
.svc-btn { display: inline-flex; align-items: center; gap: 7px; background: var(--pr); color: #fff; border: none; border-radius: 10px; padding: 9px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.svc-btn:disabled { opacity: .5; cursor: not-allowed; }
.svc-btn-ghost { background: none; border: 1px solid var(--divider); color: var(--tx); border-radius: 10px; padding: 9px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.svc-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.svc-kpi { background: var(--surface, #fff); border: 1px solid var(--divider); border-radius: 14px; padding: 14px 16px; }
.svc-kpi-label { font-size: 12px; color: var(--tx3); font-weight: 600; margin-bottom: 6px; }
.svc-kpi-value { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--tx); }
.svc-card { background: var(--surface, #fff); border: 1px solid var(--divider); border-radius: 16px; padding: 18px; margin-bottom: 18px; }
.svc-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 12px; font-weight: 600; color: var(--tx3); }
.in { border: 1px solid var(--divider); border-radius: 9px; padding: 9px 11px; font-size: 14px; background: var(--input-bg, #fff); color: var(--tx); width: 100%; }
.svc-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.svc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.svc-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3); font-weight: 700; padding: 8px 10px; border-bottom: 1px solid var(--divider); }
.svc-table td { padding: 11px 10px; border-bottom: 1px solid var(--divider); color: var(--tx); vertical-align: middle; }
.svc-table tr:last-child td { border-bottom: none; }
.svc-muted { color: var(--tx3); }
.svc-ref { font-family: ui-monospace, monospace; font-size: 12.5px; background: rgba(var(--pr-rgb), .08); color: var(--pr); padding: 2px 7px; border-radius: 6px; }
.svc-r { text-align: right; white-space: nowrap; }
.svc-mini { border: 1px solid var(--divider); background: none; color: var(--tx); border-radius: 8px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-right: 8px; }
.svc-mini:hover { border-color: var(--pr); color: var(--pr); }
.svc-icon { border: none; background: none; color: var(--tx3); cursor: pointer; padding: 6px; border-radius: 8px; vertical-align: middle; }
.svc-icon:hover { background: rgba(217, 48, 37, .1); color: #D93025; }
.svc-empty { color: var(--tx3); font-size: 14px; padding: 8px 2px; }
</style>
