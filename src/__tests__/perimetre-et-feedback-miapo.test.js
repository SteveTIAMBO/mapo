/**
 * Les deux règles que MIAPO affirme publiquement, vérifiées dans le code.
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, piliers P4 et P8,
 * section 5.3, écarts E4 et E6.
 *
 * ⚠️ POURQUOI CES TESTS EXISTENT. Une consigne de prompt n'est protégée par
 * rien : elle se perd au premier remaniement, et l'échec est muet — le tuteur
 * continue de répondre, simplement il ne respecte plus la règle. Or ces deux
 * règles-ci ne sont pas des préférences de style :
 *
 *  - le PÉRIMÈTRE est ce qui tient lieu de réponse à la recommandation UNESCO
 *    et à l'exigence 6 de CARE-AI. Il a été AFFIRMÉ publiquement pendant des
 *    semaines sans être codé (constaté le 02/09/2026) ;
 *  - le FEEDBACK SUR LA TÂCHE repose sur Kluger et DeNisi (1996), 607 tailles
 *    d'effet : plus d'un tiers des interventions de feedback DÉGRADENT la
 *    performance quand elles visent la personne.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { typesForMatiere } from '../utils/revisionTypes'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const IA = lire('server/mapo-ia.php')
const DIGEST = lire('src/utils/digestApprenant.js')

describe('⭐⭐ périmètre du tuteur — codé, plus seulement affiché', () => {
  it('la restriction au scolaire est dans le prompt, en FR et en EN', () => {
    expect(IA).toContain('PÉRIMÈTRE STRICT')
    expect(IA).toContain('STRICT SCOPE')
  })

  it('⚠️ les sujets hors périmètre sont nommés, pas sous-entendus', () => {
    // Un « reste sur le scolaire » vague ne tient pas : le modèle a besoin de la
    // liste. Ce sont exactement les interdits de la section 5.3.
    for (const sujet of ['humeur', 'état émotionnel', 'vie personnelle', 'santé', 'relations', 'conseil de vie']) {
      expect(IA.toLowerCase(), `sujet « ${sujet} »`).toContain(sujet.toLowerCase())
    }
  })

  it('⭐ la FORME DU JOUR reste un signal de rythme, jamais un sujet', () => {
    // Arbitrage Steve du 02/09 : on garde le signal (il raccourcit une séance un
    // jour de fatigue), on interdit de le commenter. Sans cette règle, le champ
    // transmis au modèle était une invitation à demander « ça ne va pas ? ».
    expect(IA).toContain('elle ne se mentionne pas et ne se questionne pas')
    expect(IA).toContain('it is never mentioned and never asked about')
    expect(DIGEST).toContain('NE JAMAIS mentionner')
  })

  it('⚠️ hors périmètre = refus DOUX et retour au cours, pas un mur', () => {
    expect(IA).toContain('sans le juger')
    expect(IA).toContain('without judging them')
  })

  it('⭐⭐ l’exception de protection de l’enfance existe, et n’est ni un refus sec ni un conseil', () => {
    // Exigence explicite de CARE-AI. Un refus sec serait la pire réponse
    // possible face à un enfant en détresse ; un conseil serait hors rôle.
    expect(IA).toContain('EXCEPTION DE PROTECTION')
    expect(IA).toContain('SAFEGUARDING EXCEPTION')
    expect(IA).toContain('adulte de confiance')
    expect(IA).toContain('trusted adult')
    expect(IA).toContain('NI par un refus sec NI par un conseil')
  })
})

describe('⭐⭐ le feedback porte sur la tâche, jamais sur la personne', () => {
  it('la règle est posée dans le chat, en FR et en EN', () => {
    expect(IA).toContain('FEEDBACK SUR LA TÂCHE, JAMAIS SUR LA PERSONNE')
    expect(IA).toContain('FEEDBACK ON THE TASK, NEVER ON THE PERSON')
  })

  it('⚠️ elle vaut AUSSI pour les explications de quiz', () => {
    // L'écart E6 ne visait que le chat. Mais une explication de quiz est un
    // feedback, et c'est la forme que l'apprenant rencontre le plus souvent.
    expect(IA).toContain("L'EXPLICATION porte sur la tâche, jamais sur la personne")
  })

  it('⭐ le jugement de capacité est interdit DANS LES DEUX SENS', () => {
    // Kluger et DeNisi ne distinguent pas la polarité : c'est le déplacement de
    // l'attention vers le soi qui nuit. « Tu es doué » est donc visé autant que
    // « tu es faible en ».
    expect(IA).toContain('tu es doué')
    expect(IA).toContain('tu es faible en')
    expect(IA).toContain("you're gifted")
  })

  it('⚠️ mais la chaleur reste explicitement demandée', () => {
    // Sans cette précision, la règle produit un tuteur froid — ce que Kluger et
    // DeNisi ne demandent nulle part. L'encouragement porte sur l'effort et le
    // progrès, pas sur une qualité supposée.
    expect(IA).toContain('chaleureux et encourageant')
    expect(IA).toContain('warm and encouraging')
  })

  it('aucune comparaison entre apprenants', () => {
    expect(IA).toContain('Ne compare jamais l\'apprenant à d\'autres apprenants')
  })
})

describe('⭐ entrelacement : le filtre est le MATÉRIEL, plus l’âge (E4)', () => {
  it('⚠️ l’entrelacement est désormais proposé au primaire', () => {
    // Le critère d'âge n'était pas fondé : le seul modérateur établi est le
    // matériel et la similarité entre catégories (Brunmair et Richter, 2019).
    const cles = typesForMatiere('Mathématiques', { primaire: true }).map((t) => t.key)
    expect(cles).toContain('interleave')
  })

  it('mais toujours pas là où il n’a pas de sens', () => {
    // `needs: ['scientifique']` reste : rien à discriminer dans un texte
    // d'histoire, et Brunmair et Richter ne trouvent aucun effet significatif
    // sur les textes expositifs.
    expect(typesForMatiere('Histoire-Géographie', { primaire: true }).map((t) => t.key)).not.toContain('interleave')
  })

  it('⚠️ rédaction et carte mentale restent exclues du primaire, pour un AUTRE motif', () => {
    // Prérequis de rédaction et d'abstraction. Choix d'ingénierie assumé, sans
    // prétention scientifique — et donc à ne pas justifier par une étude.
    const cles = (m) => typesForMatiere(m, { primaire: true }).map((t) => t.key)
    expect(cles('Français')).not.toContain('redaction')
    expect(cles('Histoire-Géographie')).not.toContain('mindmap')
  })

  it('et elles restent disponibles hors primaire', () => {
    expect(typesForMatiere('Français', {}).map((t) => t.key)).toContain('redaction')
    expect(typesForMatiere('Histoire-Géographie', {}).map((t) => t.key)).toContain('mindmap')
  })
})
