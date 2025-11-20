// API_GATEWAY_URL populated from the latest deploy. Do not change unless redeploying.
const API_BASE = 'https://fdndyqxz7c.execute-api.us-east-1.amazonaws.com/dev'; // ServiceEndpoint from Serverless deploy

// Elements
const form = document.getElementById('todo-form');
const titleInput = document.getElementById('title');
const todosList = document.getElementById('todos');
const banner = document.getElementById('banner');
const loader = document.getElementById('loader');
const empty = document.getElementById('empty');
const filters = document.querySelectorAll('.filter');
const template = document.getElementById('todo-template');

let todos = [];
let currentFilter = 'all';

function showLoader(show){
  loader.hidden = !show;
  loader.setAttribute('aria-hidden', String(!show));
}

function showBanner(message, type='info', timeout=3000){
  banner.textContent = message;
  banner.className = 'banner show ' + (type||'');
  banner.hidden = false;
  if(timeout>0) setTimeout(()=>{banner.hidden=true;}, timeout);
}

async function api(path, opts={}){
  const url = API_BASE + path;
  try{
    const res = await fetch(url, opts);
    if(res.status>=400){
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    if(res.status===204) return null;
    return await res.json();
  }catch(err){
    console.error('API error', err);
    throw err;
  }
}

async function load(){
  showLoader(true);
  try{
    todos = await api('/todos');
    renderList();
  }catch(err){
    showBanner('Failed to load todos — check console', 'error', 5000);
  }finally{
    showLoader(false);
  }
}

function renderList(){
  todosList.innerHTML='';
  const visible = todos.filter(t=>{
    if(currentFilter==='active') return !t.completed;
    if(currentFilter==='completed') return !!t.completed;
    return true;
  });
  if(visible.length===0){ empty.hidden=false; } else { empty.hidden=true; }
  visible.forEach(renderTodo);
}

function renderTodo(todo){
  const node = template.content.cloneNode(true);
  const li = node.querySelector('.todo-item');
  li.dataset.id = todo.id;
  const title = li.querySelector('.title');
  const titleEdit = li.querySelector('.title-edit');
  const editBtn = li.querySelector('.edit');
  const delBtn = li.querySelector('.delete');

  title.textContent = todo.title;
  if(todo.completed) title.classList.add('done'); else title.classList.remove('done');

  editBtn.addEventListener('click', ()=>{
    li.classList.add('editing');
    titleEdit.value = todo.title;
    titleEdit.style.display='block';
    title.style.display='none';
    titleEdit.focus();
  });

  titleEdit.addEventListener('keydown', async (e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      await finishEdit(todo, titleEdit, title);
    } else if(e.key==='Escape'){
      li.classList.remove('editing');
      titleEdit.style.display='none'; title.style.display='block';
    }
  });

  titleEdit.addEventListener('blur', async ()=>{
    if(li.classList.contains('editing')) await finishEdit(todo, titleEdit, title);
  });

  delBtn.addEventListener('click', async ()=>{
    const ok = confirm('Delete this todo?');
    if(!ok) return;
    const previous = todos.slice();
    todos = todos.filter(t=>t.id !== todo.id);
    renderList();
    try{
      await api('/todos/'+todo.id, {method:'DELETE'});
      showBanner('Deleted');
    }catch(e){
      todos = previous; renderList(); showBanner('Delete failed','error');
    }
  });

  todosList.appendChild(node);
}

function updateLocal(updated){
  todos = todos.map(t=> t.id===updated.id ? updated : t);
  renderList();
}

async function finishEdit(todo, inputEl, titleEl){
  const val = inputEl.value.trim();
  const prev = todo.title;
  if(val.length===0){
    showBanner('Title cannot be empty','error');
    inputEl.focus(); return;
  }
  if(val===prev){
    // nothing changed
    inputEl.style.display='none'; titleEl.style.display='block';
    return;
  }
  todo.title = val; updateLocal(todo);
  inputEl.style.display='none'; titleEl.style.display='block';
  try{
    await api('/todos/'+todo.id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:val})});
    showBanner('Saved');
  }catch(e){
    todo.title = prev; updateLocal(todo); showBanner('Save failed','error');
  }
}

async function createTodo(title){
  try{
    const item = await api('/todos', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title})});
    todos.unshift(item);
    renderList();
    titleInput.value='';
    showBanner('Added');
  }catch(e){
    showBanner('Create failed','error');
  }
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const title = titleInput.value.trim();
  if(!title) return;
  createTodo(title);
});

filters.forEach(btn=>btn.addEventListener('click', ()=>{
  filters.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderList();
}));

// init
if(!API_BASE || API_BASE.includes('<API_GATEWAY_URL>')){
  document.getElementById('app').innerHTML = '<div style="padding:24px;color:crimson">API not configured — set API_BASE in app.js</div>';
} else {
  load();
}
