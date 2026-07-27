// Démo « Mon école » : simule un compte MAPO+ (Awa, 5ème) RELIÉ à une école MAPO
// (Collège EDUFREM). En mode démo, aucun pont serveur/clé n'est requis : le store
// lienEcole sert ces fixtures pour montrer TOUT le parcours parent/élève (devoirs,
// cours, notes & bulletins, messagerie) exactement comme le fera la vraie liaison.
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
  ecoleQuartier: 'Bastos',
  ecoleVille: 'Yaoundé',
  ecoleTel: '+237 6 99 00 00 00',
  ecoleEmail: 'vie-scolaire@college-edufrem.cm',
  anneeScolaire: '2025-2026',
  directeur: 'M. Samuel EDIMO',
  profPrincipal: 'Mme Ngo BALLA',
}

// Petits PDF de cours (déposés par les profs) — data URL, consultables in-app en démo.
const PDF_MATHS = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NzMgPj4Kc3RyZWFtCkJUCi9GMSAxNiBUZgo2MCA3ODAgVGQKMTggVEwKKENvbGxlZ2UgRURVRlJFTSAtIENvdXJzIGRlIE1hdGhlbWF0aXF1ZXMpIFRqClQqCihDaGFwaXRyZSA6IExlcyBmcmFjdGlvbnMgXCg1ZW1lXCkpIFRqClQqCigpIFRqClQqCihVbmUgZnJhY3Rpb24gYS9iIDogYSBlc3QgbGUgbnVtZXJhdGV1ciwgYiBsZSBkZW5vbWluYXRldXIgXChiICE9IDBcKS4pIFRqClQqCihGcmFjdGlvbnMgZXF1aXZhbGVudGVzIDogb24gbXVsdGlwbGllIG91IGRpdmlzZSBsZSBudW1lcmF0ZXVyIEVUKSBUagpUKgoobGUgZGVub21pbmF0ZXVyIHBhciBsZSBtZW1lIG5vbWJyZS4gRXhlbXBsZSA6IDIvMyA9IDQvNi4pIFRqClQqCigpIFRqClQqCihBZGRpdGlvbiBcKG1lbWUgZGVub21pbmF0ZXVyXCkgOiAxLzUgKyAyLzUgPSAzLzUuKSBUagpUKgooKSBUagpUKgooTS4gRm90c28gLSBEb2N1bWVudCBkZSBjb3VycyBcKGRlbW8gTUFQTytcKS4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwNzY1IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKODM1CiUlRU9G'
const PDF_FR = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0MTEgPj4Kc3RyZWFtCkJUCi9GMSAxNiBUZgo2MCA3ODAgVGQKMTggVEwKKENvbGxlZ2UgRURVRlJFTSAtIENvdXJzIGRlIEZyYW5jYWlzKSBUagpUKgooTGUgcHJlc2VudCBkZSBsJ2luZGljYXRpZiBcKDVlbWVcKSkgVGoKVCoKKCkgVGoKVCoKKExlIHByZXNlbnQgZXhwcmltZSB1bmUgYWN0aW9uIHF1aSBzZSBkZXJvdWxlIGF1IG1vbWVudCBvdSBsJ29uIHBhcmxlLikgVGoKVCoKKFRlcm1pbmFpc29ucyBkdSAxZXIgZ3JvdXBlIDogLWUsIC1lcywgLWUsIC1vbnMsIC1leiwgLWVudC4pIFRqClQqCigpIFRqClQqCihFeGVtcGxlIDogamUgY2hhbnRlLCB0dSBjaGFudGVzLCBpbCBjaGFudGUsIG5vdXMgY2hhbnRvbnMuLi4pIFRqClQqCigpIFRqClQqCihNbWUgQWJlbmEgLSBSZXNzb3VyY2UgZGUgY291cnMgXChkZW1vIE1BUE8rXCkuKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDcwMyAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjc3MwolJUVPRg=='

