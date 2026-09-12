import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import defaultIcon from '@/assets/images/icon/forum-icon-64.png';
import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { useMascotStore } from '@/features/mascot/store/mascotStore';

import { DynamicFavicon } from './DynamicFavicon';

describe('DynamicFavicon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
    useMascotStore.setState({ emotion: 'hi', isVisible: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
  });

  it('看板娘隐藏后保留表情一段时间再恢复默认图标', () => {
    render(<DynamicFavicon />);

    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(defaultIcon);

    act(() => useMascotStore.setState({ emotion: 'success', isVisible: true }));
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(MASCOT_IMAGES.success);

    act(() => useMascotStore.setState({ isVisible: false }));
    act(() => vi.advanceTimersByTime(29_999));
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(MASCOT_IMAGES.success);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(defaultIcon);
  });

  it('未读、离线和表情恢复统一绘制，过期图片不能覆盖新状态', () => {
    const pending: { src: string; onload: (() => void) | null }[] = [];
    vi.stubGlobal('Image', class {
      src = '';
      onload = null;
      constructor() { pending.push(this); }
    });
    const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels })),
      putImageData: vi.fn(),
      beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 0,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,decorated');
    const network = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { rerender, unmount } = render(<DynamicFavicon hasUnread />);
    const staleLoad = pending[pending.length - 1].onload!;
    rerender(<DynamicFavicon hasUnread={false} />);
    staleLoad();
    expect(context.drawImage).not.toHaveBeenCalled();

    rerender(<DynamicFavicon hasUnread />);
    pending[pending.length - 1].onload!();
    expect(context.fillStyle).toBe('#ef4444');
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toBe('data:image/png;base64,decorated');

    act(() => {
      network.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    pending[pending.length - 1].onload!();
    expect(context.fillStyle).toBe('#9ca3af');
    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[3]).toBe(255);

    act(() => {
      network.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
      useMascotStore.setState({ emotion: 'success', isVisible: true });
    });
    pending[pending.length - 1].onload!();
    expect(context.fillStyle).toBe('#ef4444');
    act(() => useMascotStore.setState({ isVisible: false }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(pending[pending.length - 1].src).toBe(defaultIcon);
    pending[pending.length - 1].onload!();
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toBe('data:image/png;base64,decorated');
    unmount();
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(defaultIcon);
  });
});
