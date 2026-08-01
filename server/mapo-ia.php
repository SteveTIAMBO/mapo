<?php
/**
 * MAPO — Génération d'appréciations de bulletin assistée par IA.
 *
 * Appelé par l'app école (même domaine → pas de CORS) depuis le bulletin :
 * le directeur clique « Générer avec l'IA », l'app envoie les données de
 * l'élève (moyennes, rang, mention, matières) et le proxy renvoie une
 * appréciation rédigée en français.
 *
 * Sécurité :
 *   - Jeton Firebase vérifié (RS256 Google) pour les utilisateurs connectés.
 *   - Repli démo : si IA_DEMO_OPEN, génération autorisée sans connexion mais
 *     plafonnée par IP (anti-abus / anti-épuisement de la clé).
 *   - La clé API vit dans mapo-ia-config.php (protégé par .htaccess). Absente
 *     ou non remplie → réponse "not_configured" → l'app bascule en simulation
 *     (appréciation générée localement, gratuite).
 *
 * Confidentialité (anonymisation avant l'IA) :
 *   - Le PRÉNOM de l'élève n'est JAMAIS transmis au fournisseur IA : il est
 *     remplacé par un jeton neutre (PRENOM_ELEVE) AVANT l'appel, puis
 *     ré-injecté dans le texte renvoyé, côté serveur (voir deanonymize()).
 *     Le modèle ne reçoit que des données pseudonymisées (moyennes, rang,
 *     mention) — non rattachables à une personne nommée.
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

// ── Diagnostic NON secret (GET ?diag=1) ───────────────────────────────
// Renseigne QUELS fournisseurs reçoivent les données (bloquant no-training #38)
// SANS jamais exposer la clé : celle-ci voyage dans l'en-tête Authorization, pas
// dans l'URL de base. On ne renvoie que le fournisseur texte, le HOST de la base
// vision (où partent les PHOTOS) et le modèle — tous non secrets.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['diag'])) {
  header('Content-Type: application/json');
  $cfg = __DIR__ . '/mapo-ia-config.php';
  $out = ['ok' => true, 'service' => 'mapo-ia', 'configured' => false];
  if (file_exists($cfg)) {
    require $cfg;
    $out['configured'] = defined('IA_API_KEY') && IA_API_KEY !== '' && strpos(IA_API_KEY, 'A_REMPLIR') !== 0;
    $out['text_provider'] = defined('IA_PROVIDER') ? IA_PROVIDER : 'anthropic';
    $base = defined('IA_OPENAI_BASE') ? IA_OPENAI_BASE : 'https://api.openai.com/v1';
    $out['vision_base_host'] = parse_url($base, PHP_URL_HOST);   // les photos partent TOUJOURS par ce host
    $out['model'] = defined('IA_MODEL') ? IA_MODEL : null;
    $out['models'] = [                                            // override config par palier (null = pas d'override)
      'mini'   => defined('IA_MODEL_MINI') ? IA_MODEL_MINI : null,
      'reason' => defined('IA_MODEL_REASON') ? IA_MODEL_REASON : null,
      'vision' => defined('IA_MODEL_VISION') ? IA_MODEL_VISION : null,
    ];
    $out['effective'] = [                                         // modèle RÉELLEMENT utilisé par palier
      'mini'   => modelForTask('appreciation'),
      'reason' => modelForTask('tutor_quiz'),
      'vision' => modelForTask('vision_copie'),
    ];
  }
  echo json_encode($out); exit;
}

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
$task = in_array(($body['task'] ?? 'appreciation'), ['appreciation', 'tutor_quiz', 'dictee', 'vision_copie', 'vision_cours', 'vision_registre', 'vision_bulletin', 'vision_edt', 'extract_modules', 'orientation', 'orientation6c', 'bilan6c', 'prepa_examen', 'course_plan', 'commande', 'pedagogie', 'eval_reponse', 'dictee_correction', 'tuteur_chat', 'translate'], true) ? $body['task'] : 'appreciation';

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

// ── Crédits MAPO+ (B2C) ────────────────────────────────────────────────
// Décompte uniquement pour les requêtes MAPO+ marquées `metered` (le B2C envoie
// ce drapeau ; l'espace ÉCOLE ne le fait pas → non décompté, l'école paie).
// On VÉRIFIE avant l'appel (bloque à 0), on DÉCOMPTE après succès (pas de
// crédit perdu si l'IA échoue). Source de vérité = registre serveur par uid.
$metered = $uid && !empty($body['metered']);
$coutTokens = 0;
if ($metered) {
  require_once __DIR__ . '/mapo-credits-lib.php';
  $coutTokens = mapo_cout_task($task); // coût en tokens de cette action
  if (!mc_hasTokens($uid, $coutTokens)) {
    echo json_encode(['ok' => false, 'error' => 'credits_epuises']); exit;
  }
}

// ── 3. Construire les prompts (selon la tâche) ────────────────────────
list($system, $user, $maxTokens, $noReason, $image) = buildPrompts($task, $data);

// ── 4. Appeler le fournisseur ─────────────────────────────────────────
$provider = defined('IA_PROVIDER') ? IA_PROVIDER : 'anthropic';
// Frugalité : chaque tâche prend le modèle le PLUS ÉCONOME encore adéquat
// (palier mini / raisonnement / vision → modèle configurable, défaut IA_MODEL).
$model = modelForTask($task);
// La vision (copie d'examen) passe toujours par le fournisseur multimodal.
// Anthropic gère le texte seul ici.
$r = ($provider === 'anthropic' && !$image)
  ? callAnthropic($system, $user, $maxTokens, $model)
  : callOpenAICompat($system, $user, $maxTokens, $noReason, $image, $model);

if (!empty($r['ok'])) {
  // Ré-injection du prénom réel : il n'a jamais été transmis au fournisseur IA
  // (envoyé sous forme du jeton PRENOM_ELEVE) → on le restaure ici, côté serveur.
  $text = deanonymize(trim($r['text']), $task, $data);
  // Succès → on décompte le coût en tokens (si requête MAPO+ metered) et on
  // renvoie la jauge (solde + plafond) pour un affichage immédiat.
  $tokens = null; $cap = null;
  if ($metered) { $tokens = mc_consume($uid, $coutTokens); $st = mc_state($uid); $cap = mc_weeklyCap($st['offreId']); }
  echo json_encode(['ok' => true, 'text' => $text, 'provider' => $provider, 'tokens' => $tokens, 'cap' => $cap]);
} else {
  echo json_encode(['ok' => false, 'error' => 'ia_echec', 'code' => $r['code'] ?? null, 'detail' => $r['detail'] ?? null]);
}

// ════════════════════════════════════════════════════════════════════
//  Construction des prompts
// ════════════════════════════════════════════════════════════════════
function buildPrompts($task, $d) {
  if ($task === 'tutor_quiz') return buildTutorQuizPrompts($d);
  if ($task === 'dictee') return buildDicteePrompts($d);
  if ($task === 'dictee_correction') return buildDicteeCorrectionPrompts($d);
  if ($task === 'appariement') return buildAppariementPrompts($d);
  if ($task === 'vision_copie') return buildVisionPrompts($d);
  if ($task === 'vision_cours') return buildVisionCoursPrompts($d);
  if ($task === 'vision_registre') return buildVisionRegistrePrompts($d);
  if ($task === 'vision_bulletin') return buildVisionBulletinPrompts($d);
  if ($task === 'vision_edt') return buildVisionEdtPrompts($d);
  if ($task === 'extract_modules') return buildExtractModulesPrompts($d);
  if ($task === 'orientation') return buildOrientationPrompts($d);
  if ($task === 'orientation6c') return buildOrientation6cPrompts($d);
  if ($task === 'bilan6c') return buildBilan6cPrompts($d);
  if ($task === 'prepa_examen') return buildPrepaExamenPrompts($d);
  if ($task === 'course_plan') return buildCoursePlanPrompts($d);
  if ($task === 'commande') return buildCommandePrompts($d);
  if ($task === 'pedagogie') return buildPedagogiePrompts($d);
  if ($task === 'eval_reponse') return buildEvalReponsePrompts($d);
  if ($task === 'tuteur_chat') return buildTuteurChatPrompts($d);
  if ($task === 'translate') return buildTranslatePrompts($d);
  return buildAppreciationPrompts($d);
}

// ── Traduction de libellés d'interface (2e langue d'accessibilité) ──────
// Traduit une liste de courts libellés d'UI (menu, titres, boutons) vers une
// langue cible. Renvoie un JSON {"t":[...]} dans le MÊME ORDRE. Non facturé.
function buildTranslatePrompts($d) {
  $texts = is_array($d['texts'] ?? null) ? array_slice(array_values($d['texts']), 0, 80) : [];
  $texts = array_map(function ($s) { return clean((string) $s, 160); }, $texts);
  $target = clean($d['target'] ?? '', 40);
  $source = clean($d['source'] ?? 'French', 40);
  $system = "You are a professional UI localizer for a school/tutoring mobile app. "
    . "Each string of the given JSON array is a short UI label written in French or English. "
    . "Translate each of them into {$target}. "
    . "Keep each translation SHORT and natural for an app interface (menu items, section titles, buttons). "
    . "Preserve placeholders such as {name}, {n}, {subject} EXACTLY as written. "
    . "Return ONLY a compact JSON object of the form {\"t\":[\"...\",\"...\"]} with EXACTLY the same number of items, in the SAME ORDER, and nothing else.";
  $u = json_encode($texts, JSON_UNESCAPED_UNICODE);
  return [$system, $u, 1500, true, null];
}

// ── Assistant enseignant : prépare un cours / devoir / examen ──────────
// Génère le CONTENU pédagogique réel (pas une intention) : pour un devoir ou
// un examen, le sujet ET le corrigé séparés (le prof montre le sujet sans
// les réponses) ; pour un cours, un plan/déroulé exploitable.
function buildPedagogiePrompts($d) {
  $type    = in_array(($d['type'] ?? 'devoir'), ['cours', 'devoir', 'examen'], true) ? $d['type'] : 'devoir';
  $matiere = clean($d['matiere'] ?? '', 50);
  $niveau  = clean($d['niveau'] ?? '', 30);
  $theme   = clean($d['theme'] ?? '', 6000);
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

// ── Chat tuteur MIAPO (MAPO+ / B2C) : assistant pédagogique SOCRATIQUE ──
// L'apprenant (élève / étudiant / adulte en formation) discute librement avec
// MIAPO. But : cultiver la COMPRÉHENSION et l'esprit critique, PAS faire le
// devoir à sa place. Réponse en TEXTE simple (pas de JSON).
function buildTuteurChatPrompts($d) {
  $message  = clean($d['message'] ?? '', 1500);
  $niveau   = clean($d['niveau'] ?? '', 40);
  $matieres = clean($d['matieres'] ?? '', 600);
  $cours    = clean($d['cours'] ?? '', 6000);
  $digest   = clean($d['digest'] ?? '', 1500); // sous-RAG perso : profil compact de l'apprenant
  $historique = clean($d['historique'] ?? '', 3000);
  $internet = !empty($d['internet']);
  // Prénom : reçu sous forme de jeton [PRENOM] (le vrai prénom ne quitte pas le
  // navigateur) ; MIAPO l'emploie tel quel, le client le remplace au retour.
  $prenom = clean($d['prenom'] ?? '', 40);
  // Centres d'intérêt de l'apprenant → exemples concrets et parlants (motivation).
  $interets = clean($d['interets'] ?? '', 500);
  $langue   = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';

  if ($langue === 'en') {
    $system = "You are MIAPO, a caring educational tutor for a learner (school pupil, student, or adult in training). "
      . "Your MISSION is to cultivate the learner's understanding and critical thinking — NOT to do the work for them. "
      . "Rules: for an EXPLANATION request, explain clearly with an example, then ask ONE question to check understanding. "
      . "For HOMEWORK HELP, NEVER write the whole assignment upfront: first make sure the learner understands the concepts "
      . "(Socratic method — guiding questions, hints), make them reason; only give the full answer AFTER checking understanding, "
      . "or if they explicitly ask again after trying. For a REVISION PLAN or an EXERCISE, propose a plan or an exercise fit for "
      . "their level and subjects. Be concise, kind, encouraging, and address the learner directly as 'you'. "
      . "Base yourself FIRST on the learner's own course material provided below. ";
    $system .= $internet ? "You may also draw on your general knowledge when useful. " : "If the info is not in the provided material, say so plainly and do not invent it. ";
    $system .= "CRITICAL THINKING (always): NEVER give the final answer upfront, even if the learner insists — lead them to reason and state THEIR OWN answer first (guiding questions, hints, counter-examples). End with a question that pushes them to justify, verify or challenge their answer. When useful, remind them that an AI can make mistakes: invite them to cross-check with their course or a reliable source rather than take your word for it. The goal is to build their autonomy and critical thinking, not to do the work for them. ";
    if ($prenom !== '') $system .= "The learner's first name is represented by the token {$prenom} — use it AS-IS, sparingly, for warmth/encouragement (NOT as a greeting), without overusing it. ";
    if ($interets !== '') $system .= "When it helps, ANCHOR your examples in what the learner enjoys ({$interets}) to make concepts concrete and meaningful — without forcing it. ";
    $system .= "IMPORTANT: greet (say 'Hello') ONLY on the very first message. If a 'Recent conversation' section appears below, NEVER greet again and do not write 'Hello' — continue straight to the substance. ";
    $system .= "If a LEARNER PROFILE is provided below (strengths, subjects, today's form, recent difficulty…), ADAPT your language, examples, pace and pedagogy to it — WITHOUT quoting the profile back to the learner. ";
    $system .= "YOU ARE A TEXT TUTOR: you cannot open a quiz, an exercise or any app screen yourself. NEVER announce that you are launching or starting a quiz/exercise (e.g. do NOT say 'let's start a quiz' or 'launching a quiz'). To practise with a quiz, INVITE the learner to tap the 'Quiz' revision type themselves. When an explanation exchange is going well, either DEEPEN it (a tougher check, the next notion) or give a SHORT synthesis of what was learned — never end the dialogue abruptly with a single flat sentence. ";
    $system .= "Answer in plain text (no JSON, no markdown code fences).";
    $lvl = 'Learner level'; $subj = 'Subjects/modules'; $crs = 'Learner course material'; $hist = 'Recent conversation'; $msg = "Learner's message"; $prof = 'Learner profile (adapt to it)';
    $none = 'unspecified';
  } else {
    $system = "Tu es MIAPO, un tuteur pédagogique bienveillant pour un apprenant (élève, étudiant ou adulte en formation). "
      . "Ta MISSION : cultiver la COMPRÉHENSION et l'esprit critique de l'apprenant — PAS faire le travail à sa place. "
      . "Règles : pour une demande d'EXPLICATION, explique clairement avec un exemple, puis pose UNE question pour vérifier la compréhension. "
      . "Pour une AIDE AUX DEVOIRS, ne rédige JAMAIS le devoir entier d'emblée : assure-toi d'abord que l'apprenant comprend les concepts "
      . "(méthode socratique — questions guidées, indices), fais-le raisonner ; ne donne la réponse complète QU'APRÈS avoir vérifié la "
      . "compréhension, ou s'il le redemande explicitement après avoir essayé. Pour un PROGRAMME DE RÉVISION ou un EXERCICE, propose un plan "
      . "ou un exercice adapté à son niveau et à ses matières. Sois concis, bienveillant, encourageant, et TUTOIE l'apprenant. "
      . "Base-toi D'ABORD sur les cours de l'apprenant fournis ci-dessous. ";
    $system .= $internet ? "Tu peux aussi t'appuyer sur tes connaissances générales lorsque c'est utile. " : "Si l'information n'est pas dans les cours fournis, dis-le franchement et n'invente pas. ";
    $system .= "ESPRIT CRITIQUE (toujours) : ne donne JAMAIS la réponse finale d'emblée, même si l'apprenant insiste — amène-le à raisonner et à formuler SA PROPRE réponse d'abord (questions guidées, indices, contre-exemples). Termine par une question qui le pousse à justifier, vérifier ou remettre en question sa réponse. Quand c'est utile, rappelle qu'une IA peut se tromper : invite-le à recouper avec son cours ou une source fiable plutôt qu'à te croire sur parole. L'objectif est de développer son autonomie et son esprit critique, pas de lui mâcher le travail. ";
    if ($prenom !== '') $system .= "Le prénom de l'apprenant est représenté par le jeton {$prenom} — emploie-le TEL QUEL, avec parcimonie, pour la chaleur/l'encouragement (PAS comme une salutation), sans en abuser. ";
    if ($interets !== '') $system .= "Quand c'est utile, ANCRE tes exemples dans ce que l'apprenant aime ({$interets}) pour rendre les concepts concrets et parlants — sans forcer. ";
    $system .= "IMPORTANT : ne dis « Bonjour » qu'au TOUT PREMIER message. Si une section « Conversation récente » figure ci-dessous, NE RESALUE JAMAIS et n'écris pas « Bonjour » — enchaîne directement sur le fond. ";
    $system .= "Si un PROFIL de l'apprenant est fourni ci-dessous (forces, matières, forme du jour, ressenti récent…), ADAPTE ton langage, tes exemples, ton rythme et ta pédagogie à ce profil — SANS le citer explicitement à l'apprenant. ";
    $system .= "TU ES UN TUTEUR TEXTE : tu ne peux PAS ouvrir de quiz, d'exercice ni aucun écran de l'application toi-même. N'annonce JAMAIS que tu lances ou démarres un quiz/exercice (par ex. ne dis PAS « On lance un quiz » ni « je lance un quiz »). Pour s'entraîner avec un quiz, INVITE l'apprenant à toucher lui-même le type de révision « Quiz ». Quand un échange d'explication se passe bien, soit APPROFONDIS (une vérification plus exigeante, la notion suivante), soit fais une COURTE synthèse de ce qui a été appris — ne clôture jamais le dialogue brutalement par une seule phrase sèche. ";
    $system .= "Réponds en texte simple (pas de JSON, pas de barrières de code markdown).";
    $lvl = "Niveau de l'apprenant"; $subj = 'Matières/modules'; $crs = "Cours de l'apprenant"; $hist = 'Conversation récente'; $msg = "Message de l'apprenant"; $prof = "Profil de l'apprenant (adapte-toi)";
    $none = 'non précisé';
  }

  $u  = "{$lvl} : " . ($niveau !== '' ? $niveau : $none) . "\n";
  if ($matieres !== '') $u .= "{$subj} : {$matieres}\n";
  if ($digest !== '')   $u .= "{$prof} : {$digest}\n";
  if ($cours !== '')    $u .= "{$crs} :\n{$cours}\n";
  if ($historique !== '') $u .= "\n{$hist} :\n{$historique}\n";
  $u .= "\n{$msg} : \"{$message}\"";

  return [$system, $u, 1600, true, null];
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

// ── Moteur de cours : formation (hors-catalogue) → modules + plan JSON ─
// L'apprenant ADULTE (formation pro, certification, MBA, concours…) donne le
// NOM de sa formation et, s'il l'a, le TEXTE de son programme/syllabus collé.
// MIAPO le décompose en MODULES (avec les notions clés) puis bâtit un PLAN
// d'apprentissage séquencé par périodes. L'app pilote ensuite la boucle
// notes → quiz → progression sur CES modules.
function buildCoursePlanPrompts($d) {
  $formation = clean($d['formation'] ?? '', 120);
  $niveau    = clean($d['niveau'] ?? '', 80);
  // Programme collé : on PRÉSERVE les sauts de ligne (structure du syllabus),
  // on ne compresse que les espaces/tabulations, et on borne la longueur.
  $programme = trim(preg_replace('/[ \t]+/u', ' ', (string) ($d['programme'] ?? '')));
  $programme = preg_replace("/\n{3,}/", "\n\n", $programme);
  $programme = mb_substr($programme, 0, 4000);

  $system = "Tu es MIAPO, un tuteur pédagogique bienveillant et structuré qui accompagne un ADULTE dans sa formation "
    . "(formation professionnelle, certification, MBA, préparation à un concours, apprentissage autonome…). "
    . "À partir du NOM de la formation et, s'il est fourni, du TEXTE de son programme/syllabus, tu construis un PLAN DE COURS exploitable : "
    . "(1) tu décomposes la formation en 4 à 8 MODULES cohérents, chacun avec 2 à 5 NOTIONS clés à maîtriser ; "
    . "(2) tu bâtis un PLAN d'apprentissage séquencé par périodes (ex. « Semaine 1 »), en couvrant les modules dans un ordre logique "
    . "(des fondamentaux vers l'avancé), avec pour chaque période un OBJECTIF clair et 2 à 4 ACTIONS concrètes "
    . "(lire une notion, s'entraîner, faire un quiz MIAPO…). "
    . "Si un programme est fourni, appuie-toi FIDÈLEMENT dessus ; sinon, déduis un contenu réaliste et standard pour cette formation. "
    . "Reste concret et motivant, sans survendre. Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"modules\":[{\"titre\":\"...\",\"notions\":[\"...\"]}],\"plan\":[{\"periode\":\"...\",\"module\":\"...\",\"objectif\":\"...\",\"actions\":[\"...\"]}],\"conseil\":\"...\"}. "
    . "Donne 4 à 8 modules et 4 à 8 périodes dans le plan.";

  $u  = "Formation : " . ($formation !== '' ? $formation : 'non précisée') . "\n";
  if ($niveau !== '' && $niveau !== $formation) $u .= "Contexte / niveau : {$niveau}\n";
  if ($programme !== '') $u .= "\nProgramme / syllabus fourni par l'apprenant :\n\"\"\"\n{$programme}\n\"\"\"\n";
  else $u .= "\n(Aucun programme collé : déduis un contenu standard et réaliste pour cette formation.)\n";
  $u .= "\nProduis le plan de cours au format JSON demandé.";

  // reasoning_effort:none → tout le budget passe dans la sortie JSON (sinon tronqué).
  return [$system, $u, 2400, true, null];
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

// ── Bilan 6C : profil auto-évalué (6 scores /5) → forces + axes + comment ──
// À partir des 6 scores, MIAPO rédige un bilan personnalisé (2 points forts,
// 2 axes à améliorer + conseils concrets), au ton adapté au persona (enfant /
// élève / adulte en formation) et à la langue de l'app. N'invente pas de score.
function buildBilan6cPrompts($d) {
  $labels6c = [
    'creativite' => 'Créativité', 'esprit_critique' => 'Esprit critique', 'communication' => 'Communication',
    'cooperation' => 'Coopération', 'courage' => 'Courage', 'confiance' => 'Confiance',
  ];
  $comp = is_array($d['competences'] ?? null) ? $d['competences'] : [];
  $compLines = [];
  foreach ($labels6c as $k => $lab) {
    if (isset($comp[$k])) {
      $v = (float) $comp[$k]; if ($v < 0) $v = 0; if ($v > 5) $v = 5;
      $compLines[] = "{$lab} : " . number_format($v, 1, '.', '') . "/5";
    }
  }
  $persona = in_array(($d['persona'] ?? 'eleve'), ['enfant', 'eleve', 'adulte'], true) ? $d['persona'] : 'eleve';
  $niveau  = clean($d['niveau'] ?? '', 60);
  $formation = clean($d['formation'] ?? '', 100);
  $langue  = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';

  if ($langue === 'en') {
    $who = ['enfant' => 'a young learner', 'eleve' => 'a student', 'adulte' => 'an adult in training' . ($formation ? " ({$formation})" : '')][$persona];
    $system = "You are MIAPO, a caring and rigorous learning coach. You receive a SELF-ASSESSED competency profile based on the 6C "
      . "framework (Creativity, Critical thinking, Communication, Cooperation, Courage, Confidence — each rated out of 5) for {$who}. "
      . "Write a short, warm and honest feedback report addressed DIRECTLY to the person. Identify the 2 STRENGTHS (highest scores) and the "
      . "2 AREAS TO IMPROVE (lowest scores); for each area, give 2 to 3 CONCRETE, actionable tips (things to actually do). Never be harsh. "
      . "Reply STRICTLY in valid JSON, no markdown, EXACT format: "
      . "{\"synthese\":\"2 sentences summarising the profile\",\"forces\":[{\"competence\":\"...\",\"pourquoi\":\"why it is a strength\"}],\"axes\":[{\"competence\":\"...\",\"pourquoi\":\"why to work on it\",\"comment\":[\"tip 1\",\"tip 2\"]}],\"conseil\":\"one motivating closing sentence\"}. "
      . "Give EXACTLY 2 items in \"forces\" and 2 in \"axes\". Write everything in English.";
    $u = "Profile (6C, out of 5):\n" . ($compLines ? implode("\n", $compLines) : "(not provided)") . "\n";
    if ($niveau) $u .= "Level / class: {$niveau}\n";
    $u .= "\nProduce the report in the requested JSON.";
  } else {
    $who = ['enfant' => 'un jeune élève', 'eleve' => 'un élève ou étudiant', 'adulte' => 'un adulte en formation' . ($formation ? " ({$formation})" : '')][$persona];
    $tu = $persona === 'adulte' ? 'vous (vouvoiement)' : 'tu (tutoiement bienveillant)';
    $system = "Tu es MIAPO, un coach d'apprentissage bienveillant et rigoureux. On te donne un profil de compétences AUTO-ÉVALUÉ selon le "
      . "référentiel des 6C (Créativité, Esprit critique, Communication, Coopération, Courage, Confiance — chacune notée sur 5) pour {$who}. "
      . "Rédige un bilan court, chaleureux et honnête, adressé DIRECTEMENT à la personne en employant {$tu}. Repère les 2 POINTS FORTS (scores les "
      . "plus élevés) et les 2 AXES À AMÉLIORER (scores les plus bas) ; pour chaque axe, donne 2 à 3 conseils CONCRETS et actionnables (des choses à "
      . "faire vraiment). Ne sois jamais dur ni culpabilisant. Réponds STRICTEMENT en JSON valide, sans markdown, au format EXACT : "
      . "{\"synthese\":\"2 phrases qui résument le profil\",\"forces\":[{\"competence\":\"...\",\"pourquoi\":\"pourquoi c'est un point fort\"}],\"axes\":[{\"competence\":\"...\",\"pourquoi\":\"pourquoi travailler dessus\",\"comment\":[\"conseil 1\",\"conseil 2\"]}],\"conseil\":\"une phrase de clôture motivante\"}. "
      . "Donne EXACTEMENT 2 éléments dans \"forces\" et 2 dans \"axes\".";
    $u = "Profil (6C, sur 5) :\n" . ($compLines ? implode("\n", $compLines) : "(non fourni)") . "\n";
    if ($niveau) $u .= "Niveau / classe : {$niveau}\n";
    $u .= "\nProduis le bilan au format JSON demandé.";
  }

  // reasoning_effort:none → tout le budget passe dans la sortie JSON.
  return [$system, $u, 1500, true, null];
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
  // Profil élargi (texte libre) : passions/loisirs + métiers rêvés + âge → projection.
  $passions = clean($d['passions'] ?? '', 500);
  $metiers  = clean($d['metiers'] ?? '', 300);
  $age      = intval($d['age'] ?? 0);

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
    . "Si des CENTRES D'INTÉRÊT et des MÉTIERS qui l'attirent sont fournis, sers-t'en pour personnaliser l'adéquation et la motivation. "
    . "Tiens compte des TENDANCES DU MARCHÉ DE L'EMPLOI (rapport Future of Jobs 2025 du Forum économique mondial : forte croissance des métiers de la tech, des données et de l'IA, de l'analyse, de la transition écologique, ainsi que des compétences humaines comme l'adaptabilité ; déclin de certains postes administratifs et de saisie) pour éclairer les PERSPECTIVES d'avenir de chaque domaine — SANS inventer de métier ni d'école hors de la liste fournie. "
    . "L'HORIZON de projection dépend de l'âge : plus l'élève est jeune, plus tu restes large et prudent (les métiers évolueront d'ici son entrée sur le marché). "
    . "Dans le champ \"prudence\", précise TOUJOURS que ces pistes s'appuient sur des prédictions et l'état ACTUEL de l'emploi, que c'est un avis INDICATIF, et qu'il est recommandé de rencontrer un vrai conseiller d'orientation pour aller plus loin. "
    . "Réponds STRICTEMENT en JSON valide (sans markdown), au format EXACT : "
    . "{\"profil\":\"2 phrases sur son profil 6C\",\"recommandations\":[{\"domaine\":\"...\",\"adequation\":\"forte|moyenne\",\"pourquoi\":\"argumentaire lié à ses 6C et son niveau\",\"metiers_cles\":[\"...\"],\"etablissements_cles\":[\"...\"]}],\"conseil\":\"...\",\"prudence\":\"...\"}. "
    . "Donne 2 à 4 recommandations, classées.";

  // Langue de sortie : par défaut FR ; en 'en', on force l'anglais pour toutes
  // les valeurs du JSON (le format reste identique).
  $langue = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';
  if ($langue === 'en') {
    $system .= " IMPORTANT: write ALL the JSON string values (profil, pourquoi, metiers_cles, etablissements_cles, conseil, prudence) entirely in ENGLISH, while keeping the exact same JSON keys.";
  }

  $u  = "Pays visé : {$pays}\n";
  $u .= "Niveau scolaire : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  if ($age > 0) $u .= "Âge : {$age} ans\n";
  if ($compLines) $u .= "Profil de compétences (auto-évaluation) : " . implode(' · ', $compLines) . "\n";
  if ($forts)   $u .= "Matières fortes : " . implode(', ', $forts) . "\n";
  if ($faibles) $u .= "Matières faibles : " . implode(', ', $faibles) . "\n";
  if ($passions !== '') $u .= "Centres d'intérêt / passions : {$passions}\n";
  if ($metiers !== '')  $u .= "Métiers qui l'attirent : {$metiers}\n";
  $u .= "\nDomaines candidats (à argumenter, SANS rien ajouter d'autre) :" . ($candTxt !== '' ? $candTxt : ' (aucun)') . "\n";
  $u .= "\nProduis les recommandations argumentées au format JSON demandé.";

  // 2600 tokens : marge suffisante pour 4 recommandations détaillées (le format
  // JSON complet peut dépasser 1900 et se retrouver tronqué → JSON invalide → échec).
  return [$system, $u, 2600, true, null];
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

// ── Vision : TRANSCRIT une photo de COURS (manuel / cahier) en texte ──
// Restitue fidèlement le contenu pédagogique, SANS données personnelles
// (nom d'élève, numéro) : c'est un cours, pas une copie. Sert « Mes cours ».
function buildVisionCoursPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 40);
  $img = (string) ($d['image'] ?? '');
  if ($img !== '' && strpos($img, 'data:') !== 0) {
    $img = 'data:image/jpeg;base64,' . $img;
  }
  $system = "Tu transcris FIDÈLEMENT en texte le contenu pédagogique d'une photo "
    . "(page de manuel, de cours ou de cahier). Restitue tel quel : titres, définitions, "
    . "formules, listes, exemples — en texte clair et structuré (sauts de ligne conservés). "
    . "N'invente RIEN, n'ajoute aucun commentaire ni correction. "
    . "IMPORTANT : ne recopie AUCUNE donnée personnelle (nom d'élève, numéro, établissement) — ignore-les. "
    . "Si la photo n'est pas un cours lisible, réponds EXACTEMENT : (illisible).";
  $u = ($niveau !== '' ? "Niveau / classe : " . $niveau . "\n" : '')
    . "Transcris en texte le cours visible sur la photo.";
  return [$system, $u, 1600, true, $img];
}

// ── Vision : numérise un REGISTRE de classe (liste d'élèves) → JSON ────
function buildVisionRegistrePrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 40);
  // Image attendue en data URL (data:image/...;base64,XXXX) ou base64 brut.
  $img = (string) ($d['image'] ?? '');
  if ($img !== '' && strpos($img, 'data:') !== 0) {
    $img = 'data:image/jpeg;base64,' . $img;
  }

  $system = "Tu es un assistant de scolarité qui NUMÉRISE un registre de classe d'une école d'Afrique francophone. "
    . "On te fournit la PHOTO d'une liste d'élèves (registre, cahier d'appel, tableau ou liste manuscrite). "
    . "Extrais chaque élève avec : NOM (de famille), PRENOM, et SEXE ('M' ou 'F'). "
    . "Déduis le sexe du prénom si aucune colonne sexe n'est visible ; si tu n'es pas sûr, mets sexe=''. "
    . "Ignore les en-têtes, numéros de ligne, totaux et signatures. Si une classe est écrite sur le document, renseigne 'classe'. "
    . "N'invente AUCUN élève : ne renvoie que des lignes réellement lisibles. Si l'image n'est pas une liste d'élèves, renvoie eleves=[]. "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"classe\":\"...\",\"eleves\":[{\"nom\":\"...\",\"prenom\":\"...\",\"sexe\":\"M\"}]}. "
    . "Limite à 60 élèves maximum.";

  $u = "Classe / niveau indiqué par l'utilisateur : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  $u .= "Numérise la liste des élèves sur la photo et renvoie le JSON demandé.";

  // reasoning_effort:none (5e param via image) ; 2600 tokens pour une classe longue.
  return [$system, $u, 2600, true, $img];
}

// ── Vision : lit un BULLETIN de notes → JSON {matieres:[{matiere,note}]} ───
function buildVisionBulletinPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 40);
  $img = (string) ($d['image'] ?? '');
  if ($img !== '' && strpos($img, 'data:') !== 0) {
    $img = 'data:image/jpeg;base64,' . $img;
  }

  $system = "Tu lis un BULLETIN de notes scolaire (Afrique francophone) sur une PHOTO. "
    . "Extrais chaque MATIÈRE avec sa MOYENNE sur 20. "
    . "Convertis toute note exprimée sur une autre base vers /20 (ex. sur 10 → ×2). "
    . "Ignore les totaux, rangs, coefficients, appréciations et lignes non-matières. "
    . "Si une moyenne générale est visible, mets-la dans 'moyenne_generale' (sinon null). "
    . "N'invente AUCUNE note : ne renvoie que ce qui est lisible. Si l'image n'est pas un bulletin, renvoie matieres=[]. "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"moyenne_generale\":13.5,\"matieres\":[{\"matiere\":\"Mathématiques\",\"note\":12}]}. "
    . "\"note\" est un nombre entre 0 et 20. Limite à 20 matières.";

  $u = "Niveau / classe de l'élève : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  $u .= "Lis le bulletin sur la photo et renvoie le JSON demandé.";

  return [$system, $u, 1800, true, $img];
}

// ── Vision : lit un EMPLOI DU TEMPS → JSON {creneaux:[{jour,heure,matiere}]} ──
function buildVisionEdtPrompts($d) {
  $niveau = clean($d['niveau'] ?? '', 40);
  $img = (string) ($d['image'] ?? '');
  if ($img !== '' && strpos($img, 'data:') !== 0) {
    $img = 'data:image/jpeg;base64,' . $img;
  }

  $system = "Tu lis un EMPLOI DU TEMPS scolaire/universitaire sur une PHOTO. "
    . "Extrais chaque cours avec : JOUR (lundi, mardi, mercredi, jeudi, vendredi, samedi ou dimanche, en minuscules), "
    . "HEURE de début au format HH:MM (24h), et MATIÈRE (nom court). "
    . "Ignore les pauses, récréations et cases vides. "
    . "N'invente AUCUN cours : ne renvoie que ce qui est lisible. Si l'image n'est pas un emploi du temps, renvoie creneaux=[]. "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"creneaux\":[{\"jour\":\"lundi\",\"heure\":\"08:00\",\"matiere\":\"Mathématiques\"}]}. "
    . "Limite à 40 créneaux.";

  $u = "Niveau / classe : " . ($niveau !== '' ? $niveau : 'non précisé') . "\n";
  $u .= "Lis l'emploi du temps sur la photo et renvoie le JSON demandé.";

  return [$system, $u, 2200, true, $img];
}

// ── Extraction des MODULES d'une formation → JSON {modules:[...]} ──────
function buildExtractModulesPrompts($d) {
  $formation = clean($d['formation'] ?? '', 140);
  $ecole     = clean($d['ecole'] ?? '', 140);
  $texte     = clean($d['texte'] ?? '', 4000);

  $system = "Tu aides un apprenant à structurer sa formation. On te donne le NOM de sa formation"
    . ($ecole !== '' ? ", son établissement" : "")
    . " et éventuellement un descriptif du programme. "
    . "Renvoie la liste des MODULES / MATIÈRES / UE de la formation. "
    . "Si un descriptif est fourni, extrais-en les modules réellement cités. "
    . "Sinon, propose les modules TYPIQUES de ce type de formation (l'apprenant les ajustera). "
    . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"modules\":[\"...\",\"...\"]}. 8 à 16 modules, noms courts.";

  $u = "Formation : " . ($formation !== '' ? $formation : 'non précisée') . "\n";
  if ($ecole !== '') $u .= "Établissement : {$ecole}\n";
  if ($texte !== '') $u .= "Descriptif / programme fourni :\n{$texte}\n";
  $u .= "Renvoie le JSON des modules.";

  return [$system, $u, 900, true, null];
}

// ── Tuteur de révision : génère un quiz QCM en JSON ───────────────────
function buildTutorQuizPrompts($d) {
  $matiere = clean($d['matiere'] ?? 'Culture générale', 50);
  $niveau  = clean($d['niveau'] ?? '', 30);
  $count   = isset($d['nombre']) ? max(3, min(12, intval($d['nombre']))) : 10;
  $themes  = clean($d['themes'] ?? '', 6000);
  $cours   = clean($d['cours'] ?? '', 8000); // cours importé par l'élève (source prioritaire)
  $digest  = clean($d['digest'] ?? '', 1500); // sous-RAG perso : profil compact (privé) de l'apprenant
  // Difficulté ADAPTATIVE SANS PLAFOND : plus l'apprenant réussit, plus ça se corse.
  $diff    = isset($d['difficulte']) ? max(1, intval($d['difficulte'])) : 1;
  $contexte = "Élève d'Afrique francophone (programme proche des systèmes camerounais/sénégalais/français).";

  $diffTable = [
    1 => "Niveau 1 (découverte) : questions simples sur les définitions et les bases, une seule notion par question.",
    2 => "Niveau 2 (application directe) : application d'une règle/formule connue sur des cas simples.",
    3 => "Niveau 3 (intermédiaire) : questions de compréhension qui combinent deux notions, distracteurs plausibles.",
    4 => "Niveau 4 (avancé) : raisonnement en plusieurs étapes, pièges classiques, exige de la rigueur.",
    5 => "Niveau 5 (expert) : problèmes exigeants type examen, analyse fine, distracteurs très proches de la bonne réponse.",
  ];
  // Au-delà de 5 : on continue de monter l'exigence (type concours/olympiade).
  $diffDesc = $diff <= 5 ? $diffTable[$diff]
    : "Niveau {$diff} (expert confirmé, au-delà de l'examen) : problèmes très exigeants de type concours/olympiade, "
    . "raisonnement en plusieurs étapes, cas limites et distracteurs extrêmement proches ; monte encore d'un cran l'exigence par rapport au niveau 5.";

  $system = "Tu es un tuteur pédagogique francophone bienveillant et rigoureux qui fait PROGRESSER l'élève dans la durée. {$contexte} "
    . "Tu crées un quiz de révision de {$count} questions à choix multiple sur la matière demandée, adapté au niveau de classe ET au niveau de difficulté indiqué. "
    . "DIFFICULTÉ DEMANDÉE — {$diffDesc} Calibre VRAIMENT les questions sur ce niveau de difficulté (ni plus facile, ni plus dur). "
    . "Méthode socratique : pour chaque question, l'INDICE oriente la réflexion SANS donner la réponse ; l'EXPLICATION justifie la bonne réponse. "
    . "Sois BREF : indice en une phrase, explication en une à deux phrases maximum. "
    . "Langue simple, phrases courtes (contexte bas débit, texte seul). Les questions doivent être factuellement exactes et avoir une seule bonne réponse. "
    . "PRIORITÉ À LA SOURCE : si un COURS DE L'ÉLÈVE est fourni ci-dessous, tire les questions EN PRIORITÉ de son contenu (notions, exemples, formules qui y figurent) ; complète par le programme officiel seulement si nécessaire. Si AUCUN cours n'est fourni, appuie-toi sur le programme officiel (référentiel national/manuels validés). "
    . "Indique la provenance dans le champ \"source\" : \"cours\" (questions tirées du cours fourni), \"referentiel\" (programme officiel, aucun cours fourni), ou \"mix\" (les deux). "
    . "Réponds STRICTEMENT en JSON valide, sans aucun texte avant ou après, sans bloc de code markdown. "
    . "Format EXACT : {\"source\":\"cours|referentiel|mix\",\"questions\":[{\"q\":\"...\",\"choices\":[\"...\",\"...\",\"...\",\"...\"],\"answer\":0,\"hint\":\"...\",\"explanation\":\"...\"}]}. "
    . "Chaque question a exactement 4 propositions ; \"answer\" est l'index (0 à 3) de la bonne proposition.";
  // Sous-RAG perso : personnalise le CONTEXTE (exemples, ton) sans jamais toucher
  // à la difficulté (pilotée par le niveau adaptatif) ni recopier le profil.
  if ($digest !== '') $system .= " PERSONNALISATION : un PROFIL de l'apprenant est fourni ci-dessous (forces, centres d'intérêt, forme du jour…). ANCRE le contexte et les exemples des questions dans ses centres d'intérêt, et adapte le TON pour le motiver — MAIS conserve EXACTEMENT le niveau de difficulté demandé plus haut, et ne cite JAMAIS le profil dans le texte des questions.";

  $u = "Matière : {$matiere}\n";
  if ($niveau !== '') $u .= "Niveau / classe : {$niveau}\n";
  $u .= "Nombre de questions : {$count}\n";
  if ($themes !== '') $u .= "Cibler en priorité ces notions à revoir : {$themes}\n";
  if ($digest !== '') $u .= "Profil de l'apprenant (ancrer les exemples et le ton — NE PAS recopier dans les questions) : {$digest}\n";
  if ($cours !== '') $u .= "\nCOURS DE L'ÉLÈVE (source PRIORITAIRE — tire les questions de ce contenu) :\n{$cours}\n";
  $u .= "\nGénère le quiz au format JSON demandé.";

  // Assez de tokens pour un quiz complet de 10 questions (~514 tok/question
  // observés ; 3600 ne laissait passer que ~7 questions → on monte à 5400).
  // Le parseur récupère quand même les questions complètes si jamais tronqué.
  return [$system, $u, 5400, false, null];
}

// ── Dictée : génère un court texte à DICTER (lu à voix haute côté client) ──
// Renvoie un titre + des phrases courtes (une par item) adaptées au niveau, et le
// texte COMPLET de référence pour la correction. Pas de correction ici : c'est
// juste le contenu à énoncer. La correction réutilise la tâche eval_reponse.
function buildDicteePrompts($d) {
  $matiere = clean($d['matiere'] ?? 'Français', 50);
  $niveau  = clean($d['niveau'] ?? '', 40);
  $cours   = clean($d['cours'] ?? '', 4000);
  $digest  = clean($d['digest'] ?? '', 1500); // sous-RAG perso : profil compact (privé) de l'apprenant
  $langue  = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';
  // Longueur CHOISIE par l'apprenant (la difficulté, elle, reste pilotée par le
  // niveau/la progression — pas par la longueur).
  $longueur = in_array(($d['longueur'] ?? 'moyenne'), ['courte', 'moyenne', 'longue'], true) ? $d['longueur'] : 'moyenne';
  if ($langue === 'en') {
    $longEn = $longueur === 'courte' ? '4 to 5 sentences' : ($longueur === 'longue' ? '10 to 12 sentences' : '7 to 8 sentences');
    $system = "You are a caring teacher preparing a DICTATION for a learner. Produce a text of {$longEn} — the learner chose this length. "
      . "Adapt the DIFFICULTY — vocabulary, agreements, homophones, verb endings — to the given LEVEL, NOT to the length. "
      . "Keep sentences clear. If the learner's course material is provided, base the vocabulary on it. "
      . "Reply STRICTLY as valid JSON, no text around it: {\"titre\":\"...\",\"phrases\":[\"sentence 1\",\"sentence 2\"]}.";
    if ($digest !== '') $system .= " If a learner PROFILE is provided below (interests, level, today's form), pick a THEME the learner enjoys for the text — while KEEPING the target spelling/grammar difficulties for their level. Never copy the profile into the text.";
  } else {
    $longFr = $longueur === 'courte' ? '4 à 5 phrases' : ($longueur === 'longue' ? '10 à 12 phrases' : '7 à 8 phrases');
    $system = "Tu es un enseignant bienveillant qui prépare une DICTÉE pour un apprenant. Produis un texte de {$longFr} — c'est l'apprenant qui a choisi cette longueur. "
      . "Adapte la DIFFICULTÉ — vocabulaire, accords, homophones, terminaisons de verbes — au NIVEAU indiqué, PAS à la longueur. "
      . "Phrases claires. Si un cours de l'apprenant est fourni, appuie le vocabulaire dessus. "
      . "Réponds STRICTEMENT en JSON valide, sans texte autour : {\"titre\":\"...\",\"phrases\":[\"phrase 1\",\"phrase 2\"]}.";
    if ($digest !== '') $system .= " Si un PROFIL de l'apprenant est fourni ci-dessous (centres d'intérêt, niveau, forme du jour), choisis un THÈME de texte qui lui plaît — en GARDANT les difficultés d'orthographe/grammaire visées pour son niveau. Ne recopie jamais le profil dans le texte.";
  }
  $u = "Matière : {$matiere}\n" . ($niveau !== '' ? "Niveau / classe : {$niveau}\n" : '');
  if ($digest !== '') $u .= "Profil de l'apprenant (choisir un thème qui lui plaît — ne pas recopier) : {$digest}\n";
  if ($cours !== '') $u .= "Cours de l'apprenant (vocabulaire de référence) :\n{$cours}\n";
  $u .= "\nGénère la dictée au format JSON demandé.";
  return [$system, $u, 1400, true, null];
}

// ── Correction de dictée : compare la copie de l'apprenant au texte de référence.
// Renvoie une note + TOUTES les fautes réelles, chacune avec l'extrait EXACT écrit
// par l'apprenant (pour le surlignage côté client), la correction, le POURQUOI
// (la règle) et un type. Distincte de eval_reponse (qui juge le fond d'une réponse
// rédigée) : ici il n'y a pas de « fond », seulement l'orthographe/grammaire.
function buildDicteeCorrectionPrompts($d) {
  $niveau    = clean($d['niveau'] ?? '', 40);
  $reference = clean($d['reference'] ?? '', 4000);
  $reponse   = clean($d['reponse'] ?? '', 4000);
  $langue    = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';

  if ($langue === 'en') {
    $system = "You are a caring, precise teacher correcting a learner's DICTATION. You are given the REFERENCE text and the LEARNER'S copy. "
      . "Compare them and list EVERY REAL error the learner made (spelling, agreement, verb ending, homophone, punctuation, missing capital, omitted/added word). "
      . "Do NOT invent errors and do NOT stop early: report them ALL (up to ~15). If there is no error, return an empty list. "
      . "For EACH error: \"extrait\" = the wrong fragment EXACTLY as the LEARNER wrote it (verbatim, so it can be found in their copy — never the correct form); "
      . "\"correction\" = the correct form; \"pourquoi\" = a short, clear explanation of the RULE (why it is wrong), understandable at the learner's level; "
      . "\"type\" = one of \"orthographe\",\"accord\",\"conjugaison\",\"homophone\",\"ponctuation\",\"majuscule\",\"oubli\". "
      . "Also give \"note\" (orthographic accuracy out of 10) and a short encouraging \"bilan\" (1-2 sentences). "
      . "Reply STRICTLY as valid JSON, no text or markdown around it, EXACT format: "
      . "{\"note\":0,\"bilan\":\"...\",\"fautes\":[{\"extrait\":\"...\",\"correction\":\"...\",\"pourquoi\":\"...\",\"type\":\"...\"}]}.";
  } else {
    $system = "Tu es un enseignant bienveillant et précis qui corrige la DICTÉE d'un apprenant. On te donne le texte de RÉFÉRENCE et la COPIE de l'apprenant. "
      . "Compare-les et relève CHAQUE faute RÉELLE commise par l'apprenant (orthographe, accord, terminaison de verbe, homophone, ponctuation, majuscule manquante, mot oublié ou ajouté). "
      . "N'invente AUCUNE faute et ne t'arrête pas trop tôt : relève-les TOUTES (jusqu'à ~15). S'il n'y a aucune faute, renvoie une liste vide. "
      . "Pour CHAQUE faute : \"extrait\" = le fragment fautif EXACTEMENT tel que l'APPRENANT l'a écrit (mot pour mot, pour qu'on le retrouve dans sa copie — jamais la forme correcte) ; "
      . "\"correction\" = la forme correcte ; \"pourquoi\" = une explication COURTE et claire de la RÈGLE (pourquoi c'est faux), compréhensible à son niveau ; "
      . "\"type\" = l'un de \"orthographe\",\"accord\",\"conjugaison\",\"homophone\",\"ponctuation\",\"majuscule\",\"oubli\". "
      . "Donne aussi \"note\" (exactitude orthographique sur 10) et un court \"bilan\" encourageant (1-2 phrases). "
      . "Réponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
      . "{\"note\":0,\"bilan\":\"...\",\"fautes\":[{\"extrait\":\"...\",\"correction\":\"...\",\"pourquoi\":\"...\",\"type\":\"...\"}]}.";
  }

  $u  = ($niveau !== '' ? "Niveau / classe : {$niveau}\n" : '');
  $u .= "\nTEXTE DE RÉFÉRENCE (la bonne version) :\n" . ($reference !== '' ? $reference : '(vide)') . "\n";
  $u .= "\nCOPIE DE L'APPRENANT (à corriger) :\n" . ($reponse !== '' ? $reponse : '(vide)') . "\n";
  $u .= "\nCorrige au format JSON demandé.";
  return [$system, $u, 1600, true, null];
}

// ── Appariement : génère des PAIRES à relier (jeu de matching) ──────────────
// Récupération par association (paired-associate) + double codage en mode visuel.
// Renvoie un titre + une liste de paires {a, b}. En mode VISUEL (jeune apprenant),
// b est UN emoji qui illustre le mot a (double codage, coût nul). La correction se
// fait côté client (l'apprenant relie a↔b), aucune bonne réponse à cacher ici.
function buildAppariementPrompts($d) {
  $matiere = clean($d['matiere'] ?? 'Culture générale', 50);
  $niveau  = clean($d['niveau'] ?? '', 40);
  $cours   = clean($d['cours'] ?? '', 6000);
  $digest  = clean($d['digest'] ?? '', 1500); // sous-RAG perso : profil compact (privé)
  $visuel  = !empty($d['visuel']);            // mode image/emoji (primaire)
  $langue  = (($d['langue'] ?? 'fr') === 'en') ? 'en' : 'fr';
  // Nombre de paires : croît AVEC la difficulté (sans plafond réel, borné à 8 pour
  // que l'écran reste jouable au doigt). Plus l'apprenant progresse, plus il y a
  // de paires et plus les associations sont fines.
  $diff  = isset($d['difficulte']) ? max(1, intval($d['difficulte'])) : 1;
  $count = max(4, min(8, 3 + $diff));
  // Termes déjà vus dans la session (colonne gauche des tours précédents) : on les
  // envoie pour que chaque niveau apporte du vocabulaire NEUF (sinon l'IA, à niveau
  // et matière constants, ressert les mêmes associations « évidentes »).
  $exclure = '';
  if (!empty($d['exclure']) && is_array($d['exclure'])) {
    $ex = array_slice(array_values(array_filter(array_map(function ($x) { return clean($x, 60); }, $d['exclure']))), 0, 40);
    $exclure = implode(' | ', $ex);
  }

  if ($langue === 'en') {
    $diffDesc = $diff <= 2 ? "obvious, well-known associations (basics)."
      : ($diff <= 4 ? "finer associations, items that are close and must be told apart."
      : "expert level: subtle associations, near-identical-looking items, no easy guess.");
    $system = "You are a caring teacher preparing a MATCHING exercise (pairs to connect) for a learner. "
      . "Produce {$count} PAIRS, each linking a left item (a) to its ONE correct right match (b), fit for the subject and level. "
      . "Depending on the subject: word↔definition, term↔symbol, word↔translation, date↔event, cause↔effect, etc. "
      . "Pairs must be UNAMBIGUOUS (exactly one correct match per item) and factually correct. Difficulty: {$diffDesc} ";
    if ($visuel) $system .= "VISUAL MODE (young learner): 'a' is a simple CONCRETE word, 'b' is ONE single emoji that depicts it "
      . "(e.g. {\"a\":\"cat\",\"b\":\"\xF0\x9F\x90\xB1\"}, {\"a\":\"sun\",\"b\":\"\xE2\x98\x80\xEF\xB8\x8F\"}). Use only concrete nouns depictable by a common emoji. ";
    if ($cours !== '') $system .= "If the learner's course is given below, draw the pairs FIRST from its content. ";
    if ($digest !== '') $system .= "If a learner PROFILE is given, anchor the items in their interests and adapt the tone — WITHOUT changing the difficulty above, and never copy the profile. ";
    if ($exclure !== '') $system .= "This is a NEW round for the same learner: the left items listed under 'Already used' have ALREADY been played — do NOT reuse them or trivial variants; introduce DIFFERENT, FRESH items so every level brings new vocabulary. ";
    $system .= "Reply STRICTLY as valid JSON, no text around it: {\"titre\":\"...\",\"paires\":[{\"a\":\"...\",\"b\":\"...\"}]}.";
  } else {
    $diffDesc = $diff <= 2 ? "associations évidentes et bien connues (bases)."
      : ($diff <= 4 ? "associations plus fines, avec des éléments proches à bien distinguer."
      : "niveau expert : associations subtiles, éléments d'apparence très proche, aucune réponse évidente.");
    $system = "Tu es un enseignant bienveillant qui prépare un exercice d'APPARIEMENT (paires à relier) pour un apprenant. "
      . "Produis {$count} PAIRES, chacune reliant un élément de gauche (a) à SON unique correspondant de droite (b), adaptées à la matière et au niveau. "
      . "Selon la matière : mot↔définition, terme↔symbole, mot↔traduction, date↔évènement, cause↔conséquence, etc. "
      . "Les paires doivent être NON AMBIGUËS (une seule bonne association par élément) et factuellement exactes. Difficulté : {$diffDesc} ";
    if ($visuel) $system .= "MODE VISUEL (jeune apprenant) : 'a' est un mot simple et CONCRET, 'b' est UN seul emoji qui l'illustre "
      . "(ex. {\"a\":\"chat\",\"b\":\"\xF0\x9F\x90\xB1\"}, {\"a\":\"soleil\",\"b\":\"\xE2\x98\x80\xEF\xB8\x8F\"}). N'utilise que des noms concrets illustrables par un emoji courant. ";
    if ($cours !== '') $system .= "Si le cours de l'apprenant est fourni ci-dessous, tire les paires EN PRIORITÉ de son contenu. ";
    if ($digest !== '') $system .= "Si un PROFIL de l'apprenant est fourni, ancre les éléments dans ses centres d'intérêt et adapte le ton — SANS changer la difficulté ci-dessus, et sans jamais recopier le profil. ";
    if ($exclure !== '') $system .= "C'est un NOUVEAU tour pour le même apprenant : les éléments listés sous « Déjà vus » ont DÉJÀ été joués — ne les reprends pas (ni de simples variantes) ; propose des éléments DIFFÉRENTS et INÉDITS pour que chaque niveau apporte du vocabulaire neuf. ";
    $system .= "Réponds STRICTEMENT en JSON valide, sans texte autour : {\"titre\":\"...\",\"paires\":[{\"a\":\"...\",\"b\":\"...\"}]}.";
  }

  $u = "Matière : {$matiere}\n" . ($niveau !== '' ? "Niveau / classe : {$niveau}\n" : '');
  $u .= "Nombre de paires : {$count}\n";
  if ($digest !== '') $u .= "Profil de l'apprenant (ancrer les exemples — ne pas recopier) : {$digest}\n";
  if ($exclure !== '') $u .= "Déjà vus (à NE PAS reprendre) : {$exclure}\n";
  if ($cours !== '') $u .= "\nCours de l'apprenant (source prioritaire) :\n{$cours}\n";
  $u .= "\nGénère l'appariement au format JSON demandé.";
  return [$system, $u, 1400, true, null];
}

function buildAppreciationPrompts($d) {
  // Confidentialité : le VRAI prénom n'est jamais envoyé au fournisseur IA. On
  // met un jeton neutre (PRENOM_ELEVE) dans le prompt ; le prénom réel est
  // ré-injecté côté serveur au retour (voir deanonymize()).
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
    . "Le prénom de l'élève est remplacé par le jeton PRENOM_ELEVE (confidentialité) : écris à la 3e personne "
    . "et emploie le jeton PRENOM_ELEVE TEL QUEL — sans le traduire, le modifier, ni le mettre entre guillemets — "
    . "là où tu utiliserais normalement le prénom.";

  $u = "Élève : PRENOM_ELEVE" . ($classe ? " (classe de {$classe})" : '') . "\n";
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

// Défense en profondeur (anonymisation) : le prompt envoyé au modèle ne
// contient JAMAIS le prénom, uniquement le jeton neutre PRENOM_ELEVE. Ici on
// remet, à la place du jeton, la valeur `prenom` reçue par le serveur.
// NB : le front-end anonymise DÉJÀ (il envoie son propre jeton à la place du
// prénom et fait la substitution finale côté navigateur) ; cette couche serveur
// protège EN PLUS tout appelant qui n'anonymiserait pas. Tolère quelques
// variantes de casse/accents/séparateur que le modèle pourrait produire ; si
// l'IA a ignoré la consigne et écrit « l'élève », le texte reste correct.
function deanonymize($text, $task, $d) {
  if ($task !== 'appreciation') return $text;
  $prenom = clean($d['prenom'] ?? '', 40);
  if ($prenom === '') $prenom = "L'élève";
  $variants = ['PRENOM_ELEVE', 'PRENOM ELEVE', 'PRENOM-ELEVE', 'PRÉNOM_ÉLÈVE', 'PRÉNOM ÉLÈVE', 'PRÉNOM-ÉLÈVE'];
  return trim(str_ireplace($variants, $prenom, $text));
}

// ════════════════════════════════════════════════════════════════════
//  Appels fournisseurs
// ════════════════════════════════════════════════════════════════════
// ── EXIGENCE « NO-TRAINING » (bloquant pré-lancement #38) ────────────
// Les données envoyées ici — dont les copies/cours photographiés par un mineur —
// ne doivent JAMAIS servir à entraîner un modèle. Il n'existe PAS d'en-tête par
// requête pour l'imposer : la garantie dépend du fournisseur ET du palier
// configurés dans mapo-ia-config.php (IA_API_KEY / IA_OPENAI_BASE / IA_MODEL) :
//   • API Anthropic (api.anthropic.com)  → pas d'entraînement sur les données
//     d'API par défaut (conditions commerciales). ✅
//   • API OpenAI (api.openai.com)        → données d'API non utilisées pour
//     l'entraînement par défaut (depuis mars 2023). ✅
//   • API Gemini via base compat OpenAI  → conforme sur palier PAYANT ; le
//     palier GRATUIT peut réutiliser les données pour « améliorer les produits ».
//     ❌ ne pas pointer IA_OPENAI_BASE vers un Gemini gratuit.
// Le code n'active AUCUN partage de données ; ne jamais ajouter d'option qui
// enverrait ces contenus vers un service qui entraîne dessus.
// Palier de modèle par tâche → viser le modèle le PLUS ÉCONOME encore adéquat.
// Configurable via IA_MODEL_MINI / IA_MODEL_REASON / IA_MODEL_VISION dans
// mapo-ia-config.php ; à défaut on retombe sur IA_MODEL (aucune régression tant
// que la config ne précise rien). « propre » (no-training) = choix du fournisseur
// (IA_PROVIDER / IA_OPENAI_BASE), « économe » = ce palier de modèle.
function tierForTask($task) {
  static $vision = ['vision_copie', 'vision_cours', 'vision_registre', 'vision_bulletin', 'vision_edt'];
  static $reason = ['tutor_quiz', 'orientation', 'orientation6c', 'bilan6c', 'prepa_examen', 'course_plan', 'eval_reponse'];
  if (in_array($task, $vision, true)) return 'vision';
  if (in_array($task, $reason, true)) return 'reason';
  return 'mini';
}
// Défaut CÔTÉ CODE (modifiable ici sans toucher la clé) — migration hors Gemini 2.5.
// Frugalité : Flash-Lite PARTOUT (le plus économe des Gemini 3.x ; gère texte,
// raisonnement « thinking » et vision). Si l'OCR des copies manuscrites déçoit,
// bump SEULEMENT 'vision' vers 'gemini-3.5-flash'.
// NB : tableau LOCAL (pas une const globale) — modelForTask est appelée AVANT le
// point de déclaration dans le fichier ; un const global ne serait pas encore
// défini (les fonctions sont hoistées, pas les const) → 500. Le local est sûr.
function modelForTask($task) {
  $tier = tierForTask($task);
  // 1) Override explicite en config (IA_MODEL_MINI/REASON/VISION), si un jour posé.
  $c = ['mini' => 'IA_MODEL_MINI', 'reason' => 'IA_MODEL_REASON', 'vision' => 'IA_MODEL_VISION'][$tier];
  if (defined($c) && constant($c)) return constant($c);
  // 2) Défaut côté code (frugal).
  $defauts = ['mini' => 'gemini-3.5-flash-lite', 'reason' => 'gemini-3.5-flash-lite', 'vision' => 'gemini-3.5-flash-lite'];
  if (!empty($defauts[$tier])) return $defauts[$tier];
  // 3) Dernier repli : IA_MODEL de la config.
  return defined('IA_MODEL') ? IA_MODEL : null;
}

function callAnthropic($system, $user, $maxTokens = 260, $model = null) {
  $payload = json_encode([
    'model'      => $model ?: (defined('IA_MODEL') ? IA_MODEL : 'claude-haiku-4-5-20251001'),
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

function callOpenAICompat($system, $user, $maxTokens = 260, $noReason = true, $image = null, $model = null) {
  $base = defined('IA_OPENAI_BASE') ? rtrim(IA_OPENAI_BASE, '/') : 'https://api.openai.com/v1';
  // Contenu utilisateur : texte seul, ou multimodal (texte + image) pour la vision.
  $userContent = $image
    ? [
        ['type' => 'text', 'text' => $user],
        ['type' => 'image_url', 'image_url' => ['url' => $image]],
      ]
    : $user;
  $payloadArr = [
    'model'       => $model ?: (defined('IA_MODEL') ? IA_MODEL : 'gpt-4o-mini'),
    'max_tokens'  => intval($maxTokens),
    'temperature' => 0.6,
    'messages'    => [
      ['role' => 'system', 'content' => $system],
      ['role' => 'user', 'content' => $userContent],
    ],
  ];
  // Coupe le "raisonnement"/thinking quand inutile (ex. appréciation courte) → moins
  // de tokens. ⚠️ MAIS reasoning_effort='none' est NON STANDARD : Gemini 3.5 Flash-Lite
  // l'accepte (2xx) puis renvoie un CONTENU VIDE → toutes les tâches légères cassées.
  // On ne l'envoie donc QUE vers un endpoint OpenAI (où il est valide et frugal) ;
  // pour Gemini on l'omet (Flash-Lite pense déjà très peu par défaut → reste frugal).
  if ($noReason && strpos($base, 'openai.com') !== false) $payloadArr['reasoning_effort'] = 'none';
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

/**
 * Évaluation d'une réponse RÉDIGÉE (question ouverte).
 * On sépare volontairement le FOND (la matière) de la FORME (orthographe,
 * grammaire) : un élève peut avoir juste avec des fautes, et l'inverse. La
 * partie « langue » sert à repérer des lacunes transversales — un devoir
 * d'histoire révèle le niveau de français.
 */
