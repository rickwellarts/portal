// Controle de Carros — CCE 4.0 (compacto + campo livre de sede)
(function(){
  const LS_KEY = "carros";
  let carros = [];
  const salvar   = ()=> localStorage.setItem(LS_KEY, JSON.stringify(carros));
  const carregar = ()=> { try{ carros = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }catch{ carros=[]; } };

  // turnos por hora
  function getTurno(hhmm){
    const [h,m]=hhmm.split(":").map(Number);
    const t = h*60+m;
    if (t>=300 && t<=780)  return "Turno 1";
    if (t>780  && t<=1260) return "Turno 2";
    return "Turno 3";
  }
  const hhmmToDate = (hhmm)=> new Date(`1970-01-01T${hhmm}:00`);

  // DOM
  const nomeEl = document.getElementById("nome");
  const sedeEl = document.getElementById("sede"); // agora input text
  const entradaEl = document.getElementById("entrada");
  const statusEl = document.getElementById("status");
  const form = document.getElementById("formCarro");
  const filtroTurno = document.getElementById("filtroTurno");
  const gruposEl = document.getElementById("agrupamentoTurnos");
  const btnRel = document.getElementById("btnRel");
  const btnClear = document.getElementById("btnClear");

  // modal CCE
  const modalEl = document.getElementById("cce-modal");
  const modalTitleEl = document.getElementById("cce-modal-title");
  const modalMsgEl = document.getElementById("cce-modal-msg");
  const confirmModal = (msg, opts={}) => new Promise((resolve)=>{
    modalTitleEl.textContent = opts.title || "Confirmação";
    modalMsgEl.textContent = msg;
    modalEl.setAttribute("aria-hidden","false");
    const keyH = (e)=>{ if(e.key==="Escape") close(false); if(e.key==="Enter") close(true); };
    const clickH = (e)=>{ const a=e.target.closest("[data-action]")?.dataset.action;
      if(a==="ok") close(true); if(a==="cancelar"||e.target.dataset.close==="true") close(false); };
    function close(r){ modalEl.setAttribute("aria-hidden","true"); document.removeEventListener("keydown",keyH); modalEl.removeEventListener("click",clickH); resolve(r); }
    document.addEventListener("keydown",keyH); modalEl.addEventListener("click",clickH);
    setTimeout(()=> modalEl.querySelector('[data-action="ok"]')?.focus(),0);
  });

  // submit
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const nome = nomeEl.value.trim();
    const sede = sedeEl.value.trim();
    const entrada = entradaEl.value;
    const status = statusEl.value;
    if (!nome || !sede || !entrada) return;

    carros.push({ id: Date.now(), nome, sede, entrada, status, refeicao:false, obs:"" });
    salvar(); render();
    form.reset();
  });

  filtroTurno.addEventListener("change", render);

  function render(){
    gruposEl.innerHTML = "";
    const filtro = filtroTurno.value;

    // agrupar por "Sede — Turno"
    const map = new Map();
    carros.forEach(c=>{
      const turno = getTurno(c.entrada);
      if (filtro && turno !== filtro) return;
      const key = `${c.sede} — ${turno}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });

    if (map.size===0){
      gruposEl.innerHTML = `<div class="muted" style="padding:8px 2px;">Sem registros para exibir.</div>`;
      return;
    }

    [...map.entries()].forEach(([titulo, lista])=>{
      lista.sort((a,b)=> a.entrada.localeCompare(b.entrada));

      const wrap = document.createElement("div");
      wrap.className = "group";
      wrap.innerHTML = `<header><div>${titulo}</div><div class="muted">${lista.length} registro(s)</div></header><ul></ul>`;
      const ul = wrap.querySelector("ul");

      lista.forEach(c=>{
        const li = document.createElement("li");
        li.className = "item";
        if (((Date.now() - hhmmToDate(c.entrada))/36e5) >= 4 && !c.refeicao) li.classList.add("alerta");

        li.innerHTML = `
          <div class="row top">
            <div class="meta">
              <span class="name">${c.nome}</span>
              <span class="sep">•</span> <span>${c.sede}</span>
              <span class="sep">•</span> <span>Entrada <b>${c.entrada}</b></span>
            </div>
            <div class="compact-controls">
              <select class="sel-status select-sm" title="Status">
                <option ${c.status==='Disponível'?'selected':''}>Disponível</option>
                <option ${c.status==='Em trânsito'?'selected':''}>Em trânsito</option>
              </select>
              <label class="muted" style="font-size:.85rem;display:flex;align-items:center;gap:6px;">
                <input type="checkbox" class="chk-refeicao" ${c.refeicao?'checked':''}/> Refeição
              </label>
              <input type="time" class="inp-entrada" value="${c.entrada}" title="Atualizar entrada" />
              <button class="icon-btn" title="Excluir" aria-label="Excluir">🗑️</button>
            </div>
          </div>
          <textarea class="obs" placeholder="Observações...">${c.obs||""}</textarea>
        `;

        // events
        li.querySelector(".sel-status").addEventListener("change", (e)=>{
          c.status = e.target.value; salvar(); render();
        });
        li.querySelector(".chk-refeicao").addEventListener("change", (e)=>{
          c.refeicao = e.target.checked; salvar(); render();
        });
        li.querySelector(".inp-entrada").addEventListener("change", (e)=>{
          c.entrada = e.target.value; salvar(); render();
        });
        li.querySelector(".obs").addEventListener("input", (e)=>{
          c.obs = e.target.value; salvar();
        });
        li.querySelector(".icon-btn").addEventListener("click", async ()=>{
          const ok = await confirmModal(`Excluir o registro de ${c.nome}?`, { okText:"Excluir" });
          if (!ok) return;
          carros = carros.filter(x => x.id !== c.id); salvar(); render();
        });

        ul.appendChild(li);
      });

      gruposEl.appendChild(wrap);
    });
  }

  // relatório (mantido)
  document.getElementById("btnRel").addEventListener("click", ()=>{
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return;
    const doc = new jsPDF();
    doc.setFontSize(11);
    doc.text(`Relatório de Carros — ${new Date().toLocaleDateString("pt-BR")}`, 10, 12);
    let y = 20;
    const ordem = [...carros].sort((a,b)=> (a.sede+a.entrada).localeCompare(b.sede+b.entrada));
    let tag = "";
    ordem.forEach(c=>{
      const grp = `${c.sede} — ${getTurno(c.entrada)}`;
      if (grp !== tag){ doc.setFont(undefined,"bold"); doc.text(grp,10,y); y+=6; doc.setFont(undefined,"normal"); tag=grp; }
      const linha = `• ${c.nome} | ${c.entrada} | ${c.status} | Refeição: ${c.refeicao?'Sim':'Não'}`;
      doc.text(doc.splitTextToSize(linha, 180), 10, y); y+=6;
      if (c.obs){ doc.setTextColor(100); doc.text(doc.splitTextToSize(`Obs: ${c.obs}`, 180), 12, y); doc.setTextColor(0); y+=6; }
      if (y>280){ doc.addPage(); y=12; }
    });
    doc.save("relatorio_carros.pdf");
  });

  document.getElementById("btnClear").addEventListener("click", async ()=>{
    const ok = await confirmModal("Remover TODOS os registros desta tela?", { okText:"Limpar" });
    if (!ok) return;
    carros = []; salvar(); render();
  });

  carregar(); render();
  setInterval(render, 60_000);
})();
