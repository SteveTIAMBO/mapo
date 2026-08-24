/**
 * Lecture de la page d'un programme — et la porte qu'elle ouvre.
 *
 * Le champ « lien du programme » était saisi, enregistré, affiché, et relu par
 * RIEN : les modules d'une formation hors catalogue étaient devinés depuis son
 * seul intitulé. Plausibles, et faux.
 *
 * ⚠️ ALLER CHERCHER UNE URL FOURNIE PAR L'UTILISATEUR, DEPUIS NOTRE SERVEUR,
 * EST UNE PORTE (SSRF). Sans garde, n'importe qui fait émettre des requêtes par
 * notre machine : réseau interne de l'hébergeur, boucle locale, et surtout
 * `169.254.169.254`, l'adresse de métadonnées des fournisseurs cloud, qui rend
 * des identifiants.
 *
 * Le contrôle vit dans `server/mapo-ia.php`. On ne peut pas exécuter PHP ici —
 * même méthode que `quiz-verification.test.js` : on REJOUE la logique
 * déterministe des plages d'adresses, et on exige que le serveur contienne bien
 * les garanties qu'on annonce.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IA = readFileSync(resolve(RACINE, 'server/mapo-ia.php'), 'utf8')
const OFFRES = readFileSync(resolve(RACINE, 'server/mapo-offres-data.php'), 'utf8')
const STORE = readFileSync(resolve(RACINE, 'src/stores/tuteur.js'), 'utf8')

/** Rejoue `mapo_ip_publique()` : filtre natif PHP + les deux trous comblés. */
function ipPublique(ip) {
  const o = ip.split('.').map(Number)
  if (o.length !== 4 || o.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false
  const n = ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]
  const dans = (base, bits) => (n >>> (32 - bits)) === (base >>> (32 - bits))
  if (dans(0x00000000, 8)) return false        // 0.0.0.0/8
  if (dans(0x0A000000, 8)) return false        // 10.0.0.0/8      privée
  if (dans(0x64400000, 10)) return false       // 100.64.0.0/10   CGNAT
  if (dans(0x7F000000, 8)) return false        // 127.0.0.0/8     boucle locale
  if (dans(0xA9FE0000, 16)) return false       // 169.254.0.0/16  métadonnées cloud
  if (dans(0xAC100000, 12)) return false       // 172.16.0.0/12   privée
  if (dans(0xC0000000, 24)) return false       // 192.0.0.0/24    IETF
  if (dans(0xC0A80000, 16)) return false       // 192.168.0.0/16  privée
  if (dans(0xC6120000, 15)) return false       // 198.18.0.0/15   bancs de test
  if (dans(0xE0000000, 4)) return false        // 224.0.0.0/4     multidiffusion
  if (dans(0xF0000000, 4)) return false        // 240.0.0.0/4     réservée
  return true
}

describe('⚠️ les adresses qu’on refuse de joindre', () => {
  it('la boucle locale', () => {
    for (const ip of ['127.0.0.1', '127.0.0.53', '127.255.255.254']) {
      expect(ipPublique(ip), ip).toBe(false)
    }
  })

  it('les métadonnées cloud — le cas qui rend des identifiants', () => {
    expect(ipPublique('169.254.169.254')).toBe(false)
    expect(ipPublique('169.254.0.1')).toBe(false)
  })

  it('les réseaux privés', () => {
    for (const ip of ['10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1']) {
      expect(ipPublique(ip), ip).toBe(false)
    }
  })

  it('les deux plages que le filtre natif de PHP laisse passer', () => {
    // Sans le complément à la main, celles-ci seraient joignables.
    expect(ipPublique('100.64.0.1')).toBe(false)   // CGNAT des opérateurs
    expect(ipPublique('192.0.0.1')).toBe(false)    // usages spéciaux IETF
    expect(ipPublique('198.18.0.1')).toBe(false)   // bancs de test
  })

  it('⚠️ mais 172.32 et 100.128 sont PUBLIQUES : le masque doit être juste', () => {
    // Une erreur d'un bit sur /12 ou /10 bloquerait des sites légitimes, et
    // l'échec serait silencieux — « cette page n'a pas pu être ouverte ».
    expect(ipPublique('172.32.0.1')).toBe(true)
    expect(ipPublique('100.128.0.1')).toBe(true)
    expect(ipPublique('192.1.0.1')).toBe(true)
  })

  it('un vrai site d’école reste joignable', () => {
    for (const ip of ['8.8.8.8', '104.18.32.7', '212.27.48.10']) {
      expect(ipPublique(ip), ip).toBe(true)
    }
  })
})

