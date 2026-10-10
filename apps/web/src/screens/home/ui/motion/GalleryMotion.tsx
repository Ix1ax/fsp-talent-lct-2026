'use client';

import { type ReactNode, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';

import { getGalleryOffset } from '../../model';

interface GalleryMotionProps {
  children: ReactNode;
  direction: number;
}

export const GalleryMotion = ({ children, direction }: GalleryMotionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollY, scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const velocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(velocity, { stiffness: 60, damping: 25 });
  const x = useTransform(
    [scrollYProgress, smoothVelocity],
    ([progress, speed]) =>
      getGalleryOffset({
        progress: Number(progress),
        speed: Number(speed),
        direction,
      }),
  );

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-3 gap-6 [max-width:1440px] [margin-inline:auto] px-8 [&_figure:nth-child(2)]:mt-12 [&_video]:w-full [&_video]:[aspect-ratio:4/5] [&_video]:object-cover [&_video]:rounded-md [&_figure:nth-child(2)_video]:[object-position:30%_center] [&_figure:nth-child(3)_video]:[object-position:80%_center] [&_figcaption]:flex [&_figcaption]:justify-between [&_figcaption]:gap-4 [&_figcaption]:pt-4 [&_figcaption]:[font:0.625rem_var(--font-mono)] [&_figcaption]:[letter-spacing:0.08em] max-md:gap-4 max-md:px-4 max-md:grid-cols-1 max-md:[&_figure:nth-child(2)]:mt-0 max-md:[&_video]:[aspect-ratio:16/9] [&+div]:mt-8 max-md:transform-none!"
      style={{ x: reduced ? 0 : x }}
    >
      {children}
    </motion.div>
  );
};
