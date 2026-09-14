import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Thread } from "@/entities/thread/types";
import { VirtualThreadList } from "./VirtualThreadList";

vi.mock("./ThreadListItem", () => ({
  ThreadListItem: ({ thread }: { thread: Thread }) => (
    <a href={`#${thread.thread_id}`}>{thread.title}</a>
  ),
}));

afterEach(() => vi.restoreAllMocks());

it("千条数据只挂载窗口附近条目，滚动更新可见页并保留键盘焦点", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.id === "main-scroll-container" ? 600 : 200;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  const threads = Array.from({ length: 1000 }, (_, index) => ({
    thread_id: String(index),
    title: `作品 ${index}`,
  } as Thread));
  const pages = new Map(threads.map((thread, index) => [thread.thread_id, Math.floor(index / 20) + 1]));
  const report = vi.fn();
  const { container } = render(
    <div id="main-scroll-container">
      <VirtualThreadList threads={threads} pageByThreadId={pages} onViewedPageChange={report} />
    </div>,
  );
  await waitFor(() => expect(screen.getByText("作品 0")).toBeInTheDocument());
  expect(screen.getAllByRole("link").length).toBeLessThan(25);
  const focused = screen.getByText("作品 0");
  act(() => focused.focus());
  const root = container.firstElementChild as HTMLElement;
  act(() => {
    root.scrollTop = 12000;
    fireEvent.scroll(root);
  });
  await waitFor(() => expect(screen.getByText("作品 60")).toBeInTheDocument());
  expect(report).toHaveBeenLastCalledWith(4);
  expect(document.activeElement).toBe(focused);
  expect(screen.getAllByRole("link").length).toBeLessThan(30);
});

it("返回缓存列表时保留实测高度，继续响应页面滚动恢复", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.id === "main-scroll-container" ? 600 : 320;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  const threads = Array.from({ length: 300 }, (_, index) => ({
    thread_id: `restore-${index}`, title: `返回作品 ${index}`,
  } as Thread));
  const pages = new Map(threads.map((thread, index) => [thread.thread_id, Math.floor(index / 20) + 1]));
  const report = vi.fn();
  const root = document.createElement("div");
  root.id = "main-scroll-container";
  document.body.append(root);
  const first = render(<VirtualThreadList threads={threads} pageByThreadId={pages} onViewedPageChange={report} />, { container: root });
  await waitFor(() => expect(screen.getByText("返回作品 0")).toBeInTheDocument());
  const heightBefore = (root.firstElementChild as HTMLElement).style.height;
  first.unmount();
  const second = render(<VirtualThreadList threads={threads} pageByThreadId={pages} onViewedPageChange={report} />, {
    container: root.appendChild(document.createElement("div")),
  });
  await waitFor(() => expect((root.firstElementChild?.firstElementChild as HTMLElement).style.height).toBe(heightBefore));
  act(() => {
    root.scrollTop = 9000;
    fireEvent.scroll(root);
  });
  await waitFor(() => expect(report.mock.lastCall?.[0]).toBeGreaterThan(1));
  expect(screen.getAllByRole("link").length).toBeLessThan(25);
  second.unmount();
  root.remove();
});
