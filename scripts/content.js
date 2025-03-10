let currentTextarea = null;
let currentHandler = null;
let websiteContext = null;
/// MAIN EVENT LISTENERS ///

window.onload = function () {
  let context = "";

  // Helper function to truncate content if it exceeds the specified length
  function truncateContent(content, maxLength) {
    return content.length > maxLength
      ? content.substring(0, maxLength)
      : content;
  }

  // Step 1: Gather and truncate text from the <title> tag
  const titleTags = document.getElementsByTagName("title");
  if (titleTags.length > 0) {
    context += `Title: ${truncateContent(titleTags[0].textContent, 400)}\n\n`;
  }

  // Step 2: Gather and truncate text from <meta> tags (e.g., description)
  const metaTags = document.getElementsByTagName("meta");
  let hasMetaContent = false;
  Array.from(metaTags).forEach((tag) => {
    if (tag.getAttribute("name") === "description") {
      context += `Meta Description: ${truncateContent(
        tag.getAttribute("content"),
        400
      )}\n\n`;
      hasMetaContent = true;
    } else if (tag.getAttribute("property") === "og:description") {
      context += `OG Meta Description: ${truncateContent(
        tag.getAttribute("content"),
        400
      )}\n\n`;
      hasMetaContent = true;
    }
  });

  // Only add the meta section if there was any content
  if (!hasMetaContent) {
    context = context.replace("Meta Description:", "");
    context = context.replace("OG Meta Description:", "");
  }

  // Step 3: Gather and truncate text from headings (h1, h2, h3, etc.)
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headings.length > 0) {
    context += "Headings:\n";
    Array.from(headings).forEach((heading) => {
      context += `  - ${truncateContent(heading.textContent, 400)}\n`;
    });
    context += "\n";
  }

  // Step 4: Gather and truncate text from paragraphs
  const paragraphs = document.querySelectorAll("p");
  if (paragraphs.length > 0) {
    context += "Paragraphs:\n";
    Array.from(paragraphs).forEach((p) => {
      context += `  - ${truncateContent(p.textContent, 400)}\n`;
    });
    context += "\n";
  }

  // Step 5: Gather and truncate text from list items
  const listItems = document.querySelectorAll("ul li, ol li");
  if (listItems.length > 0) {
    context += "List Items:\n";
    Array.from(listItems).forEach((li) => {
      context += `  - ${truncateContent(li.textContent, 400)}\n`;
    });
    context += "\n";
  }

  // Step 6: Gather and truncate text from links (anchor text)
  const links = document.querySelectorAll("a");
  if (links.length > 0) {
    context += "Links:\n";
    Array.from(links).forEach((link) => {
      if (link.textContent.trim()) {
        // Ensure link has content
        context += `  - ${truncateContent(link.textContent, 200)}\n`;
      }
    });
    context += "\n";
  }

  // Step 7: Gather and truncate text from form inputs (input, textarea, select)
  const inputs = document.querySelectorAll(
    "input[type='text'], textarea, select"
  );
  if (inputs.length > 0) {
    context += "Form Inputs:\n";
    Array.from(inputs).forEach((input) => {
      const value = input.value.trim();
      if (value) {
        // Only include inputs with content
        context += `  - ${truncateContent(value, 400)}\n`;
      }
    });
    context += "\n";
  }

  // Final output
  console.log("Extracted Context:\n", context);

  chrome.runtime.sendMessage(
    {
      type: "CONTEXT_UPDATE",
      context: context,
    },
    (response) => {
      if (response?.success) {
        console.log("Successfully sent context to background script.");
      } else {
        console.error("Failed to send context to background script:", response);
      }
    }
  );
};

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
        container.style.boxSizing = "border-box"; // Include padding/border

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
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          pointerEvents: "none", // Allow text input
          zIndex: "0", // Ensure overlay stays behind text
          overflowY: "auto", // Prevent overlay from overlapping
          lineHeight: computed.lineHeight,
          boxSizing: "border-box", // Ensure padding/border is accounted for
        });

        container.appendChild(suggestionOverlay);
        target.suggestionOverlay = suggestionOverlay;

        // Match textarea background to prevent double text effect
        target.style.background = "transparent";
        target.style.position = "relative";
        target.style.zIndex = "1"; // Ensure input is above the overlay
        target.style.boxSizing = "border-box"; // Ensure padding/border is included

        // Clear overlay text whenever the user starts typing
        target.addEventListener("focus", () => {
          suggestionOverlay.textContent = ""; // Clear the suggestion when focus happens
        });

        // Ensure textarea is scrollable if text overflows
        target.style.overflowY = "auto";

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

        if (!currentText || currentText.trim() === "") {
          return;
        }

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
                  const suggestion = response.result; // e.g., "me is Bob."

                  // Build overlay content:
                  // The user text is rendered normally and the suggestion is in a span with a lighter color.
                  try {
                    currentTextarea.suggestionOverlay.innerHTML =
                      '<span class="user-text">' +
                      escapeHTML(currentText) +
                      "</span>" +
                      '<span class="ghost-text" style="font-style: italic;">' +
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
    // Save the current value of the textarea to avoid altering user input
    const originalValue = textarea.value;

    // If there is a suggestion, temporarily add it to calculate the height
    if (suggestion !== "") {
      // Create a temporary element to hold the suggestion text for height calculation
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute"; // Ensure it's out of the flow
      tempDiv.style.visibility = "hidden"; // Make it invisible
      tempDiv.style.whiteSpace = "pre-wrap"; // Preserve line breaks, if any
      tempDiv.style.wordWrap = "break-word"; // Prevent word overflow
      tempDiv.style.font = window.getComputedStyle(textarea).font; // Match textarea font

      // Append the suggestion text to the tempDiv
      tempDiv.textContent = suggestion;

      document.body.appendChild(tempDiv);

      // Set the textarea height to auto before measuring
      textarea.style.height = "auto";

      // Adjust the height based on the content and the suggestion
      const newHeight = Math.max(textarea.scrollHeight, tempDiv.scrollHeight);
      textarea.style.height = newHeight + "px";

      // Clean up after measuring
      document.body.removeChild(tempDiv);
    } else {
      // Reset the height to fit the content only (no suggestion)
      textarea.style.height = "auto"; // Ensure textarea resizes to content
      textarea.style.height = textarea.scrollHeight + "px";
    }

    // Adjust the parent element height to match textarea
    if (textarea.parentElement) {
      textarea.parentElement.style.height = textarea.style.height;
    }

    moveCursorToEnd(textarea); // Ensure the cursor stays at the end after resizing
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
