'use client';

import { useRef } from 'react';
import { useScroll } from 'framer-motion';

import { RevealWord } from './RevealWord';

interface RevealWordsProps {
  text: string;
}
export const RevealWords = ({ text }: RevealWordsProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 85%', 'end 45%'],
  });

  const words = text.split(' ');

  return (
    <p
      ref={ref}
      className="[max-width:1120px] [font-size:clamp(2rem,_4.4vw,_3.8rem)] font-medium [line-height:1.2] [letter-spacing:-0.045em]"
    >
      {words.map((word, i) => (
        <RevealWord
          key={i}
          word={word}
          index={i}
          count={words.length}
          progress={scrollYProgress}
        />
      ))}
    </p>
  );
};
