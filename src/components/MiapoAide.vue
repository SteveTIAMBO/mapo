<template>
  <div class="aide">
    <!-- Onglets -->
    <div class="aide-tabs">
      <button v-for="tb in tabs" :key="tb.key" type="button" class="aide-tab" :class="{ on: tab === tb.key }" @click="tab = tb.key">
        <component :is="tb.icon" :size="15" /> <span>{{ tb.label }}</span>
      </button>
    </div>

    <!-- Manuel -->
    <div v-if="tab === 'manuel'" class="card">
      <div class="card-head"><BookOpen :size="18" /><h3>{{ en ? 'User guide' : 'Manuel d\'utilisation' }}</h3></div>
      <p class="muted">{{ en ? 'The essentials to get the most out of MIAPO.' : 'L\'essentiel pour tirer le meilleur de MIAPO.' }}</p>
      <details v-for="(s, i) in manuel" :key="i" class="aide-acc">
        <summary>{{ s.q }}</summary>
        <p>{{ s.a }}</p>
      </details>
    </div>

    <!-- FAQ -->
    <div v-else-if="tab === 'faq'" class="card">
      <div class="card-head"><HelpCircle :size="18" /><h3>{{ en ? 'FAQ' : 'Questions fréquentes' }}</h3></div>
      <details v-for="(s, i) in faq" :key="i" class="aide-acc">
        <summary>{{ s.q }}</summary>
        <p>{{ s.a }}</p>
      </details>
    </div>

    <!-- Signaler un bug / Proposer une idée -->
    <div v-else class="card">
      <div class="card-head">
        <component :is="tab === 'bug' ? Bug : Lightbulb" :size="18" />
        <h3>{{ tab === 'bug' ? (en ? 'Report a bug' : 'Signaler un bug') : (en ? 'Suggest a feature' : 'Proposer une idée') }}</h3>
      </div>
      <p class="muted">{{ tab === 'bug'
        ? (en ? 'Something broken or confusing? Tell us — it really helps.' : 'Quelque chose ne marche pas ou prête à confusion ? Dis-le nous, ça aide beaucoup.')
        : (en ? 'An idea to make MIAPO better? We\'d love to hear it.' : 'Une idée pour améliorer MIAPO ? On est preneurs.') }}</p>

      <template v-if="sent">
        <div class="aide-ok"><Check :size="16" /> {{ en ? 'Thanks! Your message was sent to our team.' : 'Merci ! Ton message a bien été envoyé à notre équipe.' }}</div>
        <button class="btn btn-outline btn-sm" @click="resetForm">{{ en ? 'Send another' : 'En envoyer un autre' }}</button>
      </template>
      <template v-else>
        <label class="aide-label">{{ en ? 'Subject' : 'Sujet' }}</label>
        <input v-model="subject" class="input" :placeholder="tab === 'bug' ? (en ? 'e.g. The quiz won\'t start' : 'ex. Le quiz ne se lance pas') : (en ? 'e.g. A dark mode' : 'ex. Un mode sombre')" maxlength="160" />

        <label class="aide-label">{{ en ? 'Describe it' : 'Décris-le' }}</label>
        <textarea v-model="message" class="aide-area" rows="5" spellcheck="true" :lang="spellLang"
          :placeholder="tab === 'bug' ? (en ? 'What did you do, what happened, what did you expect?' : 'Ce que tu as fait, ce qui s\'est passé, ce que tu attendais ?') : (en ? 'What would it do and why would it help?' : 'À quoi ça servirait et pourquoi ce serait utile ?')"></textarea>

        <!-- Honeypot anti-bot (caché) -->
        <input v-model="hp" class="aide-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div class="aide-actions">
          <span v-if="error" class="aide-err">{{ en ? 'Sending failed.' : 'L\'envoi a échoué.' }} <a :href="mailtoLink">{{ en ? 'Send by email instead' : 'Envoyer par e-mail' }}</a></span>
          <button class="btn btn-primary btn-sm aide-send" :disabled="!message.trim() || busy" @click="submit">
            <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="15" />
            <span>{{ busy ? (en ? 'Sending…' : 'Envoi…') : (en ? 'Send' : 'Envoyer') }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, HelpCircle, Bug, Lightbulb, Send, Check, Loader2 } from 'lucide-vue-next'
