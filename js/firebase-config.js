// Importa os módulos necessários diretamente dos servidores da Google (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// COLE AS SUAS CHAVES REAIS AQUI EMBAIXO:
const firebaseConfig = {
  apiKey: "AIzaSyDkcPOb-JstrygVS7HCGYVxl-wGXfs4Hag",
  authDomain: "app-semau-ufrrj.firebaseapp.com",
  projectId: "app-semau-ufrrj",
  storageBucket: "app-semau-ufrrj.firebasestorage.app",
  messagingSenderId: "286203116605",
  appId: "1:286203116605:web:76ff9ecbeb90ad2a0dbe54"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados (Firestore) e exporta para usar nos outros ficheiros JS
export const db = getFirestore(app);

console.log("🔥 Conexão com o Firebase configurada com sucesso!");