# 隐私说明 / Privacy

Framefold for YouTube 是一个纯前端皮肤，不运营任何服务器。

- **保存什么**：扩展只用 `storage` 权限把外观设置（启用状态、主题、玻璃开关、背景款式与强度）
  存进浏览器的同步存储。没有账号、没有标识符、没有观看记录。
- **发送什么**：扩展自身不发起任何网络请求，不上传设置，也不加载远程代码。
  `youtube.com` 页面自己的请求（视频、推荐、登录）不受扩展影响。
- **读取什么**：扩展只读取当前页面已经渲染出来的 DOM 来做样式替换；不读取 Cookie，
  不读取 YouTube 账号数据，不拦截或改写请求。
- **背景**：5 款动态背景全部由本机 WebGL 着色器生成，不请求图片或第三方服务。
- **删除**：在扩展管理页移除扩展，或在浏览器中清除该扩展的数据，设置即被删除。
- **第三方**：项目不含统计、广告或崩溃上报 SDK。

This extension has no backend. It stores appearance settings in `storage`, makes no
network requests of its own, does not read cookies or YouTube account data, does not
modify requests, and renders its shader backgrounds locally. Removing the extension
deletes the settings.

设计语言来自 [映间 MARGIN](https://github.com/jiuyang5354/bilibili-margin)（MIT）。
YouTube 是 Google LLC 的商标，本项目与 Google 无关。
