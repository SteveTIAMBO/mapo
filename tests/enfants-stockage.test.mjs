/**
 * Test du stockage des enfants MAPO+ (1 document Firestore par enfant).
 *
 *   node tests/enfants-stockage.test.mjs
 *
 * Pourquoi ce fichier : la migration « ancien document groupé → un document par
 * enfant » et l'isolement du compte enfant sont exactement le genre de logique
 * qui casse en silence — on ne s'en aperçoit qu'une fois les données mélangées
 * ou perdues chez un vrai utilisateur. Le test rejoue ces chemins contre un
 * FAUX Firestore en mémoire : pas de compte, pas de réseau, pas de projet
 * Firebase. Il ne remplace donc pas un essai réel (il ne teste ni les règles de
 * sécurité ni le SDK), il verrouille la LOGIQUE.
 *
 * Il fonctionne en recopiant `src/stores/enfantsAutonomes.js` dans un dossier
 * temporaire avec ses trois imports remplacés par des bouchons. Aucune
 * dépendance de test à installer.
 */
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(tmpdir(), 'mapo-test-enfants')
mkdirSync(dir, { recursive: true })
if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(racine, 'node_modules'), join(dir, 'node_modules'), 'dir')

writeFileSync(join(dir, 'firebase.js'), `
export const auth = { currentUser: { uid: 'UID_PARENT' } }
export const db = {}
`)
writeFileSync(join(dir, 'authstub.js'), `
export function useAuthStore() { return { userProfile: { email: 'parent@test' }, isDemo: false } }
`)
writeFileSync(join(dir, 'firestore.js'), `
// Faux Firestore en mémoire : chemins '/'-joints + journal des opérations.
export const cloud = new Map()
export const journal = []
export function reset(init = {}) {
  cloud.clear(); journal.length = 0
  for (const [k, v] of Object.entries(init)) cloud.set(k, v)
}
export function doc(_db, ...seg) { return { path: seg.join('/') } }
export function collection(_db, ...seg) { return { path: seg.join('/') } }
export async function getDoc(ref) {
  journal.push({ op: 'get', path: ref.path })
  const d = cloud.get(ref.path)
  return { exists: () => d !== undefined, data: () => d }
}
export async function getDocs(ref) {
  journal.push({ op: 'list', path: ref.path })
  const prefix = ref.path + '/'
  const docs = []
  for (const [k, v] of cloud.entries()) {
    if (k.startsWith(prefix) && !k.slice(prefix.length).includes('/')) docs.push({ id: k.slice(prefix.length), data: () => v })
  }
  return { docs }
}
export async function setDoc(ref, data) { journal.push({ op: 'set', path: ref.path }); cloud.set(ref.path, data) }
export async function deleteDoc(ref) { journal.push({ op: 'del', path: ref.path }); cloud.delete(ref.path) }
`)
// Bouchons des utilitaires importés par le store (hors périmètre de ce test).
writeFileSync(join(dir, 'recompenses.js'), `export function enregistrerActivite() {}\n`)
writeFileSync(join(dir, 'coursperso.js'), `export function addCoursPerso() {}\n`)
writeFileSync(join(dir, 'demoecole.js'), `export const DEMO_LIEN = { schoolId: 'demo', eleveId: 'demo', className: '', classId: '', matricule: '', ecole: '' }\n`)
writeFileSync(join(dir, 'store.js'), readFileSync(join(racine, 'src/stores/enfantsAutonomes.js'), 'utf8')
  .replace("from '../firebase'", "from './firebase.js'")
  .replace("from 'firebase/firestore'", "from './firestore.js'")
  .replace("from './auth'", "from './authstub.js'")
  .replace("from '../utils/recompenses'", "from './recompenses.js'")
  .replace("from '../utils/coursPerso'", "from './coursperso.js'")
  .replace("from '../data/demoEcoleLiee'", "from './demoecole.js'"))

global.localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null },
  setItem(k, v) { this._d[k] = String(v) },
  removeItem(k) { delete this._d[k] },
}

const { createPinia, setActivePinia } = await import('pinia')
const fs = await import(join(dir, 'firestore.js'))
const { auth } = await import(join(dir, 'firebase.js'))
const { useEnfantsAutonomesStore } = await import(join(dir, 'store.js'))

let ko = 0
const ok = (nom, cond, detail) => {
  console.log((cond ? 'OK  ' : 'KO  ') + nom + (cond ? '' : ' -> ' + JSON.stringify(detail)))
  if (!cond) ko++
}
const frais = () => { setActivePinia(createPinia()); global.localStorage._d = {}; return useEnfantsAutonomesStore() }
const cles = (p) => [...fs.cloud.keys()].filter((k) => k.startsWith(p)).sort()

