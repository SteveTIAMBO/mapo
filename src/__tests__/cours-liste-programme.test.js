/**
 * « Mes cours » = LA liste du programme.
 *
 * DÉFAUT D'ORIGINE (Djany, 03/09/2026). Le composant se fabriquait sa propre
 * liste de matières via `matieresPourNiveau(niveau)` — sans le pays, et sans
 * regarder `formationModules`. Pour « Formation (hors catalogue) », cette
 * fonction tombe sur son `return MATIERES` final : le programme du SECONDAIRE
 * CAMEROUNAIS. Une apprenante en certification ISO 27001 se voyait donc proposer
 * « Éducation physique et sportive » pour ranger son cours, pendant que ses
 * treize vrais modules s'affichaient dans la carte juste au-dessus.
 *
 * Le premier bloc REJOUE ce défaut sur la fonction elle-même : elle n'est pas en
 * cause, elle fait ce qu'on lui demande. C'est de l'avoir appelée là qui l'était.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matieresPourNiveau, NIVEAU_HORS_CATALOGUE } from '../stores/enfantsAutonomes'
import { listeModules, ajouterModule, retirerModule, renommerModule } from '../utils/modulesFormation'
import { ajouterMatiere, retirerMatiere, fusionnerMatieres } from '../utils/matieresSup'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')

describe('⭐⭐ le défaut rejoué : pourquoi Djany voyait le collège', () => {
  it('matieresPourNiveau rend BIEN le secondaire pour une formation hors catalogue', () => {
    const l = matieresPourNiveau(NIVEAU_HORS_CATALOGUE)
    expect(l.length).toBeGreaterThan(0)
    // La preuve du défaut : rien de tout cela n'a sa place dans un MBA.
    expect(l.join(' | ')).toMatch(/Éducation physique|Histoire|Géographie/)
  })

  it('⚠️ elle ne connaît pas `formationModules` — ce n’est pas son travail', () => {
    // Elle prend un niveau et un pays. Un programme de formation ne s'en déduit
    // pas : il faut le LIRE dans le profil. D'où la prop.
    expect(matieresPourNiveau.length).toBe(2)
  })
})

describe('⭐⭐ le composant ne déduit plus rien : il reçoit', () => {
  const COURS = lire('src/components/MiapoMesCours.vue')
  const VUE = lire('src/views/ParentMiapoView.vue')

  it('plus aucun import de catalogue dans « Mes cours »', () => {
    expect(COURS).not.toMatch(/import\s*\{[^}]*matieresPourNiveau/)
    expect(COURS).toMatch(/matieres:\s*\{\s*type:\s*Array/)
  })

  it('la vue lui passe la MÊME liste que le reste de l’app', () => {
    // Le quiz, les notes, le planning et les examens lisent tous `matieresList`.
    // Une seconde source aurait divergé — c'est exactement ce qui s'est produit.
    expect(VUE).toMatch(/<MiapoMesCours[\s\S]{0,400}:matieres="matieresList"/)
  })

  it('⚠️ un document orphelin reste VISIBLE', () => {
    // Un document rattaché à un cours retiré du programme n'a pas disparu du
    // stockage : le masquer ferait croire qu'il n'existe plus, et on le
    // réimporterait. « Zéro » et « je ne sais pas » ne sont pas la même chose.
    expect(COURS).toContain('const orphelins = computed(')
    expect(COURS).toContain("t('mia.mcOrphans')")
  })
})

describe('⭐ écrire un cours : deux dépôts, selon ce que MAPO sait', () => {
  it('sans référentiel, la liste EST le programme et tout y est modifiable', () => {
    let mods = ''
    mods = ajouterModule(mods, 'Audit interne')
    mods = ajouterModule(mods, 'Continuité d’activité')
    expect(listeModules(mods)).toEqual(['Audit interne', 'Continuité d’activité'])
    mods = renommerModule(mods, 'Audit interne', 'Audit interne (ISO 19011)')
    expect(listeModules(mods)[0]).toBe('Audit interne (ISO 19011)')
    mods = retirerModule(mods, 'Continuité d’activité')
    expect(listeModules(mods)).toHaveLength(1)
  })

  it('⚠️ avec un référentiel national, l’ajout est un SUPPLÉMENT', () => {
    // On ne retire pas « Mathématiques » du programme d'une élève de 5ème : ce
    // n'est pas elle qui l'y a mise, et la retirer masquerait une partie de sa
    // scolarité sans rien corriger.
    const base = ['Mathématiques', 'Français']
    let sup = ajouterMatiere([], 'Théâtre')
    expect(fusionnerMatieres(base, sup)).toEqual(['Mathématiques', 'Français', 'Théâtre'])
    sup = retirerMatiere(sup, 'Théâtre')
    expect(fusionnerMatieres(base, sup)).toEqual(base)
    // Retirer une matière officielle par ce chemin ne fait RIEN — et c'est voulu.
    expect(fusionnerMatieres(base, retirerMatiere(sup, 'Mathématiques'))).toContain('Mathématiques')
  })

  it('la vue branche bien les deux dépôts', () => {
    const VUE = lire('src/views/ParentMiapoView.vue')
    expect(VUE).toContain("majModulesFormation(ajouterModule(e.formationModules || '', nom))")
    expect(VUE).toContain('majMatieresSup(ajouterMatiere(e.matieresSup || [], nom))')
    expect(VUE).toContain("majModulesFormation(retirerModule(e.formationModules || '', nom))")
  })
})

describe('⭐ rien ne se remplit par défaut là où MAPO ne sait pas', () => {
  it('un profil hors catalogue sans modules a une liste VIDE', () => {
    // Proposer une liste plausible serait pire qu'une liste vide : l'erreur
    // aurait l'air d'un réglage, et personne ne la corrigerait.
    expect(listeModules('')).toEqual([])
    expect(listeModules(null)).toEqual([])
  })

  it('la plaquette reste le second chemin de création, sans écran vide requis', () => {
    const COURS = lire('src/components/MiapoMesCours.vue')
    expect(COURS).toContain("emit('importer-plaquette')")
    expect(COURS).toMatch(/v-if="sansReferentiel" class="mc-sources"/)
  })
})

describe('⭐⭐ école reliée : on hérite ET on peut ajouter', () => {
  const VUE = lire('src/views/ParentMiapoView.vue')
  const COURS = lire('src/components/MiapoMesCours.vue')

  it('⚠️ l’entrée « Mes cours » n’est PLUS retirée du menu', () => {
    // Elle l'était : `...(ecoleLie ? [] : [{ key: 'cours' … }])`. La personne
    // arrivée par une invitation MAPO héritait des cours de son école et ne
    // pouvait plus en ajouter AUCUN — ni ses notes, ni un support non publié.
    expect(VUE).not.toMatch(/ecoleLie \? \[\] : \[\{ key: 'cours'/)
    expect(VUE).toMatch(/\{ key: 'cours', label: t\('mia\.secMyCourses'\)/)
  })

  it('les cours de l’école sont servis à la liste', () => {
    expect(VUE).toContain(':cours-ecole="coursEcoleListe"')
    expect(VUE).toContain('listCoursEcole(activeEnfant.value.id)')
  })

  it('⚠️ ils sont en LECTURE SEULE — ni renommables, ni supprimables', () => {
    // Les effacer localement ne corrigerait rien : ça masquerait ce que
    // l'école publie.
    expect(COURS).toContain('&& !props.coursEcole.some((c) => memeNom(c.matiere, nom))')
    expect(COURS).toContain('mc-item-ecole')
    expect(COURS).not.toMatch(/docsEcole[\s\S]{0,200}supprimer\(/)
  })

  it('un cours publié dont la matière n’est pas au programme reste visible', () => {
    expect(COURS).toContain("if (c.matiere && !noms.some((m) => memeNom(m, c.matiere))) noms.push(c.matiere)")
  })
})

describe('⭐⭐ créer une matière à la volée l’inscrit AU PROGRAMME', () => {
  it('la modale document émet « creer-cours » pour une matière inconnue', () => {
    // Sinon le cours n'existe que sur ce document : ni le quiz, ni les notes,
    // ni les examens ne le connaissent, et il retombe dans « À ranger ».
    const COURS = lire('src/components/MiapoMesCours.vue')
    expect(COURS).toContain("if (mat && !props.matieres.some((m) => memeNom(m, mat))) emit('creer-cours', mat)")
  })

  it('renommer un cours emmène ses documents avec lui', () => {
    const COURS = lire('src/components/MiapoMesCours.vue')
    expect(COURS).toContain("updateCoursPerso(enfantId.value, d.id, { matiere: n })")
  })
})
