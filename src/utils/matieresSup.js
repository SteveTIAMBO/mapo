/**
 * Matières ajoutées par l'apprenant, hors de son programme officiel.
 *
 * Demande de Steve (16/08) : « Marie est en 6e mais elle veut pouvoir étudier
 * l'allemand pour se préparer pour l'année prochaine. »
 *
 * Le référentiel national reste la base : c'est lui qui garantit qu'un élève de
 * 6e révise bien le programme de 6e. Une matière ajoutée vient EN PLUS, jamais
 * à la place — sinon on ouvrirait la porte à un élève qui remplace les maths
 * par ce qui l'amuse, et MAPO+ cesserait d'être un outil scolaire.
 *
 * Une matière ajoutée passe par le test de positionnement comme les autres :
 * c'est même là qu'il sert le plus, puisqu'on ne sait rien du niveau de
 * l'apprenant dans une matière qu'il n'a jamais suivie.
 */

/**
 * Catalogue proposé. Volontairement limité aux matières où un modèle de langue
 * généraliste est FIABLE — l'app génère les questions par IA, et une IA qui
 * invente est pire que pas de matière du tout.
 *
 * ⚠️ Les langues africaines locales n'y figurent PAS, et c'est un choix documenté :
 * la recherche menée le 16/08 montre que les modèles génériques produisent en
 * wolof, bambara ou langues camerounaises un texte fluide, plausible et faux,
 * indétectable pour un parent. Elles supposent du contenu validé par des
 * locuteurs natifs, pas de la génération. Voir la fiche mémoire du projet.
 */
export const CATALOGUE_SUP = [
  { groupe: 'Langues vivantes', matieres: ['Allemand', 'Espagnol', 'Portugais', 'Italien', 'Arabe', 'Chinois'] },
  { groupe: 'Sciences et technique', matieres: ['Informatique', 'Algorithmique', 'Statistiques'] },
  { groupe: 'Culture générale', matieres: ['Économie', 'Philosophie', 'Musique', 'Arts plastiques'] },
]

/** Toutes les matières proposables, à plat. */
export const MATIERES_PROPOSABLES = CATALOGUE_SUP.flatMap((g) => g.matieres)

const norm = (s) => String(s || '')
  .trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Deux écritures d'une même matière ne doivent pas créer deux entrées. */
export function memeMatiere(a, b) { return norm(a) === norm(b) && norm(a) !== '' }

/** Nettoie une saisie libre de matière. */
export function nettoyerMatiere(nom) {
  const s = String(nom || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

/**
 * Liste finale : le programme officiel, PUIS les matières ajoutées.
 * L'ordre compte — le programme d'abord, pour que l'ajout reste un supplément
 * à l'oeil comme dans la logique.
 */
export function fusionnerMatieres(base, sup) {
  const out = Array.isArray(base) ? [...base] : []
  for (const m of Array.isArray(sup) ? sup : []) {
    const propre = nettoyerMatiere(m)
    if (propre && !out.some((b) => memeMatiere(b, propre))) out.push(propre)
  }
  return out
}

/** Ce qu'on peut encore proposer : le catalogue moins ce que l'élève a déjà. */
export function proposablesPour(base, sup) {
  const deja = fusionnerMatieres(base, sup)
  return CATALOGUE_SUP
    .map((g) => ({
      groupe: g.groupe,
      matieres: g.matieres.filter((m) => !deja.some((d) => memeMatiere(d, m))),
    }))
    .filter((g) => g.matieres.length)
}

/** Ajoute une matière. Renvoie la nouvelle liste (jamais de doublon). */
export function ajouterMatiere(sup, nom) {
  const propre = nettoyerMatiere(nom)
  const liste = Array.isArray(sup) ? sup : []
  if (!propre || liste.some((m) => memeMatiere(m, propre))) return liste
  return [...liste, propre]
}

/** Retire une matière AJOUTÉE. Le programme officiel, lui, ne se retire pas. */
export function retirerMatiere(sup, nom) {
  return (Array.isArray(sup) ? sup : []).filter((m) => !memeMatiere(m, nom))
}
