<template>
  <div class="sed-overlay" @click.self="$emit('close')">
    <div class="sed-modal">
      <button class="sed-close" type="button" @click="$emit('close')" aria-label="Fermer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <!-- En-tête -->
      <div class="sed-head">
        <div class="sed-avatar">{{ initials }}</div>
        <div class="sed-head-info">
          <div class="sed-name">{{ e.nomComplet }}</div>
          <div class="sed-meta">
            <span class="sed-mat">{{ e.matricule }}</span>
            <span class="sed-badge" :class="`n-${(e.niveau||'').toLowerCase()}`">{{ e.niveau }}</span>
            <span class="sed-prog">{{ e.programmeNom }}</span>
            <span class="sed-dot">·</span>
            <span>{{ e.anneeNom }}</span>
            <span v-if="campusVille" class="sed-dot">·</span>
            <span v-if="campusVille">Campus de {{ campusVille }}</span>
          </div>
          <div class="sed-tags">
            <span class="sed-tag" :class="e.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">{{ e.statut === 'en_difficulte' ? 'En difficulté' : 'Inscrit' }}</span>
            <span v-if="e.boursier" class="sed-tag is-bourse">Boursier</span>
          </div>
        </div>
        <div class="sed-head-kpi">
          <div class="sed-kpi-num">{{ e.moyenne != null ? e.moyenne.toFixed(1) : '—' }}<span>/20</span></div>
          <div class="sed-kpi-lab">Moyenne</div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="sed-tabs">
        <button v-for="t in tabs" :key="t.key" type="button" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
      </div>

      <div class="sed-body">
        <!-- Scolarité -->
        <div v-show="tab === 'scolarite'" class="sed-pane">
          <div class="sed-cards">
            <div class="sed-card">
              <div class="sed-card-num">{{ e.ectsValides }}<span> / {{ e.ectsRequis }}</span></div>
              <div class="sed-card-lab">Crédits acquis</div>
              <div class="sed-bar"><div class="sed-bar-fill" :style="{ width: pct + '%' }"></div></div>
            </div>
            <div class="sed-card">
              <div class="sed-card-num">{{ releve ? releve.moyenne.toFixed(2) : (e.moyenne != null ? e.moyenne.toFixed(2) : '—') }}</div>
              <div class="sed-card-lab">Moyenne du semestre</div>
            </div>
            <div class="sed-card">
              <div class="sed-card-num sed-mention" :class="mentionOk ? 'is-ok' : 'is-warn'">{{ releve && releve.mention ? releve.mention : (mentionOk ? 'Admis' : 'À consolider') }}</div>
              <div class="sed-card-lab">Décision / mention</div>
            </div>
          </div>
          <p class="sed-note">Filière {{ e.programmeNom }} · {{ e.anneeNom }} · semestre {{ releve ? releve.semestre : '—' }}. Les crédits sont capitalisés d'un semestre à l'autre selon le système LMD.</p>
        </div>

        <!-- Relevé de notes -->
        <div v-show="tab === 'releve'" class="sed-pane">
          <table v-if="releve && releve.lignes.length" class="sed-table">
            <thead>
              <tr><th>UE</th><th>Intitulé</th><th class="num">Crédits</th><th class="num">Note /20</th><th>Statut</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in releve.lignes" :key="l.ueId">
                <td class="sed-ue-code">{{ l.ueCode }}</td>
                <td>{{ l.ueIntitule }}</td>
                <td class="num">{{ l.ects }}</td>
                <td class="num"><span :class="l.note != null && l.note < 10 ? 'is-bad' : ''">{{ l.note != null ? l.note.toFixed(1) : '—' }}</span></td>
                <td><span class="sed-vld" :class="l.validee ? 'is-ok' : 'is-warn'">{{ l.validee ? 'Validée' : (l.note != null ? 'Non validée' : 'En attente') }}</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="2">Total</td><td class="num">{{ releve.ectsValides }} / {{ releve.totalEcts }}</td><td class="num">{{ releve.moyenne.toFixed(2) }}</td><td></td></tr>
            </tfoot>
          </table>
          <p v-else class="sed-empty">Relevé non disponible pour cet étudiant.</p>
        </div>

        <!-- Stage -->
        <div v-show="tab === 'stage'" class="sed-pane">
          <div v-if="stage" class="sed-stage">
            <div class="sed-stage-row"><span>Entreprise</span><strong>{{ stage.entreprise }}</strong></div>
            <div class="sed-stage-row"><span>Type</span><strong>{{ stage.type === 'alternance' ? 'Alternance' : 'Stage' }}</strong></div>
            <div class="sed-stage-row"><span>Ville</span><strong>{{ stage.ville }}</strong></div>
            <div class="sed-stage-row"><span>Période</span><strong>{{ stage.dateDebut }} → {{ stage.dateFin }} ({{ stage.dureeSemaines }} sem.)</strong></div>
            <div class="sed-stage-row"><span>Tuteur entreprise</span><strong>{{ stage.tuteurEntreprise }}</strong></div>
            <div class="sed-stage-row"><span>Tuteur école</span><strong>{{ stage.tuteurEcole }}</strong></div>
            <div class="sed-stage-row"><span>Statut</span><strong>{{ statutStage }}</strong></div>
          </div>
          <p v-else class="sed-empty">Aucune convention de stage enregistrée pour le moment.</p>
        </div>

        <!-- Identité -->
        <div v-show="tab === 'identite'" class="sed-pane">
          <div class="sed-ident">
            <div class="sed-ident-row"><span>Nom complet</span><strong>{{ e.nomComplet }}</strong></div>
            <div class="sed-ident-row"><span>Matricule</span><strong>{{ e.matricule }}</strong></div>
            <div class="sed-ident-row"><span>Filière</span><strong>{{ e.programmeNom }}</strong></div>
            <div class="sed-ident-row"><span>Niveau / promotion</span><strong>{{ e.niveau }} · {{ e.anneeNom }}</strong></div>
            <div class="sed-ident-row"><span>Campus</span><strong>{{ campusVille ? 'Campus de ' + campusVille : '—' }}</strong></div>
            <div class="sed-ident-row"><span>Ville d'origine</span><strong>{{ e.villeOrigine || '—' }}</strong></div>
            <div class="sed-ident-row"><span>Bourse</span><strong>{{ e.boursier ? 'Boursier' : 'Non boursier' }}</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore, CAMPUS } from '../../stores/superieur'

