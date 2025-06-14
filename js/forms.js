export function addTag({ textareaId, tag }) {
  try {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      return { success: false, error: `Textarea with ID ${textareaId} not found` };
    }
    const currentValue = textarea.value.trim();
    const newValue = currentValue ? `${currentValue}, ${tag}` : tag;
    textarea.value = newValue;
    return { success: true, newValue };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function applyTemplate({ textareaId, template }) {
  try {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      return { success: false, error: `Textarea with ID ${textareaId} not found` };
    }
    const currentValue = textarea.value.trim();
    const newValue = currentValue ? `${currentValue}\n${template}` : template;
    textarea.value = newValue;
    return { success: true, newValue };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function initializeFormEnhancements() {
  // Callback form tag buttons
  const callbackTagButtons = document.querySelectorAll('#callbackForm .tag-suggestions button');
  callbackTagButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;
      const result = addTag({ textareaId: 'notes', tag });
      if (!result.success) {
        console.error(result.error);
      }
    });
  });

  // Interaction form tag buttons
  const interactionTagButtons = document.querySelectorAll('#interactionForm .tag-suggestions button');
  interactionTagButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;
      const result = addTag({ textareaId: 'iNotes', tag });
      if (!result.success) {
        console.error(result.error);
      }
    });
  });

  // Callback form template dropdown
  const callbackTemplateSelect = document.getElementById('notes-template');
  callbackTemplateSelect.addEventListener('change', () => {
    const template = callbackTemplateSelect.value;
    if (template) {
      const result = applyTemplate({ textareaId: 'notes', template });
      if (!result.success) {
        console.error(result.error);
      }
      callbackTemplateSelect.value = ''; // Reset dropdown
    }
  });

  // Interaction form template dropdown
  const interactionTemplateSelect = document.getElementById('iNotes-template');
  interactionTemplateSelect.addEventListener('change', () => {
    const template = interactionTemplateSelect.value;
    if (template) {
      const result = applyTemplate({ textareaId: 'iNotes', template });
      if (!result.success) {
        console.error(result.error);
      }
      interactionTemplateSelect.value = ''; // Reset dropdown
    }
  });
}