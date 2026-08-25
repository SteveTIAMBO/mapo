/**
 * Génération de la vitrine publique d'une école.
 * ----------------------------------------------
 * Une vitrine est une fiche `vitrines/{schoolId}` dans Firestore. Il n'y a RIEN
 * à déployer par école : le code de la vitrine est publié une fois, et la fiche
 * suffit — le site est en ligne aussitôt sur `<slug>.app-edufrem.com/site`.
 *
 * Ce module transforme ce que MAPO sait déjà de l'établissement en une page
 * publiable. Il ne « remplit pas un gabarit » : il n'écrit que du sourcé.
 *
 * ⚠️ RÈGLE CENTRALE — ne rien inventer sur une école réelle. Pas de tarifs, pas
 * de dates d'inscription, pas d'activités, et JAMAIS de citation attribuée au
 * directeur : ce sont des mots qu'une personne n'a pas prononcés, sur une page
 * qui porte son nom. Un bloc absent se complète ; un bloc inventé se découvre.
 *
 * ⚠️ Le champ de publication est `statut` ('brouillon' | 'en_attente' |
 * 'valide'), et non `publie` : c'est ce que lisent le rendu (`vitrine.js` exige
 * `statut === 'valide'`) et les règles Firestore. Le commentaire d'en-tête de
 * `config.js`, côté dépôt vitrine, documente encore `publie` — il est périmé.
 */

/** Accent par défaut, quand l'école n'a pas choisi de couleur. */
export const ACCENT_DEFAUT = '#D4A017'
/** Couleur de marque EDUFREM, dernier recours. */
export const PRIMAIRE_DEFAUT = '#8e24a9'

const LIBELLE_EDITION = {
  primaire: 'École primaire',
  secondaire: 'Collège et lycée',
  superieur: 'Enseignement supérieur',
}

/** Mot juste pour les apprenants, selon l'édition. */
function motApprenants(edition, n) {
  const pluriel = n > 1
  if (edition === 'primaire') return pluriel ? 'écoliers' : 'écolier'
  if (edition === 'superieur') return pluriel ? 'étudiants' : 'étudiant'
  return pluriel ? 'élèves' : 'élève'
}

