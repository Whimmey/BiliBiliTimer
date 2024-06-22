var btn_cal = document.getElementById('btn-cal');
var btn_back = document.getElementById('btn-back');
var stime = document.getElementById('showtime');
var startp = document.getElementById('p_start');
var endp = document.getElementById('p_end');
var ranger = document.getElementById('customRange2');
var progress = document.getElementById('prgs');

startp.addEventListener('focus', function () { this.select() })
endp.addEventListener('focus', function () { this.select() })

let p = 1; // 当前视频集数
var length = 1; // 视频长度
let section_idx = 0; // 二级合集的索引

// 初始化输入框的值 & progress
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    // https://www.bilibili.com/video/BVxxx/?p=16&vd_source=xxx
    const url = tabs[0].url;
    // 获取url中的p参数，正则表达式：p=数字
    p = url.match(/p=(\d+)/);
    // 获取p中的数字
    p = p ? parseInt(p[1]) : 0;
    // 初始化输入框的值

    // 获取视频总集数和进度 设置range的max值
    // chrome.tabs.sendMessage(tabs[0].id, { action: "GetLengthandProgress", p_now: p }).then(res => {
    //     length = parseInt(res[0]);
    //     ranger.max = length;
    //     ranger.value = endp.value;
    //     let width = res[1]
    //     progress.style.width = `${width}%`
    //     progress.setAttribute('aria-valuenow', width)
    //     document.getElementById('prgs_info').innerHTML = `当前进度... <span class="badge bg-primary bg-opacity-75" style="font-size:11px">${width}%</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;集数进度... <span class="badge bg-success bg-opacity-75" style="font-size:11px">${p == 0 ? 1 : p}/${length}</span>` // 字符串中的空格用&nbsp;代替
    // })

    const bvid = tabs[0].url.match(/BV(\w+)/)[0];
    chrome.tabs.sendMessage(tabs[0].id, { action: "GetVideoInfo", bvid: bvid }).then(res => {
        const { vtype, data } = res;
        if (vtype === 1) {
            stime.value = '就一个视频有啥好算的(°ー°〃)';
            startp.value = 1;
            endp.value = 1;
            ranger.max = 1;
            ranger.value = 1;
            document.querySelector('.progress').style.display = 'none';
            document.getElementById('prgs_info').style.display = 'none';
            return true;
        } else if (vtype === 2) {
            length = data.videos;
            p = p == 0 ? 1 : p;
        } else {
            for (let sectIdx = 0; sectIdx < data.ugc_season.sections.length; sectIdx++) {
                const section = data.ugc_season.sections[sectIdx];
                for (let idx = 0; idx < section.episodes.length; idx++) {
                    if (section.episodes[idx].aid === data.aid) {
                        length = section.episodes.length; // 二级合集的总集数
                        p = idx + 1;            // 当前视频在二级合集中的集数
                        section_idx = sectIdx;  // 二级合集的索引
                        console.log('section_idx:', sectIdx, 'p:', p);
                        break;
                    }
                }
            }
        }
        // 初始化输入框的值
        if (p) {
            startp.value = p;
            endp.value = endp.value ? endp.value : p + 1;
        }

        ranger.max = length;
        ranger.value = endp.value;

        chrome.tabs.sendMessage(tabs[0].id,
            { action: "GetProgress", bvid: bvid, section_idx: section_idx, p_now: p, len: length }
        ).then(width => {
            progress.style.width = `${width}%`
            progress.setAttribute('aria-valuenow', width)
            document.getElementById('prgs_info').innerHTML = `当前进度... <span class="badge bg-primary bg-opacity-75" style="font-size:11px">${width}%</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;集数进度... <span class="badge bg-success bg-opacity-75" style="font-size:11px">${p == 0 ? 1 : p}/${length}</span>` // 字符串中的空格用&nbsp;代替
        })

        console.log('open popup', res);
    })


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
        let p1 = parseInt(startp.value);
        let p2 = parseInt(endp.value);

        // 如果p1>p2,则交换p1和p2的值
        if (p1 > p2) {
            let temp = p1;
            p1 = p2;
            p2 = temp;
        }
        // 如果p1或p2小于1，则将其置为1
        if (p1 < 1) {
            startp.value = 1;
            p1 = 1;
        } else if (p1 > length) {
            startp.value = length;
            p1 = length;
        }
        if (p2 < 1) {
            endp.value = 1;
            p2 = 1;
        } else if (p2 > length) {
            endp.value = length;
            p2 = length;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const bvid = tabs[0].url.match(/BV(\w+)/)[0];
            chrome.tabs.sendMessage(tabs[0].id, { action: "GetDuration", bvid: bvid, p1: p1, p2: p2, section_idx: section_idx }).then(res => {
                stime.value = `${res[0] ? res[0] + 'h ' : ''}${res[1] ? res[1] + 'min ' : ''}${res[2] ? res[2] + 's' : ''}`; // res中为0的就不显示
            }).catch(err => {
                console.error(err)
            });
        });
    });
}
// 还原按钮
if (btn_back) {
    btn_back.addEventListener('click', function () {
        startp.value = p;
        endp.value = p + 1;
        ranger.value = p + 1;
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
