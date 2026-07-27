import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generate a PDF bulletin matching the EDUFREM model:
 * - White header with school name left, "BULLETIN DE NOTES" + period right
 * - School info (quartier, tel, email, annee)
 * - Student info (nom, matricule, classe, effectif)
 * - Table: Matiere | Coeff. | Seq.1 | Seq.2 | Moy.Trim. | Moy.Classe | Appreciation
 * - Footer row: MOYENNE GENERALE
 * - Rang + Mention
 * - Signatures: Prof Principal (center) + Directeur (right) with e-signature
 *
 * @param {Object} opts
 * @param {Object} opts.school       - { schoolName, quartier, city, phone, email, academicYear, logoUrl }
 * @param {Object} opts.child        - { lastName, firstName, matricule, className }
 * @param {string} opts.periodLabel  - e.g. "1er Trimestre"
 * @param {Array}  opts.grades       - [{ subject, coef, seqNotes: { S1: 14.5, S2: 12 }, avg, classAvg, appreciation }]
 * @param {Array}  opts.sequences    - [{ value: 'S1', shortLabel: 'Seq. 1' }]
 * @param {number|null} opts.generalAvg
 * @param {string|null} opts.generalAppreciation
 * @param {string|null} opts.rank        - e.g. "5 / 38"
 * @param {string|null} opts.mention     - e.g. "Tableau d'honneur"
 * @param {number|null} opts.effectif    - class size
 * @param {string} opts.directeurName
 * @param {string} opts.profPrincipalName
 * @param {string|null} opts.directeurDate   - validation date
 * @param {string|null} opts.profPrincipalDate
 * @param {string|null} opts.directeurSignature - director signature image (base64 or URL)
 * @returns {jsPDF}
 */
