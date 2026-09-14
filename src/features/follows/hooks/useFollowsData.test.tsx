import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { followsApi } from "@/features/follows/api/followsApi";
import { useFollowedThreads, useFollowsFeed, useToggleThreadFollow } from "@/features/follows/hooks/useFollowsData";
import { followsKeys } from "@/features/follows/lib/queryKeys";

vi.mock("@/features/follows/api/followsApi", () => ({
  followsApi: {
    followThread: vi.fn(),
    unfollowThread: vi.fn(),
    getFollowsRaw: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

vi.mock("@/features/mascot/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useToggleThreadFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("关注成功后保留可供菜单重新打开使用的状态", async () => {
    vi.mocked(followsApi.followThread).mockResolvedValue();
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useToggleThreadFollow(), { wrapper });

    act(() =>
      result.current.mutate({ threadId: "123456789012345678", followed: false }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(followsKeys.state("123456789012345678"))).toBe(
      true,
    );
  });

  it("请求失败时回滚乐观关注状态", async () => {
    vi.mocked(followsApi.followThread).mockRejectedValue(new Error("failed"));
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useToggleThreadFollow(), { wrapper });

    act(() =>
      result.current.mutate({ threadId: "123456789012345678", followed: false }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(followsKeys.state("123456789012345678"))).toBe(
      false,
    );
  });
});

it("关注查询卸载时取消请求", async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(followsApi.getFollowsRaw).mockImplementation((_params, requestSignal) => {
    signal = requestSignal;
    return new Promise(() => {});
  });
  const { queryClient, wrapper } = createHarness();
  const { unmount } = renderHook(() => useFollowedThreads(), { wrapper });
  await waitFor(() => expect(signal).toBeInstanceOf(AbortSignal));
  unmount();
  expect(signal?.aborted).toBe(true);
  queryClient.clear();
});

it("关注 feed 刷新失败保留旧数据并暴露结果与错误", async () => {
  vi.mocked(followsApi.getFollowsRaw).mockResolvedValue({
    threads: [], total: 4, limit: 20, offset: 0,
  });
  vi.mocked(followsApi.getUnreadCount).mockResolvedValue({ unread_count: 2 });
  const { queryClient, wrapper } = createHarness();
  const { result, unmount } = renderHook(() => useFollowsFeed(), { wrapper });
  await waitFor(() => expect(result.current.data.total).toBe(4));
  const failure = new Error("刷新失败");
  vi.mocked(followsApi.getFollowsRaw).mockRejectedValue(failure);
  await act(async () => {
    const responses = await result.current.refetch();
    expect(responses[0].error).toBe(failure);
  });
  await waitFor(() => expect(result.current.error).toBe(failure));
  expect(result.current.data.total).toBe(4);
  expect(result.current.isFetching).toBe(false);
  unmount();
  queryClient.clear();
});
