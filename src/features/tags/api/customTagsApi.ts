import { isAxiosError } from "axios";
import { apiClient } from "@/shared/api/client";
import type { components } from "@/shared/types/openapi";

type Schema = components["schemas"];
export type PoolItem = Schema["TagPoolItemResponse-Output"];
export type TagRelation = Schema["TagRelationResponse"];
export type TargetTags = Schema["TargetTagsResponse"];
export type TagTarget = { type: "thread" | "booklist"; id: string };
const targetPath = (target: TagTarget) => `/tags/${target.type}/${encodeURIComponent(target.id)}`;

export function tagError(error: unknown): { code?: string; message: string } {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      return { code: detail.code, message: `${detail.message || detail.code || "操作失败"}${detail.tag_id ? `（标签 ID：${detail.tag_id}）` : ""}` };
    }
    if (typeof detail === "string") return { message: detail };
  }
  return { message: error instanceof Error ? error.message : "操作失败" };
}

export const customTagsApi = {
  role: async () => (await apiClient.get<Schema["UserRole"]>("/meta/role")).data,
  categories: async () => (await apiClient.get<Schema["TagCategoryResponse"][]>("/tags/categories")).data,
  pool: async (params: { q: string; category?: number; selectable: boolean; include_deleted: boolean; offset: number }, signal?: AbortSignal) =>
    (await apiClient.get<PoolItem[]>("/tags", { params, signal })).data,
  relations: async () => (await apiClient.get<TagRelation[]>("/tags/relations")).data,
  create: async (body: Schema["TagCreateRequest"]) => (await apiClient.post<Schema["TagResponse"]>("/tags", body)).data,
  update: async (id: string, body: Schema["TagUpdateRequest"]) => (await apiClient.patch<Schema["TagResponse"]>(`/tags/${id}`, body)).data,
  aliases: async (id: string, aliases: string[]) => (await apiClient.put(`/tags/${id}/aliases`, { aliases })).data,
  remove: async (id: string) => (await apiClient.delete(`/tags/${id}`)).data,
  restore: async (id: string) => (await apiClient.post(`/tags/${id}/restore`)).data,
  addRelation: async (id: string, target_tag_id: string, kind: TagRelation["kind"]) =>
    (await apiClient.post(`/tags/${id}/relations`, { target_tag_id, kind })).data,
  removeRelation: async (id: string, targetId: string, kind: TagRelation["kind"]) =>
    (await apiClient.delete(`/tags/${id}/relations/${kind}/${targetId}`)).data,
  target: async (target: TagTarget) => (await apiClient.get<TargetTags>(targetPath(target))).data,
  replace: async (target: TagTarget, version: string, tag_ids: string[]) =>
    (await apiClient.put<TargetTags>(targetPath(target), { version, tag_ids })).data,
  propose: async (target: TagTarget, tag_id: string) =>
    (await apiClient.post<Schema["TagProposalResponse"]>(`${targetPath(target)}/proposals`, { tag_id })).data,
  proposals: async (target: TagTarget, review_queue: boolean, offset: number) =>
    (await apiClient.get<Schema["TagProposalResponse"][]>(`${targetPath(target)}/proposals`, { params: { review_queue, offset } })).data,
  review: async (target: TagTarget, id: string, approve: boolean) =>
    (await apiClient.put(`${targetPath(target)}/proposals/${id}`, { approve })).data,
  vote: async (target: TagTarget, bindingId: string, vote: -1 | 0 | 1) =>
    (await apiClient.put<TargetTags>(`${targetPath(target)}/votes/${bindingId}`, { vote })).data,
  audit: async (type: "tag" | TagTarget["type"], id: string, offset: number) =>
    (await apiClient.get<Schema["TagAuditResponse-Output"][]>(`/tags/${type}/${id}/audit`, { params: { offset } })).data,
};
