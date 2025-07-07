(function(){
  const state = { activeCategory: 'lower-thirds', selectedGraphic: null };
  const catButtons = document.querySelectorAll('.sidebar__item[data-cat]');
  const list = document.getElementById('graphic-list');
  function getGraphics(cat){
    // placeholder data
    return Array.from({length:5},(_,i)=>({id:cat+i,name:`${cat} ${i+1}`}));
  }
  function renderList(){
    list.innerHTML='';
    const items = getGraphics(state.activeCategory);
    items.forEach(item=>{
      const div=document.createElement('div');
      div.className='listview__item';
      div.tabIndex=0;
      div.textContent=item.name;
      div.addEventListener('click',()=>{state.selectedGraphic=item;});
      div.addEventListener('dblclick',()=>openEditDrawer(item));
      list.appendChild(div);
    });
  }
  catButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      catButtons.forEach(b=>b.classList.toggle('active',b===btn));
      state.activeCategory=btn.dataset.cat;
      renderList();
    });
  });
  function openEditDrawer(item){
    const drawer=document.getElementById('edit-drawer');
    drawer.innerHTML=`<div>Editing ${item.name} <button id="close-drawer" class="btn btn--flat">Close</button></div>`;
    drawer.classList.add('show');
    drawer.classList.remove('hidden');
    drawer.querySelector('#close-drawer').onclick=()=>{drawer.classList.remove('show');};
  }
  window.pushToast=function(msg){
    const stack=document.getElementById('toast-stack');
    const t=document.createElement('div');
    t.className='toast show';
    t.textContent=msg;
    stack.appendChild(t);
    setTimeout(()=>{t.classList.add('fade');},10);
    setTimeout(()=>{stack.removeChild(t);},3000);
  };
  function setLed(ok){
    const led=document.getElementById('conn-led');
    led.className='led '+(ok?'led--ok':'led--bad');
  }
  setLed(true);
  renderList();
})();
