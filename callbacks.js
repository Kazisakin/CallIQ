import { showMessage, generateId, logAction, saveState, loadState, debounce, sanitizeInput, saveDraft, loadDraft } from './utils.js';
import { updateCallbackDropdown } from './interactions.js';
import { renderRelationshipTable } from './relationships.js';

let callbacks = [];
let editingCallbackId = null;
const priorityOrder = { High: 1, Medium: 2, Low: 3 };
const DEBUG = true;

function initCallbacks() {
  try {
    callbacks = JSON.parse(localStorage.getItem("callbacks") || "[]");
    if (DEBUG) console.log("Callbacks loaded:", callbacks.length);
  } catch (e) {
    showMessage("Failed to load callbacks", "error");
    console.error(e);
  }

  const callbackForm = document.getElementById("callbackForm");
  const callbackTable = document.getElementById("callbackTable")?.querySelector("tbody");

  if (!callbackForm || !callbackTable) {
    showMessage("Callback form or table not found", "error");
    return;
  }

  callbackForm.addEventListener("submit", handleCallbackSubmit);
  document.getElementById("ban")?.addEventListener("focus", () => document.getElementById("ban")?.select());
  ["ban", "name", "phone", "time", "priority", "notes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => saveDraft(id, el.value));
      const draft = loadDraft(id);
      if (draft) el.value = draft;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s" && callbackForm.classList.contains("active")) {
      e.preventDefault();
      callbackForm.dispatchEvent(new Event("submit"));
    }
  });

  const debouncedRender = debounce((search, sort) => renderCallbackTable(search, sort), 300);
  document.getElementById("callbackSearch")?.addEventListener("input", (e) => {
    debouncedRender(e.target.value, document.getElementById("callbackSort")?.value || "priority-asc");
  });
  document.getElementById("callbackSort")?.addEventListener("change", (e) => {
    debouncedRender(document.getElementById("callbackSearch")?.value || "", e.target.value);
  });

  notifyTodayCallbacks();
  renderCallbackTable();
}

function saveCallbacks() {
  try {
    localStorage.setItem("callbacks", JSON.stringify(callbacks));
    renderCallbackTable();
    updateCallbackDropdown();
    renderRelationshipTable();
    if (DEBUG) console.log("Callbacks saved:", callbacks.length);
  } catch (e) {
    showMessage("Failed to save callbacks", "error");
    console.error(e);
  }
}

function validateCallbackForm() {
  const errors = [];
  const ban = document.getElementById("ban")?.value?.trim();
  const name = document.getElementById("name")?.value?.trim();
  const phone = document.getElementById("phone")?.value?.trim();
  const time = document.getElementById("time")?.value;
  if (!ban) errors.push({ id: "banError", message: "BAN is required" });
  if (!name) errors.push({ id: "nameError", message: "Name is required" });
  if (phone && !/^\d{10}$/.test(phone)) errors.push({ id: "phoneError", message: "Invalid 10-digit phone number" });
  if (!time) errors.push({ id: "timeError", message: "Callback time is required" });
  document.querySelectorAll(".error").forEach(span => span.textContent = "");
  errors.forEach(err => {
    const span = document.getElementById(err.id);
    if (span) span.textContent = err.message;
  });
  return errors.length === 0;
}

