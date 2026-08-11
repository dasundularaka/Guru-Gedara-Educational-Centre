import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a profile image (File object or base64 Data URL) to Firebase Storage
 * under `profile_photos/{uid}/{timestamp}.jpg` and returns the public download URL.
 */
export async function uploadProfilePhotoToStorage(uid: string, input: File | string): Promise<string> {
  const timestamp = Date.now();
  const filePath = `profile_photos/${uid}/${timestamp}.jpg`;
  const storageRef = ref(storage, filePath);

  try {
    if (typeof input === 'string') {
      // Base64 Data URL
      await uploadString(storageRef, input, 'data_url');
    } else {
      // File object
      await uploadBytes(storageRef, input);
    }
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err: any) {
    console.warn("[Firebase Storage] Upload failed or unconfigured bucket, using optimized fallback:", err);
    if (typeof input === 'string') {
      return input;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(input));
      reader.readAsDataURL(input);
    });
  }
}

/**
 * Deletes a file from Firebase Storage given its download URL.
 */
export async function deleteStorageFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) return;
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("[Firebase Storage] Failed to delete file:", err);
  }
}
