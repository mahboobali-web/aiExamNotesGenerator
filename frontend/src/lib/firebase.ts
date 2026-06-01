import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJoNK3SKu0DyDIEAKg2fXGkol5Eta3_Qo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "exam-notes-generator-7bcd7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "exam-notes-generator-7bcd7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "exam-notes-generator-7bcd7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "917798526550",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:917798526550:web:49964a3c313160d1d2a5f7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FSBPYH6GJC"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: result.user.refreshToken
      })
    });
    if (!response.ok) throw new Error('Failed to sync user with backend');
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export { app, auth, analytics };
