<template>
  <div class="rj-page">
    <div class="rj-bg"></div>

    <div class="rj-card">
      <div class="rj-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <div class="rj-logo">
        <div class="rj-logo-mark">M+</div>
        <div class="rj-logo-title">MAPO+</div>
      </div>

      <!-- ══ Invitation d'une ÉCOLE ══════════════════════════════════════
           Ce que la famille voit AVANT de rien saisir : le nom de son
           établissement, le prénom de l'enfant et sa classe. C'est ce qui
           distingue « je suis au bon endroit » d'un formulaire anonyme. -->
      <template v-if="phase === 'ecole-apercu'">
        <div class="rj-badge spin" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejEcole.checking') }}</h1>
      </template>

      <template v-else-if="phase === 'ecole-form'">
        <div class="rj-badge" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>
        </div>
        <h1 class="rj-title">{{ ap.ecole || t('rejEcole.yourSchool') }}</h1>
        <p class="rj-text">{{ t('rejEcole.intro', { prenom: ap.prenom || t('rejEcole.yourChild') }) }}</p>

        <!-- Ce que l'école a déjà rempli : rien à ressaisir. -->
        <div class="rj-prefill">
          <div class="rj-pf-line"><span>{{ t('rejEcole.pupil') }}</span><strong>{{ ap.prenom || '—' }}</strong></div>
          <div class="rj-pf-line"><span>{{ t('rejEcole.klass') }}</span><strong>{{ ap.classe || '—' }}</strong></div>
          <div class="rj-pf-line"><span>{{ t('rejEcole.school') }}</span><strong>{{ ap.ecole || '—' }}</strong></div>
        </div>

        <p class="rj-hint">{{ t('rejEcole.onlyPassword') }}</p>
        <!-- Dit explicitement de QUI est ce compte, et que l'autonomie de
             l'enfant reste une décision de la famille, pas de l'école. -->
        <p class="rj-hint small">{{ t('rejEcole.childLater') }}</p>

        <label class="rj-label" for="rj-id">{{ t('rejEcole.identifier') }}</label>
        <input id="rj-id" v-model="identifiant" class="rj-input" type="text"
               autocomplete="username" :placeholder="t('rejEcole.identifierPh')" />
        <p class="rj-hint small">{{ t('rejEcole.identifierHint') }}</p>

        <label class="rj-label" for="rj-pw">{{ t('rejEcole.password') }}</label>
        <input id="rj-pw" v-model="motDePasse" class="rj-input" type="password"
               autocomplete="new-password" :placeholder="t('rejEcole.passwordPh')" />

        <p v-if="formErr" class="rj-err">{{ formErr }}</p>

        <button class="rj-btn primary" :disabled="busyEcole" @click="rejoindreEcole">
          {{ busyEcole ? t('rejEcole.opening') : t('rejEcole.cta') }}
        </button>
        <p class="rj-hint small">{{ t('rejEcole.premium') }}</p>
      </template>

      <template v-else-if="phase === 'ecole-joining'">
        <div class="rj-badge spin" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejEcole.opening') }}</h1>
        <p class="rj-text">{{ etape }}</p>
      </template>

      <!-- Écran d'accueil : l'enfant confirme que c'est bien son téléphone -->
      <template v-else-if="phase === 'confirm'">
        <div class="rj-badge" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <h1 class="rj-title">{{ prenom ? t('rejoindre.helloName', { name: prenom }) : t('rejoindre.hello') }}</h1>
        <p class="rj-text">{{ t('rejoindre.intro') }}</p>
        <p class="rj-hint">{{ t('rejoindre.deviceNote') }}</p>
        <button class="rj-btn primary" :disabled="eco.busy" @click="join">
          {{ eco.busy ? t('rejoindre.opening') : t('rejoindre.open') }}
        </button>
      </template>

      <!-- Connexion en cours -->
      <template v-else-if="phase === 'joining'">
        <div class="rj-badge spin" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejoindre.opening') }}</h1>
        <p class="rj-text">{{ t('rejoindre.wait') }}</p>
      </template>

      <!-- Erreur -->
      <template v-else>
        <div class="rj-badge warn" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h1 class="rj-title">{{ t('rejoindre.oops') }}</h1>
        <p class="rj-text">{{ errorMsg }}</p>
        <!-- Réessayer doit relancer LE BON parcours : sur une invitation
             d'école, `join()` tenterait le lien magique famille et échouerait
             pour une raison sans rapport avec le problème réel. -->
        <button v-if="canRetry" class="rj-btn primary" :disabled="eco.busy || busyEcole" @click="reessayer">
          {{ t('rejoindre.retry') }}
        </button>
        <button class="rj-link" @click="goHome">{{ t('rejoindre.goHome') }}</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { setLang } from '../i18n'
