const btn_cal = document.getElementById('btn-cal');
const btn_back = document.getElementById('btn-back');
const stime = document.getElementById('showtime');
const startp = document.getElementById('p_start');
const endp = document.getElementById('p_end');
const endRange = document.getElementById('endRange');
const rangeLabel = document.getElementById('rangeLabel');
const progress = document.getElementById('prgs');
const scopeEpisode = document.getElementById('scope-episode');
const scopeAll = document.getElementById('scope-all');
let scope = 'all';
let isCustomRange = false;
let activeEndpoint = 'end';
let context = null;
let pendingUrl = null;
// 仅在面板生命周期内保存，不增加存储写入或网络请求。
const customRanges = new Map();
const panelParams = new URLSearchParams(window.location.search);
const floating = panelParams.get('floating') === '1';
const hostTabId = Number(panelParams.get('tabId'));

function selectEndpoint(endpoint) {
    activeEndpoint = endpoint;
    rangeLabel.textContent = `滑动选择${endpoint === 'start' ? '起始' : '结束'}集`;
    const selectedInput = endpoint === 'start' ? startp : endp;
    if (context) endRange.value = clampEpisode(selectedInput.value,
        endpoint === 'start' ? context.current : context.durations.length);
}
for (const [input, endpoint] of [[startp, 'start'], [endp, 'end']]) {
    input.addEventListener('focus', () => { input.select(); selectEndpoint(endpoint); });
}

async function getTimerTab() {
    const tab = floating && Number.isSafeInteger(hostTabId) && hostTabId > 0
        ? await chrome.tabs.get(hostTabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab || !/^https:\/\/www\.bilibili\.com\/video\//.test(tab.url || '')) {
        throw new Error('请在 B 站视频播放页使用');
    }
    return tab;
}

// 每次点击重新读取页面状态，不启动定时器或监听播放事件。
async function readContext(reuseVideo = false) {
    const tab = await getTimerTab();
    const snapshot = await chrome.tabs.sendMessage(tab.id, { action: 'GetPlaybackState' });
    if (!snapshot?.bvid) throw new Error('无法识别当前视频，请刷新视频页后重试');
    // 切换范围只读取播放位置，继续使用面板内已有的时长信息。
    if (reuseVideo && context?.tabId === tab.id && context.bvid === snapshot.bvid
        && (context.sections || context.current === snapshot.page)) {
        return { ...context, playback: snapshot };
    }
    const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'GetVideoInfo', bvid: snapshot.bvid
    });
    if (!result?.data) throw new Error(result?.error || '无法获取视频时长，请重试');
    // 请求期间可能发生切集，使用最新状态；跨 BV 切换时请重新计算。
    const playback = await chrome.tabs.sendMessage(tab.id, { action: 'GetPlaybackState' });
    if (!playback || playback.bvid !== snapshot.bvid) throw new Error('视频已切换，请重新计算');
    return { ...getVideoList(result, playback.page), playback, bvid: playback.bvid, tabId: tab.id };
}

function clampEpisode(value, fallback) {
    const number = Number.parseInt(value, 10);
    return Math.min(context.durations.length, Math.max(1, Number.isFinite(number) ? number : fallback));
}

function syncRange() {
    startp.max = endp.max = endRange.max = context.durations.length;
    let first = clampEpisode(startp.value, context.current);
    let last = clampEpisode(endp.value, context.durations.length);
    if (first > last) [first, last] = [last, first];
    startp.value = first;
    endp.value = last;
    endRange.value = activeEndpoint === 'start' ? first : last;
    if (isCustomRange) rememberCustomRange();
    return [first, last];
}

function rangeKey() {
    // 合集使用分组内第一个视频作为标识，同组切集仍复用同一区间。
    if (context.sections) {
        const section = context.sections.find(section =>
            section.episodes.some(episode => episode.bvid === context.bvid));
        return `section:${section?.episodes[0]?.bvid || context.bvid}`;
    }
    return `video:${context.bvid}`;
}

function rememberCustomRange() {
    if (!context) return;
    customRanges.set(rangeKey(), { start: startp.value, end: endp.value });
}

