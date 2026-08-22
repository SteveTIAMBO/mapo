/**
 * Jeux de démonstration PAR PAYS.
 *
 * Objectif : en rendez-vous, choisir un pays sur l'écran de connexion et voir
 * TOUTE la démonstration basculer — identité de l'école, ville, devise, classes,
 * noms des personnes, examens nationaux, barème de paie.
 *
 * Deux principes portent ce fichier :
 *
 * 1. **Le Cameroun reste la référence, à l'octet près.** Son pack ne renomme
 *    rien : la démo camerounaise validée depuis des mois doit être strictement
 *    identique à ce qu'elle était. Un pack pays ne doit pas être l'occasion de
 *    « rafraîchir » au passage la démo qui sert déjà.
 *
 * 2. **On ne renomme que ce qui est réellement propre au pays.** La structure du
 *    secondaire congolais (6e → Tle, séries A, C, D en enseignement général) est
 *    identique à la camerounaise : la recopier avec d'autres identifiants
 *    n'apporterait rien et casserait tous les liens de la démo (emplois du temps,
 *    notes, affectations). Ce sont les NOMS DE FAMILLE, la ville, la devise,
 *    l'indicatif et les classes du primaire qui changent.
 *
 * Séries du secondaire général congolais (A Lettres-Philosophie, C Maths-Sciences
 * physiques, D Maths-SVT) : ecolesaucongo.com/series.html. Les séries E et F1 à
 * F6 relèvent de l'enseignement technique, hors de cette démo.
 *
 * ⚠️ Les noms de personnes sont des noms PLAUSIBLES pour une démonstration. Ils
 * ne désignent personne et ne prétendent à aucune représentativité statistique.
 */

