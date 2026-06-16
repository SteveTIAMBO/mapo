import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: 'AIzaSyDgX93HmpPglyGGfTcQr7_soQpvHWBU-L0',
  authDomain: 'mapo-edufrem.firebaseapp.com',
  projectId: 'mapo-edufrem',
  storageBucket: 'mapo-edufrem.firebasestorage.app',
  messagingSenderId: '88266665819',
  appId: '1:88266665819:web:5dd91be9-0409-4085-b9bc-b15c839e026a'
}

const app = initializeApp(firebaseConfig)

// Offline persistence avec l'API Firebase v10+ (critique pour les écoles africaines)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export const auth = getAuth(app)

// Google Auth — l'accès réel est filtré par les invitations (voir auth store),
// pas par le domaine de l'adresse Google.
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export default app
