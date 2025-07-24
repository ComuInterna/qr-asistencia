// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqp2c66DYujKOWkBvSX9EF4Goyl5R64F4",
  authDomain: "registro-de-asistencias-f0b07.firebaseapp.com",
  projectId: "registro-de-asistencias-f0b07",
  storageBucket: "registro-de-asistencias-f0b07.firebasestorage.app",
  messagingSenderId: "1018292380765",
  appId: "1:1018292380765:web:ce3f0df2a76fb9359559b4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
