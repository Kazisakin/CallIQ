import { initCallbacks } from './callbacks.js';
import { initInteractions } from './interactions.js';
import { renderRelationshipTable, resetRelationshipSearch } from './relationships.js';
import { showMessage, generateId, logAction, saveState, loadState, exportData, importData, debounce } from './utils.js';

// Global state
const sections = {
  callbacks: document.getElementById("callbacks-section"),
  interactions: document.getElementById("interactions-section"),
  relationships: document.getElementById("relationships-section")
};
const navButtons = {
  callbacks: document.getElementById("nav-callbacks"),
  interactions: document.getElementById("nav-interactions"),
  relationships: document.getElementById("nav-relationships")
};

// Navigation
function showSection(section) {
  try {
    Object.values(sections).forEach(s => s?.classList.remove("active"));
    Object.values(navButtons).forEach(b => {
      b?.classList.remove("active");
      b?.removeAttribute("aria-current");
    });
    if (sections[section]) {
      sections[section].classList.add("active");
      navButtons[section]?.classList.add("active");
      navButtons[section]?.setAttribute("aria-current", "page");
    } else {
      throw new Error(`Section ${section} not found`);
    }
  } catch (e) {
    showMessage(`Error switching to ${section} section`, "error");
    console.error(e);
  }
}

Object.keys(navButtons).forEach(key => {
  navButtons[key]?.addEventListener("click", () => showSection(key));
  navButtons[key]?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showSection(key);
    }
  });
});

// Theme toggle
const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => {
  try {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  } catch (e) {
    showMessage("Error toggling theme", "error");
    console.error(e);
  }
});

// Initialize theme
try {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
} catch (e) {
  showMessage("Error initializing theme", "error");
  console.error(e);
}

// Initialize modules
try {
  initCallbacks();
  initInteractions();
  renderRelationshipTable();
} catch (e) {
  showMessage("Error initializing application", "error");
  console.error(e);
}

// Search and sort for relationships
const debouncedRenderRelationships = debounce((search, sort) => renderRelationshipTable(search, sort), 300);
const relationshipSearch = document.getElementById("relationshipSearch");
const relationshipSort = document.getElementById("relationshipSort");
relationshipSearch?.addEventListener("input", (e) => {
  debouncedRenderRelationships(e.target.value, relationshipSort?.value || "callbackTime-asc");
});
relationshipSort?.addEventListener("change", (e) => {
  debouncedRenderRelationships(relationshipSearch?.value || "", e.target.value);
});

// Sample data for testing
try {
  if (!localStorage.getItem("callbacks")) {
    const sampleCallbacks = [
      { id: generateId("cb"), ban: "12345", name: "John Doe", phone: "1234567890", time: "2025-06-07T18:30", priority: "Medium", notes: "Follow-up call" }
    ];
    const sampleInteractions = [
      { id: generateId("int"), callId: "C001", interactionId: "I001", ban: "12345", linkedCallbackId: sampleCallbacks[0].id, date: "2025-06-07", provider: "Rogers", services: ["Internet"], notes: "Initial contact" }
    ];
    localStorage.setItem("callbacks", JSON.stringify(sampleCallbacks));
    localStorage.setItem("interactions", JSON.stringify(sampleInteractions));
    logAction("init", "Added sample data");
  }
} catch (e) {
  showMessage("Failed to initialize sample data", "error");
  console.error(e);
}

// Expose global functions
window.exportData = exportData;
window.importData = importData;
window.resetRelationshipSearch = resetRelationshipSearch;
window.fillToday = (id) => {
  try {
    const input = document.getElementById(id);
    if (input) {
      input.value = id === "iDate" ? new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 16);
    }
  } catch (e) {
    showMessage("Error filling date", "error");
    console.error(e);
  }
};
window.insertTag = (id, tag) => {
  try {
    const textarea = document.getElementById(id);
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.slice(0, start) + tag + " " + text.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + tag.length + 1;
      textarea.focus();
      saveDraft(id, textarea.value);
    }
  } catch (e) {
    showMessage("Error inserting tag", "error");
    console.error(e);
  }
};
window.insertTemplate = (id, template) => {
  if (template) window.insertTag(id, template);
};