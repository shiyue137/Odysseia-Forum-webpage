import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SearchSortMenu } from './SearchSortMenu';

it('默认按钮独立于排序选择，Escape 关闭并恢复焦点', () => {
  const onChange = vi.fn();
  const onSaveDefault = vi.fn();
  render(<SearchSortMenu value="last_active_desc" saving={false} saveDisabled={false} onChange={onChange} onSaveDefault={onSaveDefault} />);
  const trigger = screen.getByLabelText('选择排序方式');
  fireEvent.click(trigger);
  const save = screen.getByRole('button', { name: '将最新发布设为默认排序' });
  fireEvent.click(save);
  expect(onSaveDefault).toHaveBeenCalledWith('created_desc');
  expect(onChange).not.toHaveBeenCalled();
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(save, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: '最新发布' }));
  expect(onChange).toHaveBeenCalledWith('created_desc');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
