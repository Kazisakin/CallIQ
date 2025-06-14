import { switchSection, toggleForm, getCurrentDateTime, getCurrentDate } from './utils.js';
import { initializeFormEnhancements } from './forms.js';
import { initializeIOEnhancements } from './io.js';
import { initializeActivityEnhancements, addActivity } from './activity.js';
import { initializeTableEnhancements } from './tables.js';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const navCallbacks = document.getElementById('nav-callbacks');
  const navInteractions = document.getElementById('nav-interactions');
  const navRelationships = document.getElementById('nav-relationships');
  const callbacksSection = document.getElementById('callbacks-section');
  const interactionsSection = document.getElementById('interactions-section');
  const relationshipsSection = document.getElementById('relationships-section');

  // Form toggle elements
  const toggleCallbackForm = document.getElementById('toggle-callback-form');
  const toggleInteractionForm = document.getElementById('toggle-interaction-form');
  const callbackForm = document.getElementById('callbackForm');
  const interactionForm = document.getElementById('interactionForm');
  const cancelCallbackForm = document.getElementById('cancel-callback-form');
  const cancelInteractionForm = document.getElementById('cancel-interaction-form');

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');

  // Initialize enhancements
  initializeFormEnhancements();
  initializeIOEnhancements();
  initializeActivityEnhancements();
  initializeTableEnhancements();

  // Navigation click handlers
  navCallbacks.addEventListener('click', () => {
    switchSection(navCallbacks, callbacksSection);
  });

  navInteractions.addEventListener('click', () => {
    switchSection(navInteractions, interactionsSection);
  });

  navRelationships.addEventListener('click', () => {
    switchSection(navRelationships, relationshipsSection);
  });

  // Form toggle handlers
  toggleCallbackForm.addEventListener('click', () => {
    toggleForm(callbackForm, toggleCallbackForm);
  });

  toggleInteractionForm.addEventListener('click', () => {
    toggleForm(interactionForm, toggleInteractionForm);
  });

  // Cancel form handlers
  cancelCallbackForm.addEventListener('click', () => {
    callbackForm.classList.remove('active');
    toggleCallbackForm.setAttribute('aria-expanded', 'false');
    callbackForm.reset();
    const result = addActivity({ message: 'Callback form canceled' });
    if (!result.success) {
      console.error(result.error);
    }
  });

  cancelInteractionForm.addEventListener('click', () => {
    interactionForm.classList.remove('active');
    toggleInteractionForm.setAttribute('aria-expanded', 'false');
    interactionForm.reset();
    const result = addActivity({ message: 'Interaction form canceled' });
    if (!result.success) {
      console.error(result.error);
    }
  });

  // Theme toggle handler
  themeToggle.addEventListener('click', () => {
    document.documentElement.toggleAttribute('data-theme', 'dark');
  });

  // Quick fill for today's date/time
  document.getElementById('fill-today-time').addEventListener('click', () => {
    document.getElementById('time').value = getCurrentDateTime();
  });

  document.getElementById('fill-today-iDate').addEventListener('click', () => {
    document.getElementById('iDate').value = getCurrentDate();
  });

  // Prevent form submission (no data flow)
  callbackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    callbackForm.classList.remove('active');
    toggleCallbackForm.setAttribute('aria-expanded', 'false');
    callbackForm.reset();
    const result = addActivity({ message: 'Callback form submitted' });
    if (!result.success) {
      console.error(result.error);
    }
  });

  interactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    interactionForm.classList.remove('active');
    toggleInteractionForm.setAttribute('aria-expanded', 'false');
    interactionForm.reset();
    const result = addActivity({ message: 'Interaction form submitted' });
    if (!result.success) {
      console.error(result.error);
    }
  });
});