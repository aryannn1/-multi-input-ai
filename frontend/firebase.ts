import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcbLxIdQp6btcW3ce5EFiZ9R-jn4rlTpA",
  authDomain:"nexus-ai-63b91.firebaseapp.com",
  projectId: "nexus-ai-63b91",
  storageBucket: "nexus-ai-63b91.firebasestorage.app",
  messagingSenderId: "820342651904",
  appId: "1:820342651904:web:6c86fcf3ce8024eccd6ce5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();