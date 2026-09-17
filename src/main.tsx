import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import '@/shared/styles/globals.css';

const TagPoolPreview = import.meta.env.DEV && window.location.pathname === '/dev/tag-pool'
  ? React.lazy(() => import('./pages/TagPoolPreview').then((module) => ({ default: module.TagPoolPreview })))
  : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {TagPoolPreview ? (
      <React.Suspense fallback={null}>
        <TagPoolPreview />
      </React.Suspense>
    ) : <App />}
  </React.StrictMode>
);
