<template>
  <div class="card eco">
    <div class="card-head"><GraduationCap :size="18" /><h3>{{ t('mia.enfantCompteTitle') }}</h3></div>

    <!-- Démo : fonctionnalité multi-comptes → compte réel requis -->
    <p v-if="isDemo" class="muted small">{{ t('mia.enfantCompteDemoNote') }}</p>

    <template v-else>
      <p class="muted">{{ t('mia.enfantCompteHint') }}</p>

      <!-- Un code par enfant : on choisit DE QUI on ouvre le profil -->
      <div class="row">
        <select v-model="enfantId" class="input select">
          <option value="">{{ t('mia.enfantCompteChoose') }}</option>
          <option v-for="e in enfantsDispo" :key="e.id" :value="e.id">{{ e.firstName }} {{ e.lastName }}</option>
        </select>
        <button class="btn btn-primary btn-sm" :disabled="eco.busy || !enfantId" @click="invite">
          <component :is="eco.busy ? Loader2 : UserPlus" :size="14" :class="{ spin: eco.busy }" />
          <span>{{ t('mia.enfantCompteInvite') }}</span>
        </button>
      </div>

      <div v-if="code" class="code-box">
        <span class="code-label">{{ t('mia.enfantCompteLinkFor', { name: codePrenom }) }}</span>
        <p class="muted small ec-lead">{{ t('mia.enfantCompteLinkHint') }}</p>
        <div class="link-row">
          <input class="link-val" :value="shareLink" readonly @focus="selectAll" />
          <button class="btn btn-outline btn-sm" @click="copyLink"><Copy :size="13" /> <span>{{ copied ? t('mia.coParentCopied') : t('mia.coParentCopy') }}</span></button>
        </div>
        <a class="btn btn-wa" :href="waHref" target="_blank" rel="noopener"><MessageCircle :size="15" /> <span>{{ t('mia.enfantCompteShareWa') }}</span></a>
        <div class="ec-code-fallback">
          <span class="muted small">{{ t('mia.enfantCompteCodeAlt') }}</span>
          <span class="code-val-sm">{{ code }}</span>
        </div>
      </div>

      <div v-if="eco.comptes.length" class="cp-list">
        <div class="cp-list-title">{{ t('mia.enfantCompteList') }}</div>
        <div v-for="c in eco.comptes" :key="c.id" class="cp-row">
          <span class="cp-name">{{ nomProfil(c.enfantId) || c.name }}</span>
          <button class="cp-del" :title="t('mia.enfantCompteRemove')" @click="remove(c.id)"><X :size="15" /></button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useEnfantsComptesStore } from '../stores/enfantsComptes'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { GraduationCap, UserPlus, Copy, X, Loader2, MessageCircle } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const eco = useEnfantsComptesStore()
const enfants = useEnfantsAutonomesStore()

const isDemo = authStore.isDemo
const enfantId = ref('')
const code = ref('')
const codePrenom = ref('')
const copied = ref(false)

const enfantsDispo = computed(() => enfants.enfants)

function nomProfil(id) {
  const e = enfants.enfants.find((x) => x.id === id)
  return e ? `${e.firstName} ${e.lastName}`.trim() : ''
}

onMounted(() => { if (!isDemo) eco.loadComptes() })

// Lien magique partageable : le code voyage dans ?c= (pas le prénom — donnée
// personnelle inutile dans une URL ; le serveur renvoie le prénom au clic).
const shareLink = computed(() => (code.value
  ? `${window.location.origin}/rejoindre?c=${encodeURIComponent(code.value)}`
  : ''))
const waHref = computed(() => {
  const msg = t('mia.enfantCompteWaMsg', { name: codePrenom.value || '', link: shareLink.value })
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
})

async function invite() {
  const e = enfants.enfants.find((x) => x.id === enfantId.value)
  const r = await eco.createInvite(enfantId.value, e?.firstName || '')
  if (r.ok) { code.value = r.code; codePrenom.value = e?.firstName || '' }
}
function selectAll(e) { try { e.target.select() } catch { /* noop */ } }
async function copyLink() {
  try { await navigator.clipboard.writeText(shareLink.value); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { /* clipboard indispo */ }
}
async function remove(uid) { await eco.removeCompte(uid) }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.eco { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 12px; }
.small { font-size: 12.5px; }
.row { display: flex; gap: 10px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 8px 13px; font-size: 13px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; background: #fff; color: var(--tx); }
.select { flex: 1; }

.code-box { background: rgba(var(--pr-rgb),.05); border: 1px solid rgba(var(--pr-rgb),.15); border-radius: 12px; padding: 14px 16px; margin-top: 12px; }
.code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--tx3); }
.code-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0 8px; }
.code-val { font-family: 'Poppins', monospace; font-size: 24px; font-weight: 800; letter-spacing: 4px; color: var(--pr); }
.ec-lead { margin: 4px 0 10px; }
.link-row { display: flex; align-items: center; gap: 8px; }
.link-val { flex: 1; min-width: 0; padding: 9px 11px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 13px; background: #fff; color: var(--tx); }
.btn-wa { width: 100%; justify-content: center; margin-top: 10px; background: #25D366; color: #fff; text-decoration: none; }
.btn-wa:hover { background: #1ebe5b; }
.ec-code-fallback { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--bd); }
.code-val-sm { font-family: 'Poppins', monospace; font-size: 15px; font-weight: 800; letter-spacing: 2px; color: var(--tx2, #565b68); }

.cp-list { margin-top: 16px; }
.cp-list-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--tx3); margin-bottom: 8px; }
.cp-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; margin-bottom: 8px; }
.cp-name { font-weight: 600; font-size: 14px; color: var(--tx); }
.cp-del { background: none; border: none; color: var(--tx3); cursor: pointer; display: inline-flex; padding: 4px; border-radius: 8px; }
.cp-del:hover { color: #D93025; background: rgba(217,48,37,.08); }
</style>
