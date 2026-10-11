'use client';

import { type HTMLMotionProps, motion } from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';

interface AnimatedIndicatorProps extends HTMLMotionProps<'span'> {
  layoutId: string;
}

export const AnimatedIndicator = (props: AnimatedIndicatorProps) => {
  const { transition } = useMotionSettings();

  return <motion.span aria-hidden="true" transition={transition} {...props} />;
};
