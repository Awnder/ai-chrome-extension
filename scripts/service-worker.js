function addClickToDocument() {
    document.addEventListener('click', function(event) {
        if (event) {
            console.log(event.target);
        }
    });
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: addClickToDocument
    })
});
