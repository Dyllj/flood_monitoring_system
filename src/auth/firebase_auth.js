// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAc2-Lkg8YHxN70z-giLGaE9noP70mWgKI",
  authDomain: "test-no2-68bd7.firebaseapp.com",
  projectId: "test-no2-68bd7",
  storageBucket: "test-no2-68bd7.firebasestorage.app",
  messagingSenderId: "49700792949",
  appId: "1:49700792949:web:e41325332b0be17061663c",
  measurementId: "G-YHXD0DXNK3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);