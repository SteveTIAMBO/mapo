<template>
  <div class="sid-overlay" @click.self="$emit('close')">
    <div class="sid-modal">
      <button class="sid-close" type="button" @click="$emit('close')" :aria-label="t('sup.intervenantDetail.close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div class="sid-head">
        <div class="sid-avatar">{{ initials }}</div>
        <div class="sid-head-info">
          <div class="sid-name">{{ nomAffiche }}</div>
          <div class="sid-meta">
            <span class="sid-statut" :class="it.statut === 'vacataire' ? 'is-vac' : 'is-perm'">{{ it.statut === 'vacataire' ? t('sup.intervenantDetail.vacataire') : t('sup.intervenantDetail.permanent') }}</span>
            <span class="sid-spec">{{ it.specialite }}</span>
            <span v-if="it.statut === 'vacataire' && it.coutHoraire" class="sid-dot">·</span>
            <span v-if="it.statut === 'vacataire' && it.coutHoraire">{{ formatFcfa(it.coutHoraire) }} FCFA/h</span>
          </div>
          <div class="sid-tags">
            <span class="sid-tag" :class="chargeClass">{{ chargeLabel }}</span>
          </div>
        </div>
        <div class="sid-head-kpi">
          <div class="sid-kpi-num">{{ ueList.length }}</div>
          <div class="sid-kpi-lab">{{ t('sup.intervenantDetail.ueAssured') }}</div>
        </div>
      </div>

      <div class="sid-tabs">
        <button v-for="tb in tabs" :key="tb.key" type="button" :class="{ active: tab === tb.key }" @click="tab = tb.key">{{ tb.label }}</button>
      </div>

      <div class="sid-body">
        <!-- Enseignements -->
        <div v-show="tab === 'ue'" class="sid-pane">
          <table v-if="ueList.length" class="sid-table">
            <thead>
              <tr><th>{{ t('sup.intervenantDetail.thCode') }}</th><th>{{ t('sup.intervenantDetail.thTitle') }}</th><th>{{ t('sup.intervenantDetail.thSemester') }}</th><th class="num">{{ t('sup.intervenantDetail.thCredits') }}</th><th class="num">{{ t('sup.intervenantDetail.thHours') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in ueList" :key="u.id">
                <td class="sid-code">{{ u.code }}</td>
                <td>{{ u.intitule }}</td>
                <td>{{ u.semestre }}</td>
                <td class="num">{{ u.ects }}</td>
                <td class="num">{{ u.volumeHoraire }} h</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="3">{{ t('sup.intervenantDetail.total') }}</td><td class="num">{{ totalEcts }}</td><td class="num">{{ it.volumeHoraire }} h</td></tr>
            </tfoot>
          </table>
          <p v-else class="sid-empty">{{ t('sup.intervenantDetail.noUE') }}</p>
        </div>

        <!-- Profil / charge -->
        <div v-show="tab === 'profil'" class="sid-pane">
          <div class="sid-cards">
            <div class="sid-card"><div class="sid-card-num">{{ it.volumeHoraire }}<span> h</span></div><div class="sid-card-lab">{{ t('sup.intervenantDetail.annualHours') }}</div></div>
            <div class="sid-card"><div class="sid-card-num">{{ ueList.length }}</div><div class="sid-card-lab">{{ t('sup.intervenantDetail.teachingUnits') }}</div></div>
            <div class="sid-card"><div class="sid-card-num sid-charge" :class="chargeClass">{{ chargeLabel }}</div><div class="sid-card-lab">{{ t('sup.intervenantDetail.charge') }}</div></div>
          </div>
          <div class="sid-ident">
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.statut') }}</span><strong>{{ it.statut === 'vacataire' ? t('sup.intervenantDetail.vacataire') : t('sup.intervenantDetail.permanent') }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.specialite') }}</span><strong>{{ it.specialite }}</strong></div>
            <div v-if="it.statut === 'vacataire' && it.coutHoraire" class="sid-ident-row"><span>{{ t('sup.intervenantDetail.hourlyRate') }}</span><strong>{{ formatFcfa(it.coutHoraire) }} FCFA/h</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.studentsFollowed') }}</span><strong>{{ nbEtudiants }}</strong></div>
          </div>
        </div>

        <!-- Rémunération / fiches de paie -->
        <div v-show="tab === 'paie'" class="sid-pane">
          <div class="sid-cards">
            <div class="sid-card"><div class="sid-card-num">{{ formatFcfa(paie.brut) }}<span> FCFA</span></div><div class="sid-card-lab">Salaire brut / mois</div></div>
            <div class="sid-card"><div class="sid-card-num">{{ formatFcfa(paie.net) }}<span> FCFA</span></div><div class="sid-card-lab">Net à payer / mois</div></div>
            <div class="sid-card"><div class="sid-card-num">{{ formatFcfa(paie.brutAnnuel) }}<span> FCFA</span></div><div class="sid-card-lab">Brut annuel</div></div>
          </div>

          <div class="sid-paie-meta">
            {{ paie.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }} · Volume {{ paie.volume }} h<template v-if="paie.statut === 'vacataire' && paie.tauxHoraire"> · {{ formatFcfa(paie.tauxHoraire) }} FCFA/h</template>
          </div>

          <!-- Gains -->
          <div class="sid-paie-title">Gains</div>
          <div class="sid-ident">
            <div class="sid-ident-row"><span>Salaire de base</span><strong>{{ formatFcfa(paie.base) }} FCFA</strong></div>
            <div v-if="paie.indemniteTransport" class="sid-ident-row"><span>Indemnité de transport</span><strong>{{ formatFcfa(paie.indemniteTransport) }} FCFA</strong></div>
            <div v-if="paie.primeTechnicite" class="sid-ident-row"><span>Prime de technicité (8 %)</span><strong>{{ formatFcfa(paie.primeTechnicite) }} FCFA</strong></div>
            <div class="sid-ident-row is-total"><span>Salaire brut</span><strong>{{ formatFcfa(paie.brut) }} FCFA</strong></div>
          </div>

          <!-- Retenues -->
          <div class="sid-paie-title">Retenues</div>
          <div class="sid-ident">
            <div class="sid-ident-row is-neg"><span>CNPS (part salariale, 4,2 %)</span><strong>- {{ formatFcfa(paie.cnpsSalarie) }} FCFA</strong></div>
            <div class="sid-ident-row is-neg"><span>IRPP (barème simplifié)</span><strong>- {{ formatFcfa(paie.irpp) }} FCFA</strong></div>
            <div class="sid-ident-row is-neg"><span>CAC (10 % de l'IRPP)</span><strong>- {{ formatFcfa(paie.cac) }} FCFA</strong></div>
            <div class="sid-ident-row is-total is-neg"><span>Total des retenues</span><strong>- {{ formatFcfa(paie.totalRetenues) }} FCFA</strong></div>
          </div>

          <!-- Net à payer -->
          <div class="sid-net">
            <span>Net à payer</span>
            <strong>{{ formatFcfa(paie.net) }} FCFA</strong>
          </div>

          <p class="sid-emp-note">
            Charges patronales CNPS (employeur, ~11,2 %) : {{ formatFcfa(paie.cnpsEmployeur) }} FCFA — à titre indicatif, non déduites du net. Bulletin indicatif (démonstration).
          </p>

          <div class="sid-paie-list">
            <div class="sid-paie-title">Fiches de paie</div>
            <div v-for="m in moisDispo" :key="m.year + '-' + m.monthIndex" class="sid-paie-row">
              <span class="sid-paie-mois">{{ m.label }}</span>
              <span class="sid-paie-net">Net {{ formatFcfa(paie.net) }} FCFA</span>
              <button type="button" class="sid-paie-btn" @click="telechargerPaie(m)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Télécharger
              </button>
            </div>
          </div>
        </div>

        <!-- Identité & contact -->
        <div v-show="tab === 'coord'" class="sid-pane">
          <div class="sid-ident">
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.fullName') }}</span><strong>{{ nomAffiche }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.sex') }}</span><strong>{{ it.sexe === 'F' ? t('sup.intervenantDetail.female') : t('sup.intervenantDetail.male') }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.statut') }}</span><strong>{{ it.statut === 'vacataire' ? t('sup.intervenantDetail.vacataire') : t('sup.intervenantDetail.permanent') }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.specialite') }}</span><strong>{{ it.specialite }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.phone') }}</span><strong>{{ it.telephone || '—' }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.email') }}</span><strong>{{ it.email || email }}</strong></div>
            <div class="sid-ident-row"><span>{{ t('sup.intervenantDetail.address') }}</span><strong>{{ it.adresse || '—' }}</strong></div>
            <div v-if="it.statut === 'vacataire' && it.coutHoraire" class="sid-ident-row"><span>{{ t('sup.intervenantDetail.hourlyRate') }}</span><strong>{{ formatFcfa(it.coutHoraire) }} FCFA/h</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { generateFichePaie, fichePaieDetail, moisLabel } from '../../utils/pdfFichePaie'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({ intervenant: { type: Object, required: true } })
