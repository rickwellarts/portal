// assets/admin_nav.js — alternância entre paineis do admin por hash
export function bindAdminHashNav(root=document){
  const sections = ['noticias','tokens','relatorios','extrap','usuarios','portal'];
  const map = {};
  sections.forEach(id => { map[id] = root.querySelector(`#sec-${id}`); });

  function show(target){
    Object.values(map).forEach(el => el && (el.style.display="none"));
    (map[target]||map['noticias']).style.display = "";
    document.querySelectorAll('.admin-tabs .btn, .admin-tabs a').forEach(a=>{
      a.classList.toggle('active', a.getAttribute('href')==='#'+target);
    });
  }
  function sync(){ 
    const h = (location.hash||'').replace('#',''); 
    show(sections.includes(h)? h : 'noticias'); 
  }
  window.addEventListener('hashchange', sync);
  sync();
}
