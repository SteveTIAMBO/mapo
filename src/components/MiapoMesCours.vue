<template>
  <div class="mescours">
    <!-- Trois usages DISTINCTS étaient empilés sur une seule page : importer un
         cours, ajouter une matière, brancher Carré. Rien ne les relie sinon le
         nom du menu, et il fallait faire défiler pour découvrir qu'ils
         existaient. Des onglets rendent le choix visible d'emblée.

         Défilement horizontal et NON retour à la ligne : une rangée d'onglets
         qui passe sur deux lignes, on vient de la retirer des Paramètres pour
         cette raison. -->
    <nav class="mc-tabs" role="tablist">
      <button
        v-for="o in onglets" :key="o.cle" type="button" role="tab"
        class="mc-tab" :class="{ actif: onglet === o.cle }"
        :aria-selected="onglet === o.cle" @click="onglet = o.cle"
      >
        <component :is="o.icone" :size="15" />
        <!-- Libellé COURT sur mobile : « Importer un cours » + son sous-titre
             traduit ne tenaient pas dans un onglet, et le sous-titre de
             DualText est un bloc en colonne qui doublait la hauteur du bouton.
             L'icône porte le sens, le mot le précise. Le libellé complet reste
             en titre du panneau, où il a la place. -->
        <span class="mc-tab-long"><DualText :text="o.libelle" /></span>
        <span class="mc-tab-court">{{ o.court }}</span>
      </button>
    </nav>

    <!-- Importer un cours -->
    <div v-show="onglet === 'importer'" class="card">
      <div class="card-head"><FolderOpen :size="18" /><h3>{{ t('mia.mcTitle') }}</h3></div>
      <p class="muted">{{ t('mia.mcHint') }}</p>
      <div class="mc-row">
        <input v-if="newSubjectMode" v-model="newSubject" class="input" :placeholder="t('mia.mcNewSubjectPh')" @keydown.enter.prevent />
        <select v-else v-model="matiere" class="input" @change="onMatiereChange">
          <option value="">{{ t('mia.chooseSubject') }}</option>
          <option v-for="m in matieres" :key="m" :value="m">{{ m }}</option>
          <option value="__new__">＋ {{ t('mia.mcNewSubject') }}</option>
        </select>
        <input v-model="titre" class="input" :placeholder="t('mia.mcTitlePh')" />
      </div>
      <textarea v-model="contenu" class="course-input" rows="6" :placeholder="t('mia.mcPastePh')"></textarea>
      <div class="mc-actions">
        <!-- Un seul geste, comme partout ailleurs dans MAPO+ (Steve, 27/08) :
             deux boutons côte à côte obligeaient à choisir le chemin AVANT de
             savoir ce qu'on avait sous la main. -->
        <MiapoBoutonImport
          :label="t('mia.mcImport')" :label-occupe="t('mia.mcImporting')"
          :aide-fichier="t('mia.impHintCours')"
          accept=".pdf,.txt,text/plain,application/pdf,image/*"
          :busy="importing"
          @fichier="importerDocument"
        />
        <span v-if="info" class="muted small mc-info">{{ info }}</span>
        <button class="btn btn-primary btn-sm mc-save" :disabled="!contenu.trim()" @click="save">
          <Plus :size="14" /> <span>{{ t('mia.mcSave') }}</span>
        </button>
      </div>
      <p class="mc-privacy"><ShieldCheck :size="13" /> {{ t('mia.photoPrivacyNote') }}</p>
    </div>

    <!-- Mes cours enregistrés : sous « Importer », parce qu'on y vient juste
         après un import et qu'on veut vérifier que le cours est bien arrivé. -->
    <div v-show="onglet === 'importer'" class="card">
      <div class="card-head"><Layers :size="18" /><h3>{{ t('mia.mcMine') }}</h3></div>
      <div v-if="docs.length" class="mc-list">
        <div v-for="d in docs" :key="d.id" class="mc-item">
          <div class="mc-item-main">
            <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}<span v-if="d.matiere" class="mc-badge">{{ d.matiere }}</span></span>
            <span class="mc-meta">{{ fmt(d.at) }} · {{ (d.contenu || '').length }} {{ t('mia.mcChars') }}</span>
          </div>
          <button class="mc-del" :title="t('mia.remove')" @click="del(d.id)"><Trash2 :size="15" /></button>
        </div>
      </div>
      <p v-else class="muted small">{{ t('mia.mcEmpty') }}</p>
      <p class="mc-priv"><ShieldCheck :size="13" /> {{ t('mia.mcPrivacy') }}</p>
    </div>

    <!-- Ajouter une matière hors programme (contenu fourni par la vue parente :
         c'est elle qui détient le profil de l'enfant). -->
    <div v-show="onglet === 'matiere'">
      <slot name="ajouter-matiere" />
    </div>

    <!-- Carré : notes de cours comme source du sous-RAG (périmètre choisi).
         L'app Carré (sœur de l'écosystème) s'ouvre depuis ici — plus dans le menu. -->
    <div v-show="onglet === 'carre'" class="card">
      <div class="card-head"><span class="mc-carre-badge">C</span><h3>{{ t('mia.mcCarreTitle') }}</h3></div>
      <template v-if="connecteurs.carreConnected">
        <p class="muted">{{ t('mia.mcCarreOn') }}</p>
        <label class="int-label">{{ t('mia.mcCarreScope') }}</label>
        <input v-model="carreScope" class="input mc-scope" :placeholder="t('mia.mcCarreScopePh')" @change="saveScope" />
        <p class="muted small mc-scope-note">{{ t('mia.mcCarreScopeNote') }}</p>
        <div class="mc-carre-actions">
          <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
          <button class="btn btn-ghost btn-sm" @click="connecteurs.disconnectCarre()">{{ t('mia.carreDisconnect') }}</button>
        </div>
      </template>
      <template v-else>
        <p class="muted">{{ t('mia.mcCarreOff') }}</p>
        <div class="mc-carre-actions">
          <button class="btn btn-primary btn-sm" @click="connecteurs.connectCarre()"><Link2 :size="15" /> <span>{{ t('mia.carreConnect') }}</span></button>
          <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload as IcoUpload, BookPlus as IcoMatiere, Link2 as IcoCarre } from 'lucide-vue-next'
