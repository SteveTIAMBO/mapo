import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth as fbAuth, db } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'

/**
 * Store « diplomes » — Émission de diplômes VÉRIFIABLES (le « moat » EDUFREM).
 *
 * Principe (W3C-style, PAS blockchain) :
 *  - chaque diplôme reçoit un CODE public lisible (ex: EDFM-25-7K3QX9) + un QR ;
 *  - une EMPREINTE SHA-256 du contenu canonique garantit l'INTÉGRITÉ (toute
 *    altération casse l'empreinte) ;
 *  - le champ `signature` (authenticité de l'émetteur) sera ajouté côté SERVEUR
 *    une fois la clé de signature EDUFREM en place (comme les clés CinetPay) —
 *    on ne signe jamais côté navigateur (la clé privée resterait exposée).
 *
 * Registre : démo = localStorage ; vrais comptes = miroir Firestore `diplomas/{code}`
 * (lecture publique à activer côté règles) pour la vérification cross-appareils.
 */

export const DIPLOME_TYPES = [
  { key: 'cep', label: 'CEP', desc: "Certificat d'études primaires" },
  { key: 'bepc', label: 'BEPC', desc: "Brevet d'études du premier cycle" },
  { key: 'probatoire', label: 'Probatoire', desc: 'Probatoire (avant le baccalauréat)' },
  { key: 'bac', label: 'Baccalauréat', desc: 'Baccalauréat (fin du secondaire)' },
  { key: 'attestation', label: 'Attestation de réussite', desc: 'Attestation de fin de cycle' },
]

// Diplômes de l'enseignement SUPÉRIEUR (LMD). Séparés de DIPLOME_TYPES pour
// ne pas polluer le sélecteur du Secondaire ; getType() cherche dans les deux.
export const SUP_DIPLOME_TYPES = [
  { key: 'bts', label: 'BTS', desc: 'Brevet de Technicien Supérieur' },
  { key: 'dut', label: 'DUT', desc: 'Diplôme Universitaire de Technologie' },
  { key: 'licence', label: 'Licence', desc: 'Licence (Bac+3, LMD)' },
  { key: 'master', label: 'Master', desc: 'Master (Bac+5, LMD)' },
  { key: 'doctorat', label: 'Doctorat', desc: 'Doctorat (LMD)' },
]

export const MENTIONS = ['Passable', 'Assez bien', 'Bien', 'Très bien', 'Excellent']

const KEY = 'mapo_demo_diplomes'

// Code public : lisible, sans caractères ambigus (pas de 0/O/1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randCode(n = 6) {
  const a = new Uint32Array(n)
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(a)
  else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 4294967296)
  let s = ''
  for (let i = 0; i < n; i++) s += CODE_CHARS[a[i] % CODE_CHARS.length]
  return s
}

// Empreinte SHA-256 hexadécimale (Web Crypto, contexte sécurisé HTTPS requis).
async function sha256Hex(str) {
  try {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return '' // contexte non sécurisé : pas d'empreinte (la vérif retombera sur la présence au registre)
  }
}

