import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchSuggestions } from './SearchSuggestions';

describe('搜索建议键盘操作', () => {
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
