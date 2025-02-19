chrome.webNavigation.onCompleted.addListener(function(details) {

    chrome.tabs.executeScript(details.tabId, {
        code: `
            document.addEventListener('click', (event) => {
                console.log('Hello from AI Chrome Extension!');
                let elementId = event.target.id;
                if (elementId !== '') {
                    console.log(elementId)
                } else {
                    console.log('No ID found') 
                }
            });
        `
    });
});
