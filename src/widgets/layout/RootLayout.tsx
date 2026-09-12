import { MascotBar } from "@/features/mascot/components/MascotBar";
import { showMascotToast } from "@/features/mascot/lib/mascotToast";
import { EasterEggLayer } from "@/features/mascot/components/EasterEggLayer";
import { GlobalEasterEggLayer } from "@/features/easter-eggs/components/GlobalEasterEggLayer";
import { useSidebarCollapsedSetting } from "@/shared/hooks/useSettings";
import { useSettingsStore } from "@/shared/store/settingsStore";
import {
  getLastBrowsePosition,
  saveLastBrowsePosition,
  shouldTrackBrowsePosition,
} from "@/shared/lib/lastBrowsePosition";
import { ScrollToTop } from "@/shared/ui/ScrollToTop";
import { AppSidebar } from "@/widgets/layout/AppSidebar";
import { MobileTabBar } from "@/widgets/layout/MobileTabBar";
import { TopBar } from "@/widgets/layout/TopBar";
import { ResizableSidebar } from "@/widgets/sidebar/ResizableSidebar";
import { GlobalThreadPreview } from "@/widgets/thread-preview/GlobalThreadPreview";
import { OnboardingManager } from "@/features/onboarding/components/OnboardingManager";
import { ImageViewer } from "@/shared/ui/ImageViewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

/**
 * AppShell — 全站布局骨架
 *
 * 采用 h-screen + overflow-hidden 的"应用壳"模式：
 *   ┌──────────────────────────────────────────┐
 *   │  Sidebar  │  TopBar                       │
 *   │           │  ┌───────────────────────────┐│
 *   │           │  │ MainScrollArea (Outlet)   ││
 *   │  (PC端)   │  │                           ││
 *   │           │  │                           ││
 *   │           │  └───────────────────────────┘│
 *   └──────────────────────────────────────────┘
 *   [  移动端底部 Tab 栏  ] (md:hidden)
 *
 */

