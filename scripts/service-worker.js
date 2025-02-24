const systemPrompt = `
You are a sentence completion AI. Your task is to autocomplete **only** the missing part of the last sentence from the given input.

### Instructions:
- The input consists of the full text from a textarea. **Do not modify or repeat the existing text—only generate the missing part**.
- Your response must be **either completing a partial word or finishing the last sentence**, but **never exceeding one sentence**.
- **Maintain proper spacing, punctuation, and formatting**:
  - If the last word is incomplete, complete it.
  - If a space is missing before your completion, add it.
  - Otherwise, do not modify the existing spacing.
- If the last word is gibberish (e.g., "sdkhbsadhja") and cannot be meaningfully completed, **return an empty string**.
- **Do not generate apologies, error messages, or anything unrelated to completing the last sentence**.

### Example Behavior:
- Input: "My name is Bob and I li"  
  Output: "ke to cook."  

- Input: "It was a wonderful day at the"  
  Output: " beach."  

- Input: "sdkhbsadhja"  
  Output: ""  
`;

const API_KEY = "AIzaSyD2PtfCJ8EoygZ_risepMfEjSjJjAmReU0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function callGemini(content, context) {
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
    console.log("data from Gemini API:", data);
    if (
      data &&
      data.candidates &&
      data.candidates[0].content.parts[0].text !== '""'
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Error occurred.";
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXTAREA_UPDATE") {
    console.log("Textarea content updated:", message.value);
    console.log("Website context:", message.context);

    callGemini(message.value, message.context)
      .then((result) => {
        console.log("generated suggestion:", result);
        if (result) {
          sendResponse({ success: true, result }); // Send result with response
        }
      })
      .catch((error) => {
        console.error("Error in callGemini:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});
