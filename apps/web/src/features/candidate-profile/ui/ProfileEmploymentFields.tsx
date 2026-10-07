import { type Control, Controller } from 'react-hook-form';

import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import type { SearchStatus } from '@/entities/candidate-profile';
import type { CatalogItem } from '@/entities/catalog';

import { getSearchStatusHint } from '../lib';
import type { ProfileFormValues } from '../model';
import { ProfileField } from './ProfileField';

interface ProfileEmploymentFieldsProps {
  workFormats?: CatalogItem[];
  control: Control<ProfileFormValues>;
  canPublish: boolean;
  busy: boolean;
  savedSearchStatus?: SearchStatus;
}

export const ProfileEmploymentFields = ({
  workFormats,
  control,
  canPublish,
  busy,
  savedSearchStatus,
}: ProfileEmploymentFieldsProps) => {
  return (
    <>
      <Controller
        name="workFormatIds"
        control={control}
        render={({ field, fieldState }) => (
          <fieldset className="flex flex-col gap-3" disabled={!workFormats}>
            <legend className="mb-3 text-sm font-medium">Форматы работы</legend>
            {!workFormats && (
              <p role="alert" className="text-sm text-muted-foreground">
                Не удалось загрузить форматы работы. Текущий выбор сохранён.
                Обновите страницу, чтобы изменить его.
              </p>
            )}
            {workFormats?.map((format, index) => (
              <label
                key={format.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  ref={index === 0 ? field.ref : undefined}
                  checked={field.value.includes(format.id)}
                  onBlur={field.onBlur}
                  aria-invalid={!!fieldState.error}
                  aria-describedby={
                    fieldState.error ? 'profile-work-formats-error' : undefined
                  }
                  onCheckedChange={(checked) => {
                    const ids = field.value.filter((id) => id !== format.id);
                    field.onChange(
                      checked === true ? [...ids, format.id] : ids,
                    );
                  }}
                />
                {format.name}
              </label>
            ))}
            {fieldState.error && (
              <p
                id="profile-work-formats-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldState.error.message}
              </p>
            )}
          </fieldset>
        )}
      />
      <Controller
        name="searchStatus"
        control={control}
        render={({ field, fieldState }) => (
          <ProfileField
            id="profile-search-status"
            label="Статус поиска"
            error={fieldState.error?.message}
          >
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={busy}
            >
              <SelectTrigger
                ref={field.ref}
                id="profile-search-status"
                onBlur={field.onBlur}
                aria-invalid={!!fieldState.error}
                aria-describedby={
                  fieldState.error ? 'profile-search-status-error' : undefined
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hidden">Скрыт</SelectItem>
                <SelectItem value="open" disabled={!canPublish}>
                  Активно ищу
                </SelectItem>
                <SelectItem value="passive" disabled={!canPublish}>
                  Рассматриваю предложения
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getSearchStatusHint(savedSearchStatus)}
            </p>
          </ProfileField>
        )}
      />
    </>
  );
};