/** Pays proposés dans le sélecteur de démonstration. */
export const PAYS_DEMO = {
  CM: {
    code: 'CM',
    nom: 'Cameroun',
    // Suffixe de stockage VIDE : la démo camerounaise garde ses clés
    // historiques, donc son contenu, ses réglages et ses saisies.
    suffixe: '',
    ecole: {
      schoolName: 'Collège Privé EDUFREM',
      acronym: 'EDUFREM',
      city: 'Yaoundé',
      address: 'Quartier Santa Barbara',
      phone: '+237 699 000 000',
      phoneFormat: '+237 6XX XXX XXX',
      currency: 'XAF',
      country: 'CM',
      email: 'contact@edufrem.com',
    },
    // Identité : aucun renommage. Voir le principe 1.
    nomsFamille: null,
    ecolePrimaire: null,
    // Le primaire camerounais démarre à la SIL.
    classesPrimaire: null,
    // Séries du second cycle. `null` signifie « aucune série », pas « celles du
    // Cameroun » : la France n'en a plus depuis la réforme du lycée.
    seriesLycee: ['A', 'C', 'D'],
    // Échelle des montants de démonstration. Voir `montantDemo`.
    facteurMontant: 1,
  },

  CG: {
    code: 'CG',
    nom: 'Congo-Brazzaville',
    suffixe: '_cg',
    ecole: {
      schoolName: 'Collège EDUFREM Pointe-Noire',
      acronym: 'EDUFREM',
      city: 'Pointe-Noire',
      address: 'Avenue Charles de Gaulle',
      phone: '+242 06 000 00 00',
      phoneFormat: '+242 0X XXX XX XX',
      currency: 'XAF',
      country: 'CG',
      email: 'contact@edufrem.com',
    },
    /**
     * Noms de famille congolais, substitués POSITION PAR POSITION à la liste
     * camerounaise. Substitution déterministe : la même démo donne toujours les
     * mêmes personnes, et les identifiants (p-001, c-6a…) ne bougent pas — donc
     * les emplois du temps, les notes et les affectations restent cohérents.
     */
    nomsFamille: [
      // ── En regard des 35 noms d'élèves de la liste de référence ──
      'Makosso', 'Mavoungou', 'Tchicaya', 'Loubaki', 'Nkounkou', 'Malonga',
      'Massamba', 'Bikindou', 'Ondongo', 'Moukala', 'Samba', 'Poaty',
      'Mabiala', 'Milandou', 'Ibara', 'Ngatsé', 'Elenga', 'Okemba',
      'Nsondé', 'Loemba', 'Bouanga', 'Kimbembé', 'Gambou', 'Nianga',
      'Tati', 'Yoka', 'Mouko', 'Bidounga', 'Nkodia', 'Dzon',
      'Ebata', 'Moukoko', 'Bouity', 'Ganga', 'Mouyabi',
      // ── En regard des 19 noms réservés au personnel ──
      'Bakala', 'Bantsimba', 'Diakabana', 'Ekamba', 'Goma', 'Itoua',
      'Kaya', 'Kouka', 'Lékana', 'Mampouya', 'Matondo', 'Mizélé',
      'Ngoma', 'Nzaba', 'Obami', 'Okouya', 'Pandzou', 'Sitou', 'Tsiba',
    ],
    /**
     * ⚠️ Le primaire congolais n'est PAS mis en mode APC.
     *
     * L'APC (A / ECA / NA) est le bulletin distinctif du primaire camerounais.
     * Rien ne dit que le Congo l'applique, et son barème du primaire est
     * introuvable (le décret n° 96-174 n'est pas publié). On reste donc sur des
     * notes chiffrées, qui n'affirment rien de faux.
     */
    ecolePrimaire: { gradingMode: 'notes' },

    /**
     * Primaire congolais : CP1 → CM2, six ans, pas de SIL.
     * Structure sourcée dans `stores/classes.js` (LEVELS_PRIMAIRE_CG).
     */
    classesPrimaire: [
      { id: 'cp-cp1', name: 'CP1', level: 'CP1', section: '', capacity: 45, enrolled: 41, homeroomTeacher: 'Bernadette Makosso', homeroomTeacherId: null },
      { id: 'cp-cp2', name: 'CP2', level: 'CP2', section: '', capacity: 45, enrolled: 39, homeroomTeacher: 'Pierre Mavoungou', homeroomTeacherId: null },
      { id: 'cp-ce1', name: 'CE1', level: 'CE1', section: '', capacity: 45, enrolled: 40, homeroomTeacher: 'Estelle Tchicaya', homeroomTeacherId: null },
      { id: 'cp-ce2', name: 'CE2', level: 'CE2', section: '', capacity: 45, enrolled: 36, homeroomTeacher: 'Joseph Loubaki', homeroomTeacherId: null },
      { id: 'cp-cm1', name: 'CM1', level: 'CM1', section: '', capacity: 40, enrolled: 34, homeroomTeacher: 'Brigitte Nkounkou', homeroomTeacherId: null },
      { id: 'cp-cm2a', name: 'CM2 A', level: 'CM2', section: 'A', capacity: 40, enrolled: 33, homeroomTeacher: 'Sylvie Malonga', homeroomTeacherId: null },
      { id: 'cp-cm2b', name: 'CM2 B', level: 'CM2', section: 'B', capacity: 38, enrolled: 31, homeroomTeacher: 'André Massamba', homeroomTeacherId: null },
    ],
    // Enseignement général congolais : A (Lettres-Philosophie), C
    // (Maths-Sciences physiques), D (Maths-SVT). Les séries E et F1 à F6
    // relèvent du technique et n'ont rien à faire dans une démo d'enseignement
    // général. Source : ecolesaucongo.com/series.html.
    seriesLycee: ['A', 'C', 'D'],
    // Franc CFA comme le Cameroun : les ordres de grandeur sont les mêmes.
    facteurMontant: 1,
  },

  // ── Sénégal ──
  SN: {
    code: 'SN',
    nom: 'Sénégal',
    suffixe: '_sn',
    ecole: {
      schoolName: 'Collège EDUFREM Dakar',
      acronym: 'EDUFREM',
      city: 'Dakar',
      address: 'Sicap Liberté 6',
      phone: '+221 77 000 00 00',
      phoneFormat: '+221 7X XXX XX XX',
      // Le Sénégal est en zone UEMOA : franc CFA d'Afrique de l'OUEST (XOF),
      // à ne pas confondre avec le XAF d'Afrique centrale. Même valeur face à
      // l'euro, deux monnaies distinctes.
      currency: 'XOF',
      country: 'SN',
      email: 'contact@edufrem.com',
    },
    nomsFamille: [
      // ── En regard des 35 noms d'élèves de la liste de référence ──
      'Diop', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Diallo',
      'Gueye', 'Sarr', 'Faye', 'Mbaye', 'Sy', 'Cissé',
      'Diouf', 'Seck', 'Thiam', 'Kane', 'Camara', 'Niang',
      'Wade', 'Sène', 'Bâ', 'Dieng', 'Samb', 'Toure',
      'Gaye', 'Sagna', 'Badji', 'Coly', 'Mendy', 'Diatta',
      'Tine', 'Diagne', 'Lo', 'Ndour', 'Barry',
      // ── En regard des 19 noms réservés au personnel ──
      'Aidara', 'Bousso', 'Dabo', 'Diaw', 'Fofana', 'Guèye',
      'Hanne', 'Kâ', 'Loum', 'Mbengue', 'Ndao', 'Ndoye',
      'Sakho', 'Sall', 'Sidibé', 'Sonko', 'Tall', 'Traoré', 'Wane',
    ],
    ecolePrimaire: { gradingMode: 'notes' },
    /**
     * Élémentaire sénégalais : CI → CM2, six ans. Le cours d'initiation (CI)
     * remplace la SIL camerounaise. Structure sourcée dans `stores/classes.js`
     * (LEVELS_PRIMAIRE_SN).
     */
    classesPrimaire: [
      { id: 'cp-ci', name: 'CI', level: 'CI', section: '', capacity: 45, enrolled: 42, homeroomTeacher: 'Bernadette Diop', homeroomTeacherId: null },
      { id: 'cp-cp', name: 'CP', level: 'CP', section: '', capacity: 45, enrolled: 40, homeroomTeacher: 'Pierre Ndiaye', homeroomTeacherId: null },
      { id: 'cp-ce1', name: 'CE1', level: 'CE1', section: '', capacity: 45, enrolled: 41, homeroomTeacher: 'Estelle Fall', homeroomTeacherId: null },
      { id: 'cp-ce2', name: 'CE2', level: 'CE2', section: '', capacity: 45, enrolled: 37, homeroomTeacher: 'Joseph Sow', homeroomTeacherId: null },
      { id: 'cp-cm1', name: 'CM1', level: 'CM1', section: '', capacity: 40, enrolled: 35, homeroomTeacher: 'Brigitte Ba', homeroomTeacherId: null },
      { id: 'cp-cm2a', name: 'CM2 A', level: 'CM2', section: 'A', capacity: 40, enrolled: 34, homeroomTeacher: 'Sylvie Diallo', homeroomTeacherId: null },
      { id: 'cp-cm2b', name: 'CM2 B', level: 'CM2', section: 'B', capacity: 38, enrolled: 30, homeroomTeacher: 'André Gueye', homeroomTeacherId: null },
    ],
    /**
     * Séries du secondaire général sénégalais retenues pour la démo : L2
     * (sciences sociales et humaines), S1 (sciences exactes), S2 (sciences
     * expérimentales). Il en existe d'autres — L'1, L1, L1a, L1b, S4-S5 — mais
     * trois séries suffisent à montrer le fonctionnement, et ce sont les plus
     * répandues. Source : senegalecoles.com/series-1-series-secondaire-general.html
     */
    seriesLycee: ['L2', 'S1', 'S2'],
    // Le XOF et le XAF ont la même valeur face à l'euro : mêmes ordres de
    // grandeur pour les salaires comme pour les frais de scolarité.
    facteurMontant: 1,
  },

  // ── France ──
  FR: {
    code: 'FR',
    nom: 'France',
    suffixe: '_fr',
    ecole: {
      schoolName: 'Collège EDUFREM Lyon',
      acronym: 'EDUFREM',
      city: 'Lyon',
      address: '12 rue de la République',
      phone: '+33 4 00 00 00 00',
      phoneFormat: '+33 X XX XX XX XX',
      currency: 'EUR',
      country: 'FR',
      email: 'contact@edufrem.com',
    },
    nomsFamille: [
      // ── En regard des 35 noms d'élèves de la liste de référence ──
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard',
      'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent',
      'Lefèvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux',
      'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier',
      'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand',
      'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin',
      // ── En regard des 19 noms réservés au personnel ──
      'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin',
      'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine',
      'Chevalier', 'Robin', 'Masson', 'Sanchez', 'Gerard', 'Nguyen', 'Boyer',
    ],
    ecolePrimaire: { gradingMode: 'notes' },
    /**
     * Élémentaire français : CP → CM2, CINQ ans — une année de moins que dans
     * les trois autres pays. Structure sourcée dans `stores/classes.js`
     * (LEVELS_PRIMAIRE_FR).
     */
    classesPrimaire: [
      { id: 'cp-cp', name: 'CP', level: 'CP', section: '', capacity: 28, enrolled: 26, homeroomTeacher: 'Bernadette Martin', homeroomTeacherId: null },
      { id: 'cp-ce1', name: 'CE1', level: 'CE1', section: '', capacity: 28, enrolled: 25, homeroomTeacher: 'Pierre Bernard', homeroomTeacherId: null },
      { id: 'cp-ce2', name: 'CE2', level: 'CE2', section: '', capacity: 28, enrolled: 27, homeroomTeacher: 'Estelle Dubois', homeroomTeacherId: null },
      { id: 'cp-cm1', name: 'CM1', level: 'CM1', section: '', capacity: 28, enrolled: 24, homeroomTeacher: 'Joseph Thomas', homeroomTeacherId: null },
      { id: 'cp-cm2a', name: 'CM2 A', level: 'CM2', section: 'A', capacity: 28, enrolled: 26, homeroomTeacher: 'Brigitte Robert', homeroomTeacherId: null },
      { id: 'cp-cm2b', name: 'CM2 B', level: 'CM2', section: 'B', capacity: 28, enrolled: 23, homeroomTeacher: 'Sylvie Richard', homeroomTeacherId: null },
    ],
    /**
     * ⚠️ La France n'a PLUS de séries au lycée : la réforme entrée en vigueur
     * pour le baccalauréat 2021 a remplacé L, ES et S par des enseignements de
     * spécialité choisis individuellement. Afficher « 1ère A » à un lycée
     * français serait daté de trente ans. `null` veut dire « aucune série »,
     * pas « celles du voisin » : les classes deviennent 1ère 1, 1ère 2, 1ère 3.
     */
    seriesLycee: null,
    /**
     * ⚠️ Échelle des montants — ce n'est PAS un taux de change.
     *
     * Les montants de démonstration sont calibrés en francs CFA. Affichés tels
     * quels avec le symbole euro, ils donnaient « 220 000 € par mois » sur la
     * fiche de paie d'un enseignant : un chiffre qu'aucun prospect français ne
     * peut prendre au sérieux. Une conversion au cours officiel (655,957) ne
     * corrigerait rien non plus — elle donnerait 335 €, tout aussi faux.
     *
     * Ce facteur cherche la PLAUSIBILITÉ, pas l'équivalence monétaire : un
     * professeur autour de 2 400 €, un directeur autour de 4 700 €, une
     * scolarité de collège privé autour de 2 000 € l'an.
     */
    facteurMontant: 1 / 75,
    /**
     * Aucun bulletin français ne peut afficher moins que le SMIC. Sans ce
     * plancher, l'agent d'entretien de la démo serait payé 1 000 € brut —
     * illégal, et visible par n'importe quel visiteur français.
     * SMIC mensuel brut 2026 : environ 1 800 €.
     */
    salaireMin: 1800,
  },
}

