// MAPO+ — Inférence matière à partir d'un THÈME (et non du nom de la matière).
//
// Quand l'apprenant dit « lance un quiz sur les fractions », « fractions » est un
// THÈME, pas une matière. Le rapprochement par nom (b2cMatchMatiere / subjectFrom)
// échoue donc, et rien ne se lance. Ici on infère la FAMILLE de matière à partir
// de mots-clés de programme, puis on renvoie la matière RÉELLE de l'apprenant
// correspondante (jamais une matière fabriquée : la progression reste propre).

const norm = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '') // enlève les diacritiques combinants
  .trim()

// Familles : `anchors` = fragments présents dans le NOM d'une matière réelle ;
// `topics` = mots-clés de thèmes typiques du programme (FR + EN, contexte
// Afrique/France). L'ordre compte peu : on prend la 1re famille dont un thème
// apparaît ET dont un ancrage matche une matière que l'apprenant possède.
export const TOPIC_FAMILIES = [
  {
    key: 'maths',
    anchors: ['math'],
    topics: ['fraction', 'equation', 'inequation', 'geometrie', 'algebre', 'calcul', 'multiplication',
      'division', 'pourcentage', 'proportion', 'theoreme', 'pythagore', 'thales', 'derivee', 'derivation',
      'integrale', 'primitive', 'statistique', 'probabilite', 'nombre', 'entier', 'decimal', 'addition',
      'soustraction', 'aire', 'perimetre', 'volume', 'angle', 'triangle', 'cercle', 'trigonometrie',
      'sinus', 'cosinus', 'tangente', 'vecteur', 'fonction', 'affine', 'polynome', 'racine', 'puissance',
      'logarithme', 'exponentielle', 'suite', 'matrice', 'coordonnee', 'symetrie', 'pgcd', 'ppcm',
      'fractions', 'equations'],
  },
  {
    key: 'francais',
    anchors: ['franc', 'lettres modernes', 'lettres'],
    topics: ['conjugaison', 'grammaire', 'orthographe', 'dictee', 'vocabulaire', 'accord', 'participe',
      'dissertation', 'redaction', 'commentaire', 'poesie', 'litterature', 'subjonctif', 'imparfait',
      'passe compose', 'plus-que-parfait', 'futur', 'conditionnel', 'nature', 'proposition', 'syntaxe',
      'complement', 'figure de style', 'metaphore', 'champ lexical', 'argumentation', 'connecteur',
      'verbe', 'adjectif', 'adverbe', 'pronom', 'homophone'],
  },
  {
    key: 'anglais',
    anchors: ['angl', 'english'],
    topics: ['present perfect', 'past simple', 'present simple', 'irregular verb', 'phrasal verb',
      'past continuous', 'future tense', 'modal', 'comparative', 'superlative', 'reported speech',
      'conditional', 'passive voice', 'gerund', 'preposition'],
  },
  {
    key: 'svt',
    anchors: ['svt', 'biolog', 'sciences de la vie', 'science de la vie', 'sciences naturelles'],
    topics: ['cellule', 'photosynthese', 'digestion', 'respiration', 'genetique', 'evolution', 'ecosysteme',
      'adn', 'chromosome', 'reproduction', 'immunite', 'neurone', 'hormone', 'enzyme', 'mitose', 'meiose',
      'ecologie', 'nutrition', 'circulation sanguine', 'systeme nerveux', 'sang', 'muscle', 'squelette',
      'plante', 'organe', 'espece', 'biodiversite'],
  },
  {
    key: 'physique',
    anchors: ['physi', 'chimie', 'sciences physiques'],
    topics: ['force', 'energie', 'atome', 'molecule', 'reaction', 'electricite', 'optique', 'vitesse',
      'masse', 'tension', 'courant', 'circuit', 'resistance', 'ion', 'mole', 'acide', 'base', 'oxydation',
      'lumiere', 'onde', 'gravite', 'pression', 'densite', 'combustion', 'ampere', 'volt', 'newton',
      'mouvement', 'acceleration', 'champ magnetique', 'electron', 'ph', 'ph d\'une solution'],
  },
  {
    key: 'histgeo',
    anchors: ['hist', 'geo'],
    topics: ['guerre', 'revolution', 'empire', 'colonisation', 'decolonisation', 'independance', 'carte',
      'climat', 'continent', 'relief', 'population', 'urbanisation', 'mondialisation', 'republique',
      'esclavage', 'traite negriere', 'nazisme', 'seconde guerre', 'premiere guerre', 'guerre froide',
      'antiquite', 'moyen age', 'renaissance', 'migration', 'developpement durable', 'frontiere'],
  },
  {
    key: 'philo',
    anchors: ['philo'],
    topics: ['conscience', 'liberte', 'verite', 'morale', 'justice', 'bonheur', 'autrui', 'desir', 'raison',
      'inconscient', 'devoir', 'travail', 'religion', 'art', 'nature humaine', 'existence', 'temps'],
  },
]

// Découpe en mots (accents retirés, ponctuation → espaces) et rembourre d'espaces
// pour des correspondances à frontière de mot : « aire » ne matche pas « faire ».
const words = (s) => ' ' + norm(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '

// Renvoie la matière RÉELLE de l'apprenant inférée depuis un thème, ou ''.
// `matieres` = liste des matières que l'apprenant possède réellement.
export function inferMatiereFromTopic(query, matieres) {
  const q = words(query)
  const list = Array.isArray(matieres) ? matieres : []
  for (const fam of TOPIC_FAMILIES) {
    // thème présent comme mot/expression entier (multi-mots gérés : « present perfect »)
    const hasTopic = fam.topics.some((t) => q.includes(words(t)))
    if (!hasTopic) continue
    const hit = list.find((m) => fam.anchors.some((a) => norm(m).includes(a)))
    if (hit) return hit
  }
  return ''
}

// Extrait le THÈME d'une demande de quiz : « … sur les fractions » → « fractions ».
// On privilégie « sur / portant sur / about / on » (le « de » introduit souvent la
// matière : « quiz DE maths »). Renvoie '' si aucun thème explicite.
export function extractTheme(query) {
  const m = String(query || '').match(/\b(?:portant sur|sur|about|on)\s+(?:l['’]|le |la |les |the |mon |ma |mes )?(.{2,60})$/i)
  if (!m) return ''
  return m[1].trim().replace(/[?.!,;:\s]+$/, '').trim()
}
