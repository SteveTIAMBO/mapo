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

// ══════════════════════════════════════════════════════════════════════
//  BULLETINS — calcul PUR (miroir fidèle de src/stores/notes.js)
//  Ne renvoie JAMAIS que la tranche de l'élève lié : le rang et la moyenne
//  de classe sont calculés à partir de TOUS les camarades mais SEUL le nombre
//  agrégé sort (jamais la note d'un autre élève).
// ══════════════════════════════════════════════════════════════════════

// Séquence → trimestre parent ; trimestre → ses séquences (notes.js:15-28).
function bl_trimOfSeq($s) { $m = ['S1'=>'T1','S2'=>'T1','S3'=>'T2','S4'=>'T2','S5'=>'T3','S6'=>'T3']; return $m[$s] ?? ''; }
function bl_seqsOfTrim($t) { $m = ['T1'=>['S1','S2'],'T2'=>['S3','S4'],'T3'=>['S5','S6']]; return $m[$t] ?? []; }
function bl_trims() { return ['T1','T2','T3']; }

// Arrondi 2 décimales, comme Math.round(x*100)/100 (chaque niveau arrondit).
function bl_round($x) { if ($x === null || !is_numeric($x)) return null; return round(((float)$x) * 100) / 100; }

// Note brute d'une séquence pour un élève (null si absente).
function bl_seqNote($notes, $classId, $subject, $seq, $eleveId) {
  $k = $classId . '_' . $subject . '_' . $seq;
  if (!isset($notes[$k]) || !is_array($notes[$k])) return null;
  $v = $notes[$k][$eleveId] ?? null;
  return ($v === null || $v === '' || !is_numeric($v)) ? null : (float)$v;
}
// Une séquence a-t-elle au moins une note pour cet élève (toutes matières) ?
function bl_seqHasNote($notes, $classId, $seq, $eleveId, $subjects) {
  foreach ($subjects as $sub) { if (bl_seqNote($notes, $classId, $sub['name'], $seq, $eleveId) !== null) return true; }
  return false;
}
// Moyenne matière × trimestre = moyenne des séquences présentes, arrondie.
function bl_subjectTrimAvg($notes, $classId, $subject, $trim, $eleveId) {
  $vals = [];
  foreach (bl_seqsOfTrim($trim) as $s) { $n = bl_seqNote($notes, $classId, $subject, $s, $eleveId); if ($n !== null) $vals[] = $n; }
  if (!count($vals)) return null;
  return bl_round(array_sum($vals) / count($vals));
}
// Moyenne matière × année = moyenne des moyennes trimestrielles présentes.
function bl_subjectAnnualAvg($notes, $classId, $subject, $eleveId) {
  $vals = [];
  foreach (bl_trims() as $t) { $a = bl_subjectTrimAvg($notes, $classId, $subject, $t, $eleveId); if ($a !== null) $vals[] = $a; }
  if (!count($vals)) return null;
  return bl_round(array_sum($vals) / count($vals));
}
// Moyenne matière pour une période (Sx = note brute ; Tx = moy. trim ; annual).
function bl_subjectAvg($notes, $classId, $subject, $period, $eleveId) {
  if ($period === 'annual') return bl_subjectAnnualAvg($notes, $classId, $subject, $eleveId);
  if (count(bl_seqsOfTrim($period))) return bl_subjectTrimAvg($notes, $classId, $subject, $period, $eleveId);
  return bl_seqNote($notes, $classId, $subject, $period, $eleveId);
}
// Moyenne générale pondérée pour une période. $subjects = [['name'=>, 'coef'=>], …].
function bl_generalAvg($notes, $classId, $subjects, $period, $eleveId) {
  if ($period === 'annual') {
    $gs = [];
    foreach (bl_trims() as $t) { $g = bl_generalAvg($notes, $classId, $subjects, $t, $eleveId); if ($g !== null) $gs[] = $g; }
    if (!count($gs)) return null;
    return bl_round(array_sum($gs) / count($gs));
  }
  $sum = 0; $wsum = 0;
  foreach ($subjects as $sub) {
    $coef = (float)($sub['coef'] ?? 0); if ($coef <= 0) continue;
    $a = bl_subjectAvg($notes, $classId, $sub['name'], $period, $eleveId);
    if ($a === null) continue;
    $sum += $a * $coef; $wsum += $coef;
  }
  if ($wsum <= 0) return null;
  return bl_round($sum / $wsum);
}
// Rang (compétition standard : 1 + nb de camarades STRICTEMENT au-dessus) + effectif.
// Ne renvoie que 2 nombres — aucune note d'un autre élève ne sort.
function bl_rank($notes, $classId, $subjects, $period, $classmateIds, $eleveId) {
  $effectif = count($classmateIds);
  $mine = bl_generalAvg($notes, $classId, $subjects, $period, $eleveId);
  if ($mine === null) return [null, $effectif];
  $greater = 0;
  foreach ($classmateIds as $id) {
    if ($id === $eleveId) continue;
    $a = bl_generalAvg($notes, $classId, $subjects, $period, $id);
    if ($a !== null && $a > $mine) $greater++;
  }
  return [$greater + 1, $effectif];
}
// Moyenne de classe d'une matière (nombre agrégé seulement).
function bl_subjectClassAvg($notes, $classId, $subject, $period, $classmateIds) {
  $vals = [];
  foreach ($classmateIds as $id) { $a = bl_subjectAvg($notes, $classId, $subject, $period, $id); if ($a !== null) $vals[] = $a; }
  if (!count($vals)) return null;
  return bl_round(array_sum($vals) / count($vals));
}
// Appréciation (notes.js:30-38), mention (seuils configurables), décision (47-51).
function bl_appreciation($avg) {
  if ($avg === null) return '';
  if ($avg >= 16) return 'Excellent'; if ($avg >= 14) return 'Très bien'; if ($avg >= 12) return 'Bien';
  if ($avg >= 10) return 'Assez bien'; if ($avg >= 8) return 'Passable'; if ($avg >= 6) return 'Insuffisant';
  return 'Très insuffisant';
}
function bl_mention($avg, $th) {
  if ($avg === null) return '';
  if ($avg >= (float)($th['felicitations'] ?? 16)) return 'Félicitations';
  if ($avg >= (float)($th['tableau'] ?? 14)) return 'Tableau d\'honneur';
  if ($avg >= (float)($th['encouragement'] ?? 12)) return 'Encouragements';
  if ($avg >= 10) return 'Passable';
  return '';
}
function bl_decision($avg) {
  if ($avg === null) return '';
  if ($avg >= 10) return 'Admis(e) en classe supérieure';
  if ($avg >= 8.5) return 'Rachat / Redoublement';
  return 'Redoublement';
}
function bl_periodLabel($p) {
  $m = ['S1'=>'Séquence 1','S2'=>'Séquence 2','S3'=>'Séquence 3','S4'=>'Séquence 4','S5'=>'Séquence 5','S6'=>'Séquence 6',
        'T1'=>'1er Trimestre','T2'=>'2e Trimestre','T3'=>'3e Trimestre','annual'=>'Bilan annuel'];
  return $m[$p] ?? $p;
}
function bl_cycleOfLevel($level) {
  $l = strtolower((string)$level);
  return (strpos($l, '2nde') !== false || strpos($l, '1ere') !== false || strpos($l, '1re') !== false
    || strpos($l, 'tle') !== false || strpos($l, 'terminale') !== false) ? 'lycee' : 'college';
}
// Matières de la classe depuis config/subjects (cycle + coef>0). Repli : matières
// réellement notées (coef 1) si la config est absente.
function bl_subjectsForClass($subjectsConfig, $level, $notes, $classId) {
  $out = [];
  if (is_array($subjectsConfig)) {
    $cycle = bl_cycleOfLevel($level);
    foreach ($subjectsConfig as $s) {
      if (!is_array($s)) continue;
      $name = (string)($s['name'] ?? ''); if ($name === '') continue;
      $cycles = is_array($s['cycles'] ?? null) ? $s['cycles'] : [];
      if ($cycles && !in_array($cycle, $cycles, true)) continue;
      $coefs = is_array($s['coefficients'] ?? null) ? $s['coefficients'] : [];
      $coef = isset($coefs[$level]) ? (float)$coefs[$level] : 0;
      if ($coef <= 0) continue;
      $out[] = ['name' => $name, 'coef' => $coef];
    }
  }
  if (count($out)) return $out;
  // Repli : dériver du matriciel de notes (matières ayant au moins une clé pour la classe).
  $set = [];
  if (is_array($notes)) foreach ($notes as $k => $v) {
    if (strpos((string)$k, $classId . '_') !== 0) continue;
    $rest = substr((string)$k, strlen($classId) + 1);
    $pos = strrpos($rest, '_'); if ($pos === false) continue;
    $set[substr($rest, 0, $pos)] = true;
  }
  foreach (array_keys($set) as $name) $out[] = ['name' => $name, 'coef' => 1.0];
  return $out;
}
// Séquence signée pour l'élève ? (dirSignatures {classId_period_eleveId}).
function bl_signed($signatures, $classId, $period, $eleveId) {
  $k = $classId . '_' . $period . '_' . $eleveId;
  return isset($signatures[$k]) && is_array($signatures[$k]) && !empty($signatures[$k]['signed']);
}
// Périodes DISPONIBLES (bulletin officiel) : séquence si son trimestre parent est
// signé ET a des notes ; trimestre/annuel si signé. Miroir de ParentNotesView 280-302.
function bl_availablePeriodes($signatures, $notes, $classId, $eleveId, $subjects) {
  $out = [];
  foreach (['S1','S2','S3','S4','S5','S6'] as $s) {
    if (bl_signed($signatures, $classId, bl_trimOfSeq($s), $eleveId) && bl_seqHasNote($notes, $classId, $s, $eleveId, $subjects))
      $out[] = ['id' => $s, 'label' => bl_periodLabel($s)];
  }
  foreach (['T1','T2','T3'] as $t) { if (bl_signed($signatures, $classId, $t, $eleveId)) $out[] = ['id' => $t, 'label' => bl_periodLabel($t)]; }
  if (bl_signed($signatures, $classId, 'annual', $eleveId)) $out[] = ['id' => 'annual', 'label' => bl_periodLabel('annual')];
  return $out;
}
// Colonnes de séquences d'un bulletin (pour l'affichage + le PDF).
function bl_periodColumns($period) {
  if ($period === 'annual') return [['value'=>'T1','shortLabel'=>'Trim. 1'],['value'=>'T2','shortLabel'=>'Trim. 2'],['value'=>'T3','shortLabel'=>'Trim. 3']];
  if (count(bl_seqsOfTrim($period))) { $out = []; foreach (bl_seqsOfTrim($period) as $s) { $n = (int)substr($s, 1); $out[] = ['value'=>$s,'shortLabel'=>'Séq. '.$n]; } return $out; }
  $n = (int)substr($period, 1); return [['value'=>$period,'shortLabel'=>'Séq. '.$n]];
}
// Valeur d'une « colonne » (séquence ou trimestre) pour une matière/élève.
function bl_columnValue($notes, $classId, $subject, $col, $eleveId) {
  if (count(bl_seqsOfTrim($col))) return bl_subjectTrimAvg($notes, $classId, $subject, $col, $eleveId); // annual → col = Tx
  return bl_seqNote($notes, $classId, $subject, $col, $eleveId);
}
/**
 * Assemble le bulletin d'UNE période dans la forme attendue par le client/PDF.
 * $ctx : classId, className, eleveId, matricule, classmateIds (inscrits),
 *        identity {ecole,quartier,ville,tel,email,anneeScolaire,directeur,profPrincipal},
 *        thresholds, mentionText, dateValidation.
 * Ne renvoie que la tranche de l'élève (rang/moy. classe = nombres agrégés).
 */
