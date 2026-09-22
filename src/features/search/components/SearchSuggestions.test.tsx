import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchSuggestions } from './SearchSuggestions';

describe('搜索建议键盘操作', () => {
  it('同名 DC 来源聚合为标准 ID 建议，包含与排除使用 ID token', () => {
    const onSelect = vi.fn();
    render(<SearchSuggestions currentQuery="纯" availableTags={["纯爱"]} onSelect={onSelect} onClose={vi.fn()}
      tagEntities={[{ id: "90071992547409931", name: "纯爱", description: "", is_abyss: false, source: "discord", category: null, category_name: null, enabled: true, deleted_at: null,
        discord_sources: [{ id: "1", discord_tag_id: "111", channel_id: "222", name: "纯爱" }, { id: "2", discord_tag_id: "333", channel_id: "444", name: "纯爱" }] }]} />);
    expect(screen.getAllByText("纯爱")).toHaveLength(1);
    expect(screen.getByText("DC · 2 个来源")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "包含标签 纯爱" }));
    expect(onSelect).toHaveBeenLastCalledWith({ type: "add_token", tokenType: "tagid", value: `90071992547409931|${encodeURIComponent("纯爱")}`, mode: "include" });
    fireEvent.click(screen.getByRole("button", { name: "排除标签 纯爱" }));
    expect(onSelect).toHaveBeenLastCalledWith({ type: "add_token", tokenType: "tagid", value: `90071992547409931|${encodeURIComponent("纯爱")}`, mode: "exclude" });
  });
  it('回车使用最新回调，结果缩短后不提交越界选项，卸载移除监听', () => {
    const inputRef = createRef<HTMLInputElement>();
    const firstSelect = vi.fn();
    const nextSelect = vi.fn();
    const onClose = vi.fn();
    const suggestions = (onSelect: typeof firstSelect, tags = ['测试一', '测试二']) => <>
      <input ref={inputRef} />
      <SearchSuggestions currentQuery="测试" inputRef={inputRef}
        availableTags={tags} onSelect={onSelect} onClose={onClose} />
    </>;
    const { rerender, unmount } = render(suggestions(firstSelect));
    const input = inputRef.current!;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    rerender(suggestions(nextSelect));
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(firstSelect).not.toHaveBeenCalled();
    expect(nextSelect).toHaveBeenCalledExactlyOnceWith({
      type: 'add_token', tokenType: 'tag', value: '测试一', mode: 'include',
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    rerender(suggestions(nextSelect, []));
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(nextSelect).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
