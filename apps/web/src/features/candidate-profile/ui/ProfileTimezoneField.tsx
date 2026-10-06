import { type Control, Controller } from 'react-hook-form';

import { TIMEZONE_LABELS, TIMEZONES } from '@/shared/contants';
import { Combobox } from '@/shared/ui';

import type { ProfileFormValues } from '../model';
import { ProfileField } from './ProfileField';

const getTimezoneLabel = (zone: string) =>
  TIMEZONE_LABELS[zone] ? `${TIMEZONE_LABELS[zone]} (${zone})` : zone;

const timezoneOptions = [...TIMEZONES]
  .sort((a, b) => {
    const priorityA = Number(a in TIMEZONE_LABELS);
    const priorityB = Number(b in TIMEZONE_LABELS);
    return priorityB - priorityA || a.localeCompare(b);
  })
  .map((zone) => ({ value: zone, label: getTimezoneLabel(zone) }));

interface ProfileTimezoneFieldProps {
  control: Control<ProfileFormValues>;
}

export const ProfileTimezoneField = ({
  control,
}: ProfileTimezoneFieldProps) => {
  return (
    <Controller
      name="timezone"
      control={control}
      render={({ field, fieldState }) => {
        const options = [{ value: '', label: 'Не указан' }, ...timezoneOptions];
        if (
          field.value &&
          !options.some((option) => option.value === field.value)
        )
          options.push({
            value: field.value,
            label: getTimezoneLabel(field.value),
          });
        return (
          <ProfileField
            id="profile-timezone"
            label="Часовой пояс"
            error={fieldState.error?.message}
          >
            <Combobox
              ref={field.ref}
              id="profile-timezone"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={options}
              searchPlaceholder="Поиск города или часового пояса…"
              emptyMessage="Часовой пояс не найден."
              aria-invalid={!!fieldState.error}
              aria-describedby={
                fieldState.error ? 'profile-timezone-error' : undefined
              }
            />
          </ProfileField>
        );
      }}
    />
  );
};
