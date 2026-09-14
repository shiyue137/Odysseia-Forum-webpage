import { defaultRangeExtractor, useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Thread } from "@/entities/thread/types";
import { ThreadListItem } from "./ThreadListItem";

type ItemProps = ComponentProps<typeof ThreadListItem>;

// 跟随 Query 数据对象回收；返回同一结果集时复用实测高度，避免滚动恢复只依赖估高。
const measurements = new WeakMap<Thread, { width: number; items: VirtualItem[] }>();

interface VirtualThreadListProps {
  threads: Thread[];
  searchQuery?: string;
  onTagClick?: ItemProps["onTagClick"];
  onAuthorClick?: ItemProps["onAuthorClick"];
  onPreview?: ItemProps["onPreview"];
  pageByThreadId: ReadonlyMap<string, number>;
  onViewedPageChange: (page: number) => void;
}

export function VirtualThreadList({
  threads,
  pageByThreadId,
  onViewedPageChange,
  ...itemProps
}: VirtualThreadListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const getScrollElement = useCallback(
    () => document.getElementById("main-scroll-container"),
    [],
  );
  const firstThread = threads[0];
  const cached = firstThread ? measurements.get(firstThread) : undefined;
  useLayoutEffect(() => {
    const container = containerRef.current;
    const root = getScrollElement();
    if (!container || !root) return;
    const update = () => setScrollMargin(
      container.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop,
    );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    if (container.parentElement) observer.observe(container.parentElement);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [getScrollElement]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const focusedIndex = focusedId === null ? -1 : threads.findIndex((thread) => thread.thread_id === focusedId);
  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement,
    estimateSize: () => 200,
    getItemKey: (index) => threads[index].thread_id,
    overscan: 5,
    scrollMargin,
    initialMeasurementsCache: cached && cached.width === getScrollElement()?.clientWidth ? cached.items : [],
    // 保留当前焦点及相邻条目，滚动时不卸载正在键盘操作的链接。
    rangeExtractor: useCallback((range) => {
      const indices = defaultRangeExtractor(range);
      if (focusedIndex >= 0) {
        for (let index = Math.max(0, focusedIndex - 1); index <= Math.min(range.count - 1, focusedIndex + 1); index++) {
          indices.push(index);
        }
      }
      return [...new Set(indices)].sort((a, b) => a - b);
    }, [focusedIndex]),
  });
  useLayoutEffect(() => () => {
    if (firstThread) {
      measurements.set(firstThread, {
        width: getScrollElement()?.clientWidth ?? 0,
        items: virtualizer.takeSnapshot(),
      });
    }
  }, [firstThread, getScrollElement, virtualizer]);
  const items = virtualizer.getVirtualItems();
  const visibleIndex = virtualizer.range?.startIndex;
  const visiblePage = visibleIndex === undefined
    ? undefined
    : pageByThreadId.get(threads[visibleIndex]?.thread_id);
  useEffect(() => {
    if (visiblePage !== undefined) onViewedPageChange(visiblePage);
  }, [onViewedPageChange, visiblePage]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedId(null);
      }}
    >
      {items.map((item) => {
        const thread = threads[item.index];
        return (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            onFocusCapture={() => setFocusedId(thread.thread_id)}
            className="absolute left-0 top-0 w-full pb-od-list-gap [&_article]:[content-visibility:visible]"
            style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
          >
            <ThreadListItem
              {...itemProps}
              thread={thread}
              index={item.index}
              resultPage={pageByThreadId.get(thread.thread_id)}
              renderSecondaryImages={desktop}
              animateIn={false}
            />
          </div>
        );
      })}
    </div>
  );
}
