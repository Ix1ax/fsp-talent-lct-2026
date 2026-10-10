'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

interface TimelineMotionProps {
  children: ReactNode;
}

export const TimelineMotion = ({ children }: TimelineMotionProps) => {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () =>
      setDistance(
        Math.max(
          0,
          (track.current?.scrollWidth ?? 0) - (track.current?.clientWidth ?? 0),
        ),
      );
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    measure();
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section
      ref={ref}
      className="[height:240vh] bg-card text-card-foreground max-md:h-auto motion-reduce:h-auto"
      aria-labelledby="history-title"
    >
      <div className="sticky top-0 [min-height:100svh] flex items-center py-24 overflow-hidden max-md:relative max-md:min-h-auto max-md:py-16 motion-reduce:relative">
        <div className="container-page">
          <p className="font-mono [font-size:0.6875rem] [line-height:1.6] [letter-spacing:0.12em] mb-8">
            02 / ИСТОРИЯ
          </p>
          <h2 id="history-title">
            От первой строки
            <br />
            до целой страны.
          </h2>
          <div className="overflow-hidden mt-14">
            <motion.div
              ref={track}
              style={{ x: reduced ? 0 : x }}
              className="flex gap-10 max-md:flex-col max-md:transform-none! max-md:gap-8 motion-reduce:flex-wrap"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