defineEmits(['close'])

const store = useSuperieurStore()
const it = computed(() => props.intervenant).value

const tab = ref('ue')
const tabs = computed(() => [
  { key: 'ue', label: t('sup.intervenantDetail.tabTeaching') },
  { key: 'profil', label: t('sup.intervenantDetail.tabProfile') },
  { key: 'paie', label: 'Rémunération' },
  { key: 'coord', label: t('sup.intervenantDetail.tabContact') },
])

// ── Rémunération / fiches de paie ──
const paie = computed(() => fichePaieDetail(it))
const now = new Date()
const moisDispo = computed(() => {
  const arr = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    arr.push({ year: d.getFullYear(), monthIndex: d.getMonth(), label: `${moisLabel(d.getMonth())} ${d.getFullYear()}` })
  }
  return arr
})
function telechargerPaie(m) { generateFichePaie(it, m.year, m.monthIndex, ECOLE) }

const ueList = computed(() => store.ue.filter((u) => u.intervenantId === it.id)).value
const totalEcts = ueList.reduce((s, u) => s + (u.ects || 0), 0)
const nbEtudiants = computed(() => {
  const promoIds = new Set(ueList.map((u) => u.promotionId))
  return store.etudiants.filter((e) => promoIds.has(e.promotionId)).length
}).value

