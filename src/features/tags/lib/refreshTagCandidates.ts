import type { QueryClient } from "@tanstack/react-query";
import { customTagsApi } from "../api/customTagsApi";

export async function refreshTagCandidates(client: QueryClient) {
  await client.invalidateQueries({
    predicate: ({ queryKey }) =>
      (queryKey[0] === "custom-tags" && ["pool", "categories", "relations", "relation-candidates"].includes(String(queryKey[1]))) ||
      (queryKey[0] === "search" && ["suggestions", "filter-meta"].includes(String(queryKey[1]))),
    refetchType: "all",
  });
  await client.fetchQuery({
    queryKey: ["custom-tags", "pool", false, false, undefined],
    queryFn: ({ signal }) => customTagsApi.pool({ q: "", selectable: false, include_deleted: false }, signal),
    staleTime: 0,
  });
}
