# 映间 MARGIN 源码对照

参考仓库是 [jiuyang5354/bilibili-margin](https://github.com/jiuyang5354/bilibili-margin)，本次核对的源码版本是 `582d5b6`。映间的内容脚本把首页挂在独立的 Shadow DOM 中。它可以明确决定顶栏、搜索、足迹与天气、分类栏和推荐网格的顺序。Framefold在 YouTube 提供的页面上重排这些区域，搜索、筛选、通知、播放与登录由原有组件处理。 [首页入口与组件装配](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/app.ts)

| 模块 | 映间的实现 | Framefold中的对应 |
| --- | --- | --- |
| 顶栏和按钮 | 顶栏集中放站点链接、主题、设置、投稿和头像。链接和动作分别使用链接与按钮。悬停移动高亮滑块，按钮宽度保持固定。设置可以改变顺序和显示状态。 [顶栏](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/header.ts) · [按钮组](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/expandable-tabs.ts) | 桌面各页共享右侧快捷入口，点击优先交给 YouTube 对应的原生导航。完整侧栏作为浮层展开，创建、通知、头像由原生按钮控制。 |
| 搜索 | 首页用居中的主搜索框，联想继续展开在搜索框下方。独立组件负责热搜、最近搜索、键盘选项和跳转。 [主搜索](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/hero-search.ts) | 首页搜索留在固定顶栏，保留原生联想、语音搜索和回车操作。 |
| 分类和视频卡片 | 分类栏与视频网格以同一个内容区为基准。推荐、热门和关注老片各有数据源，网格列数随宽度调整，同一行使用等宽列。 [首页样式](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/styles/08-home-search.css) · [首页数据与操作](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/app.ts) | YouTube 的「全部」「音乐」等沿用原生筛选，分类栏和推荐网格共用边距。普通推荐卡片占一列，Shorts 等原生货架独占一行。 |
| 个人信息 | 先显示登录入口；拿到账号数据后换成头像。第一次悬停或键盘聚焦才构建工牌，正面展示个人资料与统计，背面放账号链接。消息与动态角标另有更新逻辑。 [账号数据](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/api/account.ts) · [头像菜单](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/user-menu.ts) | 头像打开 YouTube 自己的账户菜单，登录状态、频道、通知与切换账号由站点提供。 |
| 换一批 | 从推荐接口取新数据，按视频 ID 去重。批次模式从队列切出当前窗口；翻过已加载的批次可以本地完成。新一批失败时保留原来的内容。 [推荐数据](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/api/feed.ts) · [批次交互](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/app.ts) | 推荐来自 YouTube 首页和后续加载。支持 CSS 阅读顺序的浏览器优先让普通卡片填满前面的行，键盘焦点跟随可见顺序。 |
| 足迹与天气 | 足迹把本机活动汇总成热力图，还能用观看历史补全。天气按城市显示实况与预报，首页根据设置挂载两张卡片。 [足迹](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/footprint.ts) · [天气](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/weather.ts) | 观看记录从快捷入口直达原生页面。足迹统计、历史补全和天气涉及各自的数据来源与存储。 |
| 快捷操作 | 命令面板将搜索、导航和换批等动作放进一个可键盘操作的界面。 [命令面板](https://github.com/jiuyang5354/bilibili-margin/blob/main/src/content/ui/command-palette.ts) | 顶部快捷入口与左上角导航菜单承担页面间切换。 |
