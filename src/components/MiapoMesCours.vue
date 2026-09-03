<!--
  « Mes cours » — LA liste du programme de l'apprenant.

  ⚠️ CE QUI CHANGE, ET POURQUOI (Steve, 03/09). Deux défauts vécus le même jour,
  sur le compte MBA de Djany :

  1. **Ce composant se fabriquait sa PROPRE liste de matières** —
     `matieresPourNiveau(niveau)`, sans le pays et sans regarder
     `formationModules`. Pour « Formation (hors catalogue) », cette fonction
     tombe sur son `return MATIERES` final, c'est-à-dire le programme du
     SECONDAIRE CAMEROUNAIS. Une apprenante en certification ISO 27001 se voyait
     donc proposer « Éducation physique et sportive » pour ranger son cours,
     pendant que ses treize vrais modules s'affichaient dans la carte du dessus.
     Le reste de l'app (`matieresList`) était juste : c'est ce composant, seul,
     qui inventait. **Il ne calcule plus rien — la vue lui passe la liste.**

  2. **Le programme et la bibliothèque étaient DEUX cartes.** On ajoutait une
     matière dans l'une et un cours dans l'autre, sans que rien ne dise laquelle
     faisait autorité. Steve : « le cours EST le module ». Désormais une seule
     liste : un cours porte un nom et N documents. Elle alimente le quiz, les
     notes, le planning et les examens.

  ⚠️ RIEN NE SE REMPLIT PAR DÉFAUT LÀ OÙ MAPO NE SAIT PAS. Pour le supérieur et
  le hors-catalogue, la liste part VIDE : MAPO ne connaît pas le programme d'un
  MBA, et proposer une liste plausible serait pire qu'une liste vide — l'erreur
  aurait l'air d'un réglage. Là où un référentiel national existe (primaire,
  secondaire), il reste la base : c'est vraiment le programme de l'élève.
