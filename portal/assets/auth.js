// assets/auth.js — versão híbrida (Firebase + fallback localStorage)

// ================== CONFIG FIREBASE ==================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6_8MeuDde2ZKH0PZNxvan1Qv5Xjy6EII",
  authDomain: "portal-cce.firebaseapp.com",
  projectId: "portal-cce",
  storageBucket: "portal-cce.firebasestorage.app", // ✅ correção aqui
  messagingSenderId: "909631108635",
  appId: "1:909631108635:web:011ea0541bfd4ff17aabe",
  measurementId: "G-7FN8GFILLR" // opcional
};
// =====================================================

const LS_USERS   = "cce_users";
const LS_SESSION = "session_user";
const LS_TOKENS  = "portal_tokens";
const LS_BLOCKED = "portal_blocked_users";

function load(k, f=null){ try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
const norm = v => (v||"").toString().trim();

function toRootPath(){
  const parts = location.pathname.split('/').filter(Boolean);
  const endsWithSlash = location.pathname.endsWith('/');
  const depth = Math.max(0, (endsWithSlash ? parts.length : parts.length - 1));
  return depth === 0 ? "" : "../".repeat(depth);
}

// ------ bloqueados (legado) ------
function getBlockedSet(){
  const arr = load(LS_BLOCKED, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
function isBlocked(u){
  if (!u) return false;
  const blk = getBlockedSet();
  return blk.has(u.login || "");
}

// ------ seed admin (legado local) ------
(function seedAdmin(){
  try {
    const users = load(LS_USERS, []) || [];
    const hasAdmin = users.some(u => (u.login && u.login.toLowerCase() === "mrs"));
    if (!hasAdmin){
      const admin = {
        matricula: "00000000",
        login: "mrs",
        nome: "Administrador",
        email: "admin@portal",
        senha: "123456",
        role: "admin",
        active: true,
        deleted: false
      };
      users.push(admin);
      save(LS_USERS, users);
      console.log("[auth] Seed admin local criado (mrs / 123456)");
    }
  } catch(e){ console.warn("[auth] Seed admin falhou:", e); }
})();

// ------ API legado local ------
export function getUsers(){ return load(LS_USERS, []) || []; }
export function setUsers(arr){
  save(LS_USERS, arr);
  try {
    localStorage.setItem("usuarios", JSON.stringify(arr));
    localStorage.setItem("users", JSON.stringify(arr));
  } catch {}
}

export function getSession(){ return load(LS_SESSION, null); }
export function setSessionFromUser(u){
  const s = { matricula:u.matricula||"", login:u.login||"", nome:u.nome||"", email:u.email||"", role:u.role||"user", uid:u.uid||"" };
  save(LS_SESSION, s);
  return s;
}
export function logout(){
  try { localStorage.removeItem(LS_SESSION); } catch {}
  if (fb.ready) { fb.authSignOut?.(); }
}

// procura usuário por matrícula / login / email
function findUserById(id){
  const users = getUsers();
  const needle = (id||"").toString().toLowerCase();
  return users.find(x =>
    (x.matricula && x.matricula === id) ||
    (x.login && x.login.toLowerCase() === needle) ||
    (x.email && x.email.toLowerCase() === needle)
  ) || null;
}

export function verifyCredentials(loginOrMatricula, senha){
  const id = norm(loginOrMatricula);
  const pwd = norm(senha);
  const u = findUserById(id);
  if (!u)                  return { ok:false, reason:"not-found" };
  if (u.deleted)           return { ok:false, reason:"deleted" };
  if (u.active === false)  return { ok:false, reason:"blocked" };
  if (isBlocked(u))        return { ok:false, reason:"blocked" };
  if ((u.senha||"") !== pwd) return { ok:false, reason:"bad-pass" };
  setSessionFromUser(u);
  return { ok:true, user:u };
}

export function signup({ login, nome, email, matricula, senha, token }){
  login = norm(login || matricula);
  nome  = norm(nome);
  email = norm(email);
  matricula = norm(matricula);
  senha = norm(senha);
  token = norm(token);

  if (!matricula || !/^\d{8}$/.test(matricula)) throw new Error("Matrícula inválida (8 dígitos).");
  if (!login)  throw new Error("Informe um login.");
  if (!nome)   throw new Error("Informe o nome.");
  if (!email)  throw new Error("Informe o e-mail.");
  if (!senha)  throw new Error("Informe a senha.");
  if (!token)  throw new Error("Token obrigatório.");

  const arr = (function tokensList(){
    const tks = load(LS_TOKENS, null);
    if (Array.isArray(tks)) return tks;
    const fb = load("tokens", []); // fallback legacy
    return Array.isArray(fb) ? fb : [];
  })();
  const idx = arr.findIndex(t => t.matricula === matricula && t.token === token);
  if (idx === -1) throw new Error("Token inválido ou já utilizado.");
  arr.splice(idx,1); save(LS_TOKENS, arr);

  const users = getUsers();
  if (users.some(u => (u.login||"").toLowerCase() === login.toLowerCase()))
    throw new Error("Login já existente.");
  if (users.some(u => (u.matricula||"") === matricula))
    throw new Error("Matrícula já cadastrada.");

  const novo = { login, nome, email, matricula, senha, role:"user", active:true, deleted:false };
  users.push(novo);
  setUsers(users);
  return novo;
}

// ================== Firebase (modular v10, import dinâmico) ==================
const fb = {
  ready: false, app: null, auth: null, db: null,
  async init(){
    if (this.ready) return;
    if (!FIREBASE_CONFIG?.apiKey || !FIREBASE_CONFIG?.projectId) return;

    const [{ initializeApp }, { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut },
           { getFirestore, doc, getDoc }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    ]);

    this.initializeApp = initializeApp;
    this.getAuth = getAuth;
    this.onAuthStateChanged = onAuthStateChanged;
    this.signInWithEmailAndPassword = signInWithEmailAndPassword;
    this.signOut = signOut;
    this.getFirestore = getFirestore;
    this.doc = doc;
    this.getDoc = getDoc;

    this.app = initializeApp(FIREBASE_CONFIG);
    this.auth = getAuth(this.app);
    this.db   = getFirestore(this.app);
    this.ready = true;
  },
  async getRole(uid){
    if (!this.ready || !uid) return null;
    try {
      const snap = await this.getDoc(this.doc(this.db, "roles", uid));
      if (snap.exists()) return (snap.data()?.role || null);
    } catch {}
    return null;
  },
  async authSignOut(){ try { await this.signOut(this.auth); } catch {} }
};

// ---- login híbrido (Firebase preferencial; fallback local) ----
export async function signin({ loginOrMatricula, senha }){
  const id = norm(loginOrMatricula);
  const pwd = norm(senha);

  await fb.init();
  // Tenta Firebase quando o identificador parece e-mail
  if (fb.ready && id.includes("@")) {
    try {
      const cred = await fb.signInWithEmailAndPassword(fb.auth, id, pwd);
      const user = cred.user;
      const role = await fb.getRole(user.uid) || "user";
      const sess = {
        uid: user.uid,
        login: user.email,
        nome: user.displayName || user.email.split("@")[0],
        email: user.email,
        role
      };
      setSessionFromUser(sess);
      return sess;
    } catch (e) {
      console.warn("[auth] Firebase signin falhou, tentando fallback local:", e?.code || e);
    }
  }

  // Fallback legado
  const r = verifyCredentials(id, pwd);
  if (!r.ok){
    const map = {
      "not-found":"Usuário não encontrado.",
      "deleted":"Usuário excluído.",
      "blocked":"Usuário bloqueado.",
      "bad-pass":"Senha incorreta.",
      "unknown":"Falha ao autenticar."
    };
    throw new Error(map[r.reason] || map.unknown);
  }
  return r.user;
}

// ---- guard (suporta Firebase + local) ----
export async function requireAuth(){
  const root = `${toRootPath()}index.html`;

  await fb.init();
  if (fb.ready) {
    // ✅ conserto: não referenciar unsubscribe antes de definir
    const user = await new Promise(resolve => {
      let unsub = fb.onAuthStateChanged(fb.auth, u => { unsub(); resolve(u || null); });
    });

    if (!user){
      const s = getSession();
      if (!s){
        location.href = root;
        throw new Error("no-session");
      }
      const u = findUserById(s.login || s.matricula || s.email);
      if (!u || u.deleted || u.active === false || isBlocked(u)){
        logout(); location.href = `${root}?blocked=1`; throw new Error("blocked-or-deleted");
      }
      return u;
    }

    const role = await fb.getRole(user.uid) || "user";
    const sess = {
      uid: user.uid,
      login: user.email,
      nome: user.displayName || user.email?.split("@")[0] || "",
      email: user.email || "",
      role
    };
    setSessionFromUser(sess);
    return sess;
  }

  // Sem Firebase → guarda local
  const s = getSession();
  if (!s){ location.href = root; throw new Error("no-session"); }
  const u = findUserById(s.login || s.matricula || s.email);
  if (!u || u.deleted || u.active === false || isBlocked(u)){
    logout(); location.href = `${root}?blocked=1`; throw new Error("blocked-or-deleted");
  }
  return u;
}

window.cceAuth = { logout };
