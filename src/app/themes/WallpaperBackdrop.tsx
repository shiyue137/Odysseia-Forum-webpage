import { createPortal } from 'react-dom';

import { useThemeSettings } from '@/shared/hooks/useSettings';

/**
 * 背景图渲染层。
 *
 * 为什么不直接用 `body::before { background-image: var(--od-wallpaper-image); }`：
 * 当用户上传本地图片时，base64 data URL 长度常常在 MB 级别。通过
 * `CSSStyleDeclaration.setProperty('--od-wallpaper-image', 'url("data:...")')` 写入的
 * 超长自定义属性，经 `var()` 展开到 `background-image` 后，在部分浏览器里会被判定为
 * 无效声明而静默回退到 `none`（URL 预设图因为短小所以工作正常）。
 *
 * 这里改用 React 在真实 DOM 节点上挂 `style={{ backgroundImage: `url(${url})` }}`，
 * 并通过 Portal 渲染到 `<body>`，让它处于 `::before`（空）和 `::after`（暗化层）之间，
 * 正好复刻原 `::before` 的视觉位置，同时不依赖 CSS 自定义属性的间接展开。
 */
export function WallpaperBackdrop() {
  const settings = useThemeSettings();
  const wallpaperUrl = (settings.backgroundImageBase64?.trim() || settings.backgroundImageUrl.trim());
  const hasWallpaper = settings.backgroundImageEnabled && wallpaperUrl.length > 0;

  if (!hasWallpaper) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden
      data-od-wallpaper-layer
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage: `url(${wallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'saturate(102%)',
        transition: 'opacity 320ms ease',
      }}
    />,
    document.body,
  );
}
