async function createGeminiSession() {
    const capabilities = await chrome.aiOriginTrial.languageModelCapabilities();
    if (capabilities.available !== "no") {
        const session = await chrome.aiOriginTrial.createSession({
            systemPrompt: `
                You are a website summarizer. You will be given the content of a webpage and you will generate a concise and accurate summary of the content.
                `,
        });
        return session;
    }
    return null;
}

function injectScript(tabId) {
    const getEditableElements = () => {
        const editableElements = document.querySelectorAll(
            "textarea, input, [contenteditable='true']"
        );
        return Array.from(editableElements).map((el) => el.outerHTML);
    };

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: getEditableElements,
    }), (results => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            console.log(editableElements)
            const editableElements = results[0].result;
            console.log("results", editableElements);
        }
    });
}

chrome.action.onClicked.addListener((tab) => {
    injectScript(tab.id);
});

chrome.runtime.onMessage.addListener(async function (
    request,
    sender,
    sendResponse
) {
    if (request.message === "generateMetaSummary") {
        const session = await createGeminiSession();
        if (!session) {
            sendResponse({ error: "Gemini session not available" });
        }

        const request = `Create a concise and accurate summary of the following html meta tags: ${request.content.substring(
            0,
            2000
        )}`;
        const response = await session.prompt(request);

        chrome.tabs.sendMessage(sender.tab.id, {
            message: "pageSummary",
            summary: response,
        });
    }
});