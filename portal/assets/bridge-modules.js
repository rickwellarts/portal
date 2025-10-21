// assets/bridge-modules.js — FAB de justificativa + relatórios
import { logReport, openJustifyModal } from './cce-integrations.js';
import { submitJustification } from './admin_panels.js';

function session(){ try { return JSON.parse(localStorage.getItem("session_user")||"{}"); } catch { return {}; } }
function kPending(mat){ return `extrap_pending_${mat||'anon'}`; }
function load(k, f=[]){ try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
const uid = ()=> (crypto.randomUUID?.()||("id-"+Date.now().toString(36)+Math.random().toString(36).slice(2)));

// Relatórios
window.cceRegisterShiftReport = (pdfUrl, title="Relatório de Passagem de Turno") => {
  try { logReport('reports_shift', { title, url: pdfUrl }); } catch(e){ console.error(e); }
};
window.cceRegisterCarsReport = (pdfUrl, title="Relatório de Controle de Carros") => {
  try { logReport('reports_cars', { title, url: pdfUrl }); } catch(e){ console.error(e); }
};

// Extrapolações: registrar e justificar
window.cceRegisterExtrap = (minutos, detalhe="") => {
  const s = session(); const key = kPending(s.matricula||s.id);
  const arr = load(key, []);
  arr.push({ id: uid(), ts: Date.now(), minutos, detalhe });
  save(key, arr);
  installFab();
};

function installFab(){
  const s = session(); const key = kPending(s.matricula||s.id);
  const pend = load(key, []);
  if (!pend.length){
    const old = document.getElementById('cce-fab-justify');
    old && old.remove();
    return;
  }
  if (document.getElementById('cce-fab-justify')) return;
  const btn = document.createElement('button');
  btn.id = 'cce-fab-justify';
  btn.textContent = `Justificar Extrapolações (${pend.length})`;
  btn.className = 'btn btn-primary';
  Object.assign(btn.style, {
    position:'fixed', right:'20px', bottom:'90px', zIndex: 9998,
    borderRadius:'12px', padding:'10px 14px', boxShadow:'0 4px 18px rgba(0,0,0,.35)'
  });
  btn.onclick = async () => {
    let arr = load(key, []);
    while (arr.length){
      const item = arr.shift();
      await new Promise(resolve => {
        openJustifyModal({
          title: "Justificativa de extrapolação",
          details: `Extrapolação de ${item.minutos} min ${item.detalhe?("• "+item.detalhe):""}`,
          onSubmit: (texto) => {
            submitJustification({
              matricula: s.matricula || s.id || "",
              nome:      s.nome || s.name || "",
              details:   `Extrapolação de ${item.minutos} min ${item.detalhe?("• "+item.detalhe):""}`,
              moduleRef: "extrapolacao",
              justification: texto
            });
            resolve();
          }
        });
      });
      save(key, arr);
      btn.textContent = `Justificar Extrapolações (${arr.length})`;
    }
    btn.remove();
    alert("Todas as extrapolações foram justificadas.");
  };
  document.body.appendChild(btn);
}

window.addEventListener('DOMContentLoaded', installFab);
