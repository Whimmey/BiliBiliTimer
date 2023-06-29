"use strict";

var notificationToggle = document.getElementById('blockNotification');
var menuToggle = document.getElementById('blockMenuItem'); // 获取blockNotification的值

chrome.storage.sync.get('blockNotification', function (data) {
  var blockNotification = data.blockNotification; // 如果showNotification为true，则将开关打开

  if (blockNotification) {
    notificationToggle.checked = true;
  } else {
    notificationToggle.checked = false;
  }
}); // 绑定开关的change事件

notificationToggle.addEventListener('change', function () {
  var isChecked = notificationToggle.checked;
  chrome.storage.sync.set({
    blockNotification: isChecked
  });
  console.log('blockNotification: ' + isChecked);
}); // 右键菜单开关

chrome.storage.sync.get('blockMenuItem', function (data) {
  var blockMenuItem = data.blockMenuItem; // 如果showNotification为true，则将开关打开

  if (blockMenuItem) {
    menuToggle.checked = true;
  } else {
    menuToggle.checked = false;
  }
}); // 绑定开关的change事件

menuToggle.addEventListener('change', function () {
  var isChecked = menuToggle.checked;
  chrome.storage.sync.set({
    blockMenuItem: isChecked
  });
  console.log('blockMenuItem: ' + isChecked); // chrome.runtime.reload(); // 重新加载插件
  // 一秒后重新加载插件();

  setTimeout(function () {
    chrome.runtime.reload();
  }, 1000);
}); // 获取版本号
// 读取本地的manifest.json文件

var manifest = chrome.runtime.getManifest();
var version = manifest.version;
document.getElementById('version').innerHTML = 'v' + version;