const apiUrl = API_BASE + "/api/MemberShips";
const modalEl = document.getElementById('membershipModal');
const modal = new bootstrap.Modal(modalEl);
const saveBtn = document.getElementById('saveMembershipBtn');
const form = document.getElementById('membershipForm');
const tbody = document.getElementById("membershipTableBody");

// ===================== Helpers =====================
function showError(input, msg) {
    input.classList.add('is-invalid');
    let feedback = input.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        input.parentElement.appendChild(feedback);
    }
    feedback.textContent = msg;
}

function clearError(input) {
    input.classList.remove('is-invalid');
    const feedback = input.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.remove();
}

function clearAllErrors() {
    form.querySelectorAll('.is-invalid').forEach(f => f.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(f => f.remove());
}

function resetForm() {
    form.reset();
    clearAllErrors();
    document.getElementById("membershipIdHidden").value = '';
    saveBtn.textContent = "Save";
}

// ===================== Fetch & Render =====================
async function fetchMemberships() {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Loading...</td></tr>`;
    try {
        const res = await fetch(apiUrl);
        if(!res.ok) throw new Error('Failed loading memberships');
        const memberships = await res.json();

        tbody.innerHTML = '';
        memberships.forEach(m => {
            const row = document.createElement("tr");
            row.dataset.id = m.id;
            row.innerHTML = `
                <td>${m.name}</td>
                <td>${m.description ?? ""}</td>
                <td>${m.duration}</td>
                <td>${m.price}</td>
                <td>${m.status}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${err.message}</td></tr>`;
        console.error(err);
    }
}

// ===================== Event Delegation =====================
tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if(!btn) return;

    const tr = btn.closest("tr");
    const id = tr.dataset.id;

    if(btn.classList.contains("delete-btn")) {
        if(confirm("Delete this membership?")) {
            await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
            fetchMemberships();
        }
    } else if(btn.classList.contains("edit-btn")) {
        const m = await (await fetch(`${apiUrl}/${id}`)).json();
        document.getElementById("membershipIdHidden").value = m.id;
        document.getElementById("name").value = m.name;
        document.getElementById("description").value = m.description ?? "";
        document.getElementById("duration").value = m.duration;
        document.getElementById("price").value = m.price;
        document.getElementById("status").value = m.status;
        saveBtn.textContent = "Update";
        modal.show();
    }
});

// ===================== Validation =====================
form.querySelectorAll('.form-control, .form-select').forEach(input => {
    const validate = () => {
        if(input.checkValidity()) clearError(input);
    };
    input.addEventListener('input', validate);
    input.addEventListener('change', validate);
});

// ===================== Save / Update =====================
saveBtn.addEventListener("click", async () => {
    clearAllErrors();
    let isValid = true;

    form.querySelectorAll('.form-control[required], .form-select[required]').forEach(f => {
        if(!f.checkValidity()) {
            showError(f, f.title || 'This field is required');
            isValid = false;
        }
    });

    if(!isValid) return;

    const id = document.getElementById("membershipIdHidden").value;
    const data = {
        name: document.getElementById("name").value,
        description: document.getElementById("description").value,
        duration: parseInt(document.getElementById("duration").value),
        price: parseFloat(document.getElementById("price").value),
        status: document.getElementById("status").value
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${apiUrl}/${id}` : apiUrl;

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if(!res.ok) {
            const err = await res.text().catch(()=>null);
            throw new Error(err || 'Failed saving membership');
        }

        modal.hide();
        resetForm();
        fetchMemberships();
    } catch(err) {
        alert(err.message);
        console.error(err);
    }
});

// ===================== Modal Reset =====================
modalEl.addEventListener('hidden.bs.modal', resetForm);

// ===================== Init =====================
fetchMemberships();
