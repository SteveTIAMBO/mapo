<?php
/**
 * Tests de la logique PURE du pont de liaison (mapo-lien-lib.php).
 * Lancer : php server/tests/mapo-lien-test.php
 * Vérifie surtout la garantie CLÉ : le tranchage ne fuite JAMAIS les données
 * d'un autre élève (note, appréciation, corrigé, binaire de fichier).
 */
require __DIR__ . '/../mapo-lien-lib.php';

$fail = 0; $pass = 0;
function check($cond, $label) {
  global $fail, $pass;
  if ($cond) { $pass++; echo "  ✓ $label\n"; }
  else { $fail++; echo "  ✗ ÉCHEC : $label\n"; }
}

echo "== 1) Round-trip encode/decode Firestore ==\n";
$orig = ['s' => 'bonjour', 'b' => true, 'z' => false, 'n' => 42, 'vide' => '',
         'nested' => ['a' => 'x', 'list' => ['p', 'q']], 'nul' => null];
$rt = fsDecodeFields(fsEncodeFields($orig));
check($rt === $orig, "decode(encode(x)) == x (types mixtes, map/list imbriqués)");
check(fsEncodeValue(true) === ['booleanValue' => true], "bool → booleanValue");
check(fsEncodeValue(42) === ['integerValue' => '42'], "int → integerValue (string)");
check(fsDecodeValue(['integerValue' => '7']) === 7, "integerValue → int");

echo "\n== 2) sliceDevoirs : sa classe + SON seul rendu (NO-LEAK) ==\n";
$devoirs = [
  ['id' => 'd1', 'className' => '3ème A', 'classId' => 'c-3a', 'title' => 'Maths ex', 'subjectName' => 'Maths', 'type' => 'devoir', 'dueDate' => '2026-07-30'],
  ['id' => 'd2', 'className' => '3ème B', 'classId' => 'c-3b', 'title' => 'Autre classe'],
  ['id' => 'd3', 'className' => '3ème A', 'classId' => 'c-3a', 'title' => 'Français'],
];
$subs = [
  'd1_eleveMe'    => ['submittedAt' => '2026-07-28', 'grade' => 15, 'feedback' => 'Bien joué'],
  'd1_eleveOther' => ['submittedAt' => '2026-07-28', 'grade' => 8,  'feedback' => 'SECRET_AUTRE'],
  'd3_eleveOther' => ['grade' => 12, 'feedback' => 'AUTRE_ENCORE'],
];
$out = sliceDevoirs($devoirs, $subs, '3ème A', 'c-3a', 'eleveMe');
$json = json_encode($out);
check(count($out) === 2, "2 devoirs de 3ème A (d2 de 3ème B exclu)");
$ids = array_column($out, 'id');
check(in_array('d1', $ids) && in_array('d3', $ids) && !in_array('d2', $ids), "d1+d3 présents, d2 absent");
$d1 = $out[array_search('d1', $ids)];
check($d1['submission'] && $d1['submission']['grade'] === 15 && $d1['submission']['feedback'] === 'Bien joué', "d1 → MON rendu (15, « Bien joué »)");
$d3 = $out[array_search('d3', $ids)];
check($d3['submission'] === null, "d3 → pas de rendu de MA part (null)");
check(strpos($json, 'SECRET_AUTRE') === false, "note/appréciation d'un AUTRE élève (d1) JAMAIS renvoyée");
check(strpos($json, 'AUTRE_ENCORE') === false, "appréciation d'un AUTRE élève (d3) JAMAIS renvoyée");
check(strpos($json, '"grade":8') === false && strpos($json, '"grade":12') === false, "notes des autres (8, 12) JAMAIS renvoyées");
check(strpos($json, '3ème B') === false && strpos($json, 'Autre classe') === false, "aucune trace de la classe voisine (3ème B)");

echo "\n== 3) sliceDevoirs : classe changée → snapshot ignoré ==\n";
// L'appelant passe la classe COURANTE ('Tle D') et classId '' (car classe a changé).
$out2 = sliceDevoirs($devoirs, $subs, 'Tle D', '', 'eleveMe');
check(count($out2) === 0, "aucun devoir de 3ème A servi après passage en Tle D");

echo "\n== 4) sliceCours : corrigé & binaire strippés, filtres type/classe ==\n";
$items = [
  ['id' => 'c1', 'type' => 'cours', 'classe' => '3ème A', 'matiere' => 'Maths', 'titre' => 'Fractions', 'contenu' => 'Un cours utile', 'corrige' => 'REPONSES_SECRETES', 'fileData' => 'BASE64_LOURD', 'auteur' => 'Prof X'],
  ['id' => 'c2', 'type' => 'examen', 'classe' => '3ème A', 'titre' => 'Compo', 'corrige' => 'CORRIGE_EXAM'],
  ['id' => 'c3', 'type' => 'cours', 'classe' => '3ème B', 'titre' => 'Classe voisine'],
  ['id' => 'c4', 'type' => 'ressource', 'classe' => '', 'titre' => 'Pour toutes', 'contenu' => 'partagé', 'fileId' => 'f1', 'fileExt' => 'pdf'],
];
$oc = sliceCours($items, '3ème A');
$jc = json_encode($oc);
$cids = array_column($oc, 'id');
check(count($oc) === 2 && in_array('c1', $cids) && in_array('c4', $cids), "c1 (cours, sa classe) + c4 (ressource, toutes) — c2 (examen) & c3 (autre classe) exclus");
check(strpos($jc, 'REPONSES_SECRETES') === false && strpos($jc, 'CORRIGE_EXAM') === false, "corrigés JAMAIS renvoyés");
check(strpos($jc, 'BASE64_LOURD') === false, "binaire de fichier (fileData) JAMAIS renvoyé");
check(strpos($jc, 'Classe voisine') === false, "cours de la classe voisine exclu");
$c1 = $oc[array_search('c1', $cids)];
check($c1['contenu'] === 'Un cours utile' && $c1['hasFile'] === true, "c1 : contenu conservé + hasFile=true (fichier présent mais non renvoyé)");
$c4 = $oc[array_search('c4', $cids)];
check($c4['hasFile'] === true, "c4 : hasFile=true (fileId)");

echo "\n== 5) Robustesse : entrées vides / malformées ==\n";
check(sliceDevoirs(null, null, 'X', '', 'e') === [], "devoirs null → []");
check(sliceCours('pas un tableau', 'X') === [], "cours non-array → []");
check(sliceDevoirs([['id' => 'x']], [], 'X', '', 'e') === [], "devoir sans classe → exclu");

echo "\n";
echo $fail === 0 ? "TOUS LES TESTS PASSENT ($pass) ✅\n" : "$fail ÉCHEC(S) sur " . ($pass + $fail) . " ❌\n";
exit($fail === 0 ? 0 : 1);
