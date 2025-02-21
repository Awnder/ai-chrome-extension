let currentTextarea = null;
let currentHandler = null;

// Detect when a textarea gains focus
document.addEventListener('focusin', (event) => {
  if (event.target.tagName === 'TEXTAREA') {
    // Clean up previous listener (if any)
    if (currentTextarea && currentHandler) {
      currentTextarea.removeEventListener('input', currentHandler);
      currentHandler = null;
    }

    currentTextarea = event.target;
    currentHandler = setupTextareaListener(currentTextarea);
  }
});

// Detect when a textarea loses focus
document.addEventListener('focusout', (event) => {
  if (event.target === currentTextarea) {
    // Clean up listener when focus is lost
    if (currentTextarea && currentHandler) {
      currentTextarea.removeEventListener('input', currentHandler);
      currentHandler = null;
    }
    currentTextarea = null;
  }
});

// Listen for input events with debouncing
function setupTextareaListener(textarea) {
  let debounceTimeout;

  const handleInput = () => {
    // Clear any pending timeout
    clearTimeout(debounceTimeout);

    // Set new timeout to fire after 2 seconds of inactivity
    debounceTimeout = setTimeout(() => {
      // Only send if the textarea is still focused
      if (document.activeElement === textarea) {
        chrome.runtime.sendMessage({
          type: 'TEXTAREA_UPDATE',
          value: textarea.value
        });
      }
    }, 2000);
  };

  textarea.addEventListener('input', handleInput);
  return handleInput; // Return the handler for cleanup
}