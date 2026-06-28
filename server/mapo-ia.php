<?php
/**
 * MAPO — Génération d'appréciations de bulletin assistée par IA.
 *
 * Appelé par l'app école (même domaine → pas de CORS) depuis le bulletin :
 * le directeur clique « Générer avec l'IA », l'app envoie les données
 * chiffrées de l'élève (prénom, moyennes, rang, mention, matières) et le
 * proxy renvoie une appréciation rédigée en français.
 *
 * Sécurité :
 *   - Jeton Firebase vérifié (RS256 Google) pour les utilisateurs connectés.
 *   - Repli démo : si IA_DEMO_OPEN, génération autorisée sans connexion mais
 *     plafonnée par IP (anti-abus / anti-épuisement de la clé).
 *   - La clé API vit dans mapo-ia-config.php (protégé par .htaccess). Absente
 *     ou non remplie → réponse "not_configured" → l'app bascule en simulation
 *     (appréciation générée localement, gratuite).
 *   - Aucune donnée n'est stockée : le proxy relaie puis oublie.
 */

header('Content-Type: application/json; charset=utf-8');
@set_time_limit(30);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https://([a-z0-9-]+\.)?app-edufrem\.com$#', $origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method_not_allowed']); exit;
}

// ── Config ────────────────────────────────────────────────────────────
$cfgPath = __DIR__ . '/mapo-ia-config.php';
if (!file_exists($cfgPath)) { echo json_encode(['ok' => false, 'error' => 'not_configured']); exit; }
require $cfgPath;
if (!defined('IA_API_KEY') || IA_API_KEY === '' || strpos(IA_API_KEY, 'A_REMPLIR') === 0) {
  echo json_encode(['ok' => false, 'error' => 'not_configured']); exit;
}

// ── 1. Lire la requête ────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'requete_invalide']); exit; }
$data = is_array($body['data'] ?? null) ? $body['data'] : [];
$task = in_array(($body['task'] ?? 'appreciation'), ['appreciation', 'tutor_quiz', 'vision_copie', 'orientation', 'orientation6c', 'prepa_examen', 'commande', 'pedagogie'], true) ? $body['task'] : 'appreciation';

// ── 2. Authentification : jeton Firebase OU démo plafonnée ────────────
$uid = verifyFirebaseToken();
if (!$uid) {
  $demoOpen = defined('IA_DEMO_OPEN') && IA_DEMO_OPEN;
  if (!$demoOpen) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'non_autorise']); exit; }
  if (!rateLimitOk()) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'limite_atteinte']); exit; }
}

// Plafond JOURNALIER GLOBAL (borne anti-dérapage, s'applique à tous). Au-delà,
// l'app bascule sur la génération locale gratuite → aucun surcoût possible.
if (!dailyLimitOk()) {
  http_response_code(429); echo json_encode(['ok' => false, 'error' => 'limite_globale']); exit;
}

// ── 3. Construire les prompts (selon la tâche) ────────────────────────
list($system, $user, $maxTokens, $noReason, $image) = buildPrompts($task, $data);

// ── 4. Appeler le fournisseur ─────────────────────────────────────────
$provider = defined('IA_PROVIDER') ? IA_PROVIDER : 'anthropic';
// La vision (copie d'examen) passe toujours par le fournisseur multimodal
// (Gemini via compat OpenAI). Anthropic gère le texte seul ici.
$r = ($provider === 'anthropic' && !$image)
  ? callAnthropic($system, $user, $maxTokens)
  : callOpenAICompat($system, $user, $maxTokens, $noReason, $image);

if (!empty($r['ok'])) {
  echo json_encode(['ok' => true, 'text' => trim($r['text']), 'provider' => $provider]);
} else {
  echo json_encode(['ok' => false, 'error' => 'ia_echec', 'code' => $r['code'] ?? null, 'detail' => $r['detail'] ?? null]);
}

// ════════════════════════════════════════════════════════════════════
//  Construction des prompts
// ════════════════════════════════════════════════════════════════════
function buildPrompts($task, $d) {
  if ($task === 'tutor_quiz') return buildTutorQuizPrompts($d);
  if ($task === 'vision_copie') return buildVisionPrompts($d);
  if ($task === 'orientation') return buildOrientationPrompts($d);
  if ($task === 'orientation6c') return buildOrientation6cPrompts($d);
  if ($task === 'prepa_examen') return buildPrepaExamenPrompts($d);
  if ($task === 'commande') return buildCommandePrompts($d);
  if ($task === 'pedagogie') return buildPedagogiePrompts($d);
  return buildAppreciationPrompts($d);
}

