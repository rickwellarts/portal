// assets/tokens.js — tokens no Firestore (fallback local)
import { firebaseOnce } from './firebase.js';
const LS_TOKENS = "portal_tokens";

function listLocal() { return JSON.parse(localStorage.getItem(LS_TOKENS) || '[]'); }
function saveLocal(arr){ localStorage.setItem(LS_TOKENS, JSON.stringify(arr)); }

export async function listTokens(){
  try {
    const { db } = await firebaseOnce();
    const { collection, getDocs, query, orderBy, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const q = query(collection(db,'tokens'), orderBy('ts','desc'), limit(500));
    const snap = await getDocs(q);
    const out=[]; snap.forEach(d=> out.push({ id:d.id, ...d.data() }));
    return out;
  } catch { return listLocal(); }
}

export async function addToken({ matricula, token }){
  const item = { matricula, token, ts: Date.now(), usedAt: null };
  try {
    const { db } = await firebaseOnce();
    const { collection, addDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const ins = await addDoc(collection(db,'tokens'), item);
    return { id: ins.id, ...item };
  } catch {
    const arr = listLocal(); arr.push(item); saveLocal(arr); return item;
  }
}

export async function consumeToken(matricula, token){
  // marca usado, se existir
  try {
    const { db } = await firebaseOnce();
    const { collection, getDocs, query, where, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const q = query(collection(db,'tokens'),
                    where('matricula','==', matricula),
                    where('token','==', token),
                    where('usedAt','==', null));
    const snap = await getDocs(q);
    let ok = false;
    for (const d of snap.docs) {
      await updateDoc(d.ref, { usedAt: Date.now() });
      ok = true;
    }
    if (ok) return true;
  } catch {}

  // fallback local:
  const arr = listLocal();
  const idx = arr.findIndex(t => t.matricula===matricula && t.token===token && !t.usedAt);
  if (idx === -1) return false;
  arr[idx].usedAt = Date.now();
  saveLocal(arr);
  return true;
}
