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
// ⚠️ gemini-2.5-flash EST en cours de retrait (2026, y compris sur l'API AI Studio
// utilisée ici) → ne plus le cibler. Confirmer les identifiants EXACTS dans la
// liste de modèles À JOUR du fournisseur choisi avant de figer.

// ── OPTION CHOISIE — GEMINI (on reste sur Google). IA_PROVIDER='openai' +
//    IA_OPENAI_BASE = endpoint Gemini compat (inchangé, déjà en place).
//    ⚠️ CLEAN (pas d'entraînement) UNIQUEMENT sur palier PAYANT + Zero Data
//    Retention activé — réglages Google, côté Steve. Les « thought signatures »
//    Gemini 3 ne concernent PAS notre usage (appels en un seul coup) → aucun code.
//    Frugalité : texte simple sur Flash-Lite (le moins cher), raisonnement +
//    vision sur Flash (OCR fiable des copies). Identifiants confirmés (déc. 2026).
define('IA_MODEL',        'gemini-3.5-flash-lite');  // défaut global (le moins cher)
define('IA_MODEL_MINI',   'gemini-3.5-flash-lite');  // appréciation, traduction, chat, correction dictée
define('IA_MODEL_REASON', 'gemini-3.5-flash');       // quiz, orientation, bilan, prépa examen, plan
define('IA_MODEL_VISION', 'gemini-3.5-flash');       // photos (copie/cours/bulletin) : multimodal + OCR
// Astuce durabilité : les alias « gemini-flash-lite-latest » / « gemini-flash-latest »
// évitent de re-migrer à chaque version (vérifier qu'ils résolvent avant de figer).

// ── Alternatives (non retenues) :
// OpenAI  : IA_PROVIDER='openai', base 'https://api.openai.com/v1', modèles 'gpt-5-mini' (propre par défaut).
// Anthropic : IA_PROVIDER='anthropic', modèles 'claude-haiku-4-5' (vision à router côté code).

// ════════════════════════════════════════════════════════════════════
//  3) Plafonds démo (facultatif)
// ════════════════════════════════════════════════════════════════════
// define('IA_DAILY_LIMIT', 300);
// define('IA_DEMO_HOURLY_LIMIT', 60);
