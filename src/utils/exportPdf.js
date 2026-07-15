import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Ouvre le PDF dans un nouvel onglet (aperçu) plutôt que de le télécharger
// directement. L'utilisateur voit le document et peut le télécharger depuis la
// visionneuse du navigateur. Repli sur le téléchargement si le popup est bloqué.
function previewPdf(doc, filename) {
  const dateStr = new Date().toISOString().split('T')[0]
  const name = `${filename}_${dateStr}.pdf`
  try {
    const url = doc.output('bloburl')
    const win = window.open(url, '_blank')
    if (win) { try { win.document.title = name } catch (e) { /* cross-origin */ } return }
  } catch (e) { /* silent */ }
  doc.save(name)
}

/**
 * Exporte une liste de données en PDF (tableau). Même signature qu'exportToExcel.
 * Ouvre le fichier dans le navigateur (aperçu) avant tout téléchargement.
 * @param {Array<Object>} data
 * @param {Array<{key, label, width?}>} columns
 * @param {string} filename - sans extension
 * @param {Object} [opts] - { title?, orientation? }
 */
export function exportToPdf(data, columns, filename, opts = {}) {
  const orientation = opts.orientation || (columns.length > 6 ? 'landscape' : 'portrait')
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const title = opts.title || filename

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 30, 60)
  doc.text(String(title), 40, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`${data.length} ligne(s) · ${new Date().toLocaleDateString('fr-FR')}`, 40, 58)

  autoTable(doc, {
    startY: 72,
    head: [columns.map((c) => c.label)],
    body: data.map((row) => columns.map((c) => {
      const v = row[c.key]
      return v === null || v === undefined ? '' : String(v)
    })),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 88, 176], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 251] },
    margin: { left: 40, right: 40 },
  })

  previewPdf(doc, filename)
}

const TYPE_FILL = {
  fondamentale: [230, 241, 251],
  methodologique: [225, 245, 238],
  professionnelle: [250, 238, 218],
  electif: [238, 237, 254],
}

/**
 * Exporte un emploi du temps au FORMAT GRILLE (jours en colonnes, créneaux en
 * lignes), comme à l'écran — pas une liste de séances. Aperçu navigateur.
 * @param {Object} p
 * @param {string[]} p.jours
 * @param {Array<{debut, fin}>} p.creneaux
 * @param {(jour:string, debut:string)=>Object|null} p.sessionAt - séance de la case
 * @param {string} p.title
 * @param {string} p.filename - sans extension
 */
export function exportTimetablePdf(p) {
  const { jours, creneaux, sessionAt, title, filename } = p
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 30, 60)
  doc.text(String(title || 'Emploi du temps'), 40, 40)

  const head = [['Horaire', ...jours]]
  const body = creneaux.map((cr) => {
    const row = [{ content: `${cr.debut}\n${cr.fin}`, styles: { fontStyle: 'bold', fillColor: [244, 246, 250] } }]
    for (const j of jours) {
      const s = sessionAt(j, cr.debut)
      if (!s) { row.push({ content: '' }); continue }
      const meta = [s.intervenantNom, s.salle].filter(Boolean).join(' · ')
      const txt = [s.ueCode, s.ueIntitule, meta].filter(Boolean).join('\n')
      row.push({ content: txt, styles: { fillColor: TYPE_FILL[s.type] || [245, 247, 251] } })
    }
    return row
  })

  autoTable(doc, {
    startY: 56,
    head,
    body,
    styles: { fontSize: 7.5, cellPadding: 5, overflow: 'linebreak', valign: 'top', minCellHeight: 46, lineColor: [225, 225, 225], lineWidth: 0.5 },
    headStyles: { fillColor: [21, 88, 176], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 56, halign: 'center', valign: 'middle' } },
    margin: { left: 30, right: 30 },
    tableWidth: 'auto',
  })

  previewPdf(doc, filename)
}
