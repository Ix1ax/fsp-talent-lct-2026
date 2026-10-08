import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { fadeProfileTransition } from '../lib';

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
  const cancelTransitionRef = useRef<(() => void) | null>(null);
  const pendingStepRef = useRef<ProfileStep | null>(null);
  const routeTargetRef = useRef<ReadinessTarget | undefined>(undefined);
  const [pendingTarget, setPendingTarget] = useState<ReadinessTarget>();
  const defaultStep: ProfileStep =
    initialFullProfile?.profile &&
    getConsentPermissions(initialFullProfile.consents).processing
      ? 'profile'
      : 'consents';
  const step =
    PROFILE_STEPS.find((item) => DYNAMIC_ROUTES.CANDIDATE(item.id) === pathname)
      ?.id ?? defaultStep;

  const navigateToStep = (next: ProfileStep, target?: ReadinessTarget) => {
    if (busy) return;
    cancelTransitionRef.current?.();
    pendingStepRef.current = null;
    setPendingTarget(undefined);
    const destination = DYNAMIC_ROUTES.CANDIDATE(next);
    if (pathname === destination) {
      setPendingTarget(target);
      return;
    }

    const container = profileContainerRef.current;
    if (container)
      container.style.minHeight = `${Math.max(0, window.innerHeight - container.getBoundingClientRect().top)}px`;
    pendingStepRef.current = next;
    routeTargetRef.current = target;
    cancelTransitionRef.current = fadeProfileTransition(
      sectionContentRef.current,
      false,
      () => {
        router.push(destination, { scroll: false });
      },
    );
  };

  const changeStep = (next: ProfileStep) => navigateToStep(next);

  useEffect(() => () => cancelTransitionRef.current?.(), []);

  useLayoutEffect(() => {
    if (!pendingStepRef.current) return;
    cancelTransitionRef.current?.();
    if (pendingStepRef.current !== step) {
      pendingStepRef.current = null;
      routeTargetRef.current = undefined;
      return;
    }
    pendingStepRef.current = null;
    const container = profileContainerRef.current;
    const content = sectionContentRef.current;
    if (content) content.style.opacity = '0';
    const fieldId = routeTargetRef.current?.fieldId;
    const field = fieldId ? document.getElementById(fieldId) : null;
    const anchor = field ?? sectionContentRef.current;
    anchor?.scrollIntoView({
      behavior: 'instant',
      block: field ? 'center' : 'start',
    });
    if (field?.matches('input, textarea, button, select'))
      field.focus({ preventScroll: true });
    if (container)
      container.style.minHeight = `${Math.max(0, window.innerHeight - container.getBoundingClientRect().top)}px`;
    routeTargetRef.current = undefined;
    cancelTransitionRef.current = fadeProfileTransition(content, true);
  }, [pathname, step]);

  useEffect(() => {
    let frame = 0;
    const updateReservedHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const container = profileContainerRef.current;
        if (!container || container.hidden || !container.style.minHeight)
          return;
        // Only release reserved space. Growing it during scrolling creates a feedback loop.
        if (window.scrollY <= 0) {
          container.style.minHeight = '';
          return;
        }
        const currentHeight = Number.parseFloat(container.style.minHeight);
        const minimumHeight = Math.max(
          0,
          window.innerHeight - container.getBoundingClientRect().top,
        );
        if (minimumHeight < currentHeight - 1)
          container.style.minHeight = `${minimumHeight}px`;
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
    navigateToStep(target.step, target);
  };

  useEffect(() => {
    if (!pendingTarget || pendingTarget.step !== step) return;
    const frame = requestAnimationFrame(() => {
      const target = pendingTarget.fieldId
        ? document.getElementById(pendingTarget.fieldId)
        : undefined;
      if (target) {
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
          block: 'center',
        });
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
