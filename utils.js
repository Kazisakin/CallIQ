const messageDiv = document.getElementById("message");

export function showMessage(text, type) {
  if (messageDiv) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
    setTimeout(() => (messageDiv.style.display = "none"), 5000);
  }
}

export function generateId(prefix) {
  return prefix + '_' + Date.now() + Math.random().toString(36).substr(2, 6);
}

export function logAction(action, details) {
  try {
    let auditLog = JSON.parse(localStorage.getItem("auditLog") || "[]");
    auditLog.push({ timestamp: new Date().toISOString(), action, details });
    localStorage.setItem("auditLog", JSON.stringify(auditLog));
  } catch (e) {
    console.warn("Failed to save audit log:", e);
  }
}

export function saveState(section, state) {
  try {
    const states = JSON.parse(localStorage.getItem("tableStates") || "{}");
    states[section] = state;
    localStorage.setItem("tableStates", JSON.stringify(states));
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

export function loadState(section) {
  try {
    const states = JSON.parse(localStorage.getItem("tableStates") || "{}");
    return states[section] || {};
  } catch (e) {
    return {};
  }
}

export function exportData() {
  try {
    const data = {
      callbacks: JSON.parse(localStorage.getItem("callbacks") || "[]"),
      interactions: JSON.parse(localStorage.getItem("interactions") || "[]"),
      auditLog: JSON.parse(localStorage.getItem("auditLog") || "[]")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scheduler_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage("Data exported successfully", "success");
    logAction("export", "Exported all data");
  } catch (e) {
    showMessage("Failed to export data", "error");
  }
}

export function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm("Importing will overwrite existing data. Continue?")) {
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.callbacks || !data.interactions) throw new Error("Invalid data format");
      localStorage.setItem("callbacks", JSON.stringify(data.callbacks));
      localStorage.setItem("interactions", JSON.stringify(data.interactions));
      localStorage.setItem("auditLog", JSON.stringify(data.auditLog || []));
      window.location.reload();
      showMessage("Data imported successfully", "success");
      logAction("import", "Imported data");
    } catch (err) {
      showMessage("Failed to import data: " + err.message, "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

export function debounce(func, delay) {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function sanitizeInput(input) {
  if (!input) return "";
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}