import { useAuthStore } from '../stores/auth'
import { useEnfantsComptesStore } from '../stores/enfantsComptes'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { useLienEcoleStore } from '../stores/lienEcole'
import { normaliserCode, typeDeCode, CODE_ECOLE, DESTINATAIRE } from '../utils/invitationMapoPlus'
import { identifierToEmail } from '../utils/identifier'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eco = useEnfantsComptesStore()
const enfants = useEnfantsAutonomesStore()
const lien = useLienEcoleStore()

/**
 * Code porté par le lien : ?c=CODE (repli sur ?code=).
 *
 * ⚠️ Ne PLUS passer le code en majuscules aveuglément. Deux invitations
 * arrivent sur cette page, et un code d'ÉCOLE contient le slug de
 * l'établissement en minuscules (« stjoseph~KMPQ2R7X ») : le mettre en
 * majuscules le rendait invalide pour le serveur, qui répondait « code
 * invalide » — une erreur qui accuse la famille d'une faute qui était la nôtre.
 * `normaliserCode` traite chaque forme selon sa nature.
 */
const code = normaliserCode(route.query.c || route.query.code || '')
const estInvitationEcole = typeDeCode(code) === CODE_ECOLE
const prenom = ref(String(route.query.p || route.query.name || '').trim())

const phase = ref(estInvitationEcole ? 'ecole-apercu' : 'confirm')
const errorReason = ref('')

// ── Parcours « invitation de l'école » ────────────────────────────────
const ap = ref({})            // aperçu renvoyé par le serveur (école, prénom, classe)
const identifiant = ref('')   // téléphone OU e-mail : les deux sont acceptés
const motDePasse = ref('')
const busyEcole = ref(false)
const formErr = ref('')
const etape = ref('')

// Codes d'erreur « temporaires » (service/IAM) → on propose de réessayer.
// Les codes « invalides » (code inconnu/incomplet) ne se réessaient pas.
const TEMP = new Set(['service_indisponible', 'jeton_echec', 'signin', 'network', 'server'])
const canRetry = computed(() => TEMP.has(errorReason.value))
const errorMsg = computed(() => {
  const r = errorReason.value
  if (r === 'missing') return t('rejoindre.errMissing')
  if (r === 'network' || r === 'reseau') return t('rejoindre.errNetwork')
  // Un lien déjà servi ou périmé n'est PAS un code invalide : la famille doit
  // savoir qu'il faut en redemander un à l'école, pas qu'elle s'est trompée.
  if (r === 'code_deja_utilise') return t('rejEcole.errUsed')
  if (r === 'code_expire') return t('rejEcole.errExpired')
  if (TEMP.has(r)) return t('rejoindre.errService')
  // ⚠️ Le message par défaut disait « demande à ton parent de t'en générer un
  // nouveau » — vu à l'écran sur une invitation d'ÉCOLE, où il envoie la famille
  // solliciter la mauvaise personne. Le texte suit la provenance du lien.
  if (estInvitationEcole) return t('rejEcole.errInvalid')
  return t('rejoindre.errInvalid') // code_inconnu / code_incomplet / code_invalide / empty
})

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function join() {
  if (!code) { errorReason.value = 'missing'; phase.value = 'error'; return }
  phase.value = 'joining'
  const r = await eco.joinViaLink(code)
  if (!r.ok) {
    errorReason.value = r.reason || 'server'
    phase.value = 'error'
    return
  }
  if (r.prenom) prenom.value = r.prenom
  // Attendre que l'état d'auth reflète le compte enfant, puis hydrater son
  // profil (mode apprenant) avant de naviguer — évite un écran vide fugace.
  for (let i = 0; i < 60 && authStore.user?.uid !== r.childUid; i++) await sleep(50)
  try { await enfants.hydrate() } catch { /* offline : ParentMiapo réessaiera */ }
  router.replace({ name: 'ParentMiapo' })
}

function goHome() { router.replace({ name: 'Home' }) }

