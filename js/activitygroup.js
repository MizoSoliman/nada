// =================== Helpers ===================
const el = id => document.getElementById(id);

function showToast(msg, type='success'){
    const id = 't'+Date.now();
    const html = `<div id="${id}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex"><div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
    el('toastContainer').insertAdjacentHTML('beforeend', html);
    const t = new bootstrap.Toast(el(id)); t.show();
    el(id).addEventListener('hidden.bs.toast', e=>e.target.remove());
}

function escapeHtml(str){ if(!str) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

function showError(input,msg){ input.classList.add('is-invalid'); let fb=input.parentElement.querySelector('.invalid-feedback'); if(!fb){ fb=document.createElement('div'); fb.className='invalid-feedback'; input.parentElement.appendChild(fb); } fb.textContent=msg; }
function clearError(input){ input.classList.remove('is-invalid'); let fb=input.parentElement.querySelector('.invalid-feedback'); if(fb) fb.remove(); }
function clearAllErrors(modal){ modal.querySelectorAll('.is-invalid').forEach(e=>e.classList.remove('is-invalid')); modal.querySelectorAll('.invalid-feedback').forEach(e=>e.remove()); }

// =================== API ===================
const API_GROUPS = " + API_BASE + "/api/ActivityGroups";
const API_ACTIVITIES = " + API_BASE + "/api/Activities";

let groupsCache = [], filtered=[], currentPage=1, pageSize=10, sortField=null, sortDir='asc';

// Load Activities into selects
async function loadActivities(){
    try{
        const res = await fetch(API_ACTIVITIES); if(!res.ok) throw new Error();
        const acts = await res.json();
        ['addActivity','editActivity','filterActivity'].forEach(id=>{
            const sel = el(id); if(!sel) return;
            sel.innerHTML = `<option value="">${id==='filterActivity'?'All Activities':'Select activity'}</option>`;
            acts.forEach(a=>{
                const o=document.createElement('option'); o.value=a.id??a.Id; o.textContent=a.name??a.Name;
                if(a.facilityName??a.FacilityName) o.dataset.facilityName=a.facilityName??a.FacilityName;
                sel.appendChild(o);
            });
        });
    }catch(err){ console.error(err); showToast('Failed to load activities','danger'); }
}

// =================== Load & Filter Groups ===================
async function loadGroups(){
    const tbody=el('groupsTbody'); tbody.innerHTML=`<tr><td colspan="8" class="text-center py-4 small-muted">Loading...</td></tr>`;
    try{
        const res=await fetch(API_GROUPS); if(!res.ok) throw new Error();
        groupsCache=await res.json(); currentPage=1; applyFilters();
    }catch(err){ tbody.innerHTML=`<tr><td colspan="8" class="text-center text-danger py-4">Failed to load groups</td></tr>`; showToast('Failed to load groups','danger'); }
}

function applyFilters(){
    const q=(el('searchInput')?.value??'').trim().toLowerCase();
    const act=el('filterActivity')?.value??'';
    const day=el('filterDay')?.value??'';
    pageSize=Number(el('pageSize')?.value??10);
    filtered=groupsCache.filter(g=>{
        const name=(g.name??g.Name??'').toLowerCase();
        const code=(g.code??g.Code??'').toLowerCase();
        const activityName=((g.activity && (g.activity.name??g.activity.Name))??(g.activityName??g.ActivityName)??'').toLowerCase();
        const activityId=g.activityId??g.ActivityId??(g.activity?.id??g.activity?.Id);
        const dayVal=g.day??g.Day??'';
        return (!q||name.includes(q)||code.includes(q)||activityName.includes(q))
            && (!act || String(activityId)===String(act)||String(activityName)===String(act))
            && (!day || dayVal===day);
    });
    const totalPages=Math.max(1, Math.ceil(filtered.length/pageSize));
    if(currentPage>totalPages) currentPage=totalPages;
    renderTable();
}

// =================== Sorting & Pagination ===================
function getSortValue(item,field){
    switch(field){
        case 'name': return (item.name??item.Name??'').toLowerCase();
        case 'activity': return ((item.activity && (item.activity.name??item.activity.Name))??(item.activityName??item.ActivityName)??'').toLowerCase();
        case 'facility': return ((item.facility && (item.facility.name??item.facility.Name))??(item.facilityName??item.FacilityName)??'').toLowerCase();
        case 'capacity': return Number(item.capacity??item.Capacity??0);
        case 'duration': return (item.duration??item.Duration??'').toLowerCase();
        case 'day': return (item.day??item.Day??'').toLowerCase();
        case 'start': return (item.startTime??item.StartTime??'').toString();
        default: return '';
    }
}
function applySorting(list){
    if(!sortField) return list;
    const dir = sortDir==='asc'?1:-1;
    return [...list].sort((a,b)=>{
        const aV=getSortValue(a,sortField), bV=getSortValue(b,sortField);
        return aV<bV?-1*dir:aV>bV?1*dir:0;
    });
}
function getPaged(list){
    const total=list.length, totalPages=Math.max(1,Math.ceil(total/pageSize));
    if(currentPage<1) currentPage=1; if(currentPage>totalPages) currentPage=totalPages;
    const start=(currentPage-1)*pageSize;
    return {items:list.slice(start,start+pageSize),total,totalPages,start,end:Math.min(start+pageSize,total)};
}

// =================== Render Table ===================
function renderTable(){
    const tbody=el('groupsTbody'); let list=applySorting(filtered.slice());
    if(list.length===0){ tbody.innerHTML=`<tr><td colspan="8" class="text-center py-4 small-muted">No groups</td></tr>`; el('itemsInfo').textContent=''; renderPagination(0); return; }
    const p=getPaged(list); tbody.innerHTML='';
    p.items.forEach(g=>{
        const id=g.id??g.Id, name=g.name??g.Name??'', cap=g.capacity??g.Capacity??'', duration=g.duration??g.Duration??'',
            day=g.day??g.Day??'', start=g.startTime??g.StartTime??'', end=g.endTime??g.EndTime??'',
            activityName=(g.activity?.name??g.activity?.Name??g.activityName??g.ActivityName??''), facilityName=(g.facility?.name??g.facility?.Name??g.facilityName??g.FacilityName??'');
        const tr=document.createElement('tr'); tr.innerHTML=`
            <td>${escapeHtml(name)}</td><td>${escapeHtml(activityName)}</td><td>${escapeHtml(facilityName)}</td>
            <td class="text-center">${cap}</td><td class="text-center">${escapeHtml(duration)}</td>
            <td class="text-center">${escapeHtml(day)}</td><td class="text-center">${escapeHtml(start)}${start&&end?' - ':''}${escapeHtml(end)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-link text-primary edit-btn" data-id="${id}"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-link text-danger delete-btn" data-id="${id}"><i class="bi bi-trash3-fill"></i></button>
            </td>`; tbody.appendChild(tr);
    });
    el('itemsInfo').textContent=`Showing ${p.start+1}-${p.end} of ${p.total}`;
    renderPagination(p.totalPages); attachTableEvents();
}
function renderPagination(totalPages){
    const ul=el('pagination'); ul.innerHTML=''; if(totalPages===0) return;
    const makeLi=(label,disabled,fn,active=false)=>{ const li=document.createElement('li'); li.className='page-item'+(disabled?' disabled':'')+(active?' active':''); const a=document.createElement('a'); a.className='page-link pointer'; a.href='#'; a.textContent=label; if(!disabled) a.addEventListener('click', e=>{ e.preventDefault(); fn(); }); li.appendChild(a); return li; };
    ul.appendChild(makeLi('«',currentPage===1,()=>{currentPage=1; renderTable();}));
    const start=Math.max(1,currentPage-2), end=Math.min(totalPages,currentPage+2);
    for(let i=start;i<=end;i++) ul.appendChild(makeLi(i,false,()=>{currentPage=i; renderTable();},i===currentPage));
    ul.appendChild(makeLi('»',currentPage===totalPages,()=>{currentPage=totalPages; renderTable();}));
}

// =================== Edit/Delete Events ===================
function attachTableEvents(){
    document.querySelectorAll('.delete-btn').forEach(btn=>{
        btn.onclick=async()=>{ if(!confirm('Delete this group?')) return;
            try{ const res=await fetch(`${API_GROUPS}/${btn.dataset.id}`,{method:'DELETE'}); if(!res.ok) throw new Error(); showToast('Deleted','success'); await loadGroups(); }catch(e){ showToast('Delete failed','danger'); }
        };
    });
    document.querySelectorAll('.edit-btn').forEach(btn=>{
        btn.onclick=async()=>{
            try{ const res=await fetch(`${API_GROUPS}/${btn.dataset.id}`); if(!res.ok) throw new Error(); const g=await res.json();
                el('editId').value=g.id??g.Id; el('editName').value=g.name??g.Name??''; el('editCapacity').value=g.capacity??g.Capacity??'';
                el('editCode').value=g.code??g.Code??''; el('editDuration').value=g.duration??g.Duration??''; el('editDay').value=g.day??g.Day??'';
                el('editStart').value=g.startTime??g.StartTime??''; el('editEnd').value=g.endTime??g.EndTime??'';
                el('editActivity').value=g.activityId??g.ActivityId??'';
                const sel=el('editActivity').selectedOptions[0]; el('editFacilityName').value=sel?.dataset?.facilityName??'';
                new bootstrap.Modal(el('editModal')).show();
            }catch(e){ showToast('Failed to load','danger'); }
        };
    });
}

// =================== Add/Edit Handlers with Validation ===================
async function handleAdd(){
    const f={name:el('addName'),capacity:el('addCapacity'),code:el('addCode'),activity:el('addActivity'),duration:el('addDuration'),day:el('addDay'),start:el('addStart'),end:el('addEnd')};
    clearAllErrors(el('addModal')); let valid=true;
    if(!f.name.value.trim()||f.name.value.trim().length<3){ showError(f.name,'Group name ≥ 3 chars'); valid=false; }
    if(!f.capacity.value||parseInt(f.capacity.value)<1){ showError(f.capacity,'Capacity ≥ 1'); valid=false; }
    if(f.code.value&&f.code.value.trim().length<2){ showError(f.code,'Code ≥ 2 chars'); valid=false; }
    if(!f.activity.value){ showError(f.activity,'Select activity'); valid=false; }
    if(!f.duration.value){ showError(f.duration,'Select duration'); valid=false; }
    if(!f.day.value){ showError(f.day,'Select day'); valid=false; }
    if(!f.start.value){ showError(f.start,'Start time required'); valid=false; }
    if(!f.end.value){ showError(f.end,'End time required'); valid=false; }
    if(f.start.value&&f.end.value&&f.start.value>=f.end.value){ showError(f.end,'End > Start'); valid=false; }
    if(!valid) return;
    try{ const res=await fetch(API_GROUPS,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({Name:f.name.value.trim(),Capacity:+f.capacity.value,Code:f.code.value.trim()||null,ActivityId:+f.activity.value,Duration:f.duration.value,Day:f.day.value,StartTime:f.start.value,EndTime:f.end.value})}); if(!res.ok) throw new Error(); bootstrap.Modal.getInstance(el('addModal')).hide(); f.name.form.reset(); showToast('Added','success'); await loadGroups(); }catch(e){ showToast('Add failed','danger'); }
}
async function handleEdit(){
    const f={name:el('editName'),capacity:el('editCapacity'),code:el('editCode'),activity:el('editActivity'),duration:el('editDuration'),day:el('editDay'),start:el('editStart'),end:el('editEnd')};
    clearAllErrors(el('editModal')); let valid=true;
    if(!f.name.value.trim()||f.name.value.trim().length<3){ showError(f.name,'Group name ≥ 3 chars'); valid=false; }
    if(!f.capacity.value||parseInt(f.capacity.value)<1){ showError(f.capacity,'Capacity ≥ 1'); valid=false; }
    if(f.code.value&&f.code.value.trim().length<2){ showError(f.code,'Code ≥ 2 chars'); valid=false; }
    if(!f.activity.value){ showError(f.activity,'Select activity'); valid=false; }
    if(!f.duration.value){ showError(f.duration,'Select duration'); valid=false; }
    if(!f.day.value){ showError(f.day,'Select day'); valid=false; }
    if(!f.start.value){ showError(f.start,'Start time required'); valid=false; }
    if(!f.end.value){ showError(f.end,'End time required'); valid=false; }
    if(f.start.value&&f.end.value&&f.start.value>=f.end.value){ showError(f.end,'End > Start'); valid=false; }
    if(!valid) return;
    try{ const id=el('editId').value;
        const res=await fetch(`${API_GROUPS}/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({Name:f.name.value.trim(),Capacity:+f.capacity.value,Code:f.code.value.trim()||null,ActivityId:+f.activity.value,Duration:f.duration.value,Day:f.day.value,StartTime:f.start.value,EndTime:f.end.value})}); if(!res.ok) throw new Error(); bootstrap.Modal.getInstance(el('editModal')).hide(); showToast('Updated','success'); await loadGroups();
    }catch(e){ showToast('Edit failed','danger'); }
}