/**
 * Identité du directeur, DÉDUITE du compte de démonstration.
 *
 * ⚠️ Défaut vu à l'écran le 22/08 : chaque pack déclarait son propre directeur
 * (« Diop Abdoulaye » au Sénégal) alors que le compte connecté, lui, était
 * « Michel Diouf » — le prénom du compte de démo avec le nom localisé. Deux
 * identités pour la même personne : la barre latérale affichait l'une, et les
 * BULLETINS étaient signés de l'autre. Un directeur qui signe sous un nom qui
 * n'est pas le sien est un faux document, pas un détail cosmétique.
 *
 * On calcule donc l'identité à partir du compte, pour qu'elles coïncident par
 * construction et non par recopie.
 */
export function directeurDuPays(reference, pack, compte = { firstName: 'Michel', lastName: 'Teussop' }) {
  const lastName = localiserNom(compte.lastName, reference, pack)
  return {
    directorFirstName: compte.firstName,
    directorLastName: lastName,
    directorName: `${lastName} ${compte.firstName}`,
  }
}

/** Codes des pays disponibles, dans l'ordre d'affichage. */
export const CODES_PAYS_DEMO = Object.keys(PAYS_DEMO)

/** Pack d'un pays. Repli sur le Cameroun : la démo doit toujours s'ouvrir. */
export function packPays(code) {
  return PAYS_DEMO[String(code || '').toUpperCase()] || PAYS_DEMO.CM
}