export function RootLayout() {
  const [mobileOpenUrl, setMobileOpenUrl] = useState<string | null>(null);
  const sidebarCollapsed = useSidebarCollapsedSetting();
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const location = useLocation();
  const navigate = useNavigate();
  const hasShownResumePromptRef = useRef(false);
  const initialPathnameRef = useRef(location.pathname);
  const restoreTimerRef = useRef<number | null>(null);
  const restoreTargetUrlRef = useRef<string | null>(null);
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const isMobileOpen = mobileOpenUrl === currentUrl;
  if (mobileOpenUrl !== null && mobileOpenUrl !== currentUrl) {
    setMobileOpenUrl(null);
  }
  const setIsMobileOpen = useCallback((open: boolean) => {
    setMobileOpenUrl(open ? currentUrl : null);
  }, [currentUrl]);

  const cancelScrollRestore = useCallback(() => {
    if (restoreTimerRef.current !== null) window.clearTimeout(restoreTimerRef.current);
    restoreTimerRef.current = null;
    restoreTargetUrlRef.current = null;
  }, []);

  const restoreScrollPosition = useCallback((scrollTop: number, targetUrl: string) => {
    cancelScrollRestore();
    restoreTargetUrlRef.current = targetUrl;
    let attempts = 0;
    const restore = () => {
      const liveUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (liveUrl !== targetUrl) {
        cancelScrollRestore();
        return;
      }
      const container = document.getElementById("main-scroll-container");
      if (!container) return;

      container.scrollTop = scrollTop;
      attempts += 1;
      // ponytail: 最多等待 2 秒；跨会话深层无限列表需后续接入页内锚点恢复。
      if (container.scrollTop + 2 < scrollTop && attempts < 20) {
        restoreTimerRef.current = window.setTimeout(restore, 100);
      } else {
        restoreTimerRef.current = null;
        restoreTargetUrlRef.current = null;
      }
    };
    restoreTimerRef.current = window.setTimeout(restore, 100);
  }, [cancelScrollRestore]);

  useEffect(() => {
    const targetUrl = restoreTargetUrlRef.current;
    if (targetUrl && currentUrl !== targetUrl) cancelScrollRestore();
  }, [cancelScrollRestore, currentUrl]);

  useEffect(() => cancelScrollRestore, [cancelScrollRestore]);

  useEffect(() => {
    if (hasShownResumePromptRef.current) return;
    hasShownResumePromptRef.current = true;
    if (initialPathnameRef.current !== "/") return;

    const position = getLastBrowsePosition();
    if (!position) return;

    showMascotToast({
      id: "resume-last-browse-position",
      emotion: "hi",
      eyebrow: "Continue Exploring",
      title: "要接着上次的位置看吗？",
      message: "我还记得你上次浏览到哪里，点一下就带你回去。",
      actionLabel: "继续浏览",
      cancelLabel: "暂时不用",
      duration: 10000,
      onAction: () => {
        navigate(position.url);
        restoreScrollPosition(position.scrollTop, position.url);
      },
    });
  }, [navigate, restoreScrollPosition]);

  useEffect(() => {
    if (!shouldTrackBrowsePosition(location.pathname)) return;

    const container = document.getElementById("main-scroll-container");
    if (!container) return;
    let saveTimer: number | null = null;
    let scrollTop = container.scrollTop;

    const save = () => {
      if (restoreTargetUrlRef.current === currentUrl) return;
      saveLastBrowsePosition(currentUrl, scrollTop);
    };
    const handleScroll = () => {
      scrollTop = container.scrollTop;
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        save();
      }, 250);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [currentUrl, location.pathname]);

  useEffect(() => {
    // 只在切换页面时转移焦点；同页筛选和页码变化保留当前操作位置。
    const mainContainer = document.getElementById("main-scroll-container");
    const activeElement = document.activeElement;
    const timer = window.setTimeout(() => {
      if (document.activeElement === activeElement || document.activeElement === document.body) {
        mainContainer?.focus({ preventScroll: true });
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="od-app-shell relative flex h-screen w-full overflow-hidden text-(--od-text-primary)">
      <div className="pointer-events-none absolute inset-0 z-0 od-shell-surface" />

      <div className="od-operation-base pointer-events-none absolute inset-0 z-5" />

      {/* ── Sidebar (桌面端固定 / 移动端抽屉) ── */}
      <ResizableSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={sidebarCollapsed}
      >
        <AppSidebar />
      </ResizableSidebar>

      {/* TopBar 与 Sidebar 处于同一操作层 */}
      <div inert={isMobileOpen} aria-hidden={isMobileOpen || undefined}>
        <TopBar
          onMenuClick={() => setIsMobileOpen(true)}
          onSidebarToggle={() =>
            updateSettings({ sidebarCollapsed: !sidebarCollapsed })
          }
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* ── 主内容列 ── */}
      <div
        inert={isMobileOpen}
        aria-hidden={isMobileOpen || undefined}
        className={`relative z-10 flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ${
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-[170px]"
        }`}
      >
        {/* 主滚动区 — 圆角面板 + 独立背景色，形成视觉层级 */}
        <div
          className={`od-content-surface relative z-10 mt-13 min-h-0 flex-1 overflow-hidden sm:mt-17 ${
            sidebarCollapsed ? "" : "lg:rounded-tl-[2.5rem]"
          }`}
        >
          {/* 顶部高光渐变装饰 */}
          <div
            className={`pointer-events-none absolute left-0 right-0 top-0 z-0 hidden h-24 bg-linear-to-b from-white/2 to-transparent lg:block ${
              sidebarCollapsed ? "" : "rounded-tl-[2.5rem]"
            }`}
          />
          <main
            id="main-scroll-container"
            tabIndex={-1}
            className="relative z-10 h-full overflow-y-auto scroll-smooth pb-20 md:pb-0 focus:outline-hidden flex flex-col [--od-scrollbar-track:var(--od-bg-tertiary)]"
          >
            <Outlet />
            {/* 防止网速跟不上按 Tab 导致焦点滑出主区域 */}
            <div
              tabIndex={0}
              aria-live="polite"
              aria-atomic="true"
              className="mt-auto sr-only focus:not-sr-only focus:p-6 focus:text-center focus:text-sm focus:font-medium focus:text-(--od-text-secondary) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--od-accent)"
              onFocus={(e) => {
                const sentinel = e.currentTarget;
                const mainContainer = sentinel.parentElement;
                if (!mainContainer) return;

                sentinel.textContent = "已到达列表底部，正在加载更多内容...";

                const initialArticleCount =
                  mainContainer.querySelectorAll("article").length;

                const observer = new MutationObserver(() => {
                  const newArticles = mainContainer.querySelectorAll("article");
                  if (newArticles.length > initialArticleCount) {
                    observer.disconnect();

                    // 监听到新数据，通过 aria-live 播报加载完成
                    sentinel.textContent = "加载完成";

                    // 留出 1 秒钟让读屏器播报，随后转移焦点
                    setTimeout(() => {
                      // 如果在这 1 秒内用户主动切走了焦点，就不再强行把焦点拽回来
                      if (document.activeElement === sentinel) {
                        const nextCard = newArticles[
                          initialArticleCount
                        ] as HTMLElement;
                        if (nextCard) {
                          nextCard.focus();
                        }
                      }
                      // 焦点转移后重置缓冲垫文字，以备下次触发
                      sentinel.textContent =
                        "已到达列表底部，正在加载更多内容...";
                    }, 1000);
                  }
                });

                observer.observe(mainContainer, {
                  childList: true,
                  subtree: true,
                });

                // 如果用户没等到加载完就切走了焦点，中止监听
                sentinel.addEventListener(
                  "blur",
                  () => {
                    observer.disconnect();
                    sentinel.textContent =
                      "已到达列表底部，正在加载更多内容...";
                  },
                  { once: true },
                );
              }}
            >
              已到达列表底部，正在加载更多内容...
            </div>
          </main>
        </div>
      </div>

      {/* ── 移动端底部 Tab 栏 ── */}
      <div inert={isMobileOpen} aria-hidden={isMobileOpen || undefined}>
        <MobileTabBar />
      </div>

      {/* ── 全局辅助层 ── */}
      <GlobalThreadPreview />
      <EasterEggLayer />
      <GlobalEasterEggLayer />
      <MascotBar />
      <ScrollToTop />
      <OnboardingManager />
      <ImageViewer />
    </div>
  );
}
