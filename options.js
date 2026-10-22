/* 
* chrome.storage.sync与chrome.storage.local的区别：
*   chrome.storage.sync：同步存储，用户在不同的设备上登录时，数据会同步
*   chrome.storage.local：本地存储，用户在不同的设备上登录时，数据不会同步
*/
let notificationToggle = document.getElementById('blockNotification');
let menuToggle = document.getElementById('blockMenuItem');
let markerInput = document.getElementById('markerInput');

const floatingEnabled = document.getElementById('floatingEnabled');
const floatingOpacity = document.getElementById('floatingOpacity');
const floatingHideFullscreen = document.getElementById('floatingHideFullscreen');
const floatingOpacityValue = document.getElementById('floatingOpacityValue');
const floatingStatus = document.getElementById('floatingSettingsStatus');
chrome.storage.sync.get({
    BiliTimer_floatingEnabled: true,
    BiliTimer_floatingOpacity: 100,
    BiliTimer_floatingHideFullscreen: true
}).then(data => {
    floatingEnabled.checked = data.BiliTimer_floatingEnabled !== false;
    floatingOpacity.value = Math.max(20, Math.min(100, Number(data.BiliTimer_floatingOpacity) || 100));
    floatingOpacityValue.textContent = `${floatingOpacity.value}%`;
    floatingHideFullscreen.checked = data.BiliTimer_floatingHideFullscreen !== false;
    for (const control of [floatingEnabled, floatingOpacity, floatingHideFullscreen]) control.disabled = false;
}).catch(() => { floatingStatus.textContent = '读取设置失败，请刷新选项页重试'; });

async function saveFloatingSetting(key, value) {
    try {
        await chrome.storage.sync.set({ [key]: value });
        floatingStatus.textContent = '已保存，已打开的视频页立即生效';
    } catch {
        floatingStatus.textContent = '保存失败，请重试';
    }
}
floatingEnabled.addEventListener('change', () =>
    saveFloatingSetting('BiliTimer_floatingEnabled', floatingEnabled.checked));
floatingHideFullscreen.addEventListener('change', () =>
    saveFloatingSetting('BiliTimer_floatingHideFullscreen', floatingHideFullscreen.checked));
floatingOpacity.addEventListener('input', () => {
    floatingOpacityValue.textContent = `${floatingOpacity.value}%`;
});
// 拖动结束才保存，避免滑块每移动一步就写入同步存储。
floatingOpacity.addEventListener('change', () =>
    saveFloatingSetting('BiliTimer_floatingOpacity', Number(floatingOpacity.value)));
document.getElementById('resetFloatingPosition').addEventListener('click', async () => {
    try {
        await chrome.storage.local.remove('BiliTimer_floatingPosition');
        floatingStatus.textContent = '位置已重置到页面右侧';
    } catch {
        floatingStatus.textContent = '重置失败，请重试';
    }
});

// 获取blockNotification的值
chrome.storage.sync.get('blockNotification', function (data) {
    // 勾选表示关闭通知；未设置时默认允许通知，与后台逻辑一致。
    notificationToggle.checked = data.blockNotification ?? false;
});
// 绑定开关的change事件
notificationToggle.addEventListener('change', function () {
    let isChecked = notificationToggle.checked;
    chrome.storage.sync.set({ blockNotification: isChecked });
    console.log('blockNotification: ' + isChecked);
});

// 右键菜单开关
chrome.storage.sync.get('blockMenuItem', function (data) {
    menuToggle.checked = Boolean(data.blockMenuItem);
});
// 绑定开关的change事件
menuToggle.addEventListener('change', function () {
    let isChecked = menuToggle.checked;
    chrome.storage.sync.set({ blockMenuItem: isChecked });
    console.log('blockMenuItem: ' + isChecked);
});

