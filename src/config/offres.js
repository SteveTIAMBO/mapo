// Offres d'abonnement MAPO+ (B2C) — REPLI local (la source de vérité ajustable
// est côté serveur : server/mapo-offres-data.php, lu via mapo-offres.php).
//
// Modèle = jauge de TOKENS façon Claude. Chaque action IA coûte des tokens ;
// l'offre donne un plafond HEBDOMADAIRE (`capTokens`) qui se recharge le lundi.
// Une fois épuisé : monter d'offre ou attendre lundi. La facturation reste
// mensuelle (Tranzak, re-charge). Prix en FCFA (XAF).

export const DEVISE = 'XAF'

export const OFFRES = [
  { id: 'decouverte', nom: 'Découverte', prix: 0,    capTokens: 25000,  cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat'] },
  { id: 'standard',   nom: 'Standard',   prix: 1000, capTokens: 150000, cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat'] },
  { id: 'premium',    nom: 'Premium',    prix: 3000, capTokens: 500000, cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat', 'prioriteFeat'] },
]

/** Nombre formaté (25 000). */
export function fmtTokens(n) { return (n || 0).toLocaleString('fr-FR') }

export function offreById(id) { return OFFRES.find((o) => o.id === id) || OFFRES[0] }
export const OFFRE_GRATUITE = OFFRES[0]
