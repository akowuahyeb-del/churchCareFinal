import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/* ✅ ADD THIS */
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",
  storageBucket: "churchcarefinal.appspot.com", // ✅ FIX THIS if needed
  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:..."
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

/* ✅ STORAGE */
export const storage = getStorage(app);