// ── Assistant enseignant : prépare un cours / devoir / examen ──────────
// Génère le CONTENU pédagogique réel (pas une intention) : pour un devoir ou
// un examen, le sujet ET le corrigé séparés (le prof montre le sujet sans
// les réponses) ; pour un cours, un plan/déroulé exploitable.
function buildPedagogiePrompts($d) {
  $type    = in_array(($d['type'] ?? 'devoir'), ['cours', 'devoir', 'examen'], true) ? $d['type'] : 'devoir';
  $matiere = clean($d['matiere'] ?? '', 50);
  $niveau  = clean($d['niveau'] ?? '', 30);
  $theme   = clean($d['theme'] ?? '', 200);
  $contexte = "Programme proche des systèmes scolaires d'Afrique francophone (Cameroun/Sénégal/France).";

  if ($type === 'cours') {
    $system = "Tu es un enseignant chevronné qui prépare une FICHE DE COURS pour un collègue. {$contexte} "
      . "Produis un déroulé de cours clair et exploitable en classe : objectifs pédagogiques, prérequis, déroulé en étapes "
      . "(avec durées indicatives et activités), points clés à retenir, et une courte évaluation de fin de séance. "
      . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
      . "{\"titre\":\"...\",\"document\":\"texte complet de la fiche de cours, lisible, avec sauts de ligne \\n et tirets\",\"corrige\":\"\"}.";
    $maxTokens = 2200;
  } else {
    $libelle = $type === 'examen' ? 'un SUJET D\'EXAMEN' : 'un SUJET DE DEVOIR';
    $system = "Tu es un enseignant chevronné qui rédige {$libelle} pour ses élèves. {$contexte} "
      . "Produis un sujet complet et bien calibré pour le niveau : énoncé clair, plusieurs exercices/questions avec un BARÈME en points "
      . "(total sur 20), durée conseillée. Puis, SÉPARÉMENT, le CORRIGÉ détaillé avec le barème de notation. "
      . "Le \"document\" = le sujet SANS les réponses (prêt à distribuer). Le \"corrige\" = la correction complète. "
      . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
      . "{\"titre\":\"...\",\"document\":\"énoncé complet du sujet avec barème et durée, sauts de ligne \\n\",\"corrige\":\"correction détaillée avec barème, sauts de ligne \\n\"}.";
    $maxTokens = 2600;
  }

  $u = "Type : {$type}\n";
  $u .= "Matière : " . ($matiere !== '' ? $matiere : 'non précisée') . "\n";
  $u .= "Niveau / classe : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  if ($theme !== '') $u .= "Thème / chapitre : {$theme}\n";
  $u .= "\nGénère le contenu au format JSON demandé.";

  // reasoning_effort:none → tout le budget passe dans la sortie (JSON complet).
  return [$system, $u, $maxTokens, true, null];
}