const props = defineProps({ etudiant: { type: Object, required: true } })
defineEmits(['close'])

const store = useSuperieurStore()
const e = computed(() => props.etudiant).value

const tab = ref('scolarite')
const tabs = [
  { key: 'scolarite', label: 'Scolarité' },
  { key: 'releve', label: 'Relevé de notes' },
  { key: 'stage', label: 'Stage' },
  { key: 'identite', label: 'Identité' },
]

const releve = computed(() => store.releveEtudiant(e.id)).value
const stage = computed(() => store.stages.find((s) => s.etudiantId === e.id)).value
const campusVille = computed(() => (CAMPUS.find((c) => c.id === e.campus) || {}).ville || '').value

const initials = (e.nomComplet || '')
  .split(' ')
  .map((w) => w[0])
  .slice(0, 2)
  .join('')
  .toUpperCase()

const pct = e.ectsRequis ? Math.round((e.ectsValides / e.ectsRequis) * 100) : 0
const mentionOk = (releve ? releve.moyenne : e.moyenne || 0) >= 10

const STATUT_STAGE = {
  en_cours: 'En cours', a_pourvoir: 'À pourvoir', soutenance_prevue: 'Soutenance prévue', valide: 'Validé',
}
const statutStage = computed(() => (stage ? (STATUT_STAGE[stage.statut] || stage.statut) : '')).value
</script>

