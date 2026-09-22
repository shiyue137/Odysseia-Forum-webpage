import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { customTagsApi } from "./customTagsApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("customTagsApi.pool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("单次读取完整标签池并保留统计包装", async () => {
    const response = { results: [], total: 0 };
    const signal = new AbortController().signal;
    vi.mocked(apiClient.get).mockResolvedValue({ data: response });

    const result = await customTagsApi.pool({
      q: "",
      source: "custom",
      selectable: true,
      include_deleted: false,
    }, signal);

    expect(result).toEqual(response);
    expect(apiClient.get).toHaveBeenCalledOnce();
    expect(apiClient.get).toHaveBeenCalledWith("/tags", {
      params: {
        q: "",
        source: "custom",
        selectable: true,
        include_deleted: false,
      },
      signal,
    });
    expect(vi.mocked(apiClient.get).mock.calls[0][1]?.params).not.toHaveProperty("offset");
  });
});
