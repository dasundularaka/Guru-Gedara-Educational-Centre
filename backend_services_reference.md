# Guru Gedara Academy - Backend & Database Integration Reference

This file compiles and references all relevant backend-adjacent codes and services used to power the **Guru Gedara Academy Educational Centre** application.

Since this application utilizes **Firebase (Firestore and Authentication)** as its durable database and security layer, the backend consists of:
1. **Firestore Security Rules (`firestore.rules`)** - Securing database paths and collections based on roles (Students, Tutors, and Admins).
2. **Firebase Connection Client (`src/lib/firebase.ts`)** - Initializing connection with fallback environment overrides.
3. **Database Service Layer (`src/lib/firestoreService.ts`)** - Interfacing with Firestore for users, classes, bookings, payments, notifications, direct messages, and reviews with transparent local fallbacks.

---

## 1. Firestore Security Rules (`firestore.rules`)
These rules enforce role-based access control (RBAC) at the database layer.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if user is accessing their own document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Check if user is an admin
    function isAdmin() {
      return isAuthenticated() && 
        (request.auth.uid == 'admin_demo' || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Check if user is a tutor
    function isTutor() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'tutor';
    }

    // Users rules
    match /users/{userId} {
      allow read: if true; // anyone can browse tutor profiles
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(userId) || isAdmin();
    }

    // Classes rules
    match /classes/{classId} {
      allow read: if true; // anyone can browse classes
      allow write: if isTutor() || isAdmin();
    }

    // Bookings rules
    match /bookings/{bookingId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Payments rules
    match /payments/{paymentId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Notifications rules
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || resource.data.userId == 'all');
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Direct Messages rules
    match /messages/{messageId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## 2. Firebase Client Setup (`src/lib/firebase.ts`)
Establishes connection to the Firestore Database Instance with proxy-friendly configuration adjustments (force long-polling).

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

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
// We must initialize standard firestore with this custom ID and use force long-polling/fetch-streams disabled
// to survive container networks, sandboxed iframes, or proxy connection restrictions.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export { firebaseConfig };
export default app;
```

---

## 3. Core Database Service Methods (`src/lib/firestoreService.ts`)
Exposes all the asynchronous methods to manage the database state, complete with a local storage-backed fallback mode to ensure the application starts and remains usable even in offline sandbox environments.

### Core Architecture Features:
* **Hybrid Cloud/Local State Sync**: Detects connectivity and falls back to `localStorage` templates dynamically if cloud resources are inaccessible.
* **Auto-Seeding**: Seeds initial metadata (default classes, demo student `student_demo`, demo tutor templates, notices, reviews) automatically on the first connection.
* **Transactional Actions**: Handles real-time bookings count updates, automatic trigger of notification events on payment, photo acceptance, or system username assignments.
