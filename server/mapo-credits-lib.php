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

  /** Entrée par défaut (offre gratuite) + expiration → retour au gratuit. */
  function mc_normalize($entry) {
    $free = mapo_offre('decouverte');
    if (!is_array($entry) || empty($entry['offreId'])) {
      return ['offreId' => 'decouverte', 'credits' => (int) $free['credits'], 'renewAt' => mc_renewAt($free['dureeJours'])];
    }
    // Cycle échu : Tranzak n'a pas de reconduction → on retombe sur le gratuit.
    if (!empty($entry['renewAt']) && strtotime($entry['renewAt']) < time()) {
      return ['offreId' => 'decouverte', 'credits' => (int) $free['credits'], 'renewAt' => mc_renewAt($free['dureeJours'])];
    }
    return $entry;
  }

  function mc_renewAt($jours) { return gmdate('c', time() + ((int) $jours) * 86400); }

  /** État courant de l'utilisateur (crée le gratuit si absent). */
  function mc_state($uid) {
    return mc_mutate($uid, function ($e) { return $e; });
  }

  /** Reste-t-il au moins 1 crédit ? (sans décompter) */
  function mc_hasCredit($uid) {
    $e = mc_state($uid);
    return $e && (int) $e['credits'] > 0;
  }

  /** Décompte $n crédits. Renvoie le solde restant, ou false si insuffisant. */
  function mc_consume($uid, $n = 1) {
    $out = null;
    mc_mutate($uid, function ($e) use ($n, &$out) {
      if ((int) $e['credits'] < $n) { $out = false; return $e; }
      $e['credits'] = (int) $e['credits'] - $n;
      $out = (int) $e['credits'];
      return $e;
    });
    return $out;
  }

  /** Accorde une offre (APRÈS paiement confirmé). Recharge les crédits du palier. */
  function mc_grant($uid, $offreId) {
    $o = mapo_offre($offreId);
    return mc_mutate($uid, function () use ($o) {
      return ['offreId' => $o['id'], 'credits' => (int) $o['credits'], 'renewAt' => mc_renewAt($o['dureeJours'])];
    });
  }

  // ── Paiements en attente : lie une transaction Tranzak à {uid, offre} ────
  // Écrit à l'`init` (par le serveur, avec l'uid du jeton) ; lu à la
  // confirmation `check`. C'est ce qui garantit qu'on n'accorde une offre
  // QU'APRÈS un vrai paiement, et pour le bon acheteur.
  function mc_pendingPath() { return __DIR__ . '/mapo-credits-pending.json'; }

  function mc_pendingSet($txid, $uid, $offreId) {
    if ($txid === '' || $uid === '' || $offreId === '') return;
    $fp = fopen(mc_pendingPath(), 'c+'); if (!$fp) return;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    // Purge des entrées de plus de 24 h (paiements jamais aboutis).
    foreach ($map as $k => $v) { if (($v['at'] ?? 0) < time() - 86400) unset($map[$k]); }
    $map[$txid] = ['uid' => $uid, 'offreId' => $offreId, 'at' => time()];
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
