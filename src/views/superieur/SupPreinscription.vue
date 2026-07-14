<template>
  <div class="spi">
    <div class="spi-card">
      <!-- En-tête établissement -->
      <div class="spi-brand">
        <div class="spi-logo">IS</div>
        <div>
          <div class="spi-school">Institut Supérieur EDUFREM</div>
          <div class="spi-tag">Pré-inscription en ligne · Année 2025-2026</div>
        </div>
      </div>

      <!-- Formulaire -->
      <template v-if="!submitted">
        <h1 class="spi-h1">Demande de pré-inscription</h1>
        <p class="spi-sub">
          Remplissez ce formulaire et joignez vos pièces. Votre demande sera transmise à la scolarité,
          qui reviendra vers vous pour la valider ou vous demander un complément.
        </p>

        <form class="spi-form" @submit.prevent="submit">
          <div class="spi-field">
            <label class="spi-label">Type de demande</label>
            <div class="spi-radios">
              <label class="spi-radio" :class="{ on: form.type === 'inscription' }">
                <input type="radio" value="inscription" v-model="form.type" /> Nouvelle inscription
              </label>
              <label class="spi-radio" :class="{ on: form.type === 'reinscription' }">
                <input type="radio" value="reinscription" v-model="form.type" /> Réinscription
              </label>
            </div>
          </div>

          <div class="spi-row">
            <div class="spi-field">
              <label class="spi-label">Prénom(s)</label>
              <input v-model="form.prenom" type="text" class="spi-input" required />
            </div>
            <div class="spi-field">
              <label class="spi-label">Nom</label>
              <input v-model="form.nom" type="text" class="spi-input" required />
            </div>
          </div>

          <div class="spi-row">
            <div class="spi-field">
              <label class="spi-label">Sexe</label>
              <select v-model="form.sexe" class="spi-input">
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div class="spi-field">
              <label class="spi-label">Téléphone (WhatsApp de préférence)</label>
              <input v-model="form.telephone" type="tel" class="spi-input" placeholder="6XX XX XX XX" />
            </div>
          </div>

          <div class="spi-field">
            <label class="spi-label">Filière demandée</label>
            <select v-model="form.promotionId" class="spi-input" required>
              <option value="">— Choisir une filière —</option>
              <option v-for="p in promotions" :key="p.id" :value="p.id">
                {{ p.programmeNom }} — {{ p.anneeNom }}
              </option>
            </select>
          </div>

          <!-- Pièces à joindre -->
          <div class="spi-docs">
            <div class="spi-docs-head">Pièces à joindre</div>
            <p class="spi-docs-hint">Cochez les pièces que vous fournissez. Vous pourrez transmettre les manquantes plus tard.</p>
            <div v-for="d in documents" :key="d.key" class="spi-doc" :class="{ on: !!attached[d.key] }">
              <span class="spi-doc-state-ic">
                <svg v-if="attached[d.key]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
              <span class="spi-doc-lbl">
                {{ d.label }}
                <span v-if="d.required" class="spi-doc-req">obligatoire</span>
              </span>
              <img v-if="scans[d.key] && scans[d.key].dataUrl" :src="scans[d.key].dataUrl" class="spi-doc-thumb" alt="" />
              <button type="button" class="spi-doc-btn" @click="scanDoc = d">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M6 12h12"/></svg>
                {{ attached[d.key] ? 'Modifier' : 'Scanner / Importer' }}
              </button>
            </div>
          </div>

          <p v-if="error" class="spi-error">{{ error }}</p>

          <button type="submit" class="spi-submit">Envoyer ma pré-inscription</button>
          <p class="spi-legal">
            En envoyant ce formulaire, vous acceptez que l'établissement traite ces informations pour l'étude de votre dossier.
          </p>
        </form>
      </template>

      <!-- Confirmation -->
      <div v-else class="spi-done">
        <div class="spi-done-ic">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 class="spi-done-title">Pré-inscription transmise</h2>
        <p class="spi-done-txt">
          Merci {{ submittedName }}. Votre demande a bien été reçue par la scolarité de l'Institut Supérieur EDUFREM.
          Vous serez recontacté(e) au numéro indiqué pour la suite (validation ou pièces complémentaires).
        </p>
        <div class="spi-ref">Référence du dossier : <strong>{{ reference }}</strong></div>
        <button type="button" class="spi-again" @click="reset">Faire une autre pré-inscription</button>
      </div>

      <div class="spi-foot">Propulsé par EDUFREM</div>
    </div>

    <SupDocScan :doc="scanDoc" @close="scanDoc = null" @attached="onAttached" />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { useSuperieurInscriptionsStore } from '../../stores/superieurInscriptions'
