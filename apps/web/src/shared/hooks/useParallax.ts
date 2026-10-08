'use client';

import { useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';

import { useMotionSettings } from './useMotionSettings';

export const useParallax = <T extends HTMLElement = HTMLDivElement>(
  distance = 100,
) => {
  const ref = useRef<T>(null);

  const { reducedMotion } = useMotionSettings();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const offset = reducedMotion ? 0 : distance;
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return { ref, y };
};
