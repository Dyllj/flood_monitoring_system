// ================================================================
// FLOOD MONITORING SYSTEM — Firebase Configuration
// ================================================================

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { 
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator
} from "firebase/functions";

// ================================================================
// Firebase Project Configuration
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCf_2aqCvVuW1IxE5PEP2OsDonxKE13m5A",
  authDomain: "floodmonitor-292dc.firebaseapp.com",
  databaseURL: "https://floodmonitor-292dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "floodmonitor-292dc",
  storageBucket: "floodmonitor-292dc.appspot.com",
  messagingSenderId: "892664773357",
  appId: "1:892664773357:web:076753a796389c9e99eae4",
};

// ================================================================
// 🔹 Initialize Firebase App
// ================================================================
export const app = initializeApp(firebaseConfig);

// ================================================================
// 🔹 Authentication Setup
// ================================================================
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// ================================================================
// 🔹 Firestore Database
// ================================================================
export const db = getFirestore(app);

// ================================================================
// 🔹 Realtime Database
// ================================================================
export const realtimeDB = getDatabase(app);

// ================================================================
// 🔹 Cloud Functions (Region: us-central1)
// ================================================================
export const functions = getFunctions(app, "us-central1");

// ================================================================
// 🔸 LOCAL DEVELOPMENT SUPPORT
// - Connects frontend to Functions emulator
// ================================================================
if (window && window.location && window.location.hostname === "localhost") {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("✔️ Connected Functions SDK to emulator at localhost:5001");
  } catch (e) {
    console.warn("⚠️ Could not connect to functions emulator:", e.message || e);
  }
}

// ================================================================
// 🔹 Callable Cloud Function Wrappers
// ================================================================

// Sends manual flood alert
export const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");

// Future: you can add more callable functions here if needed