import SupDocScan from './SupDocScan.vue'

const superieur = useSuperieurStore()
const store = useSuperieurInscriptionsStore()

const promotions = computed(() => superieur.promotions)
const documents = computed(() => store.config.documents || [])

const form = reactive({ type: 'inscription', prenom: '', nom: '', sexe: 'M', telephone: '', promotionId: '' })
const attached = reactive({})
const scans = reactive({})
const scanDoc = ref(null)
function onAttached(p) { attached[p.key] = true; scans[p.key] = p; scanDoc.value = null }

const error = ref('')
const submitted = ref(false)
const submittedName = ref('')
const reference = ref('')

function submit() {
  error.value = ''
  if (!form.prenom.trim() || !form.nom.trim()) { error.value = 'Merci d’indiquer votre prénom et votre nom.'; return }
  if (!form.promotionId) { error.value = 'Merci de choisir la filière demandée.'; return }
  const promo = promotions.value.find((p) => p.id === form.promotionId) || {}
  const id = store.addPreinscription({
    type: form.type,
    prenom: form.prenom,
    nom: form.nom,
    sexe: form.sexe,
    telephone: form.telephone,
    promotionId: form.promotionId,
    programmeNom: promo.programmeNom,
    niveau: promo.niveau,
    anneeNom: promo.anneeNom,
    documents: { ...attached },
  })
  submittedName.value = form.prenom.trim()
  reference.value = String(id || '').toUpperCase()
  submitted.value = true
}

function reset() {
  Object.assign(form, { type: 'inscription', prenom: '', nom: '', sexe: 'M', telephone: '', promotionId: '' })
  Object.keys(attached).forEach((k) => { delete attached[k] })
  Object.keys(scans).forEach((k) => { delete scans[k] })
  error.value = ''
  submitted.value = false
}
</script>

