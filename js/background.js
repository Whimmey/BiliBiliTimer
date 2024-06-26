/* 
* 创建InsertMarker
*/
chrome.contextMenus.create({
    id: 'InsertMarker',
    title: '标记一下',
    contexts: ['link'], // 只在链接上显示此右键菜单
    documentUrlPatterns: ['https://www.bilibili.com/video/*'] // 只在某些页面显示此右键菜单
});

/* 
* 关于创建右键菜单
*/
chrome.storage.sync.get('blockMenuItem', function (data) {
    const blockMenuItem = data.blockMenuItem;
    if (!blockMenuItem) {
        chrome.contextMenus.create({
            id: 'QuickCopy',
            title: '计算到此时长',
            contexts: ['link'], // 只在链接上显示此右键菜单
            documentUrlPatterns: ['https://www.bilibili.com/video/*'] // 只在某些页面显示此右键菜单
        });
    } else {
        chrome.contextMenus.remove('QuickCopy'); // 移除右键菜单选项
    }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    let target = info.linkUrl // https://www.bilibili.com/video/BV1gM411W7ex/?p=1
    // 使用正则表达式提取视频p参数
    let p = target.match(/p=\d+/)[0].match(/\d+/)[0], bvid = target.match(/BV\w+/)[0];
    switch (info.menuItemId) {
        case 'QuickCopy':
            chrome.storage.local.set({ clipboardData: p }); // 将p参数存入本地存储, 用于popup.js中的粘贴功能
            chrome.storage.sync.get('blockNotification', function (data) {
                let blockNotification = data.blockNotification;
                if (!blockNotification) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: '../icons/timeline.png',
                        title: 'BilibiliTimer扩展通知',
                        message: `已复制到剪贴板：${p}`,
                    });
                }
            });
            break;
        case 'InsertMarker':
            chrome.tabs.sendMessage(tab.id, { action: "InsertMarker", p_mark: p, bvid: bvid })
            break;
    }
});

/* 
* 关于动态图标设置
*/
var manifest = chrome.runtime.getManifest();
var matches_reg = manifest.content_scripts[0].matches.map(m => m.replace(/\*/g, '.*'));;

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, tabHandler);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete') {
        tabHandler(tab);
    }
});

function tabHandler(tab) {
    let url = tab.url;
    let isMatched = matches_reg.some(m => new RegExp(m).test(url));
    // console.log('urlMatch:', isMatched, url);

    if (isMatched) {
        chrome.action.setIcon({ path: "../icons/timeline.png" });
        chrome.action.enable();
    } else {
        chrome.action.setIcon({ path: "../icons/timeline_grey.png" });
        chrome.action.disable();
    }
}