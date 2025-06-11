import { showMessage, generateId, logAction, saveState, loadState, debounce, sanitizeInput, saveDraft, loadDraft } from './utils.js';
import { callbacks } from './callbacks.js';
import { renderRelationshipTable } from './relationships.js';

let interactions = [];
let editingInteractionId = null;
const serviceMap = {
  Fido: ["Wireless", "Home Internet"],
  Rogers: ["Internet", "TV", "Smart Home Monitoring", "Phone", "5G Home Internet", "Self Protect", "Streaming"]
};
const DEBUG = true;

function initInteractions() {
  try {
    interactions = JSON.parse(localStorage.getItem("interactions") || "[]");
    if (DEBUG) console.log("Interactions loaded:", interactions.length);
  } catch (e) {
    showMessage("Failed to load interactions", "error");
  }

  const interactionForm = document.getElementById("interactionForm");
  const interactionTable = document.getElementById("interactionTable")?.querySelector("tbody");
  const providerSelect = document.getElementById("provider");

  if (!interactionForm || !interactionTable || !providerSelect) {
    showMessage("Interaction form, table, or provider not found", "error");
    return;
  }

  interactionForm.addEventListener("submit", handleInteractionSubmit);
  providerSelect.addEventListener("change", () => renderServiceOptions(providerSelect.value));
  document.getElementById("callId")?.addEventListener("focus", () => document.getElementById("callId")?.select());
  ["callId", "interactionId", "iBan", "iDate", "provider", "iNotes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => saveDraft(id, el.value));
      const draft = loadDraft(id);
      if (draft) el.value = draft;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s" && interactionForm.classList.contains("active")) {
      e.preventDefault();
      interactionForm.dispatchEvent(new Event("submit"));
    }
  });

  const debouncedRender = debounce((search, sort) => renderInteractionTable(search, sort), 300);
  document.getElementById("interactionSearch")?.addEventListener("input", (e) => {
    debouncedRender(e.target.value, document.getElementById("interactionSort").value);
  });
  document.getElementById("interactionSort")?.addEventListener("change", (e) => {
    debouncedRender(document.getElementById("interactionSearch").value, e.target.value);
  });

  document.getElementById("iDate").value = new Date().toISOString().slice(0, 10);
  renderServiceOptions(providerSelect.value);
  updateCallbackDropdown();
  renderInteractionTable();
}

function validateInteractionForm() {
  const errors = [];
  const callId = document.getElementById("callId")?.value.trim();
  const interactionId = document.getElementById("interactionId")?.value.trim();
  const ban = document.getElementById("iBan")?.value.trim();
  const date = document.getElementById("iDate")?.value;
  if (!callId) errors.push({ id: "callIdError", message: "Call ID is required" });
  if (!interactionId) errors.push({ id: "interactionIdError", message: "Interaction ID is required" });
  if (!ban) errors.push({ id: "iBanError", message: "BAN is required" });
  if (!date) errors.push({ id: "iDateError", message: "Date is required" });
  document.querySelectorAll(".error").forEach(span => span.textContent = "");
  errors.forEach(err => {
    const span = document.getElementById(err.id);
    if (span) span.textContent = err.message;
  });
  return errors.length === 0;
}

function renderServiceOptions(provider) {
  const serviceFieldset = document.getElementById("serviceOptions");
  if (serviceFieldset) {
    serviceFieldset.innerHTML = `<legend>Services</legend>`;
    serviceMap[provider].forEach(service => {
      serviceFieldset.innerHTML += `<label><input type="checkbox" name="services" value="${service}" aria-label="${service}">${sanitizeInput(service)}</label><br>`;
    });
  }
}

function updateCallbackDropdown() {
  const linkedCallbackSelect = document.getElementById("linkedCallbackId");
  if (!linkedCallbackSelect) return;
  const linkedCallbackIds = interactions.map(inter => inter.linkedCallbackId).filter(id => id);
  linkedCallbackSelect.innerHTML = '<option value="">None</option>';
  callbacks.forEach(cb => {
    if (!linkedCallbackIds.includes(cb.id) || (editingInteractionId && interactions.find(i => i.id === editingInteractionId)?.linkedCallbackId === cb.id)) {
      const option = document.createElement("option");
      option.value = cb.id;
      option.textContent = `${sanitizeInput(cb.id)} - ${sanitizeInput(cb.name)} (${sanitizeInput(cb.ban)})`;
      linkedCallbackSelect.appendChild(option);
    }
  });
}

