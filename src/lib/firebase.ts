import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

// Silence non-fatal Firestore network timeout and offline mode warnings in console
setLogLevel('error');

// Support client-side overrides when hosted on any external hosting service
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);

// Critical: In AI Studio Firebase setup, the firestore database ID may be custom.
// We must initialize standard firestore with this custom ID.
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

// Configure local persistent cache for offline-first resilience and slow bandwidth optimization
const cacheSettings: any = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true
};

export const db = dbId
  ? initializeFirestore(app, cacheSettings, dbId)
  : initializeFirestore(app, cacheSettings);

export const auth = getAuth(app);

let storageInstance: any = null;
try {
  if (firebaseConfig.storageBucket) {
    // Attempt standard initialization with bucket URL
    try {
      storageInstance = getStorage(app, `gs://${firebaseConfig.storageBucket.replace(/^gs:\/\//, '')}`);
    } catch (e) {
      storageInstance = getStorage(app);
    }
  } else {
    storageInstance = getStorage(app);
  }
} catch (err) {
  console.warn("Firebase Storage service is not available, falling back to local binary store.", err);
  storageInstance = null;
}

export const storage = storageInstance;

export { firebaseConfig };
export default app;

