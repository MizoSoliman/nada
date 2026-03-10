/* ================== CONFIG ================== */
const apiUrl = API_BASE + "/api/Facilities";
const categoriesApi = API_BASE + "/api/FacilityCategories";

/* ================== STATE ================== */
let categories = [];
let facilities = [];
let filtered = [];
let currentPage = 1;
let pageSize = parseInt(document.getElementById('pageSize').value, 10);

/* ================== HELPERS ================== */
function showToast(message, type='success', title='') {
  const id = 't'+Date.now();
  const html = `<div id="${id}" class="toast align-items-center text-white ${type==='success'?'bg-success':'bg-danger'} border-0" role="alert">
    <div class="d-flex">
      <div class="toast-body">${title?('<strong>'+title+'</strong><br/>'):''}${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  </div>`;
  document.getElementById('toastContainer').insertAdjacentHTML('beforeend', html);
  const t = new bootstrap.Toast(document.getElementById(id), { delay: 3000 });
  t.show();
  document.getElementById(id).addEventListener('hidden.bs.toast', e=>e.target.remove());
}

function fixUrl(url){ return resolveUrl(url); }
function escapeHtml(str){ return str? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;') : ''; }
function renderSkeletonRows(cols=7, rows=6){
  const tbody = document.getElementById('facilitiesTable');
  tbody.innerHTML = '';
  for(let r=0;r<rows;r++){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${cols}"><div class="d-flex gap-3 align-items-center p-2">` +
      Array.from({length:5}).map(()=>`<div style="flex:1"><div class="skeleton" style="height:14px;margin-bottom:8px"></div></div>`).join('') +
      `</div></td>`;
    tbody.appendChild(tr);
  }
}

/* ================== LOAD CATEGORIES ================== */
async function loadCategories(force=false){
  if(categories.length>0 && !force){ populateCategoryOptions(); return; }
  try{
    const res = await fetch(categoriesApi);
    if(!res.ok) throw new Error('Failed to load categories');
    categories = await res.json();
    populateCategoryOptions();
  }catch(err){
    console.error(err);
    ['addCategorySelect','editCategorySelect','categoryFilter'].forEach(id=>document.getElementById(id).innerHTML='<option disabled>Failed to load</option>');
    showToast('Failed loading categories','error');
  }
}

function populateCategoryOptions(){
  const options = categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('addCategorySelect').innerHTML = '<option value="">Select category</option>' + options;
  document.getElementById('editCategorySelect').innerHTML = '<option value="">Select category</option>' + options;
  document.getElementById('categoryFilter').innerHTML = '<option value="">All categories</option>' + options;
}

/* ================== LOAD FACILITIES ================== */
async function loadFacilities(){
  renderSkeletonRows();
  try{
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('Failed to load facilities');
    facilities = await res.json();
    currentPage = 1;
    applyFilters();
  }catch(err){
    console.error(err);
    document.getElementById('facilitiesTable').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load</td></tr>';
    showToast('Failed to load facilities','error');
  }
}

/* ================== FILTER + SORT + PAGINATION ================== */
function applyFilters(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const cat = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;
  pageSize = parseInt(document.getElementById('pageSize').value,10);
  const sortBy = document.getElementById('sortBy').value;

  filtered = facilities.filter(f=>{
    const matchSearch = !q || [f.name,f.description,f.facilityCategoryName].some(t=>t?.toLowerCase().includes(q));
    const matchCategory = !cat || String(f.facilityCategoryId) === cat;
    const matchStatus = !status || String(f.status) === status;
    return matchSearch && matchCategory && matchStatus;
  });

  filtered.sort((a,b)=>{
    switch(sortBy){
      case 'name_asc': return (a.name||'').localeCompare(b.name||'');
      case 'name_desc': return (b.name||'').localeCompare(a.name||'');
      case 'capacity_asc': return (a.capacity||0)-(b.capacity||0);
      case 'capacity_desc': return (b.capacity||0)-(a.capacity||0);
      default: return 0;
    }
  });

  renderPage(currentPage);
}

function renderPage(page){
  const tbody = document.getElementById('facilitiesTable'); tbody.innerHTML='';
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total/pageSize));
  if(page<1) page=1; if(page>totalPages) page=totalPages; currentPage=page;

  const start = (page-1)*pageSize;
  const end = Math.min(start+pageSize,total);
  const items = filtered.slice(start,end);

  if(items.length===0) tbody.innerHTML=`<tr><td colspan="7" class="text-center">No results</td></tr>`;
  else items.forEach(f=>{
    const imageHtml = f.imageUrl?`<img src="${fixUrl(f.imageUrl)}" class="facility-img">`:'<span class="text-muted">No image</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.description||'')}</td>
      <td>${escapeHtml(f.facilityCategoryName||'')}</td>
      <td class="text-center">${f.capacity??''}</td>
      <td class="text-center"><span class="badge ${f.status==='Active'?'bg-success':'bg-warning'} rounded-pill px-3 py-2">${escapeHtml(f.status||'')}</span></td>
      <td class="text-center">${imageHtml}</td>
      <td class="text-center">
        <button class="btn btn-link text-primary me-2 edit-btn" data-id="${f.id}"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-link text-danger delete-btn" data-id="${f.id}"><i class="bi bi-trash3-fill"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('itemsInfo').textContent = `Showing ${start+1}-${end} of ${total}`;
  renderPagination(totalPages);
  attachRowListeners();
}

function renderPagination(totalPages){
  const ul = document.getElementById('pagination'); ul.innerHTML='';
  const makeLi = (label,disabled,fn,active=false)=>{
    const li=document.createElement('li');
    li.className='page-item'+(disabled?' disabled':'')+(active?' active':'');
    li.innerHTML=`<a class="page-link" href="#">${label}</a>`;
    if(!disabled) li.onclick=e=>{e.preventDefault();fn();};
    return li;
  };
  ul.appendChild(makeLi('«',currentPage===1,()=>renderPage(1)));
  const start=Math.max(1,currentPage-2),end=Math.min(totalPages,currentPage+2);
  for(let i=start;i<=end;i++) ul.appendChild(makeLi(i,false,()=>renderPage(i),i===currentPage));
  ul.appendChild(makeLi('»',currentPage===totalPages,()=>renderPage(totalPages)));
}

/* ================== ROW HANDLERS ================== */
function attachRowListeners(){
  document.querySelectorAll('.edit-btn').forEach(btn=>btn.onclick=()=>openEditModal(btn.dataset.id));
  document.querySelectorAll('.delete-btn').forEach(btn=>btn.onclick=()=>deleteFacility(btn.dataset.id));
}

/* ================== CRUD ================== */
async function openEditModal(id){
  try{
    const res = await fetch(`${apiUrl}/${id}`); if(!res.ok) throw new Error();
    const f = await res.json();
    const form = document.getElementById('editFacilityForm');
    form.id.value=f.id; form.name.value=f.name||''; form.description.value=f.description||'';
    form.capacity.value=f.capacity||''; form.status.value=f.status||'Active'; form.facilityCategoryId.value=f.facilityCategoryId||'';
    const preview = document.getElementById('editImagePreview');
    if(f.imageUrl){ preview.src=fixUrl(f.imageUrl); preview.style.display='block'; } else preview.style.display='none';
    new bootstrap.Modal(document.getElementById('editFacilityModal')).show();
  }catch(err){ console.error(err); showToast('Failed to load facility','error'); }
}

async function deleteFacility(id){
  Swal.fire({
    title:'Are you sure?', text:'This facility will be permanently deleted.', icon:'warning',
    showCancelButton:true, confirmButtonColor:'#d33', cancelButtonColor:'#3085d6',
    confirmButtonText:'Yes, delete it', cancelButtonText:'Cancel'
  }).then(async r=>{ if(r.isConfirmed){
    try{ const res=await fetch(`${apiUrl}/${id}`,{method:'DELETE'}); if(!res.ok) throw new Error(); showToast('Deleted successfully'); await loadFacilities(); }
    catch(e){ console.error(e); showToast('Failed to delete','error'); }
  }});
}

async function saveForm(formId,modalId,url,method){
  const form=document.getElementById(formId);
  let valid=true;
  form.querySelectorAll('.form-control[required], .form-select[required]').forEach(f=>{if(!f.checkValidity()){f.classList.add('is-invalid');valid=false;}else{f.classList.remove('is-invalid');}});
  if(!valid) return;
  const fd=new FormData(form);
  try{ const res=await fetch(url,{method,body:fd}); if(!res.ok){const txt=await res.text();throw new Error(txt||'Failed');}
    showToast(method==='POST'?'Facility added':'Updated successfully');
    bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
    await loadFacilities();
  }catch(err){ console.error(err); showToast('Failed','error'); alert(err.message);}
}

/* ================== IMAGE PREVIEWS ================== */
function setupImagePreview(inputId,previewId){
  const input=document.getElementById(inputId);
  const preview=document.getElementById(previewId);
  input.onchange=e=>{
    if(e.target.files && e.target.files[0]){ preview.src=URL.createObjectURL(e.target.files[0]); preview.style.display='block'; }
    else { preview.src=''; preview.style.display='none'; }
  };
}
setupImagePreview('addImageInput','addImagePreview');
setupImagePreview('editImageInput','editImagePreview');

/* ================== CONTROLS ================== */
document.getElementById('openAddModalBtn').onclick=async()=>{
  await loadCategories(); document.getElementById('addFacilityForm').reset(); document.getElementById('addImagePreview').style.display='none';
  new bootstrap.Modal(document.getElementById('addFacilityModal')).show();
};
document.getElementById('saveAddBtn').onclick=()=>saveForm('addFacilityForm','addFacilityModal',apiUrl,'POST');
document.getElementById('saveEditBtn').onclick=()=>saveForm('editFacilityForm','editFacilityModal',`${apiUrl}/${document.getElementById('editFacilityForm').id.value}`,'PUT');

['searchInput','categoryFilter','statusFilter','sortBy'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{clearTimeout(window.__t);window.__t=setTimeout(applyFilters,220);}));
document.getElementById('pageSize').addEventListener('change',()=>{currentPage=1;applyFilters();});
document.getElementById('refreshBtn').addEventListener('click',async()=>{await loadCategories(true);await loadFacilities();});

/* ================== THEME ================== */
const themeToggle=document.getElementById('themeToggle');
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);localStorage.setItem('theme',t);themeToggle.innerHTML=t==='dark'?'<i class="bi bi-sun-fill"></i>':'<i class="bi bi-moon-stars"></i>';}
themeToggle.onclick=()=>applyTheme(localStorage.getItem('theme')==='dark'?'light':'dark');
applyTheme(localStorage.getItem('theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

/* ================== INIT ================== */
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadCategories(); await loadFacilities();
});
