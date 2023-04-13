var btn_cal = document.getElementById('btn-cal');
var btn_del = document.getElementById('btn-del');
var stime = document.getElementById('showtime');
var startp = document.getElementById('p_start');
var endp = document.getElementById('p_end');
var ranger = document.getElementById('customRange2');

startp.addEventListener('focus', function () { this.select() })
endp.addEventListener('focus', function () { this.select() })

var length = 1;
// 初始化输入框的值
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    // https://www.bilibili.com/video/BVxxx/?p=16&vd_source=xxx
    let url = tabs[0].url;
    // 获取url中的p参数，正则表达式：p=数字
    let p = url.match(/p=(\d+)/);
    // 获取p中的数字
    p = p ? parseInt(p[1]) : null;
    // 初始化输入框的值
    if (p) {
        startp.value = p;
        endp.value = p + 1;
    }
    // 获取视频总集数 便于设置range的max值
    let message = { action: "GetLength" }
    chrome.tabs.sendMessage(tabs[0].id, message).then(res => {
        // console.log(res);
        length = parseInt(res);
        ranger.max = length;
        ranger.value = endp.value;
    }).catch(err => { console.error(err) });
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
            // chrome.tabs.sendMessage(tabs[0].id, message, res => {
            //     alert("sendMessage!")
            //     alert(res);
            // });
            chrome.tabs.sendMessage(tabs[0].id, message).then(res => {
                // alert("sendMessage!")
                console.log(res);
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

// 获取版本号
// 读取本地的manifest.json文件
var manifest = chrome.runtime.getManifest();
// 获取manifest.json中的version字段
var version = manifest.version;
// 将version显示在popup.html中
document.getElementById('version').innerHTML = 'v' + version;
document.getElementById('author').innerHTML = 'by wyy'