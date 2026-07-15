import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Exporte une liste de données en PDF (tableau), même signature que exportToExcel.
 * @param {Array<Object>} data - lignes, chaque objet indexé par la clé de colonne
 * @param {Array<{key, label, width?}>} columns - définition des colonnes
 * @param {string} filename - nom du fichier sans extension
 * @param {Object} [opts] - { title?, orientation? ('portrait'|'landscape') }
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

  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`${filename}_${dateStr}.pdf`)
}
