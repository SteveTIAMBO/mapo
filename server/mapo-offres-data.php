<?php
/**
 * MAPO+ — Offres d'abonnement B2C : SOURCE DE VÉRITÉ UNIQUE (prix + quotas).
 *
 * >>> POUR AJUSTER LES QUOTAS OU LES PRIX PLUS TARD : modifier CE fichier
 *     uniquement, puis le re-déposer. Le front (via mapo-offres.php), la remise
 *     de crédits après paiement (mapo-pay-tranzak.php) et le décompte
 *     (mapo-ia.php) lisent tous d'ici → pas de valeur codée en dur ailleurs.
 *
 * 1 crédit = 1 action IA (quiz, orientation/6C, fiche, plan, lecture de copie,
 * correction). Coût réel ≈ 2–4 FCFA/action → ces quotas sont largement rentables.
 * Prix en FCFA (XAF). Durée = 30 jours (Tranzak sans récurrent → re-charge).
 */

function mapo_offres() {
  return [
    ['id' => 'decouverte', 'nom' => 'Découverte', 'prix' => 0,    'credits' => 15,  'dureeJours' => 30],
    ['id' => 'standard',   'nom' => 'Standard',   'prix' => 1000, 'credits' => 60,  'dureeJours' => 30],
    ['id' => 'premium',    'nom' => 'Premium',    'prix' => 3000, 'credits' => 200, 'dureeJours' => 30],
  ];
}

function mapo_offre($id) {
  foreach (mapo_offres() as $o) if ($o['id'] === $id) return $o;
  return mapo_offres()[0]; // repli = offre gratuite
}
