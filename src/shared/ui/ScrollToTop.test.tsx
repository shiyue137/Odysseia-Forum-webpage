import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScrollToTop } from './ScrollToTop';
import { scrollPageToTop } from '@/shared/lib/pageScroll';

vi.mock('@/shared/lib/pageScroll', () => ({
  getPageScrollTop: () => 400,
  getPageScrollRoot: () => document.body,
  addPageScrollListener: () => () => {},
  scrollPageToTop: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function setup() {
  const onJump = vi.fn();
  const view = render(<div style={{ transform: 'translateX(10px)' }}><ScrollToTop /></div>);
  act(() => window.dispatchEvent(new CustomEvent('odysseia:active-page-info', {
    detail: { currentPage: 1, totalPages: 763, onJump },
  })));
  return { ...view, onJump, button: screen.getByRole('button', { name: /单击回顶/ }) };
}

it('单击回顶；右键使用全屏 Portal 输入跳转，并校验页码范围', () => {
  const { button, onJump, container } = setup();
  fireEvent.click(button);
  expect(scrollPageToTop).toHaveBeenCalledOnce();
  fireEvent.contextMenu(button);
  const dialog = screen.getByRole('dialog');
  expect(dialog.parentElement).toBe(document.body);
  expect(container).not.toContainElement(dialog);
  const input = screen.getByRole('spinbutton');
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: '764' } });
  fireEvent.submit(input.closest('form')!);
  expect(onJump).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '25' } });
  fireEvent.submit(input.closest('form')!);
  expect(onJump).toHaveBeenCalledWith(25);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('长按显示窗口并抑制随后的回顶点击，移动取消长按', () => {
  const { button } = setup();
  fireEvent.touchStart(button, { touches: [{ clientX: 10, clientY: 10 }] });
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.touchEnd(button);
  fireEvent.click(button);
  expect(scrollPageToTop).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  fireEvent.touchStart(button, { touches: [{ clientX: 10, clientY: 10 }] });
  fireEvent.touchMove(button, { touches: [{ clientX: 30, clientY: 10 }] });
  act(() => vi.advanceTimersByTime(600));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('键盘菜单快捷键可打开，Escape 的 cancel 事件关闭窗口', () => {
  const { button } = setup();
  fireEvent.keyDown(button, { key: 'F10', shiftKey: true });
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
