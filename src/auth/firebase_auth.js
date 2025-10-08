// src/auth/firebase_auth.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCf_2aqCvVuW1IxE5PEP2OsDonxKE13m5A",
  authDomain: "floodmonitor-292dc.firebaseapp.com",
  databaseURL: "https://floodmonitor-292dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "floodmonitor-292dc",
  storageBucket: "floodmonitor-292dc.appspot.com", // make sure this is .appspot.com
  messagingSenderId: "892664773357",
  appId: "1:892664773357:web:076753a796389c9e99eae4"
};

const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.error("Error setting auth persistence:", err)
);

// Firestore
export const db = getFirestore(app);

// Realtime Database
export const realtimeDB = getDatabase(app);
