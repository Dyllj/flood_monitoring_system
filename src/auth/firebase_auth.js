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
// Creates and configures the core Firebase instance
// ================================================================
export const app = initializeApp(firebaseConfig);

// ================================================================
// 🔹 Authentication Setup
// - Uses browserLocalPersistence to keep users logged in across refreshes
// ================================================================
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// ================================================================
// 🔹 Firestore Database
// - Used for storing structured app data (devices, logs, personnel, etc.)
// ================================================================
export const db = getFirestore(app);

// ================================================================
// 🔹 Realtime Database
// - Used for live sensor readings and real-time flood level updates
// ================================================================
export const realtimeDB = getDatabase(app);

// ================================================================
// 🔹 Cloud Functions (Region: us-central1)
// - Used to call backend logic such as sending SMS alerts
// ================================================================
export const functions = getFunctions(app, "us-central1");

// ================================================================
// 🔸 LOCAL DEVELOPMENT SUPPORT
// - Connects your frontend to the Firebase Functions emulator
// - Avoids CORS errors and allows safe testing without real SMS sending
//
// ▶ How to use:
// Run this in your terminal (inside the "functions" folder):
//    npm run serve
// Then visit your app on localhost — this script connects automatically
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
// 🔹 Callable Cloud Function Wrapper
// - Exposes the `sendFloodAlertSMS` backend function for frontend use
// - Example: sendFloodAlertSMS({ sensorName: 'sensor01', distance: 240 })
// ================================================================
export const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");