function jour(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function iso(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString() }

// Devoirs de la classe d'Awa + SES rendus (jamais ceux des autres).
// `isDigital` : un devoir « à faire en ligne » s'ouvre et se rend dans l'appli.
export function demoDevoirs() {
  return [
    { id: 'dv1', title: 'Exercices sur les fractions', subjectName: 'Mathématiques', type: 'Devoir', isDigital: false,
      dueDate: jour(2), description: 'Faire les exercices 1 à 5 page 42 du manuel.', submission: null },
    { id: 'dv2', title: 'Schéma de la digestion', subjectName: 'SVT', type: 'Devoir', isDigital: false,
      dueDate: jour(4), description: 'Légender le schéma de l\'appareil digestif (à rendre sur feuille).', submission: null },
    { id: 'dv3', title: 'Rédaction : mon animal préféré', subjectName: 'Français', type: 'Devoir maison', isDigital: true,
      dueDate: jour(-3), description: '20 lignes minimum, au présent de l\'indicatif. À saisir et rendre en ligne.',
      submission: { submittedAt: iso(-4), text: 'Mon animal préféré est le chat. Il est doux et joueur…', grade: 14, feedback: 'Bon travail — attention aux accords du pluriel.', gradedAt: iso(-2) } },
    { id: 'dv4', title: 'Quiz de vocabulaire — unité 3', subjectName: 'Anglais', type: 'Interrogation en ligne', isDigital: true,
      dueDate: jour(1), description: 'Réponds en ligne : donne la traduction anglaise des mots de l\'unité 3 (famille, maison, école).', submission: null },
  ]
}

// Cours/ressources publiés par les profs. Un cours = un PDF déposé par le prof
// (consultable), OU une carte-leçon rédigée directement dans MAPO (consultable).
// Les corrigés/binaires sensibles ne sont jamais exposés.
export function demoCours() {
  return [
    { id: 'co1', matiere: 'Mathématiques', titre: 'Les fractions', type: 'cours', auteur: 'M. Fotso',
      hasFile: true, fileExt: 'pdf', fileName: 'fractions-5eme.pdf', fileViewable: true, fileData: PDF_MATHS,
      contenu: "Une fraction a/b : a est le numérateur, b le dénominateur (b ≠ 0). Fractions équivalentes : on multiplie ou divise le numérateur ET le dénominateur par le même nombre (2/3 = 4/6). Pour additionner deux fractions de même dénominateur, on additionne les numérateurs : 1/5 + 2/5 = 3/5." },
    { id: 'co2', matiere: 'SVT', titre: 'La digestion', type: 'cours', auteur: 'Mme Ngo', hasFile: false,
      contenu: "La digestion transforme les aliments en nutriments assimilables. Elle commence dans la bouche (mastication + salive), se poursuit dans l'estomac (sucs gastriques) puis l'intestin grêle où les nutriments passent dans le sang. Les déchets sont évacués par le gros intestin." },
    { id: 'co3', matiere: 'Français', titre: 'Le présent de l\'indicatif', type: 'ressource', auteur: 'Mme Abena',
      hasFile: true, fileExt: 'pdf', fileName: 'present-indicatif.pdf', fileViewable: true, fileData: PDF_FR,
      contenu: "Le présent de l'indicatif exprime une action qui se déroule au moment où l'on parle. Terminaisons du 1er groupe : -e, -es, -e, -ons, -ez, -ent." },
  ]
}

// Les « moments du bulletin » disponibles (comme au collège : séquences + trimestre).
export function demoPeriodes() {
  return [
    { id: 'seq1', label: 'Séquence 1' },
    { id: 'seq2', label: 'Séquence 2' },
    { id: 'trim1', label: '1er Trimestre' },
  ]
}

// Bulletin (transféré depuis le MAPO de l'école) pour UN moment donné. Format
// identique à celui de l'école : matières + coef + moyenne(s) + appréciations,
// moyenne générale, rang, mention, décision du conseil, signature du directeur.
// Le rang est calculé côté école ; on ne reçoit QUE le nombre (jamais les notes
// des autres). `verifCode` alimente le QR « diplôme vérifiable » du PDF.
export function demoBulletin(periodeId = 'seq1') {
  const base = {
    className: '5ème', ecole: 'Collège EDUFREM',
    quartier: 'Bastos', ville: 'Yaoundé', tel: '+237 6 99 00 00 00',
    email: 'vie-scolaire@college-edufrem.cm', anneeScolaire: '2025-2026',
    directeur: 'M. Samuel EDIMO', profPrincipal: 'Mme Ngo BALLA',
    effectif: 45,
  }
  if (periodeId === 'seq2') {
    return {
      ...base, periodeId, periode: 'Séquence 2',
      sequences: [{ value: 'S2', shortLabel: 'Séq. 2' }],
      moyenneGenerale: 13.86, rang: 9, mention: 'Bien',
      appreciationGenerale: 'Trimestre en progrès. Awa gagne en régularité ; qu\'elle poursuive ses efforts en mathématiques.',
      decision: 'Encouragements', verifCode: 'BUL-EDU140042-S2',
      dateValidation: '2026-01-18',
      matieres: [
        { nom: 'Mathématiques', coef: 4, moyenne: 12, moyenneClasse: 10.4, seqNotes: { S2: 12 }, appreciation: 'En progrès, continue.' },
        { nom: 'Français', coef: 4, moyenne: 14.5, moyenneClasse: 11.2, seqNotes: { S2: 14.5 }, appreciation: 'Très bonne expression écrite.' },
        { nom: 'Anglais', coef: 3, moyenne: 13, moyenneClasse: 11.8, seqNotes: { S2: 13 }, appreciation: 'Participe activement.' },
        { nom: 'SVT', coef: 3, moyenne: 13.5, moyenneClasse: 12.1, seqNotes: { S2: 13.5 }, appreciation: 'Sérieuse et curieuse.' },
        { nom: 'Histoire-Géographie', coef: 2, moyenne: 15, moyenneClasse: 12.6, seqNotes: { S2: 15 }, appreciation: 'Excellent travail.' },
        { nom: 'ECM', coef: 1, moyenne: 15.5, moyenneClasse: 13.9, seqNotes: { S2: 15.5 }, appreciation: 'Très bon état d\'esprit.' },
        { nom: 'EPS', coef: 1, moyenne: 16, moyenneClasse: 13.2, seqNotes: { S2: 16 }, appreciation: 'Dynamique.' },
      ],
    }
  }
  if (periodeId === 'trim1') {
    return {
      ...base, periodeId, periode: '1er Trimestre',
      sequences: [{ value: 'S1', shortLabel: 'Séq. 1' }, { value: 'S2', shortLabel: 'Séq. 2' }],
      moyenneGenerale: 13.55, rang: 10, mention: 'Bien',
      appreciationGenerale: 'Bon trimestre d\'ensemble. Le conseil de classe encourage Awa à consolider les mathématiques.',
      decision: 'Tableau d\'honneur', verifCode: 'BUL-EDU140042-T1',
      dateValidation: '2026-01-20',
      matieres: [
        { nom: 'Mathématiques', coef: 4, moyenne: 11.5, moyenneClasse: 10.2, seqNotes: { S1: 11, S2: 12 }, appreciation: 'Doit consolider les bases.' },
        { nom: 'Français', coef: 4, moyenne: 14.25, moyenneClasse: 11.1, seqNotes: { S1: 14, S2: 14.5 }, appreciation: 'Bon travail à l\'écrit.' },
        { nom: 'Anglais', coef: 3, moyenne: 12.75, moyenneClasse: 11.5, seqNotes: { S1: 12.5, S2: 13 }, appreciation: 'Participe bien à l\'oral.' },
        { nom: 'SVT', coef: 3, moyenne: 13.25, moyenneClasse: 12, seqNotes: { S1: 13, S2: 13.5 }, appreciation: 'Sérieuse et curieuse.' },
        { nom: 'Histoire-Géographie', coef: 2, moyenne: 14.75, moyenneClasse: 12.4, seqNotes: { S1: 14.5, S2: 15 }, appreciation: 'Très bien.' },
        { nom: 'ECM', coef: 1, moyenne: 15.25, moyenneClasse: 13.8, seqNotes: { S1: 15, S2: 15.5 }, appreciation: 'Excellent état d\'esprit.' },
        { nom: 'EPS', coef: 1, moyenne: 16, moyenneClasse: 13.1, seqNotes: { S1: 16, S2: 16 }, appreciation: 'Dynamique.' },
      ],
    }
  }
  // Séquence 1 (par défaut)
  return {
    ...base, periodeId: 'seq1', periode: 'Séquence 1',
    sequences: [{ value: 'S1', shortLabel: 'Séq. 1' }],
    moyenneGenerale: 13.24, rang: 12, mention: 'Bien',
    appreciationGenerale: 'Bon début d\'année. Awa est sérieuse ; un peu plus d\'entraînement en mathématiques l\'aidera.',
    decision: 'Encouragements', verifCode: 'BUL-EDU140042-S1',
    dateValidation: '2025-11-15',
    matieres: [
      { nom: 'Mathématiques', coef: 4, moyenne: 11, moyenneClasse: 10, seqNotes: { S1: 11 }, appreciation: 'Assez bien, doit consolider les bases.' },
      { nom: 'Français', coef: 4, moyenne: 14, moyenneClasse: 11, seqNotes: { S1: 14 }, appreciation: 'Bon travail à l\'écrit.' },
      { nom: 'Anglais', coef: 3, moyenne: 12.5, moyenneClasse: 11.3, seqNotes: { S1: 12.5 }, appreciation: 'Participe bien à l\'oral.' },
      { nom: 'SVT', coef: 3, moyenne: 13, moyenneClasse: 11.9, seqNotes: { S1: 13 }, appreciation: 'Sérieuse et curieuse.' },
      { nom: 'Histoire-Géographie', coef: 2, moyenne: 14.5, moyenneClasse: 12.2, seqNotes: { S1: 14.5 }, appreciation: 'Très bien.' },
      { nom: 'ECM', coef: 1, moyenne: 15, moyenneClasse: 13.7, seqNotes: { S1: 15 }, appreciation: 'Excellent état d\'esprit.' },
      { nom: 'EPS', coef: 1, moyenne: 16, moyenneClasse: 13, seqNotes: { S1: 16 }, appreciation: 'Dynamique.' },
    ],
  }
}

// Messagerie parent/élève ↔ école : messages reçus ET envoyés, groupés en fils
// (threadId) avec objet, comme la messagerie de MAPO.
export function demoMessages() {
  return [
    { id: 'ms1', threadId: 't1', subject: 'Réunion parents-professeurs', from: 'ecole', author: 'Administration', to: 'Parents 5ème', at: iso(-6), read: true,
      body: 'Bonjour, la réunion parents-professeurs aura lieu le vendredi 15 à 15h en salle polyvalente. Votre présence est vivement souhaitée.' },
    { id: 'ms2', threadId: 't1', subject: 'Réunion parents-professeurs', from: 'moi', author: 'Vous', to: 'Administration', at: iso(-6), read: true,
      body: 'Bonjour, merci pour l\'information. Je serai présent(e).' },
    { id: 'ms3', threadId: 't2', subject: 'Suivi en mathématiques', from: 'ecole', author: 'M. Fotso (Mathématiques)', to: 'Awa', at: iso(-2), read: false,
      body: 'Awa progresse en calcul mais doit revoir les fractions. Un peu d\'entraînement à la maison l\'aiderait beaucoup.' },
    { id: 'ms4', threadId: 't3', subject: 'Certificat de scolarité', from: 'moi', author: 'Vous', to: 'Secrétariat', at: iso(-10), read: true,
      body: 'Bonjour, serait-il possible d\'obtenir un certificat de scolarité pour Awa ? Merci d\'avance.' },
    { id: 'ms5', threadId: 't3', subject: 'Certificat de scolarité', from: 'ecole', author: 'Secrétariat', to: 'Vous', at: iso(-9), read: false,
      body: 'Bonjour, votre certificat est prêt. Vous pouvez le retirer au secrétariat ou nous le renvoyons par e-mail. Cordialement.' },
  ]
}

// Destinataires possibles d'un nouveau message (services + enseignants), façon MAPO.
export function demoDestinataires() {
  return [
    { id: 'svc-admin', type: 'service', label: 'Administration' },
    { id: 'svc-secretariat', type: 'service', label: 'Secrétariat' },
    { id: 'svc-vie-scolaire', type: 'service', label: 'Vie scolaire' },
    { id: 'ens-fotso', type: 'enseignant', label: 'M. Fotso (Mathématiques)' },
    { id: 'ens-abena', type: 'enseignant', label: 'Mme Abena (Français)' },
    { id: 'ens-ngo', type: 'enseignant', label: 'Mme Ngo (SVT)' },
  ]
}
