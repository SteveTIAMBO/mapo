// Clé publique VAPID du push web MAPO+ (RFC 8292).
// Publique par nature : elle identifie l'expéditeur auprès du navigateur et part
// donc dans le bundle front. La clé PRIVÉE correspondante vit UNIQUEMENT sur le
// serveur (server/mapo-push-config.php, jamais committée).
// Si tu régénères la paire côté serveur, remplace aussi cette constante.
export const VAPID_PUBLIC_KEY = 'BIPCwkutszR8xCPAr85n8nBtNUM77kiC61JoGuWBQJF__S7-3ZBTiZ3iVhGC_MFWWIYs4GvD30cPNWubTlfMUQk'

/** base64url → Uint8Array : format attendu par pushManager.subscribe. */
export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
