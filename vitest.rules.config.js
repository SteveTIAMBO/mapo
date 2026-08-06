import { defineConfig } from 'vitest/config'

// Les tests de règles parlent à l'émulateur, pas au navigateur : environnement
// Node, et surtout ils sont EXCLUS de `npm test` (sans émulateur, ils
// échoueraient tous et masqueraient les vraies régressions).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/regles-firestore.test.js'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