// ── Copilote MIAPO : commande en langage naturel → intention JSON ──────
// Le directeur/personnel tape une instruction ("affiche les élèves en retard
// de paiement", "prépare une communication sur la journée culturelle le 11
// février"). MIAPO renvoie une INTENTION structurée que l'app exécute :
// navigation+filtre (lecture, direct) ou préparation d'un message (validation).
function buildCommandePrompts($d) {
  $instruction = clean($d['instruction'] ?? '', 400);
  $vueActuelle = clean($d['vueActuelle'] ?? '', 40);
  $aujourdhui  = clean($d['date'] ?? date('Y-m-d'), 20);

  // Catalogue des vues que l'app sait ouvrir (le front exécute ces tokens).
  $vues = "dashboard (tableau de bord), eleves (liste des élèves), classes, notes (notes & évaluations), "
    . "examens (examens nationaux), presences (appel/présences), emploi-du-temps, devoirs, discipline, "
    . "facturation (comptabilité, paiements de scolarité, impayés), rapports, personnel, alertes "
    . "(alertes parents WhatsApp/SMS), messagerie, suivi-revisions (suivi des révisions MIAPO), inscriptions";

  $system = "Tu es MIAPO, le copilote intelligent d'un logiciel de gestion scolaire (MAPO) utilisé par des écoles d'Afrique francophone. "
    . "Tu es bienveillant, clair et efficace — une présence qui guide. "
    . "Tu reçois une instruction du personnel en langage naturel et tu la traduis en UNE intention exécutable par l'application. "
    . "Tu NE réponds JAMAIS par une action à effet irréversible toi-même : pour toute communication tu PRÉPARES un brouillon que l'humain validera.\n\n"
    . "Intentions possibles :\n"
    . "1) \"ouvrir_vue\" : afficher/filtrer/trier une vue (LECTURE, sans risque). Choisis \"vue\" dans cette liste EXACTE : {$vues}. "
    . "Filtres optionnels : \"classe\" (ex. \"3ème A\", \"Tle D\"), \"statut\" (pour les élèves : inscrit, transfere, exclu, abandon, diplome), "
    . "\"focus\" (pour facturation : \"impayes\" = en retard de paiement, \"partiels\" = paiement partiel, \"payes\" = à jour), "
    . "\"date\" (AAAA-MM-JJ, pour présences), \"q\" (texte de recherche, ex. un nom).\n"
    . "2) \"preparer_communication\" : rédige un message complet à destination des familles/du personnel (le directeur le validera avant envoi). "
    . "Renseigne \"sujet\", \"message\" (texte prêt à envoyer, chaleureux et professionnel, en français), \"destinataires\" (libellé lisible, ex. \"Tous les parents\", \"Tous les professeurs\"), "
    . "et surtout le couple machine \"recipient_type\" + \"recipient_value\" : recipient_type ∈ {\"all\" = tous les parents, \"teachers\" = tous les professeurs/enseignants, \"class\" = les parents d'UNE classe (mettre la classe dans recipient_value, ex. \"3ème A\"), \"service\" = un service interne, \"individual\" = une personne}. "
    . "Par défaut recipient_type=\"all\". Si la demande vise les profs/enseignants, recipient_type=\"teachers\".\n"
    . "3) \"exporter\" : l'utilisateur veut exporter une liste. Renseigne \"vue\" et \"format\" (xlsx ou pdf).\n"
    . "4) \"preparer_pedagogique\" : un ENSEIGNANT veut préparer un cours, un devoir ou un examen. "
    . "Renseigne \"type\" (cours | devoir | examen), \"matiere\", \"niveau\" (la classe, ex. \"5ème\"), \"theme\" (le chapitre/sujet si donné). "
    . "Ex. « prépare un devoir de maths sur les fractions pour la 5ème » → type=devoir, matiere=Mathématiques, niveau=5ème, theme=les fractions.\n"
    . "5) \"repondre\" : question générale sur les capacités de l'app ou aide ; mets ta réponse dans \"reponse\".\n"
    . "6) \"inconnu\" : tu n'arrives pas à rattacher l'instruction à une action ; explique gentiment dans \"reponse\".\n\n"
    . "Pour une question portant sur des données (ex. « qui est en retard de paiement », « les absents de 3ème »), PRÉFÈRE \"ouvrir_vue\" "
    . "avec les bons filtres afin que l'utilisateur VOIE la donnée dans l'app — tu n'as PAS accès aux données toi-même, donc tu n'inventes jamais un nom, un chiffre ou un résultat : tu amènes l'utilisateur au bon endroit.\n"
    . "Pour toute question sur UNE classe précise (professeur principal/titulaire, effectif, salle, liste…), utilise \"ouvrir_vue\" avec vue=\"classes\" et \"classe\" = le nom de la classe (ex. « qui est le prof principal de 3ème A » → vue=classes, classe=\"3ème A\"). "
    . "La fiche de la classe affiche le professeur principal.\n"
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"intent\":\"...\",\"vue\":\"\",\"classe\":\"\",\"statut\":\"\",\"focus\":\"\",\"date\":\"\",\"q\":\"\",\"format\":\"\",\"sujet\":\"\",\"message\":\"\",\"destinataires\":\"\",\"recipient_type\":\"\",\"recipient_value\":\"\",\"type\":\"\",\"matiere\":\"\",\"niveau\":\"\",\"theme\":\"\",\"reponse\":\"...\"}. "
    . "Laisse vides les champs non pertinents. \"reponse\" est TOUJOURS une phrase courte à la 1re personne que tu dis à l'utilisateur (ex. « Voici les élèves en retard de paiement. »).";

  $u = "Date du jour : {$aujourdhui}\n";
  if ($vueActuelle !== '') $u .= "Vue actuellement ouverte : {$vueActuelle}\n";
  $u .= "Instruction : \"{$instruction}\"\n\nRenvoie l'intention au format JSON demandé.";

  // reasoning_effort:none → JSON complet, pas de troncature ; 800 tokens suffisent.
  return [$system, $u, 800, true, null];
}

