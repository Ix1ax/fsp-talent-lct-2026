'use client';

import { useId, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { useMediaQuery } from '@/shared/hooks';

import { LANDING_ELEMENTS, SCOUT_SYMBOL_STAGES } from '../constants';
import { ScoutMark } from './ScoutMark';

export const ScoutSymbol = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', true);
  const descriptionId = useId();
  const activeStage = SCOUT_SYMBOL_STAGES[activeIndex];

  const handleStageChange = (index: number) => setActiveIndex(index);

  return (
    <div
      data-landing={LANDING_ELEMENTS.SYMBOL_STAGE}
      className="flex h-full min-h-[580px] flex-col justify-between gap-6 p-8 text-[#efefef] max-md:p-6"
    >
      <div className="flex items-center justify-between border-b border-white/20 pb-4 text-[10px] tracking-[0.12em] text-white/60">
        <span>ТВОЙ ПРОФИЛЬ В ФОКУСЕ</span>
        <span>{activeStage.number} / 03</span>
      </div>
      <div
        className="relative grid min-h-[240px] place-items-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-x-5 top-1/2 h-px bg-white/10" />
        <div className="absolute inset-y-5 left-1/2 w-px bg-white/10" />
        <span className="absolute left-2 top-2 size-3 border-l border-t border-white/30" />
        <span className="absolute bottom-2 right-2 size-3 border-b border-r border-white/30" />
        <ScoutMark activeIndex={activeIndex} reducedMotion={reducedMotion} />
      </div>
      <div
        id={descriptionId}
        aria-live="polite"
        aria-atomic="true"
        className="min-h-[160px] max-sm:min-h-[180px]"
      >
        <h3 className="mb-3 max-w-[350px] text-[26px] font-medium leading-[1.15] tracking-[-0.04em]">
          {activeStage.title}
        </h3>
        <p className="max-w-[380px] text-sm leading-[1.7] text-white/65">
          {activeStage.description}
        </p>
      </div>
      <div
        role="group"
        aria-label="Как профиль помогает найти работу"
        className="grid grid-cols-3 gap-2 border-t border-white/20 pt-5"
      >
        {SCOUT_SYMBOL_STAGES.map((stage, index) => (
          <button
            key={stage.number}
            type="button"
            aria-pressed={activeIndex === index}
            aria-controls={descriptionId}
            onClick={() => handleStageChange(index)}
            className="group flex min-h-[62px] flex-col items-start justify-center gap-1 rounded-md border border-white/20 px-3 text-left text-white/70 transition-colors hover:border-white/50 hover:text-white aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-[#1b1c21] focus-visible:outline-white! motion-reduce:transition-none max-sm:px-2"
          >
            <span className="flex w-full items-center justify-between text-[9px] tracking-wider opacity-60">
              {stage.number}
              <ArrowUpRight size={12} />
            </span>
            <span className="text-xs font-medium max-sm:text-[11px]">
              {stage.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