/**
 * Remplace un nom de famille par son équivalent dans le pays choisi.
 *
 * La correspondance se fait par POSITION dans la liste camerounaise de
 * référence : « Kamga » donne toujours le même nom congolais, dans toutes les
 * vues. Sans cette stabilité, le professeur principal d'une classe et le même
 * professeur dans l'emploi du temps porteraient deux noms différents.
 *
 * Un nom absent de la liste de référence est laissé tel quel, plutôt que
 * remplacé au hasard : mieux vaut un nom non localisé qu'un nom qui change à
 * chaque affichage.
 */
export function localiserNom(nomFamille, reference, pack) {
  if (!pack?.nomsFamille?.length || !nomFamille) return nomFamille
  const i = reference.indexOf(nomFamille)
  if (i < 0) return nomFamille
  return pack.nomsFamille[i % pack.nomsFamille.length]
}

/** Localise un « Prénom Nom » complet, en ne touchant qu'au nom de famille. */
export function localiserNomComplet(complet, reference, pack) {
  if (!pack?.nomsFamille?.length || !complet) return complet
  const bouts = String(complet).trim().split(/\s+/)
  if (bouts.length < 2) return complet
  const nom = bouts[bouts.length - 1]
  const remplace = localiserNom(nom, reference, pack)
  return [...bouts.slice(0, -1), remplace].join(' ')
}

