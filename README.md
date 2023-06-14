## Bilibili Video Timer
本拓展用于在Bilibili视频播放页面计算分集视频区间内总时长.

注意：仅可用于**Bilibili视频播放页面-分集视频**(`https://www.bilibili.com/video/*`)

*若要尝试用于**合集视频**，有兴趣可以try one try基于B站API的 **testAjax.html**中的js代码。为了保持插件的轻量化暂未将其引入插件，毕竟绝大多数学习视频属于分集视频。有需求呼声可以new一个issue*

---
### 安装
<font color=orange>**本项目已经上架微软商店**</font>. 点击右侧`About`中的<a href="https://microsoftedge.microsoft.com/addons/detail/bilibili-video-timer/kjginbekfcfdnfjhnophpcdjoojnfabn" target="_blank">microsoftedge链接</a>可直接跳转到免费安装.

下载本代码，进入`扩展管理界面`，选择`加载解压缩的扩展`，`打开Bili-extension文件夹`，即可安装.

也可以去`release`中下载最新版本的`crx`文件，进入`扩展管理界面`，将`crx`文件拖入即可安装.

### 使用
在Bilibili视频播放页面，`点击扩展图标`，在弹出的页面中`输入想要查看的视频区间`，点击`计算`即可得到总时长. 

第一个输入框的值默认为`当前视频序号`，第二个输入框的值默认为`当前视频序号+1`. *当`URL`中不存在`p=n`字段(也就是首次进入分集视频的`p1`界面)时，插件是不会自动填入当前视频序号的*

加入`range`控件用于拖拽选择. 两个输入框的值**不分先后**.

`progress`控件展示的是看过的视频总时长占全长的百分比.

<img src='./img/index.png' style="width:60%"> 

---

### v1.1.0 | 2023/6/14
✅ 新增：ProgressBar进度条，用于展示当前视频播放进度.展示当前分集占全长的百分比

### v1.0.0 | 2023/4/13 
✅ 基于JavaScript+BootStrap实现. 由于体量较小，没有引入jQuery编写 <br>
✅ 支持手动输入视频区间，以及使用`range`控件拖拽选择

```
- manifest.json // 配置详细描述文件，包括权限等
- popup.html // 扩展窗口
- popup.js // 相应的js代码，绑定了扩展窗口各个组件的事件，以及和content.js通信的代码
- options.html // 扩展选项设置
- options.js // 相应的js代码
--- css
    - bootstrap.min.css // bootstrap
--- js
    - bootstrap.min.js // bootstrap
    - calTime.js // 计算时长信息的代码
    - content.js // content.js在网页打开加载阶段会被注入到页面中，因为需要获得视频分集的信息，另外还需要承担和扩展popup.js通信的功能，使得calTime.js的计算结果能被扩展接收到
--- icons
    - timeline.png // 扩展的图标
```