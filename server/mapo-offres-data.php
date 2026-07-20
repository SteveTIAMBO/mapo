<?php
/**
 * MAPO+ — Offres d'abonnement B2C : SOURCE DE VÉRITÉ UNIQUE (prix + quotas).
 *
 * >>> POUR AJUSTER LES QUOTAS OU LES PRIX PLUS TARD : modifier CE fichier
 *     uniquement, puis le re-déposer. Le front (mapo-offres.php), la remise de
 *     crédits après paiement (mapo-pay-tranzak.php) et le décompte (mapo-ia.php)
 *     lisent tous d'ici → aucune valeur en dur ailleurs.
 *
 * MODÈLE (mix décidé avec Steve) : jauge de TOKENS façon Claude. Chaque action
 * IA « coûte » un nombre de tokens (mapo_cout_action) ; l'offre donne un plafond
 * de tokens par cycle. Plus lisible pour l'upsell qu'un simple compteur d'actions,
 * et plus juste (une lecture de copie coûte plus qu'un quiz). Prix en FCFA (XAF),
 * cycle 30 jours (Tranzak sans récurrent → re-charge mensuelle).
 *
 * Repère : les plafonds ci-dessous ≈ 15 / 60 / 200 quiz par mois (chiffres
 * validés le 2026-07-19), exprimés en tokens (1 quiz ≈ 3000 tokens).
 */

function mapo_offres() {
  return [
    ['id' => 'decouverte', 'nom' => 'Découverte', 'prix' => 0,    'capTokens' => 45000,  'cycleJours' => 30],
    ['id' => 'standard',   'nom' => 'Standard',   'prix' => 1000, 'capTokens' => 180000, 'cycleJours' => 30],
    ['id' => 'premium',    'nom' => 'Premium',    'prix' => 3000, 'capTokens' => 600000, 'cycleJours' => 30],
  ];
}

/** Coût en tokens par action IA (par `task` de mapo-ia.php). Ajustable. */
function mapo_cout_action() {
  return [
    'tutor_quiz'      => 3000,
    'vision_copie'    => 3500,
    'orientation'     => 2600,
    'orientation6c'   => 2600,
    'bilan6c'         => 1600,
    'eval_reponse'    => 1500,
    'prepa_examen'    => 2000,
    'course_plan'     => 2500,
    'extract_modules' => 2000,
    'pedagogie'       => 2500,
    'commande'        => 700,
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
