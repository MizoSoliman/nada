const apiUrl = 'http://clublywebsite.runasp.net/api/Trainers';
const activitiesApiUrl = 'http://clublywebsite.runasp.net/api/Trainers/activities';
let activitiesList = [];
let trainersData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = parseInt(document.getElementById('pageSize').value,10);

/* Helpers */
function showToast(msg, type='success', title=''){
  const id = 't'+Date.now();
  const html = `<div id="${id}" class="toast align-items-center text-white ${type==='success'?'bg-success':'bg-danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${title?'<strong>'+title+'</strong><br/>':''}${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
  document.getElementById('toastContainer').insertAdjacentHTML('beforeend', html);
  const t = new bootstrap.Toast(document.getElementById(id), { delay: 3200 }); t.show();
  document.getElementById(id).addEventListener('hidden.bs.toast', e=> e.target.remove());
}
function fixUrl(url){ if(!url) return ''; return resolveUrl(url); }
function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function renderSkeleton(){ const tbody = document.getElementById('trainersTable'); tbody.innerHTML=''; for(let i=0;i<6;i++){ const tr = document.createElement('tr'); tr.innerHTML = '<td colspan="7"><div class="d-flex gap-3 align-items-center p-2">'+Array.from({length:5}).map(()=>'<div style="flex:1"><div class="skeleton" style="height:14px;margin-bottom:8px"></div></div>').join('')+'</div></td>'; tbody.appendChild(tr); } }

/* Load activities (for multi-select) */
async function loadActivities(force=false){ const add = document.getElementById('addActivitiesSelect'); const edit = document.getElementById('editActivitiesSelect'); const filter = document.getElementById('activityFilter'); if(activitiesList.length>0 && !force){ populateActivityOptions(); return; }
  try{ const res = await fetch(activitiesApiUrl); if(!res.ok) throw new Error('Failed to load activities'); activitiesList = await res.json(); populateActivityOptions(); }catch(err){ add.innerHTML='<option disabled>Failed</option>'; edit.innerHTML='<option disabled>Failed</option>'; filter.innerHTML='<option disabled>Failed</option>'; console.error(err); showToast('Failed loading activities','error'); }
}
function populateActivityOptions(){ const add = document.getElementById('addActivitiesSelect'); const edit = document.getElementById('editActivitiesSelect'); const filter = document.getElementById('activityFilter'); const opts = activitiesList.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join(''); add.innerHTML = opts; edit.innerHTML = opts; filter.innerHTML = '<option value="">All activities</option>' + activitiesList.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join(''); }

/* Load trainers */
async function loadTrainers(){ renderSkeleton(); try{ const res = await fetch(apiUrl); if(!res.ok) throw new Error('Failed to load trainers'); trainersData = await res.json(); currentPage = 1; applyFilters(); }catch(err){ console.error(err); document.getElementById('trainersTable').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load</td></tr>'; showToast('Failed to load trainers','error'); } }

function applyFilters(){ const q = document.getElementById('searchInput').value.trim().toLowerCase(); const actFilter = document.getElementById('activityFilter').value; const gender = document.getElementById('genderFilter').value; const status = document.getElementById('statusFilter').value; pageSize = parseInt(document.getElementById('pageSize').value,10); const sortBy = document.getElementById('sortBy').value;
  filteredData = trainersData.filter(t=>{
    const matchSearch = q==='' || (t.fullName && t.fullName.toLowerCase().includes(q)) || (t.email && t.email.toLowerCase().includes(q)) || (t.activities && t.activities.toLowerCase().includes(q));
    const matchActivity = !actFilter || (t.activities && t.activities.split(',').map(x=>x.trim()).some(nameOrId=> nameOrId==actFilter || nameOrId.toLowerCase().includes(actFilter)));
    const matchGender = !gender || (t.gender && String(t.gender) === gender);
    const matchStatus = !status || String(t.isActive) === status;
    return matchSearch && matchActivity && matchGender && matchStatus;
  });
  // sort
  filteredData.sort((a,b)=>{
    switch(sortBy){ case 'name_asc': return (a.fullName||'').localeCompare(b.fullName||''); case 'name_desc': return (b.fullName||'').localeCompare(a.fullName||''); case 'exp_asc': return (Number(a.yearsOfExperience)||0) - (Number(b.yearsOfExperience)||0); case 'exp_desc': return (Number(b.yearsOfExperience)||0) - (Number(a.yearsOfExperience)||0); default: return 0; }
  });
  renderPage(currentPage);
}

function renderPage(page){ const tbody = document.getElementById('trainersTable'); tbody.innerHTML=''; const total = filteredData.length; const totalPages = Math.max(1, Math.ceil(total/pageSize)); if(page<1) page=1; if(page>totalPages) page=totalPages; currentPage = page; const start=(page-1)*pageSize; const end=Math.min(start+pageSize, total); const items = filteredData.slice(start,end);
  if(items.length===0){ tbody.innerHTML = '<tr><td colspan="7" class="text-center">No results</td></tr>'; }
  else { items.forEach(t=>{
      const activitiesText = t.activities ? escapeHtml(t.activities) : '';
      const imageHtml = t.imageUrl ? `<img class="trainer-img" src="${fixUrl(t.imageUrl)}">` : '<span class="text-muted">No image</span>';
      const tr = document.createElement('tr'); tr.innerHTML = `
        <td>${escapeHtml(t.fullName)}</td>
        <td>${escapeHtml(t.email || '')} <br/><small class="text-muted">${escapeHtml(t.phone||'')}</small></td>
        <td class="text-center">${t.yearsOfExperience ?? ''}</td>
        <td class="text-center">${activitiesText}</td>
        <td class="text-center"><span class="badge bg-secondary">${t.isActive? 'Active' : 'Inactive'}</span></td>
        <td class="text-center">${imageHtml}</td>
        <td class="text-center">
          <button class="btn btn-link text-primary me-2 edit-btn" data-id="${t.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-link text-danger delete-btn" data-id="${t.id}"><i class="bi bi-trash3-fill"></i></button>
        </td>`;
      tbody.appendChild(tr);
    }); }
  document.getElementById('itemsInfo').textContent = `Showing ${start+1}-${end} of ${total}`;
  renderPagination(totalPages);
  attachRowListeners();
}

function renderPagination(totalPages){ const ul = document.getElementById('pagination'); ul.innerHTML=''; function li(label, disabled, onClick, active=false){ const li = document.createElement('li'); li.className = 'page-item' + (disabled? ' disabled':'') + (active? ' active':''); li.innerHTML = `<a class="page-link" href="#">${label}</a>`; if(!disabled) li.onclick = (e)=>{ e.preventDefault(); onClick(); }; return li; }
  ul.appendChild(li('«', currentPage===1, ()=>renderPage(1)));
  const start = Math.max(1, currentPage-2); const end = Math.min(totalPages, currentPage+2);
  for(let i=start;i<=end;i++) ul.appendChild(li(i, false, ()=>renderPage(i), i===currentPage));
  ul.appendChild(li('»', currentPage===totalPages, ()=>renderPage(totalPages)));
}

function attachRowListeners(){ document.querySelectorAll('.edit-btn').forEach(btn=>{ btn.onclick = async ()=>{ const id = btn.dataset.id; try{ const res = await fetch(`${apiUrl}/${id}`); if(!res.ok) throw new Error('Failed'); const tr = await res.json(); const form = document.getElementById('editTrainerForm'); form.id.value = tr.id; form.FullName.value = tr.fullName || ''; form.Phone.value = tr.phone || ''; form.Email.value = tr.email || ''; form.YearsOfExperience.value = tr.yearsOfExperience || ''; form.NationalId.value = tr.nationalId || ''; form.DateOfBirth.value = tr.dateOfBirth ? tr.dateOfBirth.split('T')[0] : ''; form.Gender.value = tr.gender || ''; // set multi-select
          const editSel = document.getElementById('editActivitiesSelect'); // activities backend stores comma string; we match by name if available
          // try to select by matching option text to items in tr.activities (names) or by id
          const selected = [];
          if(tr.activities){ const parts = tr.activities.split(',').map(x=>x.trim()); parts.forEach(p=>{
            // try find by id
            const optById = Array.from(editSel.options).find(o=>o.value===p || o.text.toLowerCase()===p.toLowerCase()); if(optById) selected.push(optById.value);
          }); }
          Array.from(editSel.options).forEach(o=> o.selected = selected.includes(o.value));
          document.getElementById('editIsActive').checked = !!tr.isActive;
          const prev = document.getElementById('editImagePreview'); if(tr.imageUrl){ prev.src = fixUrl(tr.imageUrl); prev.style.display = 'block'; } else prev.style.display='none';
          new bootstrap.Modal(document.getElementById('editTrainerModal')).show();
        }catch(err){ console.error(err); showToast('Failed to load trainer','error'); }
    }; });
  document.querySelectorAll('.delete-btn').forEach(btn=>{ btn.onclick = ()=>{ const id = btn.dataset.id; Swal.fire({ title:'Are you sure?', text:'This will permanently delete the trainer.', icon:'warning', showCancelButton:true, confirmButtonText:'Yes, delete', cancelButtonText:'Cancel' }).then(async (res)=>{ if(res.isConfirmed){ try{ const r = await fetch(`${apiUrl}/${id}`, { method:'DELETE' }); if(!r.ok) throw new Error('Delete failed'); showToast('Deleted'); await loadTrainers(); }catch(e){ console.error(e); showToast('Failed to delete','error'); } } }); }; }); }

/* Add / Edit image preview */
document.getElementById('addImageInput').onchange = e=>{ const p = document.getElementById('addImagePreview'); if(e.target.files && e.target.files[0]){ p.src = URL.createObjectURL(e.target.files[0]); p.style.display = 'block'; } else p.style.display='none'; };
document.getElementById('editImageInput').onchange = e=>{ const p = document.getElementById('editImagePreview'); if(e.target.files && e.target.files[0]){ p.src = URL.createObjectURL(e.target.files[0]); p.style.display = 'block'; } else p.style.display='none'; };

/* Save Add */
document.getElementById('openAddModalBtn').onclick = async ()=>{ await loadActivities(); document.getElementById('addTrainerForm').reset(); document.getElementById('addImagePreview').style.display = 'none'; new bootstrap.Modal(document.getElementById('addTrainerModal')).show(); };

document.getElementById('saveAddBtn').onclick = async ()=>{
  const form = document.getElementById('addTrainerForm'); if(!form.FullName.value.trim()){ alert('Full name is required'); return; }
  const formData = new FormData(form);
  // multi-select activities -> join values with comma string expected by backend
  const sel = Array.from(document.getElementById('addActivitiesSelect').selectedOptions).map(o=>o.text);
  formData.set('Activities', sel.join(','));
  // checkbox -> send explicitly
  formData.set('IsActive', document.getElementById('addIsActive').checked);
  try{ const res = await fetch(apiUrl, { method:'POST', body: formData }); if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed'); } showToast('Trainer added'); bootstrap.Modal.getInstance(document.getElementById('addTrainerModal')).hide(); await loadTrainers(); }catch(err){ console.error(err); showToast('Failed to add','error'); alert(err.message); }
};

/* Save Edit */
document.getElementById('saveEditBtn').onclick = async ()=>{
  const form = document.getElementById('editTrainerForm'); const id = form.id.value; if(!id) return; if(!form.FullName.value.trim()){ alert('Full name is required'); return; }
  const formData = new FormData(); // build FormData manually to avoid empty fields ambiguity
  formData.append('FullName', form.FullName.value);
  if(form.Phone.value) formData.append('Phone', form.Phone.value);
  if(form.Email.value) formData.append('Email', form.Email.value);
  if(form.YearsOfExperience.value) formData.append('YearsOfExperience', form.YearsOfExperience.value);
  if(form.NationalId.value) formData.append('NationalId', form.NationalId.value);
  if(form.DateOfBirth.value) formData.append('DateOfBirth', form.DateOfBirth.value);
  if(form.Gender.value) formData.append('Gender', form.Gender.value);
  const sel = Array.from(document.getElementById('editActivitiesSelect').selectedOptions).map(o=>o.text);
  formData.append('Activities', sel.join(','));
  formData.append('IsActive', document.getElementById('editIsActive').checked);
  const fileInput = document.getElementById('editImageInput'); if(fileInput.files && fileInput.files[0]) formData.append('Image', fileInput.files[0]);
  try{ const res = await fetch(`${apiUrl}/${id}`, { method:'PUT', body: formData }); if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed'); } showToast('Updated'); bootstrap.Modal.getInstance(document.getElementById('editTrainerModal')).hide(); await loadTrainers(); }catch(err){ console.error(err); showToast('Failed to update','error'); alert(err.message); }
};

/* Controls bindings */
document.getElementById('searchInput').addEventListener('input', ()=>{ clearTimeout(window.__t); window.__t = setTimeout(()=> applyFilters(), 220); });
document.getElementById('activityFilter').addEventListener('change', applyFilters);
document.getElementById('genderFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('sortBy').addEventListener('change', applyFilters);
document.getElementById('pageSize').addEventListener('change', ()=>{ currentPage=1; applyFilters(); });
document.getElementById('refreshBtn').addEventListener('click', async ()=>{ await loadActivities(true); await loadTrainers(); });

/* Theme */
const themeToggle = document.getElementById('themeToggle'); function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); themeToggle.innerHTML = t==='dark'?'<i class="bi bi-sun-fill"></i>':'<i class="bi bi-moon-stars"></i>'; }
themeToggle.onclick = ()=> applyTheme(localStorage.getItem('theme')==='dark'?'light':'dark'); applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches? 'dark':'light'));

/* Init */
window.addEventListener('DOMContentLoaded', async ()=>{ await loadActivities(); await loadTrainers(); });












// ====================== VALIDATION FOR TRAINERS (Add Modal) ======================
// لازم نضيف الدوال دي لو مش موجودة عندك بالفعل (من كود الـ Member)
function showError(el, msg) {
    el.classList.add('is-invalid');
    let feedback = el.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        el.parentElement.appendChild(feedback);
    }
    feedback.textContent = msg;
}

function clearError(el) {
    el.classList.remove('is-invalid');
    const feedback = el.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.remove();
}

function clearAllErrors(modal) {
    modal.querySelectorAll('.is-invalid').forEach(e => e.classList.remove('is-invalid'));
    modal.querySelectorAll('.invalid-feedback').forEach(e => e.remove());
}

// استخراج الجنس وتاريخ الميلاد من الرقم القومي (نفس الدالة اللي عندك في الـ Member)
function extractFromNationalId(nid) {
    if (!/^\d{14}$/.test(nid)) return null;
    const century = nid[0];
    const year = nid.substr(1, 2);
    const month = nid.substr(3, 2);
    const day = nid.substr(5, 2);
    const genderDigit = parseInt(nid[12]);
    const fullYear = century === '2' ? '19' + year : century === '3' ? '20' + year : null;
    if (!fullYear) return null;
    const birthDate = `${fullYear}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
    const dateObj = new Date(birthDate);
    if (dateObj.getFullYear() != fullYear || dateObj.getMonth() + 1 != month || dateObj.getDate() != day) return null;
    const gender = genderDigit % 2 === 1 ? 'Male' : 'Female';
    return { birthDate, gender };
}

