// Démo « Mon école » : simule un compte MAPO+ (Awa, 5ème) RELIÉ à une école MAPO
// (Collège EDUFREM). En mode démo, aucun pont serveur/clé n'est requis : le store
// lienEcole sert ces fixtures pour montrer TOUT le parcours parent/élève (devoirs,
// cours, notes & bulletin, messagerie) exactement comme le fera la vraie liaison.
//
// Le CODE de liaison démo (à saisir dans « Mon école ») :
export const DEMO_LINK_CODE = 'edufrem~DEMOAWA5'

// Contexte du lien démo (mêmes champs que le vrai lien scellé par le serveur).
export const DEMO_LIEN = {
  schoolId: 'edufrem-demo',
  eleveId: 'demo-awa',
  className: '5ème',
  classId: 'c-5a',
  matricule: 'EDU140042',
  ecole: 'Collège EDUFREM',
}

function jour(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function iso(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString() }

// Devoirs de la classe d'Awa + SES rendus (jamais ceux des autres).
export function demoDevoirs() {
  return [
    { id: 'dv1', title: 'Exercices sur les fractions', subjectName: 'Mathématiques', type: 'Devoir', isDigital: false,
      dueDate: jour(2), description: 'Faire les exercices 1 à 5 page 42.', submission: null },
    { id: 'dv2', title: 'Schéma de la digestion', subjectName: 'SVT', type: 'Devoir', isDigital: false,
      dueDate: jour(4), description: 'Légender le schéma de l\'appareil digestif.', submission: null },
    { id: 'dv3', title: 'Rédaction : mon animal préféré', subjectName: 'Français', type: 'Devoir maison', isDigital: true,
      dueDate: jour(-3), description: '20 lignes minimum, au présent.',
      submission: { submittedAt: iso(-4), grade: 14, feedback: 'Bon travail — attention aux accords du pluriel.', gradedAt: iso(-2) } },
    { id: 'dv4', title: 'Vocabulaire unité 3', subjectName: 'Anglais', type: 'Interrogation', isDigital: false,
      dueDate: jour(-6), description: 'Réviser la liste de mots.', submission: null },
  ]
}

// Cours/ressources publiés par les profs (corrigés/binaires jamais exposés).
export function demoCours() {
  return [
    { id: 'co1', matiere: 'Mathématiques', titre: 'Les fractions', type: 'cours', auteur: 'M. Fotso', hasFile: true, fileExt: 'pdf',
      contenu: "Une fraction a/b : a est le numérateur, b le dénominateur (b ≠ 0). Fractions équivalentes : on multiplie ou divise le numérateur ET le dénominateur par le même nombre (2/3 = 4/6). Pour additionner deux fractions de même dénominateur, on additionne les numérateurs : 1/5 + 2/5 = 3/5." },
    { id: 'co2', matiere: 'SVT', titre: 'La digestion', type: 'cours', auteur: 'Mme Ngo', hasFile: false,
      contenu: "La digestion transforme les aliments en nutriments assimilables. Elle commence dans la bouche (mastication + salive), se poursuit dans l'estomac (sucs gastriques) puis l'intestin grêle où les nutriments passent dans le sang. Les déchets sont évacués par le gros intestin." },
    { id: 'co3', matiere: 'Français', titre: 'Le présent de l\'indicatif', type: 'ressource', auteur: 'Mme Abena', hasFile: true, fileExt: 'pdf',
      contenu: "Le présent de l'indicatif exprime une action qui se déroule au moment où l'on parle. Terminaisons du 1er groupe : -e, -es, -e, -ons, -ez, -ent." },
  ]
}

// Bulletin (transféré depuis le MAPO de l'école) : notes d'Awa, moyennes, rang,
// mention. Le rang est calculé côté école ; on ne reçoit QUE le nombre (jamais les
// notes des autres élèves).
export function demoBulletin() {
  return {
    periode: 'Séquence 1', className: '5ème', ecole: 'Collège EDUFREM',
    moyenneGenerale: 13.24, rang: 12, effectif: 45, mention: 'Bien', decision: '',
    matieres: [
      { nom: 'Mathématiques', moyenne: 11, coef: 4, appreciation: 'Assez bien, doit consolider les bases.' },
      { nom: 'Français', moyenne: 14, coef: 4, appreciation: 'Bon travail à l\'écrit.' },
      { nom: 'Anglais', moyenne: 12.5, coef: 3, appreciation: 'Participe bien à l\'oral.' },
      { nom: 'SVT', moyenne: 13, coef: 3, appreciation: 'Sérieuse et curieuse.' },
      { nom: 'Histoire-Géographie', moyenne: 14.5, coef: 2, appreciation: 'Très bien.' },
      { nom: 'ECM', moyenne: 15, coef: 1, appreciation: 'Excellent état d\'esprit.' },
      { nom: 'EPS', moyenne: 16, coef: 1, appreciation: 'Dynamique.' },
    ],
  }
}

// Fil de messagerie parent ↔ école.
export function demoMessages() {
  return [
    { id: 'ms1', from: 'ecole', author: 'Administration', at: iso(-6),
      text: 'Bonjour, la réunion parents-professeurs aura lieu le vendredi 15 à 15h. Votre présence est souhaitée.' },
    { id: 'ms2', from: 'moi', author: 'Vous', at: iso(-6), text: 'Bonjour, merci pour l\'information. Je serai présent.' },
    { id: 'ms3', from: 'ecole', author: 'M. Fotso (Mathématiques)', at: iso(-2),
      text: 'Awa progresse en calcul mais doit revoir les fractions. Un peu d\'entraînement à la maison l\'aiderait.' },
  ]
}
