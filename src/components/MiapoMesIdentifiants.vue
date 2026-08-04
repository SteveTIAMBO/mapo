<template>
  <!-- N'a de sens que pour un compte ENFANT arrivé par lien magique et qui n'a
       pas encore d'identifiants à lui. -->
  <div v-if="aBesoin" class="card ident">
    <div class="card-head"><KeyRound :size="18" /><h3>{{ t('ident.title') }}</h3></div>
    <p class="muted small">{{ t('ident.hint') }}</p>

    <div class="ident-row">
      <label class="form-label">{{ t('ident.pseudo') }}</label>
      <input v-model="pseudo" class="input" :placeholder="t('ident.pseudoPlaceholder')" autocomplete="username" />
      <small v-if="apercu" class="muted small">{{ t('ident.preview', { p: apercu }) }}</small>
    </div>

    <div class="ident-row">
      <label class="form-label">{{ t('ident.password') }}</label>
      <input v-model="mdp" type="password" class="input" autocomplete="new-password" />
      <small class="muted small">{{ t('ident.passwordHint') }}</small>
    </div>

    <button class="btn btn-primary btn-sm" :disabled="!pret || busy" @click="valider">
      <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" />
      <span>{{ t('ident.save') }}</span>
    </button>

    <p v-if="message" class="ident-msg" :class="{ err: estErreur }">{{ message }}</p>
  </div>

  <!-- Déjà fait : on rappelle l'identifiant, sans le mot de passe. -->
  <div v-else-if="dejaFait" class="card ident">
    <div class="card-head"><KeyRound :size="18" /><h3>{{ t('ident.doneTitle') }}</h3></div>
    <p class="muted small">{{ t('ident.doneHint', { p: pseudoActuel }) }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyRound, Check, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { normalizePseudo, isPseudoValide, isSyntheticEmail, PSEUDO_EMAIL_DOMAIN } from '../utils/identifier'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const enfants = useEnfantsAutonomesStore()

const pseudo = ref('')
const mdp = ref('')
const busy = ref(false)
const message = ref('')
const estErreur = ref(false)

const emailCourant = computed(() => authStore.user?.email || '')
// Compte enfant SANS identifiants : arrivé par lien magique, donc sans e-mail.
const aBesoin = computed(() => enfants.isCompteEnfant && !emailCourant.value)
// Compte enfant qui s'est DÉJÀ choisi un pseudo (e-mail synthétique).
const dejaFait = computed(() => enfants.isCompteEnfant && isSyntheticEmail(emailCourant.value))
const pseudoActuel = computed(() => emailCourant.value.replace('@' + PSEUDO_EMAIL_DOMAIN, ''))

const apercu = computed(() => normalizePseudo(pseudo.value))
const pret = computed(() => isPseudoValide(pseudo.value) && mdp.value.length >= 6)

async function valider() {
  busy.value = true
  message.value = ''
  estErreur.value = false
  const r = await authStore.definirIdentifiantsEnfant(pseudo.value, mdp.value)
  busy.value = false
  if (r.success) {
    message.value = t('ident.ok', { p: r.pseudo })
    mdp.value = ''
  } else {
    estErreur.value = true
    message.value = t('ident.err_' + r.error, { p: apercu.value })
  }
}
</script>

<style scoped>
.ident-row { margin: 10px 0; }
.ident-row .input { width: 100%; }
.ident-msg { margin-top: 10px; font-size: 13px; color: #1B8A5A; }
.ident-msg.err { color: #D93025; }
.spin { animation: ident-spin 1s linear infinite; }
@keyframes ident-spin { to { transform: rotate(360deg); } }
</style>
