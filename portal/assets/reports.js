// assets/reports.js — lista os últimos PDFs no Storage
import { firebaseOnce } from './firebase.js';

export async function listRecentReports(prefix='reports/cars', max=7){
  const { storage } = await firebaseOnce();
  const { ref, listAll, getDownloadURL } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js");

  // lista tudo sob a pasta e pega os últimos "max" pela ordem alfabética (YYYY-MM-DD ajuda)
  const base = ref(storage, prefix);
  const res = await listAll(base);
  const folders = res.prefixes.sort((a,b)=> b.name.localeCompare(a.name)); // datas desc

  const files = [];
  for (const folder of folders) {
    const l = await listAll(folder);
    l.items.forEach(i => files.push(i));
    if (files.length >= max) break;
  }

  const out = [];
  for (const f of files.slice(0,max)) {
    const url = await getDownloadURL(f);
    out.push({ name: f.name, path: f.fullPath, url });
  }
  return out;
}