function renderCallbackTable(search = "", sort = "priority-asc") {
  try {
    const callbackTable = document.getElementById("callbackTable")?.querySelector("tbody");
    const followUpContainer = document.getElementById("callback-follow-ups");
    if (!callbackTable || !followUpContainer) {
      throw new Error("Callback table or follow-up container not found");
    }

    const searchField = document.getElementById("callbackSearchField")?.value || "all";
    const state = loadState("callbacks");
    search = search || state.search || "";
    sort = sort || state.sort || "priority-asc";
    document.getElementById("callbackSearch").value = search;
    document.getElementById("callbackSort").value = sort;

    let filteredCallbacks = callbacks.filter(cb =>
      searchField === "all" ?
        [cb.id, cb.ban, cb.name, cb.phone, cb.notes].some(field =>
          (field || "").toLowerCase().includes(search.toLowerCase())
        ) :
        (cb[searchField] || "").toLowerCase().includes(search.toLowerCase())
    );

    const [sortField, sortDir] = sort.split("-");
    filteredCallbacks.sort((a, b) => {
      let aVal, bVal;
      if (sortField === "priority") {
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
      } else if (sortField === "time") {
        aVal = new Date(a.time);
        bVal = new Date(b.time);
      } else {
        aVal = a[sortField] || "";
        bVal = b[sortField] || "";
      }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    callbackTable.innerHTML = "";
    followUpContainer.innerHTML = "";
    filteredCallbacks.forEach(cb => {
      const linkedInteraction = JSON.parse(localStorage.getItem("interactions") || "[]").find(inter => inter.linkedCallbackId === cb.id);
      const isEditing = editingCallbackId === cb.id;
      const row = document.createElement("tr");
      row.className = (linkedInteraction ? "linked-row" : "") + (isEditing ? " active-row" : "");
      row.innerHTML = `
        <td><input type="checkbox" class="select-callback" data-id="${cb.id}"></td>
        <td>${isEditing ? `<input type="text" value="${sanitizeInput(cb.id)}" disabled>` : sanitizeInput(cb.id)}</td>
        <td>${isEditing ? `<input type="text" value="${sanitizeInput(cb.ban)}" data-field="ban">` : sanitizeInput(cb.ban)}</td>
        <td>${isEditing ? `<input type="text" value="${sanitizeInput(cb.name)}" data-field="name">` : sanitizeInput(cb.name)}</td>
        <td>${isEditing ? `<input type="text" value="${sanitizeInput(cb.phone)}" data-field="phone">` : sanitizeInput(cb.phone)}</td>
        <td>${isEditing ? `<input type="datetime-local" value="${cb.time.slice(0, 16)}" data-field="time">` : new Date(cb.time).toLocaleString()}</td>
        <td>${isEditing ? `<select data-field="priority"><option value="High" ${cb.priority === "High" ? "selected" : ""}>High</option><option value="Medium" ${cb.priority === "Medium" ? "selected" : ""}>Medium</option><option value="Low" ${cb.priority === "Low" ? "selected" : ""}>Low</option></select>` : sanitizeInput(cb.priority)}</td>
        <td>${isEditing ? `<textarea data-field="notes">${sanitizeInput(cb.notes)}</textarea>` : sanitizeInput(cb.notes) || "-"}</td>
        <td>${linkedInteraction ? sanitizeInput(linkedInteraction.id) : "-"}</td>
        <td class="action-buttons">
          ${isEditing ? `
            <button onclick="saveInlineEdit('callback', '${cb.id}')">Save</button>
            <button onclick="cancelInlineEdit('callback', '${cb.id}')">Cancel</button>
          ` : `
            <button onclick="editCallback('${cb.id}')">Edit</button>
            <button onclick="deleteCallback('${cb.id}')">Delete</button>
            <button onclick="addFollowUp('callback', '${cb.id}')">Follow-Up</button>
          `}
        </td>
      `;
      callbackTable.appendChild(row);

      if (cb.followUps?.length) {
        cb.followUps.forEach(fu => {
          const card = document.createElement("div");
          card.className = `follow-up-card ${fu.completed ? "completed" : ""}`;
          card.innerHTML = `
            <span>${sanitizeInput(fu.text)} (Added: ${new Date(fu.timestamp).toLocaleString()})</span>
            <div>
              <button onclick="toggleFollowUpStatus('callback', '${cb.id}', ${fu.id})">${fu.completed ? "Mark Incomplete" : "Mark Complete"}</button>
              <button onclick="deleteFollowUp('callback', '${cb.id}', ${fu.id})">Delete</button>
            </div>
          `;
          followUpContainer.appendChild(card);
        });
      }
    });

    updateBulkActions("callback");
    saveState("callbacks", { search, sort });
  } catch (e) {
    showMessage("Error rendering callback table", "error");
    console.error(e);
  }
}

function editCallback(id) {
  try {
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    const fields = {
      ban: document.getElementById("ban"),
      name: document.getElementById("name"),
      phone: document.getElementById("phone"),
      time: document.getElementById("time"),
      priority: document.getElementById("priority"),
      notes: document.getElementById("notes")
    };
    Object.entries(fields).forEach(([key, el]) => {
      if (el) el.value = cb[key] || "";
    });
    editingCallbackId = id;
    showMessage("Editing callback: " + id, "success");
    document.getElementById("callbacks-section")?.classList.add("active");
    if (!document.getElementById("callbackForm")?.classList.contains("active")) toggleForm("callbackForm");
    logAction("edit_start", `Started editing callback ${id}`);
  } catch (e) {
    showMessage("Error editing callback", "error");
    console.error(e);
  }
}

function deleteCallback(id) {
  try {
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    const interactions = JSON.parse(localStorage.getItem("interactions") || "[]");
    const linkedInteraction = interactions.find(inter => inter.linkedCallbackId === id);
    if (linkedInteraction) {
      showMessage(`Cannot delete callback ${id}: linked to interaction ${linkedInteraction.id}`, "error");
      return;
    }
    if (confirm(`Delete callback ${id}?`)) {
      callbacks = callbacks.filter(c => c.id !== id);
      editingCallbackId = null;
      saveCallbacks();
      showMessage("Callback deleted successfully", "success");
      logAction("delete", `Deleted callback ${id}`);
    }
  } catch (e) {
    showMessage("Error deleting callback", "error");
    console.error(e);
  }
}

function handleCallbackSubmit(e) {
  e.preventDefault();
  try {
    if (!validateCallbackForm()) return;
    const cb = {
      id: editingCallbackId || generateId("cb"),
      ban: sanitizeInput(document.getElementById("ban").value.trim()),
      name: sanitizeInput(document.getElementById("name").value.trim()),
      phone: sanitizeInput(document.getElementById("phone").value.trim()),
      time: document.getElementById("time").value,
      priority: document.getElementById("priority").value,
      notes: sanitizeInput(document.getElementById("notes").value.trim()),
      followUps: editingCallbackId ? (callbacks.find(c => c.id === editingCallbackId)?.followUps || []) : []
    };
    if (editingCallbackId) {
      const index = callbacks.findIndex(c => c.id === editingCallbackId);
      callbacks[index] = cb;
      showMessage("Callback updated successfully", "success");
      logAction("edit", `Updated callback ${cb.id}`);
    } else {
      callbacks.push(cb);
      showMessage("Callback added successfully", "success");
      logAction("add", `Added callback ${cb.id}`);
    }
    resetCallbackForm();
    saveCallbacks();
  } catch (e) {
    showMessage("Failed to save callback", "error");
    console.error(e);
  }
}

function saveInlineEdit(type, id) {
  try {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) throw new Error(`Row for ${id} not found`);
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    const updated = {
      ...cb,
      ban: row.querySelector('[data-field="ban"]')?.value.trim() || cb.ban,
      name: row.querySelector('[data-field="name"]')?.value.trim() || cb.name,
      phone: row.querySelector('[data-field="phone"]')?.value.trim() || cb.phone,
      time: row.querySelector('[data-field="time"]')?.value || cb.time,
      priority: row.querySelector('[data-field="priority"]')?.value || cb.priority,
      notes: row.querySelector('[data-field="notes"]')?.value.trim() || cb.notes
    };
    if (!updated.ban || !updated.name || !updated.time || (updated.phone && !/^\d{10}$/.test(updated.phone))) {
      showMessage("Invalid input in inline edit", "error");
      return;
    }
    const index = callbacks.findIndex(c => c.id === id);
    callbacks[index] = updated;
    editingCallbackId = null;
    saveCallbacks();
    showMessage("Callback updated successfully", "success");
    logAction("edit_inline", `Updated callback ${id} inline`);
  } catch (e) {
    showMessage("Error saving inline edit", "error");
    console.error(e);
  }
}

function cancelInlineEdit(type, id) {
  editingCallbackId = null;
  renderCallbackTable();
}

function addFollowUp(type, id) {
  try {
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    const text = prompt("Enter follow-up action:");
    if (text) {
      cb.followUps = cb.followUps || [];
      cb.followUps.push({ id: Date.now(), text: sanitizeInput(text), timestamp: new Date().toISOString(), completed: false });
      saveCallbacks();
      showMessage("Follow-up added", "success");
      logAction("follow_up", `Added follow-up for callback ${id}`);
    }
  } catch (e) {
    showMessage("Error adding follow-up", "error");
    console.error(e);
  }
}

function toggleFollowUpStatus(type, id, fuId) {
  try {
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    const fu = cb.followUps?.find(f => f.id === fuId);
    if (!fu) throw new Error(`Follow-up ${fuId} not found`);
    fu.completed = !fu.completed;
    saveCallbacks();
    showMessage(`Follow-up marked as ${fu.completed ? "complete" : "incomplete"}`, "success");
    logAction("follow_up_status", `Toggled follow-up ${fuId} for callback ${id}`);
  } catch (e) {
    showMessage("Error toggling follow-up status", "error");
    console.error(e);
  }
}

function deleteFollowUp(type, id, fuId) {
  try {
    const cb = callbacks.find(c => c.id === id);
    if (!cb) throw new Error(`Callback ${id} not found`);
    if (confirm("Delete follow-up?")) {
      cb.followUps = cb.followUps?.filter(f => f.id !== fuId) || [];
      saveCallbacks();
      showMessage("Follow-up deleted", "success");
      logAction("follow_up_delete", `Deleted follow-up ${fuId} for callback ${id}`);
    }
  } catch (e) {
    showMessage("Error deleting follow-up", "error");
    console.error(e);
  }
}

function toggleSelectAll(type) {
  try {
    const checkboxes = document.querySelectorAll(`.select-${type}`);
    const selectAll = document.getElementById(`select-all-${type}`);
    if (selectAll) {
      checkboxes.forEach(cb => cb.checked = selectAll.checked);
      updateBulkActions(type);
    }
  } catch (e) {
    showMessage("Error toggling select all", "error");
    console.error(e);
  }
}

function updateBulkActions(type) {
  try {
    const selected = document.querySelectorAll(`.select-${type}:checked`);
    const bulkSelect = document.getElementById(`bulk-action-${type}`);
    const applyButton = document.getElementById(`apply-bulk-${type}`);
    if (bulkSelect && applyButton) {
      if (selected.length > 0) {
        bulkSelect.disabled = false;
        applyButton.disabled = false;
      } else {
        bulkSelect.disabled = true;
        applyButton.disabled = true;
      }
    }
  } catch (e) {
    showMessage("Error updating bulk actions", "error");
    console.error(e);
  }
}

function applyBulkAction(type) {
  try {
    const selected = Array.from(document.querySelectorAll(`.select-${type}:checked`)).map(cb => cb.dataset.id);
    const action = document.getElementById(`bulk-action-${type}`)?.value;
    if (!selected.length || !action) return;

    if (action === "delete") {
      const interactions = JSON.parse(localStorage.getItem("interactions") || "[]");
      const linked = callbacks.filter(cb => selected.includes(cb.id) && interactions.find(inter => inter.linkedCallbackId === cb.id));
      if (linked.length) {
        showMessage(`Cannot delete callbacks linked to interactions: ${linked.map(cb => cb.id).join(", ")}`, "error");
        return;
      }
      if (!confirm(`Delete ${selected.length} callbacks?`)) return;
      callbacks = callbacks.filter(cb => !selected.includes(cb.id));
    } else if (action.startsWith("priority-")) {
      const priority = action.split("-")[1].charAt(0).toUpperCase() + action.split("-")[1].slice(1);
      callbacks = callbacks.map(cb => selected.includes(cb.id) ? { ...cb, priority } : cb);
    }

    saveCallbacks();
    showMessage(`${action} applied to ${selected.length} callbacks`, "success");
    logAction("bulk_action", `Applied ${action} to ${selected.length} callbacks`);
    document.getElementById(`select-all-${type}`).checked = false;
    updateBulkActions(type);
  } catch (e) {
    showMessage("Error applying bulk action", "error");
    console.error(e);
  }
}

function notifyTodayCallbacks() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const urgent = callbacks.filter(cb => cb.priority === "High" || cb.time.startsWith(today));
    if (urgent.length > 0) {
      showMessage(`You have ${urgent.length} urgent or due callbacks today!`, "success");
    }
  } catch (e) {
    showMessage("Error notifying callbacks", "error");
    console.error(e);
  }
}

