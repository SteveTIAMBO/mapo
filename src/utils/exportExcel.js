import * as XLSX from 'xlsx'

/**
 * Export data to Excel file
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<{key, label, width?}>} columns - Column definitions
 * @param {string} filename - File name without extension
 * @param {string} sheetName - Sheet name (default 'Données')
 */
export function exportToExcel(data, columns, filename, sheetName = 'Données') {
  // Map data to use column labels as headers
  const rows = data.map(row => {
    const obj = {}
    columns.forEach(col => {
      obj[col.label] = row[col.key] ?? ''
    })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)
}
