/**
 * Import du programme depuis un PDF — sélection de la partie utile.
 *
 * ⚠️ CE QUI REND CE FICHIER NÉCESSAIRE. Le serveur ne garde que 4 000
 * caractères du descriptif. Un PDF de programme en fait dix fois plus, et ses
 * premières pages sont une COUVERTURE, un mot du directeur, une charte
 * graphique. Tronquer au début aurait donc envoyé à l'IA très exactement la
 * partie qui ne contient aucun module — et elle serait retombée sur son
 * comportement par défaut : inventer un programme plausible. L'import aurait
 * eu l'air de marcher.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  densiteProgramme, resumerProgramme, refusFichier, contientMaquette,
  BUDGET_TEXTE, MAX_OCTETS,
} from '../utils/pdfProgramme'

// Un PDF d'école réaliste : beaucoup de préambule, la maquette au milieu.
const COUVERTURE = 'INSTITUT SUPERIEUR DE MANAGEMENT. Excellence, ambition, avenir. '
  + 'Le mot du directeur. Depuis sa fondation, notre institut accompagne des femmes et des '
  + 'hommes vers les plus hautes responsabilites. Notre campus, nos partenariats '
  + 'internationaux et notre reseau d anciens font la force de notre pedagogie. '
const MAQUETTE = 'Maquette pedagogique. Semestre 1 : UE1 Strategie d entreprise 6 ECTS, '
  + 'UE2 Comptabilite analytique 4 credits, UE3 Marketing digital 5 ECTS. '
  + 'Semestre 2 : UE4 Droit des affaires, UE5 Gestion de projet, volume horaire 30h, '
  + 'coefficient 2. Modules optionnels : Negociation, Data analytics. '
const ANNEXES = 'Modalites d inscription. Les frais de dossier sont a regler avant le 30 septembre. '
  + 'Les candidats etrangers joindront une traduction assermentee de leurs diplomes. '

const bourrage = (s, n) => s.repeat(n)

describe('reconnaître une maquette d’une page de garde', () => {
  it('la maquette est plus dense que la couverture', () => {
    expect(densiteProgramme(MAQUETTE)).toBeGreaterThan(densiteProgramme(COUVERTURE))
  })

  it('un texte vide vaut zéro, sans exploser', () => {
    for (const x of ['', '   ', null, undefined]) expect(densiteProgramme(x)).toBe(0)
  })

  it('les accents ne changent rien : « unité » compte comme « unite »', () => {
    expect(densiteProgramme('Unité d’enseignement, crédits')).toBeGreaterThan(0)
  })
})

describe('⚠️ on garde la maquette, pas la couverture', () => {
  it('la partie retenue contient les modules, pas le mot du directeur', () => {
    const doc = bourrage(COUVERTURE, 40) + MAQUETTE + bourrage(ANNEXES, 40)
    expect(doc.length).toBeGreaterThan(BUDGET_TEXTE * 3)
    const retenu = resumerProgramme(doc)
    expect(retenu).toContain('Strategie d entreprise')
    expect(retenu).toContain('Droit des affaires')
    expect(retenu.length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })

  it('tronquer au début aurait échoué — c’est le défaut qu’on évite', () => {
    const doc = bourrage(COUVERTURE, 40) + MAQUETTE + bourrage(ANNEXES, 40)
    const naif = doc.slice(0, BUDGET_TEXTE)
    expect(naif).not.toContain('Strategie d entreprise')
    expect(resumerProgramme(doc)).toContain('Strategie d entreprise')
  })

  it('un texte déjà court passe tel quel', () => {
    expect(resumerProgramme(MAQUETTE)).toContain('UE1')
    expect(resumerProgramme(MAQUETTE).length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })

  it('les espaces multiples et les sauts de ligne sont normalisés', () => {
    expect(resumerProgramme('UE1   Strategie\n\n\tMarketing')).toBe('UE1 Strategie Marketing')
  })

  it('rien n’entre, rien ne sort', () => {
    for (const x of [null, undefined, '']) expect(resumerProgramme(x)).toBe('')
  })

  it('le budget est respecté même sur un document énorme', () => {
    const enorme = bourrage(MAQUETTE + COUVERTURE, 400)
    expect(enorme.length).toBeGreaterThan(200000) // ~230 000 caractères
    expect(resumerProgramme(enorme).length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })
})

/**
 * pdf.js coûte 427 Ko. Ce qui se paie n'est pas le chunk : c'est le
 * PRÉCHARGEMENT du PWA, imposé à chaque installation. Mesuré le 24/08 : le
 * précache passait de 7 909 à 8 350 Kio, soit +441 Kio pour une fonction que la
 * plupart des apprenants n'utiliseront jamais. Sur un forfait data africain,
 * c'est un motif de désinstallation.
 */
