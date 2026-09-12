import React, { useCallback, useEffect, useRef, useState } from 'react';

function getAverageColor(imgEl: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    if (!imgEl.complete) {
      imgEl.onload = () => resolve(getAverageColor(imgEl));
      return;
    }
    try {
      const cvs = document.createElement('canvas');
      cvs.width = 1;
      cvs.height = 1;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgEl, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve(`rgba(${r},${g},${b},0.5)`);
        return;
      }
    } catch {
      // ignore cross-origin issues
    }
    resolve('rgba(80, 80, 90, 0.4)');
  });
}

export interface CinematicCardProps {
  imageUrl?: string;
  children?: React.ReactNode;
  className?: string;
  tiltSensitivity?: number;
  parallaxIntensity?: number;
  damping?: number;
  scaleBase?: number;
  showGlow?: boolean;
  border?: boolean;
  showSheen?: boolean;
  useGlobalMouse?: boolean;
  povMode?: boolean;
}

export function CinematicCard({
  imageUrl,
  children,
  className = '',
  parallaxIntensity = 35, // 对应 POV 模式的 povRange
  damping = 0.05,        // 对应 POV 模式的沉重感
  scaleBase = 1.2,        // 对应 POV 模式的放大率
  showGlow = true,
  border = true,
  showSheen = true,
  useGlobalMouse = false,
  povMode = true,
}: CinematicCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const physicsLayerRef = useRef<HTMLDivElement>(null);
  const imgLayerRef = useRef<HTMLImageElement | HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  const state = useRef({
    tarRX: 0,
    tarRY: 0,
    curRX: 0,
    curRY: 0,
    tarPX: 0,
    tarPY: 0,
    curPX: 0,
    curPY: 0,
    isHovered: false,
  });

  const [glowColor, setGlowColor] = useState('rgba(80, 80, 90, 0.4)');

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    let rect: DOMRect;
    let cx: number;
    let cy: number;
    let width: number;
    let height: number;

    if (useGlobalMouse) {
      width = window.innerWidth;
      height = window.innerHeight;
      cx = width / 2;
      cy = height / 2;
    } else {
      if (!wrapRef.current) return;
      rect = wrapRef.current.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      cx = rect.left + width / 2;
      cy = rect.top + height / 2;
    }

    state.current.isHovered = true;

    // 归一化系 (-1 到 1)
    const dx = (e.clientX - cx) / (width / 2);
    const dy = (e.clientY - cy) / (height / 2);

    // 记录目标位置 (POV 模式下，PX/PY 直接作为平移距离)
    state.current.tarPX = dx;
    state.current.tarPY = dy;
  }, [useGlobalMouse]);

  const handleMouseLeave = () => {
    state.current.isHovered = false;
    state.current.tarPX = 0;
    state.current.tarPY = 0;
  };

  useEffect(() => {
    if (useGlobalMouse) {
      const onMove = (e: MouseEvent) => handleMouseMove(e);
      window.addEventListener('mousemove', onMove);
      return () => window.removeEventListener('mousemove', onMove);
    }
  }, [handleMouseMove, useGlobalMouse]);

  useEffect(() => {
    let reqId: number;
    const loop = () => {
      const s = state.current;
      s.curRX += (s.tarRX - s.curRX) * damping;
      s.curRY += (s.tarRY - s.curRY) * damping;
      s.curPX += (s.tarPX - s.curPX) * damping;
      s.curPY += (s.tarPY - s.curPY) * damping;

      if (physicsLayerRef.current) {
        if (povMode) {
          // POV 核心算法：仅平移摄像机，不旋转
          const moveX = -s.curPX * parallaxIntensity;
          const moveY = -s.curPY * parallaxIntensity;
          physicsLayerRef.current.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
        } else {
          // 之前的卡片模式 (Legacy)
          physicsLayerRef.current.style.transform = `rotateX(${s.curRX.toFixed(3)}deg) rotateY(${s.curRY.toFixed(3)}deg) scale3d(1.002, 1.002, 1.002)`;
        }
      }

      if (imgLayerRef.current) {
        if (povMode) {
          // POV 模式：图片具有 Z 轴深度差，通过父级平移产生视差
          imgLayerRef.current.style.transform = `scale(${scaleBase}) translateZ(-200px)`;
        } else {
          imgLayerRef.current.style.transform = `scale(${scaleBase}) translate3d(${(s.curPX * -8).toFixed(2)}px, ${(s.curPY * -8).toFixed(2)}px, 0)`;
        }
      }

      if (glowRef.current) {
        const glowX = -s.curPX * 15;
        const glowY = -s.curPY * 15;
        glowRef.current.style.transform = `translate3d(${glowX.toFixed(2)}px, ${glowY.toFixed(2)}px, -50px)`;
      }

      if (sheenRef.current) {
        const sheenX = 50 + s.curPX * 10;
        const sheenY = 50 + s.curPY * 10;
        sheenRef.current.style.backgroundPosition = `${sheenX}% ${sheenY}%`;
      }

      reqId = requestAnimationFrame(loop);
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [damping, scaleBase, povMode, parallaxIntensity]);


  const handleImageLoad = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (showGlow) {
      const color = await getAverageColor(e.currentTarget);
      setGlowColor(color);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`group relative w-full h-full [perspective:1000px] [transform-style:preserve-3d] overflow-hidden ${
        border ? 'rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)]' : ''
      } ${className}`}
      onMouseMove={useGlobalMouse ? undefined : handleMouseMove}
      onMouseLeave={useGlobalMouse ? undefined : handleMouseLeave}
    >
      {/* Ambient Glow */}
      {showGlow && (
        <div
          ref={glowRef}
          className="pointer-events-none absolute left-[10%] top-[10%] h-[80%] w-[80%] rounded-full opacity-50 blur-[30px] transition-all duration-1000 ease-out group-hover:opacity-80 group-hover:blur-[40px]"
          style={{
            backgroundColor: glowColor,
            boxShadow: `0 0 50px 10px ${glowColor}`,
            transform: 'translateZ(-50px)',
          }}
        />
      )}

      {/* Physics Layer (Camera) */}
      <div
        ref={physicsLayerRef}
        className={`relative h-full w-full [transform-style:preserve-3d] ${
          border ? 'p-1.5' : ''
        }`}
        style={{ willChange: 'transform' }}
      >
        {/* Image Layer */}
        {imageUrl && (
          <img
            ref={imgLayerRef as React.RefObject<HTMLImageElement>}
            src={imageUrl}
            className={`absolute inset-0 h-full w-full object-cover ${border ? 'rounded-xl bg-[#121214]' : ''}`}
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            style={{ willChange: 'transform' }}
            alt=""
          />
        )}
        
        {/* Children Layer (tilts with the card, but doesn't translate) */}
        {children && (
          <div className="absolute inset-0 z-30">
            {children}
          </div>
        )}

        {/* Film Grain */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Matte Sheen */}
        {showSheen && (
          <div
            ref={sheenRef}
            className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-plus-lighter transition-opacity duration-500 ease-out group-hover:opacity-100"
            style={{
              background:
                'linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.05) 45%, rgba(255, 255, 255, 0.0) 50%, transparent)',
              backgroundSize: '200% 200%',
            }}
          />
        )}
      </div>
    </div>
  );
}
