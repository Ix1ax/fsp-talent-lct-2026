'use client';

import { useEffect, useRef } from 'react';
import {
  type HTMLMotionProps,
  motion,
  stagger,
  useAnimationControls,
  useInView,
} from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';

interface StaggerProps extends HTMLMotionProps<'div'> {
  interval?: number;
  inView?: boolean;
  once?: boolean;
}

export const Stagger = ({
  interval = 0.008,
  inView = false,
  once = true,
  ...props
}: StaggerProps) => {
  const { reducedMotion } = useMotionSettings();
  const controls = useAnimationControls();
  const ref = useRef<HTMLDivElement>(null);
  const entered = useInView(ref, { once, amount: 0.15 });
  const started = useRef(false);

  const show = !inView || entered;

  useEffect(() => {
    if (reducedMotion) controls.set('visible');
    else {
      if (!started.current) controls.set('hidden');
      started.current = true;
      void controls.start(show ? 'visible' : 'hidden');
    }
    return () => controls.stop();
  }, [controls, show, reducedMotion]);

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={controls}
      variants={{
        hidden: {},
        visible: {
          transition: { delayChildren: reducedMotion ? 0 : stagger(interval) },
        },
      }}
      {...props}
    />
  );
};

export const StaggerItem = (props: HTMLMotionProps<'div'>) => {
  const { reducedMotion, transition } = useMotionSettings();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reducedMotion ? 0 : 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={transition}
      {...props}
    />
  );
};
