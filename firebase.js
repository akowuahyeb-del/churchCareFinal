import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATDviX7L_tAURjhVbkPUrrgHNsQVhjnW4",
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",
  storageBucket: "churchcarefinal.firebasestorage.app",
  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:af20b8b2a976d71559f2d6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);