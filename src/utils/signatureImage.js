// Génère une image de signature « manuscrite » à partir d'un nom, SANS
// dépendance : on peint le nom dans un style cursif/italique sur un <canvas>
// puis on renvoie un data:image/png. Utilisé pour la signature du directeur
// sur le relevé de notes (édition Supérieur) — même esprit que
// generateDemoSignature() de stores/school.js, mais générique (n'importe quel nom).
//
// La police cursive dépend du système (macOS = Snell Roundhand, Windows = Segoe
// Script) ; on retombe toujours sur la famille générique « cursive ».
export function makeSignatureDataUrl(name) {
  const label = (name && String(name).trim()) || 'Le Directeur'
  try {
    const W = 260
    const H = 90
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.clearRect(0, 0, W, H)

    // Nom en cursive italique, encre bleu foncé.
    ctx.fillStyle = '#1a3a6b'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    // Taille de police adaptée à la longueur du nom pour tenir dans la largeur.
    const fontStack = "'Segoe Script', 'Snell Roundhand', 'Brush Script MT', 'Comic Sans MS', cursive"
    let fontSize = 34
    ctx.font = `italic 700 ${fontSize}px ${fontStack}`
    while (fontSize > 15 && ctx.measureText(label).width > W - 26) {
      fontSize -= 2
      ctx.font = `italic 700 ${fontSize}px ${fontStack}`
    }
    ctx.fillText(label, W / 2, H / 2 - 6)

    // Trait de soulignement léger, façon paraphe.
    ctx.strokeStyle = '#1a3a6b'
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(26, H - 20)
    ctx.quadraticCurveTo(W / 2, H - 13, W - 26, H - 20)
    ctx.stroke()
    ctx.globalAlpha = 1

    return canvas.toDataURL('image/png')
  } catch (e) {
    return ''
  }
}
