import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/tests/test-utils';
import type { Booklist } from '@/entities/booklist/types';
import { BooklistCard } from './BooklistCard';

const booklist = {
  id: 7,
  owner_id: 'owner-1',
  title: '测试书单',
  description: '书单简介',
  is_public: true,
  item_count: 3,
  collection_count: 2,
  view_count: 5,
  updated_at: '2026-09-12T00:00:00Z',
} as Booklist;

describe('书单卡片独立操作', () => {
  it('打开、收藏和管理均可聚焦，内部键盘事件不触发打开', () => {
    const onOpen = vi.fn();
    const onToggleCollect = vi.fn();
    const onEdit = vi.fn();
    render(<BooklistCard booklist={booklist} canManage onOpen={onOpen}
      onToggleCollect={onToggleCollect} onEdit={onEdit} onDelete={vi.fn()} />);

    const open = screen.getByRole('button', { name: '打开书单：测试书单' });
    const collect = screen.getByRole('button', { name: '收藏书单' });
    const manage = screen.getByRole('button', { name: '管理书单' });
    for (const button of [open, collect, manage]) {
      expect(button.tabIndex).toBe(0);
      expect(button.closest('[aria-hidden="true"]')).toBeNull();
      button.focus();
      expect(button).toHaveFocus();
    }

    fireEvent.keyDown(collect, { key: 'Enter' });
    fireEvent.click(collect);
    expect(onToggleCollect).toHaveBeenCalledExactlyOnceWith(booklist);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.keyDown(manage, { key: ' ' });
    fireEvent.click(manage);
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑书单' }));
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(booklist);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('收藏请求进行时，快捷按钮和菜单入口都禁止重复提交', () => {
    const onToggleCollect = vi.fn();
    render(<BooklistCard booklist={booklist} canManage collectLoading
      onOpen={vi.fn()} onToggleCollect={onToggleCollect} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '收藏书单' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '管理书单' }));
    const collect = screen.getByRole('menuitem', { name: '收藏书单' });
    expect(collect).toBeDisabled();
    fireEvent.click(collect);
    expect(onToggleCollect).not.toHaveBeenCalled();
  });
});
