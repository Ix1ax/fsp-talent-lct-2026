'use client';

import { type PointerEvent, useEffect } from 'react';
import { useMotionValue } from 'framer-motion';

import { useMotionSettings } from './useMotionSettings';

export const useMouseOffset = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const { reducedMotion } = useMotionSettings();

  useEffect(() => {
    if (reducedMotion) {
      x.set(0);
      y.set(0);
    }
  }, [reducedMotion, x, y]);

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === 'touch') {
      reset();
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - bounds.left - bounds.width / 2);
    y.set(event.clientY - bounds.top - bounds.height / 2);
  };

  return { x, y, onPointerMove, onPointerLeave: reset, reset };
};
