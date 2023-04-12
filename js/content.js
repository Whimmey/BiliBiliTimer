console.log('Bilibili video Timer - content.js loaded!!!');
//监听扩展程序进程或内容脚本发送的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('content.js received message');
    if (request.action == "GetLength") {
        sendResponse(document.querySelectorAll('.list-box .duration').length)
    }
    if (request.action == "GetDuration") {
        let res = calTime(request.p1, request.p2)
        // console.log(res);
        sendResponse(res);
    }
});
