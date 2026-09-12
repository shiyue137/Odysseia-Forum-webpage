import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/tests/test-utils';
import type { FollowedThread } from '@/entities/thread/types';
import { MeFollowsSection } from './MeFollowsSection';

const thread = {
  thread_id: '1', channel_id: '2', title: '关注的作品', tags: [],
  thumbnail_urls: [], created_at: '2026-09-12T00:00:00Z', active_flag: true,
} as unknown as FollowedThread;

describe('关注作品布局切换', () => {
  beforeEach(() => localStorage.clear());

  it('两种布局都保留预览与取消关注，切换结果在重新进入后保留', () => {
    const props: ComponentProps<typeof MeFollowsSection> = {
      channelOptions: [], followStatus: 'current', hasAnyResults: true,
      isError: false, isLoading: false, searchQuery: '', sort: 'updated', threads: [thread],
      onClearChannel: vi.fn(), onPreview: vi.fn(), onRefresh: vi.fn(),
      onSearchQueryChange: vi.fn(), onSortChange: vi.fn(), onSetChannel: vi.fn(),
      onSetFollowStatus: vi.fn(), onUnfollow: vi.fn(),
    };
    const view = render(<MeFollowsSection {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '预览帖子：关注的作品' }));
    expect(props.onPreview).toHaveBeenCalledExactlyOnceWith(thread);
    fireEvent.click(screen.getByRole('button', { name: '切换到网格展示' }));
    fireEvent.click(screen.getByRole('button', { name: '预览帖子：关注的作品' }));
    fireEvent.click(screen.getByRole('button', { name: '取消关注' }));
    expect(props.onPreview).toHaveBeenCalledTimes(2);
    expect(props.onUnfollow).toHaveBeenCalledExactlyOnceWith(thread);
    expect(JSON.parse(localStorage.getItem('odysseia_layout_preferences')!)).toMatchObject({ 'me-follows': 'grid' });
    view.unmount();

    const nextView = render(<MeFollowsSection {...props} unfollowPendingThreadId="1" />);
    expect(screen.getByRole('button', { name: '取消中' })).toBeDisabled();
    expect(screen.getByRole('article').closest('.grid')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '切换到列表展示' }));
    expect(screen.getByRole('article').closest('.grid')).toBeNull();
    nextView.unmount();
  });
});
