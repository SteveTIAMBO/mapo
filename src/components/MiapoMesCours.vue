<!--
  « Mes cours » — une BIBLIOTHÈQUE, plus une page d'import.

  ⚠️ CE QUI CHANGE, ET POURQUOI (Steve, 27/08). La page était faite de trois
  ONGLETS — Importer / Ajouter une matière / Carré — alors que ce sont des
  ACTIONS ponctuelles, pas des destinations. Deux conséquences vécues :

   - la liste des cours enregistrés était cachée SOUS l'onglet « Importer »,
     c'est-à-dire derrière un formulaire de saisie. Pour revoir ce qu'on avait
     importé, il fallait passer par l'écran qui sert à importer ;
   - « Ajouter une matière » occupait un onglet permanent pour un geste qu'on
     fait deux fois par an.

  Désormais : la page MONTRE la bibliothèque, et un bouton ouvre une modale.
  Steve : « ajouter une matière revient en réalité à ajouter un cours » — d'où
  une seule modale, où la matière se choisit ou se crée à la volée.

  ⚠️ Le slot `ajouter-matiere` n'est PAS la même chose : il porte l'éditeur de
  modules d'une formation hors catalogue (le PROGRAMME, pas un cours). Il reste
  donc affiché, en carte, sans onglet — l'enterrer à nouveau reproduirait le
  défaut corrigé le 25/08, où l'import du programme n'était atteignable que
  depuis un écran vide.
