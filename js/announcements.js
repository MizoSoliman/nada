/* ================= CONFIG ================ */
const API_ANN = " + API_BASE + "/api/Announcements";
const el_ann = id => document.getElementById(id);

/* ================= State ================== */
let listData_ann = [];
let filtered_ann = [];
let currentPage_ann = 1;
let pageSize_ann = parseInt(el_ann('pageSize_ann').value, 10);
let sortBy_ann = el_ann('sortBy_ann').value;

/* ================= Utilities =============== */
function showToast_ann(msg, type = 'success') {
  const id = 't' + Date.now();
  const html = `
    <div id="${id}" class="toast align-items-center text-white bg-${type} border-0 mb-2">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  el_ann('toastContainer_ann').insertAdjacentHTML('beforeend', html);
  const t = new bootstrap.Toast(el_ann(id), { delay: 3000 });
  t.show();
  el_ann(id).addEventListener('hidden.bs.toast', () => el_ann(id).remove());
}

function renderSkeleton_ann(rows = 6) {
  const tbody = el_ann('annTable');
  tbody.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    tbody.innerHTML += `
      <tr><td colspan="6">
        <div class="d-flex gap-3 align-items-center p-3">
          <div style="width:70px;height:50px" class="skeleton"></div>
          <div style="flex:1">
            <div class="skeleton" style="height:14px;margin-bottom:8px;"></div>
            <div class="skeleton" style="height:12px;width:60%"></div>
          </div>
        </div>
      </td></tr>`;
  }
}

function escapeHtml_ann(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fixUrl_ann(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/* ================ Load Data =============== */
async function loadAnnouncements() {
  renderSkeleton_ann();
  try {
    const res = await fetch(API_ANN);
    if (!res.ok) throw new Error();
    listData_ann = await res.json();
    applyFilters_ann();
  } catch {
    el_ann('annTable').innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">Error loading announcements</td></tr>`;
  }
}

/* ================ Filtering & Sorting =============== */
function applyFilters_ann() {
  const q = el_ann('searchInput_ann').value.trim().toLowerCase();
  sortBy_ann = el_ann('sortBy_ann').value;
  pageSize_ann = parseInt(el_ann('pageSize_ann').value, 10);

  filtered_ann = listData_ann.filter(a =>
    (!q || (a.title && a.title.toLowerCase().includes(q)) || (a.text && a.text.toLowerCase().includes(q)))
  );

  filtered_ann.sort((a, b) => {
    switch (sortBy_ann) {
      case 'date_desc': return new Date(b.publishDate) - new Date(a.publishDate);
      case 'date_asc':  return new Date(a.publishDate) - new Date(b.publishDate);
      case 'title_asc': return (a.title || '').localeCompare(b.title || '');
      case 'title_desc': return (b.title || '').localeCompare(a.title || '');
      default: return 0;
    }
  });

  renderPage_ann(1);
}

function renderPage_ann(page) {
  const tbody = el_ann('annTable');
  tbody.innerHTML = '';

  const total = filtered_ann.length;
  const totalPages = Math.ceil(total / pageSize_ann) || 1;

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage_ann = page;

  const start = (page - 1) * pageSize_ann;
  const end = Math.min(start + pageSize_ann, total);
  const items = filtered_ann.slice(start, end);

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No announcements</td></tr>`;
  } else {
    items.forEach(a => {
      // ForWho: handle array or comma-separated string
      const forWhoDisplay = Array.isArray(a.forWho)
        ? a.forWho.join(', ')
        : (a.forWho || '');

      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml_ann(a.title)}</td>
          <td style="max-width:320px;">${escapeHtml_ann(a.text)}</td>
          <td>${escapeHtml_ann(forWhoDisplay)}</td>
          <td class="text-center">${a.publishDate?.split("T")[0] || ""}</td>
          <td>${a.imageUrl
            ? `<img src="${fixUrl_ann(a.imageUrl)}" class="thumb">`
            : `<span class="small-muted">No Image</span>`}
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary edit-btn-ann" data-id="${a.id}">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn-ann" data-id="${a.id}">
              <i class="bi bi-trash3-fill"></i>
            </button>
          </td>
        </tr>`;
    });
  }

  el_ann('itemsInfo_ann').textContent = total;
  el_ann('pageInfo_ann').textContent = `Showing ${start + 1}-${end} of ${total}`;
  renderPagination_ann(totalPages);
  attachRowEvents_ann();
}

