// 1. Import the Firebase app initializer
import { initializeApp } from "firebase/app";

// 2. Import the specific services you want to use (like Firestore database)
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBU4dyGo7bd6YKtHwDY9TYalQymYYeydNw",
  authDomain: "backgammon446.firebaseapp.com",
  projectId: "backgammon446",
  storageBucket: "backgammon446.firebasestorage.app",
  messagingSenderId: "224361270596",
  appId: "1:224361270596:web:b4c5ff41d9204d5345db11",
  measurementId: "G-ZRV59E48WM"
};

// 4. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 5. Initialize Firestore and export it so your other files can see it
export const db = getFirestore(app);