function renderInteractionTable(search = "", sort = "date-asc") {
  const interactionTable = document.getElementById("interactionTable")?.querySelector("tbody");
  const followUpContainer = document.getElementById("interaction-follow-ups");
  if (!interactionTable || !followUpContainer) return;

  const searchField = document.getElementById("interactionSearchField")?.value || "all";
  const state = loadState("interactions");
  search = search || state.search || "";
  sort = sort || state.sort || "date-asc";
  document.getElementById("interactionSearch").value = search;
  document.getElementById("interactionSort").value = sort;

  let filteredInteractions = interactions.filter(inter =>
    searchField === "all" ?
      [inter.id, inter.callId, inter.interactionId, inter.ban, inter.notes].some(field =>
        (field || "").toLowerCase().includes(search.toLowerCase())
      ) :
      (inter[searchField] || "").toLowerCase().includes(search.toLowerCase())
  );

  const [sortField, sortDir] = sort.split("-");
  filteredInteractions.sort((a, b) => {
    let aVal = a[sortField] || "";
    let bVal = b[sortField] || "";
    if (sortField === "date") {
      aVal = new Date(a.date);
      bVal = new Date(b.date);
    }
    return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  interactionTable.innerHTML = "";
  followUpContainer.innerHTML = "";
  filteredInteractions.forEach(inter => {
    const isEditing = editingInteractionId === inter.id;
    const row = document.createElement("tr");
    row.className = (inter.linkedCallbackId ? "linked-row" : "") + (isEditing ? " active-row" : "");
    row.innerHTML = `
      <td><input type="checkbox" class="select-interaction" data-id="${inter.id}"></td>
      <td>${isEditing ? `<input type="text" value="${sanitizeInput(inter.id)}" disabled>` : sanitizeInput(inter.id)}</td>
      <td>${isEditing ? `<input type="text" value="${sanitizeInput(inter.callId)}" data-field="callId">` : sanitizeInput(inter.callId)}</td>
      <td>${isEditing ? `<input type="text" value="${sanitizeInput(inter.interactionId)}" data-field="interactionId">` : sanitizeInput(inter.interactionId)}</td>
      <td>${isEditing ? `<input type="text" value="${sanitizeInput(inter.ban)}" data-field="ban">` : sanitizeInput(inter.ban)}</td>
      <td>${sanitizeInput(inter.linkedCallbackId) || "-"}</td>
      <td>${isEditing ? `<input type="date" value="${inter.date}" data-field="date">` : sanitizeInput(inter.date)}</td>
      <td>${isEditing ? `<select data-field="provider"><option value="Fido" ${inter.provider === "Fido" ? "selected" : ""}>Fido</option><option value="Rogers" ${inter.provider === "Rogers" ? "selected" : ""}>Rogers</option></select>` : sanitizeInput(inter.provider)}</td>
      <td>${inter.services.map(s => sanitizeInput(s)).join(", ") || "-"}</td>
      <td>${isEditing ? `<textarea data-field="notes">${sanitizeInput(inter.notes)}</textarea>` : sanitizeInput(inter.notes) || "-"}</td>
      <td class="action-buttons">
        ${isEditing ? `
          <button onclick="saveInlineEdit('interaction', '${inter.id}')">Save</button>
          <button onclick="cancelInlineEdit('interaction', '${inter.id}')">Cancel</button>
        ` : `
          <button onclick="editInteraction('${inter.id}')">Edit</button>
          <button onclick="deleteInteraction('${inter.id}')">Delete</button>
          <button onclick="addFollowUp('interaction', '${inter.id}')">Follow-Up</button>
        `}
      </td>
    `;
    interactionTable.appendChild(row);

    if (inter.followUps?.length) {
      inter.followUps.forEach(fu => {
        const card = document.createElement("div");
        card.className = `follow-up-card ${fu.completed ? "completed" : ""}`;
        card.innerHTML = `
          <span>${sanitizeInput(fu.text)} (Added: ${new Date(fu.timestamp).toLocaleString()})</span>
          <div>
            <button onclick="toggleFollowUpStatus('interaction', '${inter.id}', ${fu.id})">${fu.completed ? "Mark Incomplete" : "Mark Complete"}</button>
            <button onclick="deleteFollowUp('interaction', '${inter.id}', ${fu.id})">Delete</button>
          </div>
        `;
        followUpContainer.appendChild(card);
      });
    }
  });

  updateBulkActions("interaction");
  saveState("interactions", { search, sort });
}

function editInteraction(id) {
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  const fields = {
    callId: document.getElementById("callId"),
    interactionId: document.getElementById("interactionId"),
    iBan: document.getElementById("iBan"),
    linkedCallbackId: document.getElementById("linkedCallbackId"),
    iDate: document.getElementById("iDate"),
    provider: document.getElementById("provider"),
    iNotes: document.getElementById("iNotes")
  };
  Object.entries(fields).forEach(([key, el]) => {
    if (el) el.value = inter[key.replace(/^i/, "").toLowerCase()] || "";
  });
  renderServiceOptions(inter.provider);
  document.querySelectorAll('input[name="services"]').forEach(checkbox => {
    checkbox.checked = inter.services.includes(checkbox.value);
  });
  editingInteractionId = id;
  showMessage("Editing interaction: " + id, "success");
  document.getElementById("interactions-section")?.classList.add("active");
  if (!document.getElementById("interactionForm")?.classList.contains("active")) toggleForm("interactionForm");
  logAction("edit_start", `Started editing interaction ${id}`);
}

function deleteInteraction(id) {
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  if (confirm(`Delete interaction ${id}?`)) {
    try {
      interactions = interactions.filter(i => i.id !== id);
      editingInteractionId = null;
      localStorage.setItem("interactions", JSON.stringify(interactions));
      renderInteractionTable();
      renderRelationshipTable();
      updateCallbackDropdown();
      showMessage("Interaction deleted successfully", "success");
      logAction("delete", `Deleted interaction ${id}`);
    } catch (e) {
      showMessage("Failed to delete interaction", "error");
    }
  }
}

function addFollowUp(type, id) {
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  const text = prompt("Enter follow-up action:");
  if (text) {
    inter.followUps = inter.followUps || [];
    inter.followUps.push({ id: Date.now(), text: sanitizeInput(text), timestamp: new Date().toISOString(), completed: false });
    localStorage.setItem("interactions", JSON.stringify(interactions));
    renderInteractionTable();
    showMessage("Follow-up added", "success");
    logAction("follow_up", `Added follow-up for interaction ${id}`);
  }
}

function toggleFollowUpStatus(type, id, fuId) {
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  const fu = inter.followUps?.find(f => f.id === fuId);
  if (fu) {
    fu.completed = !fu.completed;
    localStorage.setItem("interactions", JSON.stringify(interactions));
    renderInteractionTable();
    showMessage(`Follow-up marked as ${fu.completed ? "complete" : "incomplete"}`, "success");
    logAction("follow_up_status", `Toggled follow-up ${fuId} for interaction ${id}`);
  }
}

function deleteFollowUp(type, id, fuId) {
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  if (confirm("Delete follow-up?")) {
    inter.followUps = inter.followUps?.filter(f => f.id !== fuId) || [];
    localStorage.setItem("interactions", JSON.stringify(interactions));
    renderInteractionTable();
    showMessage("Follow-up deleted", "success");
    logAction("follow_up_delete", `Deleted follow-up ${fuId} for interaction ${id}`);
  }
}

function saveInlineEdit(type, id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  const inter = interactions.find(i => i.id === id);
  if (!inter) return;
  const updated = {
    ...inter,
    callId: row.querySelector('[data-field="callId"]')?.value.trim() || inter.callId,
    interactionId: row.querySelector('[data-field="interactionId"]')?.value.trim() || inter.interactionId,
    ban: row.querySelector('[data-field="ban"]')?.value.trim() || inter.ban,
    date: row.querySelector('[data-field="date"]')?.value || inter.date,
    provider: row.querySelector('[data-field="provider"]')?.value || inter.provider,
    notes: row.querySelector('[data-field="notes"]')?.value.trim() || inter.notes
  };
  if (!updated.callId || !updated.interactionId || !updated.ban || !updated.date) {
    showMessage("Invalid input in inline edit", "error");
    return;
  }
  const index = interactions.findIndex(i => i.id === id);
  interactions[index] = updated;
  editingInteractionId = null;
  localStorage.setItem("interactions", JSON.stringify(interactions));
  renderInteractionTable();
  renderRelationshipTable();
  updateCallbackDropdown();
  showMessage("Interaction updated successfully", "success");
  logAction("edit_inline", `Updated interaction ${id} inline`);
}

function cancelInlineEdit(type, id) {
  editingInteractionId = null;
  renderInteractionTable();
}

function toggleSelectAll(type) {
  const checkboxes = document.querySelectorAll(`.select-${type}`);
  const selectAll = document.getElementById(`select-all-${type}`);
  checkboxes.forEach(cb => cb.checked = selectAll.checked);
  updateBulkActions(type);
}

function updateBulkActions(type) {
  const selected = document.querySelectorAll(`.select-${type}:checked`);
  const bulkSelect = document.getElementById(`bulk-action-${type}`);
  const applyButton = document.getElementById(`apply-bulk-${type}`);
  if (selected.length > 0) {
    bulkSelect.disabled = false;
    applyButton.disabled = false;
  } else {
    bulkSelect.disabled = true;
    applyButton.disabled = true;
  }
}

function applyBulkAction(type) {
  const selected = Array.from(document.querySelectorAll(`.select-${type}:checked`)).map(cb => cb.dataset.id);
  const action = document.getElementById(`bulk-action-${type}`).value;
  if (!selected.length || !action) return;

  if (action === "delete") {
    if (!confirm(`Delete ${selected.length} interactions?`)) return;
    interactions = interactions.filter(i => !selected.includes(i.id));
  }

  localStorage.setItem("interactions", JSON.stringify(interactions));
  renderInteractionTable();
  showMessage(`Deleted ${selected.length} interactions`, "success");
  logAction("bulk_action", `Deleted ${selected.length} interactions`);
  document.getElementById(`select-all-${type}`).checked = false;
  updateBulkActions(type);
}

function handleInteractionSubmit(e) {
  e.preventDefault();
  if (!validateInteractionForm()) return;
  const linkedCallbackId = document.getElementById("linkedCallbackId")?.value;
  if (linkedCallbackId) {
    const existingInteraction = interactions.find(inter => inter.linkedCallbackId === linkedCallbackId && inter.id !== (editingInteractionId || null));
    if (existingInteraction) {
      showMessage(`Callback ${linkedCallbackId} is already linked to interaction ${existingInteraction.id}`, "error");
      return;
    }
  }
  const services = Array.from(document.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);
  const interaction = {
    id: editingInteractionId || generateId("int"),
    callId: sanitizeInput(document.getElementById("callId").value.trim()),
    interactionId: sanitizeInput(document.getElementById("interactionId").value.trim()),
    ban: sanitizeInput(document.getElementById("iBan").value.trim()),
    linkedCallbackId,
    date: document.getElementById("iDate").value,
    provider: document.getElementById("provider").value,
    services,
    notes: sanitizeInput(document.getElementById("iNotes").value.trim()),
    followUps: editingInteractionId ? (interactions.find(i => i.id === editingInteractionId)?.followUps || []) : []
  };
  try {
    if (editingInteractionId) {
      const index = interactions.findIndex(i => i.id === editingInteractionId);
      interactions[index] = interaction;
      showMessage("Interaction updated successfully", "success");
      logAction("edit", `Updated interaction ${interaction.id}`);
      editingInteractionId = null;
    } else {
      interactions.push(interaction);
      showMessage("Interaction added successfully", "success");
      logAction("add", `Added interaction ${interaction.id}`);
    }
    resetInteractionForm();
    localStorage.setItem("interactions", JSON.stringify(interactions));
    renderInteractionTable();
    renderRelationshipTable();
    updateCallbackDropdown();
  } catch (e) {
    showMessage("Failed to save interaction", "error");
  }
}

function resetInteractionForm() {
  const interactionForm = document.getElementById("interactionForm");
  const providerSelect = document.getElementById("provider");
  if (interactionForm && providerSelect) {
    interactionForm.reset();
    document.getElementById("iDate").value = new Date().toISOString().slice(0, 10);
    editingInteractionId = null;
    document.querySelectorAll(".error").forEach(span => span.textContent = "");
    renderServiceOptions(providerSelect.value);
    toggleForm("interactionForm");
    ["callId", "interactionId", "iBan", "iDate", "provider", "iNotes"].forEach(id => saveDraft(id, ""));
  }
}

function resetInteractionSearch() {
  const search = document.getElementById("interactionSearch");
  const searchField = document.getElementById("interactionSearchField");
  const sort = document.getElementById("interactionSort");
  if (search && searchField && sort) {
    search.value = "";
    searchField.value = "all";
    sort.value = "date-asc";
    renderInteractionTable();
  }
}

function toggleForm(formId) {
  const form = document.getElementById(formId);
  const button = document.querySelector(`.form-toggle[onclick="toggleForm('${formId}')"]`);
  if (form && button) {
    const isActive = form.classList.toggle("active");
    button.textContent = isActive ? `Hide Interaction Form` : `Add New Interaction`;
    button.setAttribute("aria-expanded", isActive);
    if (isActive) document.getElementById("callId")?.focus();
  }
}

window.editInteraction = editInteraction;
window.deleteInteraction = deleteInteraction;
window.addFollowUp = addFollowUp;
window.toggleFollowUpStatus = toggleFollowUpStatus;
window.deleteFollowUp = deleteFollowUp;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.toggleSelectAll = toggleSelectAll;
window.applyBulkAction = applyBulkAction;
window.resetInteractionForm = resetInteractionForm;
window.resetInteractionSearch = resetInteractionSearch;
window.toggleForm = toggleForm;

export { initInteractions, interactions, updateCallbackDropdown };