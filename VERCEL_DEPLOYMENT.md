# Gurugedara - Vercel Deployment & Firebase Backend Guide

This guide describes how to host your **gurugedara** frontend user interface (UI) on **Vercel** while utilizing **Firebase (Firestore and Authentication)** as your hosted database and authentication backend.

---

## 1. Firebase Backend (Already Active)
Your backend is already successfully provisioned and secured on Firebase. The security rules (`firestore.rules`) have been deployed to your active Firebase Project.

* **Firebase Project ID:** `jittery-avatar-nrwfn`
* **Firestore Custom Database ID:** `ai-studio-5c44d2d2-5b10-4b50-b344-701e5e839624`

---

## 2. Preparing the Repository
1. Export your code using the **Settings (Gear Icon)** in the AI Studio editor to a **GitHub Repository** or download the **ZIP archive**.
2. If downloaded as a ZIP, extract it and push it to a new repository on your GitHub account.

---

## 3. Deploying to Vercel (vercel.com)
1. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. **Import** your GitHub repository.
3. In the **Framework Preset**, select **Vite** (Vercel will usually auto-detect this).
4. Expand the **Environment Variables** section and add the following keys exactly as shown (copied from your active Firebase setup):

| Key | Value |
| :--- | :--- |
| **`VITE_FIREBASE_API_KEY`** | `AIzaSyDggYCXk67au0H7W7fOS2EpqqjEGMJeJLU` |
| **`VITE_FIREBASE_AUTH_DOMAIN`** | `jittery-avatar-nrwfn.firebaseapp.com` |
| **`VITE_FIREBASE_PROJECT_ID`** | `jittery-avatar-nrwfn` |
| **`VITE_FIREBASE_STORAGE_BUCKET`** | `jittery-avatar-nrwfn.firebasestorage.app` |
| **`VITE_FIREBASE_MESSAGING_SENDER_ID`** | `726461356342` |
| **`VITE_FIREBASE_APP_ID`** | `1:726461356342:web:6a2fa99cdcd210d4b5bb97` |
| **`VITE_FIREBASE_DATABASE_ID`** | `ai-studio-5c44d2d2-5b10-4b50-b344-701e5e839624` |

5. Click **Deploy**. Vercel will build the frontend and serve your static web application under a fast production domain!

---

## 4. Enabling Google Sign-In on Your Vercel Domain

For Google Sign-In to succeed on your custom Vercel domain (e.g., `gurugedaraedu.vercel.app` or `your-custom-domain.com`), you must add that domain to the **Authorized Domains** whitelist in your Firebase Console. Without this step, Firebase will block the OAuth popup connection with an `auth/unauthorized-domain` error.

### Step-by-Step Instructions:
1. Open the [Firebase Console](https://console.firebase.google.com/) and click on your project **`jittery-avatar-nrwfn`**.
2. From the left sidebar, click on **Authentication**.
3. At the top of the Authentication panel, click on the **Settings** tab.
4. In the left-hand navigation list of the Settings panel, click on **Authorized domains**.
5. Click the **Add domain** button.
6. Enter your exact Vercel deployment URL domain (e.g., `gurugedaraedu.vercel.app`), without the `https://` prefix or any trailing slashes.
7. Click **Add**.

---

## 5. Why Vercel Works with this Setup
* **`vercel.json` Support**: The project includes a pre-configured `vercel.json` file in the root directory. This tells Vercel's server to redirect all client-side router requests (like `/classes`, `/students`, `/payments`) back to `/index.html` seamlessly so that refresh actions do not throw a `404 Not Found` error.
* **Direct Serverless Connection**: Because the database client (`src/lib/firebase.ts`) is configured with proxy-friendly force long-polling configurations, your client-side UI deployed on Vercel communicates directly and securely with your Firebase Firestore instance and Auth instances from anywhere on the internet!