import DualText from './DualText.vue'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'
import { listCoursPerso, addCoursPerso, removeCoursPerso } from '../utils/coursPerso'
import { fileToText } from '../utils/pdfText'
import { fileToCleanImageUrl } from '../utils/image'
import { useConnecteursStore } from '../stores/connecteurs'
import { useTuteurStore } from '../stores/tuteur'
import { FolderOpen, Layers, Plus, Trash2, ShieldCheck, ExternalLink, Link2 } from 'lucide-vue-next'
import MiapoBoutonImport from './MiapoBoutonImport.vue'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t, locale } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()
const tuteur = useTuteurStore()

// Onglet courant. « Importer » d'abord : c'est l'usage le plus fréquent, et
// celui qui contient la liste des cours déjà enregistrés.
const onglet = ref('importer')
const onglets = computed(() => [
  { cle: 'importer', libelle: t('mia.mcTitle'), court: 'Importer', icone: IcoUpload },
  { cle: 'matiere', libelle: 'Ajouter une matière', court: 'Matière', icone: IcoMatiere },
  { cle: 'carre', libelle: t('mia.mcCarreTitle'), court: 'Carré', icone: IcoCarre },
])

// Périmètre Carré (dossier / mot-clé) à synchroniser vers le sous-RAG.
const carreScope = ref('')
try { carreScope.value = localStorage.getItem('mapo_carre_scope') || '' } catch { /* silent */ }
function saveScope() { try { localStorage.setItem('mapo_carre_scope', (carreScope.value || '').trim()) } catch { /* silent */ } }

const enfantId = computed(() => props.enfant?.id || 'me')
const niveau = computed(() => props.enfant?.niveau || '')
const matieres = computed(() => matieresPourNiveau(niveau.value))

const matiere = ref('')
const newSubjectMode = ref(false) // saisie d'une nouvelle matière (hors liste)
const newSubject = ref('')
const titre = ref('')
const contenu = ref('')
const importing = ref(false)
const info = ref('')
const docs = ref([])

// « + Nouvelle matière » dans le sélecteur → bascule en saisie libre.
function onMatiereChange() {
  if (matiere.value === '__new__') { matiere.value = ''; newSubject.value = ''; newSubjectMode.value = true }
}
// Matière effective : saisie libre si mode « nouvelle matière », sinon sélection.
const matiereEffective = computed(() => (newSubjectMode.value ? newSubject.value.trim() : matiere.value))

function refresh() { docs.value = listCoursPerso(enfantId.value) }
onMounted(refresh)
watch(enfantId, refresh)

/**
 * Aiguillage d'un document déposé : une IMAGE se transcrit (IA), un PDF ou un
 * texte se lit directement. C'est le geste qui a changé, pas les traitements —
 * ils restent séparés parce qu'ils n'ont ni le même coût ni le même résultat.
 */
function importerDocument(file) {
  if (!file) return
  const estImage = (file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name || '')
  return estImage ? transcrirePhoto(file) : lireFichier(file)
}
// Photo d'un cours → transcription IA en texte (l'image n'est pas conservée ;
// les données personnelles sont ignorées côté serveur).
async function transcrirePhoto(file) {
  importing.value = true; info.value = ''
  try {
    // Photo nettoyée AVANT envoi : le ré-encodage canvas retire les métadonnées
    // EXIF (GPS, appareil, date) — on n'envoie que les pixels du cours.
    const dataUrl = await fileToCleanImageUrl(file)
    const res = await tuteur.transcrireCours({ imageDataUrl: dataUrl, niveau: niveau.value })
    if (res.ok && res.texte) {
      contenu.value = contenu.value ? (contenu.value + '\n\n' + res.texte) : res.texte
      info.value = t('mia.mcPhotoOk')
    } else if (res.reason === 'annule') {
      info.value = ''
    } else {
      info.value = res.reason === 'illisible' ? t('mia.mcPhotoUnreadable') : t('mia.mcImportError')
    }
  } catch {
    info.value = t('mia.mcImportError')
  } finally {
    importing.value = false
  }
}

