import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";   // ✅ ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyATDviX7L_tAURjhVbkPUrrgHNsQVhjnW4",
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",
  storageBucket: "churchcarefinal.firebasestorage.app",
  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:af20b8b2a976d71559f2d6"
};

const app = initializeApp(firebaseConfig);

// ✅ SERVICES
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);   // ✅ ADD THIS

// ✅ EXPORT ALL
export { db, storage, auth };
