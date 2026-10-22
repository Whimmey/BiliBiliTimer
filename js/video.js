// 弹窗与悬浮球共用视频列表解析，避免两处对分集、合集的处理不一致。
function getVideoList({ vtype, data }, page = 1) {
    let durations;
    let current = page;
    let group = '';
    const sections = vtype === 3 ? data.ugc_season.sections : null;
    if (vtype === 2) {
        durations = data.pages.map(item => item.duration);
    } else if (sections) {
        const section = sections.find(item => item.episodes.some(episode => episode.aid === data.aid));
        if (!section) throw new Error('无法识别当前合集分组');
        durations = section.episodes.map(episode => episode.page.duration);
        current = section.episodes.findIndex(episode => episode.aid === data.aid) + 1;
        group = section.title || '';
    } else {
        durations = [data.duration];
        current = 1;
    }
    if (!durations.length || durations.some(seconds => !Number.isFinite(seconds) || seconds < 0)
        || !Number.isSafeInteger(current) || current < 1 || current > durations.length) {
        throw new Error('视频时长或集数无效，请刷新视频页后重试');
    }
    return { durations, current, group, sections };
}

function getVideoProgress({ durations, current, playback }, scope, includeCurrentTime = true) {
    const episodeOnly = scope === 'episode' || durations.length === 1;
    const total = episodeOnly && playback.ready ? playback.duration
        : episodeOnly ? durations[current - 1] : durations.reduce((sum, seconds) => sum + seconds, 0);
    const elapsed = includeCurrentTime && playback.ready
        ? Math.max(0, Math.min(episodeOnly ? total : durations[current - 1], playback.currentTime)) : 0;
    const done = (episodeOnly ? 0 : durations.slice(0, current - 1).reduce((sum, seconds) => sum + seconds, 0)) + elapsed;
    return total > 0 ? Math.min(100, done / total * 100) : null;
}
