let currentTextarea = null;
let currentHandler = null;
let websiteContext = null;
/// MAIN EVENT LISTENERS ///

window.onload = function () {
  const metaTags = document.getElementsByTagName("meta");
  const titleTags = document.getElementsByTagName("title");
  websiteContext =
    Array.from(metaTags)
      .map((tag) => tag.outerHTML)
      .join("") +
    Array.from(titleTags)
      .map((tag) => tag.outerHTML)
      .join("");
};

// Detect when a textarea gains focus
document.addEventListener("focusin", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    console.error("Target is not an HTMLElement:", target);
    return;
  }

  if (
    target &&
    (target.tagName === "TEXTAREA" ||
      target.tagName === "INPUT" ||
      target.isContentEditable)
  ) {
    currentTextarea = target;

    currentHandler = setupTextareaListener(currentTextarea);

    if (
      target.tagName === "INPUT" &&
      (target.type === "email" || target.type === "password")
    ) {
      console.log("Skipping input type for privacy:", target.type);
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
      // Copy all styles from computed to suggestionOverlay dynamically
      for (let property of computed) {
        suggestionOverlay.style[property] = computed.getPropertyValue(property);
      }
      // then assign specific styles for suggestionOverlay
      Object.assign(suggestionOverlay.style, {
        position: "absolute",
        top: `${target.offsetTop}px`,
        left: `${target.offsetLeft}px`,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allow text input
        zIndex: "0", // Ensure overlay stays behind text
      });

      container.appendChild(suggestionOverlay);
      target.suggestionOverlay = suggestionOverlay;

      // Match textarea background to prevent double text effect
      target.style.background = "transparent";
      target.style.position = "relative";
      target.style.zIndex = "1"; // Ensure input is above the overlay

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

// Listen for input events with debouncing
function setupTextareaListener(textarea) {
  let debounceTimeout;

  const handleInput = () => {
    // Clear any pending timeout
    clearTimeout(debounceTimeout);

    // Clear the suggestion overlay when the user starts typing
    currentTextarea.suggestionOverlay.innerHTML = "";

    // Set new timeout to fire after 2 seconds of inactivity
    debounceTimeout = setTimeout(() => {
      // Only send if the textarea is still focused
      if (document.activeElement === textarea) {
        // contentEditable divs don't have value, so need to use innerText
        let currentText =
          currentTextarea && currentTextarea.isContentEditable
            ? currentTextarea.innerText
            : currentTextarea.value;

        // Only send if the textarea has more than 10 characters
        if (currentTextarea && currentText.trim().length <= 10) {
          console.log("less than or equal to 10 characters so not generating");
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: "TEXTAREA_UPDATE",
            value: currentText,
            context: websiteContext,
          },
          (response) => {
            if (
              response &&
              response.success &&
              currentTextarea.suggestionOverlay
            ) {
              console.log("received suggestion", response.result);
              const suggestion = response.result; // e.g., "me is Bob."

              // Build overlay content:
              // The user text is rendered normally and the suggestion is in a span with a lighter color.

              currentTextarea.suggestionOverlay.innerHTML =
                escapeHTML(currentText) +
                '<span class="ghost-text" style="color: rgba(128, 128, 128, 1);">' +
                escapeHTML(suggestion) +
                "</span>";

              adjustTextHeights(currentTextarea, suggestion); // adjusting height to fit suggestion
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
  // Get the current text from the textarea. If it is contentEditable, use innerText instead of value.
  let currentText =
    currentTextarea && currentTextarea.isContentEditable
      ? currentTextarea.innerText
      : currentTextarea.value;

  let superKey = "⌘";
  if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
    superKey = "Ctrl";
  }

  // Allow superKey keybinds to go through
  if (event.key === superKey && (event.ctrlKey || event.metaKey)) {
    return;
  }

  if (
    currentTextarea.suggestionOverlay &&
    (event.key === "Escape" ||
      event.key === "Enter" ||
      event.key === "Backspace")
  ) {
    currentTextarea.suggestionOverlay.innerHTML = "";
    adjustTextHeights(currentTextarea);
  }

  if (
    event.key === "Tab" &&
    currentTextarea &&
    currentTextarea.suggestionOverlay
  ) {
    event.preventDefault(); // Prevent default Tab behavior immediately.

    let ghostSpan =
      currentTextarea.suggestionOverlay.querySelector(".ghost-text");
    if (ghostSpan && ghostSpan.textContent.trim().length > 0) {
      let suggestionText = ghostSpan.textContent;

      // Check if currentText ends with a letter (indicating an incomplete word)
      let lastChar = currentText.slice(-1);
      let needsSpace = lastChar.match(/[a-zA-Z0-9]/) ? "" : " ";

      let updatedText = currentText + needsSpace + suggestionText;

      if (currentTextarea.isContentEditable) {
        currentTextarea.textContent = updatedText;
      } else {
        currentTextarea.value = updatedText.replace(/\n$/, ""); // Prevent unintended newlines.
      }

      // Update the overlay and adjust layout.
      currentTextarea.suggestionOverlay.innerHTML = escapeHTML(updatedText);
      moveCursorToEnd(currentTextarea);
      adjustTextHeights(currentTextarea);
    }
  }
});

/// OTHER FUNCTIONS ///

function moveCursorToEnd(textarea) {
  textarea.focus();

  if (textarea.isContentEditable) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(textarea);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

// Adjust the height of the textarea to fit the content
function adjustTextHeights(textarea, suggestion = "") {
  // Add the suggestion to the textarea temporarily to calculate the height
  // Then remove it to keep the user's text intact
  if (suggestion !== "") {
    textarea.innerHTML =
      textarea.innerHTML +
      '<span class="temp-text" style="color: rgba(0, 0, 0, 0);">' +
      escapeHTML(suggestion) +
      "</span>";
  }

  textarea.style.height = "auto"; // Reset the height
  textarea.style.height = textarea.scrollHeight + "px"; // Set the height to fit the content
  textarea.parentElement.style.height = textarea.scrollHeight + "px"; // Set the height to fit the content

  if (suggestion !== "" && textarea.querySelector(".temp-text")) {
    textarea.querySelector(".temp-text").remove();
  }

  moveCursorToEnd(currentTextarea); // after suggestions are deleted or fulfilled
}

function escapeHTML(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
