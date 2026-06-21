import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Static fallbacks in case config import fails or isn't fully ready
const firebaseConfig = {
  apiKey: "AIzaSyDggYCXk67au0H7W7fOS2EpqqjEGMJeJLU",
  authDomain: "jittery-avatar-nrwfn.firebaseapp.com",
  projectId: "jittery-avatar-nrwfn",
  storageBucket: "jittery-avatar-nrwfn.firebasestorage.app",
  messagingSenderId: "726461356342",
  appId: "1:726461356342:web:6a2fa99cdcd210d4b5bb97",
  firestoreDatabaseId: "ai-studio-5c44d2d2-5b10-4b50-b344-701e5e839624"
};

const app = initializeApp(firebaseConfig);

// Critical: In AI Studio Firebase setup, the firestore database ID may be custom.
// We must initialize standard firestore with this custom ID and use force long-polling/fetch-streams disabled
// to survive container networks, sandboxed iframes, or proxy connection restrictions.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export default app;
