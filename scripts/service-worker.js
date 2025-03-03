const defaultSystemPrompt = `
You are a sentence completion AI. Your task is to **automatically complete the text** provided by the user, **without altering or repeating any existing content**.

### Instructions:
- The input consists of a text block (such as a word, sentence or multiple paragraphs). **Only generate what comes next**; do not modify or repeat the existing text.
- Your response must:
  1. **Complete an unfinished word** (if applicable), leaving it open-ended if part of an unfinished thought.
  2. **Finish the last sentence** if the sentence appears complete. **Do not add a period if the sentence is open-ended**.
  3. If the last sentence is finished, generate **one additional coherent sentence** that logically follows and completes the thought.
  4. If the text contains a question at the end (indicated by a question mark `?`), **do not directly answer the question**. Instead, complete the sentence in a way that follows naturally after the question without providing an answer, such as suggesting more context or asking for clarification.
- **Never generate anything other than a continuation or completion of the text**. You are not allowed to return explanations, clarifications, apologies, or anything unrelated to completing the text.
  
- **Formatting Guidelines**:
  - If the last word is incomplete, complete it **without** finishing the entire sentence.
  - If the sentence is complete, start a **new coherent sentence** that flows naturally.
  - Maintain **proper punctuation, spacing, and capitalization**.
  
- If the last word is gibberish (e.g., "sdkljfg"), **return an empty string**.
- **Do not generate anything other than a sentence completion**.

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
let apiKey = API_KEY;
let API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
let websiteSummary = "";

async function getAutocomplete(content) {
  console.log(`Getting autocomplete with prompt: ${systemPrompt}.`);
  console.log(`Website context summary: ${websiteSummary}.`);

  console;
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}.
            Here is the website context summary to help you provide relevant autocompletions: ${websiteSummary}.
            Here is the text from the user: ${content}.`,
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
    console.error("Error getting autocomplete:", error);
    return;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXTAREA_UPDATE") {
    console.log("Received Text:", message.value);

    getAutocomplete(message.value)
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
            Here are the user's instructions: "${userPrompt}".
            DO NOT EVER RETURN ANYTHING OTHER THAN A SYSTEM PROMPT. 
            Whenever you are unsure just return the developer's system prompt the way it is passed in.`,
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
    console.error("Error generating new prompt:", error);
    return;
  }
}

async function summarizeContext(context) {
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are a summarizer that condenses website HTML content into key information specifically useful for autocompleting text. Only include information directly relevant to the website content—such as the title, meta description, main headers, key paragraphs, significant links, and any form inputs. Ignore any network errors, scripts, or any irrelevant or non-visible elements like styles, ads, or tracking code. Provide a clean, clear, and relevant summary to help with autocomplete tasks.

### Instructions:
- **Focus only on visible, meaningful content** such as:
  - Page title
  - Meta description
  - Key headers (e.g., <h1>, <h2>)
  - Significant paragraphs (e.g., <p>)
  - Relevant links (e.g., <a href>)
  - Form inputs (e.g., <input>, <textarea>, <button>)
- **Exclude irrelevant data** like:
  - Network errors
  - Scripts or external resources
  - Non-visible elements (e.g., styles, ads, hidden form fields)
  - Technical details unrelated to the content (e.g., debugging info, errors in the console)
- Structure your summary so that it only contains the **most relevant and helpful text** for autocompleting or assisting with sentence completions. Do not include explanations or additional context. Only return the summary itself.
- Your response should be concise and easy for the AI to incorporate into future sentence completions.
Here is the website content to summarize: ${context}.`,
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

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("summarized text:", text);
    if (text) {
      return text;
    } else {
      return;
    }
  } catch (error) {
    console.error("Error summarizing context:", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONFIG") {
    const { userModel, userInstructions, userApiKey } = message.data;

    // You can now use this data (e.g., save it, make an API call, etc.)
    console.log("Received config:", userModel, userInstructions, userApiKey);

    // send systemPrompt to AI to combine with existing systemPrompt
    generateNewSystemPrompt(userInstructions)
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

    model = userModel;

    if (userApiKey && userApiKey !== "") {
      apiKey = userApiKey;
    }

    API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Respond to the popup
    sendResponse({ status: "Config saved successfully" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESTORE_DEFAULT_CONFIG") {
    // Restore the default configuration
    systemPrompt = defaultSystemPrompt;
    model = defaultModel;
    apiKey = API_KEY;
    API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    sendResponse({ status: "Default config restored" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTEXT_UPDATE") {
    const context = message.context;
    console.log("Received Context:", context);

    // summarize the context
    summarizeContext(context)
      .then((result) => {
        if (result) {
          websiteSummary = result;
          sendResponse({ status: "Context updated successfully" });
        }
      })
      .catch((error) => {
        console.error("Error in summarizeContext:", error);
        sendResponse({ status: "Error updating context" });
      });
  }
});