function bl_buildBulletin($notes, $subjects, $period, $ctx) {
  $classId = $ctx['classId']; $eleveId = $ctx['eleveId'];
  $classmateIds = is_array($ctx['classmateIds'] ?? null) && count($ctx['classmateIds']) ? $ctx['classmateIds'] : [$eleveId];
  $cols = bl_periodColumns($period);
  $matieres = [];
  foreach ($subjects as $sub) {
    $name = $sub['name'];
    $seqNotes = [];
    foreach ($cols as $c) { $val = bl_columnValue($notes, $classId, $name, $c['value'], $eleveId); if ($val !== null) $seqNotes[$c['value']] = $val; }
    $moy = bl_subjectAvg($notes, $classId, $name, $period, $eleveId);
    // Matière sans aucune note sur la période → on l'omet (bulletin lisible).
    if ($moy === null && !count($seqNotes)) continue;
    $matieres[] = [
      'nom' => $name,
      'coef' => (float)$sub['coef'],
      'moyenne' => $moy,
      'moyenneClasse' => bl_subjectClassAvg($notes, $classId, $name, $period, $classmateIds),
      'seqNotes' => (object)$seqNotes,
      'appreciation' => bl_appreciation($moy),
    ];
  }
  $gen = bl_generalAvg($notes, $classId, $subjects, $period, $eleveId);
  list($rang, $effectif) = bl_rank($notes, $classId, $subjects, $period, $classmateIds, $eleveId);
  $id = $ctx['identity'] ?? [];
  return [
    'periodeId' => $period,
    'periode' => bl_periodLabel($period),
    'className' => $ctx['className'],
    'ecole' => (string)($id['ecole'] ?? ''),
    'quartier' => (string)($id['quartier'] ?? ''),
    'ville' => (string)($id['ville'] ?? ''),
    'tel' => (string)($id['tel'] ?? ''),
    'email' => (string)($id['email'] ?? ''),
    'anneeScolaire' => (string)($id['anneeScolaire'] ?? ''),
    'directeur' => (string)($id['directeur'] ?? ''),
    'profPrincipal' => (string)($id['profPrincipal'] ?? ''),
    'effectif' => $effectif,
    'moyenneGenerale' => $gen,
    'rang' => $rang,
    'mention' => bl_mention($gen, $ctx['thresholds'] ?? []),
    'decision' => bl_decision($gen),
    'appreciationGenerale' => (string)($ctx['mentionText'] ?? ''),
    'dateValidation' => (string)($ctx['dateValidation'] ?? ''),
    'verifCode' => 'BUL-' . preg_replace('/[^A-Za-z0-9]/', '', (string)($ctx['matricule'] ?? $eleveId)) . '-' . strtoupper($period),
    'sequences' => $cols,
    'matieres' => $matieres,
  ];
}
