import { Stagger } from '@/shared/ui';

import { PROFILE_STEPS } from '../constants';
import { ProfileStepItem } from './ProfileStepItem';

export const CandidateProfileStepLinks = () => {
  return (
    <nav aria-label="Разделы профиля">
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_STEPS.map((step, index) => (
          <ProfileStepItem key={index} step={step} number={index + 1} />
        ))}
      </Stagger>
    </nav>
  );
};
