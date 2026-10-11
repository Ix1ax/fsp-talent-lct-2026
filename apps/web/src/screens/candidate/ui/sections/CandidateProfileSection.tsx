import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { CandidateAvatar, CandidateProfileForm } from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateProfileSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateProfileSection = ({
  workspace,
}: CandidateProfileSectionProps) => {
  const {
    fullProfile,
    profile,
    busy,
    handleFormBusyChange,
    setProfile,
    refreshFullProfile,
    changeStep,
    importedResume,
    registerProfileDraftReader,
    workFormats,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {profile ? 'Настройка профиля' : 'Создание профиля'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <CandidateAvatar
            profile={profile}
            busy={busy}
            onBusyChange={handleFormBusyChange}
            onProfileChange={setProfile}
          />
        </div>
        <CandidateProfileForm
          importedDraft={importedResume?.profile}
          onDraftReader={registerProfileDraftReader}
          profile={profile}
          workFormats={workFormats}
          consents={fullProfile.consents}
          onConsentRequired={refreshFullProfile}
          busy={busy}
          onBusyChange={handleFormBusyChange}
          onProfileChange={setProfile}
          onSaved={() => changeStep('contacts')}
        />
      </CardContent>
    </Card>
  );
};
