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
            <span v-if="campusVille" class="sed-dot">·</span>
            <span v-if="campusVille">Campus de {{ campusVille }}</span>
          </div>
          <div class="sed-tags">
            <span class="sed-tag" :class="e.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">{{ e.statut === 'en_difficulte' ? 'En difficulté' : 'Inscrit' }}</span>
            <span v-if="e.boursier" class="sed-tag is-bourse">Boursier</span>
          </div>
        </div>
      </div>

      <!-- Onglets (administratif uniquement) -->
      <div class="sed-tabs">
        <button v-for="t in tabs" :key="t.key" type="button" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
      </div>

      <div class="sed-body">
        <!-- Identité civile -->
        <div v-show="tab === 'identite'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>Nom</span><strong>{{ e.nom }}</strong></div>
            <div class="sed-row"><span>Prénom</span><strong>{{ e.prenom }}</strong></div>
            <div class="sed-row"><span>Sexe</span><strong>{{ e.sexe === 'F' ? 'Féminin' : 'Masculin' }}</strong></div>
            <div class="sed-row"><span>Date de naissance</span><strong>{{ e.dateNaissance || '—' }}</strong></div>
            <div class="sed-row"><span>Lieu de naissance</span><strong>{{ e.lieuNaissance || '—' }}</strong></div>
            <div class="sed-row"><span>Nationalité</span><strong>{{ e.nationalite || '—' }}</strong></div>
            <div class="sed-row"><span>Pièce d'identité (CNI)</span><strong>{{ e.cni || '—' }}</strong></div>
            <div class="sed-row"><span>Matricule</span><strong>{{ e.matricule }}</strong></div>
          </div>
        </div>

        <!-- Contact & adresse -->
        <div v-show="tab === 'contact'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>Adresse</span><strong>{{ e.adresse || '—' }}</strong></div>
            <div class="sed-row"><span>Ville d'origine</span><strong>{{ e.villeOrigine || '—' }}</strong></div>
            <div class="sed-row"><span>Téléphone</span><strong>{{ e.telephone || '—' }}</strong></div>
            <div class="sed-row"><span>E-mail</span><strong>{{ e.email || '—' }}</strong></div>
          </div>
        </div>

        <!-- Parents / tuteur -->
        <div v-show="tab === 'parents'" class="sed-pane">
          <div v-if="e.parent" class="sed-rows">
            <div class="sed-row"><span>Nom du parent / tuteur</span><strong>{{ e.parent.nom }}</strong></div>
            <div class="sed-row"><span>Lien</span><strong>{{ e.parent.lien }}</strong></div>
            <div class="sed-row"><span>Téléphone</span><strong>{{ e.parent.telephone }}</strong></div>
            <div class="sed-row"><span>Profession</span><strong>{{ e.parent.profession }}</strong></div>
          </div>
          <p v-else class="sed-empty">Aucun parent / tuteur enregistré.</p>
        </div>

        <!-- Inscription & bourse -->
        <div v-show="tab === 'inscription'" class="sed-pane">
          <div class="sed-rows">
            <div class="sed-row"><span>Filière</span><strong>{{ e.programmeNom }}</strong></div>
            <div class="sed-row"><span>Niveau</span><strong>{{ e.niveau }}</strong></div>
            <div class="sed-row"><span>Promotion</span><strong>{{ e.anneeNom }}</strong></div>
            <div class="sed-row"><span>Campus</span><strong>{{ campusVille ? 'Campus de ' + campusVille : '—' }}</strong></div>
            <div class="sed-row"><span>Date d'inscription</span><strong>{{ e.dateInscription || '—' }}</strong></div>
            <div class="sed-row"><span>Statut</span><strong>{{ e.statut === 'en_difficulte' ? 'En difficulté' : 'Inscrit' }}</strong></div>
            <div class="sed-row"><span>Bourse</span><strong>{{ e.boursier ? (e.bourseLibelle || 'Boursier') : 'Non boursier' }}</strong></div>
          </div>
          <p class="sed-note">Le suivi pédagogique (notes, crédits, relevés) est disponible dans le module « Notes &amp; relevés » ; les stages dans le module « Stages ».</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CAMPUS } from '../../stores/superieur'

const props = defineProps({ etudiant: { type: Object, required: true } })
defineEmits(['close'])

const e = computed(() => props.etudiant).value

const tab = ref('identite')
const tabs = [
  { key: 'identite', label: 'Identité civile' },
  { key: 'contact', label: 'Contact & adresse' },
  { key: 'parents', label: 'Parents / tuteur' },
  { key: 'inscription', label: 'Inscription & bourse' },
]

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
</style>
