<?php
// Configuration du proxy IA (mapo-ia.php).
// COPIER ce fichier en `mapo-ia-config.php` sur le serveur puis remplir.
// NE JAMAIS committer le fichier réel : il contient la clé (protégé par .htaccess).
//
// ════════════════════════════════════════════════════════════════════
//  1) FOURNISSEUR « PROPRE » (ne s'entraîne PAS sur les données)  #38
// ════════════════════════════════════════════════════════════════════
// ⚠️ L'app envoie AUSSI les PHOTOS (copies / cours photographiés par des mineurs)
// à l'IA. Il faut donc un fournisseur qui N'UTILISE PAS les données d'API pour
// entraîner ses modèles :
//   • OpenAI  (api.openai.com)             → pas d'entraînement par défaut.   ✅
//   • Anthropic (api.anthropic.com)        → pas d'entraînement par défaut.   ✅
//   • Gemini  (generativelanguage.google…) → UNIQUEMENT palier PAYANT, et
//     activer « Zero Data Retention ». Le palier GRATUIT réutilise les données. ⚠️
//
// La vision passe TOUJOURS par la voie « compat OpenAI » (IA_OPENAI_BASE). Le plus
// simple pour tout garder propre : IA_PROVIDER='openai' + IA_OPENAI_BASE = OpenAI.

define('IA_PROVIDER', 'openai');                        // 'openai' (voie compat, gère aussi la vision) ou 'anthropic'
define('IA_OPENAI_BASE', 'https://api.openai.com/v1');  // reçoit AUSSI les photos → doit être un fournisseur propre
define('IA_API_KEY', 'A_REMPLIR');                      // clé du fournisseur choisi (jamais dans le dépôt)

// ════════════════════════════════════════════════════════════════════
//  2) FRUGALITÉ : le modèle le plus ÉCONOME encore adéquat, par tâche
// ════════════════════════════════════════════════════════════════════
// mini   = tâches courtes/simples (appréciation, traduction, correction dictée, chat, extraction)
// reason = tâches à raisonnement (quiz, orientation, bilan compétences, prépa examen, plan de cours)
// vision = lecture de photos (copie, cours, bulletin, emploi du temps)
// Non défini → retombe sur IA_MODEL (donc pas de régression).
// ⚠️ gemini-2.5-flash sera retiré (2026) : ne plus le cibler. Vérifier la liste de
// modèles À JOUR du fournisseur choisi avant de figer ces identifiants.
define('IA_MODEL',        'gpt-5-mini');   // défaut global
define('IA_MODEL_MINI',   'gpt-5-mini');   // le moins cher (clean)
define('IA_MODEL_REASON', 'gpt-5-mini');   // idem — le code active déjà le raisonnement pour ces tâches
define('IA_MODEL_VISION', 'gpt-5-mini');   // multimodal le moins cher

// ── Équivalent Anthropic (si IA_PROVIDER='anthropic' — la vision resterait à
//    router vers un multimodal propre, à voir avec Claude vision) :
// define('IA_MODEL',        'claude-haiku-4-5');
// define('IA_MODEL_MINI',   'claude-haiku-4-5');
// define('IA_MODEL_REASON', 'claude-sonnet-4-5');   // seulement si la qualité l'exige
// define('IA_MODEL_VISION', 'claude-haiku-4-5');

// ════════════════════════════════════════════════════════════════════
//  3) Plafonds démo (facultatif)
// ════════════════════════════════════════════════════════════════════
// define('IA_DAILY_LIMIT', 300);
// define('IA_DEMO_HOURLY_LIMIT', 60);
