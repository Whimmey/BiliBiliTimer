chrome.storage.sync.get('blockMenuItem', function (data) {
    let blockMenuItem = data.blockMenuItem;
    if (!blockMenuItem) {
        chrome.contextMenus.create({
            id: 'BilibiliTimer',
            title: 'Bilibili Video Timer - 计算到此时长',
            contexts: ['link'],
            documentUrlPatterns: ['https://www.bilibili.com/video/*'] // 只在某些页面显示此右键菜单
        });
    } else {
        chrome.contextMenus.remove('BilibiliTimer'); // 移除右键菜单选项
    }
});

// chrome.contextMenus.create({
//     id: 'BilibiliTimer',
//     title: 'Bilibili Video Timer - 计算到此时长',
//     contexts: ['link'],
//     documentUrlPatterns: ['https://www.bilibili.com/video/*'] // 只在某些页面显示此右键菜单
// });
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    let target = info.linkUrl // https://www.bilibili.com/video/BV1gM411W7ex/?p=1
    // 使用正则表达式提取视频p参数
    let p = target.match(/p=\d+/)[0].match(/\d+/)[0]
    let bv = target.match(/BV\w+/)[0]
    chrome.storage.local.set({ clipboardData: p });

    chrome.storage.sync.get('blockNotification', function (data) {
        var blockNotification = data.blockNotification;
        if (!blockNotification) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '../icons/timeline.png',
                title: 'BilibiliTimer扩展通知',
                message: `已复制到剪贴板：${p}`,
            });
        }
    });
});
/* 
* 关于动态图标设置
*/
var manifest = chrome.runtime.getManifest();
var matches = manifest.content_scripts[0].matches;

chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        let url = tab.url;
        let isMatched = false;
        for (let m of matches) {
            let regex = new RegExp(m.replace(/\*/g, '.*'));
            if (regex.test(url)) {
                isMatched = true;
                break;
            }
        }
        // Set icon dynamically
        if (isMatched) {
            chrome.action.setIcon({ path: "../icons/timeline.png" });
            chrome.action.enable();
        } else {
            chrome.action.setIcon({ path: "../icons/timeline_grey.png" });
            chrome.action.disable();
        }
    });
});