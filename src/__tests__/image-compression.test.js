import { describe, it, expect } from 'vitest'
import {
  dimensionsCibles, extensionPour, compresserImage, LARGEUR_MAX, POIDS_MAX,
} from '../utils/imageCompression'

/**
 * Compression des images de cours (24/08/2026).
 *
 * L'enseignant photographie son tableau : 3 à 8 Mo. Non recompressée, l'image
 * serait refusée par le serveur ET retéléchargée par chaque élève à chaque
 * ouverture, sur un réseau 3G qui coupe.
 */

describe('dimensions cibles', () => {
  it('réduit au plus long côté, en gardant les proportions', () => {
    const r = dimensionsCibles(4000, 3000, 1400)
    expect(r.largeur).toBe(1400)
    expect(r.hauteur).toBe(1050)          // 3000 × 1400/4000
  })

  it('fonctionne aussi en portrait', () => {
    const r = dimensionsCibles(3000, 4000, 1400)
    expect(r.hauteur).toBe(1400)
    expect(r.largeur).toBe(1050)
  })

  it('⚠️ n’AGRANDIT jamais une image déjà petite', () => {
    // L'agrandir la rendrait floue ET plus lourde qu'à l'origine : on
    // dégraderait en croyant optimiser.
    expect(dimensionsCibles(800, 600, 1400)).toEqual({ largeur: 800, hauteur: 600 })
    expect(dimensionsCibles(1400, 900, 1400)).toEqual({ largeur: 1400, hauteur: 900 })
  })

  it('une dimension absente ne produit pas NaN', () => {
    expect(dimensionsCibles(0, 500)).toEqual({ largeur: 0, hauteur: 0 })
    expect(dimensionsCibles(null, undefined)).toEqual({ largeur: 0, hauteur: 0 })
  })

  it('jamais zéro pixel sur une image très allongée', () => {
    // Une bannière 5000×3 : la hauteur arrondirait à 0 et le canvas échouerait.
    const r = dimensionsCibles(5000, 3, 1400)
    expect(r.hauteur).toBeGreaterThanOrEqual(1)
  })
})

describe('format de sortie', () => {
  it('nomme le fichier selon ce qui est réellement encodé', () => {
    expect(extensionPour('image/webp')).toBe('webp')
    expect(extensionPour('image/png')).toBe('png')
    expect(extensionPour('image/jpeg')).toBe('jpg')
    expect(extensionPour('inconnu')).toBe('jpg')   // repli, pas d'extension vide
  })
})

describe('⚠️ ce qui est refusé, et DIT', () => {
  it('un fichier qui n’est pas une image', async () => {
    const r = await compresserImage({ type: 'application/pdf' })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('pas_une_image')
  })

  it('rien du tout', async () => {
    expect((await compresserImage(null)).reason).toBe('pas_une_image')
  })

  it('un SVG, même s’il est bien une image', async () => {
    // Un SVG peut porter du script, et n'a pas de dimensions fiables à
    // redimensionner. Il n'a rien à faire dans une page de cours.
    const r = await compresserImage({ type: 'image/svg+xml' })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('pas_une_image')
  })

  it('l’échec porte toujours un motif exploitable', async () => {
    // Sans motif, l'enseignant verrait « échec » sans savoir quoi corriger.
    const r = await compresserImage({ type: 'text/plain' })
    expect(typeof r.reason).toBe('string')
    expect(r.reason.length).toBeGreaterThan(0)
  })
})

describe('les plafonds sont cohérents avec le serveur', () => {
  it('le poids maximal reflète MAPO_MAX_IMAGE_BYTES', () => {
    // Si les deux divergent, le navigateur laisse passer une image que le
    // serveur refuse : l'enseignant voit un échec sans cause visible.
    expect(POIDS_MAX).toBe(600 * 1024)
  })

  it('la largeur maximale reste raisonnable pour un schéma', () => {
    expect(LARGEUR_MAX).toBeGreaterThanOrEqual(1000)
    expect(LARGEUR_MAX).toBeLessThanOrEqual(2000)
  })
})
