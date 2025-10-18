import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCf_2aqCvVuW1IxE5PEP2OsDonxKE13m5A",
  authDomain: "floodmonitor-292dc.firebaseapp.com",
  databaseURL: "https://floodmonitor-292dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "floodmonitor-292dc",
  storageBucket: "floodmonitor-292dc.appspot.com",
  messagingSenderId: "892664773357",
  appId: "1:892664773357:web:076753a796389c9e99eae4",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const realtimeDB = getDatabase(app);

// Functions: use us-central1 (matches cloud function)
export const functions = getFunctions(app, "us-central1");

// If developing locally, connect to functions emulator to avoid CORS & use local functions logs:
// Ensure you run: cd function && npm run serve (this starts the functions emulator on port 5001)
if (window && window.location && window.location.hostname === "localhost") {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("✔️ Connected Functions SDK to emulator at localhost:5001");
  } catch (e) {
    console.warn("⚠️ Could not connect to functions emulator:", e.message || e);
  }
}

// Callable wrapper
export const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");
