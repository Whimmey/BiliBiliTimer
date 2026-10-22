// 页面挂载水波进度入口；点击后加载与工具栏相同的弹窗页面。
(() => {
    // 缓存扩展来源；扩展重载后旧页面中的内容脚本上下文可能失效，
    // 但页面消息监听器仍可能被调用，届时不能再访问 chrome.runtime。
    const extensionOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
    if (window.top !== window || !/^https:\/\/www\.bilibili\.com\/video\//.test(location.href)
        || document.getElementById('bili-timer-floating')) return;

    const host = document.createElement('div');
    host.id = 'bili-timer-floating';
    host.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;display:none;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
        <style>
            :host { all: initial; --bili-pink: #fb7299; font: 13px/1.5 system-ui, sans-serif; }
            button { font: inherit; cursor: pointer; }
            #toggle { position: relative; display: grid; place-items: center; box-sizing: border-box;
                width: 44px; height: 44px; border: 2px solid var(--bili-pink); border-radius: 50%; padding: 0;
                overflow: hidden; isolation: isolate; background: #fff0f5; color: #56253a;
                box-shadow: 0 2px 10px #0003;
                touch-action: none; user-select: none; }
            #toggle:hover { border-color: #ff6699; }
            #toggle { cursor: grab; }
            :host(.dragging) { will-change: transform; }
            :host(.dragging) #toggle, :host(.dragging) #header { cursor: grabbing; }
            #toggle:focus-visible { outline: 2px solid #00a1d6; outline-offset: 3px; }
            #toggle.error { border-color: #e74c3c; }
            #water { position: absolute; bottom: 0; left: 0; width: 100%; height: var(--level, 0%);
                background: var(--bili-pink); transition: height .6s ease; pointer-events: none; }
            .wave { position: absolute; top: -4px; left: 0; width: 80px; height: 8px;
                fill: var(--bili-pink); animation: wave 2.8s linear infinite; }
            .wave.back { top: -6px; opacity: .45; animation-duration: 4s; animation-direction: reverse; }
            #toggle[data-edge] .wave { display: none; }
            #percentage { position: relative; font: 700 11px/1 system-ui, sans-serif;
                font-variant-numeric: tabular-nums; pointer-events: none; }
            @keyframes wave { to { transform: translateX(-40px); } }
            @media (prefers-reduced-motion: reduce) {
                .wave { animation: none; } #water { transition: none; }
            }
            #panel { width: 300px; max-width: calc(100vw - 16px); border-radius: 12px;
                overflow: hidden; background: white; box-shadow: 0 6px 28px #0003; }
            #header { display: flex; justify-content: space-between; align-items: center;
                padding: 7px 12px; background: #00a1d6; color: white;
                cursor: move; touch-action: none; user-select: none; }
            #close { border: 0; padding: 0 4px; background: transparent; color: white;
                font-size: 20px; line-height: 1; }
            iframe { display: block; width: 100%; height: 400px; border: 0; background: white; }
            [hidden] { display: none !important; }
        </style>
        <button id="toggle" type="button" title="点击查看剩余时长，拖动调整位置"
            aria-label="剩余时长" aria-expanded="false" aria-controls="panel">
            <span id="water" aria-hidden="true">
                <svg class="wave back" viewBox="0 0 80 8"><path d="M0 4Q10 -4 20 4T40 4T60 4T80 4V8H0Z" /></svg>
                <svg class="wave" viewBox="0 0 80 8"><path d="M0 4Q10 -4 20 4T40 4T60 4T80 4V8H0Z" /></svg>
            </span>
            <span id="percentage">--%</span>
        </button>
        <section id="panel" hidden aria-label="视频时长计算">
            <div id="header"><span>视频时长 · 拖动移动</span>
                <button id="close" type="button" aria-label="收起面板">×</button>
            </div>
        </section>`;
    const toggle = root.getElementById('toggle');
    const panel = root.getElementById('panel');
    const header = root.getElementById('header');
    const close = root.getElementById('close');
    const percentage = root.getElementById('percentage');
    let frame = null;
    let panelToken = null;
    let panelHeight = 400;
    let opening = false;
    let position = { x: window.innerWidth - 60, y: 140 };
    let buttonPosition = null;
    let savedPosition = false;
    let drag = null;
    let dragged = false;
    let settingsReady = false;
    const settings = {
        BiliTimer_floatingEnabled: true,
        BiliTimer_floatingOpacity: 100,
        BiliTimer_floatingHideFullscreen: true,
        BiliTimer_scope: 'all'
    };

    // 时长信息仅在切换 BV 时读取；每秒只读取本地播放器的当前位置。
    let progressVideo = null;
    let progressBvid = null;
    let progressRequest = false;
    let progressRetryAt = 0;

    function showProgress(value, episodeOnly = settings.BiliTimer_scope === 'episode') {
        const valid = Number.isFinite(value);
        const percent = valid ? Math.max(0, Math.min(100, value)) : 0;
        toggle.style.setProperty('--level', `${percent}%`);
        toggle.toggleAttribute('data-edge', percent === 0 || percent === 100);
        percentage.textContent = valid ? `${Math.floor(percent)}%` : '--%';
        const scope = episodeOnly ? '本集' : '全部分集';
        const label = valid ? `${scope}进度 ${percent.toFixed(2)}%` : `正在读取${scope}进度`;
        toggle.setAttribute('aria-label', `${label}，点击查看剩余时长`);
        if (!drag && !toggle.classList.contains('error')) {
            toggle.title = `${label}，点击查看剩余时长，拖动调整位置`;
        }
    }

    async function refreshProgress() {
        if (!settingsReady || !settings.BiliTimer_floatingEnabled || document.hidden) return;
        const url = new URL(location.href);
        const bvid = url.pathname.match(/^\/video\/(BV\w+)\/?$/)?.[1];
        if (bvid !== progressBvid) {
            progressBvid = bvid;
            progressVideo = null;
            progressRetryAt = 0;
            showProgress(null);
        }
        if (!bvid) return;
        if (!progressVideo && !progressRequest && Date.now() >= progressRetryAt) {
            progressRequest = true;
            try {
                const result = await getVideoInfo(bvid);
                if (progressBvid === bvid) progressVideo = result;
            } catch (error) {
                progressRetryAt = Date.now() + 30000;
                showProgress(null);
            } finally {
                progressRequest = false;
            }
        }
        // 异步读取期间发生切集时，下一次刷新使用新地址。
        if (!progressVideo || location.href !== url.href || progressBvid !== bvid) return;
        const playback = readPlaybackState();
        const list = getVideoList(progressVideo, playback.page);
        showProgress(getVideoProgress({ ...list, playback }, settings.BiliTimer_scope),
            settings.BiliTimer_scope === 'episode' || list.durations.length === 1);
    }

    setInterval(() => { refreshProgress().catch(() => showProgress(null)); }, 1000);

    function applySettings() {
        const hidden = !settingsReady || !settings.BiliTimer_floatingEnabled
            || (settings.BiliTimer_floatingHideFullscreen && Boolean(document.fullscreenElement));
        if (hidden && (frame || opening)) collapse(false);
        host.style.display = hidden ? 'none' : 'block';
        toggle.style.opacity = String(Math.max(20, Math.min(100,
            Number(settings.BiliTimer_floatingOpacity) || 100)) / 100);
        // 非隐藏模式下，挂载到全屏容器中，避免被浏览器全屏层遮住。
        const container = document.fullscreenElement || document.body;
        if (!['VIDEO', 'IFRAME'].includes(container.tagName) && host.parentElement !== container) {
            container.append(host);
        }
        if (!hidden) {
            place();
            refreshProgress().catch(() => showProgress(null));
        }
    }

    function place() {
        // 拖动中复用按下时的尺寸，只更新合成层的位置，避免逐次触发布局测量。
        const bounds = drag?.bounds || host.getBoundingClientRect();
        position.x = Math.max(8, Math.min(position.x, window.innerWidth - bounds.width - 8));
        position.y = Math.max(8, Math.min(position.y, window.innerHeight - bounds.height - 8));
        host.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }

    function collapse(focus = true) {
        opening = false;
        frame?.remove(); // 卸载 iframe，释放计算面板和标签页监听。
        frame = null;
        panelToken = null;
        panel.hidden = true;
        toggle.hidden = false;
        toggle.setAttribute('aria-expanded', 'false');
        if (buttonPosition) position = { ...buttonPosition };
        place();
        if (focus) toggle.focus();
    }

    async function expand() {
        if (opening || frame) return;
        opening = true;
        toggle.disabled = true;
        try {
            const result = await chrome.runtime.sendMessage({ action: 'GetTimerTab' });
            if (!opening) return;
            if (!Number.isSafeInteger(result?.tabId)) throw new Error('无法识别当前标签页');
            frame = document.createElement('iframe');
            frame.title = 'Bilibili Video Timer';
            panelToken = crypto.randomUUID();
            frame.src = chrome.runtime.getURL(
                `popup.html?floating=1&tabId=${result.tabId}&panelToken=${panelToken}`
            );
            panel.append(frame);
            panel.hidden = false;
            toggle.hidden = true;
            toggle.setAttribute('aria-expanded', 'true');
            toggle.classList.remove('error');
            toggle.title = '点击查看剩余时长，拖动调整位置';
            buttonPosition = { ...position };
            place();
        } catch (error) {
            console.error('Bilibili Timer:', error);
            toggle.classList.add('error');
            toggle.title = '无法打开面板，请刷新页面重试';
        } finally {
            opening = false;
            toggle.disabled = false;
        }
    }

    toggle.addEventListener('click', () => {
        if (dragged) { dragged = false; return; }
        expand();
    });
    close.addEventListener('click', () => collapse());
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape' && frame) collapse();
    });

    for (const handle of [toggle, header]) {
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target === close || drag) return;
            drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
                lastX: event.clientX, lastY: event.clientY,
                threshold: event.pointerType === 'touch' ? 5 : 2,
                bounds: host.getBoundingClientRect(), title: toggle.title };
            dragged = false;
            toggle.title = '';
            host.classList.add('dragging');
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (!dragged && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < drag.threshold) return;
            dragged = true;
            position = { x: position.x + event.clientX - drag.lastX,
                y: position.y + event.clientY - drag.lastY };
            drag.lastX = event.clientX;
            drag.lastY = event.clientY;
            place();
        });
        const finish = event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            toggle.title = drag.title;
            drag = null;
            host.classList.remove('dragging');
            if (dragged) {
                savedPosition = true;
                if (frame) buttonPosition = { ...position };
                chrome.storage.local.set({ BiliTimer_floatingPosition: position }).catch(console.error);
            }
        };
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
    }

    window.addEventListener('message', event => {
        // 内容脚本中 MessageEvent.source 可能为空，使用扩展来源和面板令牌校验。
        if (!frame || event.origin !== extensionOrigin
            || event.data?.panelToken !== panelToken) return;
        if (event.data?.type === 'BiliTimerPanelClose') {
            collapse();
            return;
        }
        if (event.data?.type !== 'BiliTimerPanelHeight') return;
        const height = event.data.height;
        if (!Number.isFinite(height) || height <= 0) return;
        panelHeight = height;
        resizePanel();
    });
    function resizePanel() {
        if (frame) frame.style.height = `${Math.min(panelHeight, Math.max(80, window.innerHeight - 64))}px`;
        place();
    }
    window.addEventListener('resize', resizePanel);
    document.body.append(host);
    document.addEventListener('fullscreenchange', applySettings);
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            for (const key of Object.keys(settings)) {
                if (changes[key]) settings[key] = changes[key].newValue
                    ?? (key === 'BiliTimer_scope' ? 'all' : key === 'BiliTimer_floatingOpacity' ? 100 : true);
            }
            applySettings();
        } else if (area === 'local' && changes.BiliTimer_floatingPosition) {
            const stored = changes.BiliTimer_floatingPosition.newValue;
            if (!stored) {
                collapse(false);
                buttonPosition = null;
                position = { x: window.innerWidth - 60, y: 140 };
                savedPosition = true;
            } else if (Number.isFinite(stored.x) && Number.isFinite(stored.y) && !drag) {
                position = { ...stored };
                buttonPosition = frame ? { ...stored } : null;
                savedPosition = true;
            }
            place();
        }
    });
    chrome.storage.sync.get(settings).then(data => {
        Object.assign(settings, data);
        settingsReady = true;
        applySettings();
    }).catch(error => {
        console.error('Bilibili Timer settings:', error);
        settingsReady = true;
        applySettings();
    });
    chrome.storage.local.get('BiliTimer_floatingPosition').then(data => {
        const stored = data.BiliTimer_floatingPosition;
        if (!savedPosition && stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
            position = stored;
            place();
        }
    }).catch(console.error);
})();
