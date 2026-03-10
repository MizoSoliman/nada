const apiUrl = API_BASE + "/api/Activities";
const facilitiesApiUrl = API_BASE + "/api/Facilities";

let facilitiesData = [];
let activitiesData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let sortBy = 'name_asc';

/* ------------------ TOAST ------------------ */
function showToast(message, type='success', title=''){
  const id = 't'+Date.now();
  const html = `<div id="${id}" class="toast align-items-center text-white ${type==='success'?'bg-success':'bg-danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex">
      <div class="toast-body">${title?'<strong>'+title+'</strong><br/>':''}${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  </div>`;
  document.getElementById('toastContainer').insertAdjacentHTML('beforeend', html);
  const t = new bootstrap.Toast(document.getElementById(id), { delay: 3500 });
  t.show();
  document.getElementById(id).addEventListener('hidden.bs.toast', e => e.target.remove());
}

/* ------------------ HELPERS ------------------ */
function fixUrl(url){ return resolveUrl(url); }
function escapeHtml(unsafe){ if(!unsafe) return ''; return unsafe.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function renderSkeletonRows(cols=7, rows=6){
  const tbody = document.getElementById('activitiesTable'); tbody.innerHTML='';
  for(let r=0;r<rows;r++){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${cols}"><div class="d-flex gap-3 align-items-center p-2">` + 
      Array.from({length:5}).map(()=>'<div style="flex:1"><div class="skeleton line"></div></div>').join('') + 
      '</div></td>';
    tbody.appendChild(tr);
  }
}

/* ------------------ LOAD FACILITIES ------------------ */
async function loadFacilities(force=false){
  if(facilitiesData.length>0 && !force){ populateFacilityOptions(); return; }
  try{
    const res = await fetch(facilitiesApiUrl);
    if(!res.ok) throw new Error('Failed to load facilities');
    facilitiesData = await res.json();
    populateFacilityOptions();
  }catch(err){
    console.error(err);
    ['addFacilitySelect','editFacilitySelect','facilityFilter'].forEach(id=> document.getElementById(id).innerHTML = '<option disabled>Failed to load</option>');
    showToast('Failed to load facilities','error');
  }
}

function populateFacilityOptions(){
  const addSelect = document.getElementById('addFacilitySelect');
  const editSelect = document.getElementById('editFacilitySelect');
  const filter = document.getElementById('facilityFilter');
  const options = facilitiesData.map(f=>`<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  addSelect.innerHTML = '<option value="">Select facility</option>' + options;
  editSelect.innerHTML = '<option value="">Select facility</option>' + options;
  filter.innerHTML = '<option value="">All Facilities</option>' + options;
}

/* ------------------ LOAD ACTIVITIES ------------------ */
async function loadActivities(){
  renderSkeletonRows();
  try{
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('Failed to load activities');
    activitiesData = await res.json();
    currentPage = 1;
    applyFiltersAndRender();
  }catch(err){
    console.error(err);
    document.getElementById('activitiesTable').innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load</td></tr>`;
    showToast('Failed to load activities','error');
  }
}

/* ------------------ FILTER & SORT ------------------ */
function applyFiltersAndRender(){
  const q = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const facilityId = document.getElementById('facilityFilter')?.value;
  const status = document.getElementById('statusFilter')?.value;
  pageSize = parseInt(document.getElementById('pageSize')?.value || '10', 10);
  sortBy = document.getElementById('sortBy')?.value || 'name_asc';

  filteredData = activitiesData.filter(a=>{
    const matchSearch = q === '' || (a.name && a.name.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q));
    const matchFacility = !facilityId || String(a.facilityId) === String(facilityId);
    const matchStatus = !status || (a.status && String(a.status) === String(status));
    return matchSearch && matchFacility && matchStatus;
  });

  filteredData.sort((x,y)=>{
    switch(sortBy){
      case 'name_asc': return (x.name||'').localeCompare(y.name||'');
      case 'name_desc': return (y.name||'').localeCompare(x.name||'');
      case 'price_asc': return (Number(x.price)||0) - (Number(y.price)||0);
      case 'price_desc': return (Number(y.price)||0) - (Number(x.price)||0);
      default: return 0;
    }
  });

  renderTablePage(currentPage);
}

