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
  const profileContainerRef = useRef<HTMLElement>(null);
  const sectionContentRef = useRef<HTMLDivElement>(null);
  const pendingStepRef = useRef<ProfileStep | null>(null);
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
    if (pathname === destination) return;

    const container = profileContainerRef.current;
    if (container) {
      const minimumHeight = Math.max(
        0,
        window.innerHeight - container.getBoundingClientRect().top,
      );
      container.style.minHeight = `${minimumHeight}px`;
    }
    pendingStepRef.current = next;

    router.push(destination, { scroll: false });
  };

  useEffect(() => {
    if (pendingStepRef.current !== step) return;
    const frame = requestAnimationFrame(() => {
      sectionContentRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      pendingStepRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    let frame = 0;
    const updateReservedHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const container = profileContainerRef.current;
        if (!container || container.hidden || !container.style.minHeight)
          return;
        // Release the extra space as the user scrolls up, rather than retaining the tallest section.
        container.style.minHeight =
          window.scrollY === 0
            ? ''
            : `${Math.max(0, window.innerHeight - container.getBoundingClientRect().top)}px`;
      });
    };
    window.addEventListener('scroll', updateReservedHeight, { passive: true });
    window.addEventListener('resize', updateReservedHeight);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateReservedHeight);
      window.removeEventListener('resize', updateReservedHeight);
    };
  }, []);

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

  return {
    step,
    changeStep,
    navigationRef,
    profileContainerRef,
    sectionContentRef,
    navigateFromReadiness,
  };
};
