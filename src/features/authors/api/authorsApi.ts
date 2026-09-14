import { apiClient } from '@/shared/api/client';

export interface AuthorStats {
  thread_count: number;
  reaction_count: number;
  reply_count: number;
}

export interface AuthorProfileResponse {
  id: string;
  name: string;
  global_name: string | null;
  display_name: string;
  avatar_url: string | null;
  stats: AuthorStats;
}

export const authorsApi = {
  /**
   * 获取作者详情与统计
   * GET /v1/authors/{author_id}
   */
  getAuthorProfile: async (authorId: string, signal?: AbortSignal): Promise<AuthorProfileResponse> => {
    const response = await apiClient.get<AuthorProfileResponse>(`/authors/${authorId}`, { signal });
    return response.data;
  },
};