/** Initiales, pour un sigle absent. Deux lettres au plus. */
export function sigleDeSecours(nom) {
  const mots = String(nom || '').replace(/["'«»]/g, ' ').split(/[\s-]+/).filter(Boolean)
  return mots.slice(0, 2).map((m) => m[0]).join('').toUpperCase()
}

/**
 * Phrase de présentation, strictement factuelle.
 *
 * ⚠️ Chaque morceau n'apparaît que s'il est CONNU. Une école fraîchement créée
 * a zéro élève : écrire « 0 écoliers » sur sa page publique serait à la fois
 * faux et humiliant. Zéro n'est pas un effectif, c'est une absence de mesure.
 */
export function phrasePresentation({ nom, type, ville, pays, edition, niveaux = [], effectif = 0 }) {
  const morceaux = []
  const nature = String(type || LIBELLE_EDITION[edition] || '').trim()
  const lieu = [ville, pays].filter(Boolean).join(', ')
  if (nature && lieu) morceaux.push(`${nom} est un établissement de type « ${nature} » situé à ${lieu}.`)
  else if (nature) morceaux.push(`${nom} est un établissement de type « ${nature} ».`)
  else if (lieu) morceaux.push(`${nom} est situé à ${lieu}.`)
  else morceaux.push(`${nom}.`)

  if (niveaux.length >= 2) {
    morceaux.push(`Il accueille les apprenants de ${niveaux[0]} à ${niveaux[niveaux.length - 1]}.`)
  }
  if (effectif > 0) {
    morceaux.push(`L'établissement compte ${effectif} ${motApprenants(edition, effectif)}.`)
  }
  return morceaux.join(' ')
}

/**
 * Piliers factuels. Renvoie une liste éventuellement VIDE — mieux vaut une
 * section absente que trois cases meublées avec des généralités.
 */
export function piliersFactuels({ niveaux = [], effectif = 0, personnel = 0, edition, anneeScolaire }) {
  const out = []
  if (niveaux.length) {
    out.push({
      titre: niveaux.length > 1 ? `${niveaux.length} niveaux` : '1 niveau',
      texte: niveaux.length > 1 ? `De ${niveaux[0]} à ${niveaux[niveaux.length - 1]}.` : niveaux[0],
    })
  }
  if (effectif > 0) {
    out.push({
      titre: `${effectif} ${motApprenants(edition, effectif)}`,
      texte: anneeScolaire ? `Effectif de l'année ${anneeScolaire}.` : 'Effectif actuel.',
    })
  }
  if (personnel > 0) {
    out.push({
      titre: personnel > 1 ? `Une équipe de ${personnel}` : 'Un membre du personnel',
      texte: 'Direction et enseignants.',
    })
  }
  return out
}

/**
 * Construit la fiche vitrine d'une école.
 *
 * `ecole` = document `schools/{id}` (les réglages y sont fusionnés).
 * `extras` = ce que l'appelant a pu compter : { niveaux, effectif, personnel }.
 *
 * ⚠️ `statut` vaut toujours 'brouillon' : les règles Firestore REFUSENT une
 * création directement en 'valide'. La publication est un second geste, humain
 * et volontaire — on ne met pas en ligne la page d'une école par inadvertance.
 */
export function genererVitrine(ecole, extras = {}) {
  const id = String(ecole?.id || '').trim()
  const nom = String(ecole?.schoolName || ecole?.nom || '').trim()
  if (!id || !nom) return null

  const edition = String(ecole?.edition || '').trim()
  const ville = String(ecole?.city || ecole?.ville || '').trim()
  const pays = String(ecole?.country || '').trim()
  const quartier = String(ecole?.address || ecole?.quartier || '').trim()
  const annee = String(ecole?.academicYear || ecole?.anneeAcademique || '').trim()
  const niveaux = (extras.niveaux || []).map((n) => String(n || '').trim()).filter(Boolean)
  const effectif = Math.max(0, Number(extras.effectif) || 0)
  const personnel = Math.max(0, Number(extras.personnel) || 0)

  const primaire = /^#[0-9a-f]{6}$/i.test(String(ecole?.primaryColor || '')) ? ecole.primaryColor : PRIMAIRE_DEFAUT
  const piliers = piliersFactuels({ niveaux, effectif, personnel, edition, anneeScolaire: annee })

  const directeur = [ecole?.directorFirstName, ecole?.directorLastName]
    .map((x) => String(x || '').trim()).filter(Boolean).join(' ')

  return {
    id,
    statut: 'brouillon',
    identite: {
      nom,
      sigle: String(ecole?.sigle || '').trim() || sigleDeSecours(nom),
      slogan: [LIBELLE_EDITION[edition], ville].filter(Boolean).join(' — '),
      ville, pays,
      anneeScolaire: annee,
      logoUrl: String(ecole?.logoUrl || '').trim(),
    },
    couleurs: { primaire, accent: ACCENT_DEFAUT },
    hero: { imageUrl: '', badge: annee ? `Année scolaire ${annee}` : '' },
    vision: {
      titre: 'Notre école',
      texte: phrasePresentation({ nom, type: ecole?.schoolType || ecole?.type, ville, pays, edition, niveaux, effectif }),
      piliers,
    },
    // ⚠️ `citation` reste VIDE : on n'attribue pas des mots au directeur.
    directeur: directeur
      ? { nom: directeur, fonction: 'Directeur', portraitUrl: '', citation: '' }
      : { nom: '', fonction: '', portraitUrl: '', citation: '' },
    contact: {
      // Seule l'adresse est reprise. Le téléphone et l'e-mail personnels du
      // directeur ne sont PAS les contacts publics de l'établissement : les
      // publier serait une décision qui n'appartient pas à l'outil.
      adresse: [quartier, ville, pays].filter(Boolean).join(', '),
      telephone: String(ecole?.phone || '').trim(),
      whatsapp: '',
      email: String(ecole?.email || '').trim(),
      mapEmbed: '', facebook: '', siteWeb: '',
    },
    mapo: {
      actif: true,
      titre: 'Une école équipée de MAPO',
      texte: "L'établissement gère sa scolarité avec MAPO : inscriptions, classes, notes et bulletins. Les familles reçoivent un accès à MAPO+, le tuteur de l'enfant.",
      points: [
        { titre: 'Suivi des apprenants', texte: 'Inscriptions, classes et effectifs tenus à jour.', icone: 'users' },
        { titre: 'Notes et bulletins', texte: 'Évaluations et bulletins par période.', icone: 'chart' },
        { titre: 'Lien avec les familles', texte: 'Accès MAPO+ ouvert par l’école.', icone: 'message' },
      ],
    },
    // Laissés vides FAUTE DE SOURCE, et non par oubli. L'école les complète.
    tarifs: { devise: String(ecole?.currency || 'FCFA').trim(), note: '', lignes: [] },
    inscription: { ouverture: '', fermeture: '', rentree: '', procedure: [], ctaLien: '' },
    activites: [],
    galerie: [],
    pub: { actif: false, encarts: [] },
  }
}

/** Ce qui manque pour que la page soit vraiment complète — à afficher à l'opérateur. */
export function manquesVitrine(cfg) {
  const m = []
  if (!cfg) return ['la fiche entière']
  if (!cfg.identite?.logoUrl) m.push('le logo')
  if (!cfg.tarifs?.lignes?.length) m.push('les tarifs')
  if (!cfg.inscription?.rentree) m.push('les dates d’inscription et la rentrée')
  if (!cfg.activites?.length) m.push('les activités')
  if (!cfg.galerie?.length) m.push('les photos')
  if (!cfg.contact?.telephone && !cfg.contact?.email) m.push('un contact public')
  if (!cfg.directeur?.nom) m.push('le nom du directeur')
  return m
}
