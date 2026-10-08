'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';

export const useInViewOnce = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return { ref, inView };
};
