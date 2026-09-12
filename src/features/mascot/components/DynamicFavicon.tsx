import defaultIcon from '@/assets/images/icon/forum-icon-64.png';
import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { useMascotStore } from '@/features/mascot/store/mascotStore';
import { useEffect, useRef, useState } from 'react';

const FAVICON_HOLD_MS = 30_000;

export function DynamicFavicon({ hasUnread = false }: { hasUnread?: boolean }) {
  const emotion = useMascotStore((state) => state.emotion);
  const isVisible = useMascotStore((state) => state.isVisible);
  const hasShownMascotRef = useRef(false);
  const [source, setSource] = useState(defaultIcon);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const syncNetwork = () => setOffline(!navigator.onLine);
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    return () => {
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      hasShownMascotRef.current = true;
      setSource(MASCOT_IMAGES[emotion] || MASCOT_IMAGES.hi || defaultIcon);
      return;
    }
    if (!hasShownMascotRef.current) return;
    const timer = window.setTimeout(() => setSource(defaultIcon), FAVICON_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [emotion, isVisible]);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    favicon.type = 'image/png';
    favicon.href = source;
    if (!hasUnread && !offline) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    // 绘图不可用时保留原图标，通知入口仍显示未读状态。
    if (!context) return;
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      context.drawImage(image, 0, 0, 64, 64);
      if (offline) {
        // 逐像素灰度化，兼容不支持 Canvas filter 的浏览器。
        const pixels = context.getImageData(0, 0, 64, 64);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const gray = Math.round(pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114);
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
        }
        context.putImageData(pixels, 0, 0);
      }
      if (hasUnread) {
        context.beginPath();
        context.arc(52, 12, 9, 0, Math.PI * 2);
        context.fillStyle = offline ? '#9ca3af' : '#ef4444';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#ffffff';
        context.stroke();
      }
      favicon.href = canvas.toDataURL('image/png');
    };
    image.src = source;
    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [source, hasUnread, offline]);

  useEffect(() => () => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (favicon) favicon.href = defaultIcon;
  }, []);

  return null;
}
