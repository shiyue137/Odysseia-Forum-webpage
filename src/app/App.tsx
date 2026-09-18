import axios from 'axios';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { showMascotErrorToast } from '@/features/mascot/lib/mascotToast';
import { ThemeProvider } from '@/app/themes/ThemeProvider';
import {
  bindThumbnailRepairQueryClient,
  reportBrokenThreadThumbnail,
  subscribeThreadThumbnailRepair,
} from '@/features/threads/lib/thumbnailRepairQueue';
import {
  consumeAuthTokenFromHash,
  hasAuthTokenInHash,
  subscribeAuthInvalidation,
} from '@/shared/lib/authSession';
import {
  getRateLimitInfo,
  isSilentPreloadRateLimit,
  shouldRetryQuery,
} from '@/shared/api/rateLimit';
import { notifyRateLimit } from '@/features/mascot/lib/notify';
import { configureImageRecovery } from '@/shared/lib/imageRecovery';
import { router } from './router';
import { useMascotStore } from '@/features/mascot/store/mascotStore';
import { OmicronLoader } from '@/shared/ui/loaders/OmicronLoader';
import { isTagsChangedError } from '@/shared/api/tagErrors';
import { refreshTagCandidates } from '@/features/tags/lib/refreshTagCandidates';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // 忽略请求取消（如切换路由、切标签或组件卸载）
      if (
        axios.isCancel(error) ||
        (error as { name?: string })?.name === 'CanceledError' ||
        (error as { code?: string })?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      const rateLimit = getRateLimitInfo(error);
      if (rateLimit) {
        if (!isSilentPreloadRateLimit(error)) notifyRateLimit(rateLimit);
        return;
      }

      if (isTagsChangedError(error)) {
        toast.error('标签已发生变化，请刷新候选后重新选择。', {
          id: 'tags-changed',
          action: { label: '刷新候选', onClick: () => {
            void refreshTagCandidates(queryClient).then(
              () => toast.success('候选已刷新，请移除失效条件后重新选择。'),
              () => toast.error('候选刷新失败，请稍后重试。'),
            );
          } },
        });
        return;
      }

      // 如果有明确的 HTTP 响应（4xx/5xx 等由业务处理），或者属于静默预加载，不弹全局网络错误
      if (axios.isAxiosError(error) && error.response) {
        return;
      }
      if (
        isSilentPreloadRateLimit(error) ||
        (typeof document !== 'undefined' && document.visibilityState === 'hidden')
      ) {
        return;
      }

      console.error('Global Network Error:', error);
      showMascotErrorToast('network', { id: 'global-network-error' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent aggressive re-fetching when switching back
      retry: shouldRetryQuery,
    },
  },
});

// 方便调试
if (import.meta.env.DEV) {
  Object.assign(window, { queryClient });
}

export function App() {
  const [isAuthBootstrapPending, setIsAuthBootstrapPending] = useState(() => hasAuthTokenInHash());

  useEffect(() => {
    bindThumbnailRepairQueryClient(queryClient);
    configureImageRecovery({
      report: reportBrokenThreadThumbnail,
      subscribe: subscribeThreadThumbnailRepair,
    });
  }, []);

  useEffect(() => {
    return subscribeAuthInvalidation(() => {
      void queryClient.cancelQueries({ queryKey: ['auth'] });
      queryClient.setQueryData(['auth'], { loggedIn: false });
      void queryClient.cancelQueries({ queryKey: ['custom-tags'] }).then(() => {
        queryClient.removeQueries({ queryKey: ['custom-tags'] });
      });
    });
  }, []);

  useEffect(() => {
    const mascotStore = useMascotStore.getState();
    if (!mascotStore.hasWelcomed) {
      mascotStore.reset();
      mascotStore.markWelcomed();
    }

  }, []);

  useEffect(() => {
    if (!isAuthBootstrapPending) return;

    const token = consumeAuthTokenFromHash();
    const refresh = token
      ? queryClient.invalidateQueries({ queryKey: ['auth'] })
      : Promise.resolve();
    void refresh.finally(() => setIsAuthBootstrapPending(false));
  }, [isAuthBootstrapPending]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {isAuthBootstrapPending ? (
            <div className="flex min-h-screen items-center justify-center bg-(--od-bg)">
              <div className="text-center">
                <OmicronLoader className="mx-auto mb-4 h-12 w-12" />
                <p className="text-sm text-(--od-text-secondary)">验证登录状态...</p>
              </div>
            </div>
          ) : (
            <RouterProvider router={router} />
          )}
          {createPortal(
            <Toaster
              position="top-center"
              richColors
              visibleToasts={4}
              expand={false}
              gap={14}
              style={{ zIndex: 99999 }}
              toastOptions={{
                style: {
                  background: 'color-mix(in srgb, var(--od-bg-secondary) 82%, transparent)',
                  backdropFilter: 'blur(16px) saturate(122%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(122%)',
                  border: '1px solid var(--od-glass-border)',
                  color: 'var(--od-text-primary)',
                  boxShadow: 'var(--od-shadow-floating)',
                  zIndex: 99999,
                },
              }}
            />,
            document.body,
          )}
          {/* 仅在需要调试时显示 DevTools，默认隐藏 */}
          {import.meta.env.VITE_SHOW_DEVTOOLS === 'true' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
