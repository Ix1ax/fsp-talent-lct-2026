'use client';
import { useAsyncMutation } from '@/shared/hooks/useAsyncMutation';
import { toast } from '@/shared/ui/Sonner';
import type {
  Company,
  CompanyInput,
  CompanyMutationApi,
} from '@/entities/company';

import { changedCompanyFields } from '../lib/changedCompanyFields';
interface CompanyActionsOptions {
  api: CompanyMutationApi;
  company: Company | null;
  onSaved: (company: Company, created: boolean) => void;
}
export const useCompanyActions = ({
  api,
  company,
  onSaved,
}: CompanyActionsOptions) => {
  const mutation = useAsyncMutation();
  const save = async (input: CompanyInput, create: boolean) =>
    mutation.run(async () => {
      if (!create && !company) throw new Error('Выберите компанию');
      const patch = company ? changedCompanyFields(company, input) : input;
      const result = create
        ? await api.createCompany(input)
        : Object.keys(patch).length
          ? await api.updateCompany(company!.id, patch)
          : company!;
      onSaved(result, create);
      toast.success(create ? 'Компания создана' : 'Компания сохранена');
    });
  return { ...mutation, save };
};
