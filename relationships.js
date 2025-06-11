import { callbacks } from './callbacks.js';
import { interactions } from './interactions.js';
import { saveState, loadState, sanitizeInput } from './utils.js';

function renderRelationshipTable(search = "", sort = "callbackTime-asc") {
  const relationshipTable = document.getElementById("relationshipTable")?.querySelector("tbody");
  if (!relationshipTable) return;

  const searchField = document.getElementById("relationshipSearchField")?.value || "all";
  const state = loadState("relationships");
  search = search || state.search || "";
  sort = sort || state.sort || "callbackTime-asc";
  document.getElementById("relationshipSearch").value = search;
  document.getElementById("relationshipSort").value = sort;

  let filteredRelationships = interactions.filter(inter => inter.linkedCallbackId && (
    searchField === "all" ?
      [inter.linkedCallbackId, inter.id, inter.ban, inter.notes].some(field =>
        (field || "").toLowerCase().includes(search.toLowerCase())
      ) :
      ((searchField === "callbackId" ? inter.linkedCallbackId : searchField === "interactionId" ? inter.id : inter[searchField]) || "").toLowerCase().includes(search.toLowerCase())
  ));

  const [sortField, sortDir] = sort.split("-");
  filteredRelationships.sort((a, b) => {
    const callbackA = callbacks.find(cb => cb.id === a.linkedCallbackId) || {};
    const callbackB = callbacks.find(cb => cb.id === b.linkedCallbackId) || {};
    let aVal = sortField === "callbackTime" ? new Date(callbackA.time || 0) : sortField === "interactionDate" ? new Date(a.date) : a.ban || "";
    let bVal = sortField === "callbackTime" ? new Date(callbackB.time || 0) : sortField === "interactionDate" ? new Date(b.date) : b.ban || "";
    return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  relationshipTable.innerHTML = "";
  filteredRelationships.forEach(inter => {
    const callback = callbacks.find(cb => cb.id === inter.linkedCallbackId);
    if (callback) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sanitizeInput(inter.linkedCallbackId)}</td>
        <td>${sanitizeInput(inter.id)}</td>
        <td>${sanitizeInput(inter.ban)}</td>
        <td>${new Date(callback.time).toLocaleString()}</td>
        <td>${sanitizeInput(inter.date)}</td>
        <td>${sanitizeInput(inter.notes) || "-"}</td>
      `;
      relationshipTable.appendChild(row);
    }
  });
  saveState("relationships", { search, sort });
}

function resetRelationshipSearch() {
  const search = document.getElementById("relationshipSearch");
  const searchField = document.getElementById("relationshipSearchField");
  const sort = document.getElementById("relationshipSort");
  if (search && searchField && sort) {
    search.value = "";
    searchField.value = "all";
    sort.value = "callbackTime-asc";
    renderRelationshipTable();
  }
}

export { renderRelationshipTable, resetRelationshipSearch };