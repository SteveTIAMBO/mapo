<?php
/**
 * MAPO+ — Registre des crédits B2C (par utilisateur), source de vérité SERVEUR.
 *
 * Fichier JSON `mapo-credits.json`, clé = uid Firebase :
 *   { uid: { offreId, credits, renewAt(ISO) } }
 *
 * Un utilisateur ne peut PAS s'attribuer une offre payante : seule la remise
 * après paiement Tranzak confirmé (mc_grant, appelée par mapo-pay-tranzak.php)
 * change l'offre. À la 1re utilisation, on crée l'offre gratuite. Le décompte
 * (mc_consume) se fait à la source dans mapo-ia.php.
 *
 * Ne définit que des fonctions → sûr à `require` partout. Dépend de
 * mapo-offres-data.php (source des quotas).
 */

require_once __DIR__ . '/mapo-offres-data.php';

if (!function_exists('mc_path')) {

  function mc_path() { return __DIR__ . '/mapo-credits.json'; }

  function mc_loadAll() {
    $p = mc_path();
    if (!file_exists($p)) return [];
    $j = json_decode(@file_get_contents($p), true);
    return is_array($j) ? $j : [];
  }

  /** Lecture-modif-écriture verrouillée d'une entrée ; $fn reçoit l'entrée, renvoie la nouvelle. */
  function mc_mutate($uid, $fn) {
    $fp = fopen(mc_path(), 'c+');
    if (!$fp) return null;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    $entry = $map[$uid] ?? null;
    $entry = mc_normalize($entry);           // crée le gratuit / applique l'expiration
    $entry = $fn($entry);
    $map[$uid] = $entry;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
    return $entry;
  }

  // Deux horloges : le PALIER est mensuel (tierExpiry, via Tranzak), la JAUGE de
  // tokens se recharge chaque LUNDI (semaine ISO). weekId = année+semaine ISO.
  function mc_week() { return gmdate('oW'); }
  function mc_weeklyCap($offreId) { $o = mapo_offre($offreId); return (int) $o['capTokens']; }

  /** Entrée « fraîche » pour un palier : jauge pleine, semaine courante. Le
   *  solde `bonus` (crédits PAYG achetés) est CONSERVÉ à travers les recharges. */
  function mc_fresh($offreId, $tierExpiry, $bonus = 0) {
    return ['offreId' => $offreId, 'tokens' => mc_weeklyCap($offreId), 'weekId' => mc_week(), 'tierExpiry' => $tierExpiry, 'bonus' => (int) $bonus];
  }
  function mc_free($bonus = 0) { return mc_fresh('decouverte', '', $bonus); } // le gratuit n'expire pas

  /**
   * Applique les deux règles : (1) palier mensuel échu → retour au gratuit ;
   * (2) nouvelle semaine ISO → recharge de la jauge au plafond du palier.
   * Le solde `bonus` (crédits achetés) est toujours préservé.
   */
  function mc_normalize($entry) {
    $bonus = is_array($entry) ? (int) ($entry['bonus'] ?? 0) : 0;
    if (!is_array($entry) || empty($entry['offreId']) || !isset($entry['tokens'])) return mc_free($bonus);
    $offre = $entry['offreId'];
    $exp = $entry['tierExpiry'] ?? '';
    // 1) Palier payant expiré (fin du mois payé, pas de reconduction) → gratuit.
    if ($exp !== '' && strtotime($exp) < time()) return mc_free($bonus);
    // 2) Recharge hebdomadaire : si on a changé de semaine ISO, jauge au plafond.
    if (($entry['weekId'] ?? '') !== mc_week()) return mc_fresh($offre, $exp, $bonus);
    // Sinon : on borne au plafond courant (au cas où il aurait baissé).
    return ['offreId' => $offre, 'tokens' => min((int) $entry['tokens'], mc_weeklyCap($offre)), 'weekId' => $entry['weekId'], 'tierExpiry' => $exp, 'bonus' => $bonus];
  }

  /** État courant (crée le gratuit si absent) : {offreId, tokens, cap, renewAt, weekId}. */
  function mc_state($uid) {
    return mc_mutate($uid, function ($e) { return $e; });
  }

  /** Reste-t-il au moins $cost tokens ? (jauge hebdo + solde bonus, sans décompter) */
  function mc_hasTokens($uid, $cost) {
    $e = mc_state($uid);
    return $e && ((int) $e['tokens'] + (int) ($e['bonus'] ?? 0)) >= (int) $cost;
  }

  /** Décompte $cost tokens : d'abord la jauge hebdo, puis le solde bonus.
   *  Renvoie le total restant (hebdo + bonus), ou false si insuffisant. */
  function mc_consume($uid, $cost) {
    $out = null;
    mc_mutate($uid, function ($e) use ($cost, &$out) {
      $tok = (int) $e['tokens']; $bon = (int) ($e['bonus'] ?? 0);
      if ($tok + $bon < (int) $cost) { $out = false; return $e; }
      $fromWeekly = min($tok, (int) $cost);
      $e['tokens'] = $tok - $fromWeekly;
      $e['bonus'] = $bon - ((int) $cost - $fromWeekly);
      $out = (int) $e['tokens']; // renvoie la jauge HEBDO restante (pour l'affichage)
      return $e;
    });
    return $out;
  }

  /** Accorde une offre (APRÈS paiement confirmé) : palier valable 1 mois, jauge
   *  pleine. Le solde bonus déjà acheté est conservé. */
  function mc_grant($uid, $offreId) {
    $o = mapo_offre($offreId);
    $exp = gmdate('c', time() + ((int) ($o['cycleJours'] ?? 30)) * 86400);
    return mc_mutate($uid, function ($e) use ($o, $exp) {
      return mc_fresh($o['id'], $exp, (int) ($e['bonus'] ?? 0));
    });
  }

  /** Ajoute des crédits au solde bonus (APRÈS paiement d'une recharge confirmé). */
  function mc_grantCredits($uid, $tokens) {
    $tokens = (int) $tokens;
    return mc_mutate($uid, function ($e) use ($tokens) {
      $e['bonus'] = (int) ($e['bonus'] ?? 0) + max(0, $tokens);
      return $e;
    });
  }

  // ── Paiements en attente : lie une transaction Tranzak à {uid, offre} ────
  // Écrit à l'`init` (par le serveur, avec l'uid du jeton) ; lu à la
  // confirmation `check`. C'est ce qui garantit qu'on n'accorde une offre
  // QU'APRÈS un vrai paiement, et pour le bon acheteur.
  function mc_pendingPath() { return __DIR__ . '/mapo-credits-pending.json'; }

  function mc_pendingSet($txid, $uid, $offreId, $kind = 'tier', $tokens = 0) {
    if ($txid === '' || $uid === '' || $offreId === '') return;
    $fp = fopen(mc_pendingPath(), 'c+'); if (!$fp) return;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    // Purge des entrées de plus de 24 h (paiements jamais aboutis).
    foreach ($map as $k => $v) { if (($v['at'] ?? 0) < time() - 86400) unset($map[$k]); }
    // $kind : 'tier' (offreId = palier) | 'credits' (offreId = pack, tokens = crédits).
    $map[$txid] = ['uid' => $uid, 'offreId' => $offreId, 'kind' => $kind, 'tokens' => (int) $tokens, 'at' => time()];
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
  }

  /** Lit ET retire l'entrée (consommée une seule fois). */
  function mc_pendingTake($txid) {
    $p = mc_pendingPath();
    if ($txid === '' || !file_exists($p)) return null;
    $fp = fopen($p, 'c+'); if (!$fp) return null;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    $e = $map[$txid] ?? null;
    if ($e) { unset($map[$txid]); ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map)); }
    flock($fp, LOCK_UN); fclose($fp);
    return $e;
  }
}