describe('le PDF ne se paie qu’à l’usage', () => {
  const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const SRC = readFileSync(resolve(RACINE, 'src/utils/pdfProgramme.js'), 'utf8')
  const VITE = readFileSync(resolve(RACINE, 'vite.config.js'), 'utf8')

  it('la bibliothèque est chargée à la demande, jamais au démarrage', () => {
    expect(SRC).toContain("await import('pdfjs-dist')")
    // Un import statique la ferait entrer dans le bundle principal.
    expect(SRC).not.toMatch(/^import .* from 'pdfjs-dist'/m)
  })

  it('⚠️ et elle est exclue du préchargement du PWA', () => {
    expect(VITE).toContain("globIgnores: ['**/pdf-*.js', '**/pdf.worker*']")
  })

  it('les PDF que l’app GÉNÈRE ne sont pas concernés', () => {
    // `pdfBulletin-*.js` et jspdf servent aux bulletins et aux exports : eux
    // doivent rester hors ligne. Le motif `pdf-*` ne les attrape pas.
    expect('pdfBulletin-abc.js'.startsWith('pdf-')).toBe(false)
  })
})

/**
 * ⚠️ MESURÉ EN PRODUCTION le 24/08, sur la page réelle d'un Executive MBA :
 * 23 920 caractères de VRAI contenu — mission, valeurs, conditions d'admission,
 * contact — et AUCUNE liste de modules. Les seules occurrences d'« ECTS » et de
 * « Module » étaient dans les prérequis (« 180 crédits ECTS ») et dans le menu
 * du pied de page (« Modules courts et Bootcamps »).
 *
 * La densité de vocabulaire, elle, valait 26 sur ce menu : aussi haute que sur
 * une vraie maquette. Elle ne pouvait donc pas trancher.
 */
describe('plaquette commerciale ou vraie maquette ?', () => {
  const PLAQUETTE = "IRIIG - Executive MBA - Corporate Entrepreneurship & Innovation. "
    + 'Missions et valeurs. Mission & Pédagogie. Compétences & Valeurs. Diversité & Inclusion. '
    + "Qui sommes-nous ? Nous rejoindre. Programmes. Masters of Science. MSc – Management des "
    + "Projets d'Innovation. MSc - Financement de l'Innovation. Candidature. "
    + "Professionnels ayant validé un bac+3/bac+4, soit au moins 180 crédits ECTS, avec minimum "
    + "5 ans d'expérience professionnelle. Modules courts et Bootcamps. Contactez-nous."

  const MAQUETTE = 'Semestre 1 : UE1 Stratégie d’entreprise 6 ECTS, UE2 Comptabilité 4 crédits, '
    + 'UE3 Marketing digital 5 ECTS. Semestre 2 : UE4 Droit des affaires 30 h, '
    + 'UE5 Gestion de projet, coefficient 2.'

  it('⚠️ la plaquette est REFUSÉE, malgré ses 180 crédits ECTS', () => {
    // Un seul marqueur, dans les prérequis : ce n'est pas une maquette.
    expect(contientMaquette(PLAQUETTE)).toBe(false)
  })

  it('une vraie maquette est acceptée', () => {
    expect(contientMaquette(MAQUETTE)).toBe(true)
  })

  it('la DENSITÉ, elle, ne savait pas les distinguer', () => {
    // C'est la raison d'être de ce second contrôle : le menu d'un site d'école
    // est saturé de « programme », « cours », « module ».
    expect(densiteProgramme(PLAQUETTE)).toBeGreaterThan(3)
  })

  it('rien du tout est refusé, sans exploser', () => {
    for (const x of [null, undefined, '', 'Bienvenue sur notre site.']) {
      expect(contientMaquette(x)).toBe(false)
    }
  })

  it('⚠️ l’heure des PORTES OUVERTES n’est pas un volume horaire', () => {
    // Première version du contrôle, prise en défaut sur la vraie page : elle
    // comptait « Portes Ouvertes - samedi 12 septembre à 10h » DEUX fois, et
    // ces deux occurrences plus « 180 crédits ECTS » atteignaient le seuil.
    // La plaquette passait donc pour une maquette.
    expect(contientMaquette(
      'Prochaine rentrée le 13 octobre 2026. IMMERSION : Matinée Portes Ouvertes '
      + "samedi 12 septembre à 10h. Ouvert de 9 h à 18 h. Au moins 180 crédits ECTS requis.",
    )).toBe(false)
  })

  it('un seul « 180 crédits ECTS » dans les prérequis ne suffit pas', () => {
    expect(contientMaquette('Admission : bac+3, soit 180 crédits ECTS, et 5 ans d’expérience.')).toBe(false)
  })

  it('une énumération, même sans ECTS, suffit', () => {
    // Beaucoup de maquettes africaines numérotent leurs UE sans parler d'ECTS.
    expect(contientMaquette('UE1 Comptabilité générale. UE2 Fiscalité. UE3 Audit.')).toBe(true)
  })
})

