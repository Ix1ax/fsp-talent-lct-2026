import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { useMotionSettings } from '@/shared/hooks';
import { StaggerItem } from '@/shared/ui';

import { PROFILE_STEP_DESCRIPTIONS, ProfileStep } from '../constants';

type StepItem = {
  id: ProfileStep;
  title: string;
};

interface ProfileStepItemProps {
  step: StepItem;
  number: number;
}

const MotionLink = motion.create(Link);

export const ProfileStepItem = ({ step, number }: ProfileStepItemProps) => {
  const { reducedMotion, transition } = useMotionSettings();

  return (
    <StaggerItem>
      <MotionLink
        href={DYNAMIC_ROUTES.CANDIDATE(step.id)}
        transition={transition}
        whileHover={reducedMotion ? undefined : { y: -2 }}
        whileTap={reducedMotion ? undefined : { scale: 0.99 }}
        className="group flex h-full min-h-40 flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Раздел {number}
          </span>
          <ArrowRightIcon
            className="size-4 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <p className="text-sm text-muted-foreground">
          {PROFILE_STEP_DESCRIPTIONS[step.id]}
        </p>
      </MotionLink>
    </StaggerItem>
  );
};
