'use client';

import Link from 'next/link';
import { ArrowRightIcon, InfoIcon } from 'lucide-react';

import { useRemoteData } from '@/shared/hooks';
import {
  Button,
  FadeIn,
  RemoteState,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';

import { getOnboardingAction, loadCandidateOnboarding } from '../lib';

export const CandidateOnboardingCard = () => {
  const query = useRemoteData(loadCandidateOnboarding);
  const action = query.data ? getOnboardingAction(query.data) : undefined;
  return (
    <section
      aria-label="Следующий шаг"
      className="rounded-xl border bg-card p-5 sm:p-6"
    >
      <RemoteState
        loading={query.loading}
        error={query.error}
        retry={query.retry}
      />
      {action && (
        <FadeIn className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Следующий шаг
              </p>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Как определяется следующий шаг"
                  >
                    <InfoIcon aria-hidden="true" className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="motion-reduce:animate-none"
                  sideOffset={6}
                >
                  Шаг определяется по сохранённым данным. Вы можете перейти в
                  любой раздел кабинета.
                </TooltipContent>
              </Tooltip>
            </div>
            <h2 className="text-xl font-semibold">{action.title}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {action.description}
            </p>
          </div>
          <Button asChild className="min-h-11 w-full shrink-0 sm:w-auto">
            <Link href={action.href}>
              {action.label}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </FadeIn>
      )}
    </section>
  );
};
