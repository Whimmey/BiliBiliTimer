chrome.storage.sync.get('blockMenuItem', function (data) {
    var blockMenuItem = data.blockMenuItem;
    if (!blockMenuItem) {
        chrome.contextMenus.create({
            id: 'BilibiliTimer',
            title: 'Bilibili Video Timer - 计算到此时长',
            contexts: ['link'],
            documentUrlPatterns: ['https://www.bilibili.com/video/*'] // 只在某些页面显示此右键菜单
        });
    } else {
        chrome.contextMenus.remove('BilibiliTimer');
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
                title: '扩展程序通知',
                message: `已复制到剪贴板：${p}`,
            });
        }
    });
});