export function generateBulletinPDF(opts) {
  const {
    school = {}, child = {}, periodLabel = '',
    grades = [], sequences = [],
    generalAvg, generalAppreciation, rank, mention, effectif,
    directeurName = '', profPrincipalName = '',
    directeurDate = '', profPrincipalDate = '',
    directeurSignature = null,
    // « Diplôme vérifiable » : QR + code + URL de vérification (facultatif).
    verifQrDataUrl = null, verifCode = '', verifUrlText = '',
  } = opts

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 15

  // ── School name (top left, bold) ──
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(school.schoolName || 'Établissement', margin, y)

  // ── "BULLETIN DE NOTES" (top right) ──
  doc.setFontSize(14)
  doc.text('BULLETIN DE NOTES', pageW - margin, y, { align: 'right' })
  y += 5

  // Period right-aligned
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(periodLabel, pageW - margin, y, { align: 'right' })

  // ── School details (under school name, left side) ──
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const schoolDetails = []
  const quartierCity = [school.quartier, school.city].filter(Boolean).join(', ')
  if (quartierCity) schoolDetails.push(quartierCity)
  if (school.phone) schoolDetails.push('Tel: ' + school.phone)
  if (school.email) schoolDetails.push(school.email)
  schoolDetails.push('Année scolaire ' + (school.academicYear || '2025-2026'))

  for (const line of schoolDetails) {
    doc.text(line, margin, y)
    y += 4
  }

  y += 6

  // ── Student info ──
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)

  doc.text(`Nom : ${child.lastName || ''} ${child.firstName || ''}`, margin + 5, y)
  doc.text(`Classe : ${child.className || ''}`, pageW / 2 + 10, y)
  y += 5.5
  doc.text(`Matricule : ${child.matricule || ''}`, margin + 5, y)
  if (effectif) {
    doc.text(`Effectif : ${effectif} élèves`, pageW / 2 + 10, y)
  }
  y += 8

  // ── Grades table ──
  const headRow = ['Matière', 'Coeff.']
  for (const seq of sequences) {
    headRow.push(seq.shortLabel)
  }
  headRow.push('Moy. Trim.')
  headRow.push('Moy. Classe')
  headRow.push('Appréciation')

  const bodyRows = grades.map(row => {
    const line = [row.subject, String(row.coef)]
    for (const seq of sequences) {
      const n = row.seqNotes?.[seq.value]
      line.push(n !== null && n !== undefined ? n.toFixed(2) : '-')
    }
    line.push(row.avg !== null && row.avg !== undefined ? row.avg.toFixed(2) : '-')
    line.push(row.classAvg !== null && row.classAvg !== undefined ? row.classAvg.toFixed(2) : '-')
    line.push(row.appreciation || '-')
    return line
  })

  // Footer row: MOYENNE GENERALE
  const footCols = headRow.length
  const footRow = ['MOYENNE GÉNÉRALE']
  for (let i = 1; i < footCols - 2; i++) footRow.push('')
  footRow.push(generalAvg !== null && generalAvg !== undefined ? `${generalAvg.toFixed(2)} / 20` : '-')
  footRow.push(generalAppreciation || '-')

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [180, 180, 180],
      lineWidth: 0.25,
      font: 'helvetica',
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32 },
      1: { halign: 'center', cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const colIdx = data.column.index
        // Seq columns + Moy.Trim + Moy.Classe
        const isNumCol = colIdx >= 2 && colIdx < footCols - 1
        if (isNumCol) {
          data.cell.styles.halign = 'center'
          const val = parseFloat(data.cell.text?.[0])
          if (!isNaN(val)) {
            if (val < 10) data.cell.styles.textColor = [217, 48, 37] // red
            else if (val >= 15) data.cell.styles.textColor = [21, 88, 176] // blue for high
            else data.cell.styles.textColor = [30, 30, 30] // normal
          }
        }
        // Appreciation column
        if (colIdx === footCols - 1) {
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = 'italic'
          data.cell.styles.fontSize = 7.5
          const txt = (data.cell.text?.[0] || '').toLowerCase()
          if (txt.includes('excellent') || txt.includes('tres bien')) {
            data.cell.styles.textColor = [21, 88, 176]
          } else if (txt.includes('passable') || txt.includes('insuffisant')) {
            data.cell.styles.textColor = [217, 48, 37]
          } else {
            data.cell.styles.textColor = [27, 138, 90]
          }
        }
      }
      // Footer: MOYENNE GÉNÉRALE spans visually
      if (data.section === 'foot') {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = 'bold'
        }
        // Moy. Trim cell in footer
        const moyTrimColIdx = footCols - 2
        if (data.column.index === moyTrimColIdx) {
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = 'bold'
          const val = parseFloat(data.cell.text?.[0])
          if (!isNaN(val)) {
            if (val < 10) data.cell.styles.textColor = [217, 48, 37]
            else data.cell.styles.textColor = [21, 88, 176]
          }
        }
        // Appreciation in footer
        if (data.column.index === footCols - 1) {
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = 'italic'
          const txt = (data.cell.text?.[0] || '').toLowerCase()
          if (txt.includes('excellent') || txt.includes('tres bien')) {
            data.cell.styles.textColor = [21, 88, 176]
          } else if (txt.includes('passable') || txt.includes('insuffisant')) {
            data.cell.styles.textColor = [217, 48, 37]
          } else {
            data.cell.styles.textColor = [27, 138, 90]
          }
        }
      }
    },
  })

  y = doc.lastAutoTable.finalY + 8

  // ── Rang & Mention ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)

  if (rank) {
    doc.text(`Rang : ${rank}`, margin, y)
    y += 5.5
  }
  if (mention) {
    doc.setFont('helvetica', 'bold')
    doc.text('Mention : ', margin, y)
    const mentionW = doc.getTextWidth('Mention : ')
    doc.setFont('helvetica', 'normal')
    doc.text(mention, margin + mentionW, y)
    y += 5.5
  }

  y += 10

  // ── Signature du Directeur ──
  const sigRightX = pageW - margin - 45

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Le Directeur', sigRightX, y)
  y += 6

  // Directeur signature
  if (directeurName) {
    // If there's a signature image, add it
    if (directeurSignature) {
      try {
        const sigImgW = 35 // mm
        const sigImgH = 15 // mm
        doc.addImage(directeurSignature, 'PNG', sigRightX, y - 2, sigImgW, sigImgH)
        y += sigImgH + 2
      } catch (e) {
        // Fallback to text if image fails
        y += 2
      }
    }
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(directeurName, sigRightX + 2, y)
    if (directeurDate) {
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      doc.text(directeurDate, sigRightX + 2, y)
    }
  }

  // ── « Diplôme vérifiable » : QR + code (bas-gauche) ──
  if (verifQrDataUrl || verifCode) {
    const qrSize = 22
    const qrY = pageH - 34
    if (verifQrDataUrl) {
      try { doc.addImage(verifQrDataUrl, 'PNG', margin, qrY, qrSize, qrSize) } catch (e) { /* ignore */ }
    }
    const tx = margin + (verifQrDataUrl ? qrSize + 4 : 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(21, 88, 176)
    doc.text('Diplôme vérifiable', tx, qrY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    if (verifCode) doc.text('Code : ' + verifCode, tx, qrY + 10)
    if (verifUrlText) doc.text('Vérifiez sur ' + verifUrlText, tx, qrY + 14.5)
  }

  // ── Footer ──
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Généré par MAPO — ${new Date().toLocaleDateString('fr-FR')}`,
    pageW / 2, pageH - 10, { align: 'center' }
  )

  return doc
}

/**
 * Generate a PDF receipt for a payment.
 */
export function generateReceiptPDF(opts) {
  const {
    school = {}, child = {}, payment = {},
    methodLabel = '', directeurName = '',
    directeurSignature = null,
  } = opts

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [148, 210] }) // A5
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 12

  // ── Header ──
  doc.setFillColor(21, 88, 176)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(school.schoolName || 'Établissement', pageW / 2, 11, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const addr = [school.address, school.city].filter(Boolean).join(' - ')
  if (addr) doc.text(addr, pageW / 2, 17, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('RECU DE PAIEMENT', pageW / 2, 24, { align: 'center' })

  y = 34

  // ── Reference & date ──
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Reference : ${payment.reference || '-'}`, margin, y)
  doc.text(`Date : ${formatDatePDF(payment.date)}`, pageW - margin, y, { align: 'right' })
  y += 8

  // ── Student info ──
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = [
    [`Élève : ${child.lastName || ''} ${child.firstName || ''}`, `Classe : ${child.className || ''}`],
    [`Matricule : ${child.matricule || ''}`, ``],
  ]
  for (const [left, right] of lines) {
    doc.text(left, margin, y)
    if (right) doc.text(right, pageW - margin, y, { align: 'right' })
    y += 5
  }

  y += 4

  // ── Payment details ──
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, 'F')
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Montant paye :', margin + 6, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(27, 138, 90)
  doc.text(formatMoneyPDF(payment.amount), pageW / 2, y + 1, { align: 'center' })

  y += 11
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.text(`Mode de paiement : ${methodLabel}`, margin + 6, y)

  if (payment.tranche) {
    y += 5
    doc.text(`Tranche : ${payment.tranche}`, margin + 6, y)
  }

  y += 14

  // ── Signature ──
  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('Le Directeur', pageW - margin - 30, y)
  y += 3
  // Add signature image if available
  if (directeurSignature) {
    try {
      doc.addImage(directeurSignature, 'PNG', pageW - margin - 30, y, 28, 12)
      y += 14
    } catch (e) { y += 2 }
  } else {
    y += 2
  }
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(21, 88, 176)
  if (directeurName) doc.text(directeurName, pageW - margin - 30, y)
  y += 4
  doc.setDrawColor(21, 88, 176)
  doc.setLineWidth(0.5)
  doc.line(pageW - margin - 30, y, pageW - margin, y)

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 8
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text('Ce reçu est généré automatiquement par MAPO.', pageW / 2, footerY - 4, { align: 'center' })
  doc.text(`${school.schoolName || 'Établissement'} — ${new Date().toLocaleDateString('fr-FR')}`, pageW / 2, footerY, { align: 'center' })

  return doc
}

function formatDatePDF(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatMoneyPDF(amount) {
  const num = Math.round(amount || 0)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}
