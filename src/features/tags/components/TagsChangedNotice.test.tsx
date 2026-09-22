import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { TagsChangedNotice } from "./TagsChangedNotice";
import { customTagsApi } from "../api/customTagsApi";

vi.mock("../api/customTagsApi", () => ({ customTagsApi: { pool: vi.fn(async () => ({ results: [], total: 0 })) } }));

it("显式刷新请求新候选，但不重写旧 ID 或重试原结果查询", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const results = { query: "$tagid:123|old$" };
  client.setQueryData(["search", "results", results], { old: true });
  render(<QueryClientProvider client={client}><TagsChangedNotice /></QueryClientProvider>);
  expect(customTagsApi.pool).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "刷新标签候选" }));
  await waitFor(() => expect(customTagsApi.pool).toHaveBeenCalledWith({ q: "", selectable: false, include_deleted: false }, expect.any(AbortSignal)));
  expect(await screen.findByText("候选已刷新，请移除失效的标签条件后重新选择。")).toBeInTheDocument();
  expect(results.query).toBe("$tagid:123|old$");
  expect(client.getQueryData(["search", "results", results])).toEqual({ old: true });
});
