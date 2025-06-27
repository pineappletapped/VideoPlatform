import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXUd4iKZWHeiWe_2gblxWE9uFEXS4pHAI",
  authDomain: "pineappletapped-graphic-system.firebaseapp.com",
  projectId: "pineappletapped-graphic-system",
  storageBucket: "pineappletapped-graphic-system.firebasestorage.app",
  messagingSenderId: "1028817053613",
  appId: "1:1028817053613:web:c5061b138676641bde2324",
  measurementId: "G-2Y6YYBF5R2"
};

export function getOrInitApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}