/**
 * Localise TOUTES les chaînes d'une structure de données de démonstration.
 *
 * Pourquoi une passe générique plutôt qu'un champ à la fois : les noms
 * camerounais apparaissent dans 285 endroits répartis sur 32 fichiers de seed —
 * élèves fixes, incidents de discipline, messages, inscriptions, devoirs. Les
 * traiter champ par champ garantissait d'en oublier, et surtout d'en oublier en
 * SILENCE : un écran resté camerounais au milieu d'une démo congolaise ne
 * produit aucune erreur, il produit juste une mauvaise impression en rendez-vous.
 *
 * Le remplacement se fait sur des MOTS ENTIERS et respecte la casse, donc
 * « Abega Cédric » devient « Ganga Cédric » mais l'adresse `a.abega@…` reste
 * intacte, et aucun mot ordinaire n'est touché.
 */
let _regexCache = null
let _regexPack = null

function regexNoms(reference) {
  if (_regexCache && _regexPack === reference) return _regexCache
  _regexPack = reference
  _regexCache = new RegExp('\\b(' + reference.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g')
  return _regexCache
}

export function localiserTexte(texte, reference, pack) {
  if (!pack?.nomsFamille?.length || typeof texte !== 'string' || !texte) return texte
  return texte.replace(regexNoms(reference), (m) => localiserNom(m, reference, pack))
}

/** Applique `localiserTexte` en profondeur : tableaux, objets, chaînes. */
export function localiserDonnees(valeur, reference, pack) {
  if (!pack?.nomsFamille?.length) return valeur
  if (typeof valeur === 'string') return localiserTexte(valeur, reference, pack)
  if (Array.isArray(valeur)) return valeur.map((v) => localiserDonnees(v, reference, pack))
  if (valeur && typeof valeur === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(valeur)) out[k] = localiserDonnees(v, reference, pack)
    return out
  }
  return valeur
}

/**
 * Applique les séries du lycée du pays aux classes de démonstration.
 *
 * Les classes du second cycle sont nommées d'après leur série : « 1ère A » au
 * Cameroun, « 1ère S1 » au Sénégal. En France il n'y a PLUS de série depuis la
 * réforme du baccalauréat 2021 — les classes deviennent « 1ère 1 », « 1ère 2 ».
 *
 * ⚠️ Les IDENTIFIANTS ne bougent pas (`c-1a` reste `c-1a`). Les emplois du
 * temps, les notes, les affectations de professeurs et les bulletins référencent
 * ces identifiants : les renommer viderait la démo de toutes ses données, sans
 * la moindre erreur à l'écran.
 */
export function appliquerSeries(classes, packSource, pack) {
  const source = packSource?.seriesLycee || null
  const cible = pack?.seriesLycee ?? null
  if (!source || JSON.stringify(source) === JSON.stringify(cible)) return classes

  return classes.map((c) => {
    if (!c.serie) return c
    const i = source.indexOf(c.serie)
    if (i < 0) return c
    // Pays sans séries : on numérote, ce qui est la convention française.
    const nouvelle = cible ? (cible[i] ?? c.serie) : String(i + 1)
    const prefixe = c.name.replace(new RegExp('\\s*' + c.serie + '$'), '')
    return { ...c, serie: cible ? nouvelle : '', section: nouvelle, name: `${prefixe} ${nouvelle}` }
  })
}

/**
 * Montant de démonstration à l'échelle du pays.
 *
 * `min` sert aux salaires : un plancher légal (le SMIC en France) que le simple
 * produit ne respecterait pas. Arrondi à la dizaine pour rester lisible.
 */
export function montantDemo(montant, pack, { min = 0 } = {}) {
  const f = pack?.facteurMontant ?? 1
  if (f === 1) return montant
  const brut = Number(montant) * f
  const plancher = min || 0
  return Math.max(plancher, Math.round(brut / 10) * 10)
}
