// 分集时长信息在页面内容脚本生命周期内短暂缓存，避免反复展开面板时重复请求。
// 播放位置不在这里缓存，由 popup 每次计算时单独读取。
const VIDEO_INFO_CACHE_TTL_MS = 60 * 1000;
const VIDEO_INFO_TIMEOUT_MS = 10 * 1000;
const videoInfoCache = new Map();
const videoInfoRequests = new Map();

// 获取视频信息 - API
async function getVideoInfo(bvid) {
    const cached = videoInfoCache.get(bvid);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) videoInfoCache.delete(bvid);
    if (videoInfoRequests.has(bvid)) return videoInfoRequests.get(bvid);

    const request = fetchVideoInfo(bvid).then(value => {
        videoInfoCache.set(bvid, { value, expiresAt: Date.now() + VIDEO_INFO_CACHE_TTL_MS });
        return value;
    }).finally(() => videoInfoRequests.delete(bvid));
    videoInfoRequests.set(bvid, request);
    return request;
}

async function fetchVideoInfo(bvid) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIDEO_INFO_TIMEOUT_MS);
    try {
        const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}&jsonp=jsonp`, {
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error('Bilibili video Timer - Network response was not ok');
        }
        // 超时也覆盖响应正文读取，防止收到响应头后仍一直等待数据。
        const { data } = await response.json();
        let vtype = 1; // 1: 单个视频; 2: 分集视频; 3: 合集视频
        if (data.pages.length > 1) {
            vtype = 2;
        } else if (data.ugc_season) {
            vtype = 3;
        }
        return { vtype, data };
    } catch (error) {
        if (controller.signal.aborted) {
            const timeoutError = new Error('视频信息请求超时（10秒），请重试');
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
