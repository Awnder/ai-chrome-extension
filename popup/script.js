document.getElementById("saveConfigBtn").addEventListener("click", () => {
  // Get the selected model from the dropdown
  const modelSelect = document.getElementById("modelSelect").value;

  // Get the system prompt from the textarea
  const userPrompt = document.getElementById("instructions").value;

  // get the api key from the input field
  const apiKey = document.getElementById("apiKey").value;

  console.log('apiKey:', apiKey);

  // Create a message object with the configuration data
  const configData = {
    userModel: modelSelect,
    userInstructions: userPrompt,
    userApiKey: apiKey,
  };

  // Show the spinner and disable the button
  const spinner = document.getElementById("loadingSpinner");
  const button = document.getElementById("saveConfigBtn");
  button.disabled = true; // Disable button to prevent multiple clicks
  spinner.classList.remove("hidden"); // Show the spinner

  // Send the configuration data to the service worker
  chrome.runtime.sendMessage(
    { type: "CONFIG", data: configData },
    (response) => {
      console.log("Response from service worker:", response);

      // Hide the spinner and re-enable the button
      spinner.classList.add("hidden"); // Hide the spinner
      button.disabled = false; // Re-enable the button

      // Optionally, close the popup after successful response
      window.close();
    }
  );
});

document
  .getElementById("restoreDefaultConfigBtn")
  .addEventListener("click", () => {
    // Show the spinner and disable the button
    const spinner = document.getElementById("loadingSpinner");
    const button = document.getElementById("restoreDefaultConfigBtn");
    button.disabled = true; // Disable button to prevent multiple clicks
    spinner.classList.remove("hidden"); // Show the spinner

    // Send a message to the service worker to restore the default configuration
    chrome.runtime.sendMessage(
      { type: "RESTORE_DEFAULT_CONFIG" },
      (response) => {
        console.log("Response from service worker:", response);

        // Hide the spinner and re-enable the button
        spinner.classList.add("hidden"); // Hide the spinner
        button.disabled = false; // Re-enable the button

        // Optionally, close the popup after successful response
        window.close();
      }
    );
  });
