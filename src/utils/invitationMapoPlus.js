/**
 * Invitation MAPO+ émise par l'ÉCOLE — règles de destination et de lien.
 * ---------------------------------------------------------------------
 * MAPO gère l'école et son personnel ; les familles vivent dans MAPO+. Le pont
 * entre les deux ne doit rien demander à l'école : à la validation d'une
 * inscription, l'invitation part toute seule.
 *
 * Ce module ne contient QUE des décisions pures (qui reçoit, quelle URL, quel
 * canal possible), pour qu'elles soient testables sans Firestore ni navigateur.
 * L'écriture de l'invitation et l'envoi vivent ailleurs.
 */

const ROOT_DOMAIN = 'app-edufrem.com'

/** Origine de MAPO+ en production. */
export const MAPOPLUS_ORIGINE = `https://mapoplus.${ROOT_DOMAIN}`

/**
 * Qui reçoit l'accès, selon le cycle — décision de Steve du 23/08/2026.
 *
 * Au primaire, l'élève n'a ni téléphone ni autonomie : le compte est celui du
 * parent, qui ouvrira ensuite l'accès de son enfant avec le lien magique
 * famille déjà en place. À partir du secondaire, l'apprenant EST l'utilisateur
 * du tuteur : lui donner un compte de plein droit, et au parent un accès en
 * second, correspond à ce qui se passe réellement.
 *
 * ⚠️ Un cycle inconnu ou vide renvoie « parent », pas « apprenant » : c'est le
 * choix prudent. Un compte parent mal ciblé se transmet à l'enfant ; l'inverse
 * donne les bulletins à un enfant dont personne n'a voulu ça.
 */
export function destinataireParCycle(cycle) {
  const c = String(cycle || '').toLowerCase()
  return (c === 'secondaire' || c === 'superieur') ? 'apprenant' : 'parent'
}

/**
 * Le parent doit-il recevoir sa propre invitation, en plus de l'apprenant ?
 * Oui dès que l'apprenant est le destinataire principal : la famille garde un
 * accès au suivi. Au primaire il n'y a qu'une invitation, celle du parent.
 */
export function inviteParentEnSecond(cycle) {
  return destinataireParCycle(cycle) === 'apprenant'
}

/**
 * URL d'arrivée. Le code voyage en clair dans le lien : c'est assumé — il est à
 * usage unique, expire, et ne donne accès qu'à UN élève. Ce qu'il ouvre, c'est
 * un formulaire où la famille choisit son mot de passe, pas une session.
 *
 * `p` (prénom) n'est là que pour l'accueil : « Bonjour Awa » plutôt qu'un
 * formulaire anonyme. Le serveur ne s'en sert jamais comme d'une preuve.
 */
export function lienInvitation(code, prenom = '', origine = MAPOPLUS_ORIGINE) {
  const c = String(code || '').trim()
  if (!c) return ''
  const q = new URLSearchParams({ c })
  const p = String(prenom || '').trim()
  if (p) q.set('p', p)
  return `${origine}/rejoindre?${q.toString()}`
}

/**
 * Lien à PARTAGER (WhatsApp, SMS) — passe par `/inviter`, pas par `/rejoindre`.
 *
 * ⚠️ La différence n'est pas cosmétique. L'aperçu d'un lien est fabriqué par un
 * robot de messagerie qui n'exécute PAS le JavaScript : sur une URL de
 * l'application, il ne lit que les balises de l'`index.html`, qui annoncent
 * « MAPO — Gestion Scolaire ». Une famille recevrait donc un logiciel de gestion
 * d'établissement. `/inviter` est servi par un PHP qui porte les bonnes balises,
 * puis redirige vers `/rejoindre`.
 *
 * Le PRÉNOM n'est jamais mis dans ce lien-là : un aperçu est visible de tous
 * ceux à qui le message est transféré, et le prénom d'un mineur n'y a rien à
 * faire. Il est renvoyé par le serveur au moment du clic.
 */
export function lienPartage(code, origine = MAPOPLUS_ORIGINE) {
  const c = String(code || '').trim()
  if (!c) return ''
  return `${origine}/inviter?c=${encodeURIComponent(c)}`
}

/**
 * Canaux réellement utilisables pour CE dossier.
 *
 * ⚠️ Le point qui empêche de promettre « 100 % automatique » : l'e-mail du
 * parent est FACULTATIF à l'inscription, et beaucoup de familles n'en ont pas
 * (c'est la raison pour laquelle MAPO se connecte au téléphone en priorité).
 * Sans e-mail, aucun envoi ne peut partir seul — l'école partage le lien en un
 * geste par WhatsApp. Le dire est plus utile que de laisser croire à un envoi
 * qui n'a jamais eu lieu.
 */
export function canauxDisponibles({ parentEmail = '', parentPhone = '' } = {}) {
  const email = String(parentEmail || '').trim()
  const tel = String(parentPhone || '').trim()
  return {
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '',
    whatsapp: tel.replace(/[^\d+]/g, '').length >= 8 ? tel : '',
    // « automatique » = part sans intervention humaine. Seul l'e-mail l'est.
    automatique: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  }
}

/**
 * Deux invitations coexistent, et se ressemblent assez pour être confondues :
 *   - FAMILLE  : 8 caractères, alphabet lisible sans O/0/I/1/L (« KMPQ2R7X »).
 *                Émise par un parent pour son enfant.
 *   - ÉCOLE    : « {slug}~{aléatoire} », le slug en MINUSCULES (« stjoseph~KMPQ2R7X »).
 *                Émise par l'établissement à l'inscription.
 *
 * ⚠️ Le piège, trouvé en relisant la page d'arrivée : elle passait TOUT code en
 * majuscules. Sur un code école, cela détruit le slug (« STJOSEPH~… »), que le
 * pont serveur refuse ensuite au motif « code invalide » — une erreur qui
 * désigne la famille alors que la faute est chez nous.
 */
export const CODE_ECOLE = 'ecole'
export const CODE_FAMILLE = 'famille'

const RE_ECOLE = /^([A-Za-z0-9-]{2,40})~([A-Za-z0-9]{6,40})$/
const RE_FAMILLE = /^[A-Za-z0-9]{4,16}$/

/** Nature du code, ou '' si la forme n'est reconnue par aucune des deux. */
export function typeDeCode(brut) {
  const s = String(brut || '').trim()
  if (RE_ECOLE.test(s)) return CODE_ECOLE
  if (RE_FAMILLE.test(s)) return CODE_FAMILLE
  return ''
}

/**
 * Met le code dans la forme que le serveur attend, selon sa nature :
 * le slug de l'école reste en minuscules, la partie aléatoire passe en
 * majuscules (une famille recopie souvent en minuscules).
 */
export function normaliserCode(brut) {
  const s = String(brut || '').trim()
  const m = s.match(RE_ECOLE)
  if (m) return `${m[1].toLowerCase()}~${m[2].toUpperCase()}`
  if (RE_FAMILLE.test(s)) return s.toUpperCase()
  return s
}

/** Lien « partager sur WhatsApp » (l'école clique, le message est pré-écrit). */
export function lienWhatsapp(telephone, message) {
  const tel = String(telephone || '').replace(/[^\d]/g, '')
  if (!tel) return ''
  return `https://wa.me/${tel}?text=${encodeURIComponent(String(message || ''))}`
}
