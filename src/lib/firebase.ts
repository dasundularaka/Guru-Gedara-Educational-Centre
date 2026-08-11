import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { 
  initializeFirestore, 
  memoryLocalCache
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

// Support client-side overrides when hosted on any external hosting service
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || (firebaseConfigData as any).firestoreDatabaseId
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Critical: In AI Studio Firebase setup, the firestore database ID may be custom.
// We initialize Firestore with memory local cache & auto long polling to guarantee instant 
// responsiveness and avoid 10s connection timeout errors in sandboxed container/iframe environments.
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

let dbInstance: any;

try {
  const cacheSettings = {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
  };

  dbInstance = dbId
    ? initializeFirestore(app, cacheSettings, dbId)
    : initializeFirestore(app, cacheSettings);
} catch (e) {
  console.warn("[Firebase] Initializing fallback Firestore instance", e);
  try {
    dbInstance = dbId ? initializeFirestore(app, {}, dbId) : initializeFirestore(app, {});
  } catch (_) {
    // If already initialized
    dbInstance = initializeFirestore(app, {});
  }
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);

export { firebaseConfig };
export default app;