function resetCallbackForm() {
  try {
    const callbackForm = document.getElementById("callbackForm");
    if (callbackForm) {
      callbackForm.reset();
      editingCallbackId = null;
      document.querySelectorAll(".error").forEach(span => span.textContent = "");
      toggleForm("callbackForm");
      ["ban", "name", "phone", "time", "priority", "notes"].forEach(id => saveDraft(id, ""));
    }
  } catch (e) {
    showMessage("Error resetting callback form", "error");
    console.error(e);
  }
}

function resetCallbackSearch() {
  try {
    const search = document.getElementById("callbackSearch");
    const searchField = document.getElementById("callbackSearchField");
    const sort = document.getElementById("callbackSort");
    if (search && searchField && sort) {
      search.value = "";
      searchField.value = "all";
      sort.value = "priority-asc";
      renderCallbackTable();
    }
  } catch (e) {
    showMessage("Error resetting callback search", "error");
    console.error(e);
  }
}

function toggleForm(formId) {
  try {
    const form = document.getElementById(formId);
    const button = document.querySelector(`.form-toggle[onclick="toggleForm('${formId}')"]`);
    if (form && button) {
      const isActive = form.classList.toggle("active");
      button.textContent = isActive ? `Hide ${formId.includes("callback") ? "Callback" : "Interaction"} Form` : `Add New ${formId.includes("callback") ? "Callback" : "Interaction"}`;
      button.setAttribute("aria-expanded", isActive);
      if (isActive) document.getElementById(formId.includes("callback") ? "ban" : "callId")?.focus();
    }
  } catch (e) {
    showMessage("Error toggling form", "error");
    console.error(e);
  }
}

window.editCallback = editCallback;
window.deleteCallback = deleteCallback;
window.toggleForm = toggleForm;
window.resetCallbackForm = resetCallbackForm;
window.resetCallbackSearch = resetCallbackSearch;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.addFollowUp = addFollowUp;
window.toggleFollowUpStatus = toggleFollowUpStatus;
window.deleteFollowUp = deleteFollowUp;
window.toggleSelectAll = toggleSelectAll;
window.applyBulkAction = applyBulkAction;

export { initCallbacks, callbacks };