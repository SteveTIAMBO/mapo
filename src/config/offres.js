// Offres d'abonnement MAPO+ (B2C) — REPLI local (la source de vérité ajustable
// est côté serveur : server/mapo-offres-data.php, lu via mapo-offres.php).
//
// Modèle = jauge de TOKENS façon Claude. Chaque action IA coûte des tokens ;
// l'offre donne un plafond par cycle (30 j). On affiche aussi une estimation
// « ≈ N quiz » pour rester lisible pour les familles (1 quiz ≈ 3000 tokens).
// Prix en FCFA (XAF).

export const DEVISE = 'XAF'
export const TOKENS_PAR_QUIZ = 3000

export const OFFRES = [
  { id: 'decouverte', nom: 'Découverte', prix: 0,    capTokens: 45000,  cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat'] },
  { id: 'standard',   nom: 'Standard',   prix: 1000, capTokens: 180000, cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat'] },
  { id: 'premium',    nom: 'Premium',    prix: 3000, capTokens: 600000, cycleJours: 30, features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat', 'prioriteFeat'] },
]

/** Estimation lisible : nombre de quiz équivalent à un plafond de tokens. */
export function quizEquiv(tokens) { return Math.max(1, Math.round((tokens || 0) / TOKENS_PAR_QUIZ)) }

export function offreById(id) { return OFFRES.find((o) => o.id === id) || OFFRES[0] }
export const OFFRE_GRATUITE = OFFRES[0]
