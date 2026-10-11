'use client';

import { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

type ScrollDirection = 'up' | 'down';

export const useScrollDirection = (threshold = 8) => {
  const [direction, setDirection] = useState<ScrollDirection>('up');
  const { scrollY } = useScroll();
  const anchor = useRef<number | null>(null);

  useMotionValueEvent(scrollY, 'change', (current) => {
    const previous = anchor.current ?? scrollY.getPrevious() ?? current;
    if (current <= 0) {
      anchor.current = 0;
      setDirection('up');
    } else if (Math.abs(current - previous) >= Math.max(0, threshold)) {
      anchor.current = current;
      setDirection(current > previous ? 'down' : 'up');
    } else if (anchor.current === null) anchor.current = previous;
  });

  return direction;
};