function formatTime(seconds) {
    seconds = Math.ceil(Math.max(0, seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const rest = seconds % 60;
    return [hours ? `${hours}h` : '', minutes ? `${minutes}min` : '',
        rest || (!hours && !minutes) ? `${rest}s` : ''].filter(Boolean).join(' ');
}

function updateRangeHint() {
    const episodeOnly = isEpisodeScope();
    document.getElementById('scope-switch').hidden = !context || context.durations.length === 1;
    document.getElementById('episode-range').hidden = !context || episodeOnly;
    for (const [button, selected] of [[scopeEpisode, episodeOnly], [scopeAll, !episodeOnly]]) {
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    }
    btn_back.hidden = episodeOnly;
    btn_cal.style.width = episodeOnly ? '100%' : '47%';
    document.getElementById('mode-info').textContent = episodeOnly
        ? '本集：计算当前播放位置到本集结束的剩余时长。' : !isCustomRange
        ? '默认计算当前位置到最后一集；修改集数后计算完整区间。'
        : '自定义区间：计算所选各集完整时长，包含首尾集。';
}

function isEpisodeScope() {
    return scope === 'episode' || context?.durations.length === 1;
}

function applyScope(value) {
    const next = value === 'episode' ? 'episode' : 'all';
    if (scope === next) return;
    scope = next;
    updateRangeHint();
    if (context && !btn_cal.disabled) calculate(false, null, true);
}
for (const [button, value] of [[scopeEpisode, 'episode'], [scopeAll, 'all']]) {
    button.addEventListener('click', () => {
        applyScope(value);
        chrome.storage.sync.set({ BiliTimer_scope: value }).catch(() => {
            stime.value = '范围已切换，但偏好保存失败，请重试';
        });
    });
}
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.BiliTimer_scope) applyScope(changes.BiliTimer_scope.newValue);
});

function updateProgress(includeCurrentTime = true) {
    const { durations, current, group } = context;
    const episodeOnly = isEpisodeScope();
    const value = getVideoProgress(context, scope, includeCurrentTime);
    const width = value === null ? '0.00' : value.toFixed(2);
    progress.style.width = `${width}%`;
    progress.setAttribute('aria-valuenow', width);
    document.getElementById('prgs_info').textContent =
        `${episodeOnly ? '本集进度' : '全部分集进度'} ${width}% · 第 ${current}/${durations.length} 集${group ? ` · ${group}` : ''}`;
}

// 仅弹窗打开期间响应 URL 变化；已知列表内切集复用时长，新视频重新读取。
function updateEpisodeProgress(url) {
    if (!context) return;
    let target;
    try {
        target = new URL(url);
    } catch {
        return;
    }
    const bvid = target.hostname === 'www.bilibili.com'
        ? target.pathname.match(/^\/video\/(BV\w+)\/?$/)?.[1] : null;
    const page = Number(target.searchParams.get('p') || 1);
    if (bvid === context.bvid && page === context.current && !context.sections) return;
    let current = page;
    let durations = context.durations;
    let group = context.group;
    if (context.sections) {
        const section = context.sections.find(section =>
            section.episodes.some(episode => episode.bvid === bvid));
        if (section) {
            current = section.episodes.findIndex(episode => episode.bvid === bvid) + 1;
            if (bvid === context.bvid && current === context.current) return;
            durations = section.episodes.map(episode => episode.page.duration);
            group = section.title || '';
        } else {
            current = NaN;
        }
    } else if (!bvid || bvid !== context.bvid) {
        current = NaN;
    }
    if (!Number.isSafeInteger(current) || current < 1 || current > durations.length
        || durations.some(seconds => !Number.isFinite(seconds) || seconds < 0)) {
        progress.style.width = '0%';
        progress.setAttribute('aria-valuenow', 0);
        // 新视频不在缓存内时自动读取一次；同一列表切集走下面的缓存计算。
        document.getElementById('prgs_info').textContent = '正在读取新视频进度';
        calculate(true);
        return;
    }
    const previousRangeKey = rangeKey();
    if (isCustomRange) rememberCustomRange();
    context = { ...context, bvid, current, durations, group,
        playback: { ready: false, currentTime: 0 } };
    if (!isCustomRange) {
        startp.value = current;
        endp.value = endRange.value = durations.length;
        document.getElementById('mode-info').textContent =
            '已按本集开头计算到最后一集；点击计算可读取当前播放位置。';
    } else if (rangeKey() !== previousRangeKey) {
        const saved = customRanges.get(rangeKey());
        startp.value = saved ? clampEpisode(saved.start, current) : current;
        endp.value = endRange.value = saved ? clampEpisode(saved.end, durations.length) : durations.length;
    }
    const [first, last] = syncRange();
    stime.value = isEpisodeScope() ? '视频已切换，请点击计算读取本集剩余时长'
        : formatTime(durations.slice(first - 1, last).reduce((sum, seconds) => sum + seconds, 0));
    updateProgress(false);
    updateRangeHint();
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId !== context?.tabId || !changeInfo.url) return;
    // 手动计算过程中先记录 URL，避免旧请求覆盖切集后的百分比。
    if (btn_cal.disabled) pendingUrl = changeInfo.url;
    else updateEpisodeProgress(changeInfo.url);
});

