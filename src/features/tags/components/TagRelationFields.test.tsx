import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { TagRelationFields } from "./TagRelationFields";
import type { PoolTag } from "./TagPoolBrowser";

vi.mock("../api/customTagsApi", () => ({
  customTagsApi: { pool: vi.fn(async () => ({ results: [{ id: "12", name: "幻想", category_name: "背景", source: "discord" }], total: 1 })) },
  tagError: () => ({ message: "失败" }),
}));

it("空输入聚焦提供候选，选择与拖入只修改草稿，拒绝未知拖入 ID", async () => {
  const draft: PoolTag = { id: "11", name: "标签", category: "背景", parents: [], excludes: [], aliases: [], enabled: true };
  const parent = { ...draft, id: "12", name: "幻想", source: "discord" as const };
  const onChange = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TagRelationFields draft={draft} tags={[parent]} onChange={onChange} />
  </QueryClientProvider>);
  const input = screen.getByRole("textbox", { name: "搜索上级标签" });
  fireEvent.focus(input);
  const checkbox = await screen.findByRole("checkbox", { name: "幻想 · 背景" });
  const label = screen.getByText("幻想 · 背景");
  fireEvent.pointerDown(label);
  fireEvent.blur(input, { relatedTarget: null });
  expect(checkbox).toBeInTheDocument();
  fireEvent.click(label);
  expect(onChange).toHaveBeenLastCalledWith({ ...draft, parents: ["12"] });
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("checkbox", { name: "幻想 · 背景" })).not.toBeInTheDocument();
  onChange.mockClear();
  fireEvent.drop(input, { dataTransfer: { getData: () => "unknown" } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.drop(input, { dataTransfer: { getData: () => "12" } });
  expect(onChange).toHaveBeenCalledWith({ ...draft, parents: ["12"] });
});
