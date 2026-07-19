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

  /** Ajoute/rafraîchit un abonnement (lecture-modif-écriture verrouillée). */
  function mp_subsAdd($sub) {
    $endpoint = $sub['endpoint'] ?? '';
    if ($endpoint === '') return false;
    $fp = fopen(mp_subsPath(), 'c+');
    if (!$fp) return false;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $map = json_decode($raw, true); if (!is_array($map)) $map = [];
    $map[sha1($endpoint)] = [
      'endpoint' => $endpoint,
      'keys' => ['p256dh' => $sub['keys']['p256dh'] ?? '', 'auth' => $sub['keys']['auth'] ?? ''],
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
