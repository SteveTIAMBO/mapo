<?php
/**
 * MAPO+ — Offres d'abonnement B2C : SOURCE DE VÉRITÉ UNIQUE (prix + quotas).
 *
 * >>> POUR AJUSTER LES QUOTAS OU LES PRIX PLUS TARD : modifier CE fichier
 *     uniquement, puis le re-déposer. Le front (mapo-offres.php), la remise de
 *     crédits après paiement (mapo-pay-tranzak.php / mapo-pay-stripe.php) et le
 *     décompte (mapo-ia.php) lisent tous d'ici → aucune valeur en dur ailleurs.
 *
 * MODÈLE (décidé avec Steve) : jauge de TOKENS façon Claude. Chaque action IA
 * « coûte » un nombre de tokens (mapo_cout_action). L'offre donne un plafond de
 * tokens PAR SEMAINE (`capTokens`) : une fois épuisé, l'utilisateur doit monter
 * d'offre OU attendre la recharge du LUNDI (semaine ISO). La FACTURATION, elle,
 * reste mensuelle (`cycleJours` = validité du palier). Deux horloges : palier =
 * mensuel, jauge de tokens = hebdomadaire.
 *
 * PRINCIPE : TOUTES les fonctions IA sont ouvertes à TOUS les paliers — ce qui
 * différencie les offres, c'est le VOLUME d'usage (plus on utilise l'IA, plus on
 * a besoin de monter). Seule exception câblée : la relance WhatsApp des parents,
 * réservée aux offres 6500+ (`whatsapp` = true) comme incitation à l'upsell.
 *
 * 4 paliers (objectif : orienter le maximum de familles vers « Avancé » à 6500,
 * marqué `promo`). `capTokens` = plafond HEBDOMADAIRE. `prix` en FCFA (XAF,
 * paiement Tranzak) ; `prixEur` en euros (paiement Stripe, familles d'Europe).
 * Chiffres ajustables ici.
 */

/**
 * ⚠️ LES DEUX GRILLES NE SE CONVERTISSENT PAS L'UNE DANS L'AUTRE.
 *
 * `prix` (XAF) et `prixEur` sont deux DÉCISIONS COMMERCIALES distinctes, pas un
 * taux de change : au 25/08/2026 Steve a fixé le marché français à 5 / 12 / 19 €
 * là où le Cameroun reste à 3 500 / 6 500 / 10 000 XAF (soit ~5,3 / 9,9 / 15,2 €).
 * Le Français paie donc plus cher le MÊME quota de jetons, et c'est voulu.
 *
 * Ne « corrigez » donc jamais l'un pour l'aligner sur l'autre.
 */
function mapo_offres() {
  return [
    ['id' => 'decouverte', 'nom' => 'Découverte', 'prix' => 0,     'prixEur' => 0,     'capTokens' => 25000,  'cycleJours' => 30, 'promo' => false, 'whatsapp' => false],
    ['id' => 'essentiel',  'nom' => 'Essentiel',  'prix' => 3500,  'prixEur' => 5.00,  'capTokens' => 125000, 'cycleJours' => 30, 'promo' => false, 'whatsapp' => false],
    ['id' => 'avance',     'nom' => 'Avancé',     'prix' => 6500,  'prixEur' => 12.00,  'capTokens' => 300000, 'cycleJours' => 30, 'promo' => true,  'whatsapp' => true],
    ['id' => 'illimite',   'nom' => 'Premium',    'prix' => 10000, 'prixEur' => 19.00, 'capTokens' => 600000, 'cycleJours' => 30, 'promo' => false, 'whatsapp' => true],
  ];
}

/** Offre famille : réduction appliquée dès le 2e enfant abonné. Ajustable. */
function mapo_remise_famille() {
  return ['minEnfants' => 2, 'pct' => 35];
}

/**
 * Recharges de crédits ponctuelles (PAYG) : un achat one-shot ajoute des tokens
 * à un solde « bonus » qui NE se réinitialise PAS chaque semaine (à la différence
 * de la jauge d'abonnement). Consommé APRÈS la jauge hebdo. Prix ajustables.
 */
function mapo_credit_packs() {
  return [
    ['id' => 'pack_s', 'nom' => 'Petite recharge', 'tokens' => 60000,  'prix' => 1000, 'prixEur' => 1.99],
    ['id' => 'pack_m', 'nom' => 'Recharge',        'tokens' => 180000, 'prix' => 2500, 'prixEur' => 4.99],
    ['id' => 'pack_l', 'nom' => 'Grande recharge', 'tokens' => 500000, 'prix' => 6000, 'prixEur' => 11.99],
  ];
}
function mapo_credit_pack($id) {
  foreach (mapo_credit_packs() as $p) if ($p['id'] === $id) return $p;
  return null;
}

/** Coût en tokens par action IA (par `task` de mapo-ia.php). Ajustable. */
function mapo_cout_action() {
  return [
    'tutor_quiz'      => 3000,
    // Test de positionnement : 8 questions, une seule fois par matiere. Meme
    // ordre de grandeur qu'un quiz — il en produit d'ailleurs autant.
    'positionnement'  => 3000,
    'vision_copie'    => 3500,
    'vision_bulletin' => 3500,
    'vision_edt'      => 3000,
    'vision_registre' => 3500,
    'orientation'     => 2600,
    'orientation6c'   => 2600,
    'bilan6c'         => 1600,
    'eval_reponse'    => 1500,
    'prepa_examen'    => 2000,
    'course_plan'     => 2500,
    'extract_modules' => 2000,
    'pedagogie'       => 2500,
    'commande'        => 700,
    'tuteur_chat'     => 1200,
    'appreciation'    => 1200,
  ];
}
function mapo_cout_task($task) {
  $m = mapo_cout_action();
  return isset($m[$task]) ? (int) $m[$task] : 2500; // défaut prudent
}

function mapo_offre($id) {
  foreach (mapo_offres() as $o) if ($o['id'] === $id) return $o;
  return mapo_offres()[0]; // repli = offre gratuite
}

/** L'offre donne-t-elle droit à la relance WhatsApp (6500+) ? */
function mapo_offre_whatsapp($id) {
  $o = mapo_offre($id);
  return !empty($o['whatsapp']);
}
