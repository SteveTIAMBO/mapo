import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { salaireInfo } from './supComptaHelpers'

/**
 * Génère une FICHE DE PAIE (bulletin de salaire) PDF pour un intervenant et un mois.
 * Rémunération dérivée de supComptaHelpers.salaireInfo (cohérente avec l'onglet
 * Salaires de la Comptabilité). Cotisation CNPS part salariale (4,2 %, Cameroun).
 * Le PDF s'ouvre dans le navigateur (aperçu) avant tout téléchargement.
 * Montants en FCFA.
 */

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const CNPS_TAUX = 0.042 // part salariale (pension vieillesse) — Cameroun

const fcfa = (n) => `${(Math.round(n) || 0).toLocaleString('fr-FR')} FCFA`

export function moisLabel(monthIndex) { return MOIS_FR[monthIndex] || '' }

export function fichePaieFilename(intervenant, year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const nom = (intervenant?.nomComplet || 'intervenant').replace(/[^\w-]+/g, '_')
  return `fiche_paie_${nom}_${year}-${m}`
}

/** Détail chiffré d'une fiche de paie (réutilisable à l'écran comme au PDF). */
export function fichePaieDetail(intervenant) {
  const info = salaireInfo(intervenant)
  const brut = info.mensuel
  const cnps = Math.round(brut * CNPS_TAUX)
  const net = brut - cnps
  return { ...info, brut, cnps, net }
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
  let y = 54

  // En-tête établissement
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(20, 30, 60)
  doc.text(ecole.nom || 'Établissement', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(120, 120, 120)
  doc.text(ecole.type || 'Enseignement supérieur', M, y + 15)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 30, 60)
  doc.text('BULLETIN DE PAIE', 400, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90)
  doc.text(`Période : ${MOIS_FR[monthIndex]} ${year}`, 400, y + 16)

  y += 44
  doc.setDrawColor(225, 225, 225); doc.line(M, y, 547, y); y += 22

  // Bloc salarié
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(30, 30, 40)
  doc.text('Salarié', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 70)
  doc.text(intervenant.nomComplet || '', M, y + 16)
  const statutTxt = d.statut === 'vacataire' ? 'Vacataire' : 'Permanent'
  doc.text(`${statutTxt}${intervenant.specialite ? ' · ' + intervenant.specialite : ''}`, M, y + 31)
  if (intervenant.matricule) doc.text(`Matricule : ${intervenant.matricule}`, M, y + 46)

  // Rubriques
  const body = []
  if (d.statut === 'vacataire') {
    body.push(['Vacations', `${d.volume} h × ${fcfa(d.tauxHoraire)}/h`, '', fcfa(d.annuel)])
    body.push(['Rémunération brute (mensualisée)', '', '', fcfa(d.brut)])
  } else {
    body.push(['Salaire de base (permanent)', `Volume : ${d.volume} h`, '', fcfa(d.brut)])
    body.push(['Rémunération brute', '', '', fcfa(d.brut)])
  }
  body.push(['Cotisation CNPS (part salariale)', '', '4,2 %', `- ${fcfa(d.cnps)}`])

  autoTable(doc, {
    startY: y + 66,
    head: [['Rubrique', 'Base', 'Taux', 'Montant']],
    body,
    styles: { fontSize: 9.5, cellPadding: 6 },
    headStyles: { fillColor: [21, 88, 176], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: M, right: M },
  })

  let yy = doc.lastAutoTable.finalY + 20
  doc.setFillColor(240, 246, 252)
  doc.rect(M, yy, 547 - M, 34, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 30, 60)
  doc.text('NET À PAYER', M + 12, yy + 22)
  doc.text(fcfa(d.net), 535, yy + 22, { align: 'right' })

  yy += 60
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(140, 140, 140)
  doc.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR')} · ${ecole.nom || ''}. Bulletin indicatif (démonstration).`,
    M, yy,
  )

  previewPdf(doc, fichePaieFilename(intervenant, year, monthIndex))
}