<style scoped>
.sed-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(20, 32, 64, 0.42);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(2px);
}
.sed-modal {
  position: relative; width: 100%; max-width: 720px; max-height: 88vh; overflow: auto;
  background: #fff; border-radius: 20px;
  box-shadow: 0 30px 70px rgba(20, 32, 64, 0.28);
}
.sed-close {
  position: absolute; top: 16px; right: 16px; z-index: 2;
  background: rgba(20, 32, 64, 0.06); border: none; border-radius: 10px;
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  color: #5b6472; cursor: pointer;
}
.sed-close:hover { background: rgba(20, 32, 64, 0.12); }
.sed-head { display: flex; align-items: center; gap: 16px; padding: 26px 28px 18px; }
.sed-avatar {
  width: 60px; height: 60px; border-radius: 16px; flex-shrink: 0;
  background: var(--pr); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px;
}
.sed-head-info { flex: 1; min-width: 0; }
.sed-name { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 20px; color: var(--text, #1A1D1F); }
.sed-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; color: var(--muted, #6b7280); }
.sed-mat { font-weight: 700; color: var(--pr); }
.sed-dot { color: var(--muted, #9AA2B1); }
.sed-badge { font-size: 10.5px; font-weight: 700; border-radius: 20px; padding: 1px 8px; }
.sed-badge.n-bts { background: rgba(14,124,90,.12); color: #0E7C5A; }
.sed-badge.n-licence { background: rgba(var(--pr-rgb), .12); color: var(--pr); }
.sed-badge.n-master { background: rgba(184,137,42,.15); color: #B07308; }
.sed-tags { display: flex; gap: 8px; margin-top: 8px; }
.sed-tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 10px; }
.sed-tag.is-ok { background: rgba(14,124,90,.12); color: #0E7C5A; }
.sed-tag.is-warn { background: rgba(217,119,6,.14); color: #B45309; }
.sed-tag.is-bourse { background: rgba(var(--pr-rgb), .10); color: var(--pr); }
.sed-head-kpi { text-align: center; flex-shrink: 0; }
.sed-kpi-num { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--text, #1A1D1F); }
.sed-kpi-num span { font-size: 14px; color: var(--muted, #9AA2B1); }
.sed-kpi-lab { font-size: 11px; color: var(--muted, #9AA2B1); text-transform: uppercase; letter-spacing: .4px; }
.sed-tabs { display: flex; gap: 4px; padding: 0 20px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sed-tabs button {
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: 13.5px; font-weight: 600; color: var(--muted, #6b7280);
  padding: 12px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.sed-tabs button.active { color: var(--pr); border-bottom-color: var(--pr); }
.sed-body { padding: 22px 28px 28px; }
.sed-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sed-card { border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 12px; padding: 14px 16px; }
.sed-card-num { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 24px; color: var(--text, #1A1D1F); }
.sed-card-num span { font-size: 14px; color: var(--muted, #9AA2B1); font-weight: 600; }
.sed-card-lab { font-size: 12px; color: var(--muted, #6b7280); margin-top: 2px; }
.sed-mention.is-ok { color: #0E7C5A; } .sed-mention.is-warn { color: #B45309; }
.sed-bar { height: 6px; background: var(--input-bg, rgba(20,32,64,.06)); border-radius: 20px; margin-top: 10px; overflow: hidden; }
.sed-bar-fill { height: 100%; background: var(--pr); border-radius: 20px; }
.sed-note { font-size: 12.5px; color: var(--muted, #6b7280); margin-top: 16px; line-height: 1.5; }
.sed-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sed-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px 10px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.sed-table th.num, .sed-table td.num { text-align: right; }
.sed-table td { padding: 9px 10px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.sed-ue-code { font-weight: 700; color: var(--pr); }
.sed-table td .is-bad { color: #DC2626; font-weight: 700; }
.sed-vld { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 8px; }
.sed-vld.is-ok { background: rgba(14,124,90,.12); color: #0E7C5A; }
.sed-vld.is-warn { background: rgba(217,119,6,.14); color: #B45309; }
.sed-table tfoot td { font-weight: 700; border-top: 2px solid var(--border, rgba(20,32,64,.12)); border-bottom: none; }
.sed-stage, .sed-ident { display: flex; flex-direction: column; }
.sed-stage-row, .sed-ident-row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 2px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); font-size: 13.5px; }
.sed-stage-row span, .sed-ident-row span { color: var(--muted, #6b7280); }
.sed-stage-row strong, .sed-ident-row strong { color: var(--text, #1A1D1F); text-align: right; }
.sed-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
</style>
