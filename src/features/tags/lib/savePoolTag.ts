import { customTagsApi, tagError, type TagRelation } from "../api/customTagsApi";
import type { PoolTag } from "../components/TagPoolBrowser";

export async function savePoolTag(draft: PoolTag, category: number): Promise<{ tag: PoolTag; error?: string }> {
  let tag = { ...draft };
  let stage = "基本信息";
  try {
    const aliases = tag.aliases.map((name) => name.trim()).filter(Boolean);
    if (!tag.id) {
      const created = await customTagsApi.create({ name: tag.name, category, aliases });
      // 后续步骤失败也保留新 ID，重试不得再次创建实体。
      tag = { ...tag, id: created.id };
    } else {
      await customTagsApi.update(tag.id, { name: tag.name, category, enabled: tag.enabled });
      stage = "别名";
      await customTagsApi.aliases(tag.id, aliases);
    }
    stage = "标签关系";
    const current = await customTagsApi.relations();
    for (const kind of ["implies", "excludes"] as const) {
      const existing = current.filter((edge: TagRelation) => edge.kind === kind &&
        (edge.source_id === tag.id || (kind === "excludes" && edge.target_id === tag.id)))
        .map((edge) => edge.source_id === tag.id ? edge.target_id : edge.source_id);
      const desired = [...new Set(kind === "implies" ? tag.parents : tag.excludes)];
      for (const id of existing.filter((id) => !desired.includes(id))) await customTagsApi.removeRelation(tag.id, id, kind);
      for (const id of desired.filter((id) => !existing.includes(id))) await customTagsApi.addRelation(tag.id, id, kind);
    }
    return { tag };
  } catch (error) {
    return { tag, error: `${stage}未保存：${tagError(error).message}${tag.id ? "。已完成的步骤已保留，可继续修改并重试。" : ""}` };
  }
}
