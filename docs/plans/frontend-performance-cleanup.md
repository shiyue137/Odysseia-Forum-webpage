# 前端性能与操作清理

Status: complete

目标：按用户批准的一轮修复，处理浏览恢复、书单键盘操作、布局焦点与设置订阅、列表标题计算、图片体积和相关代码异味。主 Agent 独立实施。

已确认事实：页码属于 URL 协议；RootLayout 清理时读取实时 URL 会错配页面；书单卡片隐藏了内部快捷操作；列表标题单独使用 Pretext；项目已有 CSS line-clamp、WebP 支持和定向 Vitest。

决策：保留分页 URL；保存与当前路由绑定的位置；焦点仅随页面导航转移并清理延迟任务；书单沿用帖子卡片的独立原生按钮模式；标题交由 CSS 排版；PNG 使用无损 WebP 并核对像素。不新增依赖、不改变后端或业务协议。

工作包与文件边界：RootLayout、lastBrowsePosition；书单展示组件及引用；ThreadListItem、孤立的 Pretext hook/依赖；背景和吉祥物 PNG 及引用；本轮相关的 effect、类型与分层告警。测试限浏览恢复、导航焦点、书单操作和受影响既有用例。

非目标：重新设计 UI、虚拟列表、新缓存体系、全仓动画与表单状态重写、后端修改。警告不等于缺陷，不以压制规则或延迟 setState 清零。

完成条件：分页位置保留且导航不污染记录；筛选不抢焦点；快捷操作可键盘访问且不误开书单；列表不再使用 JS 标题测量；转换图片尺寸和解码像素一致且体积下降；无新增类型错误。

验证预算：新增最小行为测试与相关既有测试；跨模块变更运行类型检查；资源和依赖变化运行构建；ESLint 汇总本轮变化；图片逐个比较解码像素与大小。浏览器主观视觉验收由用户完成。

停止条件：新增依赖、后端/持久化协议迁移或未授权架构扩展时上报。

开放问题与限制：无限列表跨会话恢复到尚未重新加载的远端位置仍受现有加载机制限制；不承诺运行时提速比例。

最终结果：已完成本轮明确范围。浏览位置保留页码，记录的 URL 与滚动值绑定同一路由，恢复期间不覆盖目标记录；页面导航焦点任务可取消且不覆盖用户新焦点，同页筛选不抢焦点，移动菜单随导航关闭。书单改为独立原生打开按钮，恢复收藏、作者和管理入口的可访问性，收藏菜单同步禁用状态。列表标题改为 CSS 两行裁切，删除 Pretext hook 与依赖；RootLayout 只订阅所需设置，壁纸移除多余挂载状态。

清理结果：书单组件移入 features/booklists，偏好过滤移入 features/preferences，浏览历史移入 features/history，User 类型移入 entities/user；5 个跨层引用告警清零，FSD 规则升级为 error。搜索建议修复事件清理、回调依赖和结果缩短时的越界选择；排序映射复用已有定义；清理 CinematicCard 回调依赖与无用变量。ESLint 告警从 78 降到 63，上限同步收紧为 63；既有动画、表单与测试类型告警未机械处理。

图片结果：25 张背景/吉祥物 PNG 转为无损 WebP，保持原尺寸与解码 RGBA 像素一致，引用同步更新。合计从 23,137,944 字节降到 14,493,506 字节，减少 8,644,438 字节（约 37.4%）。普通构建的 ThreadListItem chunk 为 8.49 kB / gzip 2.77 kB；此前分析构建为 52.30 kB / gzip 18.11 kB，此处仅比较产物，不推断运行时提速。

验证：6 个定向 Vitest 文件 21 项通过（lastBrowsePosition、RootLayout、BooklistCard、SearchSuggestions、ThreadCard.accessibility、useSearchResults.rateLimit）；另 2 个文件 10 项通过（SearchPage、preferencesMapper），合计 31 项。Vitest 使用 NODE_OPTIONS=--no-experimental-webstorage。pnpm typecheck 通过；pnpm exec vite build 通过；ESLint 全仓入口按 63 告警上限检查通过，0 error、63 warning。图片逐个核对尺寸、RGBA 像素与体积通过。

实际偏差与失败账目：首次类型检查发现本次排序映射索引类型错误，改为复用现有映射后通过。pnpm remove 不支持所用参数，未写入；随后通过 package.json 补丁与离线 lockfile install 删除孤立依赖，锁文件仅删除该包。全仓 ESLint 先被既有 playground 和 coverage 产物阻塞，按已存在的 Git 忽略范围补齐排除后通过。构建仍提示既有 SWC/esbuild、Node 弃用信息，依赖解析提示既有 openapi-typescript 与 TypeScript 6 peer 范围不匹配，未更换依赖。

未验证与剩余风险：未启动浏览器、连接真实后端或进行人工视觉验收；列表标题省略与键盘操作观感由用户确认。浏览恢复保留现有约 2 秒等待窗口，尚未重新加载的深层无限列表无法保证跨会话精确恢复；相关代码已有 ponytail 标注。剩余 63 个静态告警不等于 63 个已确认缺陷，也未声称仓库已没有任何代码异味。
