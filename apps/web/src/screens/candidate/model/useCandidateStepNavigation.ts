import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import {
  type CandidateFullProfile,
  getConsentPermissions,
} from '@/entities/candidate';

import {
  PROFILE_STEPS,
  type ProfileStep,
  READINESS_TARGETS,
  type ReadinessTarget,
} from '../constants';

type CandidateStepNavigationOptions = {
  initialFullProfile?: CandidateFullProfile;
  busy: boolean;
};

export const useCandidateStepNavigation = ({
  initialFullProfile,
  busy,
}: CandidateStepNavigationOptions) => {
  const pathname = usePathname();
  const router = useRouter();
  const navigationRef = useRef<HTMLDivElement>(null);
  const [pendingTarget, setPendingTarget] = useState<ReadinessTarget>();
  const defaultStep: ProfileStep =
    initialFullProfile?.profile &&
    getConsentPermissions(initialFullProfile.consents).processing
      ? 'profile'
      : 'consents';
  const step =
    PROFILE_STEPS.find((item) => DYNAMIC_ROUTES.CANDIDATE(item.id) === pathname)
      ?.id ?? defaultStep;

  const changeStep = (next: ProfileStep) => {
    if (busy) return;
    const destination = DYNAMIC_ROUTES.CANDIDATE(next);
    if (pathname !== destination) router.push(destination, { scroll: false });
    navigationRef.current?.scrollIntoView({ block: 'start' });
  };

  const navigateFromReadiness = (code: string) => {
    if (busy) return;
    const target = READINESS_TARGETS[code] ?? { step: 'profile' };
    setPendingTarget(target);
    changeStep(target.step);
  };

  useEffect(() => {
    if (!pendingTarget || pendingTarget.step !== step) return;
    const frame = requestAnimationFrame(() => {
      const target = pendingTarget.fieldId
        ? document.getElementById(pendingTarget.fieldId)
        : undefined;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (target.matches('input, textarea, button, select'))
          target.focus({ preventScroll: true });
      }
      setPendingTarget(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [step, pendingTarget]);

  return { step, changeStep, navigationRef, navigateFromReadiness };
};
