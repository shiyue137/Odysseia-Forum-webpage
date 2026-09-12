import { beforeEach, describe, expect, it } from 'vitest';
import { getLastBrowsePosition, saveLastBrowsePosition } from './lastBrowsePosition';

describe('浏览位置持久化', () => {
  beforeEach(() => localStorage.clear());

  it.each(['/search?q=测试&page=3', '/u/123?page=3', '/booklists?page=2'])('保留分页 URL：%s', (url) => {
    saveLastBrowsePosition(url, 420);
    const expected = new URL(url, window.location.origin);
    expect(getLastBrowsePosition()).toMatchObject({
      url: `${expected.pathname}${expected.search}`,
      scrollTop: 420,
    });
  });

  it('外站与不记录的页面不会覆盖已有位置', () => {
    saveLastBrowsePosition('/search?page=3', 420);
    saveLastBrowsePosition('https://example.com/search?page=4', 100);
    saveLastBrowsePosition('/settings', 0);
    expect(getLastBrowsePosition()).toMatchObject({ url: '/search?page=3', scrollTop: 420 });
  });
});
