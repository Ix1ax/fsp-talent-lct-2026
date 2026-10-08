'use client';

import { useEffect, useRef } from 'react';
import {
  type HTMLMotionProps,
  motion,
  useAnimationControls,
  useInView,
} from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';

interface FadeInProps extends HTMLMotionProps<'div'> {
  distance?: number;
  delay?: number;
  inView?: boolean;
  once?: boolean;
  visible?: boolean;
}

export const FadeIn = ({
  distance = 8,
  delay = 0,
  inView = false,
  once = true,
  visible = true,
  children,
  ...props
}: FadeInProps) => {
  const { reducedMotion, transition } = useMotionSettings();
  const ref = useRef<HTMLDivElement>(null);
  const entered = useInView(ref, { once, amount: 0.15 });
  const controls = useAnimationControls();
  const started = useRef(false);

  const skipEntrance = props.initial === false;
  const show = visible && (!inView || entered);

  useEffect(() => {
    const hidden = { opacity: 0, y: reducedMotion ? 0 : distance };
    const shown = { opacity: 1, y: 0 };
    if (reducedMotion) {
      controls.set(visible ? shown : hidden);
      return;
    }
    if (!started.current && !skipEntrance) controls.set(hidden);
    started.current = true;
    void controls.start({
      ...(show ? shown : hidden),
      transition: { ...transition, delay },
    });
    return () => controls.stop();
  }, [
    controls,
    reducedMotion,
    visible,
    show,
    distance,
    delay,
    transition,
    skipEntrance,
  ]);

  return (
    <motion.div
      {...props}
      ref={ref}
      initial={visible ? false : { opacity: 0, y: 0 }}
      animate={controls}
    >
      {children}
    </motion.div>
  );
};
