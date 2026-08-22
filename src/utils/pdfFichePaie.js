import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { salaireInfo } from './supComptaHelpers'
import { calculPaie, fmtTaux } from './paie'
import { fmtMontant } from './monnaie'
import { useSchoolStore } from '../stores/school'

/**
 * Génère une FICHE DE PAIE (bulletin de salaire) PDF pour un intervenant et un mois.
 * Salaire de base dérivé de supComptaHelpers.salaireInfo (cohérent avec l'onglet
 * Salaires de la Comptabilité).
 *
 * ⚠️ Les retenues NE SONT PLUS ÉCRITES EN DUR. Elles venaient du barème
 * camerounais (CNPS 4,2 %, plafond 750 000, IRPP, CAC) et s'appliquaient à
 * toutes les écoles, quel que soit leur pays : une école congolaise recevait un
 * bulletin faux. Le barème vient maintenant de `utils/paie.js`, en fonction du
 * pays déclaré par l'école, et le document dit ce qui n'a pas pu être calculé.
 *
 * Le PDF s'ouvre dans le navigateur (aperçu) avant tout téléchargement.
 * Décompte 100 % déterministe (aucun aléa).
 */

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// Primes maison (indépendantes du pays : ce sont des usages de l'établissement,
// pas des obligations légales).
const INDEMNITE_TRANSPORT = 25000  // indemnité de transport mensuelle (permanents)
const PRIME_TECHNICITE_TAUX = 0.08 // prime de technicité = 8 % du salaire de base (permanents)

/** Pays de l'école. Le store peut être indisponible (tests, appel hors app). */
function paysEcole(override) {
  if (override) return override
  try { return useSchoolStore().schoolSettings?.country || '' } catch (e) { return '' }
}

/** Taux d'impôt saisi par l'école, quand son pays n'a pas de barème sourcé. */
function tauxImpotEcole() {
  try { return Number(useSchoolStore().schoolSettings?.tauxImpotSalaire) || null } catch (e) { return null }
}

/** Montant dans la devise de l'école — « FCFA » était écrit en dur. */
function fcfa(n) {
  let devise = 'XAF'
  try { devise = useSchoolStore().schoolSettings?.currency || 'XAF' } catch (e) { /* hors app */ }
  return fmtMontant(Math.round(n) || 0, devise)
}

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
 *   lignes (cotisations du pays), totalCotisations, netImposable, impot,
 *   impotNonParametre, additionnelle, totalRetenues, net, employeur, totalEmployeur
 *   (+ tous les champs de salaireInfo : statut, tauxHoraire, volume, mensuel, annuel).
 */
export function fichePaieDetail(intervenant, pays = '') {
  const info = salaireInfo(intervenant)
  const estVacataire = info.statut === 'vacataire'

  // Salaire de base = rémunération mensuelle issue de supComptaHelpers (inchangée).
  const base = info.mensuel

  // Primes — permanents uniquement (les vacataires sont réglés en honoraires).
  const indemniteTransport = estVacataire ? 0 : INDEMNITE_TRANSPORT
  const primeTechnicite = estVacataire ? 0 : Math.round(base * PRIME_TECHNICITE_TAUX)
  const totalPrimes = indemniteTransport + primeTechnicite
  const brut = base + totalPrimes

  // Retenues : barème DU PAYS DE L'ÉCOLE, jamais celui du Cameroun par défaut.
  const paie = calculPaie({ brut, pays: paysEcole(pays), tauxImpotEcole: tauxImpotEcole() })

  return {
    ...info, // statut, tauxHoraire, volume, mensuel, annuel
    base,
    primes: { indemniteTransport, primeTechnicite },
    indemniteTransport,
    primeTechnicite,
    totalPrimes,
    brut,
    brutAnnuel: brut * 12,
    ...paie,
    net: paie.net,
    // Champs conservés pour les écrans qui les lisaient déjà.
    cnpsSalarie: paie.totalCotisations,
    cnps: paie.totalCotisations,
    cnpsEmployeur: paie.totalEmployeur,
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
  // Lignes issues du barème du pays. Rien n'est écrit en dur : une école dont le
  // pays n'a pas de barème voit un tableau vide plutôt qu'un décompte inventé.
  const retenues = d.lignes.map((l) => [
    l.libelle,
    `${fcfa(l.assiette)}${l.plafonne ? ' (plafonné)' : ''}`,
    fmtTaux(l.taux),
    `- ${fcfa(l.montant)}`,
  ])
  if (d.impotNonParametre) {
    retenues.push([d.impotLibelle, fcfa(d.netImposable), 'non paramétré', '—'])
  } else if (d.impot) {
    retenues.push([d.impotLibelle, fcfa(d.netImposable), 'progressif', `- ${fcfa(d.impot)}`])
  }
  if (d.additionnelle) {
    retenues.push([d.additionnelle.libelle, fcfa(d.additionnelle.assiette), fmtTaux(d.additionnelle.taux), `- ${fcfa(d.additionnelle.montant)}`])
  }
  if (!d.paysCouvert) {
    retenues.push(['Aucun barème pour ce pays', '', '', '—'])
  }

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
  const detailPatronal = d.employeur.map((l) => `${l.libelle} ${fmtTaux(l.taux)}`).join(' · ')
  const infoLines = doc.splitTextToSize(
    d.employeur.length
      ? `Charges patronales : ${fcfa(d.totalEmployeur)} — à titre indicatif, non déduites du net à payer. ${detailPatronal}.`
      : 'Charges patronales : non paramétrées pour ce pays.',
    RIGHT - M,
  )
  doc.text(infoLines, M, yy)
  yy += infoLines.length * 12 + 8

  // ── Mentions ──
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(140, 140, 140)
  // ⚠️ La mention DIT ce qui n'a pas été calculé. Un bulletin muet sur un impôt
  // manquant affiche un net supérieur au net réel, sans que personne ne le sache.
  const mentions = [`Document généré le ${new Date().toLocaleDateString('fr-FR')} · ${ecole.nom || ''}.`]
  if (!d.paysCouvert) {
    mentions.push("Aucun barème social n'est paramétré pour le pays de l'établissement : seul le brut est certain.")
  } else {
    if (d.simplifie) mentions.push('Barème simplifié, à titre indicatif.')
    if (d.impotNonParametre) mentions.push("L'impôt sur les salaires n'est pas paramétré : il n'est PAS déduit du net ci-dessus.")
    if (d.source) mentions.push(`Source des taux : ${d.source}`)
  }
  const mentionLines = doc.splitTextToSize(mentions.join(' '), RIGHT - M)
  doc.text(mentionLines, M, yy)

  previewPdf(doc, fichePaieFilename(intervenant, year, monthIndex))
}