/* ------------------ RENDER TABLE ------------------ */
function renderTablePage(page){
  const tbody = document.getElementById('activitiesTable'); tbody.innerHTML='';
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if(page<1) page=1; if(page>totalPages) page=totalPages; currentPage=page;

  const start = (page-1)*pageSize; const end = Math.min(start+pageSize,total);
  const pageItems = filteredData.slice(start,end);

  if(pageItems.length===0){ tbody.innerHTML=`<tr><td colspan="7" class="text-center">No results</td></tr>`; }
  else {
    pageItems.forEach(act=>{
      const facilityName = facilitiesData.find(f=>f.id===act.facilityId)?.name || '';
      const imageHtml = act.imageUrl?`<img src="${fixUrl(act.imageUrl)}" class="activity-img">`:'<span class="text-muted">No Image</span>';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(act.name)}</td>
        <td>${escapeHtml(act.description||'')}</td>
        <td class="text-center rtl-fix">${act.price ?? ''}</td>
        <td class="text-center">${escapeHtml(facilityName)}</td>
        <td class="text-center"><span class="badge bg-secondary">${escapeHtml(act.status||'')}</span></td>
        <td class="text-center">${imageHtml}</td>
        <td class="text-center">
          <button class="btn btn-link text-primary me-2 edit-btn" data-id="${act.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-link text-danger delete-btn" data-id="${act.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('itemsInfo').textContent = `Showing ${total===0?0:start+1}-${end} of ${total} items`;
  renderPagination(totalPages);
}

/* ------------------ PAGINATION ------------------ */
function renderPagination(totalPages){
  const ul = document.getElementById('pagination'); ul.innerHTML='';
  function li(label, disabled, onClick, active=false){
    const li = document.createElement('li');
    li.className = 'page-item' + (disabled?' disabled':'') + (active?' active':'');
    li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
    if(!disabled) li.onclick = e=>{ e.preventDefault(); onClick(); };
    return li;
  }
  ul.appendChild(li('«', currentPage===1, ()=>renderTablePage(1)));
  const start = Math.max(1, currentPage-2); const end = Math.min(totalPages, currentPage+2);
  for(let i=start;i<=end;i++) ul.appendChild(li(i,false,()=>renderTablePage(i),i===currentPage));
  ul.appendChild(li('»', currentPage===totalPages, ()=>renderTablePage(totalPages)));
}

/* ------------------ EVENT DELEGATION ------------------ */
document.getElementById('activitiesTable').addEventListener('click', async e=>{
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if(editBtn) openEditModal(editBtn.dataset.id);
  if(deleteBtn) deleteActivity(deleteBtn.dataset.id);
});

/* ------------------ OPEN & DELETE ------------------ */
async function openEditModal(id){
  try{
    const res = await fetch(`${apiUrl}/${id}`);
    if(!res.ok) throw new Error('Failed to fetch activity');
    const act = await res.json();
    const form = document.getElementById('editActivityForm');
    form.id.value = act.id;
    form.name.value = act.name || '';
    form.description.value = act.description || '';
    form.price.value = act.price ?? '';
    form.facilityId.value = act.facilityId || '';
    form.status.value = act.status || 'Active';
    const preview = document.getElementById('editImagePreview');
    if(act.imageUrl){ preview.src = fixUrl(act.imageUrl); preview.style.display='block'; }
    else preview.style.display='none';
    new bootstrap.Modal(document.getElementById('editActivityModal')).show();
  }catch(err){ console.error(err); showToast('Failed to fetch activity','error'); }
}

async function deleteActivity(id){
  Swal.fire({
    title:'Are you sure?', text:'This activity will be permanently deleted.', icon:'warning',
    showCancelButton:true, confirmButtonColor:'#d33', cancelButtonColor:'#3085d6',
    confirmButtonText:'Yes, delete it', cancelButtonText:'Cancel'
  }).then(async result=>{
    if(result.isConfirmed){
      try{
        const res = await fetch(`${apiUrl}/${id}`, { method:'DELETE' });
        if(!res.ok) throw new Error('Delete failed');
        showToast('Deleted successfully');
        await loadActivities();
      }catch(err){ console.error(err); showToast('Delete failed','error'); }
    }
  });
}

/* ------------------ IMAGE PREVIEW ------------------ */
function previewImage(inputEl, previewEl){
  if(inputEl.files && inputEl.files[0]){
    previewEl.src = URL.createObjectURL(inputEl.files[0]);
    previewEl.style.display='block';
  } else {
    previewEl.src = '';
    previewEl.style.display='none';
  }
}
document.getElementById('addImageInput').onchange = e => previewImage(e.target, document.getElementById('addImagePreview'));
document.getElementById('editImageInput').onchange = e => previewImage(e.target, document.getElementById('editImagePreview'));

//* ------------------ VALIDATION ------------------ */
function validateForm(form){
  let valid = true;
  form.querySelectorAll('input, textarea, select').forEach(f=>{
    f.setAttribute('required','true'); // نجعل كل الحقول required
    if(!f.checkValidity()){ 
      f.classList.add('is-invalid'); 
      valid=false; 
    } else {
      f.classList.remove('is-invalid');
    }
  });
  return valid;
}
/* ------------------ REAL-TIME VALIDATION ------------------ */
function setupRealtimeValidation(form){
  form.querySelectorAll('input, textarea, select').forEach(f=>{
    f.addEventListener('input', ()=>{ 
      if(f.checkValidity()) f.classList.remove('is-invalid'); 
    });
    f.addEventListener('change', ()=>{ 
      if(f.checkValidity()) f.classList.remove('is-invalid'); 
    });
  });
}
/* ------------------ ADD ACTIVITY ------------------ */
document.getElementById('openAddModalBtn').onclick = async ()=>{
  await loadFacilities();
  const form = document.getElementById('addActivityForm'); 
  form.reset();
  document.getElementById('addImagePreview').style.display='none';
  setupRealtimeValidation(form); // نطبق الـ realtime validation
  new bootstrap.Modal(document.getElementById('addActivityModal')).show();
};

document.getElementById('saveAddBtn').onclick = async ()=>{
  const form = document.getElementById('addActivityForm');
  if(!validateForm(form)) return;
  const formData = new FormData(form);
  try{
    const res = await fetch(apiUrl, { method:'POST', body: formData });
    if(!res.ok) throw new Error(await res.text() || 'Save failed');
    showToast('Added successfully');
    bootstrap.Modal.getInstance(document.getElementById('addActivityModal')).hide();
    await loadActivities();
  }catch(err){ console.error(err); showToast('Add failed','error'); alert(err.message); }
};

/* ------------------ EDIT ACTIVITY ------------------ */
document.getElementById('saveEditBtn').onclick = async ()=>{
  const form = document.getElementById('editActivityForm');
  const id = form.id.value; if(!id) return;
  setupRealtimeValidation(form); // نطبق الـ realtime validation
  if(!validateForm(form)) return;
  const formData = new FormData(form);
  try{
    const res = await fetch(`${apiUrl}/${id}`, { method:'PUT', body: formData });
    if(!res.ok) throw new Error(await res.text() || 'Update failed');
    showToast('Updated successfully');
    bootstrap.Modal.getInstance(document.getElementById('editActivityModal')).hide();
    await loadActivities();
  }catch(err){ console.error(err); showToast('Update failed','error'); alert(err.message); }
};
/* ------------------ IMAGE PREVIEW ------------------ */
function previewImage(inputEl, previewEl){
  if(inputEl.files && inputEl.files[0]){
    previewEl.src = URL.createObjectURL(inputEl.files[0]);
    previewEl.style.display='block';
  } else {
    previewEl.src = '';
    previewEl.style.display='none';
  }
}
document.getElementById('addImageInput').onchange = e => previewImage(e.target, document.getElementById('addImagePreview'));
document.getElementById('editImageInput').onchange = e => previewImage(e.target, document.getElementById('editImagePreview'));

/* ------------------ FILTER/SEARCH/PAGE EVENTS ------------------ */
document.getElementById('searchInput').addEventListener('input', ()=>{
  clearTimeout(window.__searchTimeout);
  window.__searchTimeout = setTimeout(applyFiltersAndRender, 250);
});
document.getElementById('facilityFilter').addEventListener('change', applyFiltersAndRender);
document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
document.getElementById('sortBy').addEventListener('change', applyFiltersAndRender);
document.getElementById('pageSize').addEventListener('change', ()=>{ currentPage=1; applyFiltersAndRender(); });
document.getElementById('refreshBtn').addEventListener('click', async ()=>{
  await loadFacilities(true);
  await loadActivities();
});

/* ------------------ THEME TOGGLE ------------------ */
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  localStorage.setItem('theme',theme);
  themeToggle.innerHTML = theme==='dark'?'<i class="bi bi-sun-fill"></i>':'<i class="bi bi-moon-stars"></i>';
}
themeToggle.onclick = ()=>applyTheme(localStorage.getItem('theme')==='dark'?'light':'dark');
applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));

/* ------------------ INIT ------------------ */
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadFacilities();
  await loadActivities();
});
