import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCy_cX7dE6Xb_lbQyAZV6mukANVyNW-eEs",
  authDomain: "aplicativo-9be24.firebaseapp.com",
  projectId: "aplicativo-9be24",
  storageBucket: "aplicativo-9be24.firebasestorage.app",
  messagingSenderId: "661882937214",
  appId: "1:661882937214:web:32cfc4c6f29be01c7ddd2f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
