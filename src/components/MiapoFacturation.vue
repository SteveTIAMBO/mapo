<template>
  <div class="fact">
    <div class="card">
      <div class="card-head"><Receipt :size="18" /><h3>{{ t('mia.billTitle') }}</h3></div>
      <p class="muted">{{ t('mia.billHint') }}</p>

      <!-- Liste des factures -->
      <div v-if="factures.length" class="fact-list">
        <div v-for="f in factures" :key="f.id" class="fact-row">
          <div class="fr-info">
            <strong>{{ f.label }}</strong>
            <small>{{ dateFr(f.date) }} · {{ f.numero }}</small>
          </div>
          <div class="fr-amount">{{ fmtMontant(f.montant, f.devise) }}</div>
          <button class="btn btn-outline btn-sm" @click="voir(f)"><Download :size="14" /> <span>{{ t('mia.billDownload') }}</span></button>
        </div>
      </div>

      <!-- État vide -->
      <div v-else class="fact-empty">
        <Receipt :size="34" />
        <p>{{ t('mia.billEmpty') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useFacturationMiapoStore } from '../stores/facturationMiapo'
import { fmtMontant } from '../utils/devise'
import { Receipt, Download } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const fact = useFacturationMiapoStore()
const { factures } = storeToRefs(fact)

onMounted(() => fact.fetchFactures())
function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

/**
 * Ouvre un document imprimable (→ PDF) : REÇU pour un particulier, FACTURE
 * (avec mentions légales) pour une entreprise. En-tête EDUFREM, bon montant.
 */
function voir(f) {
  const p = authStore.userProfile || {}
  const entreprise = p.typeCompte === 'entreprise'
  const docType = entreprise ? 'FACTURE' : 'REÇU'
  const clientNom = entreprise ? (p.raisonSociale || '—') : (`${p.firstName || ''} ${p.lastName || ''}`.trim() || '—')
  const clientBlock = entreprise
    ? `${esc(clientNom)}<br>${esc(p.adresseFact || '')}${p.tva ? '<br>TVA : ' + esc(p.tva) : ''}`
    : esc(clientNom)
  const montant = fmtMontant(f.montant, f.devise)
  const styles = 'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1D1D1F;max-width:640px;margin:24px auto;padding:0 22px}'
    + '.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0A84FF;padding-bottom:14px}'
    + '.brand{font-size:22px;font-weight:800;letter-spacing:1px;color:#0A84FF}.brand small{display:block;font-size:12px;font-weight:600;color:#86868B;letter-spacing:0}'
    + '.doc{text-align:right}.doc h1{margin:0;font-size:20px}.doc div{font-size:12px;color:#86868B}'
    + '.parties{display:flex;justify-content:space-between;gap:20px;margin:22px 0;font-size:13px}.parties h3{font-size:11px;text-transform:uppercase;color:#86868B;margin:0 0 4px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:10px;border-bottom:1px solid #eee;font-size:14px}th{background:#f5f6f8;font-size:11px;text-transform:uppercase;color:#86868B}'
    + '.tot{text-align:right;font-size:18px;font-weight:800;margin-top:14px}.ft{margin-top:28px;font-size:11px;color:#86868B;border-top:1px solid #eee;padding-top:12px}'
    + '@media print{.noprint{display:none}}'
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + docType + ' ' + esc(f.numero) + '</title><style>' + styles + '</style></head><body>'
    + '<div class="hd"><div class="brand">EDUFREM<small>MAPO+ — professeur particulier disponible 24/7</small></div>'
    + '<div class="doc"><h1>' + docType + '</h1><div>N&deg; ' + esc(f.numero) + '</div><div>' + dateFr(f.date) + '</div></div></div>'
    + '<div class="parties"><div><h3>&Eacute;mis par</h3>EDUFREM<br>contact@edufrem.com</div>'
    + '<div><h3>' + (entreprise ? 'Factur&eacute; &agrave;' : 'Client') + '</h3>' + clientBlock + '</div></div>'
    + '<table><thead><tr><th>D&eacute;signation</th><th style="text-align:right">Montant</th></tr></thead>'
    + '<tbody><tr><td>' + esc(f.label) + '</td><td style="text-align:right">' + esc(montant) + '</td></tr></tbody></table>'
    + '<div class="tot">Total : ' + esc(montant) + '</div>'
    + '<div class="ft">Pay&eacute; par ' + esc(f.moyen || '—') + (f.transaction ? ' &middot; r&eacute;f. ' + esc(f.transaction) : '') + '. '
    + (entreprise ? 'Facture &eacute;tablie par EDUFREM.' : 'Merci de votre confiance — re&ccedil;u de paiement MAPO+.') + '</div>'
    + '<button class="noprint" onclick="window.print()" style="margin-top:22px;padding:10px 18px;border:none;border-radius:8px;background:#0A84FF;color:#fff;font-weight:600;cursor:pointer">Imprimer / Enregistrer en PDF</button>'
    + '</body></html>'
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }
.fact-list { display: flex; flex-direction: column; }
.fact-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-top: 1px solid var(--bd, #eef0f6); }
.fact-row:first-child { border-top: none; }
.fr-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.fr-info strong { font-size: 14px; color: var(--tx); }
.fr-info small { font-size: 12px; color: var(--tx3); }
.fr-amount { font-size: 14px; font-weight: 700; color: var(--tx); }
.fact-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 10px; color: var(--tx3); text-align: center; }
.fact-empty svg { opacity: .5; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
</style>
