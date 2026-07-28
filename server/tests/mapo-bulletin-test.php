<?php
/**
 * Tests PURS du calcul de bulletin (miroir de src/stores/notes.js).
 * Valeurs attendues calculées à la main. Vérifie aussi le NO-LEAK : la sortie
 * ne contient jamais l'identifiant ni les notes d'un autre élève.
 *
 * Lancer :  php server/tests/mapo-bulletin-test.php
 */
require_once __DIR__ . '/../mapo-lien-lib.php';

$T = 0; $F = 0;
function ok($cond, $label) { global $T, $F; if ($cond) { $T++; } else { $F++; echo "  ✗ $label\n"; } }
function eqf($a, $b, $label) { ok($a !== null && abs((float)$a - (float)$b) < 0.001, $label . " (=$a, attendu $b)"); }

// ── Données synthétiques : classe c-5a, 3 élèves, 2 matières (coef 4 chacune) ──
$LINK = 'ELEVE_LIE';           // l'élève lié (celui dont on fait le bulletin)
$O2 = 'ELEVE_AUTRE_DEUX';      // camarades — ne doivent JAMAIS apparaître en sortie
$O3 = 'ELEVE_AUTRE_TROIS';
$classId = 'c-5a';
$notes = [
  // Maths
  "c-5a_Mathématiques_S1" => [$LINK => 11, $O2 => 15, $O3 => 9],
  "c-5a_Mathématiques_S2" => [$LINK => 13, $O2 => 15, $O3 => 9],
  // Français
  "c-5a_Français_S1" => [$LINK => 14, $O2 => 10, $O3 => 12],
  "c-5a_Français_S2" => [$LINK => 14, $O2 => 10, $O3 => 12],
];
$subjects = [['name' => 'Mathématiques', 'coef' => 4], ['name' => 'Français', 'coef' => 4]];
$mates = [$LINK, $O2, $O3];

// ── Moyennes matière × trimestre (S1,S2 → T1) ──
eqf(bl_subjectTrimAvg($notes, $classId, 'Mathématiques', 'T1', $LINK), 12, 'Maths T1 (lié)');
eqf(bl_subjectTrimAvg($notes, $classId, 'Français', 'T1', $LINK), 14, 'Français T1 (lié)');

// ── Moyenne générale T1 pondérée : (12*4 + 14*4)/8 = 13 ──
eqf(bl_generalAvg($notes, $classId, $subjects, 'T1', $LINK), 13, 'Générale T1 (lié)');
eqf(bl_generalAvg($notes, $classId, $subjects, 'T1', $O2), 12.5, 'Générale T1 (o2)');
eqf(bl_generalAvg($notes, $classId, $subjects, 'T1', $O3), 10.5, 'Générale T1 (o3)');

// ── Rang T1 : lié 13 > o2 12.5 > o3 10.5 → rang 1 / effectif 3 ──
list($rang, $eff) = bl_rank($notes, $classId, $subjects, 'T1', $mates, $LINK);
ok($rang === 1, "Rang T1 = 1 (=$rang)");
ok($eff === 3, "Effectif = 3 (=$eff)");

// ── Rang avec égalité (S1) : lié 12.5 = o2 12.5 > o3 10.5 → rang 1 (compétition standard) ──
list($rS1) = bl_rank($notes, $classId, $subjects, 'S1', $mates, $LINK);
ok($rS1 === 1, "Rang S1 avec égalité = 1 (=$rS1)");
// o3 (10.5) derrière deux élèves à 12.5 → rang 3 (pas 2).
list($rS1o3) = bl_rank($notes, $classId, $subjects, 'S1', $mates, $O3);
ok($rS1o3 === 3, "Rang S1 o3 = 3 (compétition standard) (=$rS1o3)");

// ── Moyenne de classe d'une matière (T1) : Maths mean(12,15,9)=12 ; Français mean(14,10,12)=12 ──
eqf(bl_subjectClassAvg($notes, $classId, 'Mathématiques', 'T1', $mates), 12, 'Moy. classe Maths T1');
eqf(bl_subjectClassAvg($notes, $classId, 'Français', 'T1', $mates), 12, 'Moy. classe Français T1');

// ── Séquence : note brute ──
eqf(bl_subjectAvg($notes, $classId, 'Mathématiques', 'S1', $LINK), 11, 'Maths S1 = note brute 11');

// ── Appréciation / mention / décision ──
ok(bl_appreciation(14) === 'Très bien', 'Appréciation 14 = Très bien');
ok(bl_appreciation(12) === 'Bien', 'Appréciation 12 = Bien');
ok(bl_mention(13, []) === 'Encouragements', 'Mention 13 (défaut) = Encouragements');
ok(bl_mention(15, []) === 'Tableau d\'honneur', 'Mention 15 = Tableau d\'honneur');
ok(bl_decision(13) === 'Admis(e) en classe supérieure', 'Décision 13 = Admis');
ok(bl_decision(9) === 'Rachat / Redoublement', 'Décision 9 = Rachat');

// ── Périodes disponibles : gate par signature du trimestre parent ──
$sigs = ['c-5a_T1_' . $LINK => ['signed' => true]];
$per = bl_availablePeriodes($sigs, $notes, $classId, $LINK, $subjects);
$perIds = array_map(function ($p) { return $p['id']; }, $per);
ok(in_array('S1', $perIds) && in_array('S2', $perIds), 'S1/S2 dispo (T1 signé)');
ok(in_array('T1', $perIds), 'T1 dispo (signé)');
ok(!in_array('S3', $perIds), 'S3 absente (T2 non signé)');
ok(!in_array('annual', $perIds), 'Annuel absent (non signé)');

// ── Bulletin complet + NO-LEAK ──
$bul = bl_buildBulletin($notes, $subjects, 'T1', [
  'classId' => $classId, 'className' => '5ème A', 'eleveId' => $LINK, 'matricule' => 'EDU140042',
  'classmateIds' => $mates,
  'identity' => ['ecole' => 'Collège EDUFREM', 'directeur' => 'M. EDIMO', 'profPrincipal' => 'Mme NGO'],
  'thresholds' => [], 'mentionText' => 'Bon trimestre.', 'dateValidation' => '2025-11-15',
]);
eqf($bul['moyenneGenerale'], 13, 'Bulletin moyenne générale');
ok($bul['rang'] === 1, 'Bulletin rang 1');
ok($bul['effectif'] === 3, 'Bulletin effectif 3');
ok(count($bul['matieres']) === 2, 'Bulletin 2 matières');
ok($bul['mention'] === 'Encouragements', 'Bulletin mention');
ok($bul['verifCode'] === 'BUL-EDU140042-T1', 'Bulletin verifCode');
ok(count($bul['sequences']) === 2, 'Bulletin colonnes = 2 séquences (T1)');

// NO-LEAK : la sortie JSON ne doit JAMAIS contenir l'id d'un autre élève.
$json = json_encode($bul);
ok(strpos($json, $O2) === false, 'NO-LEAK : id o2 absent de la sortie');
ok(strpos($json, $O3) === false, 'NO-LEAK : id o3 absent de la sortie');
// Ni les notes propres d'un autre (o2 Maths=15 n'apparaît pas comme note du lié).
$maths = null; foreach ($bul['matieres'] as $m) { if ($m['nom'] === 'Mathématiques') $maths = $m; }
ok($maths && abs($maths['moyenne'] - 12) < 0.001, 'Maths moyenne du lié = 12 (pas 15 de o2)');

echo "\nBulletin : $T réussis, $F échoués\n";
exit($F === 0 ? 0 : 1);