// ── Préparation à l'examen national → programme JSON ──────────────────
function buildPrepaExamenPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 30);
  $paysCode = clean($d['pays'] ?? '', 8);
  $paysNoms = ['CM' => 'Cameroun', 'SN' => 'Sénégal', 'CI' => "Côte d'Ivoire", 'GA' => 'Gabon'];
  $pays = $paysNoms[$paysCode] ?? ($paysCode !== '' ? $paysCode : 'Afrique francophone');
  $faibles = array_slice(array_filter(array_map(function ($s) { return clean($s, 40); }, (array) ($d['faibles'] ?? []))), 0, 8);

  $system = "Tu es un coach scolaire qui prépare des élèves aux examens nationaux en {$pays} (et en Afrique francophone). "
    . "À partir de la classe et du pays, identifie l'EXAMEN national visé (ex. CEP, BEPC, Probatoire, Baccalauréat, ou une composition de fin d'année si la classe ne mène pas à un examen), "
    . "puis bâtis un PROGRAMME DE PRÉPARATION concret, étape par étape, qui PRIORISE les matières faibles de l'élève tout en couvrant les matières clés de l'examen. "
    . "Sois réaliste et motivant. Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"examen\":\"...\",\"matieres_cles\":[\"...\"],\"plan\":[{\"etape\":\"...\",\"objectif\":\"...\",\"focus\":[\"...\"],\"actions\":[\"...\"]}],\"conseil\":\"...\"}. "
    . "Donne 3 à 5 étapes dans \"plan\".";

  $u = "Pays : {$pays}\n";
  $u .= "Classe : " . ($niveau !== '' ? $niveau : 'non précisée') . "\n";
  if ($faibles) $u .= "Matières faibles à renforcer en priorité : " . implode(', ', $faibles) . "\n";
  $u .= "\nProduis le programme de préparation au format JSON demandé.";

  // reasoning_effort:none (sinon JSON tronqué) ; programme = un peu plus long.
  return [$system, $u, 1800, true, null];
}

// ── Orientation scolaire contextualisée (pays) → pistes JSON ──────────
function buildOrientationPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 30);
  $paysCode = clean($d['pays'] ?? '', 8);
  $paysNoms = ['CM' => 'Cameroun', 'SN' => 'Sénégal', 'CI' => "Côte d'Ivoire", 'GA' => 'Gabon'];
  $pays = $paysNoms[$paysCode] ?? ($paysCode !== '' ? $paysCode : 'Afrique francophone');
  $forts = array_slice(array_filter(array_map(function ($s) { return clean($s, 40); }, (array) ($d['forts'] ?? []))), 0, 8);
  $faibles = array_slice(array_filter(array_map(function ($s) { return clean($s, 40); }, (array) ($d['faibles'] ?? []))), 0, 8);

  $system = "Tu es un conseiller d'orientation scolaire expérimenté en {$pays} (et plus largement en Afrique francophone). "
    . "À partir de la classe/série de l'élève, de ses matières fortes et faibles, tu proposes des PISTES D'ORIENTATION réalistes "
    . "et contextualisées au pays (filières, séries au lycée, études supérieures, métiers/débouchés réellement accessibles localement). "
    . "Reste concret et encourageant, sans survendre. Si tu n'es pas certain d'un débouché local précis, reste prudent. "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"profil\":\"une phrase de synthèse\",\"pistes\":[{\"filiere\":\"...\",\"pourquoi\":\"...\",\"debouches\":[\"...\",\"...\"]}],\"conseil\":\"...\"}. "
    . "Donne 2 à 4 pistes.";

  $u = "Pays : {$pays}\n";
  $u .= "Classe / série : " . ($niveau !== '' ? $niveau : 'non précisée') . "\n";
  if ($forts) $u .= "Matières fortes : " . implode(', ', $forts) . "\n";
  if ($faibles) $u .= "Matières faibles : " . implode(', ', $faibles) . "\n";
  $u .= "\nPropose les pistes d'orientation au format JSON demandé.";

  // reasoning_effort:none → tout le budget tokens passe dans la sortie JSON
  // (sinon le « raisonnement » Gemini consomme les tokens et tronque le JSON).
  return [$system, $u, 1400, true, null];
}

