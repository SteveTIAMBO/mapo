import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { salaireInfo } from './supComptaHelpers'

/**
 * Génère une FICHE DE PAIE (bulletin de salaire) PDF pour un intervenant et un mois.
 * Salaire de base dérivé de supComptaHelpers.salaireInfo (cohérent avec l'onglet
 * Salaires de la Comptabilité). Le bulletin détaille ensuite un décompte réaliste
 * (Cameroun, valeurs SIMPLIFIÉES pour la démo) :
 *   Gains    : salaire de base + primes (transport, technicité) → salaire brut
 *   Retenues : CNPS part salariale (4,2 %) + IRPP (barème progressif) + CAC (10 % IRPP)
 *   Net à payer = brut − retenues
 *   Charge patronale CNPS (~11,2 %) affichée à titre indicatif (non déduite).
 * Le PDF s'ouvre dans le navigateur (aperçu) avant tout téléchargement.
 * Montants en FCFA. Décompte 100 % déterministe (aucun aléa).
 */

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ── Barème social & fiscal (Cameroun) — valeurs SIMPLIFIÉES pour la démo ──
const CNPS_TAUX_SALARIE = 0.042    // PVID part salariale (pension vieillesse)
const CNPS_TAUX_EMPLOYEUR = 0.112  // charges patronales (PVID + prestations familiales + risques pro), indicatif
const CNPS_PLAFOND = 750000        // plafond mensuel cotisable (FCFA)
const CAC_TAUX = 0.10              // Centimes Additionnels Communaux = 10 % de l'IRPP
const INDEMNITE_TRANSPORT = 25000  // indemnité de transport mensuelle (permanents)
const PRIME_TECHNICITE_TAUX = 0.08 // prime de technicité = 8 % du salaire de base (permanents)

// Barème IRPP MENSUEL SIMPLIFIÉ, appliqué au net imposable (progressif par tranches).
const IRPP_BAREME = [
  { plafond: 62000, taux: 0 },     // tranche exonérée (~SMIG)
  { plafond: 200000, taux: 0.10 },
  { plafond: 400000, taux: 0.15 },
  { plafond: Infinity, taux: 0.20 },
]

function calcIrppMensuel(netImposable) {
  let irpp = 0
  let bas = 0
  for (const tr of IRPP_BAREME) {
    if (netImposable <= bas) break
    const assiette = Math.min(netImposable, tr.plafond) - bas
    irpp += assiette * tr.taux
    bas = tr.plafond
  }
  return Math.round(irpp)
}

const fcfa = (n) => `${(Math.round(n) || 0).toLocaleString('fr-FR')} FCFA`

export function moisLabel(monthIndex) { return MOIS_FR[monthIndex] || '' }

export function fichePaieFilename(intervenant, year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const nom = (intervenant?.nomComplet || 'intervenant').replace(/[^\w-]+/g, '_')
  return `fiche_paie_${nom}_${year}-${m}`
}

/**
 * Décompte chiffré complet d'une fiche de paie (réutilisable à l'écran comme au PDF).
 * Déterministe : les montants ne dépendent que du salaire de base (salaireInfo) et
 * des barèmes ci-dessus. Aucun aléa.
 *
 * Champs renvoyés :
 *   base, primes{indemniteTransport, primeTechnicite}, totalPrimes, brut, brutAnnuel,
 *   assietteCnps, cnpsSalarie (alias cnps), netImposable, irpp, cac, totalRetenues,
 *   net, cnpsEmployeur (+ tous les champs de salaireInfo : statut, tauxHoraire, volume,
 *   mensuel, annuel).
 */
export function fichePaieDetail(intervenant) {
  const info = salaireInfo(intervenant)
  const estVacataire = info.statut === 'vacataire'

  // Salaire de base = rémunération mensuelle issue de supComptaHelpers (inchangée).
  const base = info.mensuel

  // Primes — permanents uniquement (les vacataires sont réglés en honoraires).
  const indemniteTransport = estVacataire ? 0 : INDEMNITE_TRANSPORT
  const primeTechnicite = estVacataire ? 0 : Math.round(base * PRIME_TECHNICITE_TAUX)
  const totalPrimes = indemniteTransport + primeTechnicite
  const brut = base + totalPrimes

  // Retenues salariales.
  const assietteCnps = Math.min(brut, CNPS_PLAFOND)
  const cnpsSalarie = Math.round(assietteCnps * CNPS_TAUX_SALARIE)
  const netImposable = brut - cnpsSalarie
  const irpp = calcIrppMensuel(netImposable)
  const cac = Math.round(irpp * CAC_TAUX)
  const totalRetenues = cnpsSalarie + irpp + cac
  const net = brut - totalRetenues

  // Charge patronale (information — NON déduite du net à payer).
  const cnpsEmployeur = Math.round(assietteCnps * CNPS_TAUX_EMPLOYEUR)

  return {
    ...info, // statut, tauxHoraire, volume, mensuel, annuel
    base,
    primes: { indemniteTransport, primeTechnicite },
    indemniteTransport,
    primeTechnicite,
    totalPrimes,
    brut,
    brutAnnuel: brut * 12,
    assietteCnps,
    cnpsSalarie,
    cnps: cnpsSalarie, // rétro-compatibilité (ancien champ)
    netImposable,
    irpp,
    cac,
    totalRetenues,
    net,
    cnpsEmployeur,
  }
}

