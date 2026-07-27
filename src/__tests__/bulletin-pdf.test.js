/**
 * Smoke test — génération du PDF de bulletin (format école) à partir des fixtures
 * démo. Vérifie que le mapping bulletin→PDF ne casse pas et produit un vrai PDF
 * (avec ou sans QR « diplôme vérifiable »).
 */
import { describe, it, expect } from 'vitest'
import { generateBulletinPDF } from '../utils/pdfBulletin'
import { demoBulletin } from '../data/demoEcoleLiee'

function build(b, withQr) {
  return generateBulletinPDF({
    school: { schoolName: b.ecole, quartier: b.quartier, city: b.ville, phone: b.tel, email: b.email, academicYear: b.anneeScolaire },
    child: { lastName: 'Nkeng', firstName: 'Awa', matricule: 'EDU140042', className: b.className },
    periodLabel: b.periode,
    grades: b.matieres.map((m) => ({ subject: m.nom, coef: m.coef, seqNotes: m.seqNotes || {}, avg: m.moyenne, classAvg: m.moyenneClasse, appreciation: m.appreciation })),
    sequences: b.sequences,
    generalAvg: b.moyenneGenerale, generalAppreciation: b.appreciationGenerale,
    rank: `${b.rang} / ${b.effectif}`, mention: b.mention, effectif: b.effectif,
    directeurName: b.directeur, profPrincipalName: b.profPrincipal, directeurDate: b.dateValidation,
    verifQrDataUrl: withQr ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMEAYEEQ2p8AAAAAElFTkSuQmCC' : null,
    verifCode: b.verifCode, verifUrlText: 'mapo.app-edufrem.com/verifier',
  })
}

describe('pdfBulletin — bulletin école', () => {
  it('génère un PDF pour la Séquence 1', () => {
    const doc = build(demoBulletin('seq1'), false)
    const out = doc.output('arraybuffer')
    expect(out.byteLength).toBeGreaterThan(1000)
  })

  it('génère un PDF de trimestre (2 séquences) avec QR', () => {
    const doc = build(demoBulletin('trim1'), true)
    const out = doc.output('arraybuffer')
    expect(out.byteLength).toBeGreaterThan(1000)
  })
})
