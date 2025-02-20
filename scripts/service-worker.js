function handleDocumentOnLoad() {
    meta_tags = document.getElementsByTagName('meta');
    for (let i = 0; i < meta_tags.length; i++) {
        console.log(meta_tags[i]);
    }
    title = document.getElementsByTagName('title');
    console.log(title[0]);

    document.addEventListener('click', function(event) {
        if (event) {
            console.log(event.target);
        }
    });
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: handleDocumentOnLoad
    })
});