// ── Orientation 6C : argumentation FONDÉE sur des domaines pré-sélectionnés ──
// Le front fait le matching profil 6C → domaines réels (référentiel embarqué,
// sourcé) et envoie une liste de CANDIDATS (domaines + métiers + établissements
// RÉELS). L'IA ne doit RIEN inventer : elle argumente uniquement sur ces options.
function buildOrientation6cPrompts($d) {
  $niveau  = clean($d['niveau'] ?? '', 40);
  $pays    = clean($d['pays'] ?? '', 40);
  if ($pays === '') $pays = 'Cameroun';
  $forts   = array_slice(array_filter(array_map(function ($s) { return clean($s, 40); }, (array) ($d['forts'] ?? []))), 0, 8);
  $faibles = array_slice(array_filter(array_map(function ($s) { return clean($s, 40); }, (array) ($d['faibles'] ?? []))), 0, 8);

  // Profil 6C (scores /5) → texte
  $labels6c = [
    'creativite' => 'Créativité', 'esprit_critique' => 'Esprit critique', 'communication' => 'Communication',
    'cooperation' => 'Coopération', 'courage' => 'Courage', 'confiance' => 'Confiance',
  ];
  $comp = is_array($d['competences'] ?? null) ? $d['competences'] : [];
  $compLines = [];
  foreach ($labels6c as $k => $lab) {
    if (isset($comp[$k])) { $v = (float) $comp[$k]; if ($v < 0) $v = 0; if ($v > 5) $v = 5; $compLines[] = "{$lab} : {$v}/5"; }
  }

  // Candidats (domaines réels présélectionnés par le front)
  $cands = array_slice((array) ($d['candidats'] ?? []), 0, 6);
  $candTxt = '';
  $n = 0;
  foreach ($cands as $c) {
    if (!is_array($c)) continue;
    $n++;
    $dom = clean($c['domaine'] ?? '', 80);
    $mets = array_slice(array_filter(array_map(function ($s) { return clean($s, 60); }, (array) ($c['metiers'] ?? []))), 0, 6);
    $etabs = array_slice(array_filter(array_map(function ($s) { return clean($s, 90); }, (array) ($c['etablissements'] ?? []))), 0, 6);
    $candTxt .= "\n{$n}. {$dom}";
    if ($mets)  $candTxt .= "\n   Métiers : " . implode(' ; ', $mets);
    if ($etabs) $candTxt .= "\n   Écoles/établissements : " . implode(' ; ', $etabs);
  }

  $system = "Tu es un conseiller d'orientation scolaire expérimenté, qui accompagne un élève en {$pays}. "
    . "On te donne (a) son PROFIL DE COMPÉTENCES auto-évalué selon le référentiel des 6C (Créativité, Esprit critique, "
    . "Communication, Coopération, Courage, Confiance, notés sur 5), (b) son niveau scolaire et ses matières fortes/faibles, "
    . "et (c) une LISTE DE DOMAINES CANDIDATS déjà présélectionnés, avec des métiers et des établissements RÉELS. "
    . "RÈGLE ABSOLUE : tu n'inventes AUCUN établissement ni métier ; tu argumentes UNIQUEMENT à partir des domaines, métiers et "
    . "écoles fournis. Pour chaque domaine retenu, explique CONCRÈTEMENT en quoi il correspond (ou non) à son profil 6C ET à son "
    . "niveau scolaire, en citant les compétences fortes mobilisées. Classe-les du plus au moins adapté. Reste encourageant, honnête, "
    . "sans survendre, et rappelle que c'est une aide à la décision. "
    . "Réponds STRICTEMENT en JSON valide (sans markdown), au format EXACT : "
    . "{\"profil\":\"2 phrases sur son profil 6C\",\"recommandations\":[{\"domaine\":\"...\",\"adequation\":\"forte|moyenne\",\"pourquoi\":\"argumentaire lié à ses 6C et son niveau\",\"metiers_cles\":[\"...\"],\"etablissements_cles\":[\"...\"]}],\"conseil\":\"...\",\"prudence\":\"...\"}. "
    . "Donne 2 à 4 recommandations, classées.";

  $u  = "Pays visé : {$pays}\n";
  $u .= "Niveau scolaire : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  if ($compLines) $u .= "Profil 6C (auto-évaluation) : " . implode(' · ', $compLines) . "\n";
  if ($forts)   $u .= "Matières fortes : " . implode(', ', $forts) . "\n";
  if ($faibles) $u .= "Matières faibles : " . implode(', ', $faibles) . "\n";
  $u .= "\nDomaines candidats (à argumenter, SANS rien ajouter d'autre) :" . ($candTxt !== '' ? $candTxt : ' (aucun)') . "\n";
  $u .= "\nProduis les recommandations argumentées au format JSON demandé.";

  return [$system, $u, 1900, true, null];
}

// ── Lecture d'une copie d'examen (photo) → analyse JSON ───────────────
function buildVisionPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 30);
  // Image attendue en data URL (data:image/...;base64,XXXX) ou base64 brut.
  $img = (string) ($d['image'] ?? '');
  if ($img !== '' && strpos($img, 'data:') !== 0) {
    $img = 'data:image/jpeg;base64,' . $img;
  }

  $system = "Tu es un professeur expérimenté qui corrige des copies d'élèves d'Afrique francophone. "
    . "On te fournit la PHOTO d'une copie d'examen ou d'exercice. Analyse-la avec bienveillance et rigueur : "
    . "identifie la MATIÈRE, estime une NOTE sur 20 (réaliste, fondée sur ce que tu vois), repère 2 à 4 POINTS FAIBLES "
    . "ou erreurs récurrentes concrètes, et donne UN conseil de révision bref et actionnable. "
    . "Si l'image est illisible ou n'est pas une copie scolaire, mets matiere='' et explique dans conseil. "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"matiere\":\"...\",\"note\":12,\"points_faibles\":[\"...\",\"...\"],\"conseil\":\"...\"}. "
    . "\"note\" est un nombre entre 0 et 20.";

  $u = "Niveau / classe de l'élève : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  $u .= "Analyse la copie sur la photo et renvoie le JSON demandé.";

  // reasoning_effort:none pour éviter que le « raisonnement » Gemini ne
  // consomme le budget et tronque le JSON ; 1100 tokens suffisent largement.
  return [$system, $u, 1100, true, $img];
}

