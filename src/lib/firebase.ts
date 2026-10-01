import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCG69JevCHt0tYsCsYs2mu6-stMw62MBJU",
  authDomain: "tdv-boardgames.firebaseapp.com",
  projectId: "tdv-boardgames",
  storageBucket: "tdv-boardgames.firebasestorage.app",
  messagingSenderId: "550714807885",
  appId: "1:550714807885:web:80f594c1d972603d30ee04",
  measurementId: "G-W0ZSCQ0L85"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
