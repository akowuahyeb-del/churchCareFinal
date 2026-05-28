// Import core Firebase
import { initializeApp } from "firebase/app";

/* ✅ ADD THIS (VERY IMPORTANT) */
import { getFirestore } from "firebase/firestore";

/* ✅ YOUR CONFIG (CORRECT) */
const firebaseConfig = {
  apiKey: "AIzaSyATDviX7L_tAURjhVbkPUrrgHNsQVhjnW4",
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",
  storageBucket: "churchcarefinal.firebasestorage.app",
  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:af20b8b2a976d71559f2d6"
};

/* ✅ INITIALISE */
const app = initializeApp(firebaseConfig);

/* ✅ CREATE DATABASE */
const db = getFirestore(app);

/* ✅ EXPORT DATABASE */
export { db };