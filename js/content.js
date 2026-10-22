// 标记数据保持原有 { bvid: [[集数, 内容], ...] } 格式，页面内缓存用于恢复列表。
let markerStore = {};
let markerStorageReady = false;
let displayedMarkerBvid = null;
let markerRefreshPending = false;

function currentMarkerBvid() {
    return location.pathname.match(/^\/video\/(BV\w+)\/?$/)?.[1];
}

function scheduleMarkerRefresh() {
    if (markerRefreshPending) return;
    markerRefreshPending = true;
    // 合并同一轮列表重建中的多次变化，不反复读取存储。
    setTimeout(() => {
        markerRefreshPending = false;
        drawStoreMarker();
    }, 100);
}

// 消息响应和悬浮球使用同一份播放器状态，不缓存播放位置。
function readPlaybackState() {
    const url = new URL(location.href);
    const video = document.querySelector(
        '#bilibili-player video, #bilibili-player bwp-video, #bilibiliPlayer video, #bilibiliPlayer bwp-video'
    ) || document.querySelector('video, bwp-video');
    return {
        bvid: url.pathname.match(/^\/video\/(BV\w+)\/?$/)?.[1],
        page: Math.max(1, Number.parseInt(url.searchParams.get('p'), 10) || 1),
        ready: Boolean(video && video.readyState >= 1 && !video.seeking
            && Number.isFinite(video.duration) && video.duration > 0
            && Number.isFinite(video.currentTime)),
        currentTime: video && Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: video && Number.isFinite(video.duration) ? video.duration : 0
    };
}

//监听扩展程序进程或内容脚本发送的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "GetPlaybackState":
            sendResponse(readPlaybackState());
            break;
        case "GetVideoInfo":
            (async () => {
                try {
                    const res = await getVideoInfo(request.bvid)
                    console.log('Bilibili video Timer - video info received:', res);
                    sendResponse(res);
                } catch (error) {
                    console.error(error);
                    sendResponse({ error: error.name === 'TimeoutError'
                        ? error.message : '无法获取视频信息，请重试' });
                }
            })();
            return true;
        case "InsertMarker": // p_mark: 要插入标记的视频集号; bvid: 视频的bvid
            insertMarker(request.p_mark, request.bvid)
            sendResponse('InsertMarker done!')
            break;
        case "RefreshMarkers":
            scheduleMarkerRefresh();
            break;
        default:
            console.log('Bilibili video Timer - content.js received message');
    }
});

function saveAndUpdateMark(p, bvid, marker) {
    return chrome.storage.sync.get('BiliTimer_marker').then(data => {
        const markers = data.BiliTimer_marker || {};
        // 统一集数键类型，兼容旧数据中同时存在数字和字符串的情况。
        const entries = new Map((markers[bvid] || []).map(([episode, value]) => [String(episode), value]));
        if (marker) entries.set(String(p), marker);
        else entries.delete(String(p));
        if (entries.size) markers[bvid] = Array.from(entries);
        else delete markers[bvid];
        return chrome.storage.sync.set({ BiliTimer_marker: markers });
    }).catch(console.error);
}

function markerTarget(episode) {
    return document.querySelector('.list-box')?.querySelectorAll('.clickitem')[Number(episode) - 1];
}

function insertMarker(p_mark, bvid, readMarker = null) {
    if (bvid !== currentMarkerBvid() || !Number.isSafeInteger(Number(p_mark)) || Number(p_mark) < 1) return;
    if (readMarker === null) {
        // 先保存意图；列表尚未加载时也不会丢失，出现后再由恢复逻辑绘制。
        chrome.storage.sync.get(['BiliTimer_defaultMarker', 'BiliTimer_marker']).then(data => {
            const existing = data.BiliTimer_marker?.[bvid] || [];
            if (existing.some(([p, marker]) => String(p) === String(p_mark) && marker)) {
                scheduleMarkerRefresh();
                return;
            }
            return saveAndUpdateMark(p_mark, bvid, data.BiliTimer_defaultMarker || '✨');
        }).catch(console.error);
        return;
    }
    const targetItem = markerTarget(p_mark);
    if (!targetItem) return;
    const previous = targetItem.previousElementSibling;
    if (previous?.classList.contains('bili-timer-marker')
        && previous.dataset.bvid === bvid && previous.dataset.episode === String(p_mark)) {
        if (previous.textContent !== readMarker) previous.textContent = readMarker;
        return;
    }
    const markerSpan = document.createElement('span');
    markerSpan.className = 'bili-timer-marker';
    markerSpan.dataset.bvid = bvid;
    markerSpan.dataset.episode = String(p_mark);
    markerSpan.textContent = readMarker;
    markerSpan.style.marginRight = '5px';
    markerSpan.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (bvid !== currentMarkerBvid()) return;
        const marker = prompt('请输入要插入的标记：', this.textContent);
        if (marker === null) return; // 取消或按 Esc 时不修改、不保存。
        this.textContent = marker;
        if (!marker) this.remove();
        saveAndUpdateMark(p_mark, bvid, marker);
    });
    targetItem.insertAdjacentElement('beforebegin', markerSpan);
}

function drawStoreMarker() {
    if (!markerStorageReady) return;
    const bvid = currentMarkerBvid();
    displayedMarkerBvid = bvid;
    const entries = new Map((markerStore[bvid] || []).map(([p, marker]) => [String(p), marker]));
    // 清除旧视频、已删除或因列表排序而挂错位置的标记。
    document.querySelectorAll('.bili-timer-marker').forEach(span => {
        if (span.dataset.bvid !== bvid || !entries.get(span.dataset.episode)
            || span.nextElementSibling !== markerTarget(span.dataset.episode)) span.remove();
    });
    for (const [p, marker] of entries) {
        if (marker) insertMarker(p, bvid, marker);
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.BiliTimer_marker) return;
    markerStore = changes.BiliTimer_marker.newValue || {};
    markerStorageReady = true;
    scheduleMarkerRefresh();
});
chrome.storage.sync.get('BiliTimer_marker').then(data => {
    // 初始化期间若已收到更新，以更新事件中的数据为准。
    if (!markerStorageReady) markerStore = data.BiliTimer_marker || {};
    markerStorageReady = true;
    scheduleMarkerRefresh();
}).catch(console.error);

// 仅列表变化或 BV 切换时重新绘制；忽略播放器等无关区域的频繁更新。
new MutationObserver(records => {
    const listChanged = records.some(record => {
        if (record.target.closest?.('.bili-timer-marker')) return false;
        const nodes = [...record.addedNodes, ...record.removedNodes];
        if (nodes.length && nodes.every(node => node.nodeType === 1
            && node.matches('.bili-timer-marker'))) return false;
        return record.target.closest?.('.list-box') || nodes.some(node => node.nodeType === 1
            && (node.matches('.list-box') || node.querySelector('.list-box')));
    });
    if (currentMarkerBvid() !== displayedMarkerBvid || listChanged) scheduleMarkerRefresh();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
window.addEventListener('popstate', scheduleMarkerRefresh);
window.addEventListener('pageshow', scheduleMarkerRefresh);
