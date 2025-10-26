// Passagem de Turno — CCE 4.0 (novo layout com linhas dinâmicas)
(function(){
  const LS_KEY = "passagem_turno_v2";

  // Cabeçalho
  const elData = document.getElementById("pt-data");
  const elTurno = document.getElementById("pt-turno");
  const elRespOut = document.getElementById("pt-resp-out");
  const elRespIn  = document.getElementById("pt-resp-in");
  const elObs     = document.getElementById("obs-gerais");

  // Tabelas e modelos
  const tables = {
    hotel:  { id: "tbl-hotel",  cols: ["nome","matricula","hotel","fim","obs"] },
    extra:  { id: "tbl-extra",  cols: ["sede","matricula","motivo","porque"] },
    vazios: { id: "tbl-vazios", cols: ["origem","destino","prefixo","previsao"] },
    cargas: { id: "tbl-cargas", cols: ["origem","destino","prefixo","obs"] },
    atencao:{ id: "tbl-atencao",cols: ["sede"] }
  };

  // Utils
  const pad2 = n => String(n).padStart(2,"0");
  const todayISO = ()=> {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };

  // Autoset data hoje, se vazio
  if (!elData.value) elData.value = todayISO();

  // Estado
  let state = {
    header: {
      data: elData.value,
      turno: elTurno.value,
      respOut: elRespOut.value || "",
      respIn: elRespIn.value || "",
    },
    hotel:  [],
    extra:  [],
    vazios: [],
    cargas: [],
    atencao: [],
    obs: elObs.value || ""
  };

  function save(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      state = JSON.parse(raw);

      // header
      elData.value   = state.header?.data   || todayISO();
      elTurno.value  = state.header?.turno  || "Manhã";
      elRespOut.value= state.header?.respOut|| "";
      elRespIn.value = state.header?.respIn || "";
      elObs.value    = state.obs || "";

      // tables
      Object.keys(tables).forEach(key=>{
        const tbody = document.querySelector(`#${tables[key].id} tbody`);
        tbody.innerHTML = "";
        (state[key]||[]).forEach(row => tbody.appendChild(buildRow(key, row)));
      });
    }catch(e){}
  }

  // Eventos do header
  [elData, elTurno, elRespOut, elRespIn].forEach(el=>{
    el.addEventListener("input", ()=>{
      state.header.data   = elData.value;
      state.header.turno  = elTurno.value;
      state.header.respOut= elRespOut.value.trim();
      state.header.respIn = elRespIn.value.trim();
      save();
    });
  });
  elObs.addEventListener("input", ()=>{
    state.obs = elObs.value;
    save();
  });

  // Construção de linha
  function buildRow(key, data={}){
    const { cols } = tables[key];
    const tr = document.createElement("tr");
    tr.dataset.key = key;

    cols.forEach(c=>{
      const td = document.createElement("td");
      const input = (c==="obs"||c==="motivo"||c==="porque") ? document.createElement("textarea") : document.createElement("input");
      if (c === "fim") input.type = "datetime-local";
      if (c === "previsao") input.type = "datetime-local";
      if (["matricula","prefixo"].includes(c)) input.inputMode = "numeric";
      input.value = data[c] || "";
      input.addEventListener("input", ()=>{
        syncRow(tr);
        save();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdAct = document.createElement("td");
    tdAct.className = "min";
    tdAct.innerHTML = `
      <div class="row-actions">
        <button class="icon-btn" title="Subir" aria-label="Subir">▲</button>
        <button class="icon-btn" title="Descer" aria-label="Descer">▼</button>
        <button class="icon-btn" title="Excluir" aria-label="Excluir">🗑️</button>
      </div>
    `;
    const [btnUp, btnDown, btnDel] = tdAct.querySelectorAll("button");

    btnUp.addEventListener("click", ()=>{
      const prev = tr.previousElementSibling;
      if (!prev) return;
      tr.parentNode.insertBefore(tr, prev);
      syncTableFromDOM(key);
      save();
    });
    btnDown.addEventListener("click", ()=>{
      const next = tr.nextElementSibling;
      if (!next) return;
      tr.parentNode.insertBefore(next, tr);
      syncTableFromDOM(key);
      save();
    });
    btnDel.addEventListener("click", ()=>{
      tr.remove();
      syncTableFromDOM(key);
      save();
    });

    tr.appendChild(tdAct);
    return tr;
  }

  // Sincroniza um TR para o state
  function syncRow(tr){
    const key = tr.dataset.key;
    const { cols } = tables[key];
    const inputs = [...tr.querySelectorAll("td input, td textarea")];
    const obj = {};
    cols.forEach((c,i)=> obj[c] = inputs[i].value);
    // acha o índice desse TR no DOM e aplica no state
    const idx = [...tr.parentNode.children].indexOf(tr);
    state[key][idx] = obj;
  }

  // Sincroniza a tabela inteira (após reordenação ou delete)
  function syncTableFromDOM(key){
    const tbody = document.querySelector(`#${tables[key].id} tbody`);
    const rows = [...tbody.children];
    state[key] = rows.map(tr=>{
      const obj = {};
      const { cols } = tables[key];
      const inputs = [...tr.querySelectorAll("td input, td textarea")];
      cols.forEach((c,i)=> obj[c] = inputs[i].value);
      return obj;
    });
  }

  // Adição de linha
  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.add;
      const tbody = document.querySelector(`#${tables[key].id} tbody`);
      const tr = buildRow(key, {});
      tbody.appendChild(tr);
      syncTableFromDOM(key);
      save();
      // foco na 1ª célula
      const first = tr.querySelector("input,textarea");
      first && first.focus();
    });
  });

  // === PDF — layout portal (com quebras e respiros ajustados) ===
  document.getElementById("btn-pdf").addEventListener("click", ()=>{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) return;

    const formatDateBR = (iso)=> {
      if (!iso) return "";
      const d = new Date(iso + (iso.length===10 ? "T00:00:00" : ""));
      const dd = pad2(d.getDate()), mm = pad2(d.getMonth()+1), yy = d.getFullYear();
      const hh = pad2(d.getHours()), mi = pad2(d.getMinutes());
      return iso.length===10 ? `${dd}/${mm}/${yy}` : `${dd}/${mm}/${yy} ${hh}:${mi}`;
    };

    // coleta "ao vivo"
    const collect = (key, cols)=>{
      const tbody = document.querySelector(`#${key} tbody`);
      return [...tbody.children].map(tr=>{
        const inputs = [...tr.querySelectorAll("td input, td textarea")];
        const obj = {};
        cols.forEach((c,i)=> obj[c] = inputs[i]?.value || "");
        return obj;
      });
    };

    const doc = new jsPDF({ unit:"pt", format:"a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 36;
    let y = M;

    // Título e linha dourada
    doc.setFont("helvetica","bold"); doc.setFontSize(16);
    doc.text("Passagem de Turno — CCE 4.0", M, y);
    y += 10; doc.setDrawColor(255,210,74); doc.setLineWidth(1); doc.line(M, y, W-M, y); y += 12;

    // Cabeçalho com colunas de largura fixa e quebra automática
    const headerItems = [
      { label: "Data",         value: formatDateBR(elData.value) },
      { label: "Turno",        value: elTurno.value },
      { label: "Resp. Saída",  value: elRespOut.value },
      { label: "Resp. Entrada",value: elRespIn.value }
    ];
    const colW = (W - M*2) / 4 - 6;
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    const heights = headerItems.map((item, i)=>{
      const x = M + i * (colW + 6);
      doc.setFont("helvetica","bold"); doc.text(`${item.label}:`, x, y);
      doc.setFont("helvetica","normal");
      const lines = doc.splitTextToSize(item.value || "-", colW);
      doc.text(lines, x, y+12);
      return lines.length * 12 + 12;
    });
    y += Math.max(...heights) + 6;
    doc.setDrawColor(120); doc.line(M, y, W-M, y); y += 10;

    // Tabelas com cálculo de altura por maior conteúdo
    function drawTable(title, headers, rows, valueAt){
      if (y > H - 120){ doc.addPage(); y = M; }

      doc.setFont("helvetica","bold"); doc.setFontSize(13);
      doc.text(title, M, y);
      y += 8; doc.setDrawColor(150); doc.line(M, y, W-M, y); y += 10;

      doc.setFont("helvetica","bold"); doc.setFontSize(10);
      const cW = (W - M*2) / headers.length;
      let x = M;
      headers.forEach(h => { doc.text(h, x+2, y); x += cW; });
      y += 14; doc.setDrawColor(200); doc.line(M, y, W-M, y); y += 8;

      doc.setFont("helvetica","normal");
      rows.forEach(row=>{
        if (y > H - 80){ doc.addPage(); y = M; }

        const wrappedByCol = headers.map((_, idx)=>{
          const text = valueAt(row, idx) || "-";
          return doc.splitTextToSize(Array.isArray(text) ? text.join("\n") : text, cW - 6);
        });
        const rowHeight = Math.max(...wrappedByCol.map(lines => lines.length * 12)) + 4;

        let cx = M;
        wrappedByCol.forEach(lines=>{
          doc.text(lines, cx+2, y);
          cx += cW;
        });

        y += rowHeight;
        doc.setDrawColor(235); doc.line(M, y, W-M, y); y += 6; // separador + respiro
      });

      y += 4; // respiro final da seção
    }

    // dados
    const hotelRows  = collect("tbl-hotel",  ["nome","matricula","hotel","fim","obs"]);
    const extraRows  = collect("tbl-extra",  ["sede","matricula","motivo","porque"]);
    const vaziosRows = collect("tbl-vazios", ["origem","destino","prefixo","previsao"]);
    const cargasRows = collect("tbl-cargas", ["origem","destino","prefixo","obs"]);
    const atenRows   = collect("tbl-atencao",["sede"]);
    const obsText    = elObs.value || "-";

    // 1) Equipe em hotel
    drawTable(
      "Equipe em hotel",
      ["Nome","Matrícula","Hotel","Fim do descanso","Observação"],
      hotelRows,
      (r,i)=>[ r.nome, r.matricula, r.hotel, formatDateBR(r.fim||""), r.obs ][i]
    );

    // 2) Extrapolação no turno
    drawTable(
      "Extrapolação no turno",
      ["Sede","Matrícula","Motivo da extrapolação","Por que não trocou?"],
      extraRows,
      (r,i)=>[ r.sede, r.matricula, r.motivo, r.porque ][i]
    );

    // 3) Vazios programados
    drawTable(
      "Vazios programados",
      ["Origem","Destino","Prefixo","Previsão"],
      vaziosRows,
      (r,i)=>[ r.origem, r.destino, r.prefixo, formatDateBR(r.previsao||"") ][i]
    );

    // 4) Carregados em circulação
    drawTable(
      "Carregados em circulação",
      ["Origem","Destino","Prefixo","Observação"],
      cargasRows,
      (r,i)=>[ r.origem, r.destino, r.prefixo, r.obs ][i]
    );

    // 5) Pontos de Atenção
    drawTable(
      "Pontos de Atenção Planalto + Baixada Santista",
      ["Atenção específica por sede"],
      atenRows,
      (r,i)=>[ r.sede ][i]
    );

    // 6) Observações gerais
    if (y > H - 120){ doc.addPage(); y = M; }
    doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text("Observações gerais", M, y);
    y += 8; doc.setDrawColor(150); doc.line(M, y, W-M, y); y += 10;

    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    const obsWrapped = doc.splitTextToSize(obsText, W - M*2);
    doc.text(obsWrapped, M, y);
    y += obsWrapped.length*12 + 10;

    // Rodapé
    const now = new Date();
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(
      `Gerado em ${pad2(now.getDate())}/${pad2(now.getMonth()+1)}/${now.getFullYear()} às ${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      M, H - 16
    );

    const name = `passagem_${elTurno.value}_${elData.value}.pdf`.replace(/[^\w.-]+/g,"_");
    doc.save(name);
  });

    // === Modal de confirmação customizado ===
  function showConfirmDialog(msg, onConfirm) {
    // Se já existir um modal aberto, remove
    const old = document.getElementById("cce-modal");
    if (old) old.remove();

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "cce-modal";
    overlay.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h3>Confirmação</h3>
          <button class="modal-close" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          <p>${msg}</p>
        </div>
        <div class="modal-footer">
          <button class="btn ghost cancel">Cancelar</button>
          <button class="btn confirm">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Centralização vertical
    const box = overlay.querySelector(".modal-box");
    const overlayBg = overlay.querySelector(".modal-overlay");
    const btnCancel = overlay.querySelector(".cancel");
    const btnOk = overlay.querySelector(".confirm");
    const btnClose = overlay.querySelector(".modal-close");

    function closeModal() {
      overlay.classList.add("fade-out");
      setTimeout(()=> overlay.remove(), 200);
    }

    [btnCancel, btnClose, overlayBg].forEach(b => b.addEventListener("click", closeModal));
    btnOk.addEventListener("click", () => { closeModal(); onConfirm(); });

    // Animação de entrada
    setTimeout(()=> overlay.classList.add("visible"), 10);
  }

  // Limpar tudo (com modal)
  document.getElementById("btn-clear").addEventListener("click", ()=>{
    showConfirmDialog("Deseja realmente limpar todos os campos e tabelas?", () => {
      elData.value = todayISO();
      elTurno.value = "Manhã";
      elRespOut.value = "";
      elRespIn.value = "";
      elObs.value = "";
      state.header = { data: elData.value, turno: elTurno.value, respOut:"", respIn:"" };
      state.obs = "";

      // tabelas
      Object.keys(tables).forEach(key=>{
        state[key] = [];
        const tbody = document.querySelector(`#${tables[key].id} tbody`);
        tbody.innerHTML = "";
      });

      save();
    });
  });

  // Inicialização
  load();
})();

