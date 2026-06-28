import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";  

import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyATDviX7L_tAURjhVbkPUrrgHNsQVhjnW4",
  authDomain: "churchcarefinal.firebaseapp.com",
  projectId: "churchcarefinal",

  // ✅ ✅ FIXED HERE
  storageBucket: "churchcarefinal.appspot.com",

  messagingSenderId: "120675440611",
  appId: "1:120675440611:web:af20b8b2a976d71559f2d6"
};

const app = initializeApp(firebaseConfig);

// ✅ ✅ FIRESTORE FIX (KEEP THIS)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// ✅ ✅ AUTH FIX (CRITICAL)

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}



const storage = getStorage(app);

export { db, storage, auth };
