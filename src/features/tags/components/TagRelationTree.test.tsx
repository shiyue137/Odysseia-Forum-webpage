import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TagRelationTree } from "./TagRelationTree";
import type { PoolTag } from "./TagPoolBrowser";

it("保留多父级祖先和后代路径，不显示兄弟分支，默认展开且可以收起", () => {
  const tags: PoolTag[] = ["祖先甲", "祖先乙", "当前", "后代", "兄弟"].map((name, index) => ({
    id: String(index), name, category: "背景", parents: [], excludes: [], aliases: [], enabled: true,
  }));
  const onSelect = vi.fn();
  render(<TagRelationTree selectedId="2" tags={tags} onSelect={onSelect} edges={[
    { source_id: "2", target_id: "0" }, { source_id: "2", target_id: "1" },
    { source_id: "3", target_id: "2" }, { source_id: "4", target_id: "0" },
  ]} />);
  expect(screen.getAllByRole("button", { name: /^当前\s*背景$/ })).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: /^后代\s*背景$/ })).toHaveLength(2);
  expect(screen.queryByText("兄弟")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: /^后代\s*背景$/ })[0]);
  expect(onSelect).toHaveBeenCalledWith(tags[3]);
  fireEvent.click(screen.getByRole("button", { name: "收起祖先甲" }));
  expect(screen.getAllByRole("button", { name: /^当前\s*背景$/ })).toHaveLength(1);
});