describe('les garanties annoncées sont bien dans le serveur', () => {
  it('⚠️ le rejeu ci-dessus et le PHP portent les MÊMES masques', () => {
    // Sans ce test, la section précédente ne prouverait rien du serveur : elle
    // vérifierait seulement ma copie JavaScript. Ces trois masques sont ceux
    // que PHP n'apporte pas, donc ceux qu'on a écrits à la main — et donc ceux
    // qui peuvent être faux.
    expect(IA).toContain('($n & 0xFFC00000) === 0x64400000')  // 100.64.0.0/10
    expect(IA).toContain('($n & 0xFFFFFF00) === 0xC0000000')  // 192.0.0.0/24
    expect(IA).toContain('($n & 0xFFFE0000) === 0xC6120000')  // 198.18.0.0/15
    // Et le filtre natif, qui couvre tout le reste.
    expect(IA).toContain('FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE')
  })

  it('https seulement, et le port 443', () => {
    expect(IA).toContain("if (($p['scheme'] ?? '') !== 'https') return ['ok' => false, 'raison' => 'https_requis'];")
    expect(IA).toContain("if ($port !== 443) return ['ok' => false, 'raison' => 'port_interdit'];")
  })

  it('aucun « user:pass@ » dans l’URL', () => {
    expect(IA).toContain("if (isset($p['user']) || isset($p['pass']))")
  })

  it('TOUTES les adresses résolues doivent être publiques', () => {
    // Un nom qui résout vers une publique ET une interne passerait si on ne
    // testait que la première.
    expect(IA).toContain("foreach ($ips as $ip) if (!mapo_ip_publique($ip))")
  })

  it('⚠️ la connexion est ÉPINGLÉE sur l’IP validée', () => {
    // Sans épinglage, un domaine répond « adresse publique » à la vérification
    // puis « 127.0.0.1 » à la connexion : c'est le rebinding DNS, et il annule
    // tout le contrôle qui précède.
    expect(IA).toContain('CURLOPT_RESOLVE')
    expect(IA).toContain("CURLOPT_FOLLOWLOCATION => false")
  })

  it('les redirections sont revalidées une par une', () => {
    // Une redirection vers l'interne suffirait à contourner le reste.
    expect(IA).toMatch(/for \(\$saut = 0; \$saut <= \$maxSauts; \$saut\+\+\) \{\s*\$v = mapo_url_sure\(\$url\);/)
  })

  it('le temps, la taille et le nombre de sauts sont bornés', () => {
    expect(IA).toContain('CURLOPT_TIMEOUT')
    expect(IA).toContain('CURLOPT_PROGRESSFUNCTION')
    expect(IA).toContain("'raison' => 'trop_de_redirections'")
  })

  it('la tâche est authentifiée : elle est placée APRÈS le contrôle de jeton', () => {
    // Sinon notre serveur devient un relais ouvert à tout venant.
    const iAuth = IA.indexOf('$uid = verifyFirebaseToken();')
    const iTache = IA.indexOf("if ($task === 'fetch_programme') {")
    expect(iAuth).toBeGreaterThan(0)
    expect(iTache).toBeGreaterThan(iAuth)
  })
})

describe('ce que la lecture rend, et ce qu’elle coûte', () => {
  it('elle ne coûte AUCUN crédit : aucun modèle n’est appelé', () => {
    // Sans cette ligne, le défaut prudent de mapo_cout_task() facturerait 2 500.
    expect(OFFRES).toContain("'fetch_programme' => 0,")
  })

  it('une page presque vide est refusée, pas transmise au modèle', () => {
    // Les sites d'écoles rendus en JavaScript renvoient une coquille : la
    // soumettre ferait retomber l'IA sur l'invention, en ayant l'air d'avoir lu.
    expect(IA).toContain("if (mb_strlen($texte) < 400) { echo json_encode(['ok' => false, 'error' => 'page_vide']); exit; }")
  })

  it('scripts et styles sont retirés avant de compter le texte', () => {
    expect(IA).toMatch(/<\(script\|style\|noscript\|svg\)/)
  })

  it('le client passe par la même fenêtre que l’import PDF', () => {
    // Une seule logique de sélection des 4 000 caractères utiles, testée une fois.
    expect(STORE).toContain('async function lireProgrammeUrl(url)')
    const VUE = readFileSync(resolve(RACINE, 'src/components/MiapoFormationSetup.vue'), 'utf8')
    expect(VUE).toContain('texte.value = resumerProgramme(res.texte)')
  })
})
