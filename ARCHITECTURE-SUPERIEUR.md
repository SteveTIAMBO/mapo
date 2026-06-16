# Architecture multi-établissements — MAPO Supérieur

**Date** : 28 mai 2026
**Objet** : extension du modèle multi-tenant (cf [ARCHITECTURE-MULTI-ETABLISSEMENTS.md](ARCHITECTURE-MULTI-ETABLISSEMENTS.md)) à l'édition Supérieur.
**Contexte** : la fondation Firebase multi-tenant existe et est validée côté Secondaire. On l'étend au Supérieur sans la dupliquer.

---

## 1. Principe

Une école Supérieur vit dans le **même projet Firebase** que les écoles Secondaire, dans la même collection `schools/{schoolId}`. Ce qui change : un champ `edition` sur le document école et un jeu de sous-collections différent par édition.

```
schools/{schoolId}                      # doc école (champ `edition`)
schools/{schoolId}/etudiants/{...}      # sous-collections superieur
schools/{schoolId}/programmes/{...}
schools/{schoolId}/ue/{...}
...
```

Une école = une édition (`secondaire` OU `superieur`). Si plus tard une école veut les deux (lycée + BTS), on créera deux instances ou on fera évoluer le modèle.

---

## 2. Document école — champs ajoutés pour le Supérieur

Le doc `schools/{schoolId}` reçoit en plus :

```
{
  // ... champs communs (nom, sigle, type, pays, ville, anneeAcademique, ...)
  edition: 'superieur',                 // ou 'secondaire'
  modulesActifs: ['dashboard', 'etudiants', 'mobilite_entrante', ...],
  configSup: {
    devise: 'EUR',                      // ou XOF, XAF
    anneeAcademiqueCourante: '2025-2026',
    // tout autre paramètre global de l'édition
  }
}
```

Le champ `modulesActifs` pilote la visibilité des onglets dans la sidebar : un module non listé n'apparaît pour personne, quel que soit le rôle. C'est le levier freemium/upsell.

**Modules disponibles (clés)** :
`dashboard`, `etudiants`, `formation`, `inscriptions`, `edt`, `intervenants`, `notes`, `stages`, `salles`, `finance_dash`, `finance_tarifs`, `finance_comptes`, `finance_paiements`, `finance_bourses`, `finance_financements`, `mobilite_entrante`.

**Freemium MAPO Sup** (4 modules de base) : `dashboard`, `etudiants`, `edt`, `inscriptions`.
**Upsell** : les autres, à la carte.

---

## 3. Rôles Supérieur

Quatre rôles métier + un rôle utilisateur final :

| Rôle (clé) | Périmètre d'écriture (sous-collections) |
|---|---|
| `admin` | Tout (équivalent `directeur` du secondaire) |
| `responsable_inscription` | `etudiants`, `inscriptions_peda`, `mobilite_dossiers` |
| `comptable` | `finance_*` (8 collections), `mobilite_dossiers` |
| `responsable_formation` | `programmes`, `promotions`, `ue`, `intervenants`, `edt`, `notes_sup`, `stages`, `programme_responsables`, `mobilite_dossiers` |
| `etudiant` | Aucune écriture sur les sous-collections école. Ses choix passent par des appels contrôlés côté app. Lecture restreinte à ses propres données. |

Ces droits sont encodés dans `firestore.rules` (fonction `canWrite`). Lecture : tout membre actif voit les données de son école (filtrage par rôle au niveau UI).

---

## 4. Sous-collections Supérieur (sous `schools/{schoolId}/`)

**Pédagogique** :
- `etudiants` : un doc par étudiant (matricule, programmeId, niveau, statut, boursier, ects)
- `programmes` : Bachelor, MSc, etc. (config statique de l'école)
- `promotions` : programme + année (Bachelor 1, Master 2, ...)
- `intervenants` : enseignants permanents et vacataires (statut, coût horaire)
- `ue` : unités d'enseignement (code, intitule, type, ects, intervenantId, promotionId, semestre)
- `edt` : sessions emploi du temps
- `inscriptions_peda` : étudiant × UE (statut : complete/incomplete/validee)
- `notes_sup` : étudiant × UE → note
- `stages` : stages et alternances
- `salles` : inventaire salles (classe, amphi, réunion, informatique)
- `programme_responsables` : mapping programme → intervenant (responsable de formation)

**Finance** (préfixe `finance_`) :
- `finance_tarifs`, `finance_bourses`, `finance_comptes`, `finance_echeances`, `finance_paiements`, `finance_financements`, `finance_relances`, `finance_alloc_bourses`

**Mobilité** :
- `mobilite_dossiers` : dossiers de mobilité entrante (champs MOBI en lecture + champs école en écriture)

---

## 5. Authentification

**Fusion `superieurAuth` → `auth.js`** (décidée 2026-05-28).

Un user a UN compte Firebase, un `schoolId`, un `role`. Le store `auth.js` charge `users/{uid}` et expose ces deux infos. Plus de système d'auth séparé pour le supérieur.

À l'init de l'app, le router et les vues déterminent l'édition via `school.edition`, et adaptent la navigation et le rendu en conséquence.

**Login V1** : email + mot de passe Firebase, comme le secondaire. Magic link plus tard si besoin. SSO ENTPE / établissement bien plus tard.

---

## 6. Mode démo

Le mode démo localStorage actuel (école fictive « EDUFREM Business School ») est **conservé** comme vitrine commerciale. Détection :

- `mapo.app-edufrem.com` → mode `preview` (démo localStorage, page de choix d'édition, comptes démo sans mot de passe).
- `<school>.app-edufrem.com` → mode `school` (Firebase, vrai stockage, login email/mot de passe).
- `admin.app-edufrem.com` → mode `megaAdmin` EDUFREM.

Les stores Sup détectent le mode courant et basculent automatiquement entre localStorage (preview) et Firestore (school).

---

## 7. Modèle de comptes

Identique au secondaire :
- EDUFREM crée le doc `schools/{schoolId}` + une invitation pour le directeur (rôle `admin` en supérieur).
- À sa première connexion, l'admin se connecte → profil créé via l'invitation → il accède à l'école.
- L'admin invite ensuite RI, Comptable, RP via l'écran « Gestion des accès ».
- L'étudiant : à traiter dans une étape ultérieure (login passwordless ou lien établissement plus tard).

---

## 8. Plan d'exécution

| Étape | Contenu | Statut |
|---|---|---|
| 2.1 | Schéma + extension `firestore.rules` (rôles + collections sup) | EN COURS (2026-05-28) |
| 2.2 | Fusion `superieurAuth` → `auth.js` | À faire |
| 2.3 | Migration `superieur.js` (programmes, étudiants, intervenants, UE, EDT) vers Firestore | À faire |
| 2.4 | Migration `finance.js` et `mobilite.js` vers Firestore | À faire |
| 2.5 | Validation E2E + procédure d'init école sup | À faire |
| 3.1 | Système de modules activables (`modulesActifs` filtré dans SuperieurView, UI méga-admin) | À faire |
| 4.1 | Provisioning ENTPE (Dashboard + Étudiants + Mobilité entrante) + déploiement sur `entpe.app-edufrem.com` | À faire |
