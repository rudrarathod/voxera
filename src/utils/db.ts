import { Voice, AudioSegment, GenerationHistoryItem } from '../types';

const DB_NAME = 'VoxeraDB';
const DB_VERSION = 1;

export class VoxeraDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        // Store for Custom Voices
        if (!db.objectStoreNames.contains('voices')) {
          db.createObjectStore('voices', { keyPath: 'id' });
        }

        // Store for current studio timeline segments
        if (!db.objectStoreNames.contains('segments')) {
          db.createObjectStore('segments', { keyPath: 'id' });
        }

        // Store for Generation History
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Custom Voice Operations ---
  public static async getAllVoices(): Promise<Voice[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('voices', 'readonly');
        const store = transaction.objectStore('voices');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn('Failed to access IndexedDB voices store, falling back:', e);
      return [];
    }
  }

  public static async saveVoice(voice: Voice): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('voices', 'readwrite');
        const store = transaction.objectStore('voices');
        const request = store.put(voice);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to save voice in IndexedDB:', e);
    }
  }

  public static async deleteVoice(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('voices', 'readwrite');
        const store = transaction.objectStore('voices');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to delete voice from IndexedDB:', e);
    }
  }

  // --- Timeline Segment Operations ---
  public static async getAllSegments(): Promise<AudioSegment[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('segments', 'readonly');
        const store = transaction.objectStore('segments');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn('Failed to load segments from IndexedDB:', e);
      return [];
    }
  }

  public static async saveSegments(segments: AudioSegment[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('segments', 'readwrite');
        const store = transaction.objectStore('segments');

        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          if (segments.length === 0) {
            resolve();
            return;
          }

          let completed = 0;
          let failed = false;

          for (const segment of segments) {
            // Re-create a copy to save in IndexedDB
            const segmentToSave = { ...segment };
            // Strip out transient/expired objectUrl URLs to avoid memory leaks or broken paths.
            // On load, we reconstruct the objectUrl from the audioBlob.
            delete segmentToSave.audioUrl;
            delete segmentToSave.isGenerating;

            const request = store.put(segmentToSave);
            request.onsuccess = () => {
              completed++;
              if (completed === segments.length && !failed) {
                resolve();
              }
            };
            request.onerror = () => {
              if (!failed) {
                failed = true;
                reject(request.error);
              }
            };
          }
        };

        clearReq.onerror = () => reject(clearReq.error);
      });
    } catch (e) {
      console.error('Failed to save segments to IndexedDB:', e);
    }
  }

  // --- Generation History Operations ---
  public static async getAllHistory(): Promise<GenerationHistoryItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('history', 'readonly');
        const store = transaction.objectStore('history');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn('Failed to load history from IndexedDB:', e);
      return [];
    }
  }

  public static async saveHistoryItem(item: GenerationHistoryItem): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('history', 'readwrite');
        const store = transaction.objectStore('history');
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to save history item in IndexedDB:', e);
    }
  }

  public static async deleteHistoryItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('history', 'readwrite');
        const store = transaction.objectStore('history');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to delete history item from IndexedDB:', e);
    }
  }

  public static async clearHistory(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('history', 'readwrite');
        const store = transaction.objectStore('history');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to clear history from IndexedDB:', e);
    }
  }
}
