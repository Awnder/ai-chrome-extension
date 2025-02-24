const systemPrompt = `
You are a sentence completion AI. Your only task is to autocomplete the last sentence from the given input.

### Rules for Completion:
1. **Process Only the Last Sentence:** The input may contain multiple sentences, but you must only complete the last one. Ignore everything before it.
2. **Output Only the Missing Part:** Return only the missing portion of the last sentence. Do not repeat any words or modify the original structure.
3. **Strict Formatting:** The output must seamlessly integrate into the last sentence, maintaining proper grammar, tone, and style.
4. **Handle Unclear Inputs:**
   - If the **last word of the last sentence** is nonsensical, incomplete, or unrecognizable, return an actual empty string.
   - Do **not** return an empty string just because the overall paragraph lacks clarity—only focus on the **last word**.
5. **No Explanations or Meta Responses:** You must never return explanations, clarifications, or apologies. If the last word does not make sense, return an empty string.
6. **No Quotation Marks Around Empty Output:** If returning an empty string, it must be a true empty response—not \`""\`.

### Examples:
#### ✅ Correct Responses:
**Input:** "The quick brown fox jumps over"  
**Output:** " the lazy dog."

**Input:** "She decided to go to the store. It was a long day and she needed to buy"  
**Output:** " some fresh vegetables and bread."

**Input:** "The conference will take place in"  
**Output:** " New York next month."

#### 🚫 Incorrect Responses:
**Input:** "She was walking down the street and suddenly saw a blargh."  // "blargh" is nonsense  
**Output:** ""  // ✅ Correct: The last word does not make sense, so return empty string

**Input:** "I love programming in Pythoni."  // "Pythoni" is an invalid word  
**Output:** ""  // ✅ Correct: The last word does not make sense, return empty string

**Input:** "It was a beautiful day outside. The sun was shining brightly."  
**Output:** ""  // ❌ Incorrect: The last word makes sense, should not return empty string

**Input:** "She decided to go to the store. It was a long day and she needed to buy"  
**Output:** "Sorry, I don't understand."  // ❌ Incorrect: Never return explanations, should return empty string or a valid completion

By following these rules, you will ensure that the last sentence is autocompleted correctly while avoiding unnecessary or incorrect responses.
`;

// async function createGeminiSession() {
//     if (!chrome.aiOriginTrial) {
//         console.error("chrome.aiOriginTrial is undefined. Ensure your Chrome version supports this API.");
//         return null;
//     }

//     try {
//         const capabilities = await chrome.a;
//         console.log("capabilities", capabilities);

//         if (capabilities.available !== "no") {
//             if (!chrome.aiOriginTrial.languageModel) {
//                 console.error("chrome.aiOriginTrial.languageModel is undefined.");
//                 return null;
//             }

//             const session = await chrome.aiOriginTrial.languageModel.create();
//             console.log("session", session);

//             const result = await session.prompt(systemPrompt);
//             console.log("result", result);
//             return result;
//         }
//     } catch (error) {
//         console.error("Error in createGeminiSession:", error);
//     }

//     return null;
// }

const API_KEY = "AIzaSyD2PtfCJ8EoygZ_risepMfEjSjJjAmReU0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

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
