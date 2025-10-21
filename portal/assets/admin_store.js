// assets/admin_store.js — storage unificado p/ Admin + compat c/ auth.js

// Chaves primárias/legadas
const LS_USERS_PRIMARY = "cce_users";        // usado pelo auth.js
const LS_USERS_LEGACY  = "portal_users";     // legado (mantemos espelho p/ compat)
const LS_TOKENS        = "portal_tokens";
const LS_NEWS          = "portal_news";
const LS_BLOCKED       = "portal_blocked_users"; // Set serializado (array)

// utils
function load(k, f){ try{ return JSON.parse(localStorage.getItem(k)) ?? f; }catch{ return f; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

// --- MIGRAÇÃO / COMPAT ---
function readUsersMerged(){
  const a = load(LS_USERS_PRIMARY, []);
  const b = load(LS_USERS_LEGACY, []);
  if (a && a.length) return a;
  return b || [];
}
function writeUsersAll(arr){
  // grava no primary
  save(LS_USERS_PRIMARY, arr);
  // espelha em legacy e chaves antigas para compatibilidade
  try {
    save(LS_USERS_LEGACY, arr);
    localStorage.setItem("usuarios", JSON.stringify(arr));
    localStorage.setItem("users", JSON.stringify(arr));
  } catch {}
}

// Seed admin idempotente (garante usuário de testes)
export function bootstrapAdmin(){
  const users = readUsersMerged();
  if (!users.find(u => (u.login||"").toLowerCase() === "mrs")){
    users.push({
      login     : "mrs",
      nome      : "Administrador",
      email     : "admin@portal",
      matricula : "00000000",
      senha     : "123456",
      role      : "admin",
      active    : true,
      deleted   : false
    });
    writeUsersAll(users);
  } else {
    // Se já existia, ainda assim force-o a existir no primary (migração)
    writeUsersAll(users);
  }
}

// === Usuários ===
export function listUsers(){
  const arr = readUsersMerged();
  // garante persistência no primary
  writeUsersAll(arr);
  return arr;
}
export function saveUsers(arr){
  writeUsersAll(Array.isArray(arr) ? arr : []);
}

// === Tokens ===
export function listTokens(){ return load(LS_TOKENS, []); }
export function saveTokens(arr){ save(LS_TOKENS, Array.isArray(arr) ? arr : []); }

// (Admin costuma ler as notícias via assets/news.js; mantemos leitura bruta se precisar)
export function listNews(){ return load(LS_NEWS, []); }

// === Bloqueados (Set serializado) ===
export function getBlocked(){
  const arr = load(LS_BLOCKED, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
export function setBlocked(set){
  const arr = Array.from(set || []);
  save(LS_BLOCKED, arr);
}

// === Tokens: validação e consumo ===
export function validateToken(matricula, token){
  const tokens = listTokens();
  return tokens.some(t => t.matricula === matricula && t.token === token);
}
export function consumeToken(matricula, token){
  const tokens = listTokens();
  const idx = tokens.findIndex(t => t.matricula === matricula && t.token === token);
  if (idx === -1) return false;
  tokens.splice(idx, 1);
  saveTokens(tokens);
  return true;
}
