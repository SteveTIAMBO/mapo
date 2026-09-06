<script setup>
/**
 * TEXTE MIS EN FORME — le gras porte le terme clé, rien d'autre.
 *
 * POURQUOI CE COMPOSANT EXISTE. Retour de Steve du 16/08/2026 : « arrêter de
 * mettre des apostrophes partout autour des exemples, mettre en gras à la
 * place, c'est plus lisible ». Le défaut était double — le modèle entourait les
 * termes d'apostrophes, ET l'application n'aurait rien pu afficher d'autre : les
 * explications étaient interpolées en texte brut.
 *
 * ⚠️ AUCUN `v-html`, et ce n'est pas négociable. Le texte vient d'un modèle de
 * langage, donc d'une source qu'on ne contrôle pas : l'injecter comme du HTML
 * ouvrirait une porte à du script dans l'écran d'un enfant. On découpe en
 * segments et on laisse Vue écrire du texte, ce qui rend l'injection
 * structurellement impossible.
 *
 * ⚠️ UNE SEULE MARQUE : `**gras**`. Pas d'italique, pas de titres, pas de
 * listes, pas de liens. Une explication de trois lignes n'a pas besoin d'un
 * traitement de texte, et chaque marque supplémentaire est une occasion pour le
 * modèle d'en abuser. Le gras signale LE terme à retenir ; s'il y en a cinq par
 * phrase, il ne signale plus rien.
 */
import { computed } from 'vue'

const props = defineProps({
  texte: { type: String, default: '' },
})

// Découpe en segments alternés : hors gras / entre `**`.
const segments = computed(() => {
  const t = String(props.texte || '')
  const out = []
  let reste = t
  let garde = 0
  while (garde++ < 200) {
    const debut = reste.indexOf('**')
    if (debut === -1) break
    const fin = reste.indexOf('**', debut + 2)
    if (fin === -1) break // marque ouverte jamais refermée : on laisse le texte tel quel
    if (debut > 0) out.push({ gras: false, t: reste.slice(0, debut) })
    const contenu = reste.slice(debut + 2, fin)
    // `** **` vide ou uniquement des espaces : on ne fabrique pas un gras vide.
    if (contenu.trim()) out.push({ gras: true, t: contenu })
    reste = reste.slice(fin + 2)
  }
  if (reste) out.push({ gras: false, t: reste })
  return out.length ? out : [{ gras: false, t }]
})
</script>

<template>
  <span class="tr"><template v-for="(s, i) in segments" :key="i"><strong v-if="s.gras">{{ s.t }}</strong><template v-else>{{ s.t }}</template></template></span>
</template>

<style scoped>
/* Le gras hérite de la couleur du texte : la mise en valeur passe par la
   graisse, pas par une couleur. Une couleur qui ne code rien ajoute du bruit,
   et si elle code quelque chose, elle doit être doublée par autre chose que la
   couleur — tout le monde ne la distingue pas. */
.tr strong { font-weight: 700; }
</style>
