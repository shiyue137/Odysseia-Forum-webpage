import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { AnimatedIcon } from '@/shared/ui/animation/AnimatedIcon';
import { addPageScrollListener, getPageScrollRoot, getPageScrollTop, scrollPageToTop } from '@/shared/lib/pageScroll';

export interface ActivePageInfo {
  currentPage: number;
  totalPages: number;
  onJump: (page: number) => boolean | void;
}

function PageJumpDialog({ pageInfo, onClose }: { pageInfo: ActivePageInfo; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    inputRef.current!.focus();
    inputRef.current!.select();
    return () => dialog.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="page-jump-title"
      className="fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-(--od-text-primary) backdrop:bg-transparent"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form
        className="od-floating-panel-solid w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          const page = inputRef.current!.valueAsNumber;
          if (!inputRef.current!.reportValidity()) return;
          if (pageInfo.onJump(page) !== false) onClose();
        }}
      >
        <h2 id="page-jump-title" className="text-lg font-semibold">跳转到指定页</h2>
        <label htmlFor="page-jump-input" className="mt-4 block text-sm text-(--od-text-secondary)">
          页码（1–{pageInfo.totalPages}）
        </label>
        <input
          ref={inputRef}
          id="page-jump-input"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={pageInfo.totalPages}
          step={1}
          defaultValue={pageInfo.currentPage}
          className="od-ghost-input mt-2 w-full text-base"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="od-inline-action od-inline-action-ghost">取消</button>
          <button type="submit" className="od-inline-action od-inline-action-soft">跳转</button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pageInfo, setPageInfo] = useState<ActivePageInfo | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(() => clearLongPress, []);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const handlePageInfo = (e: Event) => {
      const customEvent = e as CustomEvent<ActivePageInfo | null>;
      setPageInfo(customEvent.detail || null);
      if (!customEvent.detail) {
        clearLongPress();
        setJumpOpen(false);
      }
    };

    window.addEventListener('odysseia:active-page-info', handlePageInfo);
    return () => {
      window.removeEventListener('odysseia:active-page-info', handlePageInfo);
    };
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      // 滚动超过 300px 时显示按钮
      if (getPageScrollTop() > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    toggleVisibility();
    return addPageScrollListener(toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const container = getPageScrollRoot();
    if (!container) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    scrollPageToTop('smooth');

    // 寻找主内容区内的第一个可交互元素，转移焦点
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    setTimeout(() => {
      const firstFocusable = container.querySelector(focusableSelectors) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      } else if (container instanceof HTMLElement) {
        // 如果主内容区是空的，把焦点交给 main 容器本身
        container.focus();
      }
    }, 300);
  };

  if (!portalRoot) return null;

  const showPageBadge = Boolean(pageInfo && pageInfo.totalPages > 1);

  return createPortal(
    <>
    <button
      type="button"
      style={{ WebkitTouchCallout: 'none' }}
      tabIndex={isVisible ? 0 : -1}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button === 0) suppressClickRef.current = false;
      }}
      onClick={(event) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          event.preventDefault();
          return;
        }
        scrollToTop();
      }}
      onContextMenu={(event) => {
        if (!showPageBadge) return;
        event.preventDefault();
        clearLongPress();
        if (touchStartRef.current) suppressClickRef.current = true;
        setJumpOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') suppressClickRef.current = false;
        if (showPageBadge && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
          event.preventDefault();
          setJumpOpen(true);
        }
      }}
      onTouchStart={(event) => {
        clearLongPress();
        suppressClickRef.current = false;
        touchStartRef.current = null;
        if (!showPageBadge || event.touches.length !== 1) return;
        const touch = event.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTimerRef.current = setTimeout(() => {
          suppressClickRef.current = true;
          setJumpOpen(true);
        }, 500);
      }}
      onTouchMove={(event) => {
        const start = touchStartRef.current;
        if (!start || event.touches.length !== 1) { clearLongPress(); return; }
        const touch = event.touches[0];
        if (Math.abs(touch.clientX - start.x) > 10 || Math.abs(touch.clientY - start.y) > 10) clearLongPress();
      }}
      onTouchEnd={() => { clearLongPress(); touchStartRef.current = null; }}
      onTouchCancel={() => { clearLongPress(); touchStartRef.current = null; }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-20 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-(--od-accent) p-2 text-white shadow-lg shadow-(--od-accent)/30 transition-all duration-300 hover:scale-110 hover:bg-(--od-accent-hover) hover:shadow-xl active:scale-95 lg:bottom-8 ${
        isVisible
          ? 'pointer-events-auto opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 translate-y-4'
      }`}
      aria-label={showPageBadge ? `第 ${pageInfo?.currentPage} 页，共 ${pageInfo?.totalPages} 页 · 单击回顶，右键或长按跳转` : '回到顶部'}
      title={showPageBadge ? '单击回顶，右键或长按跳转（键盘 Shift+F10）' : '回到顶部'}
    >
      {showPageBadge && pageInfo && !isHovered && !isAnimating ? (
        <div className="flex items-baseline justify-center tracking-tight select-none leading-none">
          <span className="text-xs font-black text-white">{pageInfo.currentPage}</span>
          <span className="mx-0.5 text-[10px] font-light text-white/55">/</span>
          <span className="text-[10px] font-bold text-white/75">{pageInfo.totalPages}</span>
        </div>
      ) : (
        <AnimatedIcon
          icon={ArrowUp}
          className="h-5 w-5"
          animation={isAnimating ? 'flyUp' : 'bounce'}
          trigger={isAnimating ? 'none' : 'hover'}
          isActive={isAnimating}
        />
      )}
    </button>
    {jumpOpen && pageInfo && <PageJumpDialog pageInfo={pageInfo} onClose={() => setJumpOpen(false)} />}
    </>,
    portalRoot,
  );
}