// ── Tuteur de révision : génère un quiz QCM en JSON ───────────────────
function buildTutorQuizPrompts($d) {
  $matiere = clean($d['matiere'] ?? 'Culture générale', 50);
  $niveau  = clean($d['niveau'] ?? '', 30);
  $count   = isset($d['nombre']) ? max(3, min(12, intval($d['nombre']))) : 10;
  $themes  = clean($d['themes'] ?? '', 200);
  $diff    = isset($d['difficulte']) ? max(1, min(5, intval($d['difficulte']))) : 1;
  $contexte = "Élève d'Afrique francophone (programme proche des systèmes camerounais/sénégalais/français).";

  // Difficulté ADAPTATIVE : l'élève progresse, on monte le niveau d'exigence.
  $diffDesc = [
    1 => "Niveau 1 (découverte) : questions simples sur les définitions et les bases, une seule notion par question.",
    2 => "Niveau 2 (application directe) : application d'une règle/formule connue sur des cas simples.",
    3 => "Niveau 3 (intermédiaire) : questions de compréhension qui combinent deux notions, distracteurs plausibles.",
    4 => "Niveau 4 (avancé) : raisonnement en plusieurs étapes, pièges classiques, exige de la rigueur.",
    5 => "Niveau 5 (expert) : problèmes exigeants type examen, analyse fine, distracteurs très proches de la bonne réponse.",
  ][$diff];

  $system = "Tu es un tuteur pédagogique francophone bienveillant et rigoureux qui fait PROGRESSER l'élève dans la durée. {$contexte} "
    . "Tu crées un quiz de révision de {$count} questions à choix multiple sur la matière demandée, adapté au niveau de classe ET au niveau de difficulté indiqué. "
    . "DIFFICULTÉ DEMANDÉE — {$diffDesc} Calibre VRAIMENT les questions sur ce niveau de difficulté (ni plus facile, ni plus dur). "
    . "Méthode socratique : pour chaque question, l'INDICE oriente la réflexion SANS donner la réponse ; l'EXPLICATION justifie la bonne réponse. "
    . "Sois BREF : indice en une phrase, explication en une à deux phrases maximum. "
    . "Langue simple, phrases courtes (contexte bas débit, texte seul). Les questions doivent être factuellement exactes et avoir une seule bonne réponse. "
    . "Réponds STRICTEMENT en JSON valide, sans aucun texte avant ou après, sans bloc de code markdown. "
    . "Format EXACT : {\"questions\":[{\"q\":\"...\",\"choices\":[\"...\",\"...\",\"...\",\"...\"],\"answer\":0,\"hint\":\"...\",\"explanation\":\"...\"}]}. "
    . "Chaque question a exactement 4 propositions ; \"answer\" est l'index (0 à 3) de la bonne proposition.";

  $u = "Matière : {$matiere}\n";
  if ($niveau !== '') $u .= "Niveau / classe : {$niveau}\n";
  $u .= "Nombre de questions : {$count}\n";
  if ($themes !== '') $u .= "Cibler en priorité ces notions à revoir : {$themes}\n";
  $u .= "\nGénère le quiz au format JSON demandé.";

  // Assez de tokens pour un quiz complet de 10 questions (sinon le JSON est
  // tronqué ; le parseur récupère quand même les questions complètes en secours).
  return [$system, $u, 3600, false, null];
}

