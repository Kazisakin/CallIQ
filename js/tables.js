export function toggleSelectAll({ tableId, checked }) {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      return { success: false, error: `Table with ID ${tableId} not found` };
    }
    const checkboxes = table.querySelectorAll('tbody tr input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
    return { success: true, count: checkboxes.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function updateBulkActionState({ tableId }) {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      return { success: false, error: `Table with ID ${tableId} not found` };
    }
    const bulkActionSelect = document.getElementById(`bulk-action-${tableId.replace('Table', 's')}`);
    const applyButton = document.getElementById(`apply-bulk-${tableId.replace('Table', 's')}`);
    if (!bulkActionSelect || !applyButton) {
      return { success: false, error: 'Bulk action controls not found' };
    }
    const checkedCheckboxes = table.querySelectorAll('tbody tr input[type="checkbox"]:checked');
    const isAnyChecked = checkedCheckboxes.length > 0;
    bulkActionSelect.disabled = !isAnyChecked;
    applyButton.disabled = !isAnyChecked;
    return { success: true, isEnabled: isAnyChecked };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function initializeTableEnhancements() {
  const tables = ['callbackTable', 'interactionTable'];

  tables.forEach(tableId => {
    const selectAllCheckbox = document.getElementById(`select-all-${tableId.replace('Table', 's')}`);
    const bulkActionSelect = document.getElementById(`bulk-action-${tableId.replace('Table', 's')}`);
    const applyButton = document.getElementById(`apply-bulk-${tableId.replace('Table', 's')}`);

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        const result = toggleSelectAll({ tableId, checked: selectAllCheckbox.checked });
        if (!result.success) {
          console.error(result.error);
        }
        const stateResult = updateBulkActionState({ tableId });
        if (!stateResult.success) {
          console.error(stateResult.error);
        }
      });
    }

    // Since no data rows exist, listen for future checkbox changes via delegation
    const table = document.getElementById(tableId);
    if (table) {
      table.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox' && event.target.closest('tbody tr')) {
          const stateResult = updateBulkActionState({ tableId });
          if (!stateResult.success) {
            console.error(stateResult.error);
          }
          // Update select-all state
          const allCheckboxes = table.querySelectorAll('tbody tr input[type="checkbox"]');
          const checkedCheckboxes = table.querySelectorAll('tbody tr input[type="checkbox"]:checked');
          selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
        }
      });
    }

    if (applyButton && bulkActionSelect) {
      applyButton.addEventListener('click', () => {
        const action = bulkActionSelect.value;
        if (action) {
          console.log(`Bulk action: ${action} applied on ${tableId}`);
          // Optionally log to activity (requires importing addActivity if needed)
          // For simplicity, log to console only
        }
      });
    }
  });
}