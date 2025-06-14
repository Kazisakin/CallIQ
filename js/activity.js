export function addActivity({ message, timestamp = new Date().toISOString() }) {
  try {
    const activityLog = document.getElementById('activity-log');
    if (!activityLog) {
      return { success: false, error: 'Activity log element not found' };
    }
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const listItem = document.createElement('li');
    listItem.textContent = `${message} at ${time}`;
    activityLog.prepend(listItem); // Add to top of list
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function initializeActivityEnhancements() {
  // Optional: Clear log on initialization (for testing)
  const activityLog = document.getElementById('activity-log');
  if (activityLog) {
    activityLog.innerHTML = '';
  }
}