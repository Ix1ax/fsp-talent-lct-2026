import { Button } from '@/shared/ui';
import { toast } from '@/shared/ui/Sonner';
import type { CandidateProfile } from '@/entities/candidate-profile';
import type { CatalogItem } from '@/entities/catalog';

import { useCandidateProfileForm } from '../model';
import { ProfileEmploymentFields } from './ProfileEmploymentFields';
import { ProfileTextFields } from './ProfileTextFields';

interface CandidateProfileFormProps {
  profile?: CandidateProfile;
  workFormats?: CatalogItem[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onProfileChange: (profile: CandidateProfile | undefined) => void;
}

export const CandidateProfileForm = ({
  profile,
  workFormats,
  busy,
  onBusyChange,
  onProfileChange,
}: CandidateProfileFormProps) => {
  const { form, message, success, dirty, save } = useCandidateProfileForm({
    profile,
    onBusyChange,
    onProfileChange,
  });
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(
        async (values) => {
          if (!busy) await save(values);
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
        <Button type="submit" disabled={busy || !dirty} className="self-start">
          {profile ? 'Сохранить изменения' : 'Создать профиль'}
        </Button>
      </fieldset>
    </form>
  );
};