/** Relance le parcours correspondant au type d'invitation. */
function reessayer() {
  if (!estInvitationEcole) return join()
  // Si le compte a déjà été créé, l'aperçu ne sert plus à rien : on repart du
  // formulaire, qui saura reprendre le rattachement.
  errorReason.value = ''
  if (authStore.user) { phase.value = 'ecole-form'; return }
  phase.value = 'ecole-apercu'
  chargerApercu()
}

// ── Invitation de l'école ─────────────────────────────────────────────

/** Aperçu : dire à la famille où elle est, avant de lui demander quoi que ce soit. */
async function chargerApercu() {
  const r = await lien.apercuCode(code)
  if (!r.ok) {
    errorReason.value = r.reason || 'server'
    phase.value = 'error'
    return
  }
  ap.value = r.apercu || {}
  // Un lien déjà utilisé ou périmé se DIT avec son motif : « ce lien a déjà
  // servi, demandez-en un nouveau à l'école » est actionnable ; « code
  // invalide » envoie la famille appeler le secrétariat pour rien.
  if (ap.value.utilise) { errorReason.value = 'code_deja_utilise'; phase.value = 'error'; return }
  if (ap.value.perime) { errorReason.value = 'code_expire'; phase.value = 'error'; return }
  if (ap.value.prenom) prenom.value = ap.value.prenom
  phase.value = 'ecole-form'
}

/**
 * Crée le compte, scelle le lien avec l'école, puis pose le profil de
 * l'apprenant DÉJÀ rempli. Ordre voulu : le compte d'abord (le rachat du code
 * exige un jeton), le lien ensuite, le profil en dernier.
 */
async function rejoindreEcole() {
  formErr.value = ''
  const id = String(identifiant.value || '').trim()
  const pw = String(motDePasse.value || '')
  if (!id) { formErr.value = t('rejEcole.errId'); return }
  if (pw.length < 6) { formErr.value = t('rejEcole.errPw'); return }

  busyEcole.value = true
  phase.value = 'ecole-joining'
  try {
    etape.value = t('rejEcole.stepAccount')
    const email = identifierToEmail(id)
    // Le compte ouvert par l'école est celui de la FAMILLE, sans exception.
    const role = DESTINATAIRE
    const nomAffiche = [ap.value.prenom].filter(Boolean).join(' ')
    const insc = await authStore.signUpWithEmail(email, pw, nomAffiche, {
      b2c: true, role, pays: ap.value.pays || '',
    })
    if (!insc || insc.success !== true) {
      // Le cas le plus fréquent : la famille a déjà un compte. Ce n'est pas une
      // erreur, c'est un autre chemin — on le nomme au lieu d'afficher un échec.
      formErr.value = insc?.error || t('rejEcole.errAccount')
      phase.value = 'ecole-form'
      return
    }

    etape.value = t('rejEcole.stepLink')
    const r = await lien.redeemCode(code)
    if (!r.ok) {
      // ⚠️ Le compte EXISTE désormais. Renvoyer la personne au formulaire
      // d'inscription la ferait échouer en boucle (« compte déjà utilisé »).
      // On l'emmène dans son espace : elle est connectée, le rattachement se
      // reprend depuis « Mon école », et le message dit ce qu'il s'est passé.
      errorReason.value = r.reason || 'server'
      phase.value = 'error'
      return
    }

    etape.value = t('rejEcole.stepProfile')
    try { await enfants.hydrate() } catch { /* hors ligne : ParentMiapo réessaiera */ }
    const l = r.lien || {}
    const enfantId = enfants.addEnfant({
      firstName: l.firstName || ap.value.prenom || '',
      lastName: l.lastName || '',
      cycle: ap.value.cycle || '',
      niveau: l.className || ap.value.classe || '',
      pays: ap.value.pays || '',
      ecole: l.ecole || ap.value.ecole || '',
      matricule: l.matricule || '',
      ecoleReliee: true,
    })
    // Scelle le contexte côté profil : c'est lui qui active Devoirs, Cours,
    // Notes et la messagerie avec l'établissement.
    enfants.lierEcole(enfantId, l)
    router.replace({ name: 'ParentMiapo' })
  } catch (e) {
    errorReason.value = 'server'
    phase.value = 'error'
  } finally {
    busyEcole.value = false
  }
}

onMounted(() => {
  if (!code) { errorReason.value = 'missing'; phase.value = 'error'; return }
  if (estInvitationEcole) chargerApercu()
})
</script>

