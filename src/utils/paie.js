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
 * Les cotisations sociales congolaises et sénégalaises viennent du CLEISS
 * (Centre des liaisons européennes et internationales de sécurité sociale,
 * organisme public français) :
 *   Congo   — taux au 1er janvier 2023, https://www.cleiss.fr/docs/cotisations/congo.html
 *   Sénégal — taux au 1er janvier 2026, https://www.cleiss.fr/docs/cotisations/senegal.html
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
const pct = (code, libelle, taux, plafond = null, part = 'salarie', base = 1, plancher = 0) =>
  ({ code, libelle, taux, plafond, part, base, plancher })

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

  // ── Sénégal ──
  // Cotisations : CLEISS, taux au 1er janvier 2026.
  // https://www.cleiss.fr/docs/cotisations/senegal.html
  //
  // ⚠️ La cotisation MALADIE (IPM) n'est pas codée : le CLEISS donne une
  // FOURCHETTE de 2 % à 7,5 % côté salarié, parce que le taux dépend de
  // l'Institution de Prévoyance Maladie dont relève l'entreprise. Une fourchette
  // n'est pas un taux : en retenir un au hasard donnerait un net faux avec
  // l'apparence de l'exactitude. L'école l'ajoutera si elle connaît le sien.
  //
  // La retraite complémentaire des CADRES (2,4 % sur la tranche 432 000 →
  // 1 296 000) n'est pas codée non plus : elle ne concerne pas tout le personnel,
  // et l'appliquer à un surveillant serait faux.
  SN: {
    simplifie: true,
    source: "Cotisations : CLEISS, 1er janvier 2026. Impôt : barème du CGI pour UNE part, sans réduction pour charge de famille et sans TRIMF. Cotisation maladie IPM non incluse (elle varie de 2 % à 7,5 % selon l'institution).",
    cotisations: [
      pct('IPRES', 'IPRES — retraite', 0.056, 432000),
    ],
    impot: {
      libelle: 'IR (impôt sur le revenu)',
      // Barème ANNUEL par part. Appliqué tel quel à un salaire mensuel, il
      // placerait tout le monde dans la tranche à 0 %.
      annuel: true,
      // Abattement de 30 % pour frais professionnels, plafonné à 900 000 FCFA
      // par an (art. 168 b du CGI 2012).
      abattement: { taux: 0.30, plafondAnnuel: 900000 },
      tranches: [
        { plafond: 630000, taux: 0 },
        { plafond: 1500000, taux: 0.20 },
        { plafond: 4000000, taux: 0.30 },
        { plafond: 8000000, taux: 0.35 },
        { plafond: 13500000, taux: 0.37 },
        { plafond: Infinity, taux: 0.40 },
      ],
    },
    employeur: [
      pct('PF_EMP', 'Prestations familiales', 0.07, 63000, 'employeur'),
      pct('IPRES_EMP', 'IPRES — retraite (employeur)', 0.084, 432000, 'employeur'),
      // Accidents du travail : 1 %, 3 % ou 5 % « selon les risques encourus ».
      // Trois valeurs possibles, donc aucune à retenir sans connaître l'école.
    ],
  },

  // ── France ──
  // Plafond mensuel de la sécurité sociale 2026 : 4 005 € (arrêté du 22 décembre
  // 2025, JORF du 23 décembre 2025).
  //
  // ⚠️ L'impôt n'est PAS un barème ici, et ce n'est pas un manque : depuis le
  // prélèvement à la source, l'employeur applique un TAUX PROPRE À CHAQUE
  // SALARIÉ, transmis par l'administration fiscale. Aucun barème ne peut le
  // remplacer. L'école saisit le taux, ou le bulletin dit qu'il n'est pas déduit.
  //
  // Les charges patronales françaises ne sont pas codées : leurs taux dépendent
  // du niveau de salaire, de l'effectif et du secteur (réductions générales,
  // taux AT propre à l'établissement). Une liste « moyenne » serait fausse pour
  // tout le monde.
  FR: {
    simplifie: true,
    source: "Taux salariaux courants (URSSAF, AGIRC-ARRCO). Plafond mensuel 2026 : 4 005 € (arrêté du 22 décembre 2025). L'impôt suit le prélèvement à la source, propre à chaque salarié.",
    cotisations: [
      pct('VIEIL_PLAF', 'Assurance vieillesse plafonnée', 0.069, 4005),
      pct('VIEIL_DEPLAF', 'Assurance vieillesse déplafonnée', 0.004),
      pct('RETR_T1', 'Retraite complémentaire (tranche 1)', 0.0315, 4005),
      pct('CEG_T1', "Contribution d'équilibre général (tranche 1)", 0.0086, 4005),
      // Tranche 2 : de 1 à 8 plafonds. Sans plancher, elle porterait sur le
      // salaire entier et surestimerait fortement la retenue d'un cadre.
      pct('RETR_T2', 'Retraite complémentaire (tranche 2)', 0.0864, 32040, 'salarie', 1, 4005),
      pct('CEG_T2', "Contribution d'équilibre général (tranche 2)", 0.0108, 32040, 'salarie', 1, 4005),
      // CSG et CRDS : assises sur 98,25 % du brut, pas sur 100 %.
      pct('CSG_CRDS', 'CSG et CRDS', 0.097, null, 'salarie', 0.9825),
    ],
    impot: null,
    employeur: [],
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

/**
 * Assiette d'une cotisation.
 *
 * Trois réglages, chacun nécessaire à un pays :
 *   - `base`     : part du brut soumise (CSG française : 98,25 %) ;
 *   - `plafond`  : au-delà, on ne cotise plus (CNPS, IPRES, tranche 1 française) ;
 *   - `plancher` : en deçà, on ne cotise pas — c'est ce qui permet une TRANCHE.
 *     Sans lui, la tranche 2 de la retraite française porterait sur le salaire
 *     entier, et un directeur payé au-dessus du plafond verrait une retenue
 *     largement surestimée.
 */
function assietteCotisation(brut, c) {
  const soumis = brut * (c.base ?? 1)
  const haut = c.plafond ? Math.min(soumis, c.plafond) : soumis
  return Math.max(0, haut - (c.plancher || 0))
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
 * Impôt dû sur un net imposable MENSUEL, selon le barème d'un pays.
 *
 * Deux cas que le Sénégal impose de gérer :
 *   - son barème est ANNUEL, pas mensuel — l'appliquer tel quel à un salaire
 *     mensuel placerait tout le monde dans la tranche à 0 % ;
 *   - un abattement de 30 % pour frais professionnels s'applique avant le
 *     barème, PLAFONNÉ à 900 000 FCFA par an (art. 168 b du CGI 2012). Sans le
 *     plafond, les hauts salaires seraient sous-imposés.
 */
function impotBareme(netImposableMensuel, impot) {
  const annuel = !!impot.annuel
  let assiette = annuel ? netImposableMensuel * 12 : netImposableMensuel

  if (impot.abattement) {
    const a = impot.abattement
    const brut = assiette * a.taux
    const plafond = annuel ? a.plafondAnnuel : a.plafondAnnuel / 12
    assiette -= Math.min(brut, plafond ?? Infinity)
  }

  const du = impotProgressif(Math.max(0, assiette), impot.tranches)
  return Math.round(annuel ? du / 12 : du)
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
    // `base` : part du brut réellement soumise. La CSG française porte sur
    // 98,25 % du salaire brut, pas sur 100 % — l'ignorer surestimerait la
    // retenue de près de 2 %.
    const assiette = assietteCotisation(brut, c)
    return { ...c, assiette, plafonne: !!c.plafond && brut * (c.base ?? 1) > c.plafond, montant: Math.round(assiette * c.taux) }
  })
  const totalCotisations = lignes.reduce((s, l) => s + l.montant, 0)
  const netImposable = brut - totalCotisations

  let impot = 0
  let impotLibelle = ''
  let additionnelle = null
  let impotNonParametre = false

  if (bareme.impot) {
    impotLibelle = bareme.impot.libelle
    impot = impotBareme(netImposable, bareme.impot)
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
    const assiette = assietteCotisation(brut, c)
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
