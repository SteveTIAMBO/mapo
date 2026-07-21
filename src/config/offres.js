// Offres d'abonnement MAPO+ (B2C) — REPLI local (la source de vérité ajustable
// est côté serveur : server/mapo-offres-data.php, lu via mapo-offres.php).
//
// Modèle = jauge de TOKENS façon Claude. Chaque action IA coûte des tokens ;
// l'offre donne un plafond HEBDOMADAIRE (`capTokens`) qui se recharge le lundi.
// Une fois épuisé : monter d'offre ou attendre lundi. La facturation reste
// mensuelle. TOUTES les fonctions IA sont ouvertes à tous les paliers ; ce qui
// diffère = le VOLUME d'usage. Seule fonction réservée aux 6500+ : la relance
// WhatsApp (`whatsapp: true`). `prix` en FCFA (Tranzak), `prixEur` en € (Stripe).

export const DEVISE = 'XAF'

// 4 paliers. « Avancé » (6500) est mis en avant (`promo`) : objectif = y orienter
// le maximum de familles. `avantages` = clés i18n listées dans l'accordéon.
export const OFFRES = [
  { id: 'decouverte', nom: 'Découverte', prix: 0,     prixEur: 0,     capTokens: 25000,  cycleJours: 30, promo: false, whatsapp: false, avantages: ['featAllIA', 'featWeeklyReset'] },
  { id: 'essentiel',  nom: 'Essentiel',  prix: 3500,  prixEur: 5.49,  capTokens: 125000, cycleJours: 30, promo: false, whatsapp: false, avantages: ['featAllIA', 'featNotif', 'featOffline'] },
  { id: 'avance',     nom: 'Avancé',     prix: 6500,  prixEur: 9.99,  capTokens: 300000, cycleJours: 30, promo: true,  whatsapp: true,  avantages: ['featAllIA', 'featWhatsapp', 'featFamille', 'featNotif'] },
  { id: 'illimite',   nom: 'Premium',    prix: 10000, prixEur: 14.99, capTokens: 600000, cycleJours: 30, promo: false, whatsapp: true,  avantages: ['featWhatsapp', 'featPriority', 'featFamille', 'featAllIA'] },
]

// Réduction « famille » : appliquée dès le 2e enfant abonné (repli ; le serveur
// fait foi via mapo-offres.php → remiseFamille).
export const REMISE_FAMILLE = { minEnfants: 2, pct: 35 }

// Recharges de crédits ponctuelles (PAYG) — REPLI local. Le serveur fait foi.
// Un achat ajoute des tokens à un solde « bonus » qui ne se recharge pas chaque
// semaine (consommé après la jauge d'abonnement).
export const CREDIT_PACKS = [
  { id: 'pack_s', nom: 'Petite recharge', tokens: 60000,  prix: 1000, prixEur: 1.99 },
  { id: 'pack_m', nom: 'Recharge',        tokens: 180000, prix: 2500, prixEur: 4.99 },
  { id: 'pack_l', nom: 'Grande recharge', tokens: 500000, prix: 6000, prixEur: 11.99 },
]

/** Nombre formaté (25 000). */
export function fmtTokens(n) { return (n || 0).toLocaleString('fr-FR') }

export function offreById(id) { return OFFRES.find((o) => o.id === id) || OFFRES[0] }
export const OFFRE_GRATUITE = OFFRES[0]
