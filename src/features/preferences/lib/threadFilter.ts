import type { Thread } from '@/entities/thread/types';
import type { DiscoveryPreferenceContext } from '@/features/preferences/lib/discoveryPreferences';

/**
 * 根据用户偏好过滤帖子列表（前端兜底逻辑）
 * 用于处理后端 apply_preferences 逻辑可能存在的漏掉或不一致问题
 */
export function filterThreadsByPreferences(
  threads: Thread[],
  context: DiscoveryPreferenceContext | null | undefined,
): Thread[] {
  if (!context || threads.length === 0) return threads;

  const excludeTags = new Set(context.excludeTags);
  if (excludeTags.size === 0) return threads;

  return threads.filter((thread) => {
    // 检查普通标签
    const hasExcludedTag = (thread.tags || []).some((tag) => excludeTags.has(tag));
    if (hasExcludedTag) return false;

    // 检查虚拟标签
    const hasExcludedVirtualTag = (thread.virtual_tags || []).some((tag) => excludeTags.has(tag));
    if (hasExcludedVirtualTag) return false;

    return true;
  });
}
