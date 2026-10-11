'use client';

import { useEffect } from 'react';
import {
  type HTMLMotionProps,
  motion,
  useSpring,
  useTransform,
} from 'framer-motion';

import { MOTION_SPRING } from '@/shared/contants';
import { useMotionSettings } from '@/shared/hooks';

interface AnimatedCounterProps extends Omit<
  HTMLMotionProps<'span'>,
  'children'
> {
  value: number;
  format?: (value: number) => string;
}

const formatInteger = (value: number) =>
  Math.round(value).toLocaleString('ru-RU');

export const AnimatedCounter = ({
  value,
  format = formatInteger,
  ...props
}: AnimatedCounterProps) => {
  const { reducedMotion } = useMotionSettings();
  const spring = useSpring(value, MOTION_SPRING);
  const text = useTransform(spring, format);
  useEffect(() => {
    if (reducedMotion) spring.jump(value);
    else spring.set(value);
  }, [value, reducedMotion, spring]);
  return (
    <motion.span {...props}>
      <span className="sr-only">{format(value)}</span>
      <motion.span aria-hidden="true">{text}</motion.span>
    </motion.span>
  );
};
