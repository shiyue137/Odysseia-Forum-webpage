import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './RootLayout';
import { getLastBrowsePosition } from '@/shared/lib/lastBrowsePosition';

vi.mock('@/features/mascot/components/MascotBar', () => ({ MascotBar: () => null }));
vi.mock('@/features/mascot/lib/mascotToast', () => ({ showMascotToast: vi.fn() }));
vi.mock('@/features/mascot/components/EasterEggLayer', () => ({ EasterEggLayer: () => null }));
vi.mock('@/features/easter-eggs/components/GlobalEasterEggLayer', () => ({ GlobalEasterEggLayer: () => null }));
vi.mock('@/features/onboarding/components/OnboardingManager', () => ({ OnboardingManager: () => null }));
vi.mock('@/widgets/thread-preview/GlobalThreadPreview', () => ({ GlobalThreadPreview: () => null }));
vi.mock('@/shared/ui/ImageViewer', () => ({ ImageViewer: () => null }));
vi.mock('@/shared/ui/ScrollToTop', () => ({ ScrollToTop: () => null }));
vi.mock('./MobileTabBar', () => ({ MobileTabBar: () => null }));
vi.mock('./AppSidebar', () => ({ AppSidebar: () => null }));
vi.mock('./TopBar', () => ({
  TopBar: ({ onMenuClick }: { onMenuClick: () => void }) => <>
    <input aria-label="搜索输入" />
    <button onClick={onMenuClick}>打开菜单</button>
  </>,
}));

function setup() {
  const router = createMemoryRouter([{
    element: <RootLayout />,
    children: [{ path: '*', element: <input aria-label="页面输入" /> }],
  }], { initialEntries: ['/search?page=3'] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

describe('应用壳导航', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('保存旧路由与对应滚动位置，导航不会把旧位置写入新 URL', async () => {
    const { router, unmount } = setup();
    const main = screen.getByRole('main');
    main.scrollTop = 480;
    fireEvent.scroll(main);
    await act(async () => { await router.navigate('/u/123?page=2'); });
    expect(getLastBrowsePosition()).toMatchObject({ url: '/search?page=3', scrollTop: 480 });
    main.scrollTop = 120;
    fireEvent.scroll(main);
    act(() => vi.advanceTimersByTime(250));
    expect(getLastBrowsePosition()).toMatchObject({ url: '/u/123?page=2', scrollTop: 120 });
    unmount();
  });

  it('同页筛选不抢焦点，切换页面才聚焦主内容', async () => {
    const { router, unmount } = setup();
    act(() => vi.advanceTimersByTime(50));
    const search = screen.getByRole('textbox', { name: '搜索输入' });
    search.focus();
    await act(async () => { await router.navigate('/search?q=新关键词&page=1'); });
    act(() => vi.advanceTimersByTime(100));
    expect(search).toHaveFocus();
    await act(async () => { await router.navigate('/u/123'); });
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('main')).toHaveFocus();
    unmount();
  });

  it('用户主动选择的新焦点不被延迟导航任务覆盖，卸载取消任务', async () => {
    const { router, unmount } = setup();
    act(() => vi.advanceTimersByTime(50));
    await act(async () => { await router.navigate('/u/123'); });
    const input = screen.getByRole('textbox', { name: '页面输入' });
    input.focus();
    act(() => vi.advanceTimersByTime(50));
    expect(input).toHaveFocus();
    await act(async () => { await router.navigate('/booklists'); });
    const mainFocus = vi.spyOn(screen.getByRole('main'), 'focus');
    unmount();
    act(() => vi.advanceTimersByTime(50));
    expect(mainFocus).not.toHaveBeenCalled();
  });

  it('导航关闭移动菜单，返回旧 URL 不会自动重新打开', async () => {
    const { router, unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: '打开菜单' }));
    expect(screen.getByRole('dialog', { name: '主菜单' })).toBeInTheDocument();
    await act(async () => { await router.navigate('/search?page=4'); });
    expect(screen.queryByRole('dialog', { name: '主菜单' })).toBeNull();
    await act(async () => { await router.navigate(-1); });
    expect(screen.queryByRole('dialog', { name: '主菜单' })).toBeNull();
    unmount();
  });
});
