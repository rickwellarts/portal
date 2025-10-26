// assets/firebase.js — inicialização singleton, sem "duplicate-app"

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6_8MeuDde2ZKH0PZNxvan1Qv5Xjy6EII",
  authDomain: "portal-cce.firebaseapp.com",
  projectId: "portal-cce",
  storageBucket: "portal-cce.appspot.com",
  messagingSenderId: "909631108635",
  appId: "1:909631108635:web:011ea0541bfd4ff17aabe",
  measurementId: "G-7FN8GFILLR"
};

// guardamos uma única promessa para toda a app
let _once;

/**
 * Use sempre esta função. Garante que o Firebase é inicializado só 1x
 * e reaproveitado nas próximas chamadas, evitando "app/duplicate-app".
 */
export async function firebaseOnce() {
  if (_once) return _once;

  _once = (async () => {
    const [
      { initializeApp, getApp, getApps },
      { getAuth },
      { getFirestore },
      { getStorage }
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"),
    ]).then(mods => [
      { ...mods[0] }, // app
      { ...mods[1] }, // auth
      { ...mods[2] }, // firestore
      { ...mods[3] }, // storage
    ]);

    // Reaproveita se já existir; se não, cria.
    let app;
    const apps = getApps();
    if (apps && apps.length) {
      try {
        app = getApp(); // [DEFAULT]
      } catch {
        app = initializeApp(FIREBASE_CONFIG); // should not happen, fallback
      }
    } else {
      app = initializeApp(FIREBASE_CONFIG);
    }

    const auth = getAuth(app);
    const db   = getFirestore(app);
    const storage = getStorage(app);

    return { app, auth, db, storage };
  })();

  return _once;
}
