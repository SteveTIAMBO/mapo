/**
 * Supprimer un document doit le supprimer DU SERVEUR.
 *
 * Steve, 03/09/2026 : « supprimer un doc de l'interface doit le supprimer du
 * serveur ». Retirer la ligne de l'écran en laissant le PDF sur l'hébergement,
 * c'est croire avoir supprimé sans avoir supprimé — un problème de confiance
 * avant d'être un problème de disque.
 *
 * ⚠️ CE QUE LE SERVEUR NE SAVAIT PAS FAIRE. `mapo-files.php` ne gardait AUCUNE
 * trace du propriétaire : l'identifiant opaque de 24 caractères tenait lieu de
 * droit d'accès. Acceptable pour la LECTURE (il faut connaître l'identifiant
 * pour demander le fichier), pas pour la SUPPRESSION : un identifiant qui fuite
 * — un cours partagé par l'école, un lien recopié — aurait permis d'effacer le
 * document d'un enseignant. Une lecture indue se rattrape, un fichier effacé non.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const PHP = lire('server/mapo-files.php')
const SRV = lire('src/services/coursFiles.js')
const COURS = lire('src/components/MiapoMesCours.vue')

describe('⭐⭐ le serveur sait maintenant QUI a déposé', () => {
  it('le propriétaire est noté au dépôt', () => {
    // C'est la seule occasion où on le connaît de façon certaine.
    expect(PHP).toContain('@file_put_contents(ownerFile($id), (string) $uid);')
    expect(PHP).toContain("function ownerFile($id) { return MAPO_UPLOAD_DIR . '/' . $id . '.own'; }")
  })

  it('⚠️ la suppression REFUSE si le demandeur n’est pas le déposant', () => {
    expect(PHP).toContain("hash_equals(trim((string) @file_get_contents($own)), (string) $uid)")
    expect(PHP).toContain("'pas_le_proprietaire'")
  })

  it('⚠️⚠️ elle refuse AUSSI quand il n’y a pas de marqueur', () => {
    // Les fichiers déposés avant ce changement n'en ont pas. Supposer que
    // « pas de marqueur = à tout le monde » rouvrirait exactement le trou.
    expect(PHP).toContain("if (!file_exists($own)) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'sans_proprietaire']); return; }")
  })

  it('l’identifiant reste nettoyé — pas de traversée de chemin', () => {
    expect(PHP).toContain("$id = cleanId($_POST['id'] ?? $_GET['id'] ?? '');")
    expect(PHP).toMatch(/function cleanId\(\$s\) \{ return preg_replace\('\/\[\^a-f0-9\]\/'/)
  })

  it('le PDF converti et le marqueur partent avec le fichier', () => {
    // Un PPT laisse un `.pdf` derrière lui : l'oublier garderait une copie
    // lisible du document « supprimé ».
    expect(PHP).toContain("array_merge(array_keys($ALLOWED), ['pdf'])")
    expect(PHP).toContain('@unlink($own);')
  })

  it('un fichier déjà absent n’est pas une erreur', () => {
    // L'appelant veut que le fichier n'existe plus. Il n'existe plus.
    expect(PHP).toContain("echo json_encode(['ok' => true, 'supprimes' => $n]);")
  })
})

describe('⭐ le client appelle vraiment la suppression', () => {
  it('`deleteCoursFile` poste l’action delete avec le jeton', () => {
    expect(SRV).toContain("fd.append('action', 'delete')")
    expect(SRV).toContain("headers: { Authorization: 'Bearer ' + token }")
  })

  it('sans fichier serveur (démo), il n’y a rien à supprimer', () => {
    expect(SRV).toContain('if (!item || !item.fileId) return { ok: true }')
  })

  it('⚠️ le SERVEUR d’abord, l’entrée locale ensuite', () => {
    // Retirer l'entrée en premier et échouer ensuite perdrait l'identifiant du
    // fichier : il resterait sur le serveur sans que personne ne puisse plus le
    // désigner. Un échec laisse donc le document en place.
    expect(COURS).toMatch(/const r = await deleteCoursFile\(d\)\s*\n\s*if \(!r\.ok\) \{[\s\S]{0,120}return \}\s*\n\s*removeCoursPerso/)
  })

  it('supprimer un COURS entier s’arrête au premier échec', () => {
    // Sinon on laisse des fichiers orphelins derrière soi, sans plus aucune
    // entrée locale pour les désigner.
    expect(COURS).toMatch(/for \(const d of c\.docs\) \{[\s\S]{0,260}deleteCoursFile\(d\)[\s\S]{0,160}removeCoursPerso/)
  })

  it('un échec est DIT, pas avalé', () => {
    expect(COURS).toContain("t('mia.mcDeleteFileError')")
  })
})
