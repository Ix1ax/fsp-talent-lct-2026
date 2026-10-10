'use client';

import { type ReactNode, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

interface DisciplineMotionProps {
  children: ReactNode;
  index: number;
}
export const DisciplineMotion = ({
  children,
  index,
}: DisciplineMotionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 15%', 'end 15%'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.55]);

  return (
    <div
      ref={ref}
      className="sticky mb-8 [&:nth-child(even)>article]:bg-card [&:nth-child(even)>article]:text-card-foreground max-md:relative max-md:[top:auto]! motion-reduce:relative motion-reduce:[top:auto]!"
      style={{ top: `${90 + index * 12}px` }}
    >
      <motion.article
        className="grid [grid-template-columns:1.15fr_1fr] [min-height:470px] bg-primary text-primary-foreground rounded-2xl overflow-hidden origin-top  [&_h3]:[font-size:clamp(1.6rem,_3.3vw,_2.9rem)] [&_h3]:[line-height:1.08] [&_h3]:[letter-spacing:-0.05em] [&_h3]:mb-6 [&_p]:[max-width:29rem] [&_p]:[font-size:0.9375rem] [&_p]:[line-height:1.7] [&_p]:opacity-80 [&_a]:mt-auto max-md:grid-cols-1 max-md:min-h-auto max-md:transform-none! max-md:opacity-100! max-md:[&_a]:mt-6"
        style={{ scale: reduced ? 1 : scale, opacity: reduced ? 1 : opacity }}
      >
        {children}
      </motion.article>
    </div>
  );
};
