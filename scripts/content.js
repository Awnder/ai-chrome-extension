let currentTextarea = null;
let currentHandler = null;

// Detect when a textarea gains focus
document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (target && target.tagName === "TEXTAREA") {
    currentTextarea = target;
    currentHandler = setupTextareaListener(currentTextarea);

    if (!(target instanceof HTMLElement)) {
      console.error("Target is not an HTMLElement:", target);
      return;
    }

    // Ensure textarea is not already wrapped
    if (!target.parentElement.classList.contains("textarea-container")) {
      const container = document.createElement("div");
      container.classList.add("textarea-container");
      container.style.position = "relative";
      container.style.display = "inline-block";
      container.style.width = `${target.offsetWidth}px`; // Match textarea width
      container.style.height = `${target.offsetHeight}px`; // Match textarea height

      // Insert container and move textarea inside
      target.parentElement.insertBefore(container, target);
      container.appendChild(target);

      // Create the ghost suggestion text element
      const suggestionOverlay = document.createElement("div");
      suggestionOverlay.classList.add("suggestion-overlay");

      // Copy necessary styles from the textarea
      const computed = window.getComputedStyle(target);
      Object.assign(suggestionOverlay.style, {
        position: "absolute",
        top: computed.paddingTop,
        left: computed.paddingLeft,
        width: "100%",
        height: "100%",
        color: computed.getPropertyValue("background-color"), 
        pointerEvents: "none", // Allow text input
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        overflow: "hidden",
        padding: computed.padding,
        zIndex: "1" // Ensure overlay stays behind text
      });

      container.appendChild(suggestionOverlay);
      target.suggestionOverlay = suggestionOverlay;

      // Match textarea background to prevent double text effect
      target.style.background = "transparent";
      target.style.position = "relative";
      target.style.zIndex = "2"; // Ensure input is above the overlay

      suggestionOverlay.style.zIndex = "1"; // Ensure overlay stays behind text
      suggestionOverlay.style.overflow = "hidden"; // Prevent unwanted scrolling

      // Clear overlay text whenever the user starts typing
      target.addEventListener("focus", () => {
        suggestionOverlay.textContent = ""; // Clear the suggestion when focus happens
      });

      target.focus();
    }
  }
});

// Detect when a textarea loses focus
document.addEventListener("focusout", (event) => {
  if (event.target === currentTextarea) {
    // Clean up listener when focus is lost
    if (currentTextarea && currentHandler) {
      currentTextarea.removeEventListener("input", currentHandler);
      currentHandler = null;
    }
    currentTextarea = null;
  }
});

function escapeHTML(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

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

        // Only send if the textarea has more than 10 characters
        if (currentTextarea && currentTextarea.value.trim().length <= 10) {
          currentTextarea.suggestionOverlay.innerHTML = "";
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: "TEXTAREA_UPDATE",
            value: currentTextarea.value,
          },
          (response) => {
            if (
              response &&
              response.success &&
              currentTextarea.suggestionOverlay
            ) {
              console.log("userText", currentTextarea.value);
              const userText = currentTextarea.value;
              console.log("suggestion", response.result);
              const suggestion = response.result; // e.g., "me is Bob."

              // Build overlay content:
              // The user text is rendered normally and the suggestion is in a span with a lighter color.
              console.log("escapeHTML(userText)", escapeHTML(userText));
              console.log("escapeHTML(suggestion)", escapeHTML(suggestion));
              console.log(
                "currentTextarea.suggestionOverlay",
                currentTextarea.suggestionOverlay
              );
              currentTextarea.suggestionOverlay.innerHTML =
                escapeHTML(userText) +
                '<span class="ghost-text" style="color: gray;">' +
                escapeHTML(suggestion) +
                "</span>";
              console.log(
                "currentTextarea.suggestionOverlay.innerHTML",
                currentTextarea.suggestionOverlay.innerHTML
              );
            } else {
              console.error(
                "Error from service worker:",
                response ? response.error : "No response received"
              );
            }
          }
        );
      }
    }, 1000);
  };

  textarea.addEventListener("input", handleInput);
  return handleInput; // Return the handler for cleanup
}

// Add suggestion when user presses Tab key
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Tab" &&
    currentTextarea &&
    currentTextarea.suggestionOverlay
  ) {
    // Get the suggestion from the overlay.
    let ghostSpan =
      currentTextarea.suggestionOverlay.querySelector(".ghost-text");

    // let regularSpan = currentTextarea.suggestionOverlay.innerHTML - ghostSpan.innerHTML;

    if (ghostSpan && ghostSpan.textContent.trim().length > 0) {
      event.preventDefault(); // Prevent the default tab behavior.
      // Append the suggestion to the current textarea value.
      currentTextarea.value = currentTextarea.value + ghostSpan.textContent;
      // Update the overlay to reflect the new value (and clear the suggestion).
      currentTextarea.suggestionOverlay.innerHTML = escapeHTML(
        currentTextarea.value
      );
    }
  }
});
