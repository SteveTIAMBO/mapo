/**
 * Le prix d'une page de paiement vient du CATALOGUE, jamais du navigateur.
 *
 * ⚠️ TROU MESURÉ EN PRODUCTION le 25/08, sur la sandbox Stripe. `mapo-pay-stripe.php`
 * calculait le montant ainsi :
 *
 *   $eur = $packData ? ... : ($o ? ... : (float) ($body['amount'] ?? 0));
 *
 * Sans `subscriptionOffer` ni `creditPack`, il retombait donc sur le montant du
 * CLIENT — et l'intitulé affiché sur la page venait lui aussi du client.
 * Vérifié en appelant l'endpoint : `{ action:'init', amount: 0.5, description:
 * 'Renouvellement urgent — EDUFREM' }` renvoyait `ok:true` et une URL Stripe.
 *
 * Ce n'était PAS un vol d'abonnement : `mc_pendingSet` n'est appelé que si une
 * offre ou un pack existe, donc payer cette session n'accordait rien. Le danger
 * est ailleurs — en mode LIVE, n'importe quel compte authentifié fabriquait des
 * pages de paiement hébergées par Stripe, portant NOTRE marque et l'intitulé de
 * son choix. L'argent encaissé, et les impayés qui suivent, atterrissent sur
 * notre compte marchand.
 *
 * Tranzak tenait déjà la règle (« le montant vient du SERVEUR, jamais du
 * client ») ; le fichier Stripe avait gardé le repli.
 *
 * On ne peut pas exécuter PHP ici — même méthode que `quiz-verification.test.js` :
 * on exige que le serveur contienne les garanties qu'on annonce.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, 'server', p), 'utf8')
/**
 * Les assertions portent sur le CODE, pas sur la prose : ce fichier explique le
 * défaut en commentaire, donc les chaînes fautives y figurent forcément.
 */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')
const STRIPE = lire('mapo-pay-stripe.php')
const TRANZAK = lire('mapo-pay-tranzak.php')

describe('Stripe : le montant ne peut plus venir du client', () => {
  it('⚠️ plus aucun repli sur le montant envoyé par le navigateur', () => {
    const code = sansCommentaires(STRIPE)
    const i = code.indexOf("if ($action === 'init')")
    const bloc = code.slice(i, code.indexOf("if ($action === 'check')"))
    expect(bloc).not.toContain("$body['amount']")
  })

  it('ni offre ni pack reconnus → on REFUSE, on n’invente pas un prix', () => {
    expect(STRIPE).toContain("if (!$packData && !$o) {")
    expect(STRIPE).toContain("'error' => 'offre_inconnue'")
  })

  it('⚠️ une offre inconnue est détectée, malgré le repli silencieux de mapo_offre()', () => {
    // mapo_offre() renvoie l'offre GRATUITE quand l'id n'existe pas. Sans cette
    // comparaison, une offre bidon paraissait valide puis échouait plus loin sur
    // un « montant invalide » qui ne disait pas la vraie cause.
    expect(STRIPE).toContain("if ($candidat && ($candidat['id'] ?? '') === $offre) $o = $candidat;")
  })

  it('l’intitulé de la page de paiement vient du catalogue', () => {
    // C'est lui qui rendait le hameçonnage crédible : une page Stripe titrée
    // comme l'attaquant le souhaite, sous notre marque.
    const code = sansCommentaires(STRIPE)
    const i = code.indexOf("if ($action === 'init')")
    const bloc = code.slice(i, code.indexOf("if ($action === 'check')"))
    expect(bloc).not.toContain("$body['description']")
    expect(bloc).toContain("'Abonnement MAPO+ ' . ($o['nom'] ?? '')")
  })
})

describe('la règle est la même des deux côtés', () => {
  it('Tranzak la tenait déjà', () => {
    expect(TRANZAK).toContain('$amount = (int) $o[\'prix\'];')
    expect(TRANZAK).toMatch(/le montant vient du SERVEUR, jamais du client/i)
  })

  it('l’octroi reste adossé à un enregistrement SERVEUR, pas à la session payée', () => {
    // Une session sans `pending` n'accorde rien : c'est ce qui a empêché le trou
    // de devenir un vol d'abonnement.
    expect(STRIPE).toContain("elseif (!empty($pend['offreId'])) { mc_grant($pend['uid'], $pend['offreId'])")
    expect(STRIPE).toContain("elseif ($offre !== '') mc_pendingSet($resp['id'], $uid, $offre, 'tier');")
  })
})
