import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TagPoolBrowser, type PoolTag } from "./TagPoolBrowser";

it("直接上下级可多选并与列表同步，已有标签只读，关系树不放复选框", () => {
  const tags: PoolTag[] = ["兽", "兽耳", "狐娘"].map((name, i) => ({
    id: String(i + 1), name, category: "背景", parents: i ? [String(i)] : [], excludes: [], aliases: [], enabled: true,
  }));
  const onToggle = vi.fn();
  const props = { tags, categories: ["背景"], canManage: false, onSave: vi.fn(), onToggle, disabledIds: ["3"] };
  const { rerender } = render(<TagPoolBrowser {...props} selectedIds={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "兽耳" }));
  const detail = within(screen.getByRole("region", { name: "标签详情" }));
  fireEvent.click(detail.getByRole("checkbox", { name: "选择兽" }));
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(tags[0]);
  rerender(<TagPoolBrowser {...props} selectedIds={["1"]} />);
  expect(screen.getAllByRole("checkbox", { name: "选择兽" }).every((input) => (input as HTMLInputElement).checked)).toBe(true);
  expect(detail.getByRole("checkbox", { name: "选择狐娘" })).toBeChecked();
  expect(detail.getByRole("checkbox", { name: "选择狐娘" })).toBeDisabled();
  expect(within(screen.getByRole("region", { name: "标签关系树" })).queryByRole("checkbox")).not.toBeInTheDocument();
});

it("切换列表和关系树节点后，详情只保留一个关系溯源区块", () => {
  const tags: PoolTag[] = ["兽", "兽耳", "狐娘"].map((name, i) => ({
    id: String(i + 1), name, category: "背景", parents: i ? [String(i)] : [], excludes: [], aliases: [], enabled: true,
  }));
  render(<TagPoolBrowser tags={tags} categories={["背景"]} canManage onSave={vi.fn()} />);
  for (const name of ["狐娘", "兽耳", "兽", "狐娘", "兽耳"]) {
    fireEvent.click(within(screen.getByRole("region", { name: "背景标签" })).getByRole("button", { name }));
    expect(screen.getAllByRole("region", { name: "标签关系树" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "关系溯源" })).toHaveLength(1);
  }
});

it("列表按分类平铺，多父级标签仍只出现一次", () => {
  const parent: PoolTag = { id: "1", name: "幻想", category: "背景", parents: [], excludes: [], aliases: [], enabled: true };
  const child = { ...parent, id: "2", name: "魔法", category: "特质", parents: ["1", "3"] };
  const other = { ...parent, id: "3", name: "现代" };
  const props = { categories: ["背景", "特质"], canManage: false, onSave: vi.fn() };
  const { rerender } = render(<TagPoolBrowser {...props} tags={[]} />);
  rerender(<TagPoolBrowser {...props} tags={[parent, child, other]} />);
  expect(screen.getAllByRole("button", { name: "魔法" })).toHaveLength(1);
  expect(within(screen.getByRole("region", { name: "特质标签" })).getByRole("button", { name: "魔法" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "收起幻想" })).not.toBeInTheDocument();
});

it("未修改的编辑直接离开，修改后的草稿才要求确认", () => {
  const tag: PoolTag = { id: "1", name: "幻想", category: "背景", parents: [], excludes: [], aliases: [], enabled: true };
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<TagPoolBrowser tags={[tag]} categories={["背景"]} canManage onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "幻想" }));
  fireEvent.click(screen.getByRole("button", { name: "编辑" }));
  fireEvent.click(screen.getByRole("button", { name: "幻想" }));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "编辑" }));
  fireEvent.change(screen.getByRole("textbox", { name: "标准名" }), { target: { value: "新名字" } });
  fireEvent.click(screen.getByRole("button", { name: "幻想" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox", { name: "标准名" })).toHaveValue("新名字");
  confirm.mockRestore();
});
