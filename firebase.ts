
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBfZWohar0iTkaN73jCi6rpk_8o0uE0D90",
  authDomain: "motocareph-11eaf.firebaseapp.com",
  projectId: "motocareph-11eaf",
  storageBucket: "motocareph-11eaf.firebasestorage.app",
  messagingSenderId: "359039066439",
  appId: "1:359039066439:web:8cf05878691039d84dec62",
  measurementId: "G-Y0J1GRG2HM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
