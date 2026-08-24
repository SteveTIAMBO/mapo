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
  function mc_fresh($offreId, $tierExpiry, $bonus = 0, $plafond = 0) {
    return [
      'offreId' => $offreId, 'tokens' => mc_weeklyCap($offreId), 'weekId' => mc_week(),
      'tierExpiry' => $tierExpiry, 'bonus' => (int) $bonus,
      // Consommation de la semaine. Pour un ENFANT, c'est la SEULE chose qu'on
      // compte sur son entrée : il n'a pas de quota a lui, il depense celui de
      // sa famille. Ce compteur sert au suivi du parent et au plafond.
      'conso' => 0,
      // Plafond hebdomadaire fixe par le parent (0 = aucun). C'est un REGLAGE,
      // pas un solde : il survit a la recharge du lundi.
      'plafond' => (int) $plafond,
    ];
  }
  function mc_free($bonus = 0, $plafond = 0) { return mc_fresh('decouverte', '', $bonus, $plafond); } // le gratuit n'expire pas

  /**
   * Applique les deux règles : (1) palier mensuel échu → retour au gratuit ;
   * (2) nouvelle semaine ISO → recharge de la jauge au plafond du palier.
   * Le solde `bonus` (crédits achetés) est toujours préservé.
   */
  function mc_normalize($entry) {
    $bonus = is_array($entry) ? (int) ($entry['bonus'] ?? 0) : 0;
    // Le plafond est un RÉGLAGE du parent : il traverse les recharges et les
    // changements d'offre. Le compteur de consommation, lui, se remet à zéro
    // chaque semaine, comme la jauge.
    $plafond = is_array($entry) ? (int) ($entry['plafond'] ?? 0) : 0;
    if (!is_array($entry) || empty($entry['offreId']) || !isset($entry['tokens'])) return mc_free($bonus, $plafond);
    $offre = $entry['offreId'];
    $exp = $entry['tierExpiry'] ?? '';
    // 1) Palier payant expiré (fin du mois payé, pas de reconduction) → gratuit.
    if ($exp !== '' && strtotime($exp) < time()) return mc_free($bonus, $plafond);
    // 2) Recharge hebdomadaire : si on a changé de semaine ISO, jauge au plafond
    //    et compteur de consommation remis à zéro.
    if (($entry['weekId'] ?? '') !== mc_week()) return mc_fresh($offre, $exp, $bonus, $plafond);
    // Sinon : on borne au plafond courant (au cas où il aurait baissé).
    return [
      'offreId' => $offre, 'tokens' => min((int) $entry['tokens'], mc_weeklyCap($offre)),
      'weekId' => $entry['weekId'], 'tierExpiry' => $exp, 'bonus' => $bonus,
      'conso' => (int) ($entry['conso'] ?? 0), 'plafond' => $plafond,
    ];
  }

  /** État courant (crée le gratuit si absent) : {offreId, tokens, cap, renewAt, weekId}. */
  function mc_state($uid) {
    return mc_mutate($uid, function ($e) { return $e; });
  }

  /**
   * Peut-on payer $cost ?
   *
   * ⭐ UN MINEUR N'A PAS DE JAUGE À LUI. Il dépense celle de sa FAMILLE : le
   * quota hebdomadaire du parent d'abord, puis les crédits offerts ou achetés.
   * Lui donner un quota gratuit personnel revenait à multiplier le gratuit par
   * le nombre d'enfants DÉCLARÉS — une générosité indexée sur une donnée que
   * l'utilisateur saisit lui-même, donc sans limite.
   *
   * Seule contrainte propre à l'enfant : le PLAFOND hebdomadaire que son parent
   * lui fixe (0 = aucun).
   */
  function mc_hasTokens($uid, $cost, $uidFamille = '') {
    $e = mc_state($uid);
    if (!$e) return false;
    $cost = (int) $cost;
    $estEnfant = ($uidFamille !== '' && $uidFamille !== $uid);
    if (!$estEnfant) {
      return ((int) $e['tokens'] + (int) ($e['bonus'] ?? 0)) >= $cost;
    }
    // Plafond de rationnement : vérifié AVANT le solde, parce qu'il se dépasse
    // en premier et que le message à afficher n'est pas le même.
    $plafond = (int) ($e['plafond'] ?? 0);
    if ($plafond > 0 && ((int) ($e['conso'] ?? 0) + $cost) > $plafond) return false;
    $f = mc_state($uidFamille);
    return $f && ((int) $f['tokens'] + (int) ($f['bonus'] ?? 0)) >= $cost;
  }

  /** L'enfant a-t-il atteint le plafond fixé par son parent ? (pour le message) */
  function mc_plafondAtteint($uid, $cost) {
    $e = mc_state($uid);
    $plafond = (int) ($e['plafond'] ?? 0);
    return $plafond > 0 && ((int) ($e['conso'] ?? 0) + (int) $cost) > $plafond;
  }

  /** Le parent fixe (ou lève, avec 0) le plafond hebdomadaire d'un enfant. */
  function mc_setPlafond($uidEnfant, $plafond) {
    return mc_mutate($uidEnfant, function ($e) use ($plafond) {
      $e['plafond'] = max(0, (int) $plafond);
      return $e;
    });
  }

  /**
   * Décompte $cost.
   *
   * ENFANT : rien n'est pris sur son entrée — il n'a pas de jauge. Tout part du
   * compte de la FAMILLE (quota hebdomadaire du parent, puis crédits offerts ou
   * achetés). On enregistre seulement sa CONSOMMATION, pour le suivi du parent
   * et pour le plafond.
   *
   * ADULTE : quota hebdomadaire puis crédits, comme avant.
   *
   * Renvoie le solde hebdomadaire restant de celui qui paie, ou false.
   */
  function mc_consumeEnfant($uidEnfant, $cost, $uidFamille) {
    $cost = (int) $cost;
    // On paie d'abord, on comptabilise ensuite : si le paiement échoue, la
    // consommation de l'enfant ne doit pas être gonflée pour rien.
    $restant = mc_consume($uidFamille, $cost);
    if ($restant === false) return false;
    mc_mutate($uidEnfant, function ($e) use ($cost) {
      $e['conso'] = (int) ($e['conso'] ?? 0) + $cost;
      return $e;
    });
    return $restant;
  }

  function mc_consume($uid, $cost, $uidFamille = '') {
    // Un enfant ne dépense jamais sur sa propre entrée : on redirige.
    if ($uidFamille !== '' && $uidFamille !== $uid) return mc_consumeEnfant($uid, $cost, $uidFamille);
    $out = null;
    // ⚠️ Aucun appel à mc_state/mc_mutate DANS ce callback : `mc_mutate` tient
    // un flock exclusif sur mapo-credits.json pendant toute son exécution, et
    // sous Linux le verrou est attaché à l'OUVERTURE, pas au processus. Un
    // second verrou sur le même fichier attendrait le premier, qui attend la
    // fin du callback : la requête se bloque jusqu'au délai serveur. C'est ce
    // qui faisait « tourner l'IA dans le vide » le 09/08.
    mc_mutate($uid, function ($e) use ($cost, &$out) {
      $tok = (int) $e['tokens']; $bon = (int) ($e['bonus'] ?? 0);
      if ($tok + $bon < (int) $cost) { $out = false; return $e; }
      $surHebdo = min($tok, (int) $cost);
      $e['tokens'] = $tok - $surHebdo;
      $e['bonus'] = $bon - ((int) $cost - $surHebdo);
      $out = (int) $e['tokens']; // jauge HEBDO restante (pour l'affichage)
      return $e;
    });
    return $out;
  }

  /** Accorde une offre (APRÈS paiement confirmé) : palier valable 1 mois par
   *  défaut, jauge pleine. Le solde bonus déjà acheté est conservé.
   *
   *  `$jours` permet une durée différente du cycle de l'offre — c'est le cas de
   *  la bienvenue scolaire (Premium 3 mois offert par l'école, cf. mapo-lien.php).
   *  Aucune mécanique de retour au gratuit n'est nécessaire : `mc_state()` voit
   *  `tierExpiry` dépassée et rend `mc_free()`, donc l'offre Découverte. */
  function mc_grant($uid, $offreId, $jours = 0) {
    $o = mapo_offre($offreId);
    $j = (int) $jours > 0 ? (int) $jours : (int) ($o['cycleJours'] ?? 30);
    $exp = gmdate('c', time() + $j * 86400);
    return mc_mutate($uid, function ($e) use ($o, $exp) {
      return mc_fresh($o['id'], $exp, (int) ($e['bonus'] ?? 0));
    });
  }

  /**
   * Bienvenue scolaire : Premium offert, sans jamais RÉTROGRADER quelqu'un.
   *
   * ⚠️ Le piège que ça évite : une famille qui a PAYÉ Premium au mois, puis
   * reçoit l'invitation de son école, verrait son échéance remplacée par celle
   * de l'offre — et perdrait des jours qu'elle a payés. Pire dans l'autre sens :
   * un appel répété (double clic, relance de l'école) repousserait l'échéance
   * indéfiniment. On n'accorde donc QUE si la nouvelle échéance est plus
   * lointaine que l'actuelle, et on le DIT à l'appelant.
   *
   * Renvoie [accorde(bool), tierExpiry(string)].
   */
  function mc_bienvenueEcole($uid, $offreId, $jours) {
    $cible = time() + max(1, (int) $jours) * 86400;
    $st = mc_state($uid);
    $exp = (string) ($st['tierExpiry'] ?? '');
    $actuelle = $exp !== '' ? strtotime($exp) : 0;
    if ($actuelle !== false && $actuelle >= $cible) return [false, $exp];
    $e = mc_grant($uid, $offreId, (int) $jours);
    // `mc_mutate` rend `null` si le registre n'a pas pu être ouvert. Répondre
    // « accordé » dans ce cas ferait croire à un Premium qui n'existe pas.
    if (!is_array($e)) return [false, $exp];
    return [true, (string) ($e['tierExpiry'] ?? '')];
  }

  /** Ajoute des crédits au solde bonus (APRÈS paiement d'une recharge confirmé). */
  function mc_grantCredits($uid, $tokens) {
    $tokens = (int) $tokens;
    return mc_mutate($uid, function ($e) use ($tokens) {
      $e['bonus'] = (int) ($e['bonus'] ?? 0) + max(0, $tokens);
      return $e;
    });
  }

  // ── Solde de FAMILLE ────────────────────────────────────────────────────
  //
  // La jauge hebdomadaire GRATUITE reste PROPRE À CHAQUE COMPTE : un enfant
  // garde son quota, et une fratrie de trois n'est pas ramenée au quota d'un
  // seul. Ce serait une régression du gratuit, pas une amélioration.
  //
  // Les crédits ACHETÉS ou OFFERTS (`bonus`), eux, appartiennent à la FAMILLE :
  // c'est le parent qui paie, et c'est ce qui rend vraie la promesse « le parent
  // recharge, l'enfant en profite tout de suite ». Sans ça, un code saisi par le
  // parent n'aurait aucun effet pour son enfant, qui a son propre compteur.
  //
  // D'où l'ordre de dépense : jauge hebdo PERSONNELLE, puis bonus de la FAMILLE.

  /** Crédits offerts/achetés dont dispose cet apprenant. Pour un enfant, ce
   *  sont ceux de sa FAMILLE : il n'a pas de solde à lui. */
  function mc_bonusFamille($uid, $uidFamille) {
    if ($uidFamille === '' || $uidFamille === $uid) return (int) (mc_state($uid)['bonus'] ?? 0);
    return (int) (mc_state($uidFamille)['bonus'] ?? 0);
  }


  // ── Codes de crédits (offerts par EDUFREM) ──────────────────────────────
  //
  // Un code porte un nombre de crédits et un nombre d'utilisations. Il sert aux
  // écoles pilotes, aux familles témoins et aux tests, sans passer par un
  // paiement. Fichier local, comme les autres registres serveur : pas d'IAM, pas
  // de dépendance, et ça marche même si Firestore est indisponible.
  function mc_codesPath() { return __DIR__ . '/mapo-credits-codes.json'; }
  function mc_codesLoad() {
    $p = mc_codesPath();
    if (!file_exists($p)) return [];
    $j = json_decode(@file_get_contents($p), true);
    return is_array($j) ? $j : [];
  }

  /** Code lisible : pas de 0/O ni 1/I/L, qu'on se dicte au téléphone sans erreur. */
  function mc_codeGenerer($longueur = 12) {
    $alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $out = '';
    for ($i = 0; $i < $longueur; $i++) $out .= $alpha[random_int(0, strlen($alpha) - 1)];
    // 12 caractères et non 10 : le registre ne stocke plus que des empreintes,
    // et une empreinte se casse par force brute. 31^12 ≈ 8·10^17 met l'attaque
    // hors de portée, pour deux caractères de plus à saisir.
    return substr($out, 0, 4) . '-' . substr($out, 4, 4) . '-' . substr($out, 8);
  }

  /**
   * Empreinte d'un code — c'est ELLE qu'on stocke, jamais le code lui-même.
   *
   * INCIDENT DU 16/08 : le registre `mapo-credits-codes.json` a été lisible
   * depuis le web (règle .htaccess perdue à un déploiement). Les codes y
   * étaient en clair : quiconque a ouvert l'URL repartait avec des crédits.
   *
   * Un code est un jeton au porteur, exactement comme un mot de passe. On le
   * traite donc comme tel : le serveur n'a pas besoin de le connaître, juste
   * de reconnaître celui qu'on lui présente. Une prochaine fuite du fichier
   * ne livrera plus rien d'utilisable — c'est précisément ce qui a sauvé les
   * jetons Carré, chiffrés dans leur propre registre.
   *
   * EFFET IMMÉDIAT VOULU : la recherche se faisant désormais sur l'empreinte,
   * les anciennes entrées en clair ne correspondent plus à rien. Tous les
   * codes émis avant ce correctif sont donc RÉVOQUÉS, sans geste manuel et
   * sans oubli possible. Leurs entrées restent dans le fichier : elles ne
   * servent plus à rien d'autre qu'à conserver la trace de qui les a utilisés.
   */
  function mc_codeEmpreinte($code) {
    return hash('sha256', 'mapo-code:' . strtoupper(trim((string) $code)));
  }

  /** Crée un code. `$usages` = nombre de comptes qui pourront l'utiliser. */
  function mc_codeCreer($tokens, $usages, $note, $parUid) {
    $code = mc_codeGenerer();
    $fp = fopen(mc_codesPath(), 'c+'); if (!$fp) return null;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    // Clé = empreinte. Le code en clair ne quitte cette fonction que par sa
    // valeur de retour, affichée une seule fois à l'admin qui vient de le créer.
    $map[mc_codeEmpreinte($code)] = [
      'tokens' => max(1, (int) $tokens),
      'usages' => max(1, (int) $usages),
      'utilisePar' => [],                       // uid → date, pour l'audit
      'note' => mb_substr(trim((string) $note), 0, 120),
      'parUid' => $parUid,
      'creeLe' => gmdate('c'),
    ];
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map, JSON_UNESCAPED_UNICODE));
    flock($fp, LOCK_UN); fclose($fp);
    return $code;
  }

  /**
   * Utilise un code au profit de $uid. Renvoie [okBool, raisonOuTokens].
   *
   * Tout se fait sous un VERROU EXCLUSIF, lecture et écriture comprises : deux
   * requêtes simultanées avec le même code doivent se départager, sinon un code
   * à usage unique se dépense deux fois.
   */
  function mc_codeUtiliser($code, $uid) {
    $code = strtoupper(trim($code));
    if ($code === '') return [false, 'code_vide'];
    $fp = fopen(mc_codesPath(), 'c+'); if (!$fp) return [false, 'indisponible'];
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    // Recherche par EMPREINTE. Les entrées en clair d'avant le 16/08 ne
    // correspondent plus : les codes émis avant l'incident sont révoqués.
    $cle = mc_codeEmpreinte($code);
    $e = $map[$cle] ?? null;
    $res = null;
    if (!$e) { $res = [false, 'code_inconnu']; }
    elseif (isset($e['utilisePar'][$uid])) { $res = [false, 'deja_utilise']; }
    elseif (count($e['utilisePar']) >= (int) $e['usages']) { $res = [false, 'code_epuise']; }
    else {
      $e['utilisePar'][$uid] = gmdate('c');
      $map[$cle] = $e;
      ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map, JSON_UNESCAPED_UNICODE));
      $res = [true, (int) $e['tokens']];
    }
    flock($fp, LOCK_UN); fclose($fp);
    // Le crédit est accordé APRÈS la libération du verrou : mc_grantCredits
    // ouvre son propre verrou sur un AUTRE fichier, et imbriquer deux verrous
    // dans un ordre différent ailleurs finirait par bloquer les deux.
    if ($res[0]) mc_grantCredits($uid, $res[1]);
    return $res;
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