import { sendFeedback, feedbackMailto } from '../services/feedback'

const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const spellLang = computed(() => (en.value ? 'en' : 'fr'))

const tabs = computed(() => ([
  { key: 'manuel', label: en.value ? 'Guide' : 'Manuel', icon: BookOpen },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'bug', label: en.value ? 'Bug' : 'Bug', icon: Bug },
  { key: 'idee', label: en.value ? 'Idea' : 'Idée', icon: Lightbulb },
]))
const tab = ref('manuel')

// Manuel (bilingue, co-localisé) : l'essentiel de l'app.
const manuel = computed(() => en.value ? [
  { q: 'What is MIAPO?', a: 'MIAPO is your personal tutor. Ask a question in the chat, launch a revision by subject, and track your progress — everything adapts to your level.' },
  { q: 'How do I revise a subject?', a: 'Open “Tutor”, pick a subject, then a revision type (quiz, flashcards, guided session…). In a quiz, tap the “i” on a question to re-read the lesson without seeing the answer.' },
  { q: 'How does progress work?', a: 'The more you find answers on the first try, the more you progress. Your weak spots are shown first in “History” so you can turn them into strengths.' },
  { q: 'My courses & Carré', a: 'In “Courses”, import your own lessons (PDF or text) so MIAPO personalises answers for you. You can also connect Carré to bring in your notes.' },
  { q: 'Second language', a: 'In Settings → Language, add a second language: key labels then show a translation underneath — handy when you are learning in a new country.' },
  { q: 'Privacy', a: 'Your imported courses stay private to you and are never shared into the general knowledge base. Your data is used only to help you learn.' },
] : [
  { q: 'MIAPO, c\'est quoi ?', a: 'MIAPO est ton tuteur personnel. Pose une question dans le chat, lance une révision par matière et suis ta progression — tout s\'adapte à ton niveau.' },
  { q: 'Comment réviser une matière ?', a: 'Ouvre « Tuteur », choisis une matière, puis un type de révision (quiz, cartes mémoire, séance guidée…). Dans un quiz, touche le « i » d\'une question pour relire le cours sans voir la réponse.' },
  { q: 'Comment marche la progression ?', a: 'Plus tu trouves les réponses du premier coup, plus tu progresses. Tes points faibles apparaissent en premier dans « Historique » pour les transformer en points forts.' },
  { q: 'Mes cours & Carré', a: 'Dans « Cours », importe tes propres leçons (PDF ou texte) pour que MIAPO personnalise ses réponses pour toi. Tu peux aussi relier Carré pour récupérer tes notes.' },
  { q: 'Deuxième langue', a: 'Dans Paramètres → Langue, ajoute une deuxième langue : les libellés clés affichent alors une traduction en dessous — pratique quand on apprend dans un nouveau pays.' },
  { q: 'Confidentialité', a: 'Tes cours importés restent privés et ne remontent jamais dans la base de connaissances générale. Tes données servent uniquement à t\'aider à apprendre.' },
])

const faq = computed(() => en.value ? [
  { q: 'Why doesn\'t a quiz start?', a: 'Pick a subject first. If you named a topic (e.g. “fractions”), MIAPO opens the tutor so you can choose the subject, then launches the quiz.' },
  { q: 'Are my messages corrected?', a: 'The input underlines spelling like a word processor, but MIAPO never lectures you on mistakes — it just uses them to suggest helpful revisions.' },
  { q: 'Why am I asked how I feel?', a: 'A quick check-in at login helps MIAPO adapt the session to your form. It\'s optional — you can tap “Later”.' },
  { q: 'Can I revise offline?', a: 'Past sessions can be replayed from “History” without regenerating them. A new quiz needs a connection.' },
  { q: 'How do I report a problem?', a: 'Right here: use the “Bug” tab. Add as much detail as you can — the page and your device are attached automatically.' },
] : [
  { q: 'Pourquoi un quiz ne se lance pas ?', a: 'Choisis d\'abord une matière. Si tu as nommé un thème (ex. « fractions »), MIAPO ouvre le tuteur pour que tu choisisses la matière, puis lance le quiz.' },
  { q: 'Mes messages sont-ils corrigés ?', a: 'La zone de saisie souligne l\'orthographe comme un traitement de texte, mais MIAPO ne te fait jamais la leçon — il s\'en sert seulement pour te proposer des révisions utiles.' },
  { q: 'Pourquoi me demande-t-on comment je me sens ?', a: 'Un petit check-in à la connexion aide MIAPO à adapter la séance à ta forme. C\'est facultatif — tu peux toucher « Plus tard ».' },
  { q: 'Puis-je réviser hors ligne ?', a: 'Les séances passées se rejouent depuis « Historique » sans les régénérer. Un nouveau quiz nécessite une connexion.' },
  { q: 'Comment signaler un problème ?', a: 'Ici même : onglet « Bug ». Donne un maximum de détails — la page et ton appareil sont joints automatiquement.' },
])

