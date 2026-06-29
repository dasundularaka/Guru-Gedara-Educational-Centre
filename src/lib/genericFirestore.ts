import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  limit
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
import { safeStringify } from './firestoreService';

// Map collection name to exact local storage key used by the app's cache layer
export function getLocalKey(collectionName: string): string {
  switch (collectionName) {
    case 'classes': return 'local_classes';
    case 'bookings': return 'local_bookings';
    case 'payments': return 'local_payments';
    case 'reviews': return 'local_reviews';
    case 'attendance': return 'local_attendance';
    case 'notifications': return 'local_notifications';
    case 'messages': return 'local_messages';
    case 'users': return 'local_registered_users';
    default: return `local_${collectionName}`;
  }
}

// Helper to load localized fallback array from local storage
export function getLocalFallbackList<T>(collectionName: string): T[] {
  const baseKey = getLocalKey(collectionName);
  const scopedKey = `${baseKey}_${firebaseConfig.projectId || 'default'}`;
  const raw = localStorage.getItem(scopedKey);
  if (raw) {
    try {
      return JSON.parse(raw) as T[];
    } catch (e) {
      console.warn(`[GenericFirestore] Failed to parse local fallback for key ${scopedKey}`, e);
    }
  }
  return [];
}

// Helper to save localized fallback array to local storage
export function saveLocalFallbackList<T>(collectionName: string, list: T[]): void {
  const baseKey = getLocalKey(collectionName);
  const scopedKey = `${baseKey}_${firebaseConfig.projectId || 'default'}`;
  try {
    localStorage.setItem(scopedKey, safeStringify(list));
  } catch (e) {
    console.warn(`[GenericFirestore] Failed to save local fallback for key ${scopedKey}`, e);
  }
}

/**
 * Generic Firestore Service with dual-layer cloud/offline local mirror syncing
 */
