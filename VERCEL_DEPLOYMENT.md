# Gurugedara - Vercel Deployment & Firebase Backend Guide

This guide describes how to host your **gurugedara** frontend user interface (UI) on **Vercel** while utilizing **Firebase (Firestore and Authentication)** as your hosted database and authentication backend.

---

## 1. Firebase Backend (Already Active)
Your backend is already successfully provisioned and secured on Firebase. The security rules (`firestore.rules`) have been deployed to your active Firebase Project.

* **Firebase Project ID:** `gurugedara-prod`
* **Firestore Custom Database ID:** `(default)`

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
| **`VITE_FIREBASE_API_KEY`** | `AIzaSyAeNptO2frLoS2ZCb82Eb6GgZoip5q2C0I` |
| **`VITE_FIREBASE_AUTH_DOMAIN`** | `gurugedara-prod.firebaseapp.com` |
| **`VITE_FIREBASE_PROJECT_ID`** | `gurugedara-prod` |
| **`VITE_FIREBASE_STORAGE_BUCKET`** | `gurugedara-prod.firebasestorage.app` |
| **`VITE_FIREBASE_MESSAGING_SENDER_ID`** | `380777950459` |
| **`VITE_FIREBASE_APP_ID`** | `1:380777950459:web:b991891b6bfd667d90945e` |
| **`VITE_FIREBASE_DATABASE_ID`** | `(default)` |

5. Click **Deploy**. Vercel will build the frontend and serve your static web application under a fast production domain!

---

## 4. Enabling Google Sign-In on Your Vercel Domain

For Google Sign-In to succeed on your custom Vercel domain (e.g., `gurugedaraedu.vercel.app` or `your-custom-domain.com`), you must add that domain to the **Authorized Domains** whitelist in your Firebase Console. Without this step, Firebase will block the OAuth popup connection with an `auth/unauthorized-domain` error.

### Method A: Using the Firebase Console Settings Tab
1. Open the [Firebase Console](https://console.firebase.google.com/) and click on your project **`gurugedara-prod`**.
2. From the left-hand sidebar menu, click on **Authentication**.
3. Look at the horizontal tabs at the top of the main Authentication dashboard: **`Users`**, **`Sign-in method`**, **`Templates`**, and **`Settings`**. Click on the **`Settings`** tab.
4. On the left side of this newly opened settings page, you will see a small vertical menu (usually containing items like *Authorized domains*, *User deletion*, *SMS region policy*). Click on **Authorized domains**.
5. Click the **Add domain** button.
6. Enter your exact Vercel deployment URL domain (e.g., `gurugedaraedu.vercel.app`), without the `https://` prefix or any trailing slashes.
7. Click **Add**.

---

### Method B: Google Cloud Console Fallback (If Authorized Domains is missing or hidden in Firebase)
Since Firebase Authentication runs entirely on top of Google Cloud Identity services, you can add your custom domain directly through the Google Cloud Console. This is a robust, fail-proof alternative:

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your project **`gurugedara-prod`** from the project drop-down selector at the top menu bar.
3. Look under the section labeled **OAuth 2.0 Client IDs**.
4. Locate the client ID used for your web app (typically named **`Web client (auto created by Google Service)`**) and click the **Pencil icon (Edit)** on the right-hand side.
5. Scroll down to the **Authorized JavaScript origins** section.
6. Click **+ ADD URI** and paste your Vercel deployment URL:
   * `https://gurugedaraedu.vercel.app`
7. Scroll down to the **Authorized redirect URIs** section.
8. Click **+ ADD URI** and paste your callback redirection URL:
   * `https://gurugedaraedu.vercel.app/__/auth/handler`
9. Click the **Save** button at the bottom of the page. Allow up to 5 minutes for Google's global OAuth servers to replicate this configuration.

---

## 5. Why Vercel Works with this Setup
* **`vercel.json` Support**: The project includes a pre-configured `vercel.json` file in the root directory. This tells Vercel's server to redirect all client-side router requests (like `/classes`, `/students`, `/payments`) back to `/index.html` seamlessly so that refresh actions do not throw a `404 Not Found` error.
* **Direct Serverless Connection**: Because the database client (`src/lib/firebase.ts`) is configured with proxy-friendly force long-polling configurations, your client-side UI deployed on Vercel communicates directly and securely with your Firebase Firestore instance and Auth instances from anywhere on the internet!
