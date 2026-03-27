import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyD6Coh3mrokyWQ-AV6rP1rx1nbVfMQai5I",
  authDomain: "meal-planner-app-90d9d.firebaseapp.com",
  projectId: "meal-planner-app-90d9d",
  storageBucket: "meal-planner-app-90d9d.firebasestorage.app",
  messagingSenderId: "736953870888",
  appId: "1:736953870888:web:98f1b25e7438b0cd1a631d"
};

/** Detect Capacitor native: capacitor:// (iOS) or https://localhost (Android) */
const isNative = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' ||
  (window.location.protocol === 'https:' && window.location.hostname === 'localhost')
);

let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // App Check — protects Firestore/Auth from unauthorized access
  if (typeof window !== 'undefined' && !isNative) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider('6Lfpb5osAAAAAEgIWqNyt9ZcAKokIQKSlbi0E_xK'),
      isTokenAutoRefreshEnabled: true,
    });
  }

  // Capacitor WebView needs explicit persistence — getAuth() default fails silently
  if (isNative) {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } else {
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('[Firebase] Initialization failed (app will use demo mode):', (err as Error)?.message);
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