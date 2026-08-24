/**
 * Modules d'une formation hors catalogue (MBA, BTS, concours, certification…).
 *
 * POURQUOI CE FICHIER. Pour une formation que MAPO ne connaît pas, la liste des
 * matières vient du champ `formationModules` du profil — une simple chaîne à
 * virgules. L'apprenant ne pouvait la corriger que dans Paramètres, en éditant
 * cette chaîne à la main : le module « Ajouter une matière » de Mes cours, lui,
 * était doublement inerte. Son catalogue (`matieresProgramme`) est VIDE pour une
 * formation hors catalogue, et ce qu'on y ajoutait partait dans `matieresSup`,
 * que `matieresList` ne lit pas dès que `formationModules` est renseigné.
 *
 * Steve, sur son propre compte MBA : « il n'y a pas de modules pour supprimer /
 * modifier les matières ajoutées par défaut ». Les douze modules proposés par
 * l'IA étaient donc indéboulonnables — et ils sont génériques, puisque l'IA les
 * déduit du NOM de la formation sans jamais lire l'URL fournie.
 *
 * ⚠️ LA VIRGULE RESTE LE SÉPARATEUR, et c'est un choix, pas un oubli. Les
 * profils existants stockent déjà leurs modules ainsi ; migrer vers un tableau
 * demanderait une reprise de données, avec le risque d'en perdre. Conséquence
 * assumée : un module ne peut pas contenir de virgule. `nettoyerModule` la
 * remplace donc par un tiret plutôt que de couper le nom en deux en silence.
 */

/** Un intitulé propre : sans virgule, sans espaces superflus. */
export function nettoyerModule(s) {
  return String(s == null ? '' : s)
    .replace(/,/g, ' -')       // la virgule couperait le module en deux
    .replace(/\s+/g, ' ')
    .trim()
}

const meme = (a, b) => nettoyerModule(a).toLowerCase() === nettoyerModule(b).toLowerCase()

/** La chaîne stockée → liste exploitable, sans doublon ni case vide. */
export function listeModules(texte) {
  const out = []
  for (const brut of String(texte == null ? '' : texte).split(',')) {
    const m = nettoyerModule(brut)
    if (m && !out.some((x) => meme(x, m))) out.push(m)
  }
  return out
}

/** Liste → chaîne stockée. Aller-retour stable : c'est ce que les tests exigent. */
export function texteModules(liste) {
  const propres = []
  for (const brut of Array.isArray(liste) ? liste : []) {
    const m = nettoyerModule(brut)
    if (m && !propres.some((x) => meme(x, m))) propres.push(m)
  }
  return propres.join(', ')
}

/** Ajoute un module s'il n'y est pas déjà (comparaison insensible à la casse). */
export function ajouterModule(texte, module) {
  const m = nettoyerModule(module)
  if (!m) return texteModules(listeModules(texte))
  const liste = listeModules(texte)
  if (liste.some((x) => meme(x, m))) return texteModules(liste)
  return texteModules([...liste, m])
}

/** Retire un module. C'est ce qui manquait : les 12 proposés étaient inamovibles. */
export function retirerModule(texte, module) {
  return texteModules(listeModules(texte).filter((x) => !meme(x, module)))
}

/** Renomme un module en place, sans changer son rang dans la liste. */
export function renommerModule(texte, ancien, nouveau) {
  const n = nettoyerModule(nouveau)
  if (!n) return texteModules(listeModules(texte))
  const liste = listeModules(texte)
  const i = liste.findIndex((x) => meme(x, ancien))
  if (i === -1) return texteModules(liste)
  // Renommer vers un intitulé déjà pris reviendrait à créer un doublon : on
  // supprime alors l'ancien plutôt que d'en garder deux identiques.
  if (liste.some((x, j) => j !== i && meme(x, n))) return retirerModule(texte, ancien)
  liste[i] = n
  return texteModules(liste)
}
