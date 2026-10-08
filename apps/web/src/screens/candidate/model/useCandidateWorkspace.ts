import { useRef, useState } from 'react';

import {
  type CandidateFullProfile,
  type CandidateProfile,
  getConsentPermissions,
} from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import {
  type AppliedResume,
  toContactsFormValues,
  toProfileFormValues,
} from '@/features/candidate';

import { useCandidateFullProfile } from './useCandidateFullProfile';
import { useCandidateStepNavigation } from './useCandidateStepNavigation';

type CandidateWorkspaceOptions = {
  user: SessionUser;
  initialFullProfile?: CandidateFullProfile;
  workFormats?: CatalogItem[];
};
export const useCandidateWorkspace = ({
  user,
  initialFullProfile,
  workFormats,
}: CandidateWorkspaceOptions) => {
  const {
    fullProfile,
    updateFullProfile,
    refreshFullProfile,
    refreshAfterSave,
    refreshing: dataRefreshing,
    refreshError,
  } = useCandidateFullProfile(initialFullProfile);
  const [busy, setBusy] = useState(false);
  const [experienceCount, setExperienceCount] = useState(0);
  const [educationCount, setEducationCount] = useState(0);
  const [importedResume, setImportedResume] = useState<AppliedResume>();
  const [careerRevision, setCareerRevision] = useState(0);
  const profileDraftReaderRef = useRef<
    (() => Record<string, unknown>) | undefined
  >(undefined);
  const contactsDraftReaderRef = useRef<
    (() => Record<string, unknown>) | undefined
  >(undefined);

  const {
    step,
    changeStep,
    navigationRef,
    profileContainerRef,
    sectionContentRef,
    navigateFromReadiness,
  } = useCandidateStepNavigation({ initialFullProfile, busy });

  const profile = fullProfile?.profile ?? undefined;
  const permissions = fullProfile
    ? getConsentPermissions(fullProfile.consents)
    : { processing: false, canPublish: false };

  const setProfile = (next: CandidateProfile | undefined) => {
    updateFullProfile((current) => ({ ...current, profile: next ?? null }));
  };
  const handleFormBusyChange = (next: boolean) => {
    setBusy(next);
    if (!next) refreshAfterSave();
  };
  const handleImportedRecordSaved = () => {
    setCareerRevision((current) => current + 1);
    refreshAfterSave();
  };

  const registerProfileDraftReader = (
    reader: (() => Record<string, unknown>) | undefined,
  ) => {
    profileDraftReaderRef.current = reader;
  };
  const registerContactsDraftReader = (
    reader: (() => Record<string, unknown>) | undefined,
  ) => {
    contactsDraftReaderRef.current = reader;
  };
  const getCurrentDraft = () => ({
    profile: profileDraftReaderRef.current?.() ?? toProfileFormValues(profile),
    contacts:
      contactsDraftReaderRef.current?.() ??
      toContactsFormValues(fullProfile?.contacts ?? null, {
        name: user.name,
        email: user.email,
      }),
  });
  const applyResume = (resume: AppliedResume) => {
    setImportedResume(resume);
    changeStep('profile');
  };

  return {
    user,
    workFormats,
    fullProfile,
    profile,
    permissions,
    busy,
    setBusy,
    experienceCount,
    educationCount,
    step,
    navigationRef,
    profileContainerRef,
    sectionContentRef,
    changeStep,
    importedResume,
    careerRevision,
    registerProfileDraftReader,
    registerContactsDraftReader,
    getCurrentDraft,
    applyResume,
    setProfile,
    handleFormBusyChange,
    handleImportedRecordSaved,
    navigateFromReadiness,
    updateFullProfile,
    refreshFullProfile,
    refreshAfterSave,
    dataRefreshing,
    refreshError,
    setExperienceCount,
    setEducationCount,
  };
};
export type CandidateWorkspace = ReturnType<typeof useCandidateWorkspace>;
