<?php
/**
 * MAPO — Pont de liaison : LOGIQUE PURE (testable hors requête).
 *
 * Séparé de mapo-lien.php (qui gère jeton/réseau/Firestore) pour que le cœur
 * sensible — l'ENCODAGE/DÉCODAGE Firestore et surtout le TRANCHAGE (ne renvoyer
 * QUE la tranche de l'élève lié) — soit couvert par des tests déterministes.
 * Cf. server/tests/mapo-lien-test.php. Aucune dépendance réseau ici.
 */

// ── Valeurs « typées » Firestore REST ↔ PHP ──────────────────────────────
function fsEncodeValue($v) {
  if (is_bool($v)) return ['booleanValue' => $v];
  if (is_int($v)) return ['integerValue' => (string)$v];
  if (is_float($v)) return ['doubleValue' => $v];
  if (is_null($v)) return ['nullValue' => null];
  if (is_array($v)) {
    $isList = array_keys($v) === range(0, count($v) - 1);
    if ($isList) return ['arrayValue' => ['values' => array_map('fsEncodeValue', $v)]];
    return ['mapValue' => ['fields' => fsEncodeFields($v)]];
  }
  return ['stringValue' => (string)$v];
}
function fsEncodeFields($assoc) {
  $out = [];
  foreach ($assoc as $k => $v) $out[$k] = fsEncodeValue($v);
  return $out;
}
function fsDecodeValue($v) {
  if (!is_array($v)) return null;
  if (array_key_exists('nullValue', $v)) return null;
  if (isset($v['stringValue'])) return $v['stringValue'];
  if (isset($v['booleanValue'])) return (bool)$v['booleanValue'];
  if (isset($v['integerValue'])) return (int)$v['integerValue'];
  if (isset($v['doubleValue'])) return (float)$v['doubleValue'];
  if (isset($v['timestampValue'])) return $v['timestampValue'];
  if (isset($v['referenceValue'])) return $v['referenceValue'];
  if (isset($v['mapValue'])) return fsDecodeFields($v['mapValue']['fields'] ?? []);
  if (isset($v['arrayValue'])) {
    $vals = $v['arrayValue']['values'] ?? [];
    return array_map('fsDecodeValue', is_array($vals) ? $vals : []);
  }
  return null;
}
function fsDecodeFields($fields) {
  $out = [];
  if (is_array($fields)) foreach ($fields as $k => $v) $out[$k] = fsDecodeValue($v);
  return $out;
}

// ── Tranchage : ne renvoyer QUE la tranche de l'élève lié ─────────────────
/**
 * Devoirs de LA classe de l'élève + SON seul rendu. `$className`/`$classId` sont
 * ceux (courants) de l'élève ; `$eleveId` sert à ne piocher QUE sa soumission.
 */
function sliceDevoirs($all, $subs, $className, $classId, $eleveId) {
  $out = [];
  if (!is_array($all)) return $out;
  if (!is_array($subs)) $subs = [];
  foreach ($all as $d) {
    if (!is_array($d)) continue;
    $dClass = (string)($d['className'] ?? '');
    $dClassId = (string)($d['classId'] ?? '');
    // Sa classe uniquement (par nom OU par id de classe).
    if (!(($dClass !== '' && $dClass === $className) || ($dClassId !== '' && $classId !== '' && $dClassId === $classId))) continue;
    $did = (string)($d['id'] ?? '');
    $sub = ($did !== '' && isset($subs[$did . '_' . $eleveId]) && is_array($subs[$did . '_' . $eleveId])) ? $subs[$did . '_' . $eleveId] : null;
    $out[] = [
      'id' => $did,
      'title' => (string)($d['title'] ?? ''),
      'description' => (string)($d['description'] ?? ''),
      'subjectName' => (string)($d['subjectName'] ?? ''),
      'type' => (string)($d['type'] ?? ''),
      'isDigital' => !empty($d['isDigital']),
      'dueDate' => (string)($d['dueDate'] ?? ''),
      'createdAt' => (string)($d['createdAt'] ?? ''),
      // JAMAIS le rendu d'un autre élève.
      'submission' => $sub ? [
        'submittedAt' => (string)($sub['submittedAt'] ?? ''),
        'grade' => isset($sub['grade']) ? $sub['grade'] : null,
        'feedback' => (string)($sub['feedback'] ?? ''),
        'gradedAt' => (string)($sub['gradedAt'] ?? ''),
      ] : null,
    ];
  }
  return $out;
}
/**
 * Cours/ressources de SA classe (ou publiés pour toutes). On NE renvoie JAMAIS le
 * corrigé ni le binaire du fichier ; on n'expose que le texte + des métadonnées.
 */
function sliceCours($items, $className) {
  $out = [];
  if (!is_array($items)) return $out;
  foreach ($items as $c) {
    if (!is_array($c)) continue;
    $type = (string)($c['type'] ?? 'cours');
    if ($type !== 'cours' && $type !== 'ressource') continue;
    $cl = (string)($c['classe'] ?? '');
    if ($cl !== '' && $cl !== $className) continue;
    $out[] = [
      'id' => (string)($c['id'] ?? ''),
      'matiere' => (string)($c['matiere'] ?? ''),
      'titre' => (string)($c['titre'] ?? ''),
      'contenu' => (string)($c['contenu'] ?? ''),
      'type' => $type,
      'auteur' => (string)($c['auteur'] ?? ''),
      'fileName' => (string)($c['fileName'] ?? ''),
      'fileExt' => (string)($c['fileExt'] ?? ''),
      'hasFile' => !empty($c['fileId']) || !empty($c['fileData']) || !empty($c['url']),
    ];
  }
  return $out;
}
