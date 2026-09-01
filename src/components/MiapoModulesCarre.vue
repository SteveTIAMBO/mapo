<!--
  « Mes modules, depuis Carré » — on LIT la liste au lieu de la deviner.

  ⚠️ MESURÉ SUR LE CARRÉ RÉEL DE STEVE (28/08). Son espace « MBA » contient 24
  dossiers, et chacun porte le nom d'un module de sa formation : Gouvernance,
  Stratégie financière, Leadership, Droit, Design Sprint, Change Mgt, BMC…
  **La liste existait déjà, écrite par lui.** MAPO+ la faisait pourtant DEVINER
  par l'IA à partir du seul intitulé de la formation — donc à côté, forcément.

  ⚠️ RIEN N'EST COCHÉ D'OFFICE. Plusieurs dossiers ne sont pas des modules
  (« Pitchs », « KickOff », « Chef d'œuvre », « ARIIANE » : des projets), et
  aucune règle ne permet de les distinguer d'un cours. On propose, la personne
  tranche — c'est elle qui sait ce qu'elle révise.
-->
<template>
  <div class="mcar">
    <button class="btn btn-outline btn-sm" :disabled="chargement" @click="ouvrir">
      <span class="mcar-badge">C</span>
      <span>{{ chargement ? t('mia.mcarLoading') : t('mia.mcarImport') }}</span>
    </button>

    <div v-if="ouvert" class="mcar-fond" @click.self="ouvert = false">
      <div class="mcar-modal" role="dialog" aria-modal="true">
        <div class="mcar-head">
          <h3>{{ t('mia.mcarTitle') }}</h3>
          <button class="btn btn-ghost btn-sm" :aria-label="t('mia.close')" @click="ouvert = false"><X :size="18" /></button>
        </div>

        <div class="mcar-corps">
          <!--
            ⚠️ SECTION « DÉJÀ LÀ » : elle corrige un vrai défaut mesuré le 01/09.
            La fenêtre n'affichait que les dossiers Carré, alors que la sélection
            était pré-remplie avec les modules en place. Sur son compte : 23
            lignes affichées, 0 cochée, et le pied annonçait « 12 sélectionné(s) ».
            Douze modules sélectionnés que RIEN ne montrait — d'où l'impression
            qu'ils avaient disparu, et l'impossibilité de les décocher.
          -->
          <div v-if="deja.length" class="mcar-espace">
            <div class="mcar-espace-head">
              <strong>{{ t('mia.mcarDeja') }}</strong>
              <span class="mcar-n">{{ deja.length }}</span>
              <button class="lnk mcar-tout" @click="basculerSection(deja)">
                {{ sectionCochee(deja) ? t('mia.mcarNone') : t('mia.mcarAll') }}
              </button>
            </div>
            <p class="muted small">{{ t('mia.mcarDejaHint') }}</p>
            <label v-for="m in deja" :key="'d|' + m" class="mcar-item">
              <input type="checkbox" :value="m" :checked="choisis.has(m)" @change="basculer(m)" />
              <span>{{ m }}</span>
            </label>
          </div>

          <p v-if="!modules.length" class="muted">{{ t('mia.mcarEmpty') }}</p>
          <template v-else>
            <div class="mcar-espace">
              <div class="mcar-espace-head">
                <strong>{{ t('mia.mcarCarre') }}{{ racine ? ' — ' + racine : '' }}</strong>
                <span class="mcar-n">{{ modules.length }}</span>
                <button class="lnk mcar-tout" @click="basculerSection(nomsModules)">
                  {{ sectionCochee(nomsModules) ? t('mia.mcarNone') : t('mia.mcarAll') }}
                </button>
              </div>
              <p class="muted small">{{ t('mia.mcarHint') }}</p>
              <label v-for="d in modules" :key="d.id" class="mcar-item">
                <input type="checkbox" :value="d.nom" :checked="choisis.has(d.nom)" @change="basculer(d.nom)" />
                <span>{{ d.nom }}</span>
              </label>
            </div>
          </template>
        </div>

        <div class="mcar-pied">
          <span class="muted small mcar-compte">{{ t('mia.mcarTotal', { n: choisis.size }) }}</span>
          <button class="btn btn-ghost" @click="ouvert = false">{{ t('mia.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!choisis.size" @click="valider">
            <Check :size="16" /> <span>{{ t('mia.mcarApply') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Check } from 'lucide-vue-next'
import { useConnecteursStore } from '../stores/connecteurs'
import { listeModules } from '../utils/modulesFormation'

const props = defineProps({
  /** Modules déjà en place (chaîne séparée par des virgules) : on les pré-coche. */
  valeur: { type: String, default: '' },
})
const emit = defineEmits(['changer'])
const { t } = useI18n({ useScope: 'global' })
const connecteurs = useConnecteursStore()

const ouvert = ref(false)
const chargement = ref(false)
/**
 * ⚠️ PLUS D'ESPACES DEPUIS LE 29/08. Le jeton Carré est désormais cloisonné sur
 * une BRANCHE : le dossier choisi pendant la connexion, et lui seul. `/folders`
 * ne renvoie donc que cette racine et ses sous-dossiers — un par module. Il n'y
 * a plus rien à regrouper, la liste est plate.
 */
const racine = ref('')
const modules = ref([])
const choisis = ref(new Set())

async function ouvrir() {
  chargement.value = true
  try {
    const arbre = await connecteurs.carreArborescence()
    racine.value = arbre.racine ? arbre.racine.nom : ''
    modules.value = arbre.modules
    // Les modules DÉJÀ enregistrés restent cochés : ouvrir la fenêtre ne doit
    // pas donner l'impression qu'on repart de zéro.
    choisis.value = new Set(listeModules(props.valeur))
    ouvert.value = true
  } finally {
    chargement.value = false
  }
}

/** Comparaison de noms tolérante à la casse et aux accents. */
const cle = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

const nomsModules = computed(() => modules.value.map((d) => d.nom))

/**
 * Les modules DÉJÀ en place qui n'ont pas d'équivalent dans Carré (proposés par
 * MIAPO, importés d'un PDF, saisis à la main). On retire les homonymes pour ne
 * pas afficher deux fois la même case : c'est le même module.
 */
const deja = computed(() => {
  const carre = new Set(modules.value.map((d) => cle(d.nom)))
  return listeModules(props.valeur).filter((m) => !carre.has(cle(m)))
})

function basculer(d) {
  const s = new Set(choisis.value)
  if (s.has(d)) s.delete(d); else s.add(d)
  choisis.value = s
}
/** « Tout cocher » agit sur SA section, jamais sur ce qui est ailleurs. */
const sectionCochee = (noms) => noms.length > 0 && noms.every((n) => choisis.value.has(n))
function basculerSection(noms) {
  const s = new Set(choisis.value)
  const tout = sectionCochee(noms)
  for (const n of noms) { if (tout) s.delete(n); else s.add(n) }
  choisis.value = s
}

function valider() {
  // ⚠️ La virgule reste le séparateur (cf. utils/modulesFormation.js) : un nom
  // de dossier qui en contient une casserait la liste. Le nettoyage est fait
  // là-bas, une seule fois, pour tout le monde.
  emit('changer', [...choisis.value].join(', '))
  ouvert.value = false
}
</script>

<style scoped>
.mcar { display: inline-block; }
.mcar-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 5px; margin-right: 6px;
  background: var(--pr); color: #fff; font-size: 11px; font-weight: 700;
}
.mcar-fond {
  position: fixed; inset: 0; z-index: 9800;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(20, 22, 28, .42);
}
.mcar-modal {
  width: 100%; max-width: 560px; max-height: 88vh;
  display: flex; flex-direction: column;
  background: #fff; border-radius: 16px; box-shadow: 0 18px 50px rgba(0, 0, 0, .24);
}
.mcar-head, .mcar-pied { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.mcar-head { border-bottom: 1px solid rgba(0, 0, 0, .07); }
.mcar-head h3 { flex: 1; margin: 0; font-size: 16px; font-weight: 600; }
.mcar-corps { padding: 12px 16px; overflow: auto; }
.mcar-pied { border-top: 1px solid rgba(0, 0, 0, .07); justify-content: flex-end; }
.mcar-compte { margin-right: auto; }

.mcar-espace + .mcar-espace { margin-top: 14px; }
.mcar-espace-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 2px; border-bottom: 1px solid rgba(0, 0, 0, .07); margin-bottom: 4px;
}
.mcar-n {
  min-width: 20px; padding: 1px 6px; border-radius: 999px;
  background: rgba(0, 0, 0, .06); font-size: 11.5px; text-align: center; color: var(--tx3);
}
.mcar-tout { margin-left: auto; font-size: 12px; }
.mcar-item {
  display: flex; align-items: center; gap: 9px;
  padding: 6px 2px; font-size: 13.5px; cursor: pointer;
}
.mcar-item:hover { background: rgba(0, 0, 0, .03); border-radius: 7px; }
</style>
