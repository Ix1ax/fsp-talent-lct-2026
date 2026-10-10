'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

import { ScrollProgress } from '@/shared/ui';

interface LandingMotionProps {
  children: ReactNode;
}

export const LandingMotion = ({ children }: LandingMotionProps) => {
  return (
    <MotionConfig reducedMotion="user">
      <ScrollProgress />
      <div>{children}</div>
    </MotionConfig>
  );
};
