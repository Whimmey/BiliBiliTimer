/* 
* 利用本地存储存放Marker，并且与视频网页对应，每次进入视频网页时，在DOMContentLoaded事件中，自动加载已有的Marker；
* Markers的数据结构为：{bvid: map({p:1, marker:'✨'}, {p:2, marker:'✨'})}
* 由于map不能直接存入本地存储，所以需要将map转换为数组
*/

console.log('Bilibili video Timer - content.js loaded!!!');
// 页面加载完成后调用drawStoreMarker()函数，将本地存储的marker绘制到网页上
// DOMContentLoaded 事件通常会比 window.onload 事件更早触发
// document.addEventListener('DOMContentLoaded', drawStoreMarker);
// window.onload = drawStoreMarker;
window.onload = function () {
    setTimeout(() => {
        drawStoreMarker();
    }, 1000);
}

//监听扩展程序进程或内容脚本发送的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "GetProgress":
            (async () => {
                if (request.p_now == null || request.p_now <= 1) {
                    sendResponse(0);
                } else {
                    const done = await getDuration(request.bvid, 1, request.p_now - 1, request.section_idx)
                    const total = await getDuration(request.bvid, 1, request.len, request.section_idx)
                    // return [time_h, time_m, time_s]
                    // 将时间转换为秒
                    const done_s = done[0] * 3600 + done[1] * 60 + done[2]
                    const total_s = total[0] * 3600 + total[1] * 60 + total[2]
                    // 计算进度条的宽度
                    const width = done_s / total_s * 100
                    console.log('Bilibili video Timer - progress now:', width);
                    sendResponse(width.toFixed(2))
                }
            })();
            return true;
        case "GetVideoInfo":
            (async () => {
                const res = await getVideoInfo(request.bvid)
                console.log('Bilibili video Timer - video info received:', res);
                sendResponse(res);
            })();
            return true;
        case "GetDuration":
            //! async+闭包
            // ref: https://stackoverflow.com/questions/53024819/sendresponse-not-waiting-for-async-function-or-promises-resolve
            (async () => {
                const res = await getDuration(request.bvid, request.p1, request.p2, request.section_idx)
                console.log('Bilibili video Timer - data received:', res);
                sendResponse(res);
            })();
            return true; //! 保持消息通道打开，直到sendResponse被调用；否则，sendResponse可能会在异步代码执行之前被调用
        case "InsertMarker": // p_mark: 要插入标记的视频集号; bvid: 视频的bvid
            insertMarker(request.p_mark, request.bvid)
            sendResponse('InsertMarker done!')
            break;
        default:
            console.log('Bilibili video Timer - content.js received message');
    }
});

function saveAndUpdateMark(p, bvid, marker) {
    // 修改本地存储的marker
    chrome.storage.sync.get('BiliTimer_marker', function (data) {
        // 数据的结构为：{bvid:map({p:1, marker:'✨'}, {p:2, marker:'✨'})}
        let markers = data.BiliTimer_marker ? data.BiliTimer_marker : {};
        // 将markers被存储的结构转换为可被使用的结构
        for (let [key, value] of Object.entries(markers)) {
            if (value instanceof Array) markers[key] = new Map(value)
        }
        // 如果marker不存在，则创建一个新的marker
        if (!markers && marker) {
            // 如果marker不存在，则创建一个新的marker
            markers = {}
            markers[bvid] = new Map().set(p, marker)
        } else {
            if (!(markers[bvid] instanceof Map)) markers[bvid] = new Map()
            if (!marker)
                markers[bvid].delete(p)
            else
                markers[bvid].set(p, marker)
        }
        // 将markers的数据结构转换为可被存储的结构
        for (let [key, value] of Object.entries(markers)) {
            markers[key] = Array.from(value)
        }
        chrome.storage.sync.set({ BiliTimer_marker: markers });
    });
}

function insertMarker(p_mark, bvid, readMarker = null) { // 视频集号，视频bvid，准备插入的marker
    let videoli = document.querySelector('.list-box')
    let targetItem = videoli.children[p_mark - 1].querySelector('.clickitem')
    // let targetItem = videoli.children[p_mark - 1] // <a>标签
    // 判断是否已经插入过标记 previousElementSibling: 返回当前元素的前一个兄弟元素
    if (targetItem.previousElementSibling) return;
    // 在targetItem前插入标记
    let markerSpan = document.createElement('span')
    if (readMarker) markerSpan.innerText = readMarker;
    else {
        // 读取本地存储的默认marker并添加到span中
        chrome.storage.sync.get('BiliTimer_defaultMarker', function (data) {
            markerSpan.innerText = data.BiliTimer_defaultMarker ? data.BiliTimer_defaultMarker : '✨';
            // 修改本地存储的网页新增的marker
            saveAndUpdateMark(p_mark, bvid, markerSpan.innerText)
        });
    }
    markerSpan.style.marginRight = '5px'
    // markerSpan.style.float = 'left'
    // 给span绑定click事件，供用户自定义要插入的标记
    markerSpan.addEventListener('click', function (e) {
        // 弹出框供用户自定义要插入的标记
        this.innerText = prompt('请输入要插入的标记：', this.innerText)
        // 修改本地存储的网页新增的marker
        saveAndUpdateMark(p_mark, bvid, this.innerText)
        e.stopPropagation()  // 阻止事件冒泡
        e.preventDefault() // 阻止默认事件。阻止2.1.1版本点击span时，视频播放选中样式会跳转到被点击视频集号的问题
    })
    targetItem.insertAdjacentElement('beforebegin', markerSpan)
}

// 读取本地存储的marker并添加到span中
function drawStoreMarker() {
    // 数据的结构为：{bvid:map({p:1, marker:'✨'}, {p:2, marker:'✨'})}
    chrome.storage.sync.get('BiliTimer_marker', function (data) {
        let markers = data.BiliTimer_marker;
        const bvid = window.location.href.match(/BV\w+/)[0];
        // 如果marker中没有该bvid，则直接返回
        if (!markers[bvid]) return;
        // 遍历该bvid的marker中的p和marker
        for (let [p, mark] of markers[bvid]) {
            insertMarker(p, bvid, mark)
        }
    });
    console.log('Bilibili video Timer - drawStoreMarker done!');
}
