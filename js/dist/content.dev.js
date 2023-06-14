"use strict";

console.log('Bilibili video Timer - content.js loaded!!!'); //监听扩展程序进程或内容脚本发送的请求

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log('content.js received message');
  if (request.action == "GetLengthandProgress") {
    var len = document.querySelectorAll('.list-box .duration').length; // 视频总集数

    if (request.p_now == null || request.p_now <= 1) {
      sendResponse([len, 0]);
    } else {
      var done = calTime(1, request.p_now - 1); // [time_h, time_m, time_s]

      var total = calTime(1, len); // 将时间转换为秒

      var done_s = done[0] * 3600 + done[1] * 60 + done[2];
      var total_s = total[0] * 3600 + total[1] * 60 + total[2]; // 计算进度条的宽度

      var width = done_s / total_s * 100;
      console.log('Bilibili video Timer - progress now:', width);
      sendResponse([len, width.toFixed(2)]);
    }
  }

  if (request.action == "GetDuration") {
    var res = calTime(request.p1, request.p2);
    sendResponse(res);
  }
});