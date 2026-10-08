'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

import { useMotionSettings } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';

interface LoadingTextProps {
  text: string;
  className?: string;
}

export const LoadingText = ({ text, className }: LoadingTextProps) => {
  const { reducedMotion } = useMotionSettings();
  const id = useId();

  const characters = Array.from(text.replace(/(?:…|\.{3})$/, ''));

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('text-muted-foreground', className)}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex whitespace-pre">
        {characters.map((character, index) => (
          <motion.span
            key={`${id}-${index}`}
            className="inline-block"
            animate={
              reducedMotion
                ? { y: 0, opacity: 1 }
                : { y: [0, -3, 0], opacity: [0.55, 1, 0.55] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 1.4,
                    delay: index * 0.045,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: 'easeInOut',
                  }
            }
          >
            {character}
          </motion.span>
        ))}
        {[0, 1, 2].map((index) => (
          <motion.span
            key={`dot-${index}`}
            animate={
              reducedMotion ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 1,
                    delay: index * 0.18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
          >
            .
          </motion.span>
        ))}
      </span>
    </p>
  );
};
