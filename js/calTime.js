// 获取视频信息 - API
async function getVideoInfo(bvid) {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}&jsonp=jsonp`)
    if (!response.ok) {
        throw new Error('Bilibili video Timer - Network response was not ok')
    }
    const { data } = await response.json();
    let vtype = 1; // 1: 单个视频; 2: 分集视频; 3: 合集视频
    if (data.pages.length > 1) {
        vtype = 2;
    } else if (data.ugc_season) {
        vtype = 3;
    }
    return { vtype, data };
}

// 获取视频时长
async function getDuration(bvid, start, end, section_idx = 0) {
    start = start - 1;
    end = end - 1;
    let duration = 0;

    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}&jsonp=jsonp`)
    if (!response.ok) {
        throw new Error('Bilibili video Timer - Network response was not ok')
    }
    const { data } = await response.json();
    console.log('content index allData', data)

    if (data.pages.length > 1) { // 分集视频 pages长度>1
        let videos = data.pages;
        for (let i = start; i <= end; i++) {
            duration += videos[i].duration;
        }
    } else if (data.ugc_season) { // 合集
        let videos = data.ugc_season.sections[section_idx].episodes;
        for (let i = start; i <= end; i++) {
            duration += videos[i].page.duration;
        }
    } else { // 单个视频
        duration = data.duration;
    }

    return formatSeconds(duration);
}

// 将秒换算成HH:MM:SS
function formatSeconds(value) {
    var second = parseInt(value); // 秒
    var min = 0; // 分
    var hour = 0; // 小时
    if (second >= 60) {
        min = parseInt(second / 60);
        second = parseInt(second % 60);
        if (min >= 60) {
            hour = parseInt(min / 60);
            min = parseInt(min % 60);
        }
    }
    return [hour, min, second];
}

console.log('Bilibili video Timer - calTime.js loaded!!!');
