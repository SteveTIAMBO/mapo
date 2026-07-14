<template>
  <transition name="sdv-fade">
    <div v-if="doc" class="sdv-overlay" @click.self="$emit('close')">
      <div class="sdv-modal">
        <div class="sdv-head">
          <h2 class="sdv-title">{{ doc.label }} — {{ candidat && candidat.nomComplet }}</h2>
          <button class="sdv-close" type="button" @click="$emit('close')" aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="sdv-body">
          <!-- Acte de naissance -->
          <div v-if="doc.key === 'acte_naissance'" class="sdv-paper">
            <div class="sdv-acte-hdr">
              <div class="sdv-acte-rep">RÉPUBLIQUE DU CAMEROUN</div>
              <div class="sdv-acte-devise">Paix — Travail — Patrie</div>
            </div>
            <div class="sdv-acte-title">EXTRAIT D'ACTE DE NAISSANCE</div>
            <div class="sdv-acte-no">N° {{ derived.acteNo }}</div>
            <div class="sdv-doc-rows">
              <div class="sdv-doc-row"><span>Nom</span><strong>{{ nomAffiche }}</strong></div>
              <div class="sdv-doc-row"><span>Prénom(s)</span><strong>{{ prenomAffiche }}</strong></div>
              <div class="sdv-doc-row"><span>Sexe</span><strong>{{ sexeLabel }}</strong></div>
              <div class="sdv-doc-row"><span>Né(e) le</span><strong>{{ derived.dateNaissance }} à {{ derived.lieu }}</strong></div>
              <div class="sdv-doc-row"><span>Fils / fille de</span><strong>{{ derived.pere }}</strong></div>
              <div class="sdv-doc-row"><span>Et de</span><strong>{{ derived.mere }}</strong></div>
            </div>
            <div class="sdv-acte-seal">L'Officier d'état civil · {{ derived.lieu }}</div>
          </div>

          <!-- Fiche d'inscription -->
          <div v-else-if="doc.key === 'fiche_inscription'" class="sdv-paper">
            <div class="sdv-fiche-title">FICHE D'INSCRIPTION</div>
            <div class="sdv-doc-rows">
              <div class="sdv-doc-row"><span>Candidat</span><strong>{{ candidat && candidat.nomComplet }}</strong></div>
              <div class="sdv-doc-row"><span>Sexe</span><strong>{{ sexeLabel }}</strong></div>
              <div class="sdv-doc-row"><span>Filière demandée</span><strong>{{ contextInfo }}</strong></div>
              <div class="sdv-doc-row"><span>Téléphone</span><strong>{{ (candidat && candidat.telephone) || '—' }}</strong></div>
            </div>
            <div class="sdv-sign">Signature du candidat<span class="sdv-sign-line"></span></div>
          </div>

          <!-- Pièce d'identité / CNI -->
          <div v-else-if="doc.key === 'piece_identite'" class="sdv-paper">
            <div class="sdv-cni-hdr">CARTE NATIONALE D'IDENTITÉ</div>
            <div class="sdv-cni-body">
              <div class="sdv-cni-photo">{{ initials }}</div>
              <div class="sdv-doc-rows sdv-cni-rows">
                <div class="sdv-doc-row"><span>Nom</span><strong>{{ nomAffiche }}</strong></div>
                <div class="sdv-doc-row"><span>Prénom(s)</span><strong>{{ prenomAffiche }}</strong></div>
                <div class="sdv-doc-row"><span>N°</span><strong>{{ derived.cni }}</strong></div>
              </div>
            </div>
          </div>

          <!-- Aperçu générique -->
          <div v-else class="sdv-paper sdv-generic">
            <svg class="sdv-generic-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
            <div class="sdv-generic-label">{{ doc.label }}</div>
            <div class="sdv-generic-sub">{{ candidat && candidat.nomComplet }}</div>
          </div>

          <div class="sdv-caption">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Aperçu de démonstration — le document original sera consultable une fois le dépôt de fichiers activé.
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  doc: { type: Object, default: null },
  candidat: { type: Object, default: () => ({}) },
  context: { type: Object, default: () => ({}) },
})
defineEmits(['close'])

function hashStr(s) {
  let h = 2166136261
  s = String(s || '')
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const CITIES = ['Yaoundé', 'Douala', 'Bafoussam', 'Bertoua', 'Garoua', 'Maroua', 'Ngaoundéré', 'Ebolowa', 'Bamenda', 'Kribi']
const PERES = ['Nkoulou Jean', 'Mballa Paul', 'Fotso André', 'Kamga Michel', 'Atangana Pierre', 'Bello Amadou', 'Njoya Samuel', 'Onana Joseph']
const MERES = ['Marie Chantal', 'Solange Épse Owona', 'Estelle Carine', 'Hélène Nadège', 'Grâce Flore', 'Aïssatou Fadimatou', 'Brigitte Rose', 'Vanessa Larissa']

const derived = computed(() => {
  const h = hashStr((props.candidat && props.candidat.nomComplet) || (props.candidat && props.candidat.nom) || 'x')
  const year = 2003 + (h % 4)
  const month = 1 + ((h >> 3) % 12)
  const day = 1 + ((h >> 7) % 28)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    dateNaissance: `${pad(day)}/${pad(month)}/${year}`,
    lieu: CITIES[h % CITIES.length],
    pere: PERES[(h >> 5) % PERES.length],
    mere: MERES[(h >> 9) % MERES.length],
    cni: `1${String(100000000 + (h % 899999999))}`.slice(0, 10),
    acteNo: `${1000 + (h % 8999)}/${year}`,
  }
})

