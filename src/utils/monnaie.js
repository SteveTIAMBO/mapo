/**
 * Affichage des montants dans la devise DE L'ÉCOLE.
 *
 * Pourquoi ce fichier existe : l'écran Paramètres proposait sept devises (XAF,
 * XOF, CDF, EUR, USD, GHS, NGN), enregistrait le choix de l'école... et aucun
 * formateur ne le relisait. Huit endroits écrivaient « FCFA » ou « XAF » en dur :
 * facturation, rapports, personnel, salaires, espace parent, vue complexe,
 * bulletin PDF, fiche de paie. Une école de Kinshasa choisissait le franc
 * congolais et imprimait quand même des reçus en FCFA. Le réglage était
 * décoratif, et c'est le pire des défauts : le prospect a vu le menu déroulant
 * pendant la démonstration.
 *
 * Un seul formateur, donc, lu partout. Ajouter une devise se fait ICI.
 */

// Symbole affiché après le montant. « FCFA » plutôt que « XAF » pour le franc
// CFA : c'est ce qu'écrivent les écoles, les banques et le Journal officiel.
// Les deux zones CFA partagent le sigle FCFA mais PAS la même monnaie : XAF pour
// l'Afrique centrale (BEAC), XOF pour l'Afrique de l'Ouest (BCEAO).
const SYMBOLES = {
  XAF: 'FCFA',
  XOF: 'FCFA',
  CDF: 'FC',
  EUR: '€',
  USD: '$',
  GHS: 'GH₵',
  NGN: '₦',
}

// Devise de repli. MAPO est un produit d'Afrique centrale d'abord : une école
// qui n'a rien choisi ne doit pas voir des euros.
export const DEVISE_DEFAUT = 'XAF'

/** Devises proposées à l'école, dans l'ordre du menu déroulant. */
export const DEVISES = Object.keys(SYMBOLES)

/** Symbole d'une devise, ou le code lui-même si on ne le connaît pas. */
export function symboleDevise(code) {
  const c = String(code || '').toUpperCase()
  return SYMBOLES[c] || c || SYMBOLES[DEVISE_DEFAUT]
}

/**
 * Montant formaté dans la devise donnée.
 *
 * Le séparateur de milliers de `fr-FR` est une espace fine insécable (U+202F)
 * qui s'affiche parfois comme un « / » selon la police, et notamment dans les
 * PDF produits par jsPDF. On la normalise en espace ordinaire, comme le fait
 * déjà le correctif global de `main.js`.
 */
export function fmtMontant(montant, devise) {
  const n = Number(montant) || 0
  const decimales = ['EUR', 'USD'].includes(String(devise || '').toUpperCase()) && n % 1 !== 0 ? 2 : 0
  const nombre = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n).replace(/[   ]/g, ' ')
  return `${nombre} ${symboleDevise(devise)}`
}