// ── 1. Migration depuis l'ancien document groupé ──────────────────────
fs.reset({
  'users/UID_PARENT/b2c/enfants': { enfants: [{ id: 'ea-A', firstName: 'Awa', notes: [] }, { id: 'ea-B', firstName: 'Bilal', notes: [] }] },
  'users/UID_PARENT/b2c/link': {}, // link vit dans la MÊME sous-collection : ne doit pas devenir un profil
})
let s = frais()
await s.hydrate()
ok('migration : 2 profils repris', s.enfants.length === 2, s.enfants.map((e) => e && e.id))
ok('migration : 1 document par enfant écrit', cles('users/UID_PARENT/b2c/enfant_').length === 2, cles('users/UID_PARENT/b2c/'))
ok('migration : ancien document conservé en repli', fs.cloud.has('users/UID_PARENT/b2c/enfants'), null)
ok('migration : link jamais pris pour un enfant', s.enfants.every((e) => e && String(e.id).startsWith('ea-')), s.enfants)

// ── 2. Idempotence : les enfant_* priment, pas de remigration ─────────
fs.reset({
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfants': { enfants: [{ id: 'ea-PERIME', firstName: 'Perime', notes: [] }] },
})
s = frais()
await s.hydrate()
ok('idempotence : les enfant_* priment sur le legacy', s.enfants.length === 1 && s.enfants[0].id === 'ea-A', s.enfants.map((e) => e.id))

// ── 3. Écriture ciblée : une note ne pousse QUE cet enfant ────────────
fs.reset({
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfant_ea-B': { enfant: { id: 'ea-B', firstName: 'Bilal', notes: [] } },
})
s = frais()
await s.hydrate()
fs.journal.length = 0
s.addNote('ea-A', 'Maths', 12)
let ecrits = fs.journal.filter((j) => j.op === 'set').map((j) => j.path)
ok("écriture ciblée : le profil du frère n'est pas réécrit", !ecrits.includes('users/UID_PARENT/b2c/enfant_ea-B'), ecrits)
ok('écriture ciblée : le profil visé est écrit', ecrits.includes('users/UID_PARENT/b2c/enfant_ea-A'), ecrits)
ok('écriture ciblée : le repli groupé reste alimenté', ecrits.includes('users/UID_PARENT/b2c/enfants'), ecrits)

// ── 4. Suppression : le document de l'enfant part aussi ───────────────
fs.journal.length = 0
s.removeEnfant('ea-B')
ok('suppression : le document enfant_ea-B est supprimé', fs.journal.some((j) => j.op === 'del' && j.path.endsWith('enfant_ea-B')), fs.journal)

// ── 5. Compte enfant : lecture directe, aucun list, aucun repli ───────
fs.reset({
  'users/UID_ENFANT/b2c/link': { ownerUid: 'UID_PARENT', enfantId: 'ea-A' },
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfant_ea-B': { enfant: { id: 'ea-B', firstName: 'Bilal', notes: [] } },
})
auth.currentUser = { uid: 'UID_ENFANT' }
s = frais()
await s.hydrate()
ok('compte enfant : un seul profil, le sien', s.enfants.length === 1 && s.enfants[0].id === 'ea-A', s.enfants.map((e) => e.id))
ok('compte enfant : AUCUN list sur b2c (la règle le refuserait)', !fs.journal.some((j) => j.op === 'list'), fs.journal.filter((j) => j.op === 'list'))
ok('compte enfant : bascule en mode apprenant', s.mode === 'apprenant', s.mode)
fs.journal.length = 0
s.addNote('ea-A', 'Maths', 15)
ecrits = fs.journal.filter((j) => j.op === 'set').map((j) => j.path)
ok("compte enfant : n'écrase PAS le document groupé de la fratrie", !ecrits.includes('users/UID_PARENT/b2c/enfants'), ecrits)
ok('compte enfant : écrit bien son propre profil', ecrits.includes('users/UID_PARENT/b2c/enfant_ea-A'), ecrits)
ok('compte enfant : ne touche pas le profil du frère', !ecrits.includes('users/UID_PARENT/b2c/enfant_ea-B'), ecrits)

console.log(ko ? `\n>>> ${ko} ÉCHEC(S)` : '\n>>> TOUT PASSE')
process.exit(ko ? 1 : 0)
