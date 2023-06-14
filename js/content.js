console.log('Bilibili video Timer - content.js loaded!!!');
//监听扩展程序进程或内容脚本发送的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('content.js received message');
    if (request.action == "GetLengthandProgress") {
        let len = document.querySelectorAll('.list-box .duration').length // 视频总集数
        if (request.p_now == null || request.p_now <= 1) {
            sendResponse([len, 0]);
        } else {
            let done = calTime(1, request.p_now - 1)// [time_h, time_m, time_s]
            let total = calTime(1, len)
            // 将时间转换为秒
            let done_s = done[0] * 3600 + done[1] * 60 + done[2]
            let total_s = total[0] * 3600 + total[1] * 60 + total[2]
            // 计算进度条的宽度
            let width = done_s / total_s * 100
            console.log('Bilibili video Timer - progress now:', width);
            sendResponse([len, width.toFixed(2)])
        }
    }
    if (request.action == "GetDuration") {
        let res = calTime(request.p1, request.p2)
        sendResponse(res);
    }
});