-->
<template>
  <div class="mescours">
    <!-- ══════ La bibliothèque ══════ -->
    <div class="card">
      <div class="card-head mc-head">
        <FolderOpen :size="18" /><h3>{{ t('mia.mcMine') }}</h3>
        <button class="btn btn-primary btn-sm mc-add" @click="ouvrirAjout()">
          <Plus :size="15" /> <span>{{ t('mia.mcAdd') }}</span>
        </button>
      </div>

      <p v-if="!docs.length" class="muted mc-vide">{{ t('mia.mcHint') }}</p>

      <div v-for="g in groupes" :key="g.matiere || '__sans__'" class="mc-groupe">
        <div class="mc-groupe-head">
          <span class="mc-groupe-nom">{{ g.matiere || t('mia.mcNoSubject') }}</span>
          <span class="mc-groupe-n">{{ g.docs.length }}</span>
          <button class="mc-groupe-add" :title="t('mia.mcAddToSubject')" @click="ouvrirAjout(g.matiere)">
            <Plus :size="15" />
          </button>
        </div>
        <div class="mc-list">
          <div v-for="d in g.docs" :key="d.id" class="mc-item">
            <div class="mc-item-main">
              <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}</span>
              <span class="mc-meta">{{ fmt(d.majAt || d.at) }} · {{ (d.contenu || '').length }} {{ t('mia.mcChars') }}</span>
            </div>
            <button class="mc-act" :title="t('mia.mcEdit')" @click="ouvrirEdition(d)"><Pencil :size="15" /></button>
            <button class="mc-act mc-del" :title="t('mia.remove')" @click="supprimer(d)"><Trash2 :size="15" /></button>
          </div>
        </div>
      </div>

      <p class="mc-priv"><ShieldCheck :size="13" /> {{ t('mia.mcPrivacy') }}</p>
    </div>

    <!-- ══════ Le programme de la formation (hors catalogue) ══════
         Contenu fourni par la vue parente : c'est elle qui détient le profil. -->
    <div v-if="$slots['ajouter-matiere']" class="card">
      <div class="card-head"><BookPlus :size="18" /><h3><DualText :text="t('mia.mcSubjectsTitle')" /></h3></div>
      <slot name="ajouter-matiere" />
    </div>

    <!-- ══════ Carré ══════ Un RÉGLAGE : replié par défaut, il n'a pas à peser
         autant qu'un cours dans la page. -->
    <div class="card mc-carre">
      <button class="mc-carre-head" :aria-expanded="carreOuvert" @click="carreOuvert = !carreOuvert">
        <span class="mc-carre-badge">C</span>
        <h3>{{ t('mia.mcCarreTitle') }}</h3>
        <span class="mc-carre-etat">{{ connecteurs.carreConnected ? t('mia.mcCarreOn') : t('mia.mcCarreOff') }}</span>
        <ChevronDown :size="17" class="mc-carre-chev" :class="{ ouvert: carreOuvert }" />
      </button>
      <div v-if="carreOuvert" class="mc-carre-corps">
        <template v-if="connecteurs.carreConnected">
          <!-- ⚠️ PLUS DE SÉLECTEUR ICI (29/08). Le dossier se choisit désormais
               DANS Carré, pendant la connexion, et le jeton est cloisonné dessus
               côté serveur. Garder un sélecteur MAPO+ ferait croire qu'on peut
               changer de dossier d'ici — il faut refaire la connexion. Et un
               périmètre appliqué côté client n'est pas un périmètre. -->
          <p class="muted small mc-scope-note">{{ t('mia.mcCarreFolderNote') }}</p>
          <div class="mc-carre-actions">
            <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
            <button class="btn btn-ghost btn-sm" @click="connecteurs.disconnectCarre()">{{ t('mia.carreDisconnect') }}</button>
          </div>
        </template>
        <div v-else class="mc-carre-actions">
          <button class="btn btn-primary btn-sm" @click="connecteurs.connectCarre()"><Link2 :size="15" /> <span>{{ t('mia.carreConnect') }}</span></button>
          <a :href="connecteurs.carreAppUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><ExternalLink :size="15" /> <span>{{ t('mia.carreOpen') }}</span></a>
        </div>
      </div>
    </div>


    <!-- ══════ Modale : ajouter OU modifier ══════
         Un seul formulaire pour les deux : les champs sont identiques, et en
         dédoubler un aurait garanti qu'ils divergent. -->
    <div v-if="modaleOuverte" class="mc-modal-fond" @click.self="fermer">
      <div class="mc-modal" role="dialog" aria-modal="true">
        <div class="mc-modal-head">
          <h3>{{ enEdition ? t('mia.mcEditTitle') : t('mia.mcTitle') }}</h3>
          <button class="btn btn-ghost btn-sm" :aria-label="t('mia.close')" @click="fermer"><X :size="18" /></button>
        </div>

        <div class="mc-modal-corps">
          <div class="mc-row">
            <input v-if="newSubjectMode" v-model="newSubject" class="input" :placeholder="t('mia.mcNewSubjectPh')" @keydown.enter.prevent />
            <select v-else v-model="matiere" class="input" @change="onMatiereChange">
              <option value="">{{ t('mia.chooseSubject') }}</option>
              <option v-for="m in matieresConnues" :key="m" :value="m">{{ m }}</option>
              <option value="__new__">＋ {{ t('mia.mcNewSubject') }}</option>
            </select>
            <input v-model="titre" class="input" :placeholder="t('mia.mcTitlePh')" />
          </div>

          <textarea v-model="contenu" class="course-input" rows="9" :placeholder="t('mia.mcPastePh')"></textarea>

          <div class="mc-actions">
            <MiapoBoutonImport
              :label="t('mia.mcImport')" :label-occupe="t('mia.mcImporting')"
              :aide-fichier="t('mia.impHintCours')"
              accept=".pdf,.txt,text/plain,application/pdf,image/*"
              :busy="importing"
              @fichier="importerDocument"
            />
            <span v-if="info" class="muted small mc-info">{{ info }}</span>
          </div>
          <p class="mc-privacy"><ShieldCheck :size="13" /> {{ t('mia.photoPrivacyNote') }}</p>
        </div>

        <div class="mc-modal-pied">
          <button class="btn btn-ghost" @click="fermer">{{ t('mia.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!contenu.trim()" @click="enregistrer">
            <Check :size="16" /> <span>{{ t('mia.mcSave') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DualText from './DualText.vue'
import MiapoBoutonImport from './MiapoBoutonImport.vue'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'
import { listCoursPerso, addCoursPerso, removeCoursPerso, updateCoursPerso, coursParMatiere } from '../utils/coursPerso'
import { fileToText } from '../utils/pdfText'
import { fileToCleanImageUrl } from '../utils/image'
import { useConnecteursStore } from '../stores/connecteurs'
import { useTuteurStore } from '../stores/tuteur'
import { FolderOpen, BookPlus, Plus, Pencil, Trash2, Check, X, ShieldCheck, ExternalLink, Link2, ChevronDown } from 'lucide-vue-next'
// `Check` et `FolderOpen` servent aussi au choix du dossier Carré.

const props = defineProps({ enfant: { type: Object, default: null } })
const { t, locale } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()
const tuteur = useTuteurStore()

const enfantId = computed(() => props.enfant?.id || 'me')
const niveau = computed(() => props.enfant?.niveau || '')

const docs = ref([])
const groupes = ref([])
function refresh() {
  docs.value = listCoursPerso(enfantId.value)
  groupes.value = coursParMatiere(enfantId.value)
}
onMounted(refresh)
watch(enfantId, refresh)

/**
 * Matières proposées : celles du programme PLUS celles déjà utilisées.
 * ⚠️ Sans les secondes, une matière créée à la volée disparaissait du menu au
 * document suivant — on la retapait, avec une faute de frappe une fois sur
 * deux, et le cours se retrouvait rangé dans deux matières jumelles.
 */
const matieresConnues = computed(() => {
  const s = new Set(matieresPourNiveau(niveau.value))
  for (const d of docs.value) if (d.matiere) s.add(d.matiere)
  return [...s].sort((a, b) => a.localeCompare(b, 'fr'))
})

// ── Carré : un réglage, replié par défaut ────────────────────────────────
const carreOuvert = ref(false)

// Le choix du dossier vit dans Carré depuis le 29/08 (jeton cloisonné) : plus
// rien à gérer ici.

// ── La modale (ajout ET modification) ────────────────────────────────────
const modaleOuverte = ref(false)
const enEdition = ref(null)   // id du cours modifié, null = ajout
const matiere = ref('')
const newSubjectMode = ref(false)
const newSubject = ref('')
const titre = ref('')
const contenu = ref('')
const importing = ref(false)
const info = ref('')

function reinitialiser() {
  matiere.value = ''; newSubject.value = ''; newSubjectMode.value = false
  titre.value = ''; contenu.value = ''; info.value = ''; enEdition.value = null
}
/** `matierePrechoisie` : le « + » d'un groupe range le document au bon endroit. */
function ouvrirAjout(matierePrechoisie = '') {
  reinitialiser()
  matiere.value = matierePrechoisie || ''
  modaleOuverte.value = true
}
function ouvrirEdition(d) {
  reinitialiser()
  enEdition.value = d.id
  matiere.value = d.matiere || ''
  titre.value = d.titre || ''
  contenu.value = d.contenu || ''
  modaleOuverte.value = true
}
function fermer() { modaleOuverte.value = false; reinitialiser() }

function onMatiereChange() {
  if (matiere.value === '__new__') { matiere.value = ''; newSubject.value = ''; newSubjectMode.value = true }
}
const matiereEffective = computed(() => (newSubjectMode.value ? newSubject.value.trim() : matiere.value))

/**
 * Aiguillage d'un document déposé : une IMAGE se transcrit (IA), un PDF ou un
 * texte se lit directement. Les traitements restent séparés — ils n'ont ni le
 * même coût ni le même résultat — c'est le geste qui a été unifié.
 */
function importerDocument(file) {
  if (!file) return
  const estImage = (file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name || '')
  return estImage ? transcrirePhoto(file) : lireFichier(file)
}
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

function enregistrer() {
  if (!contenu.value.trim()) return
  const champs = { matiere: matiereEffective.value, titre: titre.value, contenu: contenu.value }
  if (enEdition.value) updateCoursPerso(enfantId.value, enEdition.value, champs)
  else addCoursPerso(enfantId.value, champs)
  fermer()
  refresh()
}

function supprimer(d) {
  // On nomme le document : plusieurs cours d'une même matière se ressemblent
  // dans la liste, et « Supprimer ce cours ? » ne dit pas lequel.
  const quoi = (d.titre || '').trim() || d.matiere || t('mia.mcUntitled')
  if (!confirm(t('mia.mcConfirmDel', { name: quoi }))) return
  removeCoursPerso(enfantId.value, d.id)
  refresh()
}

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString(locale.value.startsWith('en') ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' }
}
</script>

<style scoped>
.mescours { display: flex; flex-direction: column; gap: 14px; }

/**
 * ⚠️ `.card-head` est défini dans le CSS SCOPÉ de ParentMiapoView : il ne
 * traverse PAS jusqu'ici. Mesuré en production le 27/08 — `display: block` au
 * lieu de `flex` — l'icône, le titre et le bouton s'empilaient sur trois
 * lignes. On redéfinit donc la mise en page dans ce composant, au lieu de
 * compter sur une classe qui ne l'atteint pas.
 */
.mescours :deep(.card-head),
.mc-head { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; color: var(--pr); }
.mescours :deep(.card-head) h3,
.mc-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.mescours :deep(.card-head) > svg,
.mc-head > svg { flex: 0 0 auto; }
.mc-head { flex-wrap: wrap; }
.mc-head > .mc-add { margin-left: auto; }
.mc-vide { margin: 2px 0 4px; }

/* ── Groupe de matière ── */
.mc-groupe + .mc-groupe { margin-top: 14px; }
.mc-groupe-head {
  display: flex; align-items: center; gap: 8px;
  padding: 0 2px 6px; border-bottom: 1px solid rgba(0, 0, 0, .07); margin-bottom: 6px;
}
.mc-groupe-nom { font-size: 13.5px; font-weight: 600; color: var(--tx); }
.mc-groupe-n {
  min-width: 20px; padding: 1px 6px; border-radius: 999px;
  background: rgba(0, 0, 0, .06); font-size: 11.5px; text-align: center; color: var(--tx3);
}
.mc-groupe-add {
  margin-left: auto; display: flex; padding: 4px; border: 0; border-radius: 7px;
  background: transparent; color: var(--pr); cursor: pointer; opacity: .8;
}
.mc-groupe-add:hover { opacity: 1; background: rgba(0, 0, 0, .05); }

.mc-list { display: flex; flex-direction: column; gap: 4px; }
.mc-item { display: flex; align-items: center; gap: 8px; padding: 7px 2px; }
.mc-item + .mc-item { border-top: 1px solid rgba(0, 0, 0, .045); }
.mc-item-main { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.mc-name { font-size: 13.5px; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-meta { font-size: 11.5px; color: var(--tx3); }
.mc-act {
  flex: 0 0 auto; display: flex; padding: 6px; border: 0; border-radius: 8px;
  background: transparent; color: var(--tx3); cursor: pointer;
}
.mc-act:hover { background: rgba(0, 0, 0, .06); color: var(--tx); }
.mc-del:hover { color: #d93025; }

.mc-priv { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 11.5px; color: var(--tx3); }
.mc-privacy { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: 11.5px; color: var(--tx3); }

/* ── Carré replié ── */
.mc-carre { padding-top: 0; padding-bottom: 0; }
.mc-carre-head {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 14px 0; border: 0; background: transparent; cursor: pointer; text-align: left; color: inherit;
}
.mc-carre-head h3 { font-size: 15px; font-weight: 600; margin: 0; color: var(--tx); }
.mc-carre-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--pr); color: #fff; font-size: 12px; font-weight: 700;
}
.mc-carre-etat { margin-left: auto; font-size: 12px; color: var(--tx3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-carre-chev { flex: 0 0 auto; color: var(--tx3); transition: transform .18s; }
.mc-carre-chev.ouvert { transform: rotate(180deg); }
.mc-carre-corps { padding-bottom: 14px; }
.mc-carre-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.mc-scope-note { margin: 4px 0 0; }

/* ── Modale ── */
.mc-modal-fond {
  position: fixed; inset: 0; z-index: 9800;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(20, 22, 28, .42); backdrop-filter: blur(2px);
}
.mc-modal {
  width: 100%; max-width: 640px; max-height: 90vh;
  display: flex; flex-direction: column;
  background: #fff; border-radius: 16px; box-shadow: 0 18px 50px rgba(0, 0, 0, .24);
}
.mc-modal-head, .mc-modal-pied {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px;
}
.mc-modal-head { border-bottom: 1px solid rgba(0, 0, 0, .07); }
.mc-modal-head h3 { flex: 1; margin: 0; font-size: 16px; font-weight: 600; }
.mc-modal-corps { padding: 14px 16px; overflow: auto; }
.mc-modal-pied { border-top: 1px solid rgba(0, 0, 0, .07); justify-content: flex-end; }

.mc-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.mc-row > .input { flex: 1 1 200px; min-width: 0; }
.course-input {
  width: 100%; padding: 10px 12px; border: 1px solid rgba(0, 0, 0, .14); border-radius: 10px;
  font: inherit; font-size: 13.5px; resize: vertical; background: #fff; color: var(--tx);
}
.mc-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 10px; }
.mc-info { flex: 1; min-width: 0; }

@media (max-width: 560px) {
  .mc-modal { max-height: 94vh; }
  .mc-modal-corps { padding: 12px 13px; }
}
</style>
