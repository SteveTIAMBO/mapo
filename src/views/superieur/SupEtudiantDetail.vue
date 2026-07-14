<template>
  <div class="sed-overlay" @click.self="$emit('close')">
    <div class="sed-modal">
      <button class="sed-close" type="button" @click="$emit('close')" :aria-label="t('sup.etudiantDetail.close')">
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
            <span v-if="campusVille" class="sed-dot">·</span>
            <span v-if="campusVille">{{ t('sup.etudiantDetail.campusOf', { ville: campusVille }) }}</span>
          </div>
          <div class="sed-tags">
            <span class="sed-tag" :class="e.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">{{ e.statut === 'en_difficulte' ? t('sup.etudiantDetail.enDifficulte') : t('sup.etudiantDetail.inscrit') }}</span>
            <span v-if="e.boursier" class="sed-tag is-bourse">{{ t('sup.etudiantDetail.boursier') }}</span>
          </div>
        </div>
      </div>

      <!-- Onglets (administratif uniquement) -->
      <div class="sed-tabs">
        <button v-for="tb in tabs" :key="tb.key" type="button" :class="{ active: tab === tb.key }" @click="tab = tb.key">{{ tb.label || t(tb.labelKey) }}</button>
      </div>

      <div class="sed-body">
        <!-- Identité civile -->
        <div v-show="tab === 'identite'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.nom') }}</span><strong>{{ e.nom }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.prenom') }}</span><strong>{{ e.prenom }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.sexe') }}</span><strong>{{ e.sexe === 'F' ? t('sup.etudiantDetail.feminin') : t('sup.etudiantDetail.masculin') }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.dateNaissance') }}</span><strong>{{ e.dateNaissance || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.lieuNaissance') }}</span><strong>{{ e.lieuNaissance || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.nationalite') }}</span><strong>{{ e.nationalite || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.cni') }}</span><strong>{{ e.cni || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.matricule') }}</span><strong>{{ e.matricule }}</strong></div>
          </div>
        </div>

        <!-- Contact & adresse -->
        <div v-show="tab === 'contact'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.adresse') }}</span><strong>{{ e.adresse || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.villeOrigine') }}</span><strong>{{ e.villeOrigine || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.telephone') }}</span><strong>{{ e.telephone || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.email') }}</span><strong>{{ e.email || '—' }}</strong></div>
          </div>
        </div>

        <!-- Parents / tuteur -->
        <div v-show="tab === 'parents'" class="sed-pane">
          <div v-if="e.parent" class="sed-rows">
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.parentNom') }}</span><strong>{{ e.parent.nom }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.lien') }}</span><strong>{{ e.parent.lien }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.telephone') }}</span><strong>{{ e.parent.telephone }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.profession') }}</span><strong>{{ e.parent.profession }}</strong></div>
          </div>
          <p v-else class="sed-empty">{{ t('sup.etudiantDetail.noParent') }}</p>
        </div>

        <!-- Inscription & bourse -->
        <div v-show="tab === 'inscription'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.filiere') }}</span><strong>{{ e.programmeNom }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.niveau') }}</span><strong>{{ e.niveau }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.promotion') }}</span><strong>{{ e.anneeNom }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.campus') }}</span><strong>{{ campusVille ? t('sup.etudiantDetail.campusOf', { ville: campusVille }) : '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.dateInscription') }}</span><strong>{{ e.dateInscription || '—' }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.statut') }}</span><strong>{{ e.statut === 'en_difficulte' ? t('sup.etudiantDetail.enDifficulte') : t('sup.etudiantDetail.inscrit') }}</strong></div>
            <div class="sed-row"><span>{{ t('sup.etudiantDetail.bourse') }}</span><strong>{{ e.boursier ? (e.bourseLibelle || t('sup.etudiantDetail.boursier')) : t('sup.etudiantDetail.nonBoursier') }}</strong></div>
          </div>
          <p class="sed-note">{{ t('sup.etudiantDetail.note') }}</p>
        </div>

        <!-- Documents d'admission (dossier d'inscription administrative) -->
        <div v-show="tab === 'documents'" class="sed-pane">
          <div v-if="dossier">
            <div class="sed-doc-status">
              <span>Statut du dossier</span>
              <span class="sed-doc-pill" :class="`is-${dossier.statut}`">{{ dossierStatutLabel }}</span>
            </div>
            <ul class="sed-doc-list">
              <li v-for="doc in dossier.documents" :key="doc.key" class="sed-doc" :class="doc.fourni ? 'is-ok' : 'is-missing'">
                <span class="sed-doc-ic">
                  <svg v-if="doc.fourni" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
                <span class="sed-doc-lbl">
                  {{ doc.label }}
                  <span v-if="doc.required" class="sed-doc-req">obligatoire</span>
                </span>
                <span class="sed-doc-st">{{ doc.fourni ? 'Fourni' : 'Manquant' }}</span>
              </li>
            </ul>
          </div>
          <p v-else class="sed-empty">Dossier d'inscription non disponible en démonstration.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CAMPUS } from '../../stores/superieur'
