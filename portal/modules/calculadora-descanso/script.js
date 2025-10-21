// Calculadora de Descanso — CCE 4.0 (integrada ao Portal)
(function(){
  const escalaEl = document.getElementById("escala");
  const horaEl   = document.getElementById("hora");
  const resEl    = document.getElementById("resultado");
  const shareBtn = document.getElementById("shareBtn");
  const btnCalc  = document.getElementById("btn-calc");
  const btnClear = document.getElementById("btn-clear");

  // Máscara incremental dd/mm/aaaa hh:mm
  horaEl.addEventListener("input", (e)=>{
    let v = e.target.value.replace(/[^\d]/g, "");
    const L = v.length;
    if (L < 3) e.target.value = v;
    else if (L < 5) e.target.value = v.slice(0,2) + "/" + v.slice(2);
    else if (L < 9) e.target.value = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4);
    else if (L < 11) e.target.value = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4,8) + " " + v.slice(8);
    else e.target.value = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4,8) + " " + v.slice(8,10) + ":" + v.slice(10,12);
  });

  function parseBRDateTime(txt){
    const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if(!m) return null;
    const [,d,mo,y,h,mi] = m.map(Number);
    // montar ISO “seguro” para evitar inversão de fuso
    return new Date(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:00`);
  }

  function horasPorEscala(val){
    // regra original preservada
    switch(String(val)){
      case "1": return 12;
      case "2": return 22;
      case "3": return 12;
      case "4": return 56;
      default:  return 12;
    }
  }

  function calcular(){
    const fechamento = parseBRDateTime(horaEl.value.trim());
    if(!fechamento || isNaN(fechamento.getTime())){
      resEl.innerHTML = `<div class="msg error">Formato inválido. Use <b>dd/mm/aaaa hh:mm</b>.</div>`;
      shareBtn.style.display = "none";
      return;
    }
    const horas = horasPorEscala(escalaEl.value);
    const retorno = new Date(fechamento.getTime() + horas * 60 * 60 * 1000);

    const retornoTxt = retorno.toLocaleString("pt-BR", {hour12:false});
    const texto = `Previsão de retorno: ${retornoTxt}`;

    resEl.innerHTML = `
      <div class="card-result">
        <div class="pill">+${horas}h</div>
        <div class="title">Previsão de retorno</div>
        <div class="value">${retornoTxt}</div>
      </div>
    `;

    shareBtn.style.display = "inline-flex";
    shareBtn.onclick = ()=>{
      const msg = encodeURIComponent(texto);
      window.open("https://wa.me/?text=" + msg, "_blank");
    };
  }

  btnCalc.addEventListener("click", calcular);
  btnClear.addEventListener("click", ()=>{
    horaEl.value = "";
    resEl.innerHTML = "";
    shareBtn.style.display = "none";
  });
})();
