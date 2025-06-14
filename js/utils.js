export function switchSection(activeButton, activeSection) {
  const navButtons = [
    document.getElementById('nav-callbacks'),
    document.getElementById('nav-interactions'),
    document.getElementById('nav-relationships')
  ];
  const sections = [
    document.getElementById('callbacks-section'),
    document.getElementById('interactions-section'),
    document.getElementById('relationships-section')
  ];

  // Remove active class from all nav buttons
  navButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
  });
  // Hide all sections
  sections.forEach(section => {
    section.classList.remove('active');
  });
  // Set active button and section
  activeButton.classList.add('active');
  activeButton.setAttribute('aria-current', 'page');
  activeSection.classList.add('active');
}

export function toggleForm(form, toggleButton) {
  const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
  toggleButton.setAttribute('aria-expanded', !isExpanded);
  form.classList.toggle('active');
}

export function getCurrentDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}