function previewPdf(doc, filename) {
  const name = `${filename}.pdf`
  try {
    const url = doc.output('bloburl')
    const win = window.open(url, '_blank')
    if (win) { try { win.document.title = name } catch (e) { /* cross-origin */ } return }
  } catch (e) { /* silent */ }
  doc.save(name)
}

export function generateFichePaie(intervenant, year, monthIndex, ecole = {}) {
  const d = fichePaieDetail(intervenant)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 48
  const RIGHT = 547
  let y = 54

  // ── En-tête établissement ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(20, 30, 60)
  doc.text(ecole.nom || 'Établissement', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(120, 120, 120)
  doc.text(ecole.type || 'Enseignement supérieur', M, y + 15)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 30, 60)
  doc.text('BULLETIN DE PAIE', RIGHT, y, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90)
  doc.text(`Période : ${MOIS_FR[monthIndex]} ${year}`, RIGHT, y + 16, { align: 'right' })

  y += 42
  doc.setDrawColor(225, 225, 225); doc.line(M, y, RIGHT, y); y += 22

  // ── Bloc salarié ──
  const statutTxt = d.statut === 'vacataire' ? 'Vacataire' : 'Permanent'
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(30, 30, 40)
  doc.text('Salarié', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 70)
  doc.text(intervenant.nomComplet || '', M, y + 16)
  doc.text(`${statutTxt}${intervenant.specialite ? ' · ' + intervenant.specialite : ''}`, M, y + 31)
  doc.setTextColor(120, 120, 120); doc.setFontSize(9.5)
  if (intervenant.matricule) doc.text(`Matricule : ${intervenant.matricule}`, RIGHT, y + 16, { align: 'right' })
  doc.text(`Volume horaire : ${d.volume} h`, RIGHT, y + 31, { align: 'right' })

  // ── Tableau GAINS ──
  const gains = []
  if (d.statut === 'vacataire') {
    gains.push(['Honoraires (mensualisés)', `${d.volume} h${d.tauxHoraire ? ' · ' + fcfa(d.tauxHoraire) + '/h' : ''}`, '', fcfa(d.base)])
  } else {
    gains.push(['Salaire de base', '', '', fcfa(d.base)])
    if (d.indemniteTransport) gains.push(['Indemnité de transport', '', '', fcfa(d.indemniteTransport)])
    if (d.primeTechnicite) gains.push(['Prime de technicité', 'Salaire de base', '8 %', fcfa(d.primeTechnicite)])
  }

  autoTable(doc, {
    startY: y + 52,
    head: [['GAINS', 'Base', 'Taux', 'Montant']],
    body: gains,
    foot: [['Salaire brut', '', '', fcfa(d.brut)]],
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 6, textColor: [45, 45, 55], lineColor: [230, 230, 230] },
    headStyles: { fillColor: [21, 88, 176], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [235, 241, 250], textColor: [20, 30, 60], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: M, right: M },
  })

  // ── Tableau RETENUES ──
  const retenues = [
    ['CNPS (part salariale)', `${fcfa(d.assietteCnps)}${d.brut > d.assietteCnps ? ' (plafonné)' : ''}`, '4,2 %', `- ${fcfa(d.cnpsSalarie)}`],
    ['IRPP (barème simplifié)', fcfa(d.netImposable), 'progressif', `- ${fcfa(d.irpp)}`],
    ['CAC (centimes add. communaux)', fcfa(d.irpp), '10 %', `- ${fcfa(d.cac)}`],
  ]

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [['RETENUES', 'Base', 'Taux', 'Montant']],
    body: retenues,
    foot: [['Total des retenues', '', '', `- ${fcfa(d.totalRetenues)}`]],
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 6, textColor: [45, 45, 55], lineColor: [230, 230, 230] },
    headStyles: { fillColor: [120, 58, 58], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [246, 238, 238], textColor: [120, 40, 40], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: M, right: M },
  })

  // ── NET À PAYER (en évidence) ──
  let yy = doc.lastAutoTable.finalY + 18
  doc.setFillColor(240, 246, 252)
  doc.rect(M, yy, RIGHT - M, 38, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 30, 60)
  doc.text('NET À PAYER', M + 14, yy + 24)
  doc.setFontSize(14)
  doc.text(fcfa(d.net), RIGHT - 14, yy + 24, { align: 'right' })

  // ── Info charge patronale (non déduite du net) ──
  yy += 38 + 20
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 90)
  const infoLines = doc.splitTextToSize(
    `Charges patronales CNPS (employeur, ~11,2 %) : ${fcfa(d.cnpsEmployeur)} — à titre indicatif, non déduites du net à payer.`,
    RIGHT - M,
  )
  doc.text(infoLines, M, yy)
  yy += infoLines.length * 12 + 8

  // ── Mentions ──
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(140, 140, 140)
  doc.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR')} · ${ecole.nom || ''}. Bulletin indicatif (démonstration) — barèmes CNPS / IRPP / CAC simplifiés.`,
    M, yy,
  )

  previewPdf(doc, fichePaieFilename(intervenant, year, monthIndex))
}