// 获取默认Marker
chrome.storage.sync.get('BiliTimer_defaultMarker', function (data) {
    markerInput.value = data.BiliTimer_defaultMarker ? data.BiliTimer_defaultMarker : '✨';
});
// 默认Marker设置修改事件
markerInput.addEventListener('blur', function () {
    let marker = markerInput.value;
    console.log('New default marker: ' + marker);
    chrome.storage.sync.set({ BiliTimer_defaultMarker: marker });
});
// Marker模态框
const markerModal = new bootstrap.Modal(document.getElementById('myModal'), {
    backdrop: true,
    keyboard: false
});
document.getElementById('openModalButton').addEventListener('click', function () {
    showMarkerList();
    markerModal.show();
});

// 按钮事件在选项页初始化时绑定一次，不随窗口打开而重复绑定。
document.getElementById('clearBtn').addEventListener('click', function () {
    const checkedBvids = document.querySelectorAll('.checkBvid:checked');
    if (checkedBvids.length === 0) return;
    if (confirm('确认清空选中视频的所有标记？')) {
        chrome.storage.sync.get('BiliTimer_marker', function (data) {
            const markers = data.BiliTimer_marker || {};
            for (const node of checkedBvids) delete markers[node.value];
            chrome.storage.sync.set({ BiliTimer_marker: markers }, () => {
                showMarkerList();
            });
        });
    }
});

// 保存marker按钮
document.getElementById('saveBtn').addEventListener('click', function () {
    const allcards = document.querySelectorAll('#myModal .card-body');
    const markers = {};
    for (const card of allcards) {
        const inputs = card.querySelectorAll('.input-group');
        const markerList = Array.from(inputs).reduce((acc, row) => {
            const p = row.querySelector('span').textContent;
            const marker = row.querySelector('input').value;
            if (marker) acc.push([p, marker]);
            return acc;
        }, []);
        if (markerList.length > 0) markers[card.id] = markerList;
    }
    chrome.storage.sync.set({ BiliTimer_marker: markers });
    markerModal.hide();
});

// 关闭dialog按钮
document.getElementById('closeBtn').addEventListener('click', function () {
    markerModal.hide();
});

function showMarkerList() {
    chrome.storage.sync.get('BiliTimer_marker', function (data) {
        const allMarkers = data.BiliTimer_marker || {};
        const accordion = document.getElementById('accordionEx');
        const fragment = document.createDocumentFragment();
        if (Object.keys(allMarkers).length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center';
            empty.textContent = '似乎啥也没标记过呢(_　_)。゜zｚＺ';
            fragment.append(empty);
        }
        for (const [bvid, markers] of Object.entries(allMarkers)) {
            const card = document.createElement('div');
            card.className = 'card mb-2';
            // innerHTML 只放固定布局，用户内容通过 DOM 属性填入。
            card.innerHTML = `
                <div class="card-header" style="padding:0">
                    <label class="btn btn-secondary" style="width:100%; border-bottom-left-radius:0;border-bottom-right-radius:0;" >
                        <input type="checkbox" autocomplete="off" class="checkBvid">
                        <span></span>
                    </label>
                </div>
                <div class="collapse show" data-parent="#accordionEx">
                    <div class="card-body"></div>
                </div>`;
            card.querySelector('.checkBvid').value = bvid;
            card.querySelector('label span').textContent = bvid;
            const body = card.querySelector('.card-body');
            body.id = bvid;
            for (const [episode, marker] of [...markers].sort((a, b) => a[0] - b[0])) {
                const row = document.createElement('div');
                row.className = 'input-group input-group-sm';
                row.innerHTML = `<span class="input-group-text"></span>
                    <input type="text" class="form-control">`;
                row.querySelector('span').textContent = episode;
                const input = row.querySelector('input');
                input.value = marker;
                input.setAttribute('aria-label', `第 ${episode} 集标记`);
                body.append(row);
            }
            fragment.append(card);
        }
        accordion.replaceChildren(fragment);
    });
}

// 获取版本号
const manifest = chrome.runtime.getManifest();
const version = manifest.version;
document.getElementById('version').innerHTML = 'v' + version;
