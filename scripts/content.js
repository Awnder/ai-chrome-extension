let currentTextarea = null;
let currentHandler = null;
let websiteContext = null;
/// MAIN EVENT LISTENERS ///

window.onload = function () {
  try {
    const metaTags = document.getElementsByTagName("meta");
    const titleTags = document.getElementsByTagName("title");

    // Ensure the metaTags and titleTags collections are non-empty
    if (metaTags.length === 0) {
      console.warn("No <meta> tags found on the page.");
    }

    if (titleTags.length === 0) {
      console.warn("No <title> tags found on the page.");
    }

    // Combine meta and title tags into a single string
    websiteContext =
      Array.from(metaTags)
        .map((tag) => tag.outerHTML)
        .join("") +
      Array.from(titleTags)
        .map((tag) => tag.outerHTML)
        .join("");

    console.log("Website context initialized:", websiteContext);
  } catch (error) {
    console.error("Error during window.onload execution:", error);
  }
};

// Detect when a textarea gains focus
// Detect when a textarea gains focus
document.addEventListener("focusin", (event) => {
  const target = event.target;

  // Ensure target is a valid HTMLElement
  if (!(target instanceof HTMLElement)) {
    console.error("Target is not an HTMLElement:", target);
    return;
  }

  try {
    if (
      target &&
      (target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable)
    ) {
      currentTextarea = target;

      currentHandler = setupTextareaListener(currentTextarea);

      // Skip input types for privacy if necessary
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
          suggestionOverlay.style[property] =
            computed.getPropertyValue(property);
        }

        // Assign specific styles for suggestionOverlay
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
  } catch (error) {
    console.error("Error in focusin event listener:", error);
  }
});

// Detect when a textarea loses focus
document.addEventListener("focusout", (event) => {
  if (event.target === currentTextarea) {
    // Check if currentTextarea and currentHandler are defined before attempting to remove the event listener
    if (currentTextarea) {
      if (currentHandler) {
        try {
          currentTextarea.removeEventListener("input", currentHandler);
          currentHandler = null; // Reset the handler after removal
          console.log("Removed input event listener successfully.");
        } catch (error) {
          console.error("Error removing input event listener:", error);
        }
      } else {
        console.warn("No currentHandler found to remove.");
      }

      currentTextarea = null; // Reset currentTextarea after cleanup
    } else {
      console.warn("No currentTextarea found on focusout.");
    }
  }
});

// Listen for input events with debouncing
function setupTextareaListener(textarea) {
  let debounceTimeout;

  if (!textarea) {
    console.error("No textarea provided to setupTextareaListener");
    return;
  }

  const handleInput = () => {
    // Clear any pending timeout
    clearTimeout(debounceTimeout);

    if (!currentTextarea) {
      console.error("No currentTextarea found for input event");
      return;
    }

    // Clear the suggestion overlay when the user starts typing
    if (currentTextarea.suggestionOverlay) {
      currentTextarea.suggestionOverlay.innerHTML = "";
    } else {
      console.error("suggestionOverlay is not available");
      return;
    }

    // Set new timeout to fire after 2 seconds of inactivity
    debounceTimeout = setTimeout(() => {
      // Only send if the textarea is still focused
      if (document.activeElement === textarea) {
        // contentEditable divs don't have value, so need to use innerText
        let currentText =
          currentTextarea && currentTextarea.isContentEditable
            ? currentTextarea.innerText
            : currentTextarea?.value ?? "";

        try {
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(
              {
                type: "TEXTAREA_UPDATE",
                value: currentText,
                context: websiteContext,
              },
              (response) => {
                if (response?.success && currentTextarea.suggestionOverlay) {
                  console.log("received suggestion", response.result);
                  const suggestion = response.result; // e.g., "me is Bob."

                  // Build overlay content:
                  // The user text is rendered normally and the suggestion is in a span with a lighter color.
                  try {
                    currentTextarea.suggestionOverlay.innerHTML =
                      escapeHTML(currentText) +
                      '<span class="ghost-text" style="color: rgba(128, 128, 128, 1);">' +
                      escapeHTML(suggestion) +
                      "</span>";
                    adjustTextHeights(currentTextarea, suggestion); // Adjust height to fit suggestion
                  } catch (innerError) {
                    console.error(
                      "Error updating suggestion overlay:",
                      innerError
                    );
                  }
                } else {
                  console.error("Failed to receive valid response:", response);
                }
              }
            );
          } else {
            console.error("chrome.runtime or sendMessage is not available");
          }
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
    }, 1000);
  };

  textarea.addEventListener("input", handleInput);
  return handleInput; // Return the handler for cleanup
}

// Add suggestion when user presses Tab key
document.addEventListener("keydown", (event) => {
  try {
    // Get the current text from the textarea. If it is contentEditable, use innerText instead of value.
    if (!currentTextarea) {
      console.error("currentTextarea is not available.");
      return;
    }

    let currentText = currentTextarea.isContentEditable
      ? currentTextarea.innerText ?? ""
      : currentTextarea.value ?? "";

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

      // Check if ghostSpan exists
      if (!ghostSpan) {
        console.error("No ghost-text span found in suggestion overlay.");
        return;
      }

      let suggestionText = ghostSpan.textContent;

      let updatedText = currentText + suggestionText;

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
  } catch (error) {
    console.error("Error during keydown event handling:", error);
  }
});

/// OTHER FUNCTIONS ///

function moveCursorToEnd(textarea) {
  try {
    // Focus the textarea
    textarea.focus();

    // Handle contentEditable
    if (textarea.isContentEditable) {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textarea);
      range.collapse(false);

      // Clear any previous selections and apply the new range
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // For non-contentEditable, set the selection range to the end
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  } catch (error) {
    console.error("Error moving cursor to end:", error);
  }
}

// Adjust the height of the textarea to fit the content
function adjustTextHeights(textarea, suggestion = "") {
  try {
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

    moveCursorToEnd(textarea); // After suggestions are deleted or fulfilled
  } catch (error) {
    console.error("Error adjusting text heights:", error);
  }
}

function escapeHTML(str) {
  try {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  } catch (error) {
    console.error("Error escaping HTML:", error);
    return str; // If error occurs, return the original string to prevent breaking the code
  }
}
