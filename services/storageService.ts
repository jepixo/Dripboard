import type { User, Avatar, ClothingItem, Outfit } from '../types';

// User data is small, so it can remain in localStorage for simplicity.
const USER_KEY = 'dripboard_user';

const DB_NAME = 'DripboardDB';
const DB_VERSION = 1;
const STORES = {
  avatars: 'avatars',
  clothing: 'clothing',
  outfits: 'outfits',
};

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error("IndexedDB could not be found in this browser.");
      return reject("IndexedDB is not supported.");
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening IndexedDB.');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
  return dbPromise;
};

const readAll = async <T>(storeName: string): Promise<T[]> => {
  try {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to read from ${storeName}:`, error);
    return []; // Return empty array on error to prevent app crash
  }
};

const write = async <T>(storeName: string, data: T): Promise<void> => {
  const db = await getDb();
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      if (request.error?.name === 'QuotaExceededError') {
        alert('Storage limit exceeded! Could not save the item. You may need to free up disk space.');
      }
      reject(request.error);
    };
  });
};

const writeAll = async <T>(storeName: string, data: T[]): Promise<void> => {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear(); 
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            if (transaction.error?.name === 'QuotaExceededError') {
                 alert('Storage limit exceeded! Could not save items. You may need to free up disk space.');
            }
            reject(transaction.error);
        };
    });
};

export const storageService = {
  isStorageAvailable: () => {
    return !!window.indexedDB;
  },
  
  // User (localStorage is fine for this small piece of data)
  saveUser: (user: User) => {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
        console.error("Could not save user to localStorage", e);
    }
  },
  getUser: (): User | null => {
    try {
        const item = localStorage.getItem(USER_KEY);
        return item ? JSON.parse(item) : null;
    } catch(e) {
        console.error("Could not read user from localStorage", e);
        return null;
    }
  },
  removeUser: () => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error("Could not remove user from localStorage", e);
    }
  },

  // Avatars (IndexedDB)
  getAvatars: (): Promise<Avatar[]> => readAll<Avatar>(STORES.avatars),
  saveAvatars: (avatars: Avatar[]): Promise<void> => writeAll<Avatar>(STORES.avatars, avatars),
  addAvatar: (avatar: Avatar): Promise<void> => write<Avatar>(STORES.avatars, avatar),

  // Clothing (IndexedDB)
  getClothing: (): Promise<ClothingItem[]> => readAll<ClothingItem>(STORES.clothing),
  saveClothing: (clothing: ClothingItem[]): Promise<void> => writeAll<ClothingItem>(STORES.clothing, clothing),
  addClothing: (item: ClothingItem): Promise<void> => write<ClothingItem>(STORES.clothing, item),

  // Outfits (IndexedDB)
  getOutfits: (): Promise<Outfit[]> => readAll<Outfit>(STORES.outfits),
  saveOutfits: (outfits: Outfit[]): Promise<void> => writeAll<Outfit>(STORES.outfits, outfits),
  addOutfit: async (outfit: Outfit) => {
    const outfits = await storageService.getOutfits();
    outfits.unshift(outfit); // Add to the beginning
    await storageService.saveOutfits(outfits);
  },
};