import { useSuperieurInscriptionsStore, DOSSIER_STATUS_OPTIONS } from '../../stores/superieurInscriptions'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({ etudiant: { type: Object, required: true } })
defineEmits(['close'])

const e = computed(() => props.etudiant).value

const tab = ref('identite')
const tabs = [
  { key: 'identite', labelKey: 'sup.etudiantDetail.tabIdentite' },
  { key: 'contact', labelKey: 'sup.etudiantDetail.tabContact' },
  { key: 'parents', labelKey: 'sup.etudiantDetail.tabParents' },
  { key: 'inscription', labelKey: 'sup.etudiantDetail.tabInscription' },
  // Onglet « Documents » (FR en dur : pas de clé i18n dédiée pour ce socle).
  { key: 'documents', label: 'Documents' },
]

// Dossier d'inscription administrative de l'étudiant (rapprochement par nom
// complet / matricule). En démonstration, les identités des candidats et des
// étudiants sont générées séparément → le repli « non disponible » est fréquent.
const inscriptionsStore = useSuperieurInscriptionsStore()
const dossier = inscriptionsStore.findDossierForEtudiant({ nomComplet: e.nomComplet, matricule: e.matricule })
const dossierStatutLabel = dossier
  ? ((DOSSIER_STATUS_OPTIONS.find((o) => o.value === dossier.statut) || {}).label || dossier.statut)
  : ''

const campusVille = computed(() => (CAMPUS.find((c) => c.id === e.campus) || {}).ville || '').value

const initials = (e.nomComplet || '')
  .split(' ')
  .map((w) => w[0])
  .slice(0, 2)
  .join('')
  .toUpperCase()
</script>

<style scoped>
.sed-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(20, 32, 64, 0.42);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(2px);
}
.sed-modal {
  position: relative; width: 100%; max-width: 620px; max-height: 88vh; overflow: auto;
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
.sed-tabs { display: flex; gap: 4px; padding: 0 20px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); flex-wrap: wrap; }
.sed-tabs button {
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: 13.5px; font-weight: 600; color: var(--muted, #6b7280);
  padding: 12px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.sed-tabs button.active { color: var(--pr); border-bottom-color: var(--pr); }
.sed-body { padding: 20px 28px 28px; }
.sed-rows { display: flex; flex-direction: column; }
.sed-row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 2px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06)); font-size: 13.5px; }
.sed-row span { color: var(--muted, #6b7280); }
.sed-row strong { color: var(--text, #1A1D1F); text-align: right; font-weight: 600; }
.sed-note { font-size: 12.5px; color: var(--muted, #6b7280); margin-top: 16px; line-height: 1.5; }
.sed-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }

/* Onglet Documents (dossier d'inscription administrative) */
.sed-doc-status {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 4px 2px 14px; border-bottom: 1px solid var(--border, rgba(20,32,64,.06));
  font-size: 13.5px; color: var(--muted, #6b7280);
}
.sed-doc-pill {
  font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700;
  border-radius: 20px; padding: 3px 10px;
}
.sed-doc-pill.is-brouillon { background: rgba(20,32,64,.08); color: #6b7280; }
.sed-doc-pill.is-soumis { background: rgba(37,99,235,.12); color: #2563EB; }
.sed-doc-pill.is-complet { background: rgba(184,137,42,.15); color: #B07308; }
.sed-doc-pill.is-incomplet { background: rgba(217,119,6,.14); color: #B45309; }
.sed-doc-pill.is-valide { background: rgba(14,124,90,.12); color: #0E7C5A; }
.sed-doc-pill.is-refuse { background: rgba(217,48,37,.1); color: #D93025; }
.sed-doc-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sed-doc {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 10px;
}
.sed-doc.is-ok { background: rgba(14,124,90,.05); }
.sed-doc.is-missing { background: rgba(217,119,6,.06); }
.sed-doc-ic {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.sed-doc.is-ok .sed-doc-ic { background: rgba(14,124,90,.15); color: #0E7C5A; }
.sed-doc.is-missing .sed-doc-ic { background: rgba(217,119,6,.18); color: #B45309; }
.sed-doc-lbl { flex: 1; min-width: 0; font-size: 13.5px; color: var(--text, #1A1D1F); }
.sed-doc-req {
  display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 20px;
  font-family: 'Poppins', sans-serif; font-size: 9.5px; font-weight: 700;
  background: rgba(217,48,37,.1); color: #D93025;
}
.sed-doc-st { font-size: 12px; font-weight: 700; }
.sed-doc.is-ok .sed-doc-st { color: #0E7C5A; }
.sed-doc.is-missing .sed-doc-st { color: #B45309; }
</style>
