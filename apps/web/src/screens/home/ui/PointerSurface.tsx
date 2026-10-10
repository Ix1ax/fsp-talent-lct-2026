'use client';

import type { PointerEvent, ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { LANDING_ELEMENTS } from '../constants';

interface PointerSurfaceProps {
  children: ReactNode;
}
export const PointerSurface = ({ children }: PointerSurfaceProps) => {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 25 });
  const springY = useSpring(y, { stiffness: 180, damping: 25 });

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - bounds.left - 44);
    y.set(event.clientY - bounds.top - 44);
  };

  return (
    <div
      data-landing={LANDING_ELEMENTS.POINTER_SURFACE}
      className="relative overflow-hidden [@media((hover:hover)_and_(pointer:fine))]:[&:hover_[data-landing~=pointer]]:[opacity:0.65]"
      onPointerMove={move}
    >
      {children}
      <motion.span
        aria-hidden="true"
        data-landing={LANDING_ELEMENTS.POINTER}
        className="absolute top-0 left-0 grid place-items-center [width:88px] [height:88px] [border:1px_solid_rgb(255_255_255_/_55%)] rounded-full opacity-0 pointer-events-none [transition:opacity_0.2s] [@media((prefers-reduced-motion:reduce))]:hidden"
        style={{ x: springX, y: springY }}
      >
        <ArrowUpRight size={36} />
      </motion.span>
    </div>
  );
};
