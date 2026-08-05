<template>
  <div class="conf">
    <!-- Ce que nous conservons, en clair. Pas de renvoi vers un PDF de 20 pages :
         un parent doit pouvoir lire ça en trente secondes. -->
    <div class="card">
      <div class="card-head"><ShieldCheck :size="18" /><h3>{{ t('rgpd.title') }}</h3></div>
      <p class="muted small">{{ t('rgpd.intro') }}</p>
      <ul class="conf-list">
        <li v-for="(l, i) in lignes" :key="i"><strong>{{ l.quoi }}</strong> — {{ l.pourquoi }}</li>
      </ul>
      <p class="muted small">{{ t('rgpd.retention') }}</p>
      <p class="muted small">{{ t('rgpd.contact') }}</p>
    </div>

    <!-- Droit d'accès et de portabilité -->
    <div class="card">
      <div class="card-head"><FileText :size="18" /><h3>{{ t('rgpd.exportTitle') }}</h3></div>
      <p class="muted small">{{ t('rgpd.exportHint') }}</p>
      <button class="btn btn-outline btn-sm" :disabled="dp.busy" @click="exporter">
        <Loader2 v-if="dp.busy" :size="15" class="spin" /><FileText v-else :size="15" />
        <span>{{ t('rgpd.exportCta') }}</span>
      </button>
      <p v-if="exportOk" class="muted small saved-ok">{{ t('rgpd.exportDone') }}</p>
    </div>

    <!-- Droit à l'effacement -->
    <div class="card conf-danger">
      <div class="card-head"><Trash2 :size="18" /><h3>{{ t('rgpd.deleteTitle') }}</h3></div>
      <p class="muted small">{{ t('rgpd.deleteHint') }}</p>
      <template v-if="!confirmOuvert">
        <button class="btn btn-outline btn-sm danger" @click="confirmOuvert = true">{{ t('rgpd.deleteCta') }}</button>
      </template>
      <template v-else>
        <p class="conf-warn">{{ t('rgpd.deleteConfirmHint', { mot: MOT }) }}</p>
        <input v-model="motSaisi" class="input" :placeholder="MOT" />
        <div class="conf-actions">
          <button class="btn btn-ghost btn-sm" @click="annuler">{{ t('rgpd.cancel') }}</button>
          <button class="btn btn-sm danger-solid" :disabled="motSaisi.trim().toUpperCase() !== MOT || dp.busy" @click="supprimer">
            <Loader2 v-if="dp.busy" :size="15" class="spin" />
            <span>{{ t('rgpd.deleteConfirmCta') }}</span>
          </button>
        </div>
      </template>
      <p v-if="erreurLisible" class="conf-err">{{ erreurLisible }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ShieldCheck, FileText, Trash2, Loader2 } from 'lucide-vue-next'
import { useDonneesPersonnellesStore } from '../stores/donneesPersonnelles'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const dp = useDonneesPersonnellesStore()

// Mot à recopier avant suppression. Un simple « êtes-vous sûr ? » se clique sans
// lire ; recopier un mot oblige à s'arrêter une seconde. L'action est définitive.
const MOT = computed(() => t('rgpd.deleteWord')).value
const confirmOuvert = ref(false)
const motSaisi = ref('')
const exportOk = ref(false)

const lignes = computed(() => [
  { quoi: t('rgpd.dataChild'), pourquoi: t('rgpd.whyChild') },
  { quoi: t('rgpd.dataGrades'), pourquoi: t('rgpd.whyGrades') },
  { quoi: t('rgpd.dataAccount'), pourquoi: t('rgpd.whyAccount') },
  { quoi: t('rgpd.dataUsage'), pourquoi: t('rgpd.whyUsage') },
])

const erreurLisible = computed(() => {
  if (!dp.erreur) return ''
  if (dp.erreur === 'auth/requires-recent-login') return t('rgpd.errRecentLogin')
  if (dp.erreur === 'non_connecte') return t('rgpd.errNotSignedIn')
  return t('rgpd.errGeneric')
})

async function exporter() {
  exportOk.value = false
  const ok = await dp.exporterMesDonnees()
  if (ok) { exportOk.value = true; setTimeout(() => { exportOk.value = false }, 4000) }
}

function annuler() { confirmOuvert.value = false; motSaisi.value = ''; dp.erreur = '' }

async function supprimer() {
  const ok = await dp.supprimerMonCompte()
  if (ok) router.push('/')
}
</script>

<style scoped>
/* Les cartes se touchaient : sans espacement ni respiration interne, un écran
   qui parle de suppression définitive se lit mal — et se clique mal. */
.conf { display: flex; flex-direction: column; gap: 18px; }
.conf .card { padding: 20px 22px; }
.conf .card-head { margin-bottom: 10px; }
.conf .card-head h3 { font-size: 16px; }
.conf p { margin: 0 0 12px; line-height: 1.6; }
.conf p:last-child { margin-bottom: 0; }
.conf-list { margin: 10px 0 16px; padding-left: 20px; font-size: 13.5px; line-height: 1.75; color: var(--tx2, #4b5563); }
.conf-list li { margin-bottom: 8px; }
.conf-list li:last-child { margin-bottom: 0; }
.conf-list strong { color: var(--tx); }
/* Boutons : hauteur confortable au doigt (44px, la cible tactile minimale). */
.conf .btn { min-height: 44px; padding: 0 18px; gap: 8px; font-size: 14px; }
.conf-danger { border: 1px solid rgba(217,48,37,.25); }
.conf-warn { font-size: 13px; color: #B87A00; margin: 10px 0; }
.conf-err { font-size: 13px; color: #D93025; margin-top: 10px; }
.conf-actions { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
.conf .input { margin-top: 4px; }
.danger { color: #D93025; border-color: rgba(217,48,37,.4); }
.danger-solid { background: #D93025; color: #fff; border: 0; min-height: 44px; padding: 0 18px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.danger-solid:disabled { opacity: .5; cursor: default; }
.spin { animation: conf-spin 1s linear infinite; }
@keyframes conf-spin { to { transform: rotate(360deg); } }
</style>
