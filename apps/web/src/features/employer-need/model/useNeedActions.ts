import { useAsyncMutation } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import type {
  EmployerNeed,
  NeedInput,
  NeedMutationApi,
} from '@/entities/employer-need';

import { changedNeedFields, toNeedInput } from '../lib';

type NeedActionsOptions = {
  api: NeedMutationApi;
  companyId: string;
  need: EmployerNeed | null;
  onSaved: (need: EmployerNeed) => void;
  onArchived: () => void;
};
export const useNeedActions = ({
  api,
  companyId,
  need,
  onSaved,
  onArchived,
}: NeedActionsOptions) => {
  const mutation = useAsyncMutation();
  const save = async (input: NeedInput, isNew: boolean) =>
    mutation.run(async () => {
      if (!isNew && !need) throw new Error('Выберите потребность');
      const patch = need ? changedNeedFields(need, input) : input;
      let next: EmployerNeed;
      if (isNew) {
        next = await api.createNeed(companyId, toNeedInput(input));
      } else if (Object.keys(patch).length) {
        next = await api.updateNeed(companyId, need!.id, patch);
      } else {
        next = need!;
      }
      onSaved(next);
      toast.success(isNew ? 'Потребность создана' : 'Изменения сохранены');
    });
  const archive = async () =>
    mutation.run(async () => {
      if (!need) throw new Error('Выберите потребность');
      await api.archiveNeed(companyId, need.id);
      onArchived();
      toast.success('Потребность в архиве');
    });
  const restore = async () =>
    mutation.run(async () => {
      if (!need) throw new Error('Выберите потребность');
      const next = await api.updateNeed(companyId, need.id, {
        status: 'draft',
      });
      onSaved(next);
      toast.success('Потребность возвращена в черновики');
    });
  const duplicate = async () =>
    mutation.run(async () => {
      if (!need) throw new Error('Выберите потребность');
      const copy = {
        ...toNeedInput(need),
        title: need.title.slice(0, 190) + ' (копия)',
        status: 'draft' as const,
      };
      const next = await api.createNeed(companyId, copy);
      onSaved(next);
      toast.success('Копия сохранена в черновики');
    });
  return { ...mutation, save, archive, restore, duplicate };
};
