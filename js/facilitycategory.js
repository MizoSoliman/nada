const API_FACILITYCAT = API_BASE + "/api/FacilityCategories";
/* ================== CONFIG ================== */
const API_FACILITYCAT = API_FACILITYCAT + "/api/FacilityCategories";

/* ================== STATE ================== */
let categories = [];
let filtered = [];
let currentPage = 1;
let pageSize = 10;
let searchKeyword = "";
let sortType = "";

/* ================== HELPERS ================== */
function showAlert(msg, type='success') {
  const toast = document.createElement('div');
  toast.className = `position-fixed top-0 end-0 m-4 alert alert-${type} shadow`;
  toast.style.zIndex = 1080;
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('fade'); setTimeout(()=> toast.remove(), 400); }, 1600);
}

function escapeHtml(x) { return !x ? "" : x.replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ================== FETCH & FILTER ================== */
async function fetchCategories() {
  const body = document.getElementById("categoriesTableBody");
  body.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Loading...</td></tr>`;
  try {
    const res = await fetch(API_FACILITYCAT);
    categories = await res.json();
    applyFilters();
  } catch {
    body.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load categories</td></tr>`;
  }
}

function applyFilters() {
  filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchKeyword) ||
    (c.description || "").toLowerCase().includes(searchKeyword)
  );

  if (sortType === "name_asc") filtered.sort((a,b)=> a.name.localeCompare(b.name));
  if (sortType === "name_desc") filtered.sort((a,b)=> b.name.localeCompare(a.name));
  if (sortType === "created_asc") filtered.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  if (sortType === "created_desc") filtered.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  renderPaged();
}

/* ================== RENDER TABLE + PAGINATION ================== */
function renderPaged() {
  pageSize = parseInt(document.getElementById("pageSize").value);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  renderTable(pageItems);
  renderPagination();
}

function renderTable(list) {
  const body = document.getElementById("categoriesTableBody");
  body.innerHTML = "";

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No categories found</td></tr>`;
    return;
  }

  list.forEach(cat => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ps-3 fw-semibold">${escapeHtml(cat.name)}</td>
      <td>${escapeHtml(cat.description || "")}</td>
      <td class="text-center">
        <span class="badge ${cat.status==='Active' ? 'bg-soft' : 'bg-secondary text-white'}">
          ${escapeHtml(cat.status)}
        </span>
      </td>
      <td class="text-center small text-muted">
        ${cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : '-'}
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-2 edit-btn"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-outline-danger delete-btn"><i class="bi bi-trash"></i></button>
      </td>
    `;

    tr.querySelector(".edit-btn").onclick = () => openEditModal(cat.id);
    tr.querySelector(".delete-btn").onclick = () => deleteCategory(cat.id);

    body.appendChild(tr);
  });
}

function renderPagination() {
  const pag = document.getElementById("pagination");
  pag.innerHTML = "";

  const total = Math.ceil(filtered.length / pageSize);
  if (total <= 1) return;

  for (let i = 1; i <= total; i++) {
    const li = document.createElement('li');
    li.className = "page-item " + (i === currentPage ? "active" : "");
    li.innerHTML = `<button class="page-link">${i}</button>`;
    li.onclick = () => { currentPage = i; renderPaged(); };
    pag.appendChild(li);
  }
}

/* ================== MODAL HANDLING ================== */
const modal = new bootstrap.Modal(document.getElementById('categoryModal'));

document.getElementById("addBtn").onclick = () => {
  document.getElementById("modalTitle").innerText = "Add New Facility Category";
  document.getElementById("saveBtnText").innerText = "Save";
  document.getElementById("categoryId").value = "";
  document.getElementById("name").value = "";
  document.getElementById("description").value = "";
  document.getElementById("status").value = "Active";
  clearAllErrors(document.getElementById('categoryModal'));
  modal.show();
};

async function openEditModal(id){
  const res = await fetch(`${API_FACILITYCAT}/${id}`);
  const cat = await res.json();

  document.getElementById("modalTitle").innerText = "Edit Facility Category";
  document.getElementById("saveBtnText").innerText = "Update";
  document.getElementById("categoryId").value = cat.id;
  document.getElementById("name").value = cat.name;
  document.getElementById("description").value = cat.description;
  document.getElementById("status").value = cat.status;
  clearAllErrors(document.getElementById('categoryModal'));
  modal.show();
}

/* ================== CRUD SAVE ================== */
document.getElementById("saveCategoryBtn").onclick = async function () {
  const id = document.getElementById("categoryId").value;
  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("description").value.trim();
  const status = document.getElementById("status").value;

  // Validation
  let valid = true;
  clearAllErrors(document.getElementById('categoryModal'));
  if (!name || name.length<3) { showError(document.getElementById("name"), "Name min 3 chars"); valid=false; }
  if (!description || description.length<10) { showError(document.getElementById("description"), "Description min 10 chars"); valid=false; }
  if (!status) { showError(document.getElementById("status"), "Status required"); valid=false; }
  if (!valid) return;

  const payload = { name, description, status };
  const url = id ? `${API_FACILITYCAT}/${id}` : API_FACILITYCAT;
  const method = id ? "PUT" : "POST";

  try {
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    modal.hide();
    showAlert(id ? "Updated successfully" : "Created successfully");
    fetchCategories();
  } catch (err) { console.error(err); showAlert("Operation failed", "danger"); }
};

/* ================== DELETE ================== */
async function deleteCategory(id){
  if (!confirm("Delete this category?")) return;
  await fetch(`${API_FACILITYCAT}/${id}`, { method: "DELETE" });
  showAlert("Deleted");
  fetchCategories();
}

/* ================== FILTERS ================== */
document.getElementById("searchInput").oninput = e => { searchKeyword = e.target.value.toLowerCase().trim(); currentPage=1; applyFilters(); };
document.getElementById("sortBy").onchange = e => { sortType = e.target.value; applyFilters(); };
document.getElementById("pageSize").onchange = () => { currentPage=1; applyFilters(); };

/* ================== THEME TOGGLE ================== */
const themeToggle = document.getElementById('themeToggle');
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); themeToggle.innerHTML = t==='dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars"></i>'; }
themeToggle.onclick = ()=> applyTheme(localStorage.getItem('theme')==='dark'?'light':'dark');
applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

/* ================== VALIDATION HELPERS ================== */
function showError(el,msg){ el.classList.add('is-invalid'); let f=el.parentElement.querySelector('.invalid-feedback'); if(!f){ f=document.createElement('div'); f.className='invalid-feedback'; el.parentElement.appendChild(f); } f.textContent=msg; }
function clearError(el){ el.classList.remove('is-invalid'); let f=el.parentElement.querySelector('.invalid-feedback'); if(f) f.remove(); }
function clearAllErrors(modal){ modal.querySelectorAll('.is-invalid').forEach(e=>e.classList.remove('is-invalid')); modal.querySelectorAll('.invalid-feedback').forEach(e=>e.remove()); }

/* ================== INIT ================== */
window.onload = fetchCategories;
