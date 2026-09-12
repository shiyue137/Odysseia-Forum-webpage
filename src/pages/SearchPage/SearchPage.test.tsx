import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { render } from '@/tests/test-utils';
import { SearchPage } from './index';
import {
  type SearchParams,
  useSearchURLParams,
} from '@/features/search/hooks/useSearchParams';
import { useUserPreferences } from '@/features/preferences/hooks/useUserPreferences';

const mockUseSearchResults = vi.hoisted(() => vi.fn());

vi.mock('@/features/search/hooks/useSearchResults', () => ({
  useSearchResults: mockUseSearchResults,
}));

vi.mock('@/features/preferences/hooks/useUserPreferences', () => ({
  useUserPreferences: vi.fn(),
}));

vi.mock('@/shared/hooks/useChannels', () => ({ useChannels: () => ({ data: { channels: [] } }) }));

// Mock 子组件和动画以简化环境
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useInView: () => [null, true],
}));

// Mock 搜索 URL 钩子，以便观察参数变化
vi.mock('@/features/search/hooks/useSearchParams', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/search/hooks/useSearchParams')>()),
  useSearchURLParams: vi.fn(),
}));

const DEFAULT_PARAMS: SearchParams = {
  query: '',
  channel: null,
  type: 'thread',
  sortMethod: 'last_active_desc',
  sortOrder: 'desc',
  page: 1,
  includeTags: [],
  excludeTags: [],
  includeAuthors: [],
  excludeAuthors: [],
  tagLogic: 'and',
  timeFrom: '',
  timeTo: '',
  reactionMin: null,
  replyMin: null,
};

describe('SearchPage 交互测试', () => {
  const mockSetParams = vi.fn();
  const mockClearParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserPreferences).mockReturnValue({
      user: undefined,
      preferences: null,
      isFirstTime: false,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      savePreferences: vi.fn(),
      isSaving: false,
    });
    mockUseSearchResults.mockImplementation(({ params }) => ({
      discoveryPreferenceContext: null,
      hasSearchFilters: Boolean(params.query),
      ignoreDiscoveryPreferences: false,
      isPreferenceActive: false,
      queryState: { isLoading: false, isError: false, refetch: vi.fn() },
      infiniteQueryState: {
        data: undefined,
        hasNextPage: false,
        isFetchingNextPage: false,
      },
      loadedPageCount: 0,
      preparePageRequest: vi.fn(() => true),
      results: [],
      pageSize: 24,
      pageByThreadId: new Map(),
      requestNextPage: vi.fn(),
      reportViewedPage: vi.fn(),
      viewedPage: 1,
      setIgnoreDiscoveryPreferences: vi.fn(),
      totalResults: 0,
      visibleRateLimit: null,
    }));
    (useSearchURLParams as any).mockReturnValue({
      params: DEFAULT_PARAMS,
      setParams: mockSetParams,
      clearParams: mockClearParams,
      hasActiveFilters: false,
    });
  });

  it('切换到书单时应该更新搜索类型', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: '书单' }));

    expect(mockSetParams).toHaveBeenCalledWith({ type: 'booklist' });
  });

  it('设为默认保留其他偏好，并固定当前排序而不切换结果', async () => {
    const preferences = {
      user_id: 123,
      preferred_channels: ['123456789012345678'],
      include_authors: ['234567890123456789'],
      exclude_authors: ['345678901234567890'],
      include_tags: ['标签'],
      include_keywords: '关键词',
      exclude_keywords: '排除',
      exclude_keyword_exemption_markers: ['🈲'],
      preview_image_mode: 'full',
      results_per_page: 5,
      ui_page_size: 48,
      sort_method: 'last_active',
      custom_base_sort: 'reaction_count',
      created_after: '-7d',
    };
    const savePreferences = vi.fn().mockResolvedValue({ ...preferences, sort_method: 'created_at' });
    vi.mocked(useUserPreferences).mockReturnValue({
      ...vi.mocked(useUserPreferences)(), preferences, savePreferences,
    });
    render(<SearchPage />);
    fireEvent.click(screen.getByLabelText('选择排序方式'));
    fireEvent.click(screen.getByRole('button', { name: '将最新发布设为默认排序' }));
    const { user_id: _userId, ...expected } = preferences;
    await waitFor(() => expect(savePreferences).toHaveBeenCalledWith({ ...expected, sort_method: 'created_at' }));
    expect(mockSetParams).toHaveBeenCalledWith({ sortMethod: 'last_active_desc' });
    expect(mockSetParams).not.toHaveBeenCalledWith({ sortMethod: 'created_desc' });
  });

  it('默认排序保存失败时反馈错误，不显示为已保存', async () => {
    const errorToast = vi.spyOn(toast, 'error').mockImplementation(() => 'error');
    vi.mocked(useUserPreferences).mockReturnValue({
      ...vi.mocked(useUserPreferences)(),
      preferences: { sort_method: 'last_active' } as never,
      savePreferences: vi.fn().mockRejectedValue(new Error('保存失败')),
    });
    render(<SearchPage />);
    fireEvent.click(screen.getByLabelText('选择排序方式'));
    fireEvent.click(screen.getByRole('button', { name: '将最新发布设为默认排序' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '将最近活跃设为默认排序' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '将最新发布设为默认排序' })).toHaveTextContent('设为默认');
    errorToast.mockRestore();
  });

  it('切换到赛事时应该更新搜索类型', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: '赛事' }));

    expect(mockSetParams).toHaveBeenCalledWith({ type: 'tournament' });
  });

  it.each(['booklist', 'tournament'] as const)(
    '%s 模式禁用帖子搜索 Hook',
    (type) => {
      const nonThreadParams = { ...DEFAULT_PARAMS, type };
      vi.mocked(useSearchURLParams).mockReturnValue({
        params: nonThreadParams,
        setParams: mockSetParams,
        clearParams: mockClearParams,
        hasActiveFilters: false,
      });

      render(<SearchPage />);

      expect(mockUseSearchResults).toHaveBeenCalledWith(expect.objectContaining({
        params: nonThreadParams,
        enabled: false,
      }));
    },
  );

  it('偏好初次加载完成前不启动帖子搜索', () => {
    vi.mocked(useUserPreferences).mockReturnValue({
      user: { id: 'user-1' } as never,
      preferences: undefined,
      isFirstTime: false,
      isLoading: true,
      isFetching: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      savePreferences: vi.fn(),
      isSaving: false,
    });

    render(<SearchPage />);

    expect(mockUseSearchResults).toHaveBeenCalledWith(expect.objectContaining({
      params: DEFAULT_PARAMS,
      enabled: false,
    }));
  });

  it('点击清除所有筛选时应该恢复默认搜索参数', async () => {
    // 模拟有活动筛选的状态
    (useSearchURLParams as any).mockReturnValue({
      params: { ...DEFAULT_PARAMS, query: '已有搜索' },
      setParams: mockSetParams,
      clearParams: mockClearParams,
      hasActiveFilters: true,
    });

    render(<SearchPage />);

    const clearButton = screen.getByText('清除所有筛选');
    fireEvent.click(clearButton);

    expect(mockSetParams).toHaveBeenCalledWith({
      query: '',
      sortMethod: 'last_active_desc',
      sortOrder: 'desc',
      page: 1,
      tagLogic: 'and',
    });
  });
});
