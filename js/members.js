const apiUrl = 'http://clublywebsite.runasp.net/api/Members';
const memberShipsApi = 'http://clublywebsite.runasp.net/api/MemberShips';
let members = [];
let filtered = [];
let memberShips = [];
let currentPage = 1;
let pageSize = parseInt(document.getElementById('pageSize').value, 10);

/* Helpers */
function showToast(msg, type='success', title=''){
  const id = 't' + Date.now();
  const html = `<div id="${id}" class="toast align-items-center text-white ${type==='success'?'bg-success':'bg-danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex"><div class="toast-body">${title?'<strong>'+title+'</strong><br/>':''}${msg}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
  document.getElementById('toastContainer').insertAdjacentHTML('beforeend', html);
  const t = new bootstrap.Toast(document.getElementById(id), { delay: 3200 }); t.show();
  document.getElementById(id).addEventListener('hidden.bs.toast', e=> e.target.remove());
}
function fixUrl(u){ return resolveUrl(u); }
function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function renderSkeleton(){ const tbody = document.getElementById('membersTable'); tbody.innerHTML=''; for(let i=0;i<6;i++){ const tr=document.createElement('tr'); tr.innerHTML = '<td colspan="7"><div class="d-flex gap-3 align-items-center p-2">'+Array.from({length:5}).map(()=>'<div style="flex:1"><div class="skeleton" style="height:14px;margin-bottom:8px"></div></div>').join('')+'</div></td>'; tbody.appendChild(tr);} }

/* Load memberships for dropdowns & filter */
async function loadMemberShips(force=false){
  const addSel = document.getElementById('addMembershipSelect');
  const editSel = document.getElementById('editMembershipSelect');
  const filter = document.getElementById('membershipFilter');

  if(memberShips.length>0 && !force){ populateMemberShips(); return; }

  try{
    const res = await fetch(memberShipsApi);
    if(!res.ok) throw new Error('Failed to load memberships');
    memberShips = await res.json();
    populateMemberShips();
  }catch(err){
    console.error(err);
    addSel.innerHTML = '<option disabled>Failed</option>';
    editSel.innerHTML = '<option disabled>Failed</option>';
    filter.innerHTML = '<option disabled>Failed</option>';
    showToast('Failed to load memberships','error');
  }
}
function populateMemberShips(){
  const addSel = document.getElementById('addMembershipSelect');
  const editSel = document.getElementById('editMembershipSelect');
  const filter = document.getElementById('membershipFilter');
  const opts = memberShips.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  addSel.innerHTML = '<option value="">Select membership</option>' + opts;
  editSel.innerHTML = '<option value="">Select membership</option>' + opts;
  filter.innerHTML = '<option value="">All memberships</option>' + memberShips.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

/* Load members */
async function loadMembers(){
  renderSkeleton();
  try{
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('Failed to load members');
    members = await res.json();
    currentPage = 1;
    applyFilters();
  }catch(err){
    console.error(err);
    document.getElementById('membersTable').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load</td></tr>';
    showToast('Failed to load members','error');
  }
}

function applyFilters(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const memFilter = document.getElementById('membershipFilter').value;
  const gender = document.getElementById('genderFilter').value;
  pageSize = parseInt(document.getElementById('pageSize').value,10);
  const sortBy = document.getElementById('sortBy').value;

  filtered = members.filter(m=>{
    const matchSearch = q === '' || (m.fullName && m.fullName.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q)) || (m.phone && m.phone.toLowerCase().includes(q)) || (m.membershipName && m.membershipName.toLowerCase().includes(q));
    const matchMembership = !memFilter || String(m.memberShipId) === String(memFilter) || (m.membershipName && m.membershipName.toLowerCase().includes(memFilter));
    const matchGender = !gender || (m.gender && String(m.gender) === gender);
    return matchSearch && matchMembership && matchGender;
  });

  filtered.sort((a,b)=>{
    switch(sortBy){
      case 'name_asc': return (a.fullName||'').localeCompare(b.fullName||'');
      case 'name_desc': return (b.fullName||'').localeCompare(a.fullName||'');
      case 'join_desc': return new Date(b.joinDate||0) - new Date(a.joinDate||0);
      case 'join_asc': return new Date(a.joinDate||0) - new Date(b.joinDate||0);
      default: return 0;
    }
  });

  renderPage(currentPage);
}

function renderPage(page){
  const tbody = document.getElementById('membersTable');
  tbody.innerHTML = '';
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if(page<1) page=1; if(page>totalPages) page=totalPages; currentPage = page;
  const start = (page-1)*pageSize; const end = Math.min(start+pageSize, total);
  const items = filtered.slice(start,end);

  if(items.length===0){ tbody.innerHTML = '<tr><td colspan="7" class="text-center">No results</td></tr>'; }
  else {
    items.forEach(m=>{
      const imageHtml = m.imageUrl ? `<img src="${fixUrl(m.imageUrl)}" class="member-img">` : '<span class="text-muted">No image</span>';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(m.fullName)}</td>
        <td>${escapeHtml(m.email||'')} <br/><small class="text-muted">${escapeHtml(m.phone||'')}</small></td>
        <td class="text-center">${escapeHtml(m.membershipName||'')}</td>
        <td class="text-center rtl-fix">${m.memberShipNumber ?? ''}</td>
        <td class="text-center">${escapeHtml(m.memberType||'')}</td>
        <td class="text-center">${imageHtml}</td>
        <td class="text-center">
          <button class="btn btn-link text-primary me-2 edit-btn" data-id="${m.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-link text-danger delete-btn" data-id="${m.id}"><i class="bi bi-trash3-fill"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('itemsInfo').textContent = `Showing ${total===0?0:start+1}-${end} of ${total}`;
  renderPagination(totalPages);
  attachRowListeners();
}

function renderPagination(totalPages){
  const ul = document.getElementById('pagination'); ul.innerHTML = '';
  const makeLi=(label,disabled,fn,active=false)=>{ const li=document.createElement('li'); li.className='page-item'+(disabled?' disabled':'')+(active?' active':''); li.innerHTML=`<a class="page-link" href="#">${label}</a>`; if(!disabled) li.onclick=(e)=>{ e.preventDefault(); fn(); }; return li; };
  ul.appendChild(makeLi('«', currentPage===1, ()=>renderPage(1)));
  const start = Math.max(1, currentPage-2); const end = Math.min(totalPages, currentPage+2);
  for(let i=start;i<=end;i++) ul.appendChild(makeLi(i, false, ()=>renderPage(i), i===currentPage));
  ul.appendChild(makeLi('»', currentPage===totalPages, ()=>renderPage(totalPages)));
}

function attachRowListeners(){
  document.querySelectorAll('.edit-btn').forEach(btn=>{ btn.onclick = async ()=> {
    const id = btn.dataset.id;
    try{
      const res = await fetch(`${apiUrl}/${id}`);
      if(!res.ok) throw new Error('Failed to load');
      const m = await res.json();
      const form = document.getElementById('editMemberForm');
      form.id.value = m.id;
      form.FullName.value = m.fullName || '';
      form.Email.value = m.email || '';
      form.Phone.value = m.phone || '';
      form.NationalId.value = m.nationalId || '';
      form.Gender.value = m.gender || '';
      form.BirthDate.value = m.birthDate ? m.birthDate.split('T')[0] : '';
      form.MemberShipNumber.value = m.memberShipNumber || '';
      form.JoinDate.value = m.joinDate ? m.joinDate.split('T')[0] : '';
      form.MemberType.value = m.memberType || '';
      form.MemberShipId.value = m.memberShipId || '';
      const prev = document.getElementById('editImagePreview'); if(m.imageUrl){ prev.src = fixUrl(m.imageUrl); prev.style.display='block'; } else prev.style.display='none';
      new bootstrap.Modal(document.getElementById('editMemberModal')).show();
    }catch(err){ console.error(err); showToast('Failed to load member','error'); }
  }; });

  document.querySelectorAll('.delete-btn').forEach(btn=>{ btn.onclick = ()=> {
    const id = btn.dataset.id;
    Swal.fire({ title:'Are you sure?', text:'This will permanently delete the member.', icon:'warning', showCancelButton:true, confirmButtonText:'Yes, delete', cancelButtonText:'Cancel' })
    .then(async (res)=>{ if(res.isConfirmed){ try{ const r = await fetch(`${apiUrl}/${id}`, { method:'DELETE' }); if(!r.ok) throw new Error('Delete failed'); showToast('Deleted'); await loadMembers(); }catch(e){ console.error(e); showToast('Failed to delete','error'); } } });
  }; });
}

/* Image previews */
document.getElementById('addImageInput').onchange = e=>{ const p=document.getElementById('addImagePreview'); if(e.target.files && e.target.files[0]){ p.src = URL.createObjectURL(e.target.files[0]); p.style.display='block'; } else p.style.display='none'; };
document.getElementById('editImageInput').onchange = e=>{ const p=document.getElementById('editImagePreview'); if(e.target.files && e.target.files[0]){ p.src = URL.createObjectURL(e.target.files[0]); p.style.display='block'; } else p.style.display='none'; };

/* Save Add */
document.getElementById('openAddModalBtn').onclick = async ()=>{ await loadMemberShips(); document.getElementById('addMemberForm').reset(); document.getElementById('addImagePreview').style.display='none'; new bootstrap.Modal(document.getElementById('addMemberModal')).show(); };

document.getElementById('saveAddBtn').onclick = async ()=>{
  const form = document.getElementById('addMemberForm');
  if(!form.FullName.value.trim()){  return; }
  const fd = new FormData(form);
  // ensure MemberShipId is present
  if(!fd.get('MemberShipId') || fd.get('MemberShipId') === '') {  return; }
  try{
    const res = await fetch(apiUrl, { method:'POST', body: fd });
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed'); }
    showToast('Member added'); bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide(); await loadMembers();
  }catch(err){ console.error(err); showToast('Failed to add','error'); alert(err.message); }
};

/* Save Edit */
document.getElementById('saveEditBtn').onclick = async ()=>{
  const form = document.getElementById('editMemberForm');
  const id = form.id.value;
  if(!id) return; if(!form.FullName.value.trim()){  return; }
  const fd = new FormData();
  fd.append('FullName', form.FullName.value);
  if(form.Email.value) fd.append('Email', form.Email.value);
  if(form.Phone.value) fd.append('Phone', form.Phone.value);
  if(form.NationalId.value) fd.append('NationalId', form.NationalId.value);
  if(form.Gender.value) fd.append('Gender', form.Gender.value);
  if(form.BirthDate.value) fd.append('BirthDate', form.BirthDate.value);
  if(form.MemberShipNumber.value) fd.append('MemberShipNumber', form.MemberShipNumber.value);
  if(form.JoinDate.value) fd.append('JoinDate', form.JoinDate.value);
  if(form.MemberType.value) fd.append('MemberType', form.MemberType.value);
  if(form.MemberShipId.value) fd.append('MemberShipId', form.MemberShipId.value);
  const fileInput = document.getElementById('editImageInput'); if(fileInput.files && fileInput.files[0]) fd.append('Image', fileInput.files[0]);
  try{
    const res = await fetch(`${apiUrl}/${id}`, { method:'PUT', body: fd });
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Failed'); }
    showToast('Updated'); bootstrap.Modal.getInstance(document.getElementById('editMemberModal')).hide(); await loadMembers();
  }catch(err){ console.error(err); showToast('Failed to update','error'); alert(err.message); }
};

/* Controls */
document.getElementById('searchInput').addEventListener('input', ()=>{ clearTimeout(window.__t); window.__t = setTimeout(()=> applyFilters(), 220); });
document.getElementById('membershipFilter').addEventListener('change', applyFilters);
document.getElementById('genderFilter').addEventListener('change', applyFilters);
document.getElementById('sortBy').addEventListener('change', applyFilters);
document.getElementById('pageSize').addEventListener('change', ()=>{ currentPage=1; applyFilters(); });
document.getElementById('refreshBtn').addEventListener('click', async ()=>{ await loadMemberShips(true); await loadMembers(); });

/* Theme toggle */
const themeToggle = document.getElementById('themeToggle');
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); themeToggle.innerHTML = t==='dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars"></i>'; }
themeToggle.onclick = ()=> applyTheme(localStorage.getItem('theme')==='dark' ? 'light' : 'dark');
applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

/* Init */
window.addEventListener('DOMContentLoaded', async ()=>{ await loadMemberShips(); await loadMembers(); });















// استخراج الجنس وتاريخ الميلاد من الرقم القومي (نفس الدالة الأصلية)
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

// دوال الخطأ (نفسها)
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

// National ID Auto-fill + Real-time clear للـ modal الجديد
document.querySelectorAll('#addMemberModal input[name="NationalId"]').forEach(input => {
    input.addEventListener('input', function () {
        let val = this.value.replace(/\D/g, '').slice(0, 14);
        this.value = val;

        const modal = this.closest('.modal');
        const birth = modal.querySelector('input[name="BirthDate"]');
        const gender = modal.querySelector('select[name="Gender"]');

        if (val.length === 14) {
            const data = extractFromNationalId(val);
            if (data) {
                birth.value = data.birthDate;
                gender.value = data.gender;
                clearError(this);
                clearError(birth);
                clearError(gender);
            } else {
                showError(this, 'Invalid National ID');
            }
        } else {
            birth.value = '';
            gender.value = '';
        }
    });
});

// Real-time validation للحقول النصية في الـ modal الجديد
const realTimeFieldsAdd = [
    { sel: '#addMemberModal input[name="FullName"]', min: 5, msg: 'Full name must be at least 5 characters' },
    { sel: '#addMemberModal input[name="Email"]', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Valid email address is required' },
    { sel: '#addMemberModal input[name="Phone"]', regex: /^01[0125][0-9]{8}$/, msg: 'Valid Egyptian mobile required' },
    { sel: '#addMemberModal input[name="NationalId"]', fn: v => extractFromNationalId(v) !== null, msg: 'Valid 14-digit National ID required' },
    { sel: '#addMemberModal input[name="MemberShipNumber"]', min: 3, msg: 'Membership number too short' },
    { sel: '#addMemberModal input[name="Password"]',  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, msg: 'Password must be 8+ chars with upper, lower, number & symbol' },

];

realTimeFieldsAdd.forEach(field => {
    document.querySelectorAll(field.sel).forEach(input => {
        input.addEventListener('input', function () {
            const val = this.value.trim();
            const isValid = field.regex ? field.regex.test(val) : field.fn ? field.fn(val) : val.length >= field.min;
            if (isValid && val !== '') {
                clearError(this);
            }
        });
    });
});

// للـ selects والـ date في الـ modal الجديد
document.querySelectorAll('#addMemberModal select, #addMemberModal input[type="date"]').forEach(el => {
    el.addEventListener('change', function () {
        if (this.value) clearError(this);
    });
});

// SAVE BUTTON للـ Add Member Modal
document.getElementById('saveAddBtn')?.addEventListener('click', function () {
    const modal = document.getElementById('addMemberModal');
    clearAllErrors(modal);
    let valid = true;

    // جلب الحقول باستخدام name (لأن الـ id غير موجودة في الـ HTML الجديد)
    const f = {
        fullName: modal.querySelector('input[name="FullName"]'),
        email: modal.querySelector('input[name="Email"]'),
        phone: modal.querySelector('input[name="Phone"]'),
        nationalId: modal.querySelector('input[name="NationalId"]'),
        gender: modal.querySelector('select[name="Gender"]'),
        birthDate: modal.querySelector('input[name="BirthDate"]'),
        memberShipNumber: modal.querySelector('input[name="MemberShipNumber"]'),
        joinDate: modal.querySelector('input[name="JoinDate"]'),
        memberShipId: modal.querySelector('select[name="MemberShipId"]'),
        memberType: modal.querySelector('input[name="MemberType"]'),
       password: modal.querySelector('input[name="Password"]')
    };

    if (!f.fullName.value.trim() || f.fullName.value.length < 5) { showError(f.fullName, 'Full name must be at least 5 characters'); valid = false; }
    if (!f.email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) { showError(f.email, 'Valid email address is required'); valid = false; }
    if (!f.phone.value || !/^01[0125][0-9]{8}$/.test(f.phone.value)) { showError(f.phone, 'Valid Egyptian mobile required'); valid = false; }
    if (!extractFromNationalId(f.nationalId.value)) { showError(f.nationalId, 'Valid 14-digit National ID required'); valid = false; }
    if (!f.gender.value) { showError(f.gender, 'Please select gender'); valid = false; }
    if (!f.birthDate.value) { showError(f.birthDate, 'Birth date is required'); valid = false; }
    if (!f.memberShipNumber.value || f.memberShipNumber.value.length < 3) { showError(f.memberShipNumber, 'Membership number too short'); valid = false; }
    if (!f.joinDate.value) { showError(f.joinDate, 'Join date is required'); valid = false; }
    if (!f.memberShipId.value) { showError(f.memberShipId, 'Please select membership plan'); valid = false; }
    if (!f.memberType.value.trim()) { showError(f.memberType, 'Member type is required'); valid = false; }
     if (!f.password.value || 
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(f.password.value)) {
    showError(f.password, 'Password must be 8+ or 12 chars with upper, lower, number & symbol');
    valid = false;}


    if (valid) {
       
        bootstrap.Modal.getInstance(modal).hide();
        document.getElementById('addMemberForm').reset();
        // إعادة عرض الصورة الافتراضية أو إخفاؤها إذا أردت
        modal.querySelector('#addImagePreview').src = '';
        modal.querySelector('#addImagePreview').style.display = 'none';
    }
    // لا يوجد أي alert آخر
});
























// =============== VALIDATION قوي للـ Edit Member Modal (النسخة النهائية المُحسّنة) ===============

function showError(el, msg) {
  el.classList.add('is-invalid');
  let fb = el.parentElement.querySelector('.invalid-feedback');
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'invalid-feedback';
    el.parentElement.appendChild(fb);
  }
  fb.textContent = msg;
}

function clearError(el) {
  el.classList.remove('is-invalid');
  const fb = el.parentElement.querySelector('.invalid-feedback');
  if (fb) fb.textContent = '';
}

function updateEditButtonState() {
  const modal = document.getElementById('editMemberModal'); // أسرع شوية بدون const كل مرة
  const f = {
    fullName: modal.querySelector('[name="FullName"]'),
    email: modal.querySelector('[name="Email"]'),
    phone: modal.querySelector('[name="Phone"]'),
    nationalId: modal.querySelector('[name="NationalId"]'),
    gender: modal.querySelector('[name="Gender"]'),
    birthDate: modal.querySelector('[name="BirthDate"]'),
    memberShipNumber: modal.querySelector('[name="MemberShipNumber"]'),
    joinDate: modal.querySelector('[name="JoinDate"]'),
    memberShipId: modal.querySelector('[name="MemberShipId"]'),
    memberType: modal.querySelector('[name="MemberType"]'),
    newPassword: modal.querySelector('[name="NewPassword"]')
  };

  let valid = true;

  // Regex قوي لكلمة المرور (عدّلته شوية عشان يدعم كل الرموز مش بس @$!%*?&)
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  // Full Name
  if (!f.fullName?.value.trim() || f.fullName.value.trim().length < 5) {
    showError(f.fullName, 'الاسم الكامل على الأقل 5 حروف'); valid = false;
  } else clearError(f.fullName);

  // Email (اختياري)
  if (f.email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) {
    showError(f.email, 'الإيميل غير صحيح'); valid = false;
  } else clearError(f.email);

  // Phone (اختياري)
  if (f.phone?.value && !/^01[0125][0-9]{8}$/.test(f.phone.value)) {
    showError(f.phone, 'رقم الموبايل لازم يكون مصري صحيح'); valid = false;
  } else clearError(f.phone);

  // National ID (اختياري لكن لو موجود لازم يكون صح)
  if (f.nationalId?.value && !extractFromNationalId(f.nationalId.value)) {
    showError(f.nationalId, 'الرقم القومي لازم يكون 14 رقم صحيح'); valid = false;
  } else clearError(f.nationalId);

  // Gender
  if (!f.gender?.value) { showError(f.gender, 'اختار الجنس'); valid = false; }
  else clearError(f.gender);

  // Birth Date
  if (!f.birthDate?.value) { showError(f.birthDate, 'تاريخ الميلاد مطلوب'); valid = false; }
  else clearError(f.birthDate);

  // Membership Number
  if (!f.memberShipNumber?.value || f.memberShipNumber.value.length < 3) {
    showError(f.memberShipNumber, 'رقم العضوية قصير جدًا'); valid = false;
  } else clearError(f.memberShipNumber);

  // Join Date
  if (!f.joinDate?.value) { showError(f.joinDate, 'تاريخ الانضمام مطلوب'); valid = false; }
  else clearError(f.joinDate);

  // Membership Plan
  if (!f.memberShipId?.value) { showError(f.memberShipId, 'اختار نوع العضوية'); valid = false; }
  else clearError(f.memberShipId);

  // Member Type
  if (!f.memberType?.value.trim()) { showError(f.memberType, 'نوع العضو مطلوب'); valid = false; }
  else clearError(f.memberType);

  // New Password - اختياري، لكن لو مكتوب لازم يكون قوي
  if (f.newPassword) {
    const pw = f.newPassword.value.trim();
    if (pw && !strongPasswordRegex.test(pw)) {
      showError(f.newPassword, 'كلمة المرور: 8+ أحرف، حرف كبير وصغير، رقم، ورمز خاص');
      valid = false;
    } else {
      clearError(f.newPassword);
    }
  }

  // تفعيل/تعطيل زر الحفظ
  const saveBtn = document.getElementById('saveEditBtn');
  if (saveBtn) saveBtn.disabled = !valid;
}

// بقية الكود زي ما هو (ممتاز جدًا)

document.querySelector('#editMemberModal [name="NationalId"]')?.addEventListener('input', function () {
  let val = this.value.replace(/\D/g, '').slice(0, 14);
  this.value = val;

  const birth = document.querySelector('#editMemberModal [name="BirthDate"]');
  const gender = document.querySelector('#editMemberModal [name="Gender"]');

  if (val.length === 14) {
    const data = extractFromNationalId(val);
    if (data) {
      birth.value = data.birthDate;
      gender.value = data.gender;
      clearError(this); clearError(birth); clearError(gender);
    } else {
      showError(this, 'الرقم القومي غير صحيح');
    }
  } else {
    birth.value = '';
    gender.value = '';
  }

  updateEditButtonState();
});

// Real-time validation
['FullName','Email','Phone','MemberShipNumber','MemberType','NewPassword'].forEach(n => {
  const el = document.querySelector(`#editMemberModal [name="${n}"]`);
  if (el) el.addEventListener('input', updateEditButtonState);
});

['Gender','MemberShipId','BirthDate','JoinDate'].forEach(n => {
  const el = document.querySelector(`#editMemberModal [name="${n}"]`);
  if (el) el.addEventListener('change', updateEditButtonState);
});

// عند فتح وقفل المودال
$('#editMemberModal').on('shown.bs.modal', () => setTimeout(updateEditButtonState, 100));

$('#editMemberModal').on('hidden.bs.modal', () => {
  const saveBtn = document.getElementById('saveEditBtn');
  if (saveBtn) saveBtn.disabled = true;
  $('#editMemberModal .is-invalid').removeClass('is-invalid');
  $('#editMemberModal .invalid-feedback').remove();
});

// منع الضغط على Save لو الزر معطل
const saveBtn = document.getElementById('saveEditBtn');
if (saveBtn) {
  const originalClick = saveBtn.onclick;
  saveBtn.onclick = function(e) {
    if (this.disabled) {
      e.preventDefault();
      updateEditButtonState();
      return false;
    }
    return originalClick ? originalClick.apply(this, arguments) : true;
  };
}

// أول تشغيل
updateEditButtonState();