-->
<template>
  <div class="mescours">
    <!-- ══════ Le programme : une ligne par cours ══════ -->
    <div class="card">
      <div class="card-head mc-head">
        <FolderOpen :size="18" /><h3>{{ t('mia.mcMine') }}</h3>
        <button class="btn btn-primary btn-sm mc-add" @click="ouvrirNouveauCours">
          <Plus :size="15" /> <span>{{ t('mia.mcAddCourse') }}</span>
        </button>
      </div>
      <p class="muted mc-intro">{{ t('mia.mcProgrammeHint') }}</p>

      <!-- Second chemin de création : la plaquette de la formation. L'IA en
           extrait les modules, l'apprenant VALIDE, puis ils sont créés. Réservé
           aux formations sans référentiel : ailleurs le programme est connu. -->
      <div v-if="sansReferentiel" class="mc-sources">
        <button class="btn btn-outline btn-sm" @click="emit('importer-plaquette')">
          <Sparkles :size="15" /> <span>{{ t('mia.importProgramme') }}</span>
        </button>
        <slot name="modules-carre" />
      </div>

      <p v-if="!coursListe.length" class="muted mc-vide">{{ t('mia.mcNoCourse') }}</p>

      <div v-for="c in coursListe" :key="c.nom" class="mc-cours">
        <form v-if="renommage === c.nom" class="mc-cours-edit" @submit.prevent="validerRenommage(c.nom)">
          <input ref="champRenommage" v-model="saisieRenommage" class="input" maxlength="60" @keyup.esc="renommage = ''" />
          <button class="btn btn-outline btn-sm" type="submit" :disabled="!saisieRenommage.trim()">{{ t('mia.moduleSave') }}</button>
          <button class="btn btn-ghost btn-sm" type="button" @click="renommage = ''">{{ t('mia.moduleCancel') }}</button>
        </form>
        <div v-else class="mc-cours-head">
          <span class="mc-cours-nom">{{ c.nom }}</span>
          <!-- Le compteur inclut les documents de l'école : ce sont des cours
               du même cours. En exclure une source ferait dire « 0 » à une
               ligne qui en affiche trois. -->
          <span class="mc-cours-n">{{ c.docs.length + c.docsEcole.length }}</span>
          <button class="mc-act" :title="t('mia.mcAddToSubject')" @click="ouvrirAjout(c.nom)"><Plus :size="15" /></button>
          <!-- Un cours du référentiel national ne se renomme ni ne se supprime
               d'ici : ce n'est pas l'apprenant qui l'a créé. Seuls ses propres
               cours portent ces deux boutons. -->
          <template v-if="c.modifiable">
            <button class="mc-act" :title="t('mia.moduleRename')" @click="ouvrirRenommage(c.nom)"><Pencil :size="15" /></button>
            <button class="mc-act mc-del" :title="t('mia.moduleRemove')" @click="supprimerCours(c)"><Trash2 :size="15" /></button>
          </template>
        </div>

        <div v-if="c.docs.length || c.docsEcole.length" class="mc-list">
          <!-- Cours publiés par l'établissement : LECTURE SEULE. Ils
               n'appartiennent pas à l'apprenant ; les effacer d'ici ne ferait
               que masquer ce que son école publie, sans rien corriger. -->
          <div v-for="d in c.docsEcole" :key="'ec' + d.id" class="mc-item mc-item-ecole">
            <div class="mc-item-main">
              <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}</span>
              <span class="mc-meta">{{ d.auteur || t('mia.mcFromSchool') }} · {{ (d.contenu || '').length }} {{ t('mia.mcChars') }}</span>
            </div>
            <span class="mc-tag-ecole"><Link2 :size="12" /> {{ t('mia.mcSchoolTag') }}</span>
          </div>
          <div v-for="d in c.docs" :key="d.id" class="mc-item">
            <div class="mc-item-main">
              <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}</span>
              <span class="mc-meta">{{ fmt(d.majAt || d.at) }} · {{ (d.contenu || '').length }} {{ t('mia.mcChars') }}<template v-if="d.fileName"> · {{ d.fileName }}</template></span>
            </div>
            <button v-if="isViewable(d)" class="mc-act" :title="t('mia.mcViewFile')" @click="visionneuse = d"><Eye :size="15" /></button>
            <button v-else-if="hasFile(d)" class="mc-act" :title="t('mia.mcDownloadFile')" @click="telecharger(d)"><Download :size="15" /></button>
            <button class="mc-act" :title="t('mia.mcEdit')" @click="ouvrirEdition(d)"><Pencil :size="15" /></button>
            <button class="mc-act mc-del" :title="t('mia.remove')" @click="supprimer(d)"><Trash2 :size="15" /></button>
          </div>
        </div>
        <p v-else class="mc-cours-vide">{{ t('mia.mcCourseEmpty') }}</p>
      </div>

      <!-- ⚠️ Documents dont la matière ne figure plus au programme (cours
           supprimé, renommé hors de l'app, import ancien). Sans ce groupe ils
           deviendraient invisibles ALORS QU'ILS EXISTENT ENCORE — et un document
           qu'on ne voit plus, on le réimporte. -->
      <div v-if="orphelins.length" class="mc-cours mc-orphelins">
        <div class="mc-cours-head">
          <span class="mc-cours-nom">{{ t('mia.mcOrphans') }}</span>
          <span class="mc-cours-n">{{ orphelins.length }}</span>
        </div>
        <p class="mc-cours-vide">{{ t('mia.mcOrphansHint') }}</p>
        <div class="mc-list">
          <div v-for="d in orphelins" :key="d.id" class="mc-item">
            <div class="mc-item-main">
              <span class="mc-name">{{ d.titre || t('mia.mcUntitled') }}</span>
              <span class="mc-meta">{{ d.matiere || t('mia.mcNoSubject') }} · {{ fmt(d.majAt || d.at) }}</span>
            </div>
            <button class="mc-act" :title="t('mia.mcEdit')" @click="ouvrirEdition(d)"><Pencil :size="15" /></button>
            <button class="mc-act mc-del" :title="t('mia.remove')" @click="supprimer(d)"><Trash2 :size="15" /></button>
          </div>
        </div>
      </div>

      <p class="mc-priv"><ShieldCheck :size="13" /> {{ t('mia.mcPrivacy') }}</p>
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
            <!-- ⚠️ Les options viennent de la PROP, plus d'un calcul local. Ce
                 menu servait un catalogue du secondaire à une apprenante en
                 certification, parce qu'il redéduisait la liste tout seul. -->
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
          <!-- Le fichier CONSERVÉ, distinct du texte extrait. On le nomme et on
               offre de le retirer : sans ça, un PDF joint par erreur resterait
               attaché sans qu'on puisse le voir ni le défaire. -->
          <div v-if="fichier.fileName" class="mc-fichier">
            <FileText :size="14" />
            <span class="mc-fichier-nom">{{ fichier.fileName }}</span>
            <span v-if="!fichier.fileId && !fichier.fileData" class="mc-fichier-non">{{ t('mia.mcFileNotKept') }}</span>
            <button class="mc-act" :title="t('mia.remove')" @click="retirerFichier"><X :size="14" /></button>
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

    <!-- ══════ Modale : créer un cours ══════
         Un cours se crée pour lui-même, avant d'avoir le moindre document —
         c'est ainsi qu'on saisit un programme « un cours à la fois ». -->
    <div v-if="modaleCours" class="mc-modal-fond" @click.self="modaleCours = false">
      <div class="mc-modal mc-modal-court" role="dialog" aria-modal="true">
        <div class="mc-modal-head">
          <h3>{{ t('mia.mcAddCourse') }}</h3>
          <button class="btn btn-ghost btn-sm" :aria-label="t('mia.close')" @click="modaleCours = false"><X :size="18" /></button>
        </div>
        <form class="mc-modal-corps" @submit.prevent="creerCours">
          <input ref="champCours" v-model="nomCours" class="input" maxlength="60" :placeholder="t('mia.mcCourseNamePh')" />
          <p class="muted small mc-cours-aide">{{ t('mia.mcCourseNameHint') }}</p>
        </form>
        <div class="mc-modal-pied">
          <button class="btn btn-ghost" @click="modaleCours = false">{{ t('mia.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!nomCours.trim()" @click="creerCours">
            <Check :size="16" /> <span>{{ t('mia.moduleAdd') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Consultation du PDF : le composant existait déjà côté ERP, il n'y avait
         aucune raison d'en écrire un second. -->
    <CoursFileViewer v-if="visionneuse" :item="visionneuse" @close="visionneuse = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import MiapoBoutonImport from './MiapoBoutonImport.vue'
import { listCoursPerso, addCoursPerso, removeCoursPerso, updateCoursPerso } from '../utils/coursPerso'
import { fileToText } from '../utils/pdfText'
import { uploadCoursFile, hasFile, isViewable, downloadCoursFile, deleteCoursFile } from '../services/coursFiles'
import CoursFileViewer from './CoursFileViewer.vue'
import { fileToCleanImageUrl } from '../utils/image'
import { useConnecteursStore } from '../stores/connecteurs'
import { useTuteurStore } from '../stores/tuteur'
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ShieldCheck, ExternalLink, Link2, ChevronDown, Sparkles, Eye, Download, FileText } from 'lucide-vue-next'
// `Check` et `FolderOpen` servent aussi au choix du dossier Carré.

const props = defineProps({
  enfant: { type: Object, default: null },
  // ⚠️ LA liste du programme, calculée par la vue (qui détient le profil). Ce
  // composant ne la déduit plus : il la recevait autrefois par un
  // `matieresPourNiveau(niveau)` qui servait le secondaire camerounais à une
  // apprenante en certification.
  matieres: { type: Array, default: () => [] },
  // Cours créés par l'apprenant : les seuls qu'il peut renommer ou supprimer.
  // Ceux d'un référentiel national ne lui appartiennent pas.
  matieresPropres: { type: Array, default: () => [] },
  // Cours publiés par les enseignants (cache `coursEcole`). En lecture seule.
  coursEcole: { type: Array, default: () => [] },
  // Vrai quand MAPO ne connaît pas le programme (supérieur, hors catalogue) :
  // c'est là, et là seulement, qu'on propose l'import de la plaquette.
  sansReferentiel: { type: Boolean, default: false },
})
const emit = defineEmits(['creer-cours', 'retirer-cours', 'renommer-cours', 'importer-plaquette'])
const { t, locale } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()
const tuteur = useTuteurStore()

const enfantId = computed(() => props.enfant?.id || 'me')
const niveau = computed(() => props.enfant?.niveau || '')

const docs = ref([])
function refresh() { docs.value = listCoursPerso(enfantId.value) }
onMounted(refresh)
watch(enfantId, refresh)

const memeNom = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

/**
 * Le programme : une entrée par cours, ses documents dessous.
 *
 * ⚠️ Les sources s'ADDITIONNENT. Un cours peut porter à la fois ce que le prof
 * a publié et ce que l'apprenant a importé — c'est déjà la règle côté quiz
 * (cf. utils/coursEcole.js), elle doit se voir à l'écran.
 *
 * ⚠️ Un cours de l'école dont la matière n'est PAS au programme (matière que
 * l'apprenant n'a pas encore) apparaît quand même : la liste des cours de
 * l'école entre dans les entrées, sinon on masquerait un cours publié.
 */
const coursListe = computed(() => {
  const noms = [...props.matieres]
  for (const c of props.coursEcole) {
    if (c.matiere && !noms.some((m) => memeNom(m, c.matiere))) noms.push(c.matiere)
  }
  return noms.map((nom) => ({
    nom,
    docs: docs.value.filter((d) => memeNom(d.matiere, nom)),
    docsEcole: props.coursEcole.filter((d) => memeNom(d.matiere, nom)),
    // Un cours porté par l'école ne se supprime pas d'ici, même s'il figure
    // aussi dans les modules : l'apprenant n'en est pas l'auteur.
    modifiable: (props.sansReferentiel || props.matieresPropres.some((m) => memeNom(m, nom)))
      && !props.coursEcole.some((c) => memeNom(c.matiere, nom)),
  }))
})

/** Documents rattachés à une matière absente du programme — jamais masqués. */
const orphelins = computed(() =>
  docs.value.filter((d) => !coursListe.value.some((c) => memeNom(c.nom, d.matiere))))

/**
 * Matières proposées dans la modale : le programme PLUS celles déjà utilisées.
 * ⚠️ Sans les secondes, un document orphelin n'aurait plus aucune matière à
 * laquelle se raccrocher au moment de le corriger.
 */
const matieresConnues = computed(() => {
  const s = [...props.matieres]
  for (const d of docs.value) if (d.matiere && !s.some((m) => memeNom(m, d.matiere))) s.push(d.matiere)
  return s
})

// ── Créer / renommer / supprimer un COURS ────────────────────────────────
const modaleCours = ref(false)
const nomCours = ref('')
const champCours = ref(null)
const renommage = ref('')
const saisieRenommage = ref('')
const champRenommage = ref(null)

function ouvrirNouveauCours() {
  nomCours.value = ''
  modaleCours.value = true
  nextTick(() => { const c = champCours.value; if (c && c.focus) c.focus() })
}
function creerCours() {
  const n = nomCours.value.trim()
  if (!n) return
  emit('creer-cours', n)
  modaleCours.value = false
  nomCours.value = ''
}
function ouvrirRenommage(nom) {
  renommage.value = nom
  saisieRenommage.value = nom
  nextTick(() => { const c = champRenommage.value; const el = Array.isArray(c) ? c[0] : c; if (el && el.focus) el.focus() })
}
function validerRenommage(ancien) {
  const n = saisieRenommage.value.trim()
  renommage.value = ''
  if (!n || memeNom(n, ancien)) return
  emit('renommer-cours', { ancien, nouveau: n })
  // Les documents suivent leur cours : sans ça, renommer vidait la ligne et
  // faisait réapparaître les documents dans « À ranger ».
  for (const d of docs.value.filter((x) => memeNom(x.matiere, ancien))) {
    updateCoursPerso(enfantId.value, d.id, { matiere: n })
  }
  refresh()
}
async function supprimerCours(c) {
  // On dit combien de documents partent avec : « Supprimer ce cours ? » ne le
  // dit pas, et un document supprimé ne revient pas.
  const msg = c.docs.length
    ? t('mia.mcConfirmDelCourseDocs', { name: c.nom, n: c.docs.length })
    : t('mia.mcConfirmDelCourse', { name: c.nom })
  if (!confirm(msg)) return
  // Même règle que pour un document seul : le serveur d'abord, et on s'arrête
  // au premier échec plutôt que de laisser des fichiers orphelins derrière soi.
  for (const d of c.docs) {
    const r = await deleteCoursFile(d)
    if (!r.ok) { window.alert(t('mia.mcDeleteFileError')); refresh(); return }
    removeCoursPerso(enfantId.value, d.id)
  }
  emit('retirer-cours', c.nom)
  refresh()
}

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
const FICHIER_VIDE = { fileName: '', fileExt: '', fileId: '', fileData: '', fileViewable: false }
const fichier = ref(FICHIER_VIDE)
const visionneuse = ref(null)

function reinitialiser() {
  matiere.value = ''; newSubject.value = ''; newSubjectMode.value = false
  titre.value = ''; contenu.value = ''; info.value = ''; enEdition.value = null
  fichier.value = FICHIER_VIDE
}
function retirerFichier() { fichier.value = FICHIER_VIDE }
function telecharger(d) { downloadCoursFile(d) }
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
  // Le fichier déjà joint est REPRIS : sans ça, corriger une coquille dans le
  // texte détacherait le PDF, en silence.
  fichier.value = { fileName: d.fileName || '', fileExt: d.fileExt || '', fileId: d.fileId || '', fileData: d.fileData || '', fileViewable: !!d.fileViewable }
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
/**
 * Un PDF : on en extrait le TEXTE **et** on CONSERVE le fichier.
 *
 * ⚠️ Jusqu'ici le fichier était lu puis jeté. L'apprenant croyait avoir « importé
 * son cours » ; il n'en restait qu'un texte à plat — sans les schémas, les
 * tableaux ni la mise en page, c'est-à-dire sans une bonne part de ce qui fait
 * un cours de sciences ou de gestion. Les deux servent à des choses
 * différentes : le texte ancre les révisions, le fichier se consulte.
 *
 * ⚠️ Un dépôt qui échoue ne fait pas échouer l'import : le texte est extrait,
 * on le garde, et on DIT que le fichier n'a pas été conservé. Perdre les deux
 * parce que le réseau a coupé serait la pire des deux options.
 */
async function lireFichier(file) {
  importing.value = true; info.value = ''
  try {
    const text = (await fileToText(file)).trim()
    if (!text) { info.value = t('mia.mcImportError'); return }
    contenu.value = text
    if (!titre.value) titre.value = file.name.replace(/\.(pdf|txt)$/i, '')
    info.value = t('mia.mcImported', { name: file.name })

    // Seuls les formats que le serveur accepte et sait rendre consultables.
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (ext !== 'pdf') { fichier.value = FICHIER_VIDE; return }
    const r = await uploadCoursFile(file)
    fichier.value = r.ok
      ? { fileName: r.fileName, fileExt: r.fileExt, fileId: r.fileId || '', fileData: r.fileData || '', fileViewable: !!r.fileViewable }
      : { ...FICHIER_VIDE, fileName: file.name }
    if (!r.ok) {
      info.value = t('mia.mcImported', { name: file.name }) + ' — ' + (
        r.reason === 'demo_too_large' || r.reason === 'too_large' ? t('mia.mcFileTooLarge') : t('mia.mcFileNotKeptWhy'))
    }
  } catch {
    info.value = t('mia.mcImportError')
  } finally {
    importing.value = false
  }
}

function enregistrer() {
  if (!contenu.value.trim()) return
  const mat = matiereEffective.value
  const champs = { matiere: mat, titre: titre.value, contenu: contenu.value, ...fichier.value }
  // ⚠️ Une matière créée à la volée doit entrer AU PROGRAMME, pas seulement
  // servir d'étiquette au document. Sinon le cours n'existe que sur ce
  // document : ni le quiz, ni les notes, ni les examens ne le connaissent, et
  // il apparaît dans « À ranger » au prochain affichage.
  if (mat && !props.matieres.some((m) => memeNom(m, mat))) emit('creer-cours', mat)
  if (enEdition.value) updateCoursPerso(enfantId.value, enEdition.value, champs)
  else addCoursPerso(enfantId.value, champs)
  fermer()
  refresh()
}

/**
 * Supprime un document — À L'ÉCRAN **ET** SUR LE SERVEUR.
 *
 * ⚠️ Steve, 03/09 : « supprimer un doc de l'interface doit le supprimer du
 * serveur ». Retirer la ligne en laissant le PDF sur l'hébergement, c'est croire
 * avoir supprimé sans avoir supprimé — un problème de confiance avant d'être un
 * problème de disque.
 *
 * ⚠️ ORDRE : le serveur D'ABORD. Si on retirait l'entrée locale en premier et
 * que l'appel échouait, on perdrait l'identifiant du fichier — il resterait sur
 * le serveur SANS que personne ne puisse plus le désigner. Un échec laisse donc
 * le document en place, avec la raison affichée.
 */
async function supprimer(d) {
  // On nomme le document : plusieurs cours d'une même matière se ressemblent
  // dans la liste, et « Supprimer ce cours ? » ne dit pas lequel.
  const quoi = (d.titre || '').trim() || d.matiere || t('mia.mcUntitled')
  if (!confirm(t('mia.mcConfirmDel', { name: quoi }))) return
  const r = await deleteCoursFile(d)
  if (!r.ok) { window.alert(t('mia.mcDeleteFileError')); return }
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

.mc-intro { margin: 2px 0 12px; }
.mc-sources { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }

/* ── Un cours = une tuile de verre (langage du hub) ── */
.mc-cours {
  padding: 11px 13px; border-radius: 14px; margin-bottom: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .78), rgba(255, 255, 255, .5));
  border: 1px solid var(--card-border, rgba(17, 24, 39, .07));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .85);
}
.mc-cours-head { display: flex; align-items: center; gap: 8px; }
.mc-cours-nom { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-cours-n {
  min-width: 20px; padding: 1px 7px; border-radius: 999px;
  background: rgba(var(--pr-rgb, 10, 132, 255), .12); color: var(--pr);
  font-size: 11.5px; font-weight: 600; text-align: center;
}
.mc-cours-vide { margin: 6px 0 0; font-size: 12px; color: var(--tx3); }
.mc-cours-edit { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.mc-cours-edit .input { flex: 1 1 180px; min-width: 0; }
.mc-cours-aide { margin: 8px 0 0; }
/* Les orphelins ne sont pas une erreur à sanctionner : teinte neutre, pas rouge. */
.mc-orphelins { background: rgba(17, 24, 39, .04); }

.mc-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding-top: 4px; border-top: 1px solid var(--divider, rgba(17, 24, 39, .08)); }
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

.mc-item-ecole .mc-name { color: var(--tx2); }
.mc-tag-ecole {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  color: #1B8A5A; background: rgba(27, 138, 90, .10);
}
.mc-tag-ecole svg { flex-shrink: 0; }

.mc-fichier {
  display: flex; align-items: center; gap: 7px; margin-top: 8px;
  padding: 7px 10px; border-radius: 10px; background: rgba(17, 24, 39, .05);
  font-size: 12.5px; color: var(--tx2);
}
.mc-fichier svg { flex-shrink: 0; color: var(--pr); }
.mc-fichier-nom { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-fichier-non { flex-shrink: 0; font-size: 11.5px; color: #C0392B; }

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
.mc-modal-court { max-width: 460px; }
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
