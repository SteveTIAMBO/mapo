// Offres d'abonnement MAPO+ (B2C) — CONFIGURABLE.
// 1 crédit = 1 action IA (quiz de révision, orientation/bilan 6C, fiche, plan,
// lecture de copie, correction). Coût réel d'une action ≈ 2–4 FCFA (Gemini
// Flash) → ces quotas restent rentables (marges validées le 2026-07-19, à
// ajuster librement ici). Prix en FCFA (XAF). Épuisement = IA en pause + invite
// à l'offre supérieure.
//
// ⚠️ Tranzak n'a pas de prélèvement récurrent : un abonnement payant = une
// re-charge mensuelle que le parent/apprenant ré-autorise chaque mois.

export const DEVISE = 'XAF'

export const OFFRES = [
  {
    id: 'decouverte',
    nom: 'Découverte',
    prix: 0,
    credits: 15,
    duréeJours: 30,
    features: ['revisionFeat', 'orientationFeat', 'ficheFeat'],
  },
  {
    id: 'standard',
    nom: 'Standard',
    prix: 1000,
    credits: 60,
    duréeJours: 30,
    features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat'],
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix: 3000,
    credits: 200,
    duréeJours: 30,
    features: ['revisionFeat', 'orientationFeat', 'ficheFeat', 'copieFeat', 'prioriteFeat'],
  },
]

export function offreById(id) {
  return OFFRES.find((o) => o.id === id) || OFFRES[0]
}

/** L'offre gratuite par défaut (aucun abonnement actif). */
export const OFFRE_GRATUITE = OFFRES[0]
