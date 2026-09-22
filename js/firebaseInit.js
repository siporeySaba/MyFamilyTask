import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBA47vn_dm5Sceb-yJQAVpBsikv9LBO51I",
  authDomain: "myfamilytask.firebaseapp.com",
  projectId: "myfamilytask",
  storageBucket: "myfamilytask.firebasestorage.app",
  messagingSenderId: "710040904471",
  appId: "1:710040904471:web:a2c06576255043c0e9cd52",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