async function lireFichier(file) {
  importing.value = true; info.value = ''
  try {
    const text = (await fileToText(file)).trim()
    if (text) {
      contenu.value = text
      if (!titre.value) titre.value = file.name.replace(/\.(pdf|txt)$/i, '')
      info.value = t('mia.mcImported', { name: file.name })
    } else {
      info.value = t('mia.mcImportError')
    }
  } catch {
    info.value = t('mia.mcImportError')
  } finally {
    importing.value = false
  }
}

function save() {
  if (!contenu.value.trim()) return
  addCoursPerso(enfantId.value, { matiere: matiereEffective.value, titre: titre.value, contenu: contenu.value })
  matiere.value = ''; newSubject.value = ''; newSubjectMode.value = false; titre.value = ''; contenu.value = ''; info.value = ''
  refresh()
}
function del(id) { removeCoursPerso(enfantId.value, id); refresh() }

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString(locale.value.startsWith('en') ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' }
}
</script>

<style scoped>
.mc-tabs {
  display: flex; gap: 6px; padding: 4px; margin-bottom: 14px;
  background: rgba(var(--pr-rgb, 21, 88, 176), .06); border-radius: 14px;
  /* Défilement plutôt que retour à la ligne : la rangée reste sur UNE ligne,
     quelle que soit la largeur de l'écran. */
  overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.mc-tabs::-webkit-scrollbar { display: none; }
.mc-tab {
  display: inline-flex; align-items: center; gap: 7px; flex: 0 0 auto;
  padding: 9px 14px; border: none; border-radius: 11px; background: transparent;
  font-family: inherit; font-size: 13.5px; font-weight: 600;
  color: var(--tx3, #6b7280); cursor: pointer; white-space: nowrap;
  transition: background .15s, color .15s;
}
.mc-tab.actif { background: #fff; color: var(--pr); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.mc-tab-court { display: none; }
@media (max-width: 768px) {
  /* Trois onglets à parts égales, qui tiennent sans défilement : sur un écran
     étroit, un onglet qu'il faut aller chercher en faisant glisser passe
     inaperçu. */
  .mc-tabs { gap: 4px; padding: 3px; }
  .mc-tab { flex: 1 1 0; min-width: 0; justify-content: center; padding: 9px 6px; font-size: 12.5px; }
  .mc-tab-long { display: none; }
  .mc-tab-court { display: inline; overflow: hidden; text-overflow: ellipsis; }
}

.mescours { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 12px; }
.muted.small { font-size: 12.5px; }
.mc-row { display: flex; gap: 10px; margin-bottom: 10px; }
.mc-row .input { flex: 1; min-width: 0; }
.course-input { width: 100%; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 13px; font-family: inherit; font-size: 13.5px; resize: vertical; }
.mc-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.mc-info { flex: 1; min-width: 120px; }
.mc-privacy { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; line-height: 1.4; color: var(--tx3, #6b7280); margin: 8px 0 0; }
.mc-privacy svg { flex-shrink: 0; margin-top: 1px; color: #1B8A5A; }
.mc-save { margin-left: auto; }
.mc-list { display: flex; flex-direction: column; gap: 8px; }
.mc-item { display: flex; align-items: center; gap: 12px; padding: 10px 13px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; }
.mc-item-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.mc-name { font-size: 14px; font-weight: 700; color: var(--tx, #1f2937); display: inline-flex; align-items: center; gap: 8px; overflow: hidden; }
.mc-badge { font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 1px 8px; border-radius: 20px; white-space: nowrap; }
.mc-meta { font-size: 12px; color: var(--tx3, #6b7280); }
.mc-del { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid var(--bd, #e5e7eb); background: none; border-radius: 9px; color: var(--tx3, #6b7280); cursor: pointer; }
.mc-del:hover { background: rgba(217,48,37,.07); color: #D93025; border-color: rgba(217,48,37,.3); }
.mc-priv { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 12px; color: var(--tx3, #6b7280); }
.mc-carre-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #0f172a; color: #fff; font-weight: 800; font-size: 12px; }
.int-label { display: block; font-size: 13px; font-weight: 700; color: var(--tx, #1f2937); margin: 10px 0 6px; }
.mc-scope { width: 100%; max-width: 340px; }
.mc-scope-note { margin: 6px 0 12px; }
.mc-carre-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mc-carre-actions .btn { text-decoration: none; }
</style>
