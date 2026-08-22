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
      directorFirstName: 'Michel',
      directorLastName: 'Teussop',
      directorName: 'Teussop Michel',
      email: 'contact@edufrem.com',
    },
    // Identité : aucun renommage. Voir le principe 1.
    nomsFamille: null,
    ecolePrimaire: null,
    // Le primaire camerounais démarre à la SIL.
    classesPrimaire: null,
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
      directorFirstName: 'Alphonse',
      directorLastName: 'Makosso',
      directorName: 'Makosso Alphonse',
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
  },
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