function buildAppreciationPrompts($d) {
  $prenom   = clean($d['prenom'] ?? 'L\'élève', 40);
  $classe   = clean($d['classe'] ?? '', 30);
  $periode  = clean($d['periode'] ?? 'cette période', 40);
  $moyenne  = isset($d['moyenneGenerale']) && $d['moyenneGenerale'] !== null ? floatval($d['moyenneGenerale']) : null;
  $rang     = isset($d['rang']) ? intval($d['rang']) : null;
  $effectif = isset($d['effectif']) ? intval($d['effectif']) : null;
  $mention  = clean($d['mention'] ?? '', 60);
  $ton      = in_array(($d['ton'] ?? ''), ['bienveillant', 'neutre', 'exigeant'], true) ? $d['ton'] : 'bienveillant';

  $tonInstr = [
    'bienveillant' => 'Ton bienveillant et encourageant, tout en restant honnête.',
    'neutre'       => 'Ton neutre, factuel et professionnel.',
    'exigeant'     => 'Ton exigeant qui pousse l\'élève à se dépasser, sans être blessant.',
  ][$ton];

  $matLignes = [];
  if (isset($d['matieres']) && is_array($d['matieres'])) {
    foreach (array_slice($d['matieres'], 0, 25) as $m) {
      $nom = clean($m['nom'] ?? '', 40);
      if ($nom === '') continue;
      $moy = isset($m['moyenne']) && $m['moyenne'] !== null ? number_format(floatval($m['moyenne']), 2, '.', '') : '—';
      $moyCl = isset($m['moyenneClasse']) && $m['moyenneClasse'] !== null ? number_format(floatval($m['moyenneClasse']), 2, '.', '') : '—';
      $matLignes[] = "- {$nom} : {$moy}/20 (moyenne de la classe {$moyCl}/20)";
    }
  }

  $system = "Tu es un professeur principal francophone expérimenté. Tu rédiges l'appréciation générale du conseil de classe figurant sur le bulletin scolaire (notation sur 20). "
    . "Rédige UNIQUEMENT l'appréciation : 2 à 4 phrases, un seul paragraphe, en français soigné, sans liste ni puce, sans titre, sans guillemets. "
    . "Situe le niveau global, valorise 1-2 points forts (matières au-dessus de la moyenne), signale 1-2 axes de progrès concrets (matières faibles), et termine par un encouragement adapté. "
    . "N'invente AUCUNE donnée chiffrée et ne recopie pas les notes une à une. {$tonInstr} "
    . "Écris à la 3e personne en utilisant le prénom de l'élève.";

  $u = "Élève : {$prenom}" . ($classe ? " (classe de {$classe})" : '') . "\n";
  $u .= "Période : {$periode}\n";
  if ($moyenne !== null) $u .= "Moyenne générale : " . number_format($moyenne, 2, '.', '') . "/20\n";
  if ($rang !== null && $effectif !== null) $u .= "Rang : {$rang}e sur {$effectif}\n";
  if ($mention !== '') $u .= "Mention : {$mention}\n";
  if ($matLignes) $u .= "\nDétail par matière :\n" . implode("\n", $matLignes) . "\n";
  $u .= "\nRédige l'appréciation générale.";

  // 260 tokens suffisent ; reasoning_effort:none pour limiter le coût.
  return [$system, $u, 260, true, null];
}

function clean($s, $max) {
  $s = trim(preg_replace('/\s+/u', ' ', (string)$s));
  return mb_substr($s, 0, $max);
}

// ════════════════════════════════════════════════════════════════════
//  Appels fournisseurs
// ════════════════════════════════════════════════════════════════════
function callAnthropic($system, $user, $maxTokens = 260) {
  $payload = json_encode([
    'model'      => defined('IA_MODEL') ? IA_MODEL : 'claude-haiku-4-5-20251001',
    'max_tokens' => intval($maxTokens),
    'system'     => $system,
    'messages'   => [['role' => 'user', 'content' => $user]],
  ]);
  $ch = curl_init('https://api.anthropic.com/v1/messages');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'content-type: application/json',
      'x-api-key: ' . IA_API_KEY,
      'anthropic-version: 2023-06-01',
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_CONNECTTIMEOUT => 6,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return ['ok' => false, 'detail' => 'anthropic_injoignable'];
  $j = json_decode($res, true);
  if ($code >= 200 && $code < 300 && !empty($j['content'][0]['text'])) {
    return ['ok' => true, 'text' => $j['content'][0]['text']];
  }
  return ['ok' => false, 'code' => $code, 'detail' => $j['error']['message'] ?? 'reponse_inattendue'];
}

