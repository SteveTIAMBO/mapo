/**
 * Référentiel d'orientation MAPO / EDUFREM
 * Données compactes prêtes à bundler dans l'app Vue 3.
 *
 * Sources : recherche orientation_cameroun.json (OBC, MINESUP, INS, Africarrieres...)
 * et orientation_france.json (Campus France, France Travail/DARES, ONISEP, l'Etudiant).
 * Établissements et chiffres repris fidèlement des sources ; chiffres à revérifier chaque rentrée.
 *
 * Chaque domaine est taggé avec 2 à 3 des 6 compétences IRIIG (clés ci-dessous),
 * pour matcher le profil auto-évalué de l'élève.
 */

// 6 compétences IRIIG (ordre fixe).
// 'court'    = définition en 1 phrase (pour lycéens).
// 'question' = formulation courte à la 1re personne (compat ancien slider unique).
// 'items'    = banque de 5 énoncés Likert (fr/en) — l'auto-évaluation en calcule
//              la moyenne (1 à 5) pour définir le radar objectivement.
export const COMPETENCES_6C = [
  {
    key: 'creativite',
    label: 'Créativité',
    label_en: 'Creativity',
    court: "Imaginer des idées originales et trouver des solutions nouvelles.",
    question: 'Je propose des idées et des solutions nouvelles.',
    items: [
      { fr: "Je trouve facilement des idées nouvelles ou originales.", en: "I easily come up with new or original ideas." },
      { fr: "Face à un problème, j'imagine plusieurs solutions différentes.", en: "When facing a problem, I imagine several different solutions." },
      { fr: "J'aime inventer, créer ou détourner les choses de leur usage habituel.", en: "I enjoy inventing, creating, or using things in unexpected ways." },
      { fr: "La routine m'ennuie vite et je cherche à faire autrement.", en: "Routine bores me quickly and I look for new ways to do things." },
      { fr: "On me dit souvent que j'ai de l'imagination.", en: "People often tell me I'm imaginative." },
    ],
  },
  {
    key: 'esprit_critique',
    label: 'Esprit critique',
    label_en: 'Critical thinking',
    court: "Analyser les faits, raisonner avec rigueur et ne pas tout accepter sans réfléchir.",
    question: "J'analyse les informations avant de me forger une opinion.",
    items: [
      { fr: "Je vérifie une information avant de la croire.", en: "I check information before believing it." },
      { fr: "Je sais distinguer un fait d'une opinion.", en: "I can tell a fact from an opinion." },
      { fr: "Avant de décider, je pèse le pour et le contre.", en: "Before deciding, I weigh the pros and cons." },
      { fr: "Je repère les arguments faibles ou les pièges dans un raisonnement.", en: "I spot weak arguments or flaws in reasoning." },
      { fr: "Je n'accepte pas une idée juste parce que tout le monde la répète.", en: "I don't accept an idea just because everyone repeats it." },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    label_en: 'Communication',
    court: "S'exprimer clairement à l'écrit comme à l'oral et savoir écouter.",
    question: "Je m'exprime clairement et je sais me faire comprendre.",
    items: [
      { fr: "Je m'exprime clairement, à l'oral comme à l'écrit.", en: "I express myself clearly, both speaking and writing." },
      { fr: "Je sais adapter mes mots à la personne qui m'écoute.", en: "I adapt my words to the person listening." },
      { fr: "J'écoute vraiment avant de répondre.", en: "I truly listen before I answer." },
      { fr: "Je suis à l'aise pour parler devant un groupe.", en: "I'm comfortable speaking in front of a group." },
      { fr: "J'arrive à expliquer simplement une idée compliquée.", en: "I can explain a complicated idea simply." },
    ],
  },
  {
    key: 'cooperation',
    label: 'Coopération',
    label_en: 'Cooperation',
    court: "Travailler en équipe, partager et avancer avec les autres vers un but commun.",
    question: "J'aime travailler en équipe et avancer avec les autres.",
    items: [
      { fr: "J'aime travailler en équipe vers un objectif commun.", en: "I enjoy working in a team toward a common goal." },
      { fr: "Je partage volontiers l'information et l'aide avec les autres.", en: "I willingly share information and help others." },
      { fr: "Je tiens compte de l'avis des autres, même différent du mien.", en: "I take others' views into account, even when different from mine." },
      { fr: "Je fais ma part pour que le groupe réussisse.", en: "I do my part so the group succeeds." },
      { fr: "Je sais gérer un désaccord sans casser l'ambiance.", en: "I can handle a disagreement without ruining the mood." },
    ],
  },
  {
    key: 'courage',
    label: 'Courage',
    label_en: 'Courage',
    court: "Oser, persévérer face aux difficultés et sortir de sa zone de confort.",
    question: "J'ose me lancer et je persévère face aux difficultés.",
    items: [
      { fr: "J'ose me lancer même si je ne suis pas sûr de réussir.", en: "I dare to start even when I'm not sure I'll succeed." },
      { fr: "Je persévère quand c'est difficile, sans abandonner.", en: "I persevere when things get hard, without giving up." },
      { fr: "Je sors de ma zone de confort pour apprendre.", en: "I step out of my comfort zone to learn." },
      { fr: "Je défends mes idées même si elles ne plaisent pas à tous.", en: "I stand up for my ideas even if not everyone likes them." },
      { fr: "Un échec ne m'arrête pas : je recommence autrement.", en: "A failure doesn't stop me: I try again differently." },
    ],
  },
  {
    key: 'confiance',
    label: 'Confiance',
    label_en: 'Confidence',
    court: "Croire en ses capacités, prendre des décisions et assumer ses choix.",
    question: "J'ai confiance en mes capacités pour réussir ce que j'entreprends.",
    items: [
      { fr: "J'ai confiance en mes capacités pour réussir ce que j'entreprends.", en: "I trust my abilities to succeed at what I take on." },
      { fr: "Je prends des décisions sans avoir besoin d'être rassuré en permanence.", en: "I make decisions without needing constant reassurance." },
      { fr: "J'assume mes choix et leurs conséquences.", en: "I own my choices and their consequences." },
      { fr: "Je reste calme et sûr de moi dans une situation nouvelle.", en: "I stay calm and self-assured in a new situation." },
      { fr: "Je connais mes points forts et je m'appuie dessus.", en: "I know my strengths and rely on them." },
    ],
  },
]

export const PAYS_ORIENTATION = [
  { code: 'cameroun', label: 'Cameroun', label_en: 'Cameroon' },
  { code: 'france', label: 'France (international)', label_en: 'France (international)' },
]

export const ORIENTATION = {
  cameroun: {
    intro:
      "Après le bac camerounais (séries A, B, C, D, E, TI, F, G), de nombreuses voies s'ouvrent : université (LMD), grandes écoles sur concours, BTS/HND. Repère les domaines qui correspondent à ton profil et à la demande du marché.",
    domaines: [
      {
        id: 'sante',
        domaine: 'Santé et Médecine',
        competences: ['esprit_critique', 'confiance', 'communication'],
        series_conseillees: ['D', 'C'],
        etablissements: [
          'FMSB - Université de Yaoundé I',
          'Facultés de médecine de Douala, Dschang, Buea, Bamenda, Garoua',
          'Écoles paramédicales (infirmiers, sages-femmes, labo)',
        ],
        metiers: [
          'Médecin généraliste (7 ans)',
          'Pharmacien (6 ans)',
          'Chirurgien-dentiste (6 ans)',
          'Infirmier, sage-femme',
          'Technicien de laboratoire, kinésithérapeute',
        ],
        demande: 'porteur',
        commentaire:
          "Entrée très sélective (concours FMSB ~2-3% d'admis), mais déficit structurel de personnel. Insertion médecine ~97% (MINESUP, 2016-2020).",
      },
      {
        id: 'droit',
        domaine: 'Droit, Sciences Politiques et Diplomatie',
        competences: ['communication', 'esprit_critique', 'courage'],
        series_conseillees: ['A4', 'B', 'toutes séries'],
        etablissements: [
          'Facultés des Sciences Juridiques et Politiques (toutes universités)',
          'Université de Yaoundé II (Soa)',
          'IRIC - Yaoundé II (concours)',
          'ENAM (magistrature, haute administration ; concours)',
        ],
        metiers: [
          'Avocat, magistrat, notaire, huissier',
          "Juriste d'entreprise / conseil juridique",
          'Diplomate, attaché des affaires étrangères',
          'Administrateur civil',
          'Officier de police judiciaire',
        ],
        demande: 'moyen',
        commentaire:
          'Filière très demandée mais débouchés saturés hors concours administratifs. Insertion ~65% (MINESUP, 2016-2020).',
      },
      {
        id: 'eco_gestion',
        domaine: 'Sciences Économiques, Gestion et Finance',
        competences: ['esprit_critique', 'communication', 'confiance'],
        series_conseillees: ['B', 'G/STT', 'A4', 'C/D'],
        etablissements: [
          'Facultés des Sciences Économiques et de Gestion (universités)',
          'ESSEC - Université de Douala',
          'IUT de Douala, Bandjoun (BTS/DUT gestion, banque)',
          'Écoles de commerce privées reconnues',
        ],
        metiers: [
          'Comptable, contrôleur de gestion, auditeur',
          'Banquier, analyste financier, assureur',
          'Responsable marketing / commercial',
          'Gestionnaire RH, logisticien',
          'Expert-comptable, entrepreneur',
        ],
        demande: 'porteur',
        commentaire:
          'Banque/finance porteurs. Insertion : commerce ~85%, comptabilité ~88%, banque-finance ~83% (MINESUP, 2016-2020).',
      },
      {
        id: 'numerique',
        domaine: 'Informatique et Numérique',
        competences: ['esprit_critique', 'creativite', 'cooperation'],
        series_conseillees: ['TI', 'C', 'E', 'F2'],
        etablissements: [
          'ENSP de Yaoundé (ENSPY) - génie informatique, télécoms',
          'Faculté des Sciences (informatique) - Yaoundé I',
          'IUT (Douala, Bandjoun, Bamenda)',
          'Écoles privées + certifications professionnelles',
        ],
        metiers: [
          'Développeur web / mobile / logiciel',
          'Administrateur systèmes et réseaux',
          'Ingénieur télécoms',
          'Spécialiste cybersécurité',
          'Data analyst / data scientist',
        ],
        demande: 'porteur',
        commentaire:
          "Secteur le plus dynamique (plan Cameroun Numérique, mobile ~82%). Insertion TIC ~84% (MINESUP, 2016-2020).",
      },
      {
        id: 'ingenierie',
        domaine: 'Ingénierie, BTP et Génie',
        competences: ['esprit_critique', 'creativite', 'cooperation'],
        series_conseillees: ['C', 'E', 'TI', 'F'],
        etablissements: [
          'ENSPY - génie civil, électrique, mécanique, télécoms',
          'ENSP de Maroua',
          'ENSET de Douala (enseignement technique)',
          'IUT (BTS/DUT industriels)',
        ],
        metiers: [
          'Ingénieur génie civil / BTP',
          'Ingénieur électrique / énergie',
          'Ingénieur mécanique / industriel',
          'Ingénieur télécoms',
          'Topographe, conducteur de travaux',
        ],
        demande: 'porteur',
        commentaire:
          'BTP au cœur des priorités (Port de Kribi, barrages, routes). Insertion génie civil/électrique ~90-92% (MINESUP).',
      },
      {
        id: 'agronomie',
        domaine: 'Agronomie et Agro-industrie',
        competences: ['esprit_critique', 'cooperation', 'creativite'],
        series_conseillees: ['D', 'C'],
        etablissements: [
          'FASA - Université de Dschang (centre d\'excellence)',
          'ENSAI - Université de Ngaoundéré (agro-industrie)',
          'Instituts/écoles agricoles publics et privés',
        ],
        metiers: [
          'Ingénieur agronome',
          'Ingénieur agro-alimentaire',
          'Expert eaux, forêts et environnement',
          'Conseiller en agribusiness',
          'Spécialiste transformation agroalimentaire',
        ],
        demande: 'porteur',
        commentaire:
          "Agriculture = ~62% des actifs ; la valeur ajoutée est dans la transformation. Insertion agronomie ~77% (MINESUP).",
      },
      {
        id: 'lettres_shs',
        domaine: 'Lettres, Langues et Sciences Humaines',
        competences: ['communication', 'creativite', 'esprit_critique'],
        series_conseillees: ['A4', 'A', 'ABI', 'B'],
        etablissements: [
          'Facultés des Lettres et Sciences Humaines (toutes universités)',
          'ESSTIC - Yaoundé II (journalisme, communication ; concours)',
          'Filières langues appliquées / traduction',
        ],
        metiers: [
          'Enseignant (lettres, langues, histoire-géo, philo)',
          'Traducteur / interprète',
          'Journaliste, communicant',
          'Sociologue, travailleur social',
          'Chercheur, documentaliste',
        ],
        demande: 'moyen',
        commentaire:
          "Forte affluence mais insertion plus difficile (~58%, le plus faible, MINESUP). Le bilinguisme FR/EN est un atout.",
      },
      {
        id: 'education',
        domaine: 'Éducation et Enseignement',
        competences: ['communication', 'cooperation', 'confiance'],
        series_conseillees: ['toutes séries', 'C/E/F/G'],
        etablissements: [
          'ENS de Yaoundé - Université de Yaoundé I',
          'ENS de Maroua, Bertoua, Bambili',
          'ENSET de Douala (enseignement technique)',
          "ENIEG / écoles normales d'instituteurs",
        ],
        metiers: [
          "Professeur de collège et lycée d'enseignement général",
          "Professeur d'enseignement technique",
          "Conseiller d'orientation",
          'Instituteur (via ENIEG)',
        ],
        demande: 'moyen',
        commentaire:
          'Voie sécurisée (poste dans la fonction publique pour les admis aux concours), mais places limitées par les budgets.',
      },
      {
        id: 'sciences_fond',
        domaine: 'Sciences Fondamentales',
        competences: ['esprit_critique', 'creativite', 'courage'],
        series_conseillees: ['C', 'D', 'E'],
        etablissements: [
          "Facultés des Sciences - universités d'État",
          'ISSEA (statistique appliquée)',
          'ENSAI',
        ],
        metiers: [
          'Enseignant-chercheur, chercheur',
          'Statisticien, ingénieur statisticien-économiste',
          'Géologue (mines, pétrole)',
          'Chimiste, physicien, biologiste',
        ],
        demande: 'moyen',
        commentaire:
          'Débouchés surtout académiques ; statistique et géologie plus porteuses. Insertion ~59% (MINESUP, 2016-2020).',
      },
      {
        id: 'arts',
        domaine: 'Arts, Communication et Économie créative',
        competences: ['creativite', 'communication', 'courage'],
        series_conseillees: ['AC/SH', 'A4', 'AF'],
        etablissements: [
          'Institut des Beaux-Arts de Foumban et de Nkongsamba',
          'ESSTIC (communication, audiovisuel) - Yaoundé II',
          'Filières arts/cinématographie + écoles privées',
        ],
        metiers: [
          'Artiste plasticien, designer, infographiste',
          "Métiers de l'audiovisuel et du cinéma",
          'Communicant, créateur de contenu',
          'Métiers du patrimoine et de la culture',
        ],
        demande: 'moyen',
        commentaire:
          "Économie créative émergente, mais offre de formation publique limitée. Donnée faible sur l'insertion.",
      },
      {
        id: 'logistique_tourisme',
        domaine: 'Tourisme, Hôtellerie et Logistique',
        competences: ['communication', 'cooperation', 'confiance'],
        series_conseillees: ['A4', 'B', 'G/STT'],
        etablissements: [
          'Filières BT/BTS Hôtellerie-Restauration-Tourisme (OBC)',
          'Filière logistique et transport - Université de Bamenda',
          'IUT et écoles privées (logistique, douane-transit)',
        ],
        metiers: [
          'Responsable hôtelier, gestionnaire de restaurant',
          'Agent de voyage',
          'Logisticien, agent de transit',
          'Déclarant en douane',
          'Responsable supply chain',
        ],
        demande: 'moyen',
        commentaire:
          'Logistique porteuse (insertion ~88%, MINESUP), portée par les corridors et le Port de Kribi. Tourisme : potentiel encore limité.',
      },
      {
        id: 'energie_mines',
        domaine: 'Énergie, Mines et Hydrocarbures',
        competences: ['esprit_critique', 'courage', 'cooperation'],
        series_conseillees: ['C', 'D', 'E', 'F'],
        etablissements: [
          'ENSPY (génie électrique, énergie)',
          "Facultés des Sciences (géologie)",
          'IUT et filières techniques industrielles',
        ],
        metiers: [
          'Ingénieur énergie / électrique',
          'Ingénieur en énergie solaire',
          "Géologue d'exploration",
          'Ingénieur des mines / forage',
          'Spécialiste HSE (hygiène-sécurité-environnement)',
        ],
        demande: 'porteur',
        commentaire:
          "Fort potentiel hydroélectrique (~12 000 MW) et solaire ; réserves de bauxite, fer, or, pétrole. Profils spécialisés rares.",
      },
    ],
    secteurs_porteurs: [
      {
        secteur: 'Numérique / TIC',
        metiers: [
          'Développeur web/mobile',
          'Administrateur systèmes et réseaux',
          'Spécialiste cybersécurité',
          'Data analyst',
          'Expert fintech / mobile banking',
        ],
      },
      {
        secteur: 'BTP et Infrastructures',
        metiers: [
          'Ingénieur génie civil',
          'Conducteur de travaux',
          'Topographe / géomètre',
          'Ingénieur hydraulique',
          'Dessinateur-projeteur',
        ],
      },
      {
        secteur: 'Agro-industrie / Agribusiness',
        metiers: [
          'Ingénieur agronome',
          'Ingénieur agro-alimentaire',
          'Spécialiste mécanisation agricole',
          'Conseiller agribusiness',
          'Expert transformation des produits',
        ],
      },
      {
        secteur: 'Santé',
        metiers: [
          'Médecin, pharmacien, dentiste',
          'Infirmier, sage-femme',
          'Technicien de laboratoire',
          'Kinésithérapeute',
        ],
      },
      {
        secteur: 'Énergie (dont renouvelable)',
        metiers: [
          'Ingénieur énergie / électrique',
          'Ingénieur en énergie solaire',
          'Technicien maintenance équipements renouvelables',
          "Chargé d'affaires efficacité énergétique",
        ],
      },
      {
        secteur: 'Finance, Banque et Assurance',
        metiers: [
          'Analyste de crédit / risk manager',
          'Conseiller clientèle',
          'Spécialiste conformité (CEMAC)',
          'Actuaire, comptable, auditeur',
        ],
      },
      {
        secteur: 'Logistique et Transport',
        metiers: [
          'Logisticien / responsable supply chain',
          'Agent de transit / déclarant en douane',
          "Gestionnaire d'entrepôt",
          'Responsable transport',
        ],
      },
    ],
    note_insertion:
      "Les taux d'insertion divergent selon la source. Côté formation professionnelle (TVET), l'INS donne 41,7% en 2022 ; côté enseignement supérieur, le MINESUP revendique ~75% global en 2021 (déclaration politique, à nuancer). Le sous-emploi (~61% en 2021) et l'informel (~87% des emplois) restent dominants : valoriser aussi l'entrepreneuriat. (Sources : INS/EESI 3 2021 ; MINESUP 2021.)",
  },

  france: {
    intro:
      "Pour un bachelier camerounais, étudier en France passe par la procédure « Études en France » (Campus France). Université (voie la plus économique), grandes écoles, BUT/IUT, BTS : voici les domaines, métiers porteurs et écoles reconnues.",
    domaines: [
      {
        id: 'sante',
        domaine: 'Santé & soin',
        competences: ['cooperation', 'communication', 'courage'],
        series_origine: ['D', 'C', 'Bac scientifique'],
        metiers: [
          { metier: 'Infirmier(e) (IDE)', pourquoi: "Manque chronique ; ~67% des recrutements difficiles (BMO 2025). En tension." },
          { metier: 'Aide-soignant(e)', pourquoi: "Soin et accompagnement sous tension (liste 2025)." },
          { metier: 'Masseur-kinésithérapeute', pourquoi: "Forte demande (vieillissement) ; numerus clausus qui limite l'offre." },
          { metier: 'Médecin (généraliste/spécialiste)', pourquoi: "Déserts médicaux, besoins élevés à l'horizon 2030 (DARES)." },
          { metier: 'Pharmacien', pourquoi: "~71% des recrutements difficiles (BMO 2025)." },
        ],
        ecoles: [
          { nom: 'Universités (PASS / L.AS — médecine, pharmacie, odontologie)', ville: 'Paris Cité, Lyon 1, Bordeaux, Lille, Montpellier', type: 'Université publique' },
          { nom: 'IFSI (Instituts de Formation en Soins Infirmiers)', ville: 'Toutes régions', type: 'École paramédicale' },
          { nom: 'Instituts de Masso-Kinésithérapie (IFMK)', ville: 'Paris, Lyon, Lille', type: 'École paramédicale' },
          { nom: 'Universités — Licence STAPS / Sciences pour la santé', ville: 'Toutes', type: 'Université publique' },
          { nom: 'Universités — Master Santé publique', ville: 'Rennes (EHESP), Bordeaux', type: 'Université publique' },
        ],
      },
      {
        id: 'numerique',
        domaine: 'Numérique / IT & data',
        competences: ['esprit_critique', 'creativite', 'cooperation'],
        series_origine: ['C', 'D', 'STI2D'],
        metiers: [
          { metier: 'Data engineer', pourquoi: "Profil le plus recherché de la data ; ~85% des recrutements numériques difficiles (France Travail)." },
          { metier: 'Data scientist / ML engineer', pourquoi: "La France est 1re en Europe pour les offres liées à l'IA (>166 000 en 2024)." },
          { metier: 'Développeur (web, logiciel, mobile)', pourquoi: "Près d'une offre numérique sur cinq ; recrutement très tendu." },
          { metier: 'Analyste cybersécurité (SOC, pentester)', pourquoi: "Hausse des cyberattaques → forte tension." },
          { metier: 'Ingénieur cloud / DevOps', pourquoi: "Migration cloud généralisée → demande durable." },
        ],
        ecoles: [
          { nom: 'Universités de technologie (UTC, UTT, UTBM)', ville: 'Compiègne, Troyes, Belfort', type: "École d'ingénieurs publique" },
          { nom: 'Réseau INSA (Lyon, Rennes, Toulouse, Rouen, Strasbourg)', ville: 'Lyon, Toulouse, Rennes', type: "École d'ingénieurs publique" },
          { nom: 'Réseau Polytech (15 écoles)', ville: 'Nice, Lyon, Montpellier, Lille, Paris-Saclay', type: "École d'ingénieurs publique" },
          { nom: 'EPITA / EPITECH', ville: 'Paris + campus régionaux', type: "École d'informatique privée" },
          { nom: 'BUT Informatique / Réseaux / Science des données (IUT)', ville: 'Toutes régions', type: 'IUT public (Bac+3)' },
        ],
      },
      {
        id: 'ingenierie',
        domaine: 'Ingénierie & industrie',
        competences: ['esprit_critique', 'cooperation', 'creativite'],
        series_origine: ['C', 'D', 'STI2D'],
        metiers: [
          { metier: 'Ingénieur (mécanique, électronique, généraliste)', pourquoi: "Parmi les plus forts besoins à l'horizon 2030 (DARES)." },
          { metier: 'Ouvrier qualifié métallurgie / chaudronnier', pourquoi: "Difficultés très élevées (chaudronnerie/usinage ~80%, BMO 2025)." },
          { metier: 'Technicien de maintenance industrielle', pourquoi: "Industrie parmi les trois secteurs les plus en difficulté de recrutement." },
          { metier: 'Mécanicien / carrossier', pourquoi: "~74% (mécaniciens) et ~81% (carrossiers) de recrutements difficiles (BMO 2025)." },
          { metier: 'Ingénieur qualité / production / robotique', pourquoi: "Réindustrialisation et automatisation soutiennent la demande." },
        ],
        ecoles: [
          { nom: 'Arts et Métiers (ENSAM)', ville: 'Paris + 8 campus (Lille, Metz, Cluny, Bordeaux)', type: "Grande école d'ingénieurs publique" },
          { nom: 'Réseau INSA', ville: 'Lyon, Toulouse, Rennes, Strasbourg', type: "École d'ingénieurs publique" },
          { nom: 'Universités de technologie (UTC, UTT, UTBM)', ville: 'Compiègne, Troyes, Belfort', type: 'Université de technologie publique' },
          { nom: 'Centrale (Lyon, Lille, Nantes, Marseille)', ville: 'Lyon, Lille, Nantes, Marseille', type: "Grande école d'ingénieurs publique" },
          { nom: 'BUT GMP / GEII / Génie industriel (IUT)', ville: 'Toutes régions', type: 'IUT public (Bac+3)' },
        ],
      },
      {
        id: 'btp_energie',
        domaine: 'BTP & énergie',
        competences: ['cooperation', 'courage', 'esprit_critique'],
        series_origine: ['C', 'STI2D', 'Bac pro construction'],
        metiers: [
          { metier: 'Conducteur de travaux', pourquoi: "Le BTP manque cruellement de conducteurs de travaux ; records de difficulté de recrutement." },
          { metier: 'Couvreur / charpentier', pourquoi: "Parmi les plus difficiles : couvreurs ~82%, charpentiers ~78% (BMO 2025)." },
          { metier: 'Plombier-chauffagiste (renouvelables)', pourquoi: "La transition écologique (pompes à chaleur, solaire) booste la demande." },
          { metier: 'Ingénieur / technicien énergies renouvelables', pourquoi: "~100 000 emplois en 2023, ~200 000 d'ici 2030 ; jusqu'à 10 offres pour 1 candidat." },
          { metier: 'Électricien du bâtiment', pourquoi: "Métier du BTP en tension (arrêté 2025)." },
        ],
        ecoles: [
          { nom: 'ESTP Paris', ville: 'Cachan / Paris', type: "Grande école d'ingénieurs privée (BTP)" },
          { nom: 'INSA (Génie civil & urbanisme)', ville: 'Lyon, Strasbourg, Rennes', type: "École d'ingénieurs publique" },
          { nom: 'Polytech (Génie civil / Énergétique)', ville: 'Clermont, Marseille, Lille', type: "École d'ingénieurs publique" },
          { nom: "ENTPE (Travaux Publics de l'État)", ville: 'Vaulx-en-Velin (Lyon)', type: "Grande école publique d'ingénieurs" },
          { nom: 'BUT Génie civil / Génie thermique & énergie (IUT)', ville: 'Toutes régions', type: 'IUT public (Bac+3)' },
        ],
      },
      {
        id: 'commerce_gestion',
        domaine: 'Commerce, gestion & finance',
        competences: ['communication', 'cooperation', 'confiance'],
        series_origine: ['A avec maths', 'B/SES', 'STMG'],
        metiers: [
          { metier: 'Comptable / contrôleur de gestion', pourquoi: "Fonctions support recherchées en continu ; régulièrement en tension." },
          { metier: 'Commercial / business developer', pourquoi: "Métiers commerciaux récurrents dans les besoins en main-d'œuvre (BMO)." },
          { metier: 'Analyste financier / data analyst métier', pourquoi: "Croisement finance + data très valorisé." },
          { metier: 'Chef de projet marketing / digital', pourquoi: "Transformation digitale des entreprises soutient la demande." },
          { metier: 'Auditeur / consultant', pourquoi: "Débouché classique des écoles de commerce, marché dynamique." },
        ],
        ecoles: [
          { nom: 'HEC Paris', ville: 'Jouy-en-Josas', type: 'Grande école de commerce' },
          { nom: 'ESSEC Business School', ville: 'Cergy', type: 'Grande école de commerce' },
          { nom: 'ESCP Business School', ville: 'Paris (+ Londres, Berlin, Madrid, Turin)', type: 'Grande école de commerce' },
          { nom: 'EDHEC Business School', ville: 'Lille / Nice', type: 'Grande école de commerce' },
          { nom: 'BUT GEA / Techniques de commercialisation + IAE (universités)', ville: 'Toutes régions', type: 'IUT / Université publique' },
        ],
      },
      {
        id: 'droit',
        domaine: 'Droit & sciences po',
        competences: ['esprit_critique', 'communication', 'courage'],
        series_origine: ['A', 'Bac général (HGGSP, SES)'],
        metiers: [
          { metier: "Juriste d'entreprise", pourquoi: "Débouché solide, accessible aux diplômés étrangers (pas de condition de nationalité)." },
          { metier: 'Avocat', pourquoi: "Profession ouverte aux diplômés étrangers via le CAPA ; droit des affaires dynamique." },
          { metier: 'Spécialiste conformité / RGPD', pourquoi: "Réglementation croissante (données, ESG) → demande forte." },
          { metier: 'Chargé affaires publiques / relations internationales', pourquoi: "Débouché des IEP/Sciences Po, profils bilingues recherchés." },
        ],
        ecoles: [
          { nom: 'Universités — Faculté de droit (Licence puis Master)', ville: 'Paris 1, Assas, Lyon 3, Bordeaux', type: 'Université publique' },
          { nom: "Sciences Po Paris (IEP) — dont École de droit", ville: 'Paris + campus (Reims, Dijon, Le Havre, Menton)', type: 'Grand établissement (IEP)' },
          { nom: 'Réseau des IEP de région (concours commun)', ville: 'Aix, Lille, Lyon, Rennes, Strasbourg, Toulouse', type: "Institut d'études politiques public" },
          { nom: 'Universités — doubles licences Droit-Langues / Droit-Science po', ville: 'Assas, Sorbonne', type: 'Université publique' },
        ],
      },
      {
        id: 'sciences_fond',
        domaine: 'Sciences fondamentales',
        competences: ['esprit_critique', 'creativite', 'courage'],
        series_origine: ['C', 'D', 'Bac scientifique'],
        metiers: [
          { metier: 'Ingénieur de recherche / chercheur', pourquoi: "Besoins en R&D et lien fort avec l'industrie et la data." },
          { metier: 'Data scientist / statisticien', pourquoi: "Débouché majeur des profils maths/physique, secteur très en tension." },
          { metier: 'Ingénieur biotech / chimie', pourquoi: "Industrie pharmaceutique et chimie verte en développement." },
          { metier: 'Enseignant-chercheur / professeur de sciences', pourquoi: "L'enseignement parmi les métiers qui recruteront le plus d'ici 2030 (DARES)." },
          { metier: 'Actuaire / quant (finance quantitative)', pourquoi: "Forte valorisation des profils maths de haut niveau." },
        ],
        ecoles: [
          { nom: 'Universités — Licences Maths / Physique / Chimie / Sciences de la vie', ville: 'Sorbonne, Paris-Saclay, Grenoble Alpes', type: 'Université publique' },
          { nom: 'Écoles Normales Supérieures (Paris-PSL, Lyon, Paris-Saclay)', ville: 'Paris, Lyon, Saclay', type: 'Grand établissement (recherche)' },
          { nom: "École Polytechnique (l'X)", ville: 'Palaiseau', type: "Grande école d'ingénieurs publique" },
          { nom: 'Chimie ParisTech / ESPCI Paris-PSL', ville: 'Paris', type: "Grande école d'ingénieurs publique" },
        ],
      },
      {
        id: 'lettres_shs',
        domaine: 'Lettres, SHS & langues',
        competences: ['communication', 'creativite', 'esprit_critique'],
        series_origine: ['A', 'Bac général (humanités, langues, SES)'],
        metiers: [
          { metier: 'Enseignant (écoles, secondaire)', pourquoi: "L'enseignement parmi les métiers qui recruteront le plus d'ici 2030 (DARES)." },
          { metier: 'Traducteur / interprète', pourquoi: "Profils bilingues/multilingues recherchés (institutions, entreprises)." },
          { metier: 'Chargé de communication / rédacteur', pourquoi: "Débouché récurrent des SHS, soutenu par le digital." },
          { metier: 'Chargé de projet culturel / médiation', pourquoi: "Secteur culturel et associatif demandeur." },
          { metier: "Documentaliste / métiers de l'information", pourquoi: "Gestion de l'information et patrimoine numérique." },
        ],
        ecoles: [
          { nom: 'Universités — Licences Lettres / Langues (LLCER, LEA) / Histoire / Socio', ville: 'Sorbonne, Lyon 2, Bordeaux Montaigne', type: 'Université publique' },
          { nom: 'INALCO (langues et civilisations orientales)', ville: 'Paris', type: 'Grand établissement public' },
          { nom: 'ESIT / ISIT (traduction-interprétation)', ville: 'Paris', type: 'École spécialisée' },
          { nom: 'CELSA (Sorbonne) / École du Louvre', ville: 'Paris', type: 'Établissement public spécialisé' },
        ],
      },
      {
        id: 'arts_design',
        domaine: 'Arts, design & communication',
        competences: ['creativite', 'communication', 'confiance'],
        series_origine: ['Bac général (arts)', 'STD2A', 'A option arts'],
        metiers: [
          { metier: 'UX / UI designer', pourquoi: "Demande forte liée à la transformation digitale (ENSAD, Gobelins)." },
          { metier: 'Motion / game designer, animateur 2D/3D', pourquoi: "Industrie française de l'animation et du jeu vidéo reconnue mondialement." },
          { metier: 'Directeur artistique / graphiste', pourquoi: "Débouché classique du design graphique, soutenu par le numérique." },
          { metier: 'Community manager / chargé de communication', pourquoi: "Métiers de la communication digitale en croissance continue." },
          { metier: 'Designer produit / packaging', pourquoi: "Industrie et innovation soutiennent la demande de designers." },
        ],
        ecoles: [
          { nom: 'ENSAD (Arts Décoratifs - Paris)', ville: 'Paris', type: "Grande école d'art publique" },
          { nom: "Gobelins, l'école de l'image", ville: 'Paris', type: 'École spécialisée (animation)' },
          { nom: 'École Boulle / Estienne / Duperré / ENSAAMA', ville: 'Paris', type: "Écoles supérieures d'arts appliqués publiques" },
          { nom: 'ENSCI-Les Ateliers', ville: 'Paris', type: 'École de création industrielle publique' },
          { nom: "Beaux-Arts (réseau ÉSAD) / écoles privées (LISAA, Strate)", ville: 'Lyon, Nancy, Marseille, Paris', type: "Écoles d'art publiques / privées" },
        ],
      },
      {
        id: 'agro_env',
        domaine: 'Agro & environnement',
        competences: ['esprit_critique', 'cooperation', 'creativite'],
        series_origine: ['D', 'C', 'STAV'],
        metiers: [
          { metier: 'Ingénieur agronome / agroalimentaire', pourquoi: "Besoins soutenus par les pouvoirs publics (France 2030) à l'horizon 2030." },
          { metier: "Ingénieur environnement, eau, climat", pourquoi: "Transition écologique → forte demande de compétences environnementales." },
          { metier: 'Agriculteur / technicien agricole', pourquoi: "Parmi les plus recherchés en volume (~93 000 projets, BMO 2025)." },
          { metier: 'Chargé biodiversité / économie circulaire', pourquoi: "Réglementation environnementale et RSE créent des postes durables." },
          { metier: 'Ingénieur QSE agroalimentaire', pourquoi: "Agroalimentaire (1er secteur industriel français) demandeur." },
        ],
        ecoles: [
          { nom: 'AgroParisTech', ville: 'Paris-Saclay (+ Nancy, Montpellier, Clermont)', type: "Grande école d'ingénieurs publique" },
          { nom: 'Institut Agro (Rennes-Angers, Montpellier, Dijon)', ville: 'Rennes, Angers, Montpellier, Dijon', type: "Grande école d'ingénieurs publique" },
          { nom: 'Bordeaux Sciences Agro / VetAgro Sup / ONIRIS / UniLaSalle', ville: 'Bordeaux, Lyon, Nantes, Beauvais', type: "Écoles d'ingénieurs agro" },
          { nom: 'Universités — Licences/Masters Sciences de la vie, Environnement', ville: 'Toutes', type: 'Université publique' },
          { nom: 'BUT Génie biologique / HSE (IUT)', ville: 'Toutes régions', type: 'IUT public (Bac+3)' },
        ],
      },
      {
        id: 'hotellerie_tourisme',
        domaine: 'Hôtellerie & tourisme',
        competences: ['communication', 'cooperation', 'confiance'],
        series_origine: ['Bac général', 'STHR', 'A avec langues'],
        metiers: [
          { metier: 'Cuisinier / chef de cuisine', pourquoi: "Parmi les métiers les plus recherchés (BMO 2025) ; restauration en record de difficulté." },
          { metier: 'Serveur / personnel de salle', pourquoi: "En tête des professions les plus recherchées (BMO 2025) ; métier en tension." },
          { metier: "Manager / directeur d'hôtel ou de restaurant", pourquoi: "Hôtellerie-restauration = 1er employeur de France ; insertion rapide." },
          { metier: 'Réceptionniste / responsable hébergement', pourquoi: "Tourisme international soutient la demande, profils multilingues valorisés." },
          { metier: 'Chef de projet événementiel / tourisme', pourquoi: "Relance du tourisme et de l'événementiel." },
        ],
        ecoles: [
          { nom: 'Institut Lyfe (ex-Paul Bocuse)', ville: 'Écully (Lyon)', type: 'École hôtelière privée de référence' },
          { nom: 'FERRANDI Paris', ville: 'Paris (+ Bordeaux)', type: 'École de gastronomie et management (CCI)' },
          { nom: 'Groupe Vatel', ville: 'Paris, Lyon, Bordeaux, Nîmes', type: 'École de management hôtelier privée' },
          { nom: 'ESTHUA - Université d\'Angers / Excelia', ville: 'Angers / La Rochelle', type: 'Université publique / École privée' },
          { nom: 'BTS Management hôtellerie-restauration / Tourisme', ville: 'Toutes régions', type: 'BTS lycée (Bac+2)' },
        ],
      },
      {
        id: 'education',
        domaine: 'Éducation',
        competences: ['communication', 'cooperation', 'confiance'],
        series_origine: ['A', 'C/D pour les sciences', 'Bac général'],
        metiers: [
          { metier: 'Professeur des écoles', pourquoi: "L'enseignement parmi les métiers qui recruteront le plus d'ici 2030 (DARES)." },
          { metier: 'Professeur du secondaire', pourquoi: "Tensions sur plusieurs disciplines (maths, lettres, langues, sciences)." },
          { metier: 'Formateur / ingénieur pédagogique (e-learning)', pourquoi: "Essor de la formation continue et du numérique éducatif." },
          { metier: "Conseiller principal d'éducation (CPE)", pourquoi: "Besoins d'encadrement éducatif ; AESH/AES en tension (liste 2025)." },
          { metier: 'Éducateur spécialisé', pourquoi: "Secteur médico-social structurellement sous tension." },
        ],
        ecoles: [
          { nom: 'INSPÉ (Professorat et Éducation)', ville: 'Toutes académies', type: 'Composante universitaire' },
          { nom: 'Universités — Licences disciplinaires (lettres, sciences, langues)', ville: 'Toutes', type: 'Université publique' },
          { nom: "Universités — Licence Sciences de l'éducation", ville: 'Toutes', type: 'Université publique' },
          { nom: 'Instituts de formation en travail social', ville: 'Toutes régions', type: 'École du travail social' },
          { nom: "CNAM / écoles d'ingénierie pédagogique et e-learning", ville: 'Paris et régions', type: 'Établissement public / écoles spécialisées' },
        ],
      },
    ],
    metiers_tension: [
      'Couvreurs (~82%)',
      'Charpentiers (~78%)',
      'Carrossiers (~81%)',
      'Chaudronniers / usineurs (~80%)',
      'Pharmaciens (~71%)',
      'Infirmiers, sages-femmes (~67%)',
      'Médecins',
      'Ingénieurs informatiques / experts data & cybersécurité (~85%)',
      'Conducteurs de travaux et métiers du BTP',
      'Métiers de la restauration (serveurs, cuisiniers)',
      'Techniciens / ingénieurs énergies renouvelables',
      'Enseignants (écoles et secondaire)',
    ],
    acces_international: {
      etapes: [
        "Créer son dossier sur « Études en France » (Campus France Cameroun) — obligatoire pour les Camerounais. Commencer en octobre-novembre.",
        "Choisir la voie d'admission : Parcoursup (BTS, BUT, CPGE), DAP « dossier blanc » pour entrer en L1 d'université (avant ~le 15 décembre), ou admission internationale propre aux écoles (master, ingénieurs, commerce, Sciences Po).",
        "Passer une certification de français (TCF DAP, DELF/DALF) — exigée pour la DAP et la plupart des cursus en français.",
        "Constituer le dossier, candidater via Études en France, puis passer l'entretien Campus France.",
        "Demander un visa long séjour étudiant (VLS-TS) après acceptation, en justifiant ressources et assurance.",
        "À l'arrivée : validation du VLS-TS, inscription, paiement de la CVEC (~105 €/an) et des frais.",
      ],
      langue:
        "Formations en français : niveau B2 généralement attendu (TCF DAP, DELF B2 ou DALF C1). Programmes en anglais (écoles de commerce/ingénieurs, masters) : preuve d'anglais (TOEFL/IELTS) souvent requise.",
      couts:
        "Université publique : frais différenciés de 2 770 €/an en licence et 3 770 €/an en master à partir de la rentrée 2026-2027 (170-243 € pour les étudiants UE), mais chaque université peut exonérer jusqu'à 30% de ses étudiants internationaux. + CVEC ~105 €/an. Écoles privées : plusieurs milliers à >15 000 €/an. Vie : logement ~400 à 900 €/mois selon la ville.",
      note:
        "Bourses : « France Excellence Eiffel » (~1 200 €/mois en master, ~2 100 €/mois en doctorat ; ne couvre PAS les frais de scolarité ; candidature déposée par l'établissement). Autres : AUF, bourses du gouvernement français (BGF) via l'ambassade, bourses des établissements et régions. Montants à vérifier chaque année.",
    },
  },
}

export const ORIENTATION_SOURCES = {
  cameroun: [
    'https://officedubac.cm/nomenclature-des-examens/',
    'https://polytechnique.cm/',
    'https://infospratiques.cm/concours-fmsb-cameroun/',
    'https://www.univ-dschang.org/fasa/',
    'https://concours-scolaire.com/enseignement-superieur-cameroun-filieres-debouches/',
    'https://www.lebledparle.com/cameroun-jacques-fame-ndongo-revele-le-taux-global-d-insertion-des-jeunes-diplomes/',
    'https://www.investiraucameroun.com/gestion-publique/1212-20093-formation-professionnelle-le-taux-d-insertion-dans-le-monde-du-travail-au-cameroun-chiffre-a-41-7-en-2022-ins',
    'https://africarrieres.com/cameroun/fr/guide/marche-emploi/secteurs-porteurs',
    'https://ins-cameroun.cm/en/statistique/eesi3-phase-1-enquete-sur-lemploi-rapport-principal/',
  ],
  france: [
    'https://www.cameroun.campusfrance.org/fr/la-nouvelle-procedure-etudes-en-france',
    'https://statistiques.francetravail.org/bmo',
    'https://dares.travail-emploi.gouv.fr/dossier/les-metiers-en-2030',
    'https://www.immigration.interieur.gouv.fr/limmigration-en-france/sejour-des-etrangers/liste-des-metiers-en-tension-pour-travailleurs-etrangers',
    'https://www.letudiant.fr/classements/classement-des-ecoles-d-ingenieurs.html',
    'https://www.letudiant.fr/classements/classement-des-grandes-ecoles-de-commerce.html',
    'https://www.sciencespo.fr/admissions/fr/master/procedure-internationale/',
    'https://www.campusfrance.org/en/the-france-excellence-eiffel-scholarship-program',
    'https://www.onisep.fr',
  ],
}
