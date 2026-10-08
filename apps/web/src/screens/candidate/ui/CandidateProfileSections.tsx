import { FadeIn } from '@/shared/ui';

import { PROFILE_STEPS } from '../constants';
import type { CandidateWorkspace } from '../model';
import {
  CandidateConsentsSection,
  CandidateContactsSection,
  CandidateEducationSection,
  CandidateExperienceSection,
  CandidateProfileSection,
  CandidateReadinessSection,
  CandidateSkillsSection,
} from './sections';

interface CandidateProfileSectionsProps {
  workspace: CandidateWorkspace;
}

const PROFILE_SECTION_COMPONENTS = {
  consents: CandidateConsentsSection,
  profile: CandidateProfileSection,
  contacts: CandidateContactsSection,
  experience: CandidateExperienceSection,
  education: CandidateEducationSection,
  skills: CandidateSkillsSection,
  readiness: CandidateReadinessSection,
};

export const CandidateProfileSections = ({
  workspace,
}: CandidateProfileSectionsProps) => {
  return (
    <>
      {PROFILE_STEPS.map(({ id, title }) => {
        const Section = PROFILE_SECTION_COMPONENTS[id];
        return (
          <section
            key={id}
            hidden={workspace.step !== id}
            aria-label={title}
            className="w-full min-w-0"
          >
            <FadeIn visible={workspace.step === id} initial={false}>
              <Section workspace={workspace} />
            </FadeIn>
          </section>
        );
      })}
    </>
  );
};
