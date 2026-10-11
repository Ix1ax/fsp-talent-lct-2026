import { useAsyncMutation } from '@/shared/hooks';
import { toast } from '@/shared/ui';
import type {
  Company,
  CompanyInput,
  CompanyMutationApi,
} from '@/entities/company';

import { changedCompanyFields } from '../lib';

type CompanyActionsOptions = {
  api: CompanyMutationApi;
  company: Company | null;
  onSaved: (company: Company, created: boolean) => void;
};

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
      let result: Company;

      if (create) {
        result = await api.createCompany(input);
      } else if (Object.keys(patch).length) {
        result = await api.updateCompany(company!.id, patch);
      } else {
        result = company!;
      }

      onSaved(result, create);
      toast.success(create ? 'Компания создана' : 'Компания сохранена');
      return result;
    });
  return { ...mutation, save };
};
