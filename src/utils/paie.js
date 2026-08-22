/**
 * Barèmes de paie PAR PAYS.
 *
 * Le défaut corrigé : les deux générateurs de bulletin de salaire du dépôt
 * (`utils/pdfFichePaie.js` et `views/SalaireView.vue`) appliquaient les taux
 * CAMEROUNAIS à toutes les écoles, quel que soit le pays de déploiement — CNPS
 * 4,2 %, plafond 750 000, Crédit Foncier 1 %, IRPP, CAC. Une école congolaise
 * recevait donc un bulletin faux, et `SalaireView` allait jusqu'à imprimer
 * « Ce bulletin est conforme à la réglementation CEMAC en vigueur » : une
 * affirmation de conformité fausse, plus grave qu'un chiffre faux.
 *
 * ⚠️ RÈGLE : on ne code QUE ce qui est sourcé.
 *
 * Les cotisations sociales congolaises viennent du CLEISS (Centre des liaisons
 * européennes et internationales de sécurité sociale, organisme public
 * français), taux au 1er janvier 2023 :
 * https://www.cleiss.fr/docs/cotisations/congo.html
 *
 * L'impôt congolais sur les traitements et salaires (ITS), lui, N'EST PAS codé.
 * Deux sources secondaires se contredisent frontalement sur son calcul : l'une
 * décrit un abattement de 20 % et un quotient familial, l'autre écrit que le
 * calcul « n'intègre aucune réduction pour charge de famille ». Le texte de
 * référence (loi de finances 2026, loi n° 42-2025, articles 114 à 116 I du CGI)
 * n'est pas consultable en ligne. Inventer un barème produirait un bulletin
 * faux d'apparence crédible — le pire des deux mondes. L'école saisit donc
 * elle-même son taux, et le bulletin DIT que le barème n'est pas préchargé.
 */

/**
 * Une cotisation : un pourcentage, éventuellement plafonné.
 * `part` vaut 'salarie' (retenue sur le net) ou 'employeur' (information).
 */
const pct = (code, libelle, taux, plafond = null, part = 'salarie') => ({ code, libelle, taux, plafond, part })

export const BAREMES_PAIE = {
  // ── Cameroun ──
  // Reprise des valeurs qui existaient déjà dans le dépôt. Elles y étaient
  // documentées comme SIMPLIFIÉES ; on conserve la mention, on ne la masque pas.
  CM: {
    simplifie: true,
    source: 'Barème simplifié (CNPS / IRPP / CAC) — à faire confirmer par votre comptable.',
    cotisations: [
      pct('CNPS', 'CNPS (part salariale)', 0.042, 750000),
    ],
    impot: {
      libelle: 'IRPP',
      // Barème MENSUEL simplifié appliqué au net imposable (brut − cotisations).
      tranches: [
        { plafond: 62000, taux: 0 },
        { plafond: 200000, taux: 0.10 },
        { plafond: 400000, taux: 0.15 },
        { plafond: Infinity, taux: 0.20 },
      ],
      // Taxe additionnelle assise sur l'impôt lui-même.
      additionnelle: { code: 'CAC', libelle: 'CAC (centimes additionnels communaux)', taux: 0.10 },
    },
    employeur: [
      pct('CNPS_EMP', 'CNPS (charges patronales)', 0.112, 750000, 'employeur'),
    ],
  },

  // ── Congo-Brazzaville ──
  CG: {
    simplifie: false,
    source: 'CLEISS, taux au 1er janvier 2023 — https://www.cleiss.fr/docs/cotisations/congo.html',
    cotisations: [
      pct('CNSS_PVID', 'CNSS — assurance pensions', 0.04, 1200000),
      pct('CAMU_RAMU', 'CAMU — soins de santé (RAMU)', 0.0227, 600000),
    ],
    // ⚠️ Volontairement absent : voir l'en-tête de fichier.
    impot: null,
    employeur: [
      pct('CNSS_PENS_EMP', 'CNSS — assurance pensions (employeur)', 0.08, 1200000, 'employeur'),
      pct('CNSS_PF_EMP', 'CNSS — prestations familiales', 0.1003, 600000, 'employeur'),
      pct('CNSS_AT_EMP', 'CNSS — accidents du travail', 0.0225, 600000, 'employeur'),
      pct('CAMU_EMP', 'CAMU — soins de santé (employeur)', 0.0455, 600000, 'employeur'),
      pct('FNC_EMP', 'Fonds national de construction', 0.02, 1200000, 'employeur'),
      pct('ACPE_EMP', 'ACPE / FONEA', 0.005, 1200000, 'employeur'),
    ],
  },
}