const nomAffiche = it.nomComplet || `${it.prenom || ''} ${it.nom || ''}`.trim()
const initials = (nomAffiche || '')
  .split(' ')
  .map((w) => w[0])
  .slice(0, 2)
  .join('')
  .toUpperCase()

const chargeLabel = computed(() => it.volumeHoraire >= 320 ? t('sup.intervenantDetail.chargeOverload') : it.volumeHoraire >= 120 ? t('sup.intervenantDetail.chargeNormal') : t('sup.intervenantDetail.chargeLight'))
const chargeClass = it.volumeHoraire >= 320 ? 'is-warn' : 'is-ok'
const email = (nomAffiche || 'intervenant').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@ise.demo'

function formatFcfa(n) { return (n ?? 0).toLocaleString('fr-FR') }
</script>

<style scoped>
.sid-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(20,32,64,.42); display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
.sid-modal { position: relative; width: 100%; max-width: 700px; max-height: 88vh; overflow: auto; background: #fff; border-radius: 20px; box-shadow: 0 30px 70px rgba(20,32,64,.28); }
.sid-close { position: absolute; top: 16px; right: 16px; background: rgba(20,32,64,.06); border: none; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: #5b6472; cursor: pointer; }
.sid-close:hover { background: rgba(20,32,64,.12); }
.sid-head { display: flex; align-items: center; gap: 16px; padding: 26px 28px 18px; }
.sid-avatar { width: 60px; height: 60px; border-radius: 16px; flex-shrink: 0; background: var(--pr); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; }
.sid-head-info { flex: 1; min-width: 0; }
.sid-name { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 20px; color: var(--text, #1A1D1F); }
.sid-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; color: var(--muted, #6b7280); }
.sid-statut { font-size: 10.5px; font-weight: 700; border-radius: 20px; padding: 1px 8px; }
.sid-statut.is-perm { background: rgba(14,124,90,.12); color: #0E7C5A; }
.sid-statut.is-vac { background: rgba(217,119,6,.14); color: #B45309; }
.sid-dot { color: var(--muted, #9AA2B1); }
.sid-tags { margin-top: 8px; }
.sid-tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 10px; }
.sid-tag.is-ok { background: rgba(var(--pr-rgb), .10); color: var(--pr); }
.sid-tag.is-warn { background: rgba(217,119,6,.14); color: #B45309; }
.sid-head-kpi { text-align: center; flex-shrink: 0; }
.sid-kpi-num { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--text, #1A1D1F); }
.sid-kpi-lab { font-size: 11px; color: var(--muted, #9AA2B1); text-transform: uppercase; letter-spacing: .4px; }
.sid-tabs { display: flex; gap: 4px; padding: 0 20px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sid-tabs button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted, #6b7280); padding: 12px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.sid-tabs button.active { color: var(--pr); border-bottom-color: var(--pr); }
.sid-body { padding: 22px 28px 28px; }
.sid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sid-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px 10px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sid-table th.num, .sid-table td.num { text-align: right; }
.sid-table td { padding: 9px 10px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.sid-code { font-weight: 700; color: var(--pr); }
.sid-table tfoot td { font-weight: 700; border-top: 2px solid var(--border, rgba(20,32,64,.12)); border-bottom: none; }
.sid-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
.sid-card { border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 12px; padding: 14px 16px; }
.sid-card-num { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: var(--text, #1A1D1F); }
.sid-card-num span { font-size: 13px; color: var(--muted, #9AA2B1); font-weight: 600; }
.sid-card-lab { font-size: 12px; color: var(--muted, #6b7280); margin-top: 2px; }
.sid-charge.is-ok { color: var(--pr); } .sid-charge.is-warn { color: #B45309; }
.sid-ident { display: flex; flex-direction: column; }
.sid-ident-row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 2px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); font-size: 13.5px; }
.sid-ident-row span { color: var(--muted, #6b7280); }
.sid-ident-row strong { color: var(--text, #1A1D1F); text-align: right; }
.sid-ident-row.is-total { border-top: 1.5px solid var(--border, rgba(20,32,64,.14)); border-bottom: none; }
.sid-ident-row.is-total span, .sid-ident-row.is-total strong { color: var(--text, #1A1D1F); font-weight: 800; }
.sid-ident-row.is-neg strong { color: #B23B3B; }
.sid-paie-meta { font-size: 12.5px; color: var(--muted, #6b7280); margin: -6px 0 16px; }
.sid-net { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 16px; padding: 14px 18px; border-radius: 12px; background: rgba(var(--pr-rgb), .08); }
.sid-net span { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: var(--text, #1A1D1F); }
.sid-net strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 19px; color: var(--pr); }
.sid-emp-note { font-size: 12px; color: var(--muted, #6b7280); margin: 12px 0 0; line-height: 1.5; }
.sid-note { font-size: 12.5px; color: var(--muted, #6b7280); margin-top: 14px; line-height: 1.5; }
.sid-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
.sid-paie-list { margin-top: 12px; }
.sid-paie-title { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; color: var(--text, #1A1D1F); margin: 18px 0 8px; }
.sid-paie-row { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); }
.sid-paie-mois { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--text, #23262E); }
.sid-paie-net { font-size: 13px; color: var(--muted, #6b7280); font-variant-numeric: tabular-nums; }
.sid-paie-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 700; padding: 7px 12px; cursor: pointer; transition: background .15s ease; }
.sid-paie-btn:hover { background: rgba(var(--pr-rgb), .18); }
</style>
