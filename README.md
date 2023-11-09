## Bilibili Video Timer
本拓展用于在Bilibili视频播放页面计算分集视频区间内总时长. 

🍟 **欢迎大家在拓展选项页的`反馈`中提出建议和bug(v2.0.2+可用)**

❗ 注意：仅可用于**Bilibili视频播放页面-分集视频**(`https://www.bilibili.com/video/*`)

🎈 More：*若要尝试用于**合集视频**，有兴趣可以try one try**基于B站API的 `AjaxDemo.html`**。为了保持插件的轻量化暂未将其引入插件，毕竟绝大多数学习视频属于分集视频。有需求呼声可以new一个issue*

- [Bilibili Video Timer](#bilibili-video-timer)
  - [安装](#安装)
  - [使用](#使用)
    - [关于右键计算到此时长菜单](#关于右键计算到此时长菜单)
- [更新日志](#更新日志)
  - [✨v2.1.0 | 2023/11/9](#v210--2023119)
  - [v2.0.2 | 2023/8/9](#v202--202389)
  - [v2.0.1 | 2023/8/4](#v201--202384)
  - [✨v2.0.0 | 2023/6/29](#v200--2023629)
  - [v1.1.0 | 2023/6/14](#v110--2023614)
  - [v1.0.0 | 2023/4/13](#v100--2023413)
- [目录结构](#目录结构)

---

### 安装
<font color=orange>**本项目已经上架微软商店**</font>. 点击右侧`About`中的<a href="https://microsoftedge.microsoft.com/addons/detail/bilibili-video-timer/kjginbekfcfdnfjhnophpcdjoojnfabn" target="_blank">microsoftedge链接</a>可直接跳转到免费安装.

下载本代码，进入`扩展管理界面`，选择`加载解压缩的扩展`，`打开Bili-extension文件夹`，即可安装.

也可以去`release`中下载最新版本的`crx`文件，进入`扩展管理界面`，将`crx`文件拖入即可安装.

### 使用
在Bilibili视频播放页面，`点击扩展图标`，在弹出的页面中`输入想要查看的视频区间`，点击`计算`即可得到总时长. 

第一个输入框的值默认为`当前视频序号`，第二个输入框的值默认为`当前视频序号+1`. *当`URL`中不存在`p=n`字段(也就是首次进入分集视频的`p1`界面)时，插件是不会自动填入当前视频序号的*

- `range`控件用于拖拽选择. 两个输入框的值**不分先后**.
- `progress`控件展示看过的视频总时长占全长的百分比.
- ❗ 右键菜单功能，在视频选集区域 **鼠标右键**-**计算到此时长**，随后点击扩展图标即**自动填入**目标视频序号. <font color=teal>**默认开启**此功能，**默认获取到目标视频序号后会有通知**，均可在`扩展管理界面`中关闭.</font>
- ❗ 视频选集标记功能，在视频选集区域 **鼠标右键**-**标记一下**，即可在**对应选集前方添加marker标记**. marker默认样式为：✨，若想修改marker可以**点击刚刚添加好的marker**，即可修改其内容. **marker默认样式可以在`扩展选项`中修改**. （如何进入`扩展选项`：右键本拓展工具图标，点击`扩展选项`即可）`扩展选项`中也**存放了所有标记过的marker**，进入页面后点击`查看所有Marker`即可对所有Marker进行**修改**或**清除操作**.

右键菜单新功能演示：<br>
<img src='https://github.com/Whimmey/BiliBiliTimer/blob/main/img/show.gif' style="width:60%;margin:10px 0"> 

#### 关于右键计算到此时长菜单
- 为什么不能实现整个自动化？<br>
右键功能是在`background.js`中实现，<span style="color:lightblue">**`popup`的生命周期是在用户点击图标后方才启动。**</span>可能是处于安全考虑，浏览器没有提供可以唤醒`popup`的接口(这是我查阅文档得出的结论)。因此依然需要用户手动点击扩展图标，使得`popup`弹出，才能自动填入目标视频序号. 随后右键的视频序号销毁.
- 如何关闭此功能？<br>
插件默认开启此功能，本插件的右键菜单选项也不会在除了Bilibili视频播放页面的其他页面出现. 若想关闭此功能，可在插件图标右键进入`扩展选项`关闭. <span style="color:lightblue">**关闭后插件会自动重启刷新，请在网页中也进行刷新操作.**</span>

## 更新日志
### ✨v2.1.0 | 2023/11/9
✅ 新增（重要）：右键菜单选项，点击视频选集区域**右键**-**标记一下**，即可在**对应选集前方添加marker标记**. 欢迎想要留下学习记号的同学尝试！φ(゜▽゜*)♪<br> 
📌 marker默认样式为：✨，若想修改marker可以**点击刚刚添加好的marker**，即可修改其内容. <br>
📌 **marker默认样式可以在`扩展选项`中修改**. （如何进入`扩展选项`：右键本拓展工具图标，点击`扩展选项`即可）<br>
📌 `扩展选项`中也**存放了所有标记过的marker**，进入页面后点击`查看所有Marker`即可对所有Marker进行**修改**或**清除操作**. <br>

### v2.0.2 | 2023/8/9
✅ 新增：使用反馈，可在扩展选项页点击右侧`反馈`. 另外增加了个小细节，在BiliBili以外的网页 拓展图标会变灰不可用.

### v2.0.1 | 2023/8/4
✅ 新增：集数进度显示. 微调了下`popup`的样式.

### ✨v2.0.0 | 2023/6/29
✅ 新增：右键菜单选项，点击视频选集区域**右键**-**计算到此时长**，随后点击扩展图标即可自动填入目标视频序号.

### v1.1.0 | 2023/6/14
✅ 新增：ProgressBar进度条，用于展示当前视频播放进度.展示当前分集占全长的百分比

### v1.0.0 | 2023/4/13 
✅ 基于JavaScript+BootStrap实现. 由于体量较小，没有引入jQuery编写 <br>
✅ 支持手动输入视频区间，以及使用`range`控件拖拽选择

## 目录结构

```markdown
│  manifest.json // 配置详细描述文件，包括权限等
│  options.html // 扩展选项设置
│  options.js // 相应的js代码
│  popup.html // 扩展窗口
│  popup.js // 相应的js代码，绑定了扩展窗口各个组件的事件，以及和content.js通信的代码
│  AjaxDemo.html // 基于Ajax的Demo，可以实现各种类型的视频时长计算
│  updates.xml
├─build
│      Bili-extension.crx
├─css
│      bootstrap.min.css // bootstrap
├─dist
│      options.dev.js
│      popup.dev.js
├─icons
│      bili.png
│      favicon.ico
│      timeline.png // 扩展的图标
├─img
│      index.png
└─js
   │  background.js // background.js在扩展加载时会被加载，用于实现右键菜单功能
   │  bootstrap.min.js // bootstrap
   │  calTime.js // 计算时长信息
   └─content.js // content.js在网页打开加载阶段会被注入到页面中，因为需要获得视频分集的信息，另外还需要承担和扩展popup.js通信的功能，使得calTime.js的计算结果能被扩展接收到
```