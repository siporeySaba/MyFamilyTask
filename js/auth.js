import { auth, googleProvider, db } from './firebaseInit.js';
import {
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

// קורא ל-callback עם המשתמש הנוכחי (או null) בכל שינוי מצב התחברות,
// כולל מיד עם טעינת הדף (Firebase משחזר session שמור אוטומטית).
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// מחזיר את ה-familyId ששייך למשתמש הזה, או null אם עדיין אין לו משפחה (חדש).
export async function getFamilyIdForUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().familyId : null;
}

// מקשר בין משתמש שהתחבר לראשונה לבין המשפחה שנוצרה עבורו ב-setup.
export async function linkUserToFamily(uid, familyId) {
  await setDoc(doc(db, 'users', uid), { familyId });
}
