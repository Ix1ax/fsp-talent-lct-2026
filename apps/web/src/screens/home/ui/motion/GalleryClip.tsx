'use client';

import { useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

interface GalleryClipProps {
  index: number;
}

export const GalleryClip = ({ index }: GalleryClipProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (
      visible &&
      !reduced &&
      window.matchMedia('(min-width: 768px)').matches
    ) {
      void video.play().catch(() => video.pause());
    } else {
      video.pause();
    }
  }, [visible, reduced]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster="/hero-poster.svg"
      aria-label={`Фрагмент видео спортивного программирования ${index + 1}`}
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = Math.min(
          index * 3,
          e.currentTarget.duration / 2,
        );
      }}
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
};