const nomAffiche = computed(() => (props.candidat && props.candidat.nom) || String((props.candidat && props.candidat.nomComplet) || '').split(' ')[0] || '')
const prenomAffiche = computed(() => (props.candidat && props.candidat.prenom) || String((props.candidat && props.candidat.nomComplet) || '').split(' ').slice(1).join(' ') || '')
const sexeLabel = computed(() => ((props.candidat && props.candidat.sexe) === 'F' ? 'Féminin' : 'Masculin'))
const contextInfo = computed(() => {
  const c = props.context || {}
  return [c.programmeNom, c.anneeNom].filter(Boolean).join(' — ') || '—'
})
const initials = computed(() => {
  const n = (props.candidat && props.candidat.nomComplet) || ''
  return n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
})
</script>

<style scoped>
.sdv-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(12, 45, 90, 0.55); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.sdv-modal {
  width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto;
  background: #fff; border-radius: 18px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.sdv-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 12px; border-bottom: 1px solid var(--divider, rgba(20, 32, 64, 0.08));
}
.sdv-title { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 800; color: var(--tx, #1A1D1F); margin: 0; }
.sdv-close {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: var(--input-bg, #f1f3f7); border: none; color: var(--tx2, #6b7280); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;
}
.sdv-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger, #D93025); }
.sdv-body { padding: 20px 22px 22px; }

/* "Papier" document */
.sdv-paper {
  border: 1px solid #d9dee8; border-radius: 10px; padding: 22px 24px;
  background: repeating-linear-gradient(0deg, #fffef9, #fffef9 27px, #f6f4ec 28px);
  box-shadow: inset 0 0 0 4px #fff, 0 2px 10px rgba(20, 32, 64, 0.06);
  font-family: 'Outfit', 'Segoe UI', sans-serif;
}
.sdv-acte-hdr { text-align: center; }
.sdv-acte-rep { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 0.06em; color: #1e3a5f; }
.sdv-acte-devise { font-size: 11px; color: #5b6472; font-style: italic; margin-top: 1px; }
.sdv-acte-title { text-align: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.04em; color: #14203f; margin: 14px 0 4px; text-decoration: underline; }
.sdv-fiche-title { text-align: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.04em; color: #14203f; margin: 0 0 14px; text-decoration: underline; }
.sdv-acte-no { text-align: center; font-size: 12px; color: #5b6472; margin-bottom: 14px; }
.sdv-doc-rows { display: flex; flex-direction: column; gap: 2px; }
.sdv-doc-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 2px; border-bottom: 1px dashed rgba(20, 32, 64, 0.14); font-size: 13.5px; }
.sdv-doc-row span { color: #5b6472; }
.sdv-doc-row strong { color: #14203f; text-align: right; }
.sdv-acte-seal { margin-top: 16px; text-align: right; font-size: 12px; color: #5b6472; font-style: italic; }
.sdv-sign { margin-top: 20px; text-align: right; font-size: 12.5px; color: #5b6472; }
.sdv-sign-line { display: block; width: 150px; height: 1px; background: #9aa2b1; margin: 26px 0 0 auto; }

/* CNI */
.sdv-cni-hdr { text-align: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 0.05em; color: #0E7C5A; margin-bottom: 14px; }
.sdv-cni-body { display: flex; gap: 16px; align-items: center; }
.sdv-cni-photo {
  width: 74px; height: 90px; flex-shrink: 0; border-radius: 8px;
  background: linear-gradient(135deg, #cfd8e8, #eef2f8); border: 1px solid #c2ccdb;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 24px; color: #5b6472;
}
.sdv-cni-rows { flex: 1; }

/* Générique */
.sdv-generic { text-align: center; padding: 34px 24px; }
.sdv-generic-icon { color: #9aa2b1; }
.sdv-generic-label { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: #14203f; margin-top: 12px; }
.sdv-generic-sub { font-size: 13px; color: #5b6472; margin-top: 3px; }

.sdv-caption {
  display: flex; align-items: flex-start; gap: 7px;
  margin-top: 16px; padding: 10px 12px; border-radius: 8px;
  background: rgba(37, 99, 235, 0.06); color: #2563EB;
  font-size: 12px; line-height: 1.45;
}
.sdv-caption svg { flex-shrink: 0; margin-top: 1px; }

.sdv-fade-enter-active, .sdv-fade-leave-active { transition: opacity 0.2s ease; }
.sdv-fade-enter-from, .sdv-fade-leave-to { opacity: 0; }
</style>