<style scoped>
.spi {
  min-height: 100vh; width: 100%;
  background: linear-gradient(135deg, #eef2fb 0%, #f6f4fb 50%, #eefaf6 100%);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 18px; box-sizing: border-box;
}
.spi-card {
  width: 100%; max-width: 620px;
  background: #fff; border-radius: 22px;
  box-shadow: 0 24px 70px rgba(20, 32, 64, 0.14);
  padding: 30px 32px 22px;
}
.spi-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.spi-logo {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, #1558B0, #3b7dd8); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 18px;
}
.spi-school { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 17px; color: #14203f; }
.spi-tag { font-size: 12.5px; color: #6b7280; margin-top: 1px; }
.spi-h1 { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #14203f; margin: 0; }
.spi-sub { font-size: 13.5px; color: #5b6472; line-height: 1.5; margin: 6px 0 18px; }

.spi-form { display: flex; flex-direction: column; gap: 14px; }
.spi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.spi-field { display: flex; flex-direction: column; }
.spi-label {
  font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.03em; color: #7a8395; margin-bottom: 5px;
}
.spi-input {
  height: 42px; padding: 0 12px; box-sizing: border-box; width: 100%;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: #14203f;
  background: #f5f7fb; border: 1.5px solid #e2e7f0; border-radius: 10px; outline: none;
}
.spi-input:focus { border-color: #1558B0; }
.spi-radios { display: flex; gap: 10px; flex-wrap: wrap; }
.spi-radio {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px; border: 1.5px solid #e2e7f0; border-radius: 10px;
  font-size: 13.5px; color: #14203f; cursor: pointer; background: #f5f7fb;
}
.spi-radio.on { border-color: #1558B0; background: rgba(21, 88, 176, 0.06); color: #1558B0; font-weight: 600; }

.spi-docs { border-top: 1px solid #eef1f6; padding-top: 14px; margin-top: 2px; }
.spi-docs-head { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: #14203f; }
.spi-docs-hint { font-size: 12.5px; color: #6b7280; margin: 3px 0 10px; }
.spi-doc {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border: 1.5px solid #e2e7f0; border-radius: 10px;
  margin-bottom: 7px; cursor: pointer; transition: all 0.12s ease;
}
.spi-doc.on { border-color: #0E7C5A; background: rgba(14, 124, 90, 0.05); }
.spi-doc-state-ic { width: 20px; height: 20px; flex-shrink: 0; border-radius: 6px; border: 1.5px solid #cdd6e5; display: flex; align-items: center; justify-content: center; color: #fff; }
.spi-doc.on .spi-doc-state-ic { background: #0E7C5A; border-color: #0E7C5A; }
.spi-doc-thumb { width: 34px; height: 34px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e7f0; flex-shrink: 0; }
.spi-doc-btn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; background: rgba(21, 88, 176, 0.08); color: #1558B0; border: none; border-radius: 8px; padding: 7px 12px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 12px; cursor: pointer; }
.spi-doc-btn:hover { background: rgba(21, 88, 176, 0.16); }
.spi-doc input { width: 17px; height: 17px; flex-shrink: 0; accent-color: #0E7C5A; }
.spi-doc-lbl { flex: 1; min-width: 0; font-size: 13.5px; color: #14203f; }
.spi-doc-req {
  margin-left: 6px; font-size: 10px; font-weight: 700; color: #D93025;
  background: rgba(217, 48, 37, 0.1); border-radius: 20px; padding: 1px 7px;
}
.spi-doc-attach { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #6b7280; }
.spi-doc.on .spi-doc-attach { color: #0E7C5A; }

.spi-error {
  margin: 2px 0 0; padding: 9px 12px; font-size: 13px; color: #D93025;
  background: rgba(217, 48, 37, 0.06); border: 1px solid rgba(217, 48, 37, 0.15); border-radius: 8px;
}
.spi-submit {
  height: 46px; margin-top: 6px; border: none; border-radius: 11px;
  background: linear-gradient(135deg, #1558B0, #3b7dd8); color: #fff;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer;
  transition: opacity 0.15s ease;
}
.spi-submit:hover { opacity: 0.93; }
.spi-legal { font-size: 11.5px; color: #9aa2b1; text-align: center; line-height: 1.45; margin: 4px 0 0; }

.spi-done { text-align: center; padding: 18px 6px 8px; }
.spi-done-ic {
  width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 14px;
  background: rgba(14, 124, 90, 0.12); color: #0E7C5A;
  display: flex; align-items: center; justify-content: center;
}
.spi-done-title { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 20px; color: #14203f; margin: 0 0 8px; }
.spi-done-txt { font-size: 14px; color: #5b6472; line-height: 1.55; max-width: 460px; margin: 0 auto 16px; }
.spi-ref { font-size: 13px; color: #14203f; background: #f5f7fb; border-radius: 10px; padding: 10px 14px; display: inline-block; }
.spi-again {
  display: block; margin: 18px auto 0; background: none; border: 1.5px solid #e2e7f0;
  border-radius: 10px; padding: 10px 18px; font-family: 'Poppins', sans-serif; font-weight: 600;
  font-size: 13px; color: #5b6472; cursor: pointer;
}
.spi-foot { text-align: center; font-size: 11.5px; color: #b3bac7; margin-top: 20px; }

@media (max-width: 560px) { .spi-row { grid-template-columns: 1fr; } }
</style>
