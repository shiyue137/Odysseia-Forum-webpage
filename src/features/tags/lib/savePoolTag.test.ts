import { beforeEach, describe, expect, it, vi } from "vitest";
import { customTagsApi } from "../api/customTagsApi";
import { savePoolTag } from "./savePoolTag";
import type { PoolTag } from "../components/TagPoolBrowser";

vi.mock("../api/customTagsApi", () => ({
  customTagsApi: { create: vi.fn(), update: vi.fn(), aliases: vi.fn(), relations: vi.fn(), addRelation: vi.fn(), removeRelation: vi.fn() },
  tagError: (error: Error) => ({ message: error.message }),
}));

const draft: PoolTag = { id: "", name: "新标签", category: "角色", aliases: [" 别名 "], parents: ["1", "2"], excludes: [], enabled: true };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(customTagsApi.create).mockResolvedValue({ id: "90071992547409931" } as never);
  vi.mocked(customTagsApi.relations).mockResolvedValue([]);
});

describe("标签与关系保存", () => {
  it("未分类 DC 标准实体可以只维护别名和关系，不重写未修改的基本字段", async () => {
    const original: PoolTag = { ...draft, id: "7", source: "discord", category: "未分类", aliases: [], parents: [] };
    const result = await savePoolTag({ ...original, aliases: ["旧名称"], parents: ["8"] }, undefined, original);
    expect(result.error).toBeUndefined();
    expect(customTagsApi.update).not.toHaveBeenCalled();
    expect(customTagsApi.aliases).toHaveBeenCalledWith("7", ["旧名称"]);
    expect(customTagsApi.addRelation).toHaveBeenCalledWith("7", "8", "implies");
  });
  it("创建时保存名称、分类、别名和所选关系", async () => {
    const result = await savePoolTag(draft, 3);
    expect(result.error).toBeUndefined();
    expect(customTagsApi.create).toHaveBeenCalledWith({
      name: "新标签",
      description: "",
      category: 3,
      is_abyss: false,
      aliases: ["别名"],
    });
    expect(customTagsApi.addRelation).toHaveBeenCalledWith("90071992547409931", "1", "implies");
    expect(customTagsApi.addRelation).toHaveBeenCalledWith("90071992547409931", "2", "implies");
  });

  it("关系部分失败保留新 ID，重试不重复创建或重写已成功的关系", async () => {
    vi.mocked(customTagsApi.addRelation).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("关系暂不可用"));
    const first = await savePoolTag(draft, 3);
    expect(first.tag.id).toBe("90071992547409931");
    expect(first.error).toContain("标签关系未保存");
    vi.mocked(customTagsApi.relations).mockResolvedValue([{ source_id: first.tag.id, target_id: "1", kind: "implies" }]);
    const second = await savePoolTag(first.tag, 3);
    expect(second.error).toBeUndefined();
    expect(customTagsApi.create).toHaveBeenCalledTimes(1);
    expect(customTagsApi.addRelation).toHaveBeenCalledTimes(3);
    expect(customTagsApi.addRelation).toHaveBeenLastCalledWith(first.tag.id, "2", "implies");
  });

  it("移除互斥关系时兼容对称边，保留本标签的下级关系", async () => {
    vi.mocked(customTagsApi.relations).mockResolvedValue([
      { source_id: "9", target_id: "7", kind: "excludes" },
      { source_id: "8", target_id: "7", kind: "implies" },
    ]);
    await savePoolTag({ ...draft, id: "7", parents: [] }, 3);
    expect(customTagsApi.removeRelation).toHaveBeenCalledTimes(1);
    expect(customTagsApi.removeRelation).toHaveBeenCalledWith("7", "9", "excludes");
  });
});
