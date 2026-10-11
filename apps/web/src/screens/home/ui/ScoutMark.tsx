import { motion } from 'framer-motion';

import { LANDING_ELEMENTS } from '../constants';

interface ScoutMarkProps {
  activeIndex: number;
  reducedMotion: boolean;
}

export const ScoutMark = ({ activeIndex, reducedMotion }: ScoutMarkProps) => {
  const transition = {
    duration: reducedMotion ? 0 : 0.6,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const getPartAnimation = (index: number) => {
    const highlighted = index === activeIndex;
    return {
      opacity: highlighted ? 1 : 0.35,
      scale: highlighted && !reducedMotion ? 1.06 : 1,
      rotate: highlighted && !reducedMotion ? -4 : 0,
    };
  };
  return (
    <motion.svg
      width="244"
      height="286"
      viewBox="-35 -35 314 356"
      fill="none"
      data-landing={LANDING_ELEMENTS.SYMBOL}
      className="relative z-10 h-[240px] w-full max-w-[260px] overflow-visible"
    >
      <motion.g animate={getPartAnimation(0)} transition={transition}>
        <g
          data-landing={LANDING_ELEMENTS.SYMBOL_RED}
          className="[transform-box:fill-box] [transform-origin:center]"
        >
          <path
            d="M139.617 60.9718C174.985 47.6311 190.919 61.1771 200.448 86.4397L221.5 78.4988L215.407 56.8395C189.416 64.151 169.059 59.3564 158.823 22.9688L128.5 31.4988L139.617 60.9718Z"
            fill="#F11933"
          />
          <path
            d="M97.931 39.1019C106.488 73.5107 90.6161 82.1266 73.1387 86.4729L77 102L92.9659 100.957C91.7915 82.9852 95.1728 65.2451 130.554 62.933L128.5 31.5L97.931 39.1019Z"
            fill="#F11933"
          />
          <circle cx="128.5" cy="31.5" r="31.5" fill="#F11933" />
          <circle cx="221.5" cy="78.5" r="22.5" fill="#F11933" />
          <circle cx="77" cy="102" r="16" fill="#F11933" />
        </g>
      </motion.g>
      <motion.g animate={getPartAnimation(0)} transition={transition}>
        <g
          data-landing={LANDING_ELEMENTS.SYMBOL_WHITE}
          className="[transform-box:fill-box] [transform-origin:center]"
        >
          <path
            d="M19.2031 137.421C46.2814 143.417 52.636 157.25 47.4965 180.46L67.9999 185L73.3935 164.704C50.4187 158.599 41.0549 146.596 48.178 119.792L24.4999 113.5L19.2031 137.421Z"
            fill="#EFEFEF"
          />
          <circle cx="68" cy="185" r="21" fill="#EFEFEF" />
          <circle cx="24.5" cy="113.5" r="24.5" fill="#EFEFEF" />
        </g>
      </motion.g>
      <motion.g animate={getPartAnimation(1)} transition={transition}>
        <g
          data-landing={LANDING_ELEMENTS.SYMBOL_BLUE}
          className="[transform-box:fill-box] [transform-origin:center]"
        >
          <path
            d="M117.138 251.943C139.452 242.495 152.609 247.824 162.058 270.139L175.862 236.059C153.548 245.507 140.391 240.178 130.942 217.863L117.138 251.943Z"
            fill="#3729FB"
          />
          <circle cx="107" cy="228" r="26" fill="#3729FB" />
          <circle cx="186" cy="260" r="26" fill="#3729FB" />
        </g>
      </motion.g>
      <motion.g animate={getPartAnimation(2)} transition={transition}>
        <g
          data-landing={LANDING_ELEMENTS.SYMBOL_LENS}
          className="[transform-box:fill-box] [transform-origin:center]"
        >
          <circle cx="151.5" cy="141.5" r="23.5" fill="#3629FF" />
          <circle
            cx="150.5"
            cy="142.5"
            r="50.5"
            stroke="#EFEFEF"
            strokeWidth="18"
          />
          <rect
            x="175.598"
            y="186.555"
            width="27"
            height="60.208"
            rx="7"
            transform="rotate(-44.0804 175.598 186.555)"
            fill="#EFEFEF"
          />
        </g>
      </motion.g>
    </motion.svg>
  );
};
