// 由页面内容脚本获取所属标签页，悬浮面板始终操作该页面。
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GetTimerTab' && sender.tab
        && /^https:\/\/www\.bilibili\.com\/video\//.test(sender.url || '')) {
        sendResponse({ tabId: sender.tab.id });
    }
});

const insertMarkerMenu = {
    id: 'InsertMarker',
    title: '标记一下',
    contexts: ['link'],
    documentUrlPatterns: ['https://www.bilibili.com/video/*']
};

const quickCopyMenu = {
    id: 'QuickCopy',
    title: '计算到此时长',
    contexts: ['link'],
    documentUrlPatterns: ['https://www.bilibili.com/video/*']
};

function syncQuickCopyMenu() {
    chrome.storage.sync.get('blockMenuItem', function (data) {
        if (data.blockMenuItem) {
            chrome.contextMenus.remove('QuickCopy', () => {
                // The item may already be absent; clear the expected API error.
                void chrome.runtime.lastError;
            });
        } else {
            chrome.contextMenus.create(quickCopyMenu, () => {
                // The item may already exist when settings change or the worker starts.
                void chrome.runtime.lastError;
            });
        }
    });
}

// Context menu items survive service worker restarts. Create them only on install/update,
// rather than at top level each time Chrome wakes the worker.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        void chrome.runtime.lastError;
        chrome.contextMenus.create(insertMarkerMenu);
        syncQuickCopyMenu();
    });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.blockMenuItem) {
        syncQuickCopyMenu();
    }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (!Number.isInteger(tab?.id) || tab.id < 0 || !info.linkUrl) return;
    const target = new URL(info.linkUrl);
    const bvid = target.origin === 'https://www.bilibili.com'
        ? target.pathname.match(/^\/video\/(BV\w+)\/?$/)?.[1] : null;
    const p = Number(target.searchParams.get('p') || 1);
    const sourceBvid = (tab.url || '').match(/^https:\/\/www\.bilibili\.com\/video\/(BV\w+)(?:\/|\?|$)/)?.[1];
    // 右键集数仅适用于当前 BV 的分集链接；不处理其他视频或普通链接。
    if (!bvid || bvid !== sourceBvid || !Number.isSafeInteger(p) || p < 1) return;
    switch (info.menuItemId) {
        case 'QuickCopy':
            chrome.storage.session.set({
                [`BiliTimer_quickEnd_${tab.id}`]: { bvid, episode: p }
            }).catch(console.error);
            chrome.storage.sync.get('blockNotification', function (data) {
                let blockNotification = data.blockNotification;
                if (!blockNotification) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: '../icons/timeline.png',
                        title: 'BilibiliTimer扩展通知',
                        message: `已选择第 ${p} 集，打开计时面板即可计算`,
                    });
                }
            });
            break;
        case 'InsertMarker':
            chrome.tabs.sendMessage(tab.id, { action: "InsertMarker", p_mark: String(p), bvid: bvid })
            break;
    }
});

chrome.tabs.onRemoved.addListener(tabId => {
    chrome.storage.session.remove(`BiliTimer_quickEnd_${tabId}`).catch(console.error);
});

// 每个标签页独立维护按钮状态，后台标签页不会改变当前页的按钮。
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (chrome.runtime.lastError) return; // 标签页可能已关闭。
        tabHandler(tab);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && /^https:\/\/www\.bilibili\.com\/video\//.test(changeInfo.url)) {
        // 站内路由切换可能不触发 load，通知原有内容脚本恢复当前视频的标记。
        chrome.tabs.sendMessage(tabId, { action: 'RefreshMarkers' }).catch(() => {
            // 完整导航时内容脚本可能尚未加载，稍后会自行初始化。
        });
    }
    if (changeInfo.url || changeInfo.status === 'complete') {
        tabHandler(tab);
    }
});

function tabHandler(tab) {
    if (!Number.isInteger(tab?.id) || tab.id < 0) return;
    const isMatched = /^https:\/\/www\.bilibili\.com\/video\//.test(tab.url || '');
    chrome.action.setIcon({
        tabId: tab.id,
        path: isMatched ? 'icons/timeline.png' : 'icons/timeline_grey.png'
    });
    if (isMatched) {
        chrome.action.enable(tab.id);
    } else {
        chrome.action.disable(tab.id);
    }
}
