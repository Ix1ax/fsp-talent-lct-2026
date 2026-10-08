'use client';

import { useScroll, useSpring } from 'framer-motion';

import { MOTION_SPRING } from '@/shared/contants';

import { useMotionSettings } from './useMotionSettings';

export const useSmoothScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, MOTION_SPRING);
  const { reducedMotion } = useMotionSettings();

  return reducedMotion ? scrollYProgress : smoothProgress;
};
