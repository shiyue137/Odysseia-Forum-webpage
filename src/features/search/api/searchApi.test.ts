import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import {
  RateLimitError,
  resetRateLimitStateForTests,
} from "@/shared/api/rateLimit";
import { searchApi } from "./searchApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: { post: vi.fn() },
}));

describe("searchApi 作者 Token", () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { total: 0, results: [] },
    });
  });

  it("后台预加载 429 会记录冷却时间，后续请求在本地被拦截", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      isAxiosError: true,
      config: { url: "/search/" },
      response: { status: 429, headers: { "retry-after": "5" } },
    });

    await expect(searchApi.search({}, undefined, "preload")).rejects.toMatchObject({
      name: "RateLimitError",
      rateLimit: { origin: "preload", retryAfterSeconds: 5 },
    });
    await expect(searchApi.search({})).rejects.toBeInstanceOf(RateLimitError);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it("把正反作者 ID 放进对应请求字段", async () => {
    await searchApi.search({ query: "$author:123$ -$author:456$" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/search/",
      expect.objectContaining({
        include_authors: ["123"],
        exclude_authors: ["456"],
      }),
    );
  });

  it("自定义标签 ID 与旧名称条件独立传递，不转换大整数", async () => {
    await searchApi.search({
      include_tag_ids: ["90071992547409931"],
      exclude_tag_ids: ["90071992547409932"],
      query: "$tag:同名$",
      tag_logic: "or",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/search/", expect.objectContaining({
      include_tag_ids: ["90071992547409931"],
      exclude_tag_ids: ["90071992547409932"],
      include_tags: ["同名"],
      tag_logic: "or",
    }));
  });

  it("自定义 token 的名称不混入关键词或原生标签条件", async () => {
    await searchApi.search({ query: "$tagid:90071992547409931|fox$ -$tagid:7914|wolf$" });
    expect(apiClient.post).toHaveBeenLastCalledWith("/search/", expect.objectContaining({
      include_tag_ids: ["90071992547409931"],
      exclude_tag_ids: ["7914"],
    }));
    const body = vi.mocked(apiClient.post).mock.lastCall?.[1];
    expect(body).not.toHaveProperty("include_tags");
    expect(body).not.toHaveProperty("keywords");
  });

  it("把筛选 token 转换成日期和互动范围", async () => {
    await searchApi.search({
      query: "$date:2026-07-01..2026-08-01$ $likes:10000+$ $replies:1000+$",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/search/",
      expect.objectContaining({
        created_after: "2026-07-01",
        created_before: "2026-08-01",
        reaction_count_range: "[10000, 10000000)",
        reply_count_range: "[1000, 10000000)",
      }),
    );
  });
});
