/**
 * Liste de RÉFÉRENCE des noms de famille de la démonstration.
 *
 * C'est la liste camerounaise historique, celle qui apparaît dans les élèves
 * (`stores/eleves.js`), le personnel (`stores/personnel.js`) et les professeurs
 * principaux (`stores/classes.js`). Elle sert de PIVOT au changement de pays :
 * chaque nom est remplacé par celui qui occupe la même position dans la liste du
 * pays choisi (voir `data/paysDemo.js`).
 *
 * ⚠️ L'ORDRE EST SIGNIFIANT — ne jamais réordonner ni insérer au milieu.
 * Un nom déplacé change l'identité de toutes les personnes de tous les autres
 * pays, en silence : le professeur principal de la 6e A et le même professeur
 * dans l'emploi du temps porteraient soudain deux noms différents. Pour ajouter
 * un nom, l'ajouter À LA FIN, ici et dans chaque pack pays.
 *
 * Les 35 premiers sont la liste utilisée pour tirer les élèves ; les suivants
 * n'apparaissent que dans le personnel et les professeurs principaux.
 */
export const NOMS_REFERENCE = [
  // ── Élèves (ordre historique de stores/eleves.js) ──
  'Kamga', 'Mbarga', 'Ngo', 'Nana', 'Atangana', 'Fotso', 'Djomou', 'Kenfack',
  'Ngono', 'Tagne', 'Mballa', 'Essomba', 'Teussop', 'Fouda', 'Nkoulou', 'Onana',
  'Biyick', 'Ekotto', 'Mvondo', 'Ndjie', 'Tchinda', 'Simo', 'Mbianda', 'Tchoupo',
  'Nkeng', 'Messi', 'Ndjock', 'Owona', 'Tamba', 'Eyebe', 'Belibi', 'Ongolo',
  'Zang', 'Etoundi', 'Abega',
  // ── Personnel et professeurs principaux uniquement ──
  'Ashu', 'Atemengue', 'Belinga', 'Bidja', 'Bilong', 'Eko', 'Ewane', 'Eyenga',
  'Manga', 'Mbassi', 'Mefane', 'Ndjié', 'Ndongo', 'Njoya', 'Nkemeni', 'Talla',
  'Tchoua', 'Tiambo', 'Yomba',
]