export const genericFirestoreService = {
  /**
   * Add or set a document in a collection
   * @param collectionName The name of the Firestore collection
   * @param data The document fields
   * @param customId Optional specific document ID. If omitted, Firestore will auto-generate one.
   * @returns The generated or specified document ID
   */
  async addDocument<T extends { id?: string; uid?: string; [key: string]: any }>(
    collectionName: string, 
    data: T, 
    customId?: string
  ): Promise<string> {
    const id = customId || data.id || data.uid || doc(collection(db, collectionName)).id;
    const finalData = { ...data, id };
    
    // 1. Attempt to write to Cloud Firestore
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, finalData);
      console.log(`[GenericFirestore] Successfully added doc ${id} to collection ${collectionName} in Firestore`);
    } catch (error) {
      console.warn(`[GenericFirestore] Cloud write failed for collection ${collectionName}. Using local sync.`, error);
    }

    // 2. Mirror update in Local Cache
    const localList = getLocalFallbackList<any>(collectionName);
    const updatedList = [...localList.filter(item => (item.id || item.uid) !== id), finalData];
    saveLocalFallbackList(collectionName, updatedList);

    return id;
  },

  /**
   * Read a single document by ID from a collection
   * @param collectionName The name of the Firestore collection
   * @param docId The unique document identifier
   * @returns The document data or null if not found
   */
  async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    // 1. Attempt to fetch from Cloud Firestore
    try {
      const docRef = doc(db, collectionName, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cloudData = snap.data() as T;
        return cloudData;
      }
    } catch (error) {
      console.warn(`[GenericFirestore] Failed to read doc ${docId} from Firestore collection ${collectionName}`, error);
    }

    // 2. Fall back to local storage cache matching ID
    const localList = getLocalFallbackList<any>(collectionName);
    const matched = localList.find(item => (item.id || item.uid) === docId);
    return matched ? (matched as T) : null;
  },

  /**
   * Update a document by ID with partial fields
   * @param collectionName The name of the Firestore collection
   * @param docId The unique document identifier
   * @param updates The fields to update
   */
  async updateDocument<T extends { [key: string]: any }>(
    collectionName: string, 
    docId: string, 
    updates: Partial<T>
  ): Promise<void> {
    // 1. Attempt to update Cloud Firestore
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef as any, updates as any);
      console.log(`[GenericFirestore] Successfully updated doc ${docId} in collection ${collectionName} on Firestore`);
    } catch (error) {
      console.warn(`[GenericFirestore] Cloud update failed for ${collectionName}/${docId}. Using local sync.`, error);
    }

    // 2. Mirror update in Local Cache
    const localList = getLocalFallbackList<any>(collectionName);
    const updatedList = localList.map(item => {
      const itemId = item.id || item.uid;
      if (itemId === docId) {
        return { ...item, ...updates };
      }
      return item;
    });
    saveLocalFallbackList(collectionName, updatedList);
  },

  /**
   * Delete a document by ID
   * @param collectionName The name of the Firestore collection
   * @param docId The unique document identifier
   */
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    // 1. Attempt to delete from Cloud Firestore
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      console.log(`[GenericFirestore] Successfully deleted doc ${docId} from collection ${collectionName} on Firestore`);
    } catch (error) {
      console.warn(`[GenericFirestore] Cloud deletion failed for ${collectionName}/${docId}. Using local sync.`, error);
    }

    // 2. Mirror deletion in Local Cache
    const localList = getLocalFallbackList<any>(collectionName);
    const updatedList = localList.filter(item => (item.id || item.uid) !== docId);
    saveLocalFallbackList(collectionName, updatedList);
  },

  /**
   * Read all documents from a collection
   * @param collectionName The name of the Firestore collection
   * @returns List of all documents
   */
  async getCollection<T>(collectionName: string): Promise<T[]> {
    let cloudList: T[] = [];
    
    // 1. Attempt to read from Cloud Firestore
    try {
      const snap = await getDocs(collection(db, collectionName));
      cloudList = snap.docs.map(doc => doc.data() as T);
    } catch (error) {
      console.warn(`[GenericFirestore] Cloud fetch failed for collection ${collectionName}`, error);
    }

    // 2. Fall back/merge with Local Cache
    const localList = getLocalFallbackList<T>(collectionName);
    const mergedMap = new Map<string, T>();
    
    localList.forEach((item: any) => {
      const key = item.id || item.uid || Math.random().toString();
      mergedMap.set(key, item);
    });
    
    cloudList.forEach((item: any) => {
      const key = item.id || item.uid || Math.random().toString();
      mergedMap.set(key, item);
    });

    const finalMerged = Array.from(mergedMap.values());
    if (cloudList.length > 0) {
      saveLocalFallbackList(collectionName, finalMerged);
    }

    return finalMerged;
  },

  /**
   * Query documents in a collection with custom field matching
   * @param collectionName The name of the Firestore collection
   * @param field The field to filter on
   * @param opStr The query operator (e.g., '==', '>', etc.)
   * @param value The value to match
   * @returns List of matching documents
   */
  async queryDocuments<T>(
    collectionName: string, 
    field: string, 
    opStr: any, 
    value: any
  ): Promise<T[]> {
    let cloudList: T[] = [];
    
    // 1. Attempt to query Cloud Firestore
    try {
      const q = query(collection(db, collectionName), where(field, opStr, value));
      const snap = await getDocs(q);
      cloudList = snap.docs.map(doc => doc.data() as T);
    } catch (error) {
      console.warn(`[GenericFirestore] Cloud query failed for collection ${collectionName}`, error);
    }

    // 2. Fall back/query from Local Cache
    const localList = getLocalFallbackList<any>(collectionName);
    const localFiltered = localList.filter(item => {
      const itemVal = item[field];
      if (opStr === '==') return itemVal === value;
      if (opStr === '!=') return itemVal !== value;
      if (opStr === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
      return false; // Basic local evaluation for safety
    });

    // Merge results
    const mergedMap = new Map<string, T>();
    localFiltered.forEach((item: any) => {
      const key = item.id || item.uid || Math.random().toString();
      mergedMap.set(key, item);
    });
    cloudList.forEach((item: any) => {
      const key = item.id || item.uid || Math.random().toString();
      mergedMap.set(key, item);
    });

    return Array.from(mergedMap.values());
  }
};