// National ID Auto-fill + مسح الأخطاء للـ Add Trainer Modal
document.querySelectorAll('#addTrainerModal input[name="NationalId"]').forEach(input => {
    input.addEventListener('input', function () {
        let val = this.value.replace(/\D/g, '').slice(0, 14);
        this.value = val;

        const modal = this.closest('.modal');
        const birth = modal.querySelector('input[name="DateOfBirth"]');
        const gender = modal.querySelector('select[name="Gender"]');

        if (val.length === 14) {
            const data = extractFromNationalId(val);
            if (data) {
                birth.value = data.birthDate;
                gender.value = data.gender;
                clearError(this); clearError(birth); clearError(gender);
            } else {
                showError(this, 'Invalid National ID');
            }
        } else {
            birth.value = '';
            gender.value = '';
        }
    });
});

// Real-time validation (أثناء الكتابة)
const realTimeTrainerFields = [
    { sel: '#addTrainerModal input[name="FullName"]', min: 5, msg: 'Full name must be at least 5 characters' },
    { sel: '#addTrainerModal input[name="Email"]', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Valid email address is required' },
    { sel: '#addTrainerModal input[name="Phone"]', regex: /^01[0125][0-9]{8}$/, msg: 'Valid Egyptian mobile required' },
    { sel: '#addTrainerModal input[name="NationalId"]', fn: v => extractFromNationalId(v) !== null, msg: 'Valid 14-digit National ID required' },
    { sel: '#addTrainerModal input[name="YearsOfExperience"]', min: 0, msg: 'Years of experience cannot be negative' },
];

realTimeTrainerFields.forEach(field => {
    document.querySelectorAll(field.sel).forEach(input => {
        input.addEventListener('input', function () {
            let val = this.value.trim();
            if (this.name === 'YearsOfExperience') val = parseInt(val) || 0;

            const isValid = field.regex ? field.regex.test(val) :
                            field.fn ? field.fn(val) :
                            field.min !== undefined ? val >= field.min : val.length >= field.min;

            if (isValid && this.value !== '') clearError(this);
        });
    });
});

// تحقق فوري للـ select والـ date
document.querySelectorAll('#addTrainerModal select, #addTrainerModal input[type="date"]').forEach(el => {
    el.addEventListener('change', function () {
        if (this.value) clearError(this);
    });
});

// =============== الأهم: نوقف الحفظ لو في أخطاء، بدون تغيير الكود الأساسي ===============
const originalSaveAddBtnHandler = document.getElementById('saveAddBtn').onclick;

document.getElementById('saveAddBtn').onclick = async function () {
    const modal = document.getElementById('addTrainerModal');
    clearAllErrors(modal);
    let valid = true;

    const f = {
        fullName: modal.querySelector('input[name="FullName"]'),
        email: modal.querySelector('input[name="Email"]'),
        phone: modal.querySelector('input[name="Phone"]'),
        nationalId: modal.querySelector('input[name="NationalId"]'),
        gender: modal.querySelector('select[name="Gender"]'),
        dateOfBirth: modal.querySelector('input[name="DateOfBirth"]'),
        yearsOfExperience: modal.querySelector('input[name="YearsOfExperience"]'),
        activities: modal.querySelector('select[name="Activities"]')
    };

    // كل التحقق زي الـ Member بالضبط
    if (!f.fullName.value.trim() || f.fullName.value.length < 5) { showError(f.fullName, 'Full name must be at least 5 characters'); valid = false; }
    if (!f.email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) { showError(f.email, 'Valid email address is required'); valid = false; }
    if (!f.phone.value || !/^01[0125][0-9]{8}$/.test(f.phone.value)) { showError(f.phone, 'Valid Egyptian mobile required'); valid = false; }
    if (!extractFromNationalId(f.nationalId.value)) { showError(f.nationalId, 'Valid 14-digit National ID required'); valid = false; }
    if (!f.gender.value) { showError(f.gender, 'Please select gender'); valid = false; }
    if (!f.dateOfBirth.value) { showError(f.dateOfBirth, 'Date of birth is required'); valid = false; }
    if (f.yearsOfExperience.value === '' || parseInt(f.yearsOfExperience.value) < 0) { showError(f.yearsOfExperience, 'Years of experience is required and cannot be negative'); valid = false; }
    if (f.activities.selectedOptions.length === 0) { showError(f.activities, 'Please select at least one activity'); valid = false; }

    // لو كل حاجة تمام → ننفذ الكود الأساسي بتاعك (الحفظ في الـ API)
    if (valid) {
        await originalSaveAddBtnHandler.call(this);  // نفذ الحفظ الأصلي بالضبط زي ما هو
    }
    // لو في أخطاء → ما نعملش حاجة، الأخطاء هتظهر تحت الحقول
};









// ====================== VALIDATION FOR TRAINERS (Edit Modal) ======================

// National ID Auto-fill للـ Edit Trainer Modal (مش بنمسح القيم القديمة لو الرقم أقل من 14)
document.querySelectorAll('#editTrainerModal input[name="NationalId"]').forEach(input => {
    input.addEventListener('input', function () {
        let val = this.value.replace(/\D/g, '').slice(0, 14);
        this.value = val;

        const modal = this.closest('.modal');
        const birth = modal.querySelector('input[name="DateOfBirth"]');
        const gender = modal.querySelector('select[name="Gender"]');

        if (val.length === 14) {
            const data = extractFromNationalId(val);
            if (data) {
                birth.value = data.birthDate;
                gender.value = data.gender;
                clearError(this); clearError(birth); clearError(gender);
            } else {
                showError(this, 'Invalid National ID');
            }
        }
        // مش بنمسح birth و gender لو الرقم أقل من 14 عشان ما يضيعش البيانات القديمة أثناء التعديل
    });
});

// Real-time validation للـ Edit Trainer Modal (نفس الحقول)
const realTimeTrainerEditFields = [
    { sel: '#editTrainerModal input[name="FullName"]', min: 5, msg: 'Full name must be at least 5 characters' },
    { sel: '#editTrainerModal input[name="Email"]', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Valid email address is required' },
    { sel: '#editTrainerModal input[name="Phone"]', regex: /^01[0125][0-9]{8}$/, msg: 'Valid Egyptian mobile required' },
    { sel: '#editTrainerModal input[name="NationalId"]', fn: v => extractFromNationalId(v) !== null, msg: 'Valid 14-digit National ID required' },
    { sel: '#editTrainerModal input[name="YearsOfExperience"]', min: 0, msg: 'Years of experience cannot be negative' },
];

realTimeTrainerEditFields.forEach(field => {
    document.querySelectorAll(field.sel).forEach(input => {
        input.addEventListener('input', function () {
            let val = this.value.trim();
            if (this.name === 'YearsOfExperience') val = parseInt(val) || 0;

            const isValid = field.regex ? field.regex.test(val) :
                            field.fn ? field.fn(val) :
                            field.min !== undefined ? val >= field.min : val.length >= field.min;

            if (isValid && this.value !== '') clearError(this);
        });
    });
});

// تحقق فوري للـ select والـ date في الـ Edit
document.querySelectorAll('#editTrainerModal select, #editTrainerModal input[type="date"]').forEach(el => {
    el.addEventListener('change', function () {
        if (this.value) clearError(this);
    });
});

// =============== نلف الـ saveEditBtn الأصلي بـ validation بدون تغييره ===============
const originalSaveEditBtnHandler = document.getElementById('saveEditBtn').onclick;

document.getElementById('saveEditBtn').onclick = async function () {
    const modal = document.getElementById('editTrainerModal');
    clearAllErrors(modal);
    let valid = true;

    const f = {
        fullName: modal.querySelector('input[name="FullName"]'),
        email: modal.querySelector('input[name="Email"]'),
        phone: modal.querySelector('input[name="Phone"]'),
        nationalId: modal.querySelector('input[name="NationalId"]'),
        gender: modal.querySelector('select[name="Gender"]'),
        dateOfBirth: modal.querySelector('input[name="DateOfBirth"]'),
        yearsOfExperience: modal.querySelector('input[name="YearsOfExperience"]'),
        activities: modal.querySelector('select[name="Activities"]')
    };

    // نفس التحقق بالضبط زي الـ Add
    if (!f.fullName.value.trim() || f.fullName.value.length < 5) { showError(f.fullName, 'Full name must be at least 5 characters'); valid = false; }
    if (!f.email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) { showError(f.email, 'Valid email address is required'); valid = false; }
    if (!f.phone.value || !/^01[0125][0-9]{8}$/.test(f.phone.value)) { showError(f.phone, 'Valid Egyptian mobile required'); valid = false; }
    if (!extractFromNationalId(f.nationalId.value)) { showError(f.nationalId, 'Valid 14-digit National ID required'); valid = false; }
    if (!f.gender.value) { showError(f.gender, 'Please select gender'); valid = false; }
    if (!f.dateOfBirth.value) { showError(f.dateOfBirth, 'Date of birth is required'); valid = false; }
    if (f.yearsOfExperience.value === '' || parseInt(f.yearsOfExperience.value) < 0) { showError(f.yearsOfExperience, 'Years of experience is required and cannot be negative'); valid = false; }
    if (f.activities.selectedOptions.length === 0) { showError(f.activities, 'Please select at least one activity'); valid = false; }

    // لو كل حاجة تمام → ننفذ الكود الأصلي بتاعك (الـ PUT request)
    if (valid) {
        await originalSaveEditBtnHandler.call(this);
    }
    // لو في أخطاء → الأخطاء تظهر فقط وما يحصلش تحديث
};