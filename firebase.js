// ✅ firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* ✅ YOUR FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSy...", // keep your real key
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",
  storageBucket: "churchcarefinal.appspot.com",
  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:..."
};

/* ✅ INITIALISE FIREBASE */
const app = initializeApp(firebaseConfig);

/* ✅ EXPORT SERVICES */
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
``