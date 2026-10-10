'use client';

import type { PointerEvent, ReactNode } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

interface MagneticLinkProps {
  children: ReactNode;
  href: string;
}

const STIFFNESS = 250;
const DAMPING = 20;

export const MagneticLink = ({ children, href }: MagneticLinkProps) => {
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: STIFFNESS, damping: DAMPING });
  const y = useSpring(0, { stiffness: STIFFNESS, damping: DAMPING });

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;

    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.12);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.12);
  };

  const resetPosition = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      className="inline-flex items-center justify-between gap-12 rounded-full [padding:1.5rem_2rem] bg-accent text-foreground text-lg max-md:w-full max-md:text-base max-md:[padding:1.25rem_1.5rem]"
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPosition}
      onBlur={resetPosition}
    >
      {children}
    </motion.a>
  );
};
