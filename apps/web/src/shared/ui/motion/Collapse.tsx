'use client';

import { type HTMLMotionProps, motion } from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';

interface CollapseProps extends HTMLMotionProps<'div'> {
  open: boolean;
}

export const Collapse = ({
  open,
  children,
  style,
  ...props
}: CollapseProps) => {
  const { transition } = useMotionSettings();

  return (
    <motion.div
      {...props}
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={transition}
      inert={!open}
      aria-hidden={!open}
      style={{ ...style, overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
};
