/**
 * IndexedDB Binary Store
 * Stores binary files (PDFs, Docs, Large Images) locally in the browser's IndexedDB
 * when cloud storage is unavailable or when working offline.
 * Supports up to hundreds of megabytes safely.
 */

const DB_NAME = 'gurugedara_binary_store';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface StoredBinaryRecord {
  id: string;
  blob: Blob | ArrayBuffer;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export const binaryStore = {
  /**
   * Save a binary file to IndexedDB
   */
  async saveFile(id: string, file: File | Blob, fileName: string): Promise<string> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record: StoredBinaryRecord = {
          id,
          blob: file,
          fileName,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        };

        const req = store.put(record);
        req.onsuccess = () => resolve(id);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[binaryStore] Failed saving file to IndexedDB:', e);
      return id;
    }
  },

  /**
   * Get a binary file from IndexedDB
   */
  async getFile(id: string): Promise<StoredBinaryRecord | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[binaryStore] Failed retrieving file from IndexedDB:', e);
      return null;
    }
  },

  /**
   * Create an object URL from a stored file in IndexedDB
   */
  async getFileObjectUrl(id: string): Promise<string | null> {
    const record = await this.getFile(id);
    if (!record || !record.blob) return null;

    try {
      const blob = record.blob instanceof Blob 
        ? record.blob 
        : new Blob([record.blob], { type: record.fileType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('[binaryStore] Failed creating object URL:', e);
      return null;
    }
  },

  /**
   * Delete a file from IndexedDB
   */
  async deleteFile(id: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[binaryStore] Failed deleting file from IndexedDB:', e);
    }
  },

  /**
   * Universal downloader/opener for study resources and media files
   */
  async openOrDownload(item: { referenceUrl?: string; storagePath?: string; fileName?: string; title?: string }): Promise<void> {
    const url = item.referenceUrl || '';
    const storagePath = item.storagePath || '';
    const fileName = item.fileName || item.title || 'resource';

    // 1. If stored in indexeddb
    if (storagePath.startsWith('indexeddb://') || url.startsWith('indexeddb://')) {
      const id = (storagePath || url).replace('indexeddb://', '');
      const blobUrl = await this.getFileObjectUrl(id);
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      }
    }

    // 2. If it's a base64 Data URL or Blob URL
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 3. Regular HTTP/HTTPS web url or Firebase Cloud Storage download URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
};
