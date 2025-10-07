// firebase_auth.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCf_2aqCvVuW1IxE5PEP2OsDonxKE13m5A",
  authDomain: "floodmonitor-292dc.firebaseapp.com",
  databaseURL: "https://floodmonitor-292dc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "floodmonitor-292dc",
  storageBucket: "floodmonitor-292dc.appspot.com",
  messagingSenderId: "892664773357",
  appId: "1:892664773357:web:076753a796389c9e99eae4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Keep the user logged in even after refresh
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Auth persistence set to local"))
  .catch((error) => console.error("Error setting persistence:", error));

export { auth, db };
