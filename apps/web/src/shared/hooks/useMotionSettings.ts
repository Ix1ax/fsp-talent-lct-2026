'use client';

import { MOTION_TRANSITION } from '@/shared/contants';

import { useMediaQuery } from './useMediaQuery';

const REDUCED_TRANSITION = { duration: 0 };

export const useMotionSettings = () => {
  // Until the browser preference is known, keep server-rendered content visible.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', true);
  return {
    reducedMotion,
    transition: reducedMotion ? REDUCED_TRANSITION : MOTION_TRANSITION,
  };
};