<style scoped>
.rj-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; }
.rj-bg {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(1100px 520px at 15% -10%, rgba(var(--pr-rgb, 142, 36, 169), 0.16), transparent 60%),
    radial-gradient(900px 480px at 110% 10%, rgba(var(--pr-rgb, 142, 36, 169), 0.1), transparent 55%),
    #f6f7fb;
}
.rj-card {
  position: relative; z-index: 1; width: 100%; max-width: 420px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(20, 20, 43, 0.14);
  padding: 30px 28px 26px;
  text-align: center;
}
.rj-lang { position: absolute; top: 16px; right: 16px; display: flex; gap: 4px; }
.rj-lang button { border: none; background: transparent; font-size: 12px; font-weight: 700; color: #9aa0ad; padding: 3px 7px; border-radius: 8px; cursor: pointer; }
.rj-lang button.on { background: rgba(var(--pr-rgb, 142, 36, 169), 0.14); color: var(--pr, #8e24a9); }
.rj-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
.rj-logo-mark { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; font-size: 17px; color: #fff; background: linear-gradient(135deg, var(--pr, #8e24a9), rgba(var(--pr-rgb, 142, 36, 169), 0.55)), #ff6d4d; box-shadow: 0 6px 16px rgba(var(--pr-rgb, 142, 36, 169), 0.35); }
.rj-logo-title { font-size: 20px; font-weight: 800; color: #1c1e27; letter-spacing: -0.02em; }
.rj-badge { width: 62px; height: 62px; margin: 4px auto 14px; border-radius: 50%; display: grid; place-items: center; color: var(--pr, #8e24a9); background: linear-gradient(rgba(var(--pr-rgb, 142, 36, 169), 0.12), rgba(var(--pr-rgb, 142, 36, 169), 0.12)), #fff; }
.rj-badge.warn { color: #b4560a; background: #fff3e6; }
.rj-badge.spin svg { animation: rjspin 0.9s linear infinite; }
@keyframes rjspin { to { transform: rotate(360deg); } }
.rj-title { font-size: 20px; font-weight: 800; color: #1c1e27; margin: 0 0 8px; }
.rj-text { font-size: 14.5px; color: #565b68; margin: 0 0 8px; line-height: 1.5; }
.rj-hint { font-size: 13px; color: #8a90a0; margin: 0 0 18px; line-height: 1.5; }
.rj-hint.small { font-size: 12.5px; margin: -4px 0 14px; }

/* Ce que l'école a déjà rempli : montré, pas ressaisi. */
.rj-prefill {
  text-align: left; background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(20, 22, 30, 0.07); border-radius: 14px;
  padding: 12px 14px; margin: 4px 0 16px;
}
.rj-pf-line { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 14px; }
.rj-pf-line span { color: #8a90a0; }
.rj-pf-line strong { color: #23252d; font-weight: 650; text-align: right; }

.rj-label { display: block; text-align: left; font-size: 13px; font-weight: 650; color: #565b68; margin: 0 0 6px; }
.rj-input {
  width: 100%; box-sizing: border-box; margin: 0 0 12px;
  border: 1px solid rgba(20, 22, 30, 0.12); border-radius: 12px;
  padding: 12px 14px; font-size: 15px; color: #23252d;
  background: rgba(255, 255, 255, 0.8); transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.rj-input:focus {
  outline: none; border-color: rgba(var(--pr-rgb, 142, 36, 169), 0.55);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb, 142, 36, 169), 0.14);
}
.rj-err { text-align: left; font-size: 13.5px; color: #c0392b; margin: 0 0 12px; line-height: 1.45; }
.rj-btn { width: 100%; border: none; border-radius: 13px; padding: 13px 16px; font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 10px; transition: transform 0.06s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
.rj-btn:disabled { opacity: 0.6; cursor: default; }
.rj-btn.primary { color: #fff; background: linear-gradient(135deg, var(--pr, #8e24a9), rgba(var(--pr-rgb, 142, 36, 169), 0.6)), #ff6d4d; box-shadow: 0 8px 20px rgba(var(--pr-rgb, 142, 36, 169), 0.32); }
.rj-btn.primary:not(:disabled):active { transform: translateY(1px); }
.rj-link { border: none; background: transparent; color: #8a90a0; font-size: 13.5px; font-weight: 600; cursor: pointer; margin-top: 4px; padding: 6px; }
.rj-link:hover { color: #565b68; }
</style>