function callOpenAICompat($system, $user, $maxTokens = 260, $noReason = true, $image = null) {
  $base = defined('IA_OPENAI_BASE') ? rtrim(IA_OPENAI_BASE, '/') : 'https://api.openai.com/v1';
  // Contenu utilisateur : texte seul, ou multimodal (texte + image) pour la vision.
  $userContent = $image
    ? [
        ['type' => 'text', 'text' => $user],
        ['type' => 'image_url', 'image_url' => ['url' => $image]],
      ]
    : $user;
  $payloadArr = [
    'model'       => defined('IA_MODEL') ? IA_MODEL : 'gpt-4o-mini',
    'max_tokens'  => intval($maxTokens),
    'temperature' => 0.6,
    'messages'    => [
      ['role' => 'system', 'content' => $system],
      ['role' => 'user', 'content' => $userContent],
    ],
  ];
  // Coupe le "raisonnement"/thinking quand inutile (ex. appréciation courte)
  // → moins de tokens facturés. Pour le quiz, on garde le raisonnement (exactitude).
  if ($noReason) $payloadArr['reasoning_effort'] = 'none';
  $payload = json_encode($payloadArr);
  $ch = curl_init($base . '/chat/completions');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'content-type: application/json',
      'authorization: Bearer ' . IA_API_KEY,
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_CONNECTTIMEOUT => 6,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false) return ['ok' => false, 'detail' => 'fournisseur_injoignable'];
  $j = json_decode($res, true);
  if ($code >= 200 && $code < 300 && !empty($j['choices'][0]['message']['content'])) {
    return ['ok' => true, 'text' => $j['choices'][0]['message']['content']];
  }
  return ['ok' => false, 'code' => $code, 'detail' => $j['error']['message'] ?? 'reponse_inattendue'];
}

// ════════════════════════════════════════════════════════════════════
//  Plafond de débit (démo) — compteur par IP sur la dernière heure
// ════════════════════════════════════════════════════════════════════
// Plafond JOURNALIER GLOBAL — borne dure de la démo. Compte toutes les
// générations réussies de la journée (tous utilisateurs confondus) ; au-delà
// de IA_DAILY_LIMIT, l'app repasse en simulation locale (gratuite).
function dailyLimitOk() {
  $limit = defined('IA_DAILY_LIMIT') ? intval(IA_DAILY_LIMIT) : 300;
  if ($limit <= 0) return true;
  $file = sys_get_temp_dir() . '/mapo_ia_daily.json';
  $today = date('Y-m-d');
  $data = ['date' => $today, 'count' => 0];
  if (file_exists($file)) {
    $d = json_decode(@file_get_contents($file), true);
    if (is_array($d) && ($d['date'] ?? '') === $today) $data = $d;
  }
  if (($data['count'] ?? 0) >= $limit) return false;
  $data['count'] = ($data['count'] ?? 0) + 1;
  @file_put_contents($file, json_encode($data));
  return true;
}

function rateLimitOk() {
  $limit = defined('IA_DEMO_HOURLY_LIMIT') ? intval(IA_DEMO_HOURLY_LIMIT) : 60;
  if ($limit <= 0) return true;
  $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'x';
  $ip = explode(',', $ip)[0];
  $file = sys_get_temp_dir() . '/mapo_ia_rl_' . substr(sha1($ip), 0, 16) . '.json';
  $now = time();
  $hits = [];
  if (file_exists($file)) {
    $hits = json_decode(@file_get_contents($file), true);
    if (!is_array($hits)) $hits = [];
  }
  $hits = array_values(array_filter($hits, function ($t) use ($now) { return $t > $now - 3600; }));
  if (count($hits) >= $limit) return false;
  $hits[] = $now;
  @file_put_contents($file, json_encode($hits));
  return true;
}

// ════════════════════════════════════════════════════════════════════
//  Vérification du jeton Firebase (RS256). Retourne l'uid ou null.
// ════════════════════════════════════════════════════════════════════
function verifyFirebaseToken() {
  if (!defined('FIREBASE_PROJECT')) return null;
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) return null;
  $idToken = $m[1];

  $b64 = function ($s) { return base64_decode(strtr($s, '-_', '+/')); };
  $parts = explode('.', $idToken);
  if (count($parts) !== 3) return null;
  $h = json_decode($b64($parts[0]), true);
  $p = json_decode($b64($parts[1]), true);
  $sig = $b64($parts[2]);
  if (($h['alg'] ?? '') !== 'RS256' || empty($h['kid'])) return null;
  if (($p['aud'] ?? '') !== FIREBASE_PROJECT
    || ($p['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT
    || ($p['exp'] ?? 0) < time()
    || empty($p['sub'])) return null;

  $cacheFile = sys_get_temp_dir() . '/firebase_google_certs.json';
  $certs = null;
  if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 3600) {
    $certs = json_decode(file_get_contents($cacheFile), true);
  }
  if (!$certs) {
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
    $raw = @file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', false, $ctx);
    if ($raw === false) return null;
    $certs = json_decode($raw, true);
    @file_put_contents($cacheFile, $raw);
  }
  $cert = $certs[$h['kid']] ?? null;
  if (!$cert) return null;
  $pub = openssl_pkey_get_public($cert);
  $ok = openssl_verify($parts[0] . '.' . $parts[1], $sig, $pub, OPENSSL_ALGO_SHA256);
  return $ok === 1 ? $p['sub'] : null;
}