/**
 * Le PDF est la SEULE source d'import — décision de Steve le 24/08, après avoir
 * vu que la page web de sa propre école ne publiait pas sa maquette. Ne garder
 * que le PDF invite la personne à le prendre sur le site de son école, ou à le
 * DEMANDER à son école : c'est le document qui fait foi.
 */
describe('le PDF est la seule source, et il reste atteignable', () => {
  const RACINE2 = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const SETUP = readFileSync(resolve(RACINE2, 'src/components/MiapoFormationSetup.vue'), 'utf8')
  const VUE = readFileSync(resolve(RACINE2, 'src/views/ParentMiapoView.vue'), 'utf8')
  const IA = readFileSync(resolve(RACINE2, 'server/mapo-ia.php'), 'utf8')
  const TUTEUR = readFileSync(resolve(RACINE2, 'src/stores/tuteur.js'), 'utf8')

  it('⚠️ une plaquette est refusée AUSSI en PDF', () => {
    // « J'ai la plaquette de mon MBA » — le mot dit tout : une brochure
    // commerciale présente la formation sans lister ses modules.
    expect(SETUP).toContain("if (!contientMaquette(res.texte)) { pdfErreur.value = t('miaForm.pdfErrSansMaquette'); return }")
  })

  it('⚠️ l’import est atteignable même quand des modules existent DÉJÀ', () => {
    // Il ne l'était que depuis un écran vide : un apprenant dont les modules
    // avaient été devinés par l'IA devait TOUT effacer pour importer son PDF.
    //
    // ⚠️ Réécrit le 03/09 : le bouton vit désormais DANS la liste « Mes cours »,
    // qui a absorbé la carte des modules. Ce qu'on vérifie est inchangé — le
    // chemin d'import existe sans condition d'écran vide.
    const COURS = readFileSync(resolve(RACINE2, 'src/components/MiapoMesCours.vue'), 'utf8')
    expect(VUE).toContain('@importer-plaquette="openFormationSetup"')
    expect(COURS).toContain("emit('importer-plaquette')")
    // …et il n'est pas conditionné à une liste vide.
    expect(COURS).toMatch(/v-if="sansReferentiel" class="mc-sources"/)
  })

  it('la lecture d’URL a bien été retirée partout', () => {
    // Elle marchait techniquement, mais les pages d'écoles ne publient pas
    // leurs maquettes : deux chemins dont un aboutit rarement valent moins
    // qu'un seul qui dit clairement quoi faire.
    expect(SETUP).not.toContain('formationUrl')
    expect(VUE).not.toContain('formationUrl')
    expect(TUTEUR).not.toContain('lireProgrammeUrl')
    // Et avec elle, toute la surface SSRF côté serveur.
    expect(IA).not.toContain('fetch_programme')
    expect(IA).not.toContain('CURLOPT_RESOLVE')
  })
})

describe('ce qu’on refuse, et ce qu’on en dit', () => {
  const fichier = (nom, type, size = 1000) => ({ name: nom, type, size })

  it('un PDF est accepté, par son type comme par son extension', () => {
    expect(refusFichier(fichier('programme.pdf', 'application/pdf'))).toBe('')
    expect(refusFichier(fichier('programme.PDF', ''))).toBe('')
  })

  it('un document Word est refusé pour son FORMAT', () => {
    expect(refusFichier(fichier('programme.docx', 'application/msword'))).toBe('format')
  })

  it('un fichier trop lourd est refusé pour sa TAILLE, pas son format', () => {
    // Deux refus différents, deux messages différents : « ce n'est pas un PDF »
    // et « ce PDF est trop lourd » n'appellent pas la même action.
    expect(refusFichier(fichier('programme.pdf', 'application/pdf', MAX_OCTETS + 1))).toBe('taille')
  })

  it('aucun fichier du tout se dit aussi', () => {
    expect(refusFichier(null)).toBe('aucun')
  })
})
