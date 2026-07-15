import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { makeSignatureDataUrl } from './signatureImage'

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

/**
 * Exporte un RELEVÉ DE NOTES semestriel (Supérieur / LMD) avec la signature du
 * directeur en pied de page. Aperçu navigateur avant tout téléchargement.
 * @param {Object} p
 * @param {string} p.etudiant - nom complet de l'étudiant
 * @param {string} p.promotion - libellé programme/année
 * @param {string} p.semestre
 * @param {number} p.moyenne
 * @param {string} p.mention
 * @param {string} p.decision - « Admis » / « Ajourné »
 * @param {Array<{ueCode, ueIntitule, ects, note, validation}>} p.lignes - note null = « — »
 * @param {{signed:boolean, signedBy?:string, signedAt?:string}} p.signature
 * @param {string} p.filename - sans extension
 * @param {string} p.title
 */
export function exportRelevePdf(p) {
  const {
    etudiant = '', promotion = '', semestre = '',
    moyenne = 0, mention = '', decision = '',
    lignes = [], signature = { signed: false },
    filename = 'releve', title = 'Relevé de notes semestriel',
  } = p || {}

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 40

  // ── Titre ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(20, 30, 60)
  doc.text(String(title), margin, 46)

  // ── Métadonnées (étudiant · promotion · semestre) ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  const meta = [etudiant, promotion, semestre ? `Semestre ${semestre}` : '']
    .filter(Boolean).join('   ·   ')
  doc.text(meta, margin, 64)

  // ── Tableau des UE ──
  autoTable(doc, {
    startY: 80,
    head: [['UE', 'Crédits', 'Note /20', 'Validation']],
    body: lignes.map((l) => [
      [l.ueCode, l.ueIntitule].filter(Boolean).join(' — '),
      l.ects === null || l.ects === undefined ? '' : String(l.ects),
      l.note === null || l.note === undefined ? '—' : Number(l.note).toFixed(2),
      l.validation || '',
    ]),
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 88, 176], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 251] },
    columnStyles: {
      1: { halign: 'right', cellWidth: 62 },
      2: { halign: 'right', cellWidth: 72 },
      3: { cellWidth: 96 },
    },
    margin: { left: margin, right: margin },
  })

  // ── Synthèse (Moyenne · Mention · Décision) ──
  let y = (doc.lastAutoTable?.finalY || 80) + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  const summary = [
    `Moyenne : ${Number(moyenne || 0).toFixed(2)}/20`,
    mention ? `Mention : ${mention}` : '',
    decision ? `Décision : ${decision}` : '',
  ].filter(Boolean).join('        ')
  doc.text(summary, margin, y)

  // ── Signature du Directeur (bas-droite) ──
  const sigW = 70
  const sigH = 26
  const sigX = pageW - margin - 150
  let sy = Math.max(y + 44, pageH - 132)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Le Directeur', sigX, sy)
  sy += 10

  if (signature && signature.signed) {
    try {
      const img = makeSignatureDataUrl(signature.signedBy)
      if (img) doc.addImage(img, 'PNG', sigX, sy, sigW, sigH)
    } catch (e) { /* silent */ }
    sy += sigH + 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(String(signature.signedBy || 'Le Directeur'), sigX, sy)
    if (signature.signedAt) {
      const d = new Date(signature.signedAt)
      const ds = isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
      if (ds) {
        sy += 12
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(110, 110, 110)
        doc.text(`Signé le ${ds}`, sigX, sy)
      }
    }
  } else {
    // Ligne de signature vierge.
    sy += 34
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.6)
    doc.line(sigX, sy, sigX + 150, sy)
  }

  // ── Pied de page ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Généré par MAPO — ${new Date().toLocaleDateString('fr-FR')}`,
    pageW / 2, pageH - 16, { align: 'center' }
  )

  previewPdf(doc, filename)
}
