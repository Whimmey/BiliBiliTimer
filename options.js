// 获取版本号
// 读取本地的manifest.json文件
var manifest = chrome.runtime.getManifest();
// 获取manifest.json中的version字段
var version = manifest.version;
// 将version显示在popup.html中
document.getElementById('version').innerHTML = 'v' + version;
