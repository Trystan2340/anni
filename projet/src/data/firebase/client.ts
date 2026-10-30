/** Configuration Firebase Web. Le jeu reste en mode local tant que l'intégration n'est pas activée. */
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export function firebaseConfigFromEnvironment(): FirebaseOptions | null {
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID } = import.meta.env;
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_AUTH_DOMAIN || !VITE_FIREBASE_PROJECT_ID || !VITE_FIREBASE_APP_ID) return null;
  return {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: VITE_FIREBASE_APP_ID,
    ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}),
    ...(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? { storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET } : {}),
  };
}

export function createFirebaseServices(config: FirebaseOptions): FirebaseServices {
  const app = getApps().find((item) => item.name === 'christmas-quest') ?? initializeApp(config, 'christmas-quest');
  if (app.options.projectId !== config.projectId || app.options.appId !== config.appId) {
    throw new Error('Une autre configuration Firebase est déjà active.');
  }
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
