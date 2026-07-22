// Catalogue de CERTIFICATIONS professionnelles (préparation à un examen de certif).
// L'apprenant choisit sa certif → les modules/domaines se préchargent (éditables).
// S'il ne la trouve pas, il choisit « Autre » et saisit ses propres modules.
// Modules = grands domaines du programme officiel (indicatifs, à affiner par organisme).
// Organisme = organisme de certification par défaut (l'apprenant peut préciser le sien).

export const CERTIFICATIONS = [
  {
    id: 'iso27001-li', nom: 'ISO/IEC 27001 Lead Implementer', sigle: 'ISO 27001 LI', organisme: 'PECB',
    domaine: 'Sécurité de l’information',
    modules: [
      'Fondamentaux de la sécurité de l’information', 'Système de management de la sécurité de l’information (SMSI)',
      'Norme ISO/IEC 27001 — exigences', 'Cadrage et périmètre du SMSI', 'Analyse et appréciation des risques',
      'Traitement des risques', 'Déclaration d’applicabilité (SoA)', 'Mesures de sécurité (Annexe A / ISO 27002)',
      'Politiques et procédures de sécurité', 'Gestion des actifs et classification', 'Sensibilisation et formation',
      'Gestion des incidents de sécurité', 'Continuité d’activité', 'Surveillance, mesure et indicateurs',
      'Audit interne', 'Revue de direction', 'Amélioration continue (PDCA)', 'Processus de certification',
    ],
  },
  {
    id: 'iso27001-la', nom: 'ISO/IEC 27001 Lead Auditor', sigle: 'ISO 27001 LA', organisme: 'PECB',
    domaine: 'Sécurité de l’information',
    modules: [
      'Fondamentaux du SMSI et ISO/IEC 27001', 'Principes et concepts de l’audit', 'Norme ISO 19011 (lignes directrices d’audit)',
      'Préparation d’un audit de certification', 'Réalisation d’un audit (audit sur site)', 'Techniques d’audit et échantillonnage',
      'Constats d’audit et non-conformités', 'Rédaction du rapport d’audit', 'Clôture et suivi de l’audit',
      'Mesures de sécurité (Annexe A / ISO 27002)', 'Gestion d’un programme d’audit', 'Compétences et déontologie de l’auditeur',
    ],
  },
  {
    id: 'itil4-foundation', nom: 'ITIL 4 Foundation', sigle: 'ITIL 4', organisme: 'PeopleCert / Axelos',
    domaine: 'Gestion des services IT',
    modules: [
      'Concepts clés de la gestion des services', 'Les 4 dimensions de la gestion des services', 'Le système de valeur des services (SVS)',
      'Les 7 principes directeurs', 'La chaîne de valeur des services', 'Modèle d’amélioration continue',
      'Pratiques générales de management', 'Pratiques de gestion des services', 'Pratiques de gestion technique',
      'Gestion des incidents et des problèmes', 'Gestion des demandes et du niveau de service', 'Gestion des changements',
    ],
  },
  {
    id: 'pmp', nom: 'Project Management Professional (PMP)', sigle: 'PMP', organisme: 'PMI',
    domaine: 'Gestion de projet',
    modules: [
      'Environnement du projet', 'Rôle du chef de projet', 'Domaine « Personnes » (People)', 'Domaine « Processus » (Process)',
      'Domaine « Environnement de l’entreprise »', 'Gestion de l’intégration', 'Périmètre et échéancier', 'Coûts et budget',
      'Qualité', 'Ressources et équipe', 'Communication et parties prenantes', 'Risques', 'Approvisionnements',
      'Approches agiles et hybrides', 'Éthique et responsabilité professionnelle',
    ],
  },
  {
    id: 'cissp', nom: 'CISSP', sigle: 'CISSP', organisme: 'ISC2',
    domaine: 'Cybersécurité',
    modules: [
      'Sécurité et gestion des risques', 'Sécurité des actifs', 'Architecture et ingénierie de sécurité',
      'Sécurité des communications et des réseaux', 'Gestion des identités et des accès (IAM)',
      'Évaluation et tests de sécurité', 'Sécurité des opérations', 'Sécurité du développement logiciel',
    ],
  },
  {
    id: 'cisa', nom: 'CISA', sigle: 'CISA', organisme: 'ISACA',
    domaine: 'Audit des systèmes d’information',
    modules: [
      'Processus d’audit des SI', 'Gouvernance et gestion de l’IT', 'Acquisition, développement et implémentation des SI',
      'Exploitation et résilience des SI', 'Protection des actifs informationnels',
    ],
  },
  {
    id: 'iso9001-la', nom: 'ISO 9001 Lead Auditor', sigle: 'ISO 9001 LA', organisme: 'PECB / AFNOR',
    domaine: 'Management de la qualité',
    modules: [
      'Fondamentaux du management de la qualité', 'Norme ISO 9001 — exigences', 'Approche processus et amélioration continue',
      'Principes et concepts de l’audit', 'ISO 19011 (lignes directrices d’audit)', 'Préparation et réalisation d’un audit',
      'Constats et non-conformités', 'Rapport d’audit et suivi', 'Gestion d’un programme d’audit',
    ],
  },
]

export function certification(id) {
  return CERTIFICATIONS.find((c) => c.id === id) || null
}

// Ressources OFFICIELLES / de confiance par certif (organismes de normalisation et
// de certification uniquement) — pour réviser sur des sources fiables du domaine.
export const CERT_REFERENCES = {
  'iso27001-li': [
    { label: 'Norme ISO/IEC 27001 (iso.org)', url: 'https://www.iso.org/standard/27001' },
    { label: 'PECB — ISO 27001', url: 'https://pecb.com/en/education-and-certification-for-individuals/iso-iec-27001' },
    { label: 'ANSSI — guides SSI', url: 'https://cyber.gouv.fr' },
  ],
  'iso27001-la': [
    { label: 'Norme ISO/IEC 27001 (iso.org)', url: 'https://www.iso.org/standard/27001' },
    { label: 'ISO 19011 — audit', url: 'https://www.iso.org/standard/70017.html' },
    { label: 'PECB', url: 'https://pecb.com' },
  ],
  'itil4-foundation': [
    { label: 'PeopleCert — ITIL', url: 'https://www.peoplecert.org/browse-certifications/itil-certifications' },
  ],
  'pmp': [
    { label: 'PMI — PMP', url: 'https://www.pmi.org/certifications/project-management-pmp' },
  ],
  'cissp': [
    { label: 'ISC2 — CISSP', url: 'https://www.isc2.org/certifications/cissp' },
  ],
  'cisa': [
    { label: 'ISACA — CISA', url: 'https://www.isaca.org/credentialing/cisa' },
  ],
  'iso9001-la': [
    { label: 'Norme ISO 9001 (iso.org)', url: 'https://www.iso.org/standard/62085.html' },
    { label: 'PECB', url: 'https://pecb.com' },
  ],
}
export function certReferences(id) { return CERT_REFERENCES[id] || [] }
