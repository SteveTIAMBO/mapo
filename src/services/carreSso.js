/**
 * carreSso.js — ouvre Carré (version web) DÉJÀ connecté, depuis MAPO.
 *
 * Flux (voir SPEC-SSO-CARRE.md) :
 *   getIdToken() -> POST /api/sso-carre.php (Bearer) -> { code }
 *   -> ouvre https://carre.app-edufrem.com/app/#/sso?code=...
 * La web-app Carré échange ensuite le code (sso-exchange.php) et signInWithCustomToken.
 *
 * Marche quel que soit le mode de connexion MAPO (téléphone OU email) : c'est un
 * custom token Firebase, pas un « SSO Google ».
 */

import { auth } from '../firebase'

const SSO_ENDPOINT = 'https://carre.app-edufrem.com/api/sso-carre.php'
const CARRE_WEB_URL = 'https://carre.app-edufrem.com/app/'

/**
 * Ouvre Carré web connecté. Lève une erreur (avec .code) en cas d'échec :
 *  - 'auth'        : personne non connectée à MAPO
 *  - 403           : école non activée pour Carré
 *  - autre nombre  : échec de l'endpoint SSO
 */
export async function openCarre() {
  const user = auth.currentUser
  if (!user) {
    const e = new Error('not-authenticated')
    e.code = 'auth'
    throw e
  }

  // On ouvre l'onglet TOUT DE SUITE (dans le geste de clic) pour éviter le blocage
  // des popups. On le redirige après l'échange, ou on le ferme si ça échoue.
  const win = window.open('', '_blank')

  try {
    const idToken = await user.getIdToken()
    const res = await fetch(SSO_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!res.ok) {
      const e = new Error(res.status === 403 ? 'school-not-enabled' : 'sso-failed')
      e.code = res.status
      throw e
    }
    const data = await res.json()
    if (!data || !data.code) throw new Error('sso-no-code')

    const url = `${CARRE_WEB_URL}#/sso?code=${encodeURIComponent(data.code)}`
    if (win) win.location.href = url
    else window.open(url, '_blank', 'noopener')
  } catch (err) {
    if (win) win.close()
    throw err
  }
}
