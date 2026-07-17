/**
 * Détection du « tenant » à partir du sous-domaine.
 *
 * MAPO sert trois types d'instances depuis un même build :
 *   - vitrine     : mapo.app-edufrem.com (la démo + le choix Secondaire/Supérieur)
 *   - école       : <slug>.app-edufrem.com (une école, identifiée par son slug = schoolId)
 *   - méga admin  : adminmapo.app-edufrem.com (espace EDUFREM pour provisionner
 *                   les écoles, configurer leurs modules, créer les comptes admin)
 *
 * Le sous-domaine est l'unique source de vérité pour le mode d'exécution.
 * Pour le développement / la prévisualisation, on peut forcer le mode via
 * un paramètre d'URL `?tenant=admin` ou `?tenant=school:xyz`.
 */

const ROOT_DOMAIN = 'app-edufrem.com'
const VITRINE_HOSTS = new Set(['app-edufrem.com', 'mapo.app-edufrem.com'])

function isLocalHost(host) {
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('192.168.') ||
    host.endsWith('.local')
  )
}

function readOverride() {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('tenant')
    if (!v) return null
    if (v === 'admin' || v === 'megaAdmin') return { mode: 'megaAdmin', source: 'override' }
    if (v === 'preview' || v === 'vitrine') return { mode: 'preview', source: 'override' }
    if (v === 'miapo') return { mode: 'miapo', source: 'override' }
    if (v.startsWith('school:')) {
      const sid = v.slice(7).trim()
      if (sid) return { mode: 'school', schoolId: sid, source: 'override' }
    }
  } catch (e) { /* silent */ }
  return null
}

function detect() {
  if (typeof window === 'undefined') return { mode: 'preview', source: 'ssr' }

  // 1) Override explicite via ?tenant=...
  const override = readOverride()
  if (override) return override

  const host = window.location.hostname.toLowerCase()

  // 2) Développement local
  if (isLocalHost(host)) return { mode: 'preview', source: 'local' }

  // 3) Vitrine (domaine principal)
  if (VITRINE_HOSTS.has(host)) return { mode: 'preview', source: 'host' }

  // 4) Sous-domaine sous app-edufrem.com
  //    - adminmapo / admin → espace super admin EDUFREM
  //    - <slug>            → instance école identifiée par son slug
  if (host.endsWith('.' + ROOT_DOMAIN)) {
    const sub = host.slice(0, -('.' + ROOT_DOMAIN).length).split('.')[0]
    if (sub === 'adminmapo' || sub === 'admin') return { mode: 'megaAdmin', source: 'host' }
    if (sub === 'miapo') return { mode: 'miapo', source: 'host' }
    if (sub) return { mode: 'school', schoolId: sub, source: 'host' }
  }

  // 5) Hôte inconnu → on traite comme vitrine pour rester sûr
  return { mode: 'preview', source: 'fallback' }
}

// Résultat figé pour la durée de la session (le sous-domaine ne change pas).
const tenant = detect()

export function getTenant() {
  return tenant
}

export function isMegaAdminTenant() {
  return tenant.mode === 'megaAdmin'
}

export function isSchoolTenant() {
  return tenant.mode === 'school'
}

export function isPreviewTenant() {
  return tenant.mode === 'preview'
}

/** Instance MAPO+ autonome (miapo.app-edufrem.com) : produit B2C séparé. */
export function isMiapoTenant() {
  return tenant.mode === 'miapo'
}

/** schoolId imposé par le sous-domaine, ou null. */
export function tenantSchoolId() {
  return tenant.mode === 'school' ? tenant.schoolId : null
}
