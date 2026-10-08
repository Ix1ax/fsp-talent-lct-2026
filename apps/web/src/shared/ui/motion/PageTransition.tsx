'use client';

import { useEffect } from 'react';
import {
  type HTMLMotionProps,
  motion,
  useAnimationControls,
} from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';

interface PageTransitionProps extends HTMLMotionProps<'div'> {
  transitionKey: string;
  distance?: number;
}

export const PageTransition = ({
  transitionKey,
  distance = 8,
  ...props
}: PageTransitionProps) => {
  const controls = useAnimationControls();
  const { reducedMotion, transition } = useMotionSettings();

  useEffect(() => {
    if (reducedMotion) {
      controls.set({ opacity: 1, y: 0 });
      return;
    }
    controls.set({ opacity: 0, y: distance });
    void controls.start({ opacity: 1, y: 0, transition });
    return () => controls.stop();
  }, [transitionKey, distance, reducedMotion, transition, controls]);

  return <motion.div {...props} initial={false} animate={controls} />;
};
