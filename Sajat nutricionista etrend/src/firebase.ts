import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6Coh3mrokyWQ-AV6rP1rx1nbVfMQai5I",
  authDomain: "meal-planner-app-90d9d.firebaseapp.com",
  projectId: "meal-planner-app-90d9d",
  storageBucket: "meal-planner-app-90d9d.firebasestorage.app",
  messagingSenderId: "736953870888",
  appId: "1:736953870888:web:98f1b25e7438b0cd1a631d"
};

let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (err) {
  console.warn('[Firebase] Initialization failed (app will use demo mode):', (err as Error)?.message);
  // Create minimal stubs so imports don't crash the app
  app = {} as any;
  db = {} as any;
  auth = {
    currentUser: null,
    onAuthStateChanged: (_cb: any) => () => {},
    signOut: () => Promise.resolve(),
  } as any;
}

export { db, auth };
export default app;