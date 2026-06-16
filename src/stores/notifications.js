import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'

/**
 * Store "notifications" — alertes parents par WhatsApp / SMS.
 *
 * Envoie via le proxy serveur /mapo-notify.php (qui parle à Twilio). Si le
 * proxy n'est pas configuré (pas d'identifiants Twilio) ou si l'utilisateur
 * n'est pas autorisé à envoyer en vrai, l'alerte est enregistrée en
 * "simulation" (on montre le message qui SERAIT envoyé) → toujours
 * démontrable, même avant le branchement Twilio.
 */

const NOTIFY_URL = '/mapo-notify.php'
const OUTBOX_KEY = 'mapo_notify_outbox'
const SETTINGS_KEY = 'mapo_notify_settings'

// Modèles de message. ctx = { eleve, parent, classe, date, ecole, montant }
export const TEMPLATES = [
  {
    key: 'absence',
    label: 'Absence du jour',
    build: (c) => `Bonjour ${c.parent || 'cher parent'}, votre enfant ${c.eleve} (${c.classe}) a été porté(e) absent(e) aujourd'hui ${c.date}. Merci de justifier l'absence auprès de l'établissement. — ${c.ecole}`,
  },
  {
    key: 'retard_paiement',
    label: 'Rappel de paiement',
    build: (c) => `Bonjour ${c.parent || 'cher parent'}, un solde de scolarité reste à régler pour ${c.eleve} (${c.classe})${c.montant ? ` : ${c.montant}` : ''}. Merci de régulariser dès que possible. — ${c.ecole}`,
  },
  {
    key: 'bulletin',
    label: 'Bulletin disponible',
    build: (c) => `Bonjour ${c.parent || 'cher parent'}, le bulletin de ${c.eleve} (${c.classe}) est disponible. Connectez-vous à l'espace parent MAPO pour le consulter. — ${c.ecole}`,
  },
  {
    key: 'convocation',
    label: 'Convocation',
    build: (c) => `Bonjour ${c.parent || 'cher parent'}, vous êtes convié(e) à un entretien concernant ${c.eleve} (${c.classe}). Merci de contacter l'établissement pour convenir d'un rendez-vous. — ${c.ecole}`,
  },
  {
    key: 'libre',
    label: 'Message libre',
    build: (c) => c.texteLibre || '',
  },
]

export function buildMessage(templateKey, ctx) {
  const t = TEMPLATES.find((x) => x.key === templateKey) || TEMPLATES[0]
  return t.build(ctx)
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const outbox = ref(loadJSON(OUTBOX_KEY, []))
  const settings = ref(loadJSON(SETTINGS_KEY, { channel: 'whatsapp' }))
  const sending = ref(false)

  function persist() {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.value.slice(0, 200)))
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch { /* silencieux */ }
  }

  function setChannel(ch) {
    settings.value.channel = ch === 'sms' ? 'sms' : 'whatsapp'
    persist()
  }

  /**
   * Envoie une alerte. Tente l'envoi réel via le proxy ; bascule en
   * simulation si non configuré / non autorisé / proxy absent.
   * @returns {object} l'entrée d'outbox créée
   */
  async function sendAlert({ to, message, channel, meta = {} }) {
    sending.value = true
    const ch = channel || settings.value.channel || 'whatsapp'
    const entry = {
      id: 'al-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      to, message, channel: ch,
      eleve: meta.eleve || '', parent: meta.parent || '', classe: meta.classe || '',
      template: meta.template || '',
      sentAt: new Date().toISOString(),
      status: 'simulé',
      reason: '',
    }
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token

      const res = await fetch(NOTIFY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: ch, to, message }),
      })
      const json = await res.json().catch(() => null)

      if (json && json.ok) {
        entry.status = 'envoyé'
        entry.sid = json.sid || null
      } else if (json && json.error === 'not_configured') {
        entry.status = 'simulé'
        entry.reason = 'Twilio pas encore configuré'
      } else if (json && json.error === 'non_autorise') {
        entry.status = 'simulé'
        entry.reason = 'Connexion requise (ou numéro non autorisé en démo)'
      } else {
        entry.status = 'échec'
        entry.reason = (json && (json.detail || json.error)) || ('HTTP ' + res.status)
      }
    } catch (e) {
      entry.status = 'simulé'
      entry.reason = 'Proxy indisponible (mode démonstration)'
    } finally {
      sending.value = false
    }

    outbox.value.unshift(entry)
    persist()
    return entry
  }

  function clearOutbox() {
    outbox.value = []
    persist()
  }

  return { outbox, settings, sending, setChannel, sendAlert, clearOutbox }
})
