# Validation — Version Primaire & Secondaire (MAPO)

**Date** : 15 mai 2026
**Objet** : vérifier que l'édition Secondaire & Primaire fonctionne et est déployable.
**Réponse courte** : la **démonstration** est solide et déployable comme vitrine. Tous les écrans fonctionnent pour les quatre rôles. Un bug a été trouvé et corrigé. En revanche, « déployable comme démo » n'est pas « installable dans une vraie école » — ce dernier point reste conditionné au chantier de fondation décrit dans l'audit.

---

## 1. Méthode de validation

Trois niveaux de vérification ont été appliqués :

1. **Test end-to-end automatisé** (navigateur sans interface, Playwright) — parcours réel de l'application en mode démonstration : page d'accueil, connexion pour chacun des 4 comptes (directeur, enseignant, parent, élève), puis visite de **chacun des 34 écrans** de l'application. À chaque étape, capture des erreurs JavaScript et vérification que l'écran affiche bien du contenu.
2. **Tests unitaires** — la suite de tests du projet (72 tests) : calculs de notes, transition d'année, et les stores des nouveaux espaces.
3. **Revue du code** — recherche des fonctions non implémentées et des incohérences en mode démo.

Total : **54 étapes de navigation testées** couvrant l'intégralité des écrans et des rôles.

---

## 2. Résultat

### Ce qui fonctionne
- **Tous les écrans se chargent et s'affichent** — aucun écran vide, aucune page cassée, sur les quatre rôles.
- **La connexion démo fonctionne** pour les quatre comptes, avec la bonne redirection (directeur/enseignant → tableau de bord, parent → espace parent, élève → espace élève).
- **La page d'accueil** affiche bien les trois versions (Secondaire, Supérieur, Gouvernement) et le routage entre elles est correct.
- **Aucune erreur JavaScript** sur l'ensemble du parcours (après la correction ci-dessous).
- Les **72 tests unitaires** passent.
- Le **build de production** se génère proprement.

### Bug trouvé et corrigé
- **Espace parent → Inscriptions** (`ParentInscriptionsView`) : l'écran appelait trois fonctions inexistantes (`fetchClasses`, `fetchEleves`, `fetchDossiers`) au lieu des vraies (`loadClasses`, `loadEleves`, `loadDossiers`). L'écran plantait silencieusement au chargement. **Corrigé** — l'écran se charge désormais sans erreur.

### Point mineur (cosmétique, non bloquant)
- **Espace élève → tableau de bord** : l'indicateur « Moyenne générale » affiche un tiret « — » au lieu d'une valeur. À regarder, mais sans gravité — n'empêche pas l'usage.

---

## 3. Verdict

### La démonstration : oui, elle est OK et déployable
L'édition Secondaire & Primaire, en **mode démonstration**, est saine. Elle peut être déployée et montrée à des écoles, des partenaires ou des financeurs en toute confiance. C'est une vitrine fonctionnelle et complète : gestion des élèves, classes, notes & bulletins, présences, emploi du temps, discipline, devoirs, comptabilité, rapports, import, paramètres, espaces parent et élève.

### L'installation dans une vraie école : pas encore
Il faut être clair sur la distinction, car elle est importante. La validation ci-dessus a été menée en **mode démonstration** — les données vivent dans le navigateur (localStorage). C'est ce mode qui est aujourd'hui solide.

Le **mode production** (Firebase), lui, reste celui décrit dans l'audit : règles de sécurité qui ne couvrent presque rien et ne correspondent pas au code, absence de multi-tenant (une école = un compte partagé), rôles non persistés côté serveur, et au moins une fonction non implémentée côté production (la sauvegarde des présences). Tant que ce socle n'est pas repris (Phase 1 de l'audit), **on ne peut pas installer MAPO dans une école secondaire pour un usage réel multi-utilisateurs.**

### En résumé
- **Déployer la démo aujourd'hui** : oui, c'est prêt (build `dist-v16`).
- **Installer chez une école demain** : non — il manque la reprise de fondation (multi-tenant + sécurité + chemins Firebase). C'est le prochain vrai chantier si l'objectif est la commercialisation.

---

## 4. Prochaines étapes recommandées

1. Déployer `dist-v16` (la démo validée, avec le correctif).
2. Trancher : veut-on rester en vitrine/démo encore quelque temps, ou enclencher la **Phase 1 de l'audit** (fondation multi-tenant + sécurité) qui rend MAPO réellement installable en école ?
3. Point cosmétique à corriger quand on y reviendra : la moyenne générale de l'espace élève.