// =================== Wire UI ===================
function wireUI(){
    el('addSaveBtn').addEventListener('click',handleAdd);
    el('editSaveBtn').addEventListener('click',handleEdit);
    el('refreshBtn')?.addEventListener('click',async()=>{ await loadActivities(); await loadGroups(); showToast('Refreshed','success'); });
    ['searchInput','filterActivity','filterDay'].forEach(id=>el(id)?.addEventListener('input',()=>{ currentPage=1; applyFilters(); }));
    el('pageSize')?.addEventListener('change',()=>{ pageSize=+el('pageSize').value; currentPage=1; renderTable(); });
    el('clearFilters')?.addEventListener('click',()=>{ el('searchInput').value=''; el('filterActivity').value=''; el('filterDay').value=''; pageSize=10; currentPage=1; applyFilters(); });
    // Sorting headers
    document.querySelectorAll('th.sortable').forEach(th=>th.addEventListener('click',()=>{ const f=th.dataset.field; sortField===f?sortDir=sortDir==='asc'?'desc':'asc':(sortField=f,sortDir='asc'); document.querySelectorAll('th.sortable').forEach(t=>t.classList.remove('asc','desc')); th.classList.add(sortDir); renderTable(); }));
}

// =================== Init ===================
(async function init(){ try{ await loadActivities(); wireUI(); await loadGroups(); }catch(e){ showToast('Initialization failed','danger'); } })();
