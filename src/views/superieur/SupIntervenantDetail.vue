<template>
  <div class="sid-overlay" @click.self="$emit('close')">
    <div class="sid-modal">
      <button class="sid-close" type="button" @click="$emit('close')" aria-label="Fermer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div class="sid-head">
        <div class="sid-avatar">{{ initials }}</div>
        <div class="sid-head-info">
          <div class="sid-name">{{ nomAffiche }}</div>
          <div class="sid-meta">
            <span class="sid-statut" :class="it.statut === 'vacataire' ? 'is-vac' : 'is-perm'">{{ it.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}</span>
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
          <div class="sid-kpi-lab">UE assurées</div>
        </div>
      </div>

      <div class="sid-tabs">
        <button v-for="t in tabs" :key="t.key" type="button" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
      </div>

      <div class="sid-body">
        <!-- Enseignements -->
        <div v-show="tab === 'ue'" class="sid-pane">
          <table v-if="ueList.length" class="sid-table">
            <thead>
              <tr><th>Code</th><th>Intitulé</th><th>Semestre</th><th class="num">Crédits</th><th class="num">Heures</th></tr>
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
              <tr><td colspan="3">Total</td><td class="num">{{ totalEcts }}</td><td class="num">{{ it.volumeHoraire }} h</td></tr>
            </tfoot>
          </table>
          <p v-else class="sid-empty">Aucune UE assignée actuellement.</p>
        </div>

        <!-- Profil / charge -->
        <div v-show="tab === 'profil'" class="sid-pane">
          <div class="sid-cards">
            <div class="sid-card"><div class="sid-card-num">{{ it.volumeHoraire }}<span> h</span></div><div class="sid-card-lab">Volume horaire annuel</div></div>
            <div class="sid-card"><div class="sid-card-num">{{ ueList.length }}</div><div class="sid-card-lab">Unités d'enseignement</div></div>
            <div class="sid-card"><div class="sid-card-num sid-charge" :class="chargeClass">{{ chargeLabel }}</div><div class="sid-card-lab">Charge</div></div>
          </div>
          <div class="sid-ident">
            <div class="sid-ident-row"><span>Statut</span><strong>{{ it.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}</strong></div>
            <div class="sid-ident-row"><span>Spécialité</span><strong>{{ it.specialite }}</strong></div>
            <div v-if="it.statut === 'vacataire' && it.coutHoraire" class="sid-ident-row"><span>Tarif horaire</span><strong>{{ formatFcfa(it.coutHoraire) }} FCFA/h</strong></div>
            <div class="sid-ident-row"><span>Nombre d'étudiants suivis</span><strong>{{ nbEtudiants }}</strong></div>
          </div>
        </div>

        <!-- Identité & contact -->
        <div v-show="tab === 'coord'" class="sid-pane">
          <div class="sid-ident">
            <div class="sid-ident-row"><span>Nom complet</span><strong>{{ nomAffiche }}</strong></div>
            <div class="sid-ident-row"><span>Sexe</span><strong>{{ it.sexe === 'F' ? 'Féminin' : 'Masculin' }}</strong></div>
            <div class="sid-ident-row"><span>Statut</span><strong>{{ it.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}</strong></div>
            <div class="sid-ident-row"><span>Spécialité</span><strong>{{ it.specialite }}</strong></div>
            <div class="sid-ident-row"><span>Téléphone</span><strong>{{ it.telephone || '—' }}</strong></div>
            <div class="sid-ident-row"><span>E-mail</span><strong>{{ it.email || email }}</strong></div>
            <div class="sid-ident-row"><span>Adresse</span><strong>{{ it.adresse || '—' }}</strong></div>
            <div v-if="it.statut === 'vacataire' && it.coutHoraire" class="sid-ident-row"><span>Tarif horaire</span><strong>{{ formatFcfa(it.coutHoraire) }} FCFA/h</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'

const props = defineProps({ intervenant: { type: Object, required: true } })
defineEmits(['close'])

const store = useSuperieurStore()
const it = computed(() => props.intervenant).value

const tab = ref('ue')
const tabs = [
  { key: 'ue', label: 'Enseignements' },
  { key: 'profil', label: 'Profil & charge' },
  { key: 'coord', label: 'Identité & contact' },
]

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

const chargeLabel = it.volumeHoraire >= 320 ? 'Surcharge' : it.volumeHoraire >= 120 ? 'Charge normale' : 'Charge légère'
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
.sid-note { font-size: 12.5px; color: var(--muted, #6b7280); margin-top: 14px; line-height: 1.5; }
.sid-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
</style>