/** Barème d'un pays, ou `null` si aucun n'est sourcé pour ce pays. */
export function baremePaie(pays) {
  return BAREMES_PAIE[String(pays || '').toUpperCase()] || null
}

/** Le pays a-t-il un barème ? Sert à AFFICHER l'absence plutôt qu'à la masquer. */
export function paysCouvert(pays) {
  return !!baremePaie(pays)
}

function impotProgressif(assiette, tranches) {
  let impot = 0
  let bas = 0
  for (const tr of tranches) {
    if (assiette <= bas) break
    impot += (Math.min(assiette, tr.plafond) - bas) * tr.taux
    bas = tr.plafond
  }
  return Math.round(impot)
}

/**
 * Décompte d'un bulletin de salaire.
 *
 * `tauxImpotEcole` : taux saisi par l'école, utilisé UNIQUEMENT quand le pays
 * n'a pas de barème d'impôt sourcé. Sans lui, le seul choix honnête serait de
 * ne rien retenir — mais alors le net affiché serait supérieur au net réel, ce
 * qui trompe le salarié dans l'autre sens.
 *
 * Renvoie toujours `paysCouvert` et `impotNonParametre` : l'appelant DOIT
 * pouvoir dire à l'utilisateur ce qui n'a pas été calculé.
 */
export function calculPaie({ brut = 0, pays = '', tauxImpotEcole = null } = {}) {
  const bareme = baremePaie(pays)
  if (!bareme) {
    // Aucun barème : on n'invente rien. Le brut est le seul chiffre sûr.
    return {
      paysCouvert: false, simplifie: false, source: '',
      brut, lignes: [], totalCotisations: 0,
      netImposable: brut, impot: 0, impotLibelle: '', impotNonParametre: true,
      additionnelle: null, totalRetenues: 0, net: brut, employeur: [], totalEmployeur: 0,
    }
  }

  const lignes = bareme.cotisations.map((c) => {
    const assiette = c.plafond ? Math.min(brut, c.plafond) : brut
    return { ...c, assiette, plafonne: !!c.plafond && brut > c.plafond, montant: Math.round(assiette * c.taux) }
  })
  const totalCotisations = lignes.reduce((s, l) => s + l.montant, 0)
  const netImposable = brut - totalCotisations

  let impot = 0
  let impotLibelle = ''
  let additionnelle = null
  let impotNonParametre = false

  if (bareme.impot) {
    impotLibelle = bareme.impot.libelle
    impot = impotProgressif(netImposable, bareme.impot.tranches)
    if (bareme.impot.additionnelle) {
      const a = bareme.impot.additionnelle
      additionnelle = { ...a, assiette: impot, montant: Math.round(impot * a.taux) }
    }
  } else if (Number(tauxImpotEcole) > 0) {
    // Taux saisi par l'école, faute de barème sourcé pour son pays.
    impotLibelle = 'Impôt sur les salaires'
    impot = Math.round(netImposable * Number(tauxImpotEcole))
  } else {
    impotLibelle = 'Impôt sur les salaires'
    impotNonParametre = true
  }

  const totalRetenues = totalCotisations + impot + (additionnelle?.montant || 0)

  const employeur = (bareme.employeur || []).map((c) => {
    const assiette = c.plafond ? Math.min(brut, c.plafond) : brut
    return { ...c, assiette, montant: Math.round(assiette * c.taux) }
  })

  return {
    paysCouvert: true,
    simplifie: !!bareme.simplifie,
    source: bareme.source,
    brut,
    lignes,
    totalCotisations,
    netImposable,
    impot,
    impotLibelle,
    impotNonParametre,
    additionnelle,
    totalRetenues,
    net: brut - totalRetenues,
    employeur,
    totalEmployeur: employeur.reduce((s, l) => s + l.montant, 0),
  }
}

/** Taux formaté à la française : 0.0227 → « 2,27 % ». */
export function fmtTaux(taux) {
  const n = Number(taux) * 100
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '')
  return s.replace('.', ',') + ' %'
}