// Représentation canonique déterministe des champs vérifiables d'un diplôme.
function canonical(d) {
  return [d.code, d.eleveName, d.typeLabel, d.serie || '', d.mention || '', d.annee, d.ecoleNom, d.emisLe].join('|')
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function normCode(code) { return (code || '').toUpperCase().replace(/[\s-]/g, '') }

// ── Signature cryptographique (RSA SHA-256) ──────────────────────────
// La SIGNATURE prouve l'authenticité de l'émetteur (clé privée EDUFREM côté
// serveur via /mapo-sign.php). La clé PUBLIQUE ci-dessous est embarquée (elle
// est publique) pour vérifier la signature côté client, hors-ligne.
const SIGN_URL = '/mapo-sign.php'
const PUBLIC_KEY_SPKI_B64 = `
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs7wGbfxcTgwvhpvQXajS
aqVApEuNqgoJfAY1QlcML887642Dm/DdGliamVP1px832Wqtyd5R+JaFHRVahU2Q
7sWVlGtY/QwHFE7CdTTpGUsYwoCgeLjSAZOn461rijh9Evn2e6/VMp9XSq3dlM2M
WLA/GX5s0uxw7sSayLvhT915IInKdO+JzE48B4F7Cs+oKt2LchlpK6QVXla33+7p
/HejnqtVzOXUqjuxdNfKsmLj/YhwfECzCn8QDJvoZvlD6qxtqMabkAT/qeedMvsR
xvrMdpXgxW8TmHVntTbkcUUQO/uFRxeUm3r+rQlou15Cz69EKZ36qvWT6IFQOyug
hwIDAQAB
`.replace(/\s+/g, '')

function b64ToBytes(b64) {
  const bin = atob(b64)
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return a
}

let _pubKey // CryptoKey | false | undefined
async function getPublicKey() {
  if (_pubKey === undefined) {
    try {
      _pubKey = await window.crypto.subtle.importKey(
        'spki', b64ToBytes(PUBLIC_KEY_SPKI_B64),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    } catch { _pubKey = false }
  }
  return _pubKey
}

// Demande au serveur une signature du contenu canonique (best-effort :
// si /mapo-sign.php n'est pas joignable, le diplôme s'émet sans signature).
async function signContent(content) {
  try {
    const r = await fetch(SIGN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!r.ok) return null
    const j = await r.json()
    return (j && j.ok && j.signature) ? j.signature : null
  } catch { return null }
}

// Vérifie la signature RSA d'un diplôme. true = signé EDUFREM ; false = invalide ;
// null = pas de signature (ou WebCrypto indisponible).
async function verifySignature(d) {
  if (!d || !d.signature) return null
  try {
    const key = await getPublicKey()
    if (!key) return null
    return await window.crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' }, key,
      b64ToBytes(d.signature), new TextEncoder().encode(canonical(d)))
  } catch { return null }
}

export const useDiplomesStore = defineStore('diplomes', () => {
  const authStore = useAuthStore()
  const diplomes = ref(loadJSON(demoKey(KEY), []))

  function persist() {
    try { localStorage.setItem(demoKey(KEY), JSON.stringify(diplomes.value)) } catch { /* quota : silencieux */ }
  }

  const diplomesSorted = computed(() =>
    [...diplomes.value].sort((a, b) => (b.emisLe || '').localeCompare(a.emisLe || ''))
  )

  function getType(key) { return DIPLOME_TYPES.find((t) => t.key === key) || SUP_DIPLOME_TYPES.find((t) => t.key === key) }
  function getByCode(code) {
    const c = normCode(code)
    return diplomes.value.find((d) => normCode(d.code) === c) || null
  }

  /** Émet un diplôme vérifiable : génère le code public + l'empreinte, l'enregistre. */
  async function emettre({ eleveId, eleveName, type, serie, mention, annee, ecoleNom, ecoleAcronyme, emisPar }) {
    const t = getType(type)
    const yy = (annee || '').slice(2, 4) || String(new Date().getFullYear()).slice(2)
    const acro = (ecoleAcronyme || 'EDFM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'EDFM'
    let code
    do { code = `${acro}-${yy}-${randCode(6)}` } while (getByCode(code))
    const d = {
      id: 'dip-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      code,
      eleveId: eleveId || '',
      eleveName: eleveName || '',
      type,
      typeLabel: t?.label || type,
      serie: serie || '',
      mention: mention || '',
      annee: annee || '',
      ecoleNom: ecoleNom || '',
      ecoleAcronyme: acro,
      emisLe: new Date().toISOString(),
      emisPar: emisPar || '',
      statut: 'valide',
      signature: null, // ajoutée côté serveur une fois la clé EDUFREM en place
    }
    d.hash = await sha256Hex(canonical(d))
    d.signature = await signContent(canonical(d)) // authenticité émetteur (best-effort)
    diplomes.value = [d, ...diplomes.value]
    persist()
    mirrorToCloud(d)
    return d
  }

  function revoquer(id) {
    const d = diplomes.value.find((x) => x.id === id)
    if (!d) return
    d.statut = 'revoque'
    diplomes.value = [...diplomes.value]
    persist()
    mirrorToCloud(d)
  }

  /** Recalcule l'empreinte et la compare : true si le contenu est intègre. */
  async function verifierIntegrite(d) {
    if (!d || !d.hash) return true // pas d'empreinte (vieux navigateur) → on ne bloque pas
    return (await sha256Hex(canonical(d))) === d.hash
  }

  // Miroir Firestore (registre public) — best-effort, pour la vérif cross-appareils.
  function mirrorToCloud(d) {
    try {
      if (!fbAuth.currentUser) return // démo : pas d'auth → registre local seulement
      setDoc(doc(db, 'diplomas', d.code), { ...d, schoolUid: fbAuth.currentUser.uid }).catch(() => {})
    } catch { /* offline / règles : on garde le registre local */ }
  }

  /** Lookup public d'un diplôme par code : registre local puis Firestore. */
  async function lookup(code) {
    const local = getByCode(code)
    if (local) return local
    try {
      const snap = await getDoc(doc(db, 'diplomas', normCodeForDoc(code)))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  }

  // Le code Firestore = code tel quel (avec tirets) ; on tente quelques variantes.
  function normCodeForDoc(code) { return (code || '').trim().toUpperCase() }

  /** Démo : émet quelques diplômes (Bac pour les Tle admis, BEPC pour les 3e). */
  async function seedDemo({ eleves, ecoleNom, ecoleAcronyme }) {
    if (diplomes.value.length || !eleves?.length) return
    const now = new Date()
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const annee = `${y - 1}-${y}`
    const isLevel = (cn, pref) => (cn || '').toLowerCase().replace('è', 'e').replace('é', 'e').startsWith(pref)
    const tle = eleves.filter((e) => (e.status || 'inscrit') === 'inscrit' && (isLevel(e.className, 'tle') || isLevel(e.className, 'terminale'))).slice(0, 6)
    const troisieme = eleves.filter((e) => (e.status || 'inscrit') === 'inscrit' && isLevel(e.className, '3e')).slice(0, 4)
    const mentionFor = (i) => MENTIONS[[2, 1, 3, 0, 1, 2][i % 6]]
    let i = 0
    for (const e of tle) {
      await emettre({ eleveId: e.id, eleveName: `${e.lastName} ${e.firstName}`, type: 'bac', serie: seriesFromClass(e.className), mention: mentionFor(i++), annee, ecoleNom, ecoleAcronyme, emisPar: 'Démo' })
    }
    for (const e of troisieme) {
      await emettre({ eleveId: e.id, eleveName: `${e.lastName} ${e.firstName}`, type: 'bepc', serie: '', mention: mentionFor(i++), annee, ecoleNom, ecoleAcronyme, emisPar: 'Démo' })
    }
  }

  function seriesFromClass(cn) {
    const m = (cn || '').match(/\b([A-D])\b/i)
    return m ? m[1].toUpperCase() : ''
  }

  return {
    diplomes, diplomesSorted,
    getType, getByCode, emettre, revoquer, verifierIntegrite, verifierSignature: verifySignature, lookup, seedDemo,
  }
})
