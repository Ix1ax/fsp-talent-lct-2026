'use client';

import {
  motion,
  type MotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';

interface RevealWordProps {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
}

export const RevealWord = ({
  word,
  index,
  count,
  progress,
}: RevealWordProps) => {
  const reduced = useReducedMotion();
  const opacity = useTransform(
    progress,
    [index / count, (index + 1) / count],
    [0.15, 1],
  );

  return (
    <motion.span style={{ opacity: reduced ? 1 : opacity }}>
      {word}{' '}
    </motion.span>
  );
};
