'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, useSpring } from 'framer-motion';

export const RegionCounter = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const value = useSpring(0, { stiffness: 45, damping: 20 });
  const [count, setCount] = useState(0);

  useEffect(() => value.on('change', (v) => setCount(Math.round(v))), [value]);
  useEffect(() => {
    if (visible) value.set(89);
  }, [visible, value]);

  return (
    <span ref={ref} aria-label="89 регионов">
      {reduced ? 89 : count}
    </span>
  );
};
