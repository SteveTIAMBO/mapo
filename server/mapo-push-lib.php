<?php
/**
 * MAPO+ — Fonctions de Web Push partagées par mapo-push.php (envoi de test à la
 * demande) et mapo-push-cron.php (rappel quotidien). ZÉRO dépendance : openssl
 * + hash uniquement. Voir RFC 8291 (aes128gcm) et RFC 8292 (VAPID).
 *
 * Aucun code au niveau global : ce fichier ne fait que DÉFINIR des fonctions,
 * il est sûr de le `require` depuis n'importe quel endpoint.
 */

if (!function_exists('mp_b64url')) {

  function mp_b64url($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
  function mp_b64url_dec($s) {
    $s = strtr($s, '-_', '+/');
    return base64_decode($s . str_repeat('=', (4 - strlen($s) % 4) % 4));
  }

  /** Point P-256 brut (65 o, non compressé) → clé publique PEM (SPKI). */
  function mp_p256RawToPem($raw65) {
    $der = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $raw65;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
  }

  /** Chiffre $payload pour l'abonné (clé publique 65 o + secret auth 16 o). RFC 8291. */
  function mp_encryptPush($payload, $uaPublic, $authSecret) {
    $asKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$asKey) throw new Exception('ec_keygen');
    $d = openssl_pkey_get_details($asKey);
    $asPublic = "\x04" . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);

    if (!function_exists('openssl_pkey_derive')) throw new Exception('openssl_pkey_derive_absent');
    $ecdh = openssl_pkey_derive(mp_p256RawToPem($uaPublic), $asKey, 32);
    if ($ecdh === false) throw new Exception('ecdh');

    $keyInfo = "WebPush: info\x00" . $uaPublic . $asPublic;
    $ikm = hash_hkdf('sha256', $ecdh, 32, $keyInfo, $authSecret);
    $salt = random_bytes(16);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

    $tag = '';
    $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($cipher === false) throw new Exception('aesgcm');

    return $salt . pack('N', 4096) . chr(strlen($asPublic)) . $asPublic . $cipher . $tag;
  }

  /** JWT VAPID signé ES256 (raw R||S) pour l'origine $aud. RFC 8292. */
  function mp_vapidJwt($aud, $subject, $privatePem) {
    $header = mp_b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $claims = mp_b64url(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => $subject]));
    $input = $header . '.' . $claims;
    $pk = openssl_pkey_get_private($privatePem);
    if (!$pk) throw new Exception('vapid_key');
    $der = '';
    if (!openssl_sign($input, $der, $pk, OPENSSL_ALGO_SHA256)) throw new Exception('vapid_sign');
    return $input . '.' . mp_b64url(mp_derToRawEcdsa($der));
  }

  /** Signature ECDSA DER → R||S brut de 64 octets. */
  function mp_derToRawEcdsa($der) {
    $off = 0;
    if (ord($der[$off++]) !== 0x30) throw new Exception('der_seq');
    $len = ord($der[$off++]);
    if ($len & 0x80) { $n = $len & 0x7f; while ($n--) $off++; }
    $readInt = function () use (&$off, $der) {
      if (ord($der[$off++]) !== 0x02) throw new Exception('der_int');
      $l = ord($der[$off++]);
      $v = substr($der, $off, $l); $off += $l;
      $v = ltrim($v, "\x00");
      return str_pad($v, 32, "\x00", STR_PAD_LEFT);
    };
    return $readInt() . $readInt();
  }

  // ── Registre des abonnements (fichier, pas de base de données) ──────────
  // Le rappel quotidien a besoin de la LISTE des abonnements côté serveur. Un
  // abonnement n'est pas un secret (URL de capability + clé publique), donc on
  // les range dans un simple fichier JSON — pas d'IAM, pas de dépendance, et ça
  // marche même en démo (sans compte). Clé = empreinte de l'endpoint (dédup).
  // NB : suffisant pour le volume de départ ; à migrer vers Firestore si ça grossit.
  function mp_subsPath() { return __DIR__ . '/mapo-push-subs.json'; }

  function mp_subsLoad() {
    $p = mp_subsPath();
    if (!file_exists($p)) return [];
    $j = json_decode(@file_get_contents($p), true);
    return is_array($j) ? $j : [];
  }

  /**
   * Ajoute/rafraîchit un abonnement (lecture-modif-écriture verrouillée).
   *
   * `$uid` est le compte Firebase de l'appelant, quand il est authentifié. Sans
   * lui le registre ne servait qu'aux envois EN MASSE (le rappel quotidien) :
   * impossible d'écrire à UNE personne précise, faute de savoir à qui appartient
   * un abonnement. C'est ce qui empêchait d'alerter un parent quand les crédits
   * de son enfant s'épuisent.
   */
  /**
   * Enregistre un abonnement push.
   *
   * `$textes` = les gabarits DÉJÀ TRADUITS dans la seconde langue du parent,
   * traduits par le NAVIGATEUR au moment où il choisit sa langue. Le serveur
   * ne traduit rien : il n'a ni accès au moteur de traduction, ni le droit de
   * faire attendre un envoi de notification le temps d'un appel d'IA. Il
   * recopie un texte préparé, c'est tout.
   *
   * Le français n'est jamais remplacé — il est CONCATÉNÉ avec la traduction
   * (voir mp_texteBilingue). Une notification est lue seule, hors de
   * l'application : si la traduction dit l'inverse du français, le parent doit
   * pouvoir s'en apercevoir sans ouvrir l'app.
   */
  function mp_subsAdd($sub, $uid = '', $textes = null) {
    $endpoint = $sub['endpoint'] ?? '';
    if ($endpoint === '') return false;
    $fp = fopen(mp_subsPath(), 'c+');
    if (!$fp) return false;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $map = json_decode($raw, true); if (!is_array($map)) $map = [];
    $cle = sha1($endpoint);
    // On ne PERD jamais un uid déjà connu : un appel non authentifié (rappel
    // quotidien anonyme) ne doit pas effacer le rattachement acquis plus tôt.
    $uidConnu = $uid !== '' ? $uid : ($map[$cle]['uid'] ?? '');
    $map[$cle] = [
      'endpoint' => $endpoint,
      'keys' => ['p256dh' => $sub['keys']['p256dh'] ?? '', 'auth' => $sub['keys']['auth'] ?? ''],
      'uid' => $uidConnu,
      // Comme pour l'uid : un appel qui ne fournit pas de traductions ne doit
      // pas effacer celles déjà enregistrées.
      'textes' => is_array($textes) ? $textes : ($map[$cle]['textes'] ?? null),
      'at' => date('c'),
    ];
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
    return true;
  }

  /** Retire un abonnement par son endpoint (désactivation, ou abonnement mort). */
  function mp_subsRemove($endpoint) {
    $p = mp_subsPath();
    if (!file_exists($p)) return;
    $fp = fopen($p, 'c+'); if (!$fp) return;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    unset($map[sha1($endpoint)]);
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
  }

  /** Abonnements d'UN compte (un même parent peut avoir plusieurs appareils). */
  function mp_subsForUid($uid) {
    if ($uid === '') return [];
    $out = [];
    foreach (mp_subsLoad() as $s) {
      if (($s['uid'] ?? '') === $uid) $out[] = $s;
    }
    return $out;
  }

  // ── Rattachement enfant → parent (fichier) ─────────────────────────────
  // Écrit UNE FOIS, côté serveur, au moment où le parent crée les accès de son
  // enfant (mapo-famille.php connaît alors les deux comptes). Relu ensuite à
  // chaque alerte de crédits.
  //
  // POURQUOI un fichier plutôt qu'une lecture Firestore : l'alerte part depuis
  // `mapo-ia.php`, sur le chemin CHAUD d'une requête IA. Y ajouter un appel
  // Firestore avec le compte de service coûterait un aller-retour réseau à
  // chaque révision. Et surtout, ce lien ne doit JAMAIS venir du client : un
  // navigateur qui déclarerait « mon parent est X » permettrait d'arroser
  // n'importe quel compte de notifications.
  function mp_lienPath() { return __DIR__ . '/mapo-push-parents.json'; }
  function mp_lienLoad() {
    $p = mp_lienPath();
    if (!file_exists($p)) return [];
    $j = json_decode(@file_get_contents($p), true);
    return is_array($j) ? $j : [];
  }
  /** Enregistre « cet enfant dépend de ce parent ». Idempotent. */
  function mp_lienSet($enfantUid, $parentUid, $prenom = '') {
    if ($enfantUid === '' || $parentUid === '') return false;
    $fp = fopen(mp_lienPath(), 'c+'); if (!$fp) return false;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    $map[$enfantUid] = [
      'parentUid' => $parentUid,
      'prenom' => mb_substr(trim((string) $prenom), 0, 40),
      'at' => date('c'),
    ];
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
    return true;
  }
  /** Renvoie ['parentUid'=>…, 'prenom'=>…] ou null si l'enfant n'est pas rattaché. */
  function mp_lienGet($enfantUid) {
    $m = mp_lienLoad();
    return $m[$enfantUid] ?? null;
  }

  /**
   * Envoie une notification à TOUS les appareils d'un compte.
   * Renvoie le nombre d'envois acceptés. Les abonnements morts (404/410) sont
   * purgés au passage : sinon le registre se remplit d'appareils fantômes.
   */
  function mp_notifierUid($uid, $titre, $texte, $url, $vapidPub, $vapidPem, $vapidSubject) {
    $envoyes = 0;
    foreach (mp_subsForUid($uid) as $sub) {
      $payload = json_encode(['title' => $titre, 'body' => $texte, 'url' => $url], JSON_UNESCAPED_UNICODE);
      try {
        $code = mp_sendWebPush($sub, $payload, $vapidPub, $vapidPem, $vapidSubject);
      } catch (Throwable $e) { continue; }
      if ($code === 200 || $code === 201) $envoyes++;
      elseif ($code === 404 || $code === 410) mp_subsRemove($sub['endpoint'] ?? '');
    }
    return $envoyes;
  }

  // ── Anti-répétition des alertes (fichier) ──────────────────────────────
  // Les crédits sont vérifiés à CHAQUE requête IA : sans mémoire, franchir un
  // seuil enverrait une notification par question posée. On retient donc, par
  // compte et par type d'alerte, la période pour laquelle elle est déjà partie.
  // La période est l'identifiant de semaine des crédits : l'alerte redevient
  // donc possible d'elle-même à chaque recharge hebdomadaire.
  function mp_alertesPath() { return __DIR__ . '/mapo-push-alertes.json'; }
  function mp_alerteDejaEnvoyee($uid, $type, $periode) {
    $p = mp_alertesPath();
    if (!file_exists($p)) return false;
    $m = json_decode(@file_get_contents($p), true);
    return is_array($m) && ($m[$uid][$type] ?? '') === $periode;
  }
  function mp_marquerAlerte($uid, $type, $periode) {
    $fp = fopen(mp_alertesPath(), 'c+'); if (!$fp) return;
    flock($fp, LOCK_EX);
    $m = json_decode(stream_get_contents($fp), true); if (!is_array($m)) $m = [];
    if (!isset($m[$uid]) || !is_array($m[$uid])) $m[$uid] = [];
    $m[$uid][$type] = $periode;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($m));
    flock($fp, LOCK_UN); fclose($fp);
  }

  // ── Registre des relances WhatsApp (fichier) ───────────────────────────
  // Une entrée par enfant suivi : { phone, childName, optIn, lastRevision(jour
  // AAAA-MM-JJ), lastSentAt(timestamp) }. Le parent pose phone+optIn ; l'appli
  // rafraîchit lastRevision ; le cron déclenche si l'enfant n'a pas révisé depuis
  // N jours. Clé = propriétaire|idEnfant (stable, connue du parent ET du compte
  // enfant). Payant (Twilio) → volontairement rare + opt-in.
  function mp_relancePath() { return __DIR__ . '/mapo-push-relance.json'; }
  function mp_relanceLoad() {
    $p = mp_relancePath();
    if (!file_exists($p)) return [];
    $j = json_decode(@file_get_contents($p), true);
    return is_array($j) ? $j : [];
  }
  /** Fusionne $fields dans l'entrée $key (lecture-modif-écriture verrouillée). */
  function mp_relanceSet($key, $fields) {
    if ($key === '') return false;
    $fp = fopen(mp_relancePath(), 'c+'); if (!$fp) return false;
    flock($fp, LOCK_EX);
    $map = json_decode(stream_get_contents($fp), true); if (!is_array($map)) $map = [];
    $cur = $map[$key] ?? [];
    $map[$key] = array_merge($cur, $fields);
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($map));
    flock($fp, LOCK_UN); fclose($fp);
    return true;
  }

  /**
   * Envoie un push à UN abonnement. $sub = ['endpoint'=>, 'keys'=>['p256dh'=>, 'auth'=>]]
   * (clés en base64url, telles que stockées). Renvoie le code HTTP du service push
   * (201/200 = ok ; 404/410 = abonnement expiré à purger).
   */
  function mp_sendWebPush($sub, $payload, $vapidPublic, $vapidPem, $subject) {
    $endpoint = $sub['endpoint'] ?? '';
    $p256dh = mp_b64url_dec($sub['keys']['p256dh'] ?? '');
    $auth = mp_b64url_dec($sub['keys']['auth'] ?? '');
    if ($endpoint === '' || strlen($p256dh) !== 65 || strlen($auth) < 16) return 0;

    $enc = mp_encryptPush($payload, $p256dh, $auth);
    $u = parse_url($endpoint);
    $jwt = mp_vapidJwt($u['scheme'] . '://' . $u['host'], $subject, $vapidPem);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => [
        'Authorization: vapid t=' . $jwt . ', k=' . $vapidPublic,
        'Content-Encoding: aes128gcm',
        'Content-Type: application/octet-stream',
        'TTL: 86400',
      ],
      CURLOPT_POSTFIELDS => $enc,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 12,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code;
  }
}

/**
 * Texte bilingue d'une notification : français, puis traduction sous un
 * séparateur. Jamais la traduction seule.
 *
 * @param array|null $textes  gabarits traduits enregistrés avec l'abonnement
 * @param string     $cle      identifiant du gabarit ('rappel', 'alerte'…)
 * @param string     $fr       texte français, qui fait toujours foi
 */
function mp_texteBilingue($textes, $cle, $fr) {
  $trad = is_array($textes) && !empty($textes[$cle]) ? trim((string) $textes[$cle]) : '';
  if ($trad === '' || $trad === $fr) return $fr;
  return $fr . ' · ' . $trad;
}
