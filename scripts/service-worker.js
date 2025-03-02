const defaultSystemPrompt = `
You are a sentence completion AI. Your task is to **either autocomplete the last word, complete the last sentence, or add a natural follow-up sentence** based on the given input.

### Instructions:
- The input consists of the full text from a textarea. **Do not modify or repeat the existing text—only generate what comes next**.
- Your response must **either**:
  1. **Complete an unfinished word**, leaving it open-ended if it's part of an incomplete thought or sentence.
  2. **Finish the last sentence** if the current sentence appears complete. **Do not add a period if the sentence still feels open-ended and can continue naturally**. If the sentence is definitely finished, complete it and end with a period.
  3. If the last sentence is complete, generate **one additional coherent sentence** that flows naturally.
- **Maintain proper spacing, punctuation, and formatting**:
  - If the last word is incomplete, complete it without unnecessarily finishing the sentence.
  - If a space is missing before your completion, add it.
  - If the last sentence is already complete, start a new one with proper capitalization.
  - Otherwise, do not modify the existing spacing.
- If the last word is gibberish (e.g., "sdkhbsadhja") and cannot be meaningfully completed, **return an empty string**.
- **Do not generate apologies, explanations, or anything unrelated to continuing the text**.

### Example Behavior:
- Input: "My name is Bob and I li"  
  Output: "ke to cook."  

- Input: "It was a wonderful day at the"  
  Output: " beach."  

- Input: "sdkhbsadhja"  
  Output: ""  

- Input: "I had a good day at the beach."  
  Output: "I played volleyball."  

- Input: "She walked into the room and sat down"  
  Output: " She looked around the room."  

- Input: "I had some challe"  
  Output: "nges I had to overcome." (doesn't end the sentence; leaves it open)

- Input: "I went to the store and bought a new"  
  Output: " pair of shoes." (adds a natural completion without finishing the sentence)
`;

const defaultModel = "gemini-1.5-flash";

let systemPrompt = defaultSystemPrompt;

let model = defaultModel;

const API_KEY = "AIzaSyD2PtfCJ8EoygZ_risepMfEjSjJjAmReU0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

async function getAutocomplete(content, context) {
  console.log("getAutocomplete called with systemPrompt:", systemPrompt);
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}.\nHere is website context: ${context}.\nHere is the text from the user: ${content}.`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("data from getAutoComplete:", data);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text !== '""') {
      console.log("Returning text:", text);
      return text;
    } else {
      return;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXTAREA_UPDATE") {
    console.log("Received Text:", message.value);
    console.log("Received Context:", message.context);

    getAutocomplete(message.value, message.context)
      .then((result) => {
        if (result) {
          sendResponse({ success: true, result });
        }
      })
      .catch((error) => {
        console.error("Error in getAutocomplete:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

async function generateNewSystemPrompt(userPrompt) {
  // send systemPrompt to AI to combine with existing systemPrompt
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Help me merge the following system prompt (created by a developer) and the user's instructions in a cohesive way. 
            Ensure there are no conflicts between them. 
            Here is the developer's system prompt: "${systemPrompt}".
            Here are the user's instructions: "${userPrompt}".`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("data from generateNewSystemPrompt:", data);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text;
    } else {
      return;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONFIG") {
    const { newModel, instructions } = message.data;

    // You can now use this data (e.g., save it, make an API call, etc.)
    console.log("Received config:", model, instructions);

    // send systemPrompt to AI to combine with existing systemPrompt
    generateNewSystemPrompt(instructions)
      .then((result) => {
        if (result) {
          systemPrompt = result;
          sendResponse({ status: "Config saved successfully" });
        }
      })
      .catch((error) => {
        console.error("Error in generateNewSystemPrompt:", error);
        sendResponse({ status: "Error saving config" });
      });

    model = newModel;

    // Respond to the popup
    sendResponse({ status: "Config saved successfully" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESTORE_DEFAULT_CONFIG") {
    // Restore the default configuration
    systemPrompt = defaultSystemPrompt;
    model = defaultModel;
    sendResponse({ status: "Default config restored" });
  }
});