// ── Formulaire bug / idée (via le service feedback → e-mail équipe) ──
const subject = ref('')
const message = ref('')
const hp = ref('') // honeypot
const busy = ref(false)
const sent = ref(false)
const error = ref(false)

const mailtoLink = computed(() => feedbackMailto({ type: tab.value === 'bug' ? 'bug' : 'feature', subject: subject.value, message: message.value }))

async function submit() {
  if (!message.value.trim() || busy.value) return
  busy.value = true; error.value = false
  const res = await sendFeedback({ type: tab.value === 'bug' ? 'bug' : 'feature', subject: subject.value, message: message.value, hp: hp.value })
  busy.value = false
  if (res.ok) { sent.value = true } else { error.value = true }
  // Un bug part aussi dans la file de développement de HUB, avec la page, le
  // navigateur et la taille d'écran. L'idée, elle, garde son seul chemin : ce
  // n'est pas un bug et elle ne se traite pas dans la même file.
  if (res.ok && tab.value === 'bug') signalerAHub()
}
// Envoi discret vers HUB : s'il échoue, la personne n'en sait rien et son
// message est de toute façon déjà parti par le chemin habituel.
function signalerAHub() {
  try {
    fetch('https://hub.app-edufrem.com/hub-bug.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: /mapoplus/i.test(location.hostname) ? 'MAPO+' : 'MAPO',
        quoi: (subject.value ? subject.value + '. ' : '') + message.value,
        page: location.href.slice(0, 400),
        navigateur: navigator.userAgent.slice(0, 300),
        ecran: window.innerWidth + 'x' + window.innerHeight,
      }),
    }).catch(() => {})
  } catch (e) { /* le signalement est un bonus, jamais un blocage */ }
}

function resetForm() { subject.value = ''; message.value = ''; hp.value = ''; sent.value = false; error.value = false }
</script>

<style scoped>
.aide { display: flex; flex-direction: column; gap: 16px; }
.aide-tabs { display: flex; gap: 6px; background: var(--input-bg, #eef1f4); padding: 4px; border-radius: 12px; width: fit-content; flex-wrap: wrap; }
.aide-tab { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border: none; background: none; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s; }
.aide-tab.on { background: #fff; color: var(--pr); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; }
.aide-acc { border-top: 1px solid var(--bd, #eef0f3); padding: 4px 0; }
.aide-acc:first-of-type { border-top: none; }
.aide-acc summary { cursor: pointer; font-size: 14px; font-weight: 600; color: var(--tx, #1f2937); padding: 10px 0; list-style: none; display: flex; align-items: center; }
.aide-acc summary::-webkit-details-marker { display: none; }
.aide-acc summary::after { content: '＋'; margin-left: auto; color: var(--tx3); font-weight: 400; }
.aide-acc[open] summary::after { content: '－'; }
.aide-acc p { margin: 0 0 12px; font-size: 13.5px; color: var(--tx2, #4b5563); line-height: 1.55; }
.aide-label { display: block; font-size: 13px; font-weight: 700; color: var(--tx, #1f2937); margin: 12px 0 6px; }
.aide-area { width: 100%; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 13px; font-family: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; color: var(--tx, #1f2937); }
.aide-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.aide-actions { display: flex; align-items: center; gap: 12px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }
.aide-send { margin-left: auto; }
.aide-err { font-size: 12.5px; color: #D93025; }
.aide-err a { color: var(--pr); font-weight: 600; }
.aide-ok { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; background: rgba(27,138,90,.08); color: #1B8A5A; font-size: 13.5px; font-weight: 600; margin-bottom: 12px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