function renderPagination_ann(totalPages) {
  const ul = el_ann('pagination_ann');
  ul.innerHTML = '';

  function make(label, active, disabled, fn) {
    const li = document.createElement("li");
    li.className = "page-item " + (disabled ? "disabled" : "") + (active ? " active" : "");
    li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
    if (!disabled) li.onclick = e => { e.preventDefault(); fn(); };
    return li;
  }

  ul.appendChild(make("«", false, currentPage_ann === 1, () => renderPage_ann(1)));
  let s = Math.max(1, currentPage_ann - 2);
  let e = Math.min(totalPages, currentPage_ann + 2);
  for (let i = s; i <= e; i++) ul.appendChild(make(i, currentPage_ann === i, false, () => renderPage_ann(i)));
  ul.appendChild(make("»", false, currentPage_ann === totalPages, () => renderPage_ann(totalPages)));
}

/* =============== Row Events =============== */
function attachRowEvents_ann() {
  document.querySelectorAll(".edit-btn-ann").forEach(btn => btn.onclick = () => loadForEdit_ann(btn.dataset.id));
  document.querySelectorAll(".delete-btn-ann").forEach(btn => btn.onclick = () => confirmDelete_ann(btn.dataset.id));
}

/* =============== CRUD =============== */
async function addAnnouncement() {
  const fd = new FormData(el_ann('addForm_ann'));
  try {
    const res = await fetch(API_ANN, { method: "POST", body: fd });
    if (!res.ok) throw 0;
    bootstrap.Modal.getInstance(el_ann('addModal_ann')).hide();
    showToast_ann("Announcement added");
    loadAnnouncements();
  } catch { showToast_ann("Failed to add", "danger"); }
}

async function loadForEdit_ann(id) {
  try {
    const res = await fetch(`${API_ANN}/${id}`);
    if (!res.ok) throw 0;
    const a = await res.json();

    el_ann('editId_ann').value = a.id;
    el_ann('editTitle_ann').value = a.title;
    el_ann('editText_ann').value = a.text;
    el_ann('editDate_ann').value = a.publishDate?.split("T")[0] || "";

    // Reset ForWho checkboxes then check the correct ones
    ['editAnnAdmins', 'editAnnTrainers', 'editAnnMembers', 'editAnnGuests'].forEach(cbId => {
      el_ann(cbId).checked = false;
    });
    const forWhoArr = Array.isArray(a.forWho) ? a.forWho : (a.forWho ? a.forWho.split(',').map(s => s.trim()) : []);
    forWhoArr.forEach(role => {
      const map = { Admins: 'editAnnAdmins', Trainers: 'editAnnTrainers', Members: 'editAnnMembers', Guests: 'editAnnGuests' };
      if (map[role]) el_ann(map[role]).checked = true;
    });

    // Image
    if (a.imageUrl) {
      el_ann('editPreview_ann').src = fixUrl_ann(a.imageUrl);
      el_ann('editPreview_ann').style.display = "block";
      el_ann('removeImageBtn_ann').style.display = "inline-block";
      el_ann('removeImageBtn_ann').dataset.remove = "0";
    } else {
      el_ann('editPreview_ann').style.display = "none";
      el_ann('removeImageBtn_ann').style.display = "none";
    }

    new bootstrap.Modal(el_ann('editModal_ann')).show();
  } catch { showToast_ann("Error loading data", "danger"); }
}

async function updateAnnouncement() {
  const fd = new FormData(el_ann('editForm_ann'));
  if (el_ann('removeImageBtn_ann').dataset.remove === "1") fd.append("RemoveImage", "true");
  try {
    const res = await fetch(`${API_ANN}/${el_ann('editId_ann').value}`, { method: "PUT", body: fd });
    if (!res.ok) throw 0;
    bootstrap.Modal.getInstance(el_ann('editModal_ann')).hide();
    showToast_ann("Updated");
    loadAnnouncements();
  } catch { showToast_ann("Update failed", "danger"); }
}

