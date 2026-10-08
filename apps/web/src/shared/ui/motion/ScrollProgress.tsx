'use client';

import { type HTMLMotionProps, motion } from 'framer-motion';

import { useSmoothScrollProgress } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';

export const ScrollProgress = ({
  className,
  style,
  ...props
}: HTMLMotionProps<'div'>) => {
  const scaleX = useSmoothScrollProgress();
  return (
    <motion.div
      {...props}
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary',
        className,
      )}
      style={{ ...style, scaleX }}
    />
  );
};
