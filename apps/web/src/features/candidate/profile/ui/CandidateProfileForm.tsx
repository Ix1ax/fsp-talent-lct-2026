import {
  type FormDraftBridge,
  useFormDraftImport,
  useUnsavedChanges,
} from '@/shared/hooks';
import { Button } from '@/shared/ui';
import { toast } from '@/shared/ui/Sonner';
import {
  type CandidateConsents,
  type CandidateProfile,
  getConsentPermissions,
} from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';

import { type ProfileFormValues, useCandidateProfileForm } from '../model';
import { ProfileEmploymentFields } from './ProfileEmploymentFields';
import { ProfileTextFields } from './ProfileTextFields';

interface CandidateProfileFormProps extends FormDraftBridge<ProfileFormValues> {
  profile?: CandidateProfile;
  consents: CandidateConsents;
  onConsentRequired: () => Promise<void>;
  workFormats?: CatalogItem[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onProfileChange: (profile: CandidateProfile | undefined) => void;
  onSaved?: () => void;
}

export const CandidateProfileForm = ({
  profile,
  consents,
  onConsentRequired,
  workFormats,
  busy,
  onBusyChange,
  onProfileChange,
  onSaved,
  importedDraft,
  onDraftReader,
}: CandidateProfileFormProps) => {
  const { form, message, success, dirty, consentError, save } =
    useCandidateProfileForm({
      profile,
      consents,
      onConsentRequired,
      onBusyChange,
      onProfileChange,
    });
  useFormDraftImport(form, { importedDraft, onDraftReader });
  useUnsavedChanges(form.formState.isDirty);
  let submitLabel = profile ? 'Сохранить изменения' : 'Создать профиль';
  if (onSaved) submitLabel = 'Сохранить и продолжить';
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(
        async (values) => {
          if (!busy && (await save(values))) onSaved?.();
        },
        () => toast.error('Проверьте поля профиля перед сохранением.'),
      )}
      aria-busy={busy}
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        <ProfileTextFields
          register={form.register}
          errors={form.formState.errors}
          control={form.control}
        />
        <ProfileEmploymentFields
          workFormats={workFormats}
          canPublish={getConsentPermissions(consents).canPublish}
          busy={busy}
          savedSearchStatus={profile?.searchStatus}
          control={form.control}
        />
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-muted-foreground">
            {success}
          </p>
        )}
        {consentError && (
          <p className="text-sm text-muted-foreground">{consentError}</p>
        )}
        <Button
          type="submit"
          disabled={busy || !dirty || !!consentError}
          className="min-h-11 w-full sm:w-auto sm:self-start"
        >
          {submitLabel}
        </Button>
      </fieldset>
    </form>
  );
};