function confirmDelete_ann(id) {
  Swal.fire({
    title: "Delete announcement?",
    text: "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete"
  }).then(async r => {
    if (r.isConfirmed) {
      try {
        const res = await fetch(`${API_ANN}/${id}`, { method: "DELETE" });
        if (!res.ok) throw 0;
        showToast_ann("Deleted");
        loadAnnouncements();
      } catch { showToast_ann("Delete failed", "danger"); }
    }
  });
}

/* ================= Drag & Drop ================= */
function wireDragArea_ann(boxId, fileId, previewId) {
  const box = el_ann(boxId), input = el_ann(fileId), prev = el_ann(previewId);
  box.addEventListener("click", () => input.click());
  input.addEventListener("change", e => {
    if (e.target.files[0]) {
      prev.src = URL.createObjectURL(e.target.files[0]);
      prev.style.display = 'block';
    }
  });
  ["dragenter", "dragover"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove("dragover"); }));
  box.addEventListener("drop", e => {
    const f = e.dataTransfer.files[0];
    if (f) { input.files = e.dataTransfer.files; prev.src = URL.createObjectURL(f); prev.style.display = 'block'; }
  });
}
wireDragArea_ann("addDrag_ann", "addImage_ann", "addPreview_ann");
wireDragArea_ann("editDrag_ann", "editImage_ann", "editPreview_ann");

el_ann("removeImageBtn_ann").onclick = () => {
  el_ann("editPreview_ann").style.display = "none";
  el_ann("removeImageBtn_ann").dataset.remove = "1";
};

/* ================ Validation ================= */
function validateForm_ann(form) {
  let valid = true;
  form.querySelectorAll('input[required], textarea[required]').forEach(f => {
    let err = f.nextElementSibling?.classList.contains('invalid-feedback') ? f.nextElementSibling : null;
    if (!f.checkValidity()) {
      f.classList.add('is-invalid');
      if (!err) {
        err = document.createElement('div');
        err.className = 'invalid-feedback';
        err.textContent = f.validationMessage || 'Required';
        f.insertAdjacentElement('afterend', err);
      }
      if (err) err.style.display = 'block';
      valid = false;
    } else {
      f.classList.remove('is-invalid');
      if (err) err.style.display = 'none';
    }
  });
  return valid;
}

['addForm_ann', 'editForm_ann'].forEach(id => {
  const form = el_ann(id);
  form.querySelectorAll('input,textarea').forEach(input => {
    input.addEventListener('input', () => {
      if (input.checkValidity()) {
        input.classList.remove('is-invalid');
        const err = input.nextElementSibling?.classList.contains('invalid-feedback') ? input.nextElementSibling : null;
        if (err) err.style.display = 'none';
      }
    });
  });
});

/* ================= Buttons ================= */
el_ann("addSaveBtn_ann").onclick = () => { if (validateForm_ann(el_ann('addForm_ann'))) addAnnouncement(); };
el_ann("editSaveBtn_ann").onclick = () => { if (validateForm_ann(el_ann('editForm_ann'))) updateAnnouncement(); };

el_ann("openAddBtn_ann").onclick = () => {
  el_ann("addForm_ann").reset();
  el_ann("addPreview_ann").style.display = 'none';
  // Reset add checkboxes
  ['addAnnAdmins', 'addAnnTrainers', 'addAnnMembers', 'addAnnGuests'].forEach(id => el_ann(id).checked = false);
  new bootstrap.Modal(el_ann("addModal_ann")).show();
};

el_ann("refreshBtn_ann").onclick = loadAnnouncements;
el_ann("searchInput_ann").oninput = applyFilters_ann;
el_ann("sortBy_ann").onchange = applyFilters_ann;
el_ann("pageSize_ann").onchange = applyFilters_ann;

/* ================= Init ================= */
loadAnnouncements();
