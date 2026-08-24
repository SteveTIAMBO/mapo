<?php
/**
 * mapo-invite.php — page d'atterrissage du LIEN MAGIQUE FAMILLE.
 *
 * Pourquoi ce fichier existe : quand un parent partage le lien sur WhatsApp,
 * l'aperçu (titre, description, image) est fabriqué par un ROBOT qui n'exécute
 * PAS le JavaScript. Il lit le HTML brut renvoyé par le serveur. Or l'app est
 * une SPA : toutes ses routes renvoient le même `index.html`, dont les balises
 * annoncent « MAPO — Gestion Scolaire », l'ERP destiné aux établissements.
 * Un parent qui envoyait le lien à son enfant partageait donc un logiciel de
 * gestion d'école. Aucun correctif côté application ne peut y changer quoi que
 * ce soit — d'où cette page, servie par le serveur.
 *
 * Elle ne consomme PAS le code : elle se contente de l'afficher aux robots et
 * de rediriger les humains vers la vraie page `/rejoindre`.
 *
 * ⚠️ Le PRÉNOM de l'enfant n'apparaît nulle part. Un aperçu de lien est visible
 * de tous ceux à qui le message est transféré : le prénom d'un mineur n'a rien
 * à y faire. C'est aussi pour cela que l'URL ne porte que le code.
 */

// Deux invitations arrivent ici, et il ne faut surtout pas les traiter pareil :
//   - FAMILLE : 8 caractères, alphabet lisible (« KMPQ2R7X »), partagée par un
//     parent à son enfant.
//   - ÉCOLE   : « {slug}~{aléatoire} », slug en MINUSCULES
//     (« stjoseph~KMPQ2R7X »), émise par l'établissement à l'inscription.
//
// ⚠️ Le code de l'école ne survivait PAS à cette page : `strtoupper` détruisait
// son slug et le filtre `[A-Z0-9]` le rejetait, donc le code était effacé en
// silence. La famille arrivait sur /rejoindre sans invitation — un lien qui a
// l'air de fonctionner et ne fait rien.
$brut = isset($_GET['c']) ? trim($_GET['c']) : '';
$code = '';
$type = '';
if (preg_match('/^([a-z0-9-]{2,40})~([A-Za-z0-9]{8,40})$/i', $brut, $m)) {
  $code = strtolower($m[1]) . '~' . strtoupper($m[2]);   // le slug reste minuscule
  $type = 'ecole';
} elseif (preg_match('/^[A-Za-z0-9]{4,16}$/', $brut)) {
  $code = strtoupper($brut);
  $type = 'famille';
}

$base = 'https://mapoplus.app-edufrem.com';
$cible = $base . '/rejoindre' . ($code !== '' ? '?c=' . rawurlencode($code) : '');

// L'aperçu ne nomme JAMAIS l'établissement ni l'élève : il est visible de tous
// ceux à qui le message est transféré. Il dit d'où vient le lien, pas qui.
if ($type === 'ecole') {
  $titre = 'MAPO+ — votre école vous ouvre un espace';
  $desc  = "Votre établissement vous ouvre un espace MAPO+ : devoirs, notes, bulletins et un professeur particulier disponible à toute heure. Cliquez pour l'activer.";
} else {
  $titre = 'MAPO+ — ton espace de révision t’attend';
  $desc  = "Ton parent t'a créé un espace MAPO+. Clique pour l'ouvrir : révisions guidées, suivi de tes progrès et aide de MIAPO, ton professeur particulier.";
}
$image = $base . '/icon-mapoplus-512.png';

header('Content-Type: text/html; charset=utf-8');
// Un aperçu de lien peut être mis en cache longtemps par les messageries ; on
// autorise un cache court, mais la page reste triviale à regénérer.
header('Cache-Control: public, max-age=300');
$esc = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $esc($titre) ?></title>
<meta name="description" content="<?= $esc($desc) ?>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MAPO+">
<meta property="og:title" content="<?= $esc($titre) ?>">
<meta property="og:description" content="<?= $esc($desc) ?>">
<meta property="og:image" content="<?= $esc($image) ?>">
<meta property="og:url" content="<?= $esc($base . '/inviter' . ($code !== '' ? '?c=' . rawurlencode($code) : '')) ?>">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="<?= $esc($titre) ?>">
<meta name="twitter:description" content="<?= $esc($desc) ?>">
<meta name="twitter:image" content="<?= $esc($image) ?>">
<meta name="theme-color" content="#7c3aed">
<link rel="icon" type="image/svg+xml" href="/favicon-mapoplus.svg">
<!-- Repli si JavaScript est absent ou lent : la redirection part quand même. -->
<meta http-equiv="refresh" content="0; url=<?= $esc($cible) ?>">
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         background:#f6f5fb; color:#1a1c26; text-align:center; padding:24px; }
  .m { max-width:340px; }
  .b { width:56px; height:56px; margin:0 auto 16px; border-radius:16px; display:flex;
       align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:20px;
       background:linear-gradient(135deg,#8b5cf6,#6d28d9); }
  a { color:#6d28d9; font-weight:600; }
</style>
</head>
<body>
  <div class="m">
    <div class="b">M+</div>
    <p>Ouverture de ton espace MAPO+…</p>
    <p><a href="<?= $esc($cible) ?>">Continuer</a></p>
  </div>
  <script>location.replace(<?= json_encode($cible, JSON_UNESCAPED_SLASHES) ?>)</script>
</body>
</html>
