document.addEventListener("DOMContentLoaded", function () {
    const metaTags = document.getElementsByTagName("meta");
    console.log(metaTags);
    title = document.getElementsByTagName("title");
    console.log(title[0]);

    chrome.runtime.sendMessage({
        action: "getMetaSummary",
        content: metaTags,
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "pageSummary") {
        console.log(request.summary);
    }
});

//https://www.youtube.com/watch?v=rHU5GwsFdsw&ab_channel=RustyZone
