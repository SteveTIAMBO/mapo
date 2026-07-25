// Extraction de texte d'un PDF côté client (pdf.js chargé depuis un CDN, pas de
// dépendance de build). Utilisé par « Mes cours » et la génération de fiches.
// Si le chargement échoue (hors-ligne / CSP), l'appelant retombe sur le
// copier-coller.

let _pdfjs = null
function loadPdfjs() {
  if (_pdfjs) return Promise.resolve(_pdfjs)
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174'
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = base + '/pdf.min.js'
    s.onload = () => {
      const lib = window.pdfjsLib
      if (!lib) return reject(new Error('pdfjs'))
      lib.GlobalWorkerOptions.workerSrc = base + '/pdf.worker.min.js'
      _pdfjs = lib
      resolve(lib)
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export async function extractPdfText(file, cap = 15000) {
  const pdfjs = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = Math.min(pdf.numPages, 40)
  let out = ''
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    out += tc.items.map((it) => it.str).join(' ') + '\n'
    if (out.length > cap) break
  }
  return out
}

// Lit un fichier .txt ou .pdf → texte (vide si type non géré / erreur).
export async function fileToText(file, cap = 15000) {
  if (!file) return ''
  if (/\.txt$/i.test(file.name) || file.type === 'text/plain') {
    return (await file.text()).slice(0, cap)
  }
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    return (await extractPdfText(file, cap)).trim()
  }
  return ''
}
