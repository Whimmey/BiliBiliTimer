var btn_cal = document.getElementById('btn-cal');
var btn_del = document.getElementById('btn-del');
var stime = document.getElementById('showtime');
var startp = document.getElementById('p_start');
var endp = document.getElementById('p_end');
var ranger = document.getElementById('customRange2');
var progress = document.getElementById('prgs');

startp.addEventListener('focus', function () { this.select() })
endp.addEventListener('focus', function () { this.select() })

var length = 1; // 视频长度
// 初始化输入框的值 & progress
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    // https://www.bilibili.com/video/BVxxx/?p=16&vd_source=xxx
    let url = tabs[0].url;
    // 获取url中的p参数，正则表达式：p=数字
    let p = url.match(/p=(\d+)/);
    // 获取p中的数字
    p = p ? parseInt(p[1]) : 0;
    // 初始化输入框的值
    if (p) {
        startp.value = p;
        endp.value = p + 1;
    }
    // 获取视频总集数和进度 设置range的max值
    chrome.tabs.sendMessage(tabs[0].id, { action: "GetLengthandProgress", p_now: p }).then(res => {
        length = parseInt(res[0]);
        ranger.max = length;
        ranger.value = endp.value;
        let width = res[1]
        progress.style.width = `${width}%`
        progress.setAttribute('aria-valuenow', width)
        document.getElementById('prgs_info').innerHTML = `当前进度... <span class="badge bg-primary bg-opacity-75">${width}%</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;集数进度... <span class="badge bg-success bg-opacity-75">${p == 0 ? 1 : p}/${length}</span>`
        // 字符串中的空格用&nbsp;代替
    }).catch(err => { console.error(err) })
});

// 绑定range的input事件
if (ranger) {
    ranger.addEventListener('input', function () {
        endp.value = parseInt(this.value);
        // ranger的颜色随着值的变化而变化
        // this.style.background = `linear-gradient(to right, #007bff 0%, #007bff ${this.value / this.max * 100}%, #dee2e6 ${this.value / this.max * 100}%, #dee2e6 100%);`;
    })
}
// 绑定cal按钮的click事件
if (btn_cal) {
    btn_cal.addEventListener('click', function () {
        // 获取popup.html输入框的值，转换为int类型
        var p1 = parseInt(startp.value);
        var p2 = parseInt(endp.value);

        // 如果p1>p2,则交换p1和p2的值
        if (p1 > p2) {
            var temp = p1;
            p1 = p2;
            p2 = temp;
        }
        // 如果p1或p2小于1，则将其置为1
        if (p1 < 1) {
            startp.value = 1;
            p1 = 1;
        } else if (p2 < 1) {
            endp.value = 1;
            p2 = 1;
        }
        // 如果p1或p2大于视频总集数，则将其置为视频总集数
        if (p1 > length) {
            startp.value = length;
            p1 = length;
        } else if (p2 > length) {
            endp.value = length;
            p2 = length;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            var message = { p1: p1, p2: p2, action: "GetDuration" }
            chrome.tabs.sendMessage(tabs[0].id, message).then(res => {
                // alert("sendMessage!")
                stime.value = `${res[0]}h ${res[1]}min ${res[2]}s`;
            }).catch(err => { console.error(err) });
        });
    });
}
// 绑定delete按钮的click事件
if (btn_del) {
    btn_del.addEventListener('click', function () {
        startp.value = null;
        endp.value = null;
        ranger.value = 1;
    })
}

// 在页面加载时，从存储中获取数据并将其写入粘贴板
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('clipboardData', result => {
        var clipboardData = result.clipboardData;
        if (clipboardData) {
            // writeToClipboard(clipboardData);
            endp.value = clipboardData;
            chrome.storage.local.remove('clipboardData'); // 删除已写入粘贴板的数据
            // btn_cal.click();
        }
    });
});

// Version info
let manifest = chrome.runtime.getManifest();
let version = manifest.version;
document.getElementById('version').innerHTML = 'v' + version;
document.getElementById('author').innerHTML = 'by wyy'
