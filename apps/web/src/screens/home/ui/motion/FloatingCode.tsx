'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

export const FloatingCode = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [25, -65]);
  const otherY = useTransform(scrollYProgress, [0, 1], [50, -30]);

  return (
    <div
      ref={ref}
      className="flex justify-between gap-4 text-brand-text text-xs [margin-block:3rem_2rem] max-md:hidden"
      aria-hidden="true"
    >
      <motion.code style={{ y: reduced ? 0 : y }}>
        const team = await findTeam();
      </motion.code>
      <motion.code style={{ y: reduced ? 0 : otherY }}>
        return personalBest;
      </motion.code>
    </div>
  );
};