async function calculate(reset = false, quickSelection = null, reuseVideo = false) {
    const controls = [btn_cal, btn_back, startp, endp, endRange, scopeEpisode, scopeAll];
    controls.forEach(control => { control.disabled = true; });
    stime.value = !isCustomRange ? '正在读取播放进度' : '正在读取视频时长';
    try {
        const previous = context;
        context = await readContext(reuseVideo);
        const { durations, current, playback } = context;
        const count = durations.length;
        // 获取视频数据后再次核对 BV，避免打开面板期间切换视频而套用旧集数。
        const quickEnd = quickSelection?.bvid === context.bvid
            && Number.isSafeInteger(quickSelection.episode) && quickSelection.episode > 0
            ? quickSelection.episode : null;
        if (quickEnd !== null) {
            isCustomRange = true;
            scope = 'all';
            await chrome.storage.sync.set({ BiliTimer_scope: scope });
        }
        if (reset || (previous && (previous.bvid !== context.bvid || previous.group !== context.group))) {
            const saved = isCustomRange ? customRanges.get(rangeKey()) : null;
            startp.value = saved ? saved.start : current;
            endp.value = saved ? saved.end : count;
        }
        if (quickEnd !== null) endp.value = quickEnd;
        if (isEpisodeScope()) {
            updateProgress();
            stime.value = playback.ready ? formatTime(playback.duration - playback.currentTime)
                : '正在读取播放进度，请稍后点击计算';
            return;
        }
        if (!isCustomRange) {
            startp.value = current;
            endp.value = count;
        }
        const [first, last] = syncRange();
        updateProgress();
        if (!isCustomRange && !playback.ready) {
            stime.value = '正在读取播放进度，请稍后点击计算';
            return;
        }
        let seconds = durations.slice(first - 1, last).reduce((sum, value) => sum + value, 0);
        if (!isCustomRange) {
            // 当前集以播放器真实时长为准，后续各集使用 API 时长。
            seconds += Math.max(0, playback.duration - playback.currentTime) - durations[current - 1];
        }
        stime.value = formatTime(seconds);
    } catch (error) {
        console.error(error);
        stime.value = error.message?.includes('Receiving end does not exist')
            ? '请刷新视频页后重试' : (error.message || '读取失败，请重试');
    } finally {
        controls.forEach(control => { control.disabled = false; });
        updateRangeHint();
        if (pendingUrl) {
            const url = pendingUrl;
            pendingUrl = null;
            updateEpisodeProgress(url);
        }
    }
}

function editRange() {
    isCustomRange = true;
    if (context) {
        const selectedInput = activeEndpoint === 'start' ? startp : endp;
        endRange.value = clampEpisode(selectedInput.value, context.durations.length);
    }
    rememberCustomRange();
    updateRangeHint();
    stime.value = '区间已修改，请点击计算';
}
for (const input of [startp, endp]) {
    input.addEventListener('input', editRange);
}
endRange.addEventListener('input', function () {
    (activeEndpoint === 'start' ? startp : endp).value = this.value;
    editRange();
});
btn_cal.addEventListener('click', () => calculate());
btn_back.addEventListener('click', () => {
    if (isCustomRange) rememberCustomRange();
    isCustomRange = false;
    calculate(true);
});

async function initialize() {
    try {
        const [tab, saved] = await Promise.all([
            getTimerTab(), chrome.storage.sync.get({ BiliTimer_scope: 'all' })
        ]);
        scope = saved.BiliTimer_scope === 'episode' ? 'episode' : 'all';
        const key = `BiliTimer_quickEnd_${tab.id}`;
        const data = await chrome.storage.session.get(key);
        if (data[key]) await chrome.storage.session.remove(key);
        await calculate(true, data[key] || null);
    } catch (error) {
        stime.value = error.message || '初始化失败，请重试';
    }
}

document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;
document.getElementById('author').textContent = 'by wyy';
if (floating) {
    // 父页面只接收高度通知；计算和权限操作仍由扩展页面完成。
    new ResizeObserver(() => {
        window.parent.postMessage({
            type: 'BiliTimerPanelHeight', height: document.body.scrollHeight,
            panelToken: panelParams.get('panelToken')
        }, 'https://www.bilibili.com');
    }).observe(document.body);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            window.parent.postMessage({
                type: 'BiliTimerPanelClose', panelToken: panelParams.get('panelToken')
            }, 'https://www.bilibili.com');
        }
    });
}
initialize();
