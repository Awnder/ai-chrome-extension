chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXTAREA_UPDATE") {
    console.log("Textarea content updated:", message.value);
  }
  sendResponse({ success: true }); // Always send a response
  return true; // Keep the service worker alive
});
