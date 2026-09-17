import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { customTagSearchQuery } from "@/shared/lib/searchTokenizer";
import { SearchTokenInput } from "./SearchTokenInput";

it("自定义标签显示名称，删除按钮移除对应 token", () => {
  const onChange = vi.fn();
  render(<SearchTokenInput value={customTagSearchQuery({ id: "7914", name: "兽耳" })} onChange={onChange} />);
  expect(screen.getByText("兽耳")).toBeInTheDocument();
  expect(screen.queryByText("7914")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "移除包含 tag: 兽耳" }));
  expect(onChange).toHaveBeenCalledWith("");
});
