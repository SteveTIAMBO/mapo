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

echo "\n== 6) ABSENCES : tranche d'un élève, résumé, no-leak ==\n";
$LIE = 'ELEVE_LIE'; $AUTRE = 'ELEVE_AUTRE';
$pres = [
  'att-2026-01-08-' . $LIE   => ['eleveId' => $LIE, 'date' => '2026-01-08', 'status' => 'present', 'note' => '', 'className' => '5ème'],
  'att-2026-01-09-' . $LIE   => ['eleveId' => $LIE, 'date' => '2026-01-09', 'status' => 'absent', 'note' => 'Non justifié', 'className' => '5ème'],
  'att-2026-01-10-' . $LIE   => ['eleveId' => $LIE, 'date' => '2026-01-10', 'status' => 'retard', 'note' => '', 'className' => '5ème'],
  'att-2026-01-11-' . $LIE   => ['eleveId' => $LIE, 'date' => '2026-01-11', 'status' => 'excuse', 'note' => 'Certificat médical', 'className' => '5ème'],
  // Le camarade ne doit JAMAIS ressortir, même si la requête distante le laissait passer.
  'att-2026-01-09-' . $AUTRE => ['eleveId' => $AUTRE, 'date' => '2026-01-09', 'status' => 'absent', 'note' => 'SECRET_VOISIN', 'className' => '5ème'],
  // Lignes corrompues : sans date, ou statut inconnu.
  'att-vide'                 => ['eleveId' => $LIE, 'date' => '', 'status' => 'absent'],
  'att-bidon'                => ['eleveId' => $LIE, 'date' => '2026-01-12', 'status' => 'teleporte'],
];
$abs = sliceAbsences($pres, $LIE);
$jabs = json_encode($abs);
check(strpos($jabs, 'SECRET_VOISIN') === false && strpos($jabs, $AUTRE) === false, "absence d'un camarade JAMAIS renvoyée");
check(count($abs['items']) === 3, "3 lignes renvoyées (absent + retard + excusé), le 'présent' n'est pas listé (=" . count($abs['items']) . ")");
check($abs['resume']['total'] === 4, "résumé : 4 jours d'appel comptés, statut inconnu et ligne sans date exclus (=" . $abs['resume']['total'] . ")");
check($abs['resume']['present'] === 1 && $abs['resume']['absent'] === 1 && $abs['resume']['retard'] === 1 && $abs['resume']['excuse'] === 1, "résumé : 1 de chaque");
check($abs['resume']['tauxPresence'] === 25.0, "taux de présence = 25 % (1 présent / 4) (=" . var_export($abs['resume']['tauxPresence'], true) . ")");
check($abs['items'][0]['date'] === '2026-01-11', "tri antéchronologique : le plus récent d'abord");
check(sliceAbsences($pres, '')['items'] === [] && sliceAbsences(null, $LIE)['items'] === [], "eleveId vide ou rows null → liste vide");
check(sliceAbsences([], $LIE)['resume']['tauxPresence'] === null, "aucun appel → taux null (et non 0 %, qui se lirait « jamais présent »)");

echo "\n== 7) DISCIPLINE : tranche d'un élève, commentaire interne retenu ==\n";
$disc = [
  'd1' => ['eleveId' => $LIE, 'date' => '2026-02-10', 'type' => 'retard', 'description' => 'Trois retards',
           'sanction' => 'observation', 'sanctionDate' => '2026-02-10', 'reportedBy' => 'M. Fotso',
           'resolved' => true, 'className' => '5ème', 'notes' => 'INTERNE_FAMILLE_FACTUREE'],
  'd2' => ['eleveId' => $LIE, 'date' => '2026-03-04', 'type' => 'triche', 'description' => 'Copie au contrôle',
           'sanction' => 'retenue', 'reportedBy' => 'Mme Abena', 'resolved' => false, 'className' => '5ème'],
  'd3' => ['eleveId' => $AUTRE, 'date' => '2026-03-05', 'type' => 'violence', 'description' => 'INCIDENT_DU_VOISIN'],
  'd4' => ['eleveId' => $LIE, 'date' => '', 'type' => 'autre', 'description' => 'Sans date'],
];
$od = sliceDiscipline($disc, $LIE);
$jd = json_encode($od);
check(strpos($jd, 'INCIDENT_DU_VOISIN') === false && strpos($jd, $AUTRE) === false, "incident d'un camarade JAMAIS renvoyé");
check(strpos($jd, 'INTERNE_FAMILLE_FACTUREE') === false, "commentaire INTERNE de la vie scolaire JAMAIS renvoyé");
check(count($od) === 2, "2 incidents renvoyés, celui sans date exclu (=" . count($od) . ")");
check($od[0]['id'] === 'd2' && $od[0]['date'] === '2026-03-04', "tri antéchronologique");
check($od[0]['resolved'] === false && $od[1]['resolved'] === true, "resolved conservé et typé booléen");
check($od[1]['reportedBy'] === 'M. Fotso', "reportedBy conservé : le parent a le droit de savoir qui a signalé");
check($od[0]['sanctionDate'] === '', "sanctionDate absente → chaîne vide, pas de clé manquante");
check(sliceDiscipline($disc, '') === [] && sliceDiscipline('pas un tableau', $LIE) === [], "eleveId vide ou rows non-array → []");

echo "\n";
echo $fail === 0 ? "TOUS LES TESTS PASSENT ($pass) ✅\n" : "$fail ÉCHEC(S) sur " . ($pass + $fail) . " ❌\n";
exit($fail === 0 ? 0 : 1);
