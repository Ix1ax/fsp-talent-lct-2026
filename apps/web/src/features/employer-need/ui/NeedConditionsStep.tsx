import { Textarea } from '@/shared/ui';

import { useNeedFlowEditor } from '../model';
import { NeedAdvancedFields } from './NeedAdvancedFields';
import { NeedFlowFieldError } from './NeedFlowFieldError';

interface NeedConditionsStepProps {
  editor: ReturnType<typeof useNeedFlowEditor>;
}
export const NeedConditionsStep = ({ editor }: NeedConditionsStepProps) => {
  const { value, errors, change, skills } = editor;
  return (
    <>
      <label className="grid gap-2 text-sm font-medium">
        Задачи и описание *
        <Textarea
          value={value.description}
          maxLength={10000}
          rows={6}
          placeholder="Задачи на первые месяцы, команда, продукт"
          onChange={(e) => change({ description: e.target.value })}
          aria-invalid={!!errors.description}
        />
        <NeedFlowFieldError errors={errors} name="description" />
      </label>
      <NeedAdvancedFields
        value={{ ...value, skills: [] }}
        skills={skills}
        errors={errors}
        change={change}
      />
    </>
  );
};
