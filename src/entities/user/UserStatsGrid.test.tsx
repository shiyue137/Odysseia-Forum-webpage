import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserStatsGrid } from './UserStatsGrid';

describe('作者统计数字', () => {
  afterEach(() => vi.restoreAllMocks());

  it('数字变更和位数增减时保留完整读屏文本，滚动字符对读屏隐藏', () => {
    const { rerender } = render(<UserStatsGrid items={[{ label: '帖子数量', value: 99 }]} />);
    const initial = screen.getByText('99');
    expect(initial).toHaveClass('sr-only');
    expect(initial.nextElementSibling).toHaveAttribute('aria-hidden', 'true');

    rerender(<UserStatsGrid items={[{ label: '帖子数量', value: 100 }]} />);
    expect(screen.queryByText('99')).toBeNull();
    expect(screen.getByText('100')).toHaveClass('sr-only');
    rerender(<UserStatsGrid items={[{ label: '帖子数量', value: 8 }]} />);
    expect(screen.getAllByText('8').filter((element) => !element.closest('[aria-hidden="true"]'))).toHaveLength(1);
  });

  it('减少动态效果时直接显示数值，文字占位不参与滚动', () => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...mediaQuery, media: query, matches: query === '(prefers-reduced-motion: reduce)',
    }));
    render(<UserStatsGrid items={[{ label: '帖子数量', value: 123 }, { label: '累计受赞', value: '—' }]} />);
    expect(screen.getByText('123')).not.toHaveClass('sr-only');
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
