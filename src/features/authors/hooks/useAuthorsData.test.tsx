import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { searchApi } from '@/features/search/api/searchApi';
import { useAuthorThreads } from './useAuthorsData';

vi.mock('@/features/search/api/searchApi', () => ({ searchApi: { search: vi.fn() } }));

it('作者作品翻页使用 offset，返回第一页时复用该页缓存', async () => {
  const search = vi.mocked(searchApi.search).mockImplementation(async ({ offset } = {}) => ({
    results: [{ thread_id: offset === 48 ? 'second-page' : 'first-page' }], total: 80,
  }) as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, rerender } = renderHook(({ page }) => useAuthorThreads('123456789012345678', {
    page, sortMethod: 'created_desc', channelIds: ['987654321098765432'],
  }), { wrapper, initialProps: { page: 1 } });
  await waitFor(() => expect(result.current.data?.results[0].thread_id).toBe('first-page'));
  rerender({ page: 2 });
  await waitFor(() => expect(result.current.data?.results[0].thread_id).toBe('second-page'));
  expect(search).toHaveBeenLastCalledWith(expect.objectContaining({
    offset: 48, limit: 48, include_authors: ['123456789012345678'], channel_ids: ['987654321098765432'],
  }));
  rerender({ page: 1 });
  await waitFor(() => expect(result.current.data?.results[0].thread_id).toBe('first-page'));
  expect(search).toHaveBeenCalledTimes(2);
});
