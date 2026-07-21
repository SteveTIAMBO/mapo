<?php
/**
 * MAPO+ — Registre des factures/reçus B2C (par uid). Une entrée est écrite à la
 * CONFIRMATION d'un paiement (abonnement ou recharge de crédits), par les
 * adaptateurs mapo-pay-*.php. Fichier JSON `mapo-invoices.json`, flock.
 *
 * Ne définit que des fonctions → sûr à `require` partout.
 */

if (!function_exists('mi_path')) {

  function mi_path() { return __DIR__ . '/mapo-invoices.json'; }

  /** Enregistre une facture pour $uid. $data : label, montant, devise, moyen,
   *  transaction, type ('tier'|'credits'). Renvoie la facture (avec numéro). */
  function mi_record($uid, $data) {
    if ($uid === '') return null;
    $fp = fopen(mi_path(), 'c+'); if (!$fp) return null;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    // Numérotation séquentielle globale (utile pour les factures entreprise).
    $seq = 1; foreach ($map as $l) { $seq += is_array($l) ? count($l) : 0; }
    $num = 'MAPO-' . gmdate('Y') . '-' . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    $inv = array_merge(['id' => uniqid('inv_'), 'numero' => $num, 'date' => gmdate('c')], $data);
    $list = $map[$uid] ?? [];
    $list[] = $inv;
    $map[$uid] = $list;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
    return $inv;
  }

  /** Liste des factures d'un uid, la plus récente d'abord. */
  function mi_list($uid) {
    $p = mi_path();
    if ($uid === '' || !file_exists($p)) return [];
    $map = json_decode(@file_get_contents($p), true);
    if (!is_array($map)) return [];
    $l = $map[$uid] ?? [];
    return array_reverse(array_values($l));
  }
}
