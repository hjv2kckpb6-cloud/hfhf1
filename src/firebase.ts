import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBeb4qL00h9xoibc8wtfZv3F3MqebLWyUc",
  authDomain: "meay-9d816.firebaseapp.com",
  projectId: "meay-9d816",
  storageBucket: "meay-9d816.firebasestorage.app",
  messagingSenderId: "862191788750",
  appId: "1:862191788750:web:65155fc23850fffa86e69f",
  measurementId: "G-G7MTGV8YW9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Clé -> nom de la collection/document Firestore
// On stocke chaque donnée dans un doc unique sous "meay/data"
const ROOT = 'meay';
const DATA_DOC = 'data';

export async function fbLoad<T>(key: string, fallback: T): Promise<T> {
  try {
    const ref = doc(db, ROOT, key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return (d?.value ?? fallback) as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function fbSave(key: string, value: unknown): Promise<void> {
  try {
    const ref = doc(db, ROOT, key);
    await setDoc(ref, { value });
  } catch (e) {
    console.error('Firebase save error', key, e);
  }
}

export function fbListen<T>(key: string, callback: (val: T) => void, fallback: T): () => void {
  const ref = doc(db, ROOT, key);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      callback((d?.value ?? fallback) as T);
    } else {
      callback(fallback);
    }
  });
  return unsub;
}
