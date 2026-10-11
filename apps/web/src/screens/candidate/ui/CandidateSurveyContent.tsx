import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn } from '@/shared/ui';
import { CandidateSurveyForm } from '@/features/candidate/onboarding';

import type { CandidateSurveyData } from '../model';

interface CandidateSurveyContentProps {
  data: CandidateSurveyData;
  onSaved: () => void;
}

export const CandidateSurveyContent = ({
  data,
  onSaved,
}: CandidateSurveyContentProps) => {
  const blocked =
    data.onboarding.nextStep === 'consent' ||
    data.onboarding.nextStep === 'profile';
  return (
    <>
      {blocked && (
        <FadeIn className="max-w-3xl space-y-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            {data.onboarding.nextStep === 'consent'
              ? 'Для сохранения опроса нужно согласие на обработку данных.'
              : 'Сначала создайте профиль кандидата.'}
          </p>
          <Button asChild>
            <Link
              href={
                data.onboarding.nextStep === 'consent'
                  ? STATIC_ROUTES.CANDIDATE_CONSENTS
                  : STATIC_ROUTES.CANDIDATE_PROFILE
              }
            >
              {data.onboarding.nextStep === 'consent'
                ? 'Настроить согласия'
                : 'Заполнить профиль'}
            </Link>
          </Button>
        </FadeIn>
      )}
      {!blocked && (
        <FadeIn className="max-w-3xl rounded-xl border bg-card p-5 sm:p-7">
          <CandidateSurveyForm
            survey={data.onboarding.survey}
            catalogs={data.catalogs}
            stackName={
              data.onboarding.latestAttempt?.stackSkillId ===
              data.onboarding.survey?.stackSkillId
                ? data.onboarding.latestAttempt?.stackName
                : undefined
            }
            onSaved={onSaved}
          />
        </FadeIn>
      )}
    </>
  );
};