function buildEvalReponsePrompts($d) {
  $matiere  = clean($d['matiere'] ?? '', 50);
  $niveau   = clean($d['niveau'] ?? '', 30);
  $question = clean($d['question'] ?? '', 1200);
  $reponse  = clean($d['reponse'] ?? '', 2000);

  $system = "Tu es un professeur particulier francophone, bienveillant et juste, en Afrique francophone. "
    . "On te donne une QUESTION posee a un eleve et SA REPONSE redigee. "
    . "Tu evalues DEUX choses SEPAREMENT : (1) le FOND, l'exactitude par rapport a la matiere ; "
    . "(2) la FORME, orthographe et grammaire. "
    . "Ne penalise JAMAIS le fond a cause de la forme : un eleve peut avoir juste en faisant des fautes. "
    . "Pour la forme, releve au maximum 3 fautes reelles avec leur correction ; si la reponse est bien ecrite, dis-le simplement. "
    . "Sois encourageant, concret et bref. "
    . "Reponds STRICTEMENT en JSON valide, sans texte ni markdown autour, au format EXACT : "
    . "{\"note\":0,\"verdict\":\"...\",\"explication\":\"...\",\"langue\":{\"gravite\":\"aucune\",\"fautes\":[{\"extrait\":\"...\",\"correction\":\"...\"}],\"commentaire\":\"...\"}}. "
    . "\"note\" est la note du FOND sur 10. "
    . "\"gravite\" vaut EXACTEMENT \"aucune\", \"legere\" ou \"importante\".";

  $u = "Matiere : " . ($matiere !== '' ? $matiere : 'non precisee') . "\n";
  if ($niveau !== '') $u .= "Niveau / classe : {$niveau}\n";
  $u .= "\nQUESTION :\n" . ($question !== '' ? $question : '(vide)') . "\n";
  $u .= "\nREPONSE DE L'ELEVE :\n" . ($reponse !== '' ? $reponse : '(vide)') . "\n";
  $u .= "\nEvalue au format JSON demande.";

  return [$system, $u, 1200, true, null];
}
