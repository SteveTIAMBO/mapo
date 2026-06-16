# MAPO — Prompts de configuration des écoles (cPanel + Firebase)

Repli fiable quand l'automatisation de provisioning est capricieuse.
Copie le bloc voulu et confie-le à une IA pilotant le navigateur (avec accès à
ton cPanel LWS et à la console Firebase). Elle fait la manipulation à ta place.

> **Règle absolue rappelée dans chaque prompt :** ne jamais créer/modifier/supprimer
> le dossier `/public_html/mapo` — il contient l'app partagée par TOUTES les écoles.
> On ne touche qu'au **sous-domaine** et au **domaine autorisé Firebase**.

Remplace simplement `<slug>` (ex. `entpe`) et `<Nom de l'école>` dans le prompt
d'installation. Le sous-domaine est toujours `<slug>.app-edufrem.com`.

---

## 1. INSTALLER une nouvelle école

```
Tu es un assistant avec accès au navigateur. Configure une nouvelle école sur l'infrastructure EDUFREM / MAPO (hébergement LWS cPanel + Firebase).
RÈGLE ABSOLUE : ne crée, ne modifie ni ne supprime JAMAIS le dossier /public_html/mapo — il contient l'application partagée par TOUTES les écoles. On réutilise ce dossier, on n'en crée pas un nouveau.

ÉCOLE : <Nom de l'école>
SOUS-DOMAINE À CRÉER : <slug>.app-edufrem.com

ÉTAPE 1 — cPanel : créer le sous-domaine
1. Ouvre https://web58.lws-hosting.com:2083 et connecte-toi (compte cPanel : c2627836c).
2. Va dans « Domaines » puis « Créer un nouveau domaine ».
3. Domaine : <slug>.app-edufrem.com
4. Racine du document : /public_html/mapo
   IMPORTANT : ce dossier existe déjà. Si une case « Créer un nouveau dossier pour ce domaine » est proposée, DÉCOCHE-la pour réutiliser le dossier MAPO partagé.
5. Clique « Soumettre ». Le sous-domaine sert alors l'application MAPO.

ÉTAPE 2 — Firebase : autoriser le domaine
1. Ouvre https://console.firebase.google.com/project/mapo-edufrem/authentication/settings
2. Section « Domaines autorisés » → bouton « Ajouter un domaine ».
3. Ajoute exactement : <slug>.app-edufrem.com
4. Enregistre. (Indispensable pour la connexion Google et les liens d'invitation par email.)

ÉTAPE 3 — Vérification
1. Ouvre https://<slug>.app-edufrem.com/ : l'écran de connexion MAPO doit s'afficher.
2. L'administrateur ouvre l'email d'invitation reçu pour définir son mot de passe, puis se connecte.

Terminé : l'école « <Nom de l'école> » est en ligne sur <slug>.app-edufrem.com.
```

---

## 2. DÉSINSTALLER une école — exemple ENTPE (à faire maintenant pour nettoyer)

```
Tu es un assistant avec accès au navigateur. Désinstalle une école de l'infrastructure EDUFREM / MAPO.
RÈGLE ABSOLUE : ne supprime JAMAIS le dossier /public_html/mapo (partagé par toutes les écoles). On retire uniquement le sous-domaine et l'autorisation Firebase.

ÉCOLE : ENTPE
SOUS-DOMAINE À RETIRER : entpe.app-edufrem.com

ÉTAPE 1 — cPanel : retirer le sous-domaine
1. Ouvre https://web58.lws-hosting.com:2083 (compte cPanel : c2627836c).
2. Va dans « Domaines ».
3. Repère entpe.app-edufrem.com → « Gérer » → supprime ce domaine.
   NE supprime PAS le dossier /public_html/mapo ni ses fichiers.

ÉTAPE 2 — Firebase : retirer le domaine autorisé
1. Ouvre https://console.firebase.google.com/project/mapo-edufrem/authentication/settings
2. Section « Domaines autorisés » → retire entpe.app-edufrem.com (icône corbeille).

ÉTAPE 3 — Données
Les données de l'école dans la base ont déjà été supprimées par le bouton « Supprimer » de l'admin MAPO. Rien d'autre à faire.

Terminé : entpe.app-edufrem.com est désinstallé.
```

---

*Ces deux prompts sont aussi intégrés dans l'app (bouton « Config » par école + « Prompt de configuration » à la création), pré-remplis automatiquement — disponible dès que le déploiement v6 sera fait.*
