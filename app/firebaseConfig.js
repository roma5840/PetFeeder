import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCc7CfbiUP7ivEo4Vrgr-2Gq3i1xmaCrVE",
    authDomain: "aspetfeeder.firebaseapp.com",
    projectId: "aspetfeeder",
    storageBucket: "aspetfeeder.firebasestorage.app",
    messagingSenderId: "643773212039",
    appId: "1:643773212039:web:0cd9320984b9a61238df22",
    measurementId: "G-F387XYVKHB",
    databaseURL: "https://aspetfeeder-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
const analytics = getAnalytics(app);