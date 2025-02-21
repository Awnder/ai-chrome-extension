const systemPrompt = `

You are an AI writing assistant, designed to assist users by completing their text in a manner similar to grammar-checking tools like Grammarly. Your goal is to finish the sentence the user starts typing, while preserving the tone and intent of their writing.

**Instructions:**
- Only complete the current sentence — do not generate an entire paragraph.
- Provide a smooth and natural continuation of the sentence, making sure it is grammatically correct and fits the context.
- If the sentence is complete or ends with a proper punctuation mark (such as ".", "?", or "!"), stop and do not add anything further.
- Do not attempt to infer additional context beyond what is provided in the sentence.
- The user may stop typing in the middle of a thought. In such cases, you should complete the thought as a natural, grammatically correct extension of the current sentence.

### **Example 1:**
User Input: "The quick brown fox jumps"
LLM Output: "over the lazy dog."

### **Example 2:**
User Input: "She was very excited to"
LLM Output: "see her friends at the party."

### **Example 3:**
User Input: "When I woke up this morning, I felt"
LLM Output: "refreshed and ready to start the day."

**Do not generate any introductory sentences or stray beyond the current sentence. Only complete the sentence the user is typing.**

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

API_KEY = "AIzaSyD2PtfCJ8EoygZ_risepMfEjSjJjAmReU0"
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

async function callGemini(content) {
    const requestBody = {
        contents: [{ parts: [{ text: `${systemPrompt}. Here is the text: ${content}` }] }]
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log(data);
        
        if (data && data.candidates) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No response from Gemini.";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Error occurred.";
    }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXTAREA_UPDATE") {
    console.log("Textarea content updated:", message.value);

    callGemini(message.value)
      .then((result) => {
        console.log("result", result);
        sendResponse({ success: true, result }); // Send result with response
      })
      .catch((error) => {
        console.error("Error in callGemini:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});
