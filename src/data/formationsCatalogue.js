// Catalogue des établissements + formations (programmes préchargés) pour
// l'onboarding « apprenant » (supérieur). L'étudiant choisit son école puis sa
// formation → les matières se préchargent, il vérifie/ajuste, puis valide.
//
// « Documentation validée » : ces maquettes doivent refléter le cadre éducatif
// officiel du pays. Les listes ci-dessous sont RÉALISTES (LMD) et à remplacer par
// les maquettes officielles quand on les a. Si une école/formation n'est PAS ici,
// l'apprenant garde la main (saisie manuelle — voir NIVEAU_HORS_CATALOGUE).

export const ECOLES_CATALOGUE = [
  {
    id: 'ucac',
    nom: "UCAC — Université Catholique d'Afrique Centrale",
    pays: 'CM',
    formations: [
      {
        id: 'ucac-eco-gestion', nom: 'Licence — Économie de Gestion', niveau: 'Licence 1',
        matieres: ['Microéconomie', 'Macroéconomie', 'Comptabilité générale', 'Mathématiques financières', 'Statistiques descriptives', 'Introduction au droit', 'Gestion d’entreprise', 'Anglais', 'Informatique de gestion', 'Techniques d’expression'],
      },
      {
        id: 'ucac-compta-finance', nom: 'Licence — Comptabilité-Finance', niveau: 'Licence 1',
        matieres: ['Comptabilité générale', 'Comptabilité analytique', 'Fiscalité', 'Finance d’entreprise', 'Mathématiques financières', 'Microéconomie', 'Droit des affaires', 'Statistiques', 'Audit', 'Anglais des affaires'],
      },
      {
        id: 'ucac-marketing', nom: 'Licence — Marketing, Vente et Communication', niveau: 'Licence 1',
        matieres: ['Fondements du marketing', 'Comportement du consommateur', 'Communication', 'Techniques de vente', 'Études de marché', 'Comptabilité générale', 'Introduction au droit', 'Statistiques', 'Marketing digital', 'Anglais'],
      },
      {
        id: 'ucac-admin-entreprises', nom: 'Licence — Administration des Entreprises', niveau: 'Licence 1',
        matieres: ['Management des organisations', 'Gestion des ressources humaines', 'Comptabilité générale', 'Droit du travail', 'Économie d’entreprise', 'Marketing', 'Statistiques', 'Communication', 'Anglais', 'Informatique'],
      },
      {
        id: 'ucac-droit', nom: 'Licence — Droit', niveau: 'Licence 1',
        matieres: ['Droit civil', 'Droit constitutionnel', 'Introduction à l’étude du droit', 'Histoire du droit', 'Relations internationales', 'Institutions politiques', 'Économie politique', 'Anglais juridique', 'Méthodologie juridique'],
      },
    ],
  },
]

export function ecoleCatalogue(id) {
  return ECOLES_CATALOGUE.find((e) => e.id === id) || null
}
export function formationCatalogue(ecoleId, formationId) {
  const e = ecoleCatalogue(ecoleId)
  return e ? (e.formations.find((f) => f.id === formationId) || null) : null
}
