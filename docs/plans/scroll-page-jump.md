# 回顶与页码跳转

Status: complete

目标与已批准行为：单击回顶；右键、移动端长按及键盘 Shift+F10 打开居中的页码输入窗口。窗口使用 document.body Portal 和原生模态 dialog，全屏居中并进入浏览器顶层。

工作边界：ScrollToTop 交互及弹窗；已有 SearchPage、BooklistsPage 页码信息接入跳转回调；UserProfilePage 同步分页；搜索无限滚动从指定页继续加载，保留全局模式偏好。

完成条件与验证：定向验证单击、长按误触抑制、滑动取消、页码校验、Portal 挂载和回调；验证无限滚动目标页 offset、后续加载页码及结束条件；类型检查确认跨模块调用。主 Agent 实施及验收。

非目标与停止条件：不新增依赖，不重构全局导航或持久化设置，不修改后端。发现必须改变服务端契约时停止。

最终结果：单击回顶；右键、500ms 长按和 Shift+F10 打开全屏居中的 Portal dialog。长按后的合成点击被抑制，超过 10px 的移动取消长按；窗口使用浏览器页码输入校验。搜索、书单和作者页提供跳转回调；无限滚动以目标页为起点继续加载，页码、预加载和结束计数同步计入跳过的页数。页码更新不再通过 effect cleanup 暂时清空状态，避免后台加载时关闭输入窗口。

验证：3 个定向测试文件共 22 项通过；pnpm typecheck 通过；4 个相关 TSX 文件的定向 stylelint 通过；git diff --check 通过。Vitest 使用 NODE_OPTIONS=--no-experimental-webstorage 适配本机 Node 26。jsdom 原生 dialog 方法在测试内按现有项目方式 mock；旧普通分页限流测试的 isFetchNextPageError 断言修正为该独立页查询的 isError。

未验证项：未启动浏览器，未做真实后端请求、实际手机长按或视觉验收。无限滚动跳转采用已说明的推荐行为：从目标页继续加载，不更改用户持久化分页偏好。无新增依赖或后端